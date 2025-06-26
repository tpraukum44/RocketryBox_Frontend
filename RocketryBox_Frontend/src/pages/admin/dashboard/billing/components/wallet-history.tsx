import DateRangePicker from "@/components/admin/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AdminService } from "@/services/admin.service";
import { ArrowUpDown, Building2, DownloadIcon, EyeIcon, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

interface WalletTransaction {
  id: string;
  date: string;
  referenceNumber: string;
  orderId: string;
  type: "Recharge" | "Debit" | "COD Credit" | "Refund";
  amount: string;
  codCharge: string;
  igst: string;
  subTotal: string;
  closingBalance: string;
  remark: string;
}

interface WalletStats {
  totalRecharges: number;
  totalUsed: number;
  pendingTransactions: number;
  totalSellers: number;
  currentBalance: number;
}

const adminService = new AdminService();

const WalletHistory = () => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WalletStats>({
    totalRecharges: 0,
    totalUsed: 0,
    pendingTransactions: 0,
    totalSellers: 0,
    currentBalance: 0
  });

  const [sortConfig, setSortConfig] = useState<{
    key: keyof WalletTransaction;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    to: new Date(),
  });

  // Fetch wallet transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: pageSize,
      };

      if (date?.from) {
        params.from = date.from.toISOString().split('T')[0];
      }
      if (date?.to) {
        params.to = date.to.toISOString().split('T')[0];
      }
      if (searchQuery.trim()) {
        params.referenceNumber = searchQuery.trim();
      }

      console.log('🔄 Fetching wallet transactions with params:', params);

      const response = await adminService.getWalletTransactions(params);

      console.log('✅ Wallet transactions response:', response);

      if (response.success && response.data) {
        setTransactions(response.data || []);

        // Backend returns pagination info at the top level, not nested
        setTotalPages(response.totalPages || 1);
        setTotalItems(response.total || 0);
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (err: any) {
      console.error('❌ Error fetching wallet transactions:', err);
      setError(err.message || 'Failed to load wallet transactions');

      // Don't show error toast for authentication issues
      if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
        toast.error('Failed to load wallet transactions: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, date, searchQuery]);

  // Calculate statistics from transactions
  const calculateStats = useCallback(() => {
    if (!transactions.length) return;

    const stats = transactions.reduce((acc, transaction) => {
      const amount = parseFloat(transaction.amount.replace('₹', '').replace(',', ''));

      switch (transaction.type) {
        case 'Recharge':
          acc.totalRecharges += amount;
          break;
        case 'Debit':
          acc.totalUsed += amount;
          break;
        case 'COD Credit':
          acc.totalRecharges += amount;
          break;
      }

      return acc;
    }, {
      totalRecharges: 0,
      totalUsed: 0,
      pendingTransactions: 0,
      totalSellers: new Set<string>().size,
      currentBalance: 0
    });

    // Get current balance from the latest transaction
    if (transactions.length > 0) {
      const latestTransaction = transactions[0];
      stats.currentBalance = parseFloat(latestTransaction.closingBalance.replace('₹', '').replace(',', ''));
    }

    setStats(stats);
  }, [transactions]);

  // Effects
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, date]);

  // Filter and sort data
  const filteredData = transactions.filter(transaction => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.referenceNumber.toLowerCase().includes(searchLower) ||
      transaction.orderId.toLowerCase().includes(searchLower) ||
      transaction.type.toLowerCase().includes(searchLower) ||
      transaction.remark.toLowerCase().includes(searchLower)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof WalletTransaction) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Export functionality using backend API
  const handleExport = async () => {
    try {
      setExporting(true);

      const params: any = {};
      if (date?.from) {
        params.from = date.from.toISOString().split('T')[0];
      }
      if (date?.to) {
        params.to = date.to.toISOString().split('T')[0];
      }
      if (searchQuery.trim()) {
        params.referenceNumber = searchQuery.trim();
      }
      params.format = 'xlsx';

      const blob = await adminService.exportWalletTransactions(params);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `wallet-history-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Wallet history exported successfully');
    } catch (err: any) {
      console.error('❌ Error exporting wallet transactions:', err);
      toast.error('Failed to export wallet history: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingleRow = async (transaction: WalletTransaction) => {
    try {
      const headers = [
        "Transaction ID",
        "Reference Number",
        "Order ID",
        "Date",
        "Type",
        "Amount",
        "COD Charge",
        "IGST",
        "Sub Total",
        "Closing Balance",
        "Remark"
      ];

      const rowData = [
        transaction.id,
        transaction.referenceNumber,
        transaction.orderId,
        new Date(transaction.date).toLocaleDateString(),
        transaction.type,
        transaction.amount,
        transaction.codCharge,
        transaction.igst,
        transaction.subTotal,
        transaction.closingBalance,
        transaction.remark
      ];

      // Create CSV content
      const csvContent = [
        headers.join(","),
        rowData.join(",")
      ].join("\n");

      // Download CSV
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      csvLink.setAttribute('href', csvUrl);
      csvLink.setAttribute('download', `transaction-${transaction.referenceNumber}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(csvUrl);

      toast.success('Transaction exported successfully');
    } catch (err: any) {
      console.error('❌ Error exporting single transaction:', err);
      toast.error('Failed to export transaction');
    }
  };

  const statsCards = [
    {
      title: "Total Recharges",
      amount: `₹${stats.totalRecharges.toLocaleString('en-IN')}`,
      icon: <Building2 className="size-5" />
    },
    {
      title: "Total Used",
      amount: `₹${stats.totalUsed.toLocaleString('en-IN')}`,
      icon: <Building2 className="size-5" />
    },
    {
      title: "Pending Transactions",
      amount: `₹${stats.pendingTransactions.toLocaleString('en-IN')}`,
      icon: <Building2 className="size-5" />
    },
    {
      title: "Current Balance",
      amount: `₹${stats.currentBalance.toLocaleString('en-IN')}`,
      icon: <Building2 className="size-5" />
    }
  ];

  if (error && !loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-4">
            Failed to load wallet history
          </div>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Button onClick={() => fetchTransactions()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-[#BCDDFF] p-4 rounded-lg"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                {stat.title}
              </h3>
              <div className="flex items-center gap-2">
                {stat.icon}
                <span className="text-lg font-semibold">
                  {loading ? '...' : stat.amount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transactions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
              />
            </div>
            <DateRangePicker
              date={date}
              setDate={setDate}
              className="w-20 md:w-auto"
            />
            <Button
              variant="outline"
              className="w-full md:w-auto"
              onClick={handleExport}
              disabled={loading || exporting || transactions.length === 0}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DownloadIcon className="mr-2 h-4 w-4" />
              )}
              Export Data
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold">{totalItems} transactions</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader className="bg-[#F4F2FF] h-12">
              <TableRow className="hover:bg-[#F4F2FF]">
                <TableHead
                  onClick={() => handleSort('referenceNumber')}
                  className="cursor-pointer text-black"
                >
                  Reference Number
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('orderId')}
                  className="cursor-pointer text-black"
                >
                  Order ID
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('date')}
                  className="cursor-pointer text-black"
                >
                  Date
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('type')}
                  className="cursor-pointer text-black"
                >
                  Type
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('amount')}
                  className="cursor-pointer text-black"
                >
                  Amount
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('closingBalance')}
                  className="cursor-pointer text-black"
                >
                  Closing Balance
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('remark')}
                  className="cursor-pointer text-black"
                >
                  Remark
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead className="text-black">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Loading wallet transactions...</p>
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-gray-500">No transactions found</p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear Search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((transaction) => (
                  <TableRow key={transaction.id} className="h-12">
                    <TableCell className="font-medium">
                      {transaction.referenceNumber}
                    </TableCell>
                    <TableCell>
                      {transaction.orderId || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          transaction.type === 'Recharge' || transaction.type === 'COD Credit' || transaction.type === 'Refund'
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {transaction.type}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-medium",
                        transaction.type === 'Recharge' || transaction.type === 'COD Credit' || transaction.type === 'Refund'
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {transaction.amount}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.closingBalance}
                    </TableCell>
                    <TableCell>
                      {transaction.remark || '-'}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="View Details"
                      >
                        <EyeIcon className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleExportSingleRow(transaction)}
                        title="Export Transaction"
                      >
                        <DownloadIcon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && transactions.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} transactions
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = i + 1;

                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i;
                  }

                  if (pageNum <= totalPages) {
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        className="w-9 h-9"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletHistory;
