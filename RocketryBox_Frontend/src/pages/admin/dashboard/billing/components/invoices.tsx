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
import { ArrowUpDown, DownloadIcon, EyeIcon, FileText, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoiceNumber: string;
  sellerId: string;
  sellerName: string;
  date: string;
  dueDate: string;
  amount: string;
  customer: string;
  type: string;
  status: "paid" | "pending" | "overdue";
}

interface InvoiceStats {
  totalInvoices: number;
  pendingAmount: number;
  overdueAmount: number;
  activeSellers: number;
}

const adminService = new AdminService();

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    activeSellers: 0
  });

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Invoice;
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

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
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
        params.invoiceNumber = searchQuery.trim();
      }

      console.log('🔄 Fetching invoices with params:', params);

      const response = await adminService.getInvoices(params);

      console.log('✅ Invoices response:', response);

      if (response.success && response.data) {
        // Format invoices data
        const formattedInvoices = (response.data || []).map((invoice: any) => ({
          id: invoice._id || invoice.id,
          invoiceNumber: invoice.invoiceNumber || `INV-${invoice._id?.slice(-6)}`,
          sellerId: invoice.sellerId || 'N/A',
          sellerName: invoice.sellerName || 'Unknown Seller',
          date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          amount: invoice.amount ? `₹${invoice.amount.toLocaleString('en-IN')}` : '₹0',
          customer: invoice.customer || 'N/A',
          type: invoice.type || 'Service',
          status: invoice.status || 'pending'
        }));

        setInvoices(formattedInvoices);

        const totalPages = response.totalPages || 1;
        const totalItems = response.total || 0;
        setTotalPages(totalPages);
        setTotalItems(totalItems);
      } else {
        throw new Error('Failed to fetch invoices');
      }
    } catch (err: any) {
      console.error('❌ Error fetching invoices:', err);
      setError(err.message || 'Failed to load invoices');

      // Don't show error toast for authentication issues
      if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
        toast.error('Failed to load invoices: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, date, searchQuery]);

  // Calculate statistics from invoices
  const calculateStats = useCallback(() => {
    if (!invoices.length) return;

    const stats = invoices.reduce((acc, invoice) => {
      const amount = parseFloat(invoice.amount.replace('₹', '').replace(',', ''));

      acc.totalInvoices++;

      if (invoice.status === 'pending') {
        acc.pendingAmount += amount;
      } else if (invoice.status === 'overdue') {
        acc.overdueAmount += amount;
      }

      return acc;
    }, {
      totalInvoices: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      activeSellers: new Set(invoices.map(inv => inv.sellerId)).size
    });

    setStats(stats);
  }, [invoices]);

  // Effects
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, date]);

  // Filter and sort data
  const filteredData = invoices.filter(invoice => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.sellerId.toLowerCase().includes(searchLower) ||
      invoice.sellerName.toLowerCase().includes(searchLower) ||
      invoice.customer.toLowerCase().includes(searchLower) ||
      invoice.type.toLowerCase().includes(searchLower) ||
      invoice.status.toLowerCase().includes(searchLower)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Invoice) => {
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
        params.invoiceNumber = searchQuery.trim();
      }
      params.format = 'xlsx';

      const blob = await adminService.exportInvoices(params);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Invoices exported successfully');
    } catch (err: any) {
      console.error('❌ Error exporting invoices:', err);
      toast.error('Failed to export invoices: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingleInvoice = async (invoice: Invoice) => {
    try {
      const headers = [
        "Invoice Number",
        "Seller ID",
        "Seller Name",
        "Date",
        "Due Date",
        "Amount",
        "Customer",
        "Type",
        "Status"
      ];

      const rowData = [
        invoice.invoiceNumber,
        invoice.sellerId,
        invoice.sellerName,
        invoice.date,
        invoice.dueDate,
        invoice.amount,
        invoice.customer,
        invoice.type,
        invoice.status
      ];

      // Create CSV content
      const csvContent = [
        headers.join(","),
        rowData.join(",")
      ].join("\n");

      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      csvLink.setAttribute('href', csvUrl);
      csvLink.setAttribute('download', `invoice-${invoice.invoiceNumber}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(csvUrl);

      toast.success('Invoice exported successfully');
    } catch (err: any) {
      console.error('❌ Error exporting single invoice:', err);
      toast.error('Failed to export invoice');
    }
  };

  const statsCards = [
    { title: "Total Invoices", amount: stats.totalInvoices.toString(), icon: <FileText className="size-5" /> },
    { title: "Pending Amount", amount: `₹${stats.pendingAmount.toLocaleString('en-IN')}`, icon: <FileText className="size-5" /> },
    { title: "Overdue Amount", amount: `₹${stats.overdueAmount.toLocaleString('en-IN')}`, icon: <FileText className="size-5" /> },
    { title: "Active Sellers", amount: stats.activeSellers.toString(), icon: <FileText className="size-5" /> }
  ];

  if (error && !loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-4">
            Failed to load invoices
          </div>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Button onClick={() => fetchInvoices()} variant="outline">
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
                placeholder="Search invoices..."
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
              disabled={loading || exporting || invoices.length === 0}
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
            Total: <span className="font-semibold">{totalItems} invoices</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader className="bg-[#F4F2FF] h-12">
              <TableRow className="hover:bg-[#F4F2FF]">
                <TableHead
                  onClick={() => handleSort('invoiceNumber')}
                  className="cursor-pointer text-black"
                >
                  Invoice Number
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('sellerId')}
                  className="cursor-pointer text-black"
                >
                  Seller ID
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('sellerName')}
                  className="cursor-pointer text-black"
                >
                  Seller Name
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
                  onClick={() => handleSort('dueDate')}
                  className="cursor-pointer text-black"
                >
                  Due Date
                  <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead
                  onClick={() => handleSort('customer')}
                  className="cursor-pointer text-black"
                >
                  Customer
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
                  onClick={() => handleSort('status')}
                  className="cursor-pointer text-black"
                >
                  Status
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
                  <TableCell colSpan={10} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Loading invoices...</p>
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500">No invoices found</p>
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
                sortedData.map((invoice) => (
                  <TableRow key={invoice.id} className="h-12">
                    <TableCell>
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {invoice.sellerId}
                    </TableCell>
                    <TableCell>
                      {invoice.sellerName}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.date).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {invoice.customer}
                    </TableCell>
                    <TableCell>
                      {invoice.type}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.amount}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          {
                            "bg-green-100 text-green-800": invoice.status === "paid",
                            "bg-yellow-100 text-yellow-800": invoice.status === "pending",
                            "bg-red-100 text-red-800": invoice.status === "overdue"
                          }
                        )}
                      >
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                      >
                        <EyeIcon className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleExportSingleInvoice(invoice)}
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
        {!loading && sortedData.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{' '}
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} invoices
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

export default Invoices;
