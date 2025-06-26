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
import { ArrowUpDown, DownloadIcon, Loader2, Search, Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

interface ShippingCharge {
  id: string;
  sellerId: string;
  sellerName: string;
  courierName: string;
  courierMode: string;
  airwaybillNumber: string;
  orderNumber: string;
  date: string;
  time: string;
  shipmentType: string;
  productType: string;
  originPincode: string;
  destinationPincode: string;
  originCity: string;
  destinationCity: string;
  bookedWeight: string;
  volWeight: string;
  chargeableAmount: string;
  declaredValue: string;
  collectableValue: string;
  freightCharge: string;
  codCharge: string;
  amountBeforeDiscount: string;
  discount: string;
  amountAfterDiscount: string;
  status: "delivered" | "in_transit" | "out_for_delivery" | "pickup_pending" | "rto" | "cancelled";
  billableLane: string;
  customerGstState: string;
  customerGstin: string;
}

interface ShippingStats {
  totalShipments: number;
  activeSellers: number;
  totalRevenue: number;
  pendingCod: number;
}

const adminService = new AdminService();

const ShippingCharges = () => {
  const [charges, setCharges] = useState<ShippingCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ShippingStats>({
    totalShipments: 0,
    activeSellers: 0,
    totalRevenue: 0,
    pendingCod: 0
  });

  const [sortConfig, setSortConfig] = useState<{
    key: keyof ShippingCharge;
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

  // Fetch shipping charges
  const fetchShippingCharges = useCallback(async () => {
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
        params.search = searchQuery.trim();
      }

      console.log('🔄 Fetching shipping charges with params:', params);

      const response = await adminService.getShippingCharges(params);

      console.log('✅ Shipping charges response:', response);

      if (response.success && response.data) {
        // Format shipping charges data
        const formattedCharges = (response.data || []).map((charge: any) => ({
          id: charge._id || charge.id,
          sellerId: charge.sellerId || 'N/A',
          sellerName: charge.sellerName || 'Unknown Seller',
          courierName: charge.courierName || charge.courier || 'N/A',
          courierMode: charge.courierMode || charge.mode || 'Surface',
          airwaybillNumber: charge.airwaybillNumber || charge.awb || 'N/A',
          orderNumber: charge.orderNumber || charge.orderId || 'N/A',
          date: charge.date ? new Date(charge.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          time: charge.time || new Date(charge.createdAt || new Date()).toLocaleTimeString(),
          shipmentType: charge.shipmentType || 'Standard',
          productType: charge.productType || 'General',
          originPincode: charge.originPincode || charge.fromPincode || 'N/A',
          destinationPincode: charge.destinationPincode || charge.toPincode || 'N/A',
          originCity: charge.originCity || charge.fromCity || 'N/A',
          destinationCity: charge.destinationCity || charge.toCity || 'N/A',
          bookedWeight: charge.bookedWeight || charge.weight || '0g',
          volWeight: charge.volWeight || charge.volumetricWeight || '0g',
          chargeableAmount: charge.chargeableAmount || charge.amount || '₹0',
          declaredValue: charge.declaredValue || charge.value || '₹0',
          collectableValue: charge.collectableValue || charge.codAmount || '₹0',
          freightCharge: charge.freightCharge || charge.shippingCost || '₹0',
          codCharge: charge.codCharge || charge.codFee || '₹0',
          amountBeforeDiscount: charge.amountBeforeDiscount || charge.originalAmount || '₹0',
          discount: charge.discount || '₹0',
          amountAfterDiscount: charge.amountAfterDiscount || charge.finalAmount || '₹0',
          status: charge.status || 'pickup_pending',
          billableLane: charge.billableLane || 'Standard',
          customerGstState: charge.customerGstState || 'N/A',
          customerGstin: charge.customerGstin || 'N/A'
        }));

        setCharges(formattedCharges);

        const totalPages = response.totalPages || 1;
        const totalItems = response.total || 0;
        setTotalPages(totalPages);
        setTotalItems(totalItems);
      } else {
        throw new Error('Failed to fetch shipping charges');
      }
    } catch (err: any) {
      console.error('❌ Error fetching shipping charges:', err);
      setError(err.message || 'Failed to load shipping charges');

      // Don't show error toast for authentication issues
      if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
        toast.error('Failed to load shipping charges: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, date, searchQuery]);

  // Calculate statistics from charges
  const calculateStats = useCallback(() => {
    if (!charges.length) return;

    const stats = charges.reduce((acc, charge) => {
      const revenue = parseFloat(charge.amountAfterDiscount.replace('₹', '').replace(',', '')) || 0;
      const codAmount = parseFloat(charge.collectableValue.replace('₹', '').replace(',', '')) || 0;

      acc.totalShipments++;
      acc.totalRevenue += revenue;

      if (charge.status !== 'delivered' && codAmount > 0) {
        acc.pendingCod += codAmount;
      }

      return acc;
    }, {
      totalShipments: 0,
      activeSellers: new Set(charges.map(charge => charge.sellerId)).size,
      totalRevenue: 0,
      pendingCod: 0
    });

    setStats(stats);
  }, [charges]);

  // Effects
  useEffect(() => {
    fetchShippingCharges();
  }, [fetchShippingCharges]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, date]);

  // Filter and sort data
  const filteredData = charges.filter(charge => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      charge.sellerId.toLowerCase().includes(searchLower) ||
      charge.sellerName.toLowerCase().includes(searchLower) ||
      charge.courierName.toLowerCase().includes(searchLower) ||
      charge.airwaybillNumber.toLowerCase().includes(searchLower) ||
      charge.orderNumber.toLowerCase().includes(searchLower) ||
      charge.originCity.toLowerCase().includes(searchLower) ||
      charge.destinationCity.toLowerCase().includes(searchLower)
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof ShippingCharge) => {
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
        params.search = searchQuery.trim();
      }
      params.format = 'xlsx';

      const blob = await adminService.exportShippingCharges(params);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `shipping-charges-${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Shipping charges exported successfully');
    } catch (err: any) {
      console.error('❌ Error exporting shipping charges:', err);
      toast.error('Failed to export shipping charges: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const statsCards = [
    { title: "Total Shipments", amount: stats.totalShipments.toString(), icon: <Truck className="size-5" /> },
    { title: "Active Sellers", amount: stats.activeSellers.toString(), icon: <Truck className="size-5" /> },
    { title: "Total Revenue", amount: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: <Truck className="size-5" /> },
    { title: "Pending COD", amount: `₹${stats.pendingCod.toLocaleString('en-IN')}`, icon: <Truck className="size-5" /> }
  ];

  if (error && !loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-4">
            Failed to load shipping charges
          </div>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Button onClick={() => fetchShippingCharges()} variant="outline">
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
                placeholder="Search shipping charges..."
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
              disabled={loading || exporting || charges.length === 0}
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
            Total: <span className="font-semibold">{totalItems} charges</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader className="bg-[#F4F2FF] h-12">
              <TableRow className="hover:bg-[#F4F2FF]">
                <TableHead onClick={() => handleSort('sellerId')} className="cursor-pointer text-black">
                  Seller ID <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('sellerName')} className="cursor-pointer text-black">
                  Seller Name <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('courierName')} className="cursor-pointer text-black">
                  Courier Name <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('airwaybillNumber')} className="cursor-pointer text-black">
                  AWB Number <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('orderNumber')} className="cursor-pointer text-black">
                  Order Number <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('date')} className="cursor-pointer text-black">
                  Date <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('originCity')} className="cursor-pointer text-black">
                  Origin <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('destinationCity')} className="cursor-pointer text-black">
                  Destination <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('bookedWeight')} className="cursor-pointer text-black">
                  Weight <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('amountAfterDiscount')} className="cursor-pointer text-black">
                  Amount <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer text-black">
                  Status <ArrowUpDown className="inline h-4 w-4 ml-1" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Loading shipping charges...</p>
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <p className="text-gray-500">No shipping charges found</p>
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
                sortedData.map((charge) => (
                  <TableRow key={charge.id} className="h-12">
                    <TableCell>{charge.sellerId}</TableCell>
                    <TableCell>{charge.sellerName}</TableCell>
                    <TableCell>{charge.courierName}</TableCell>
                    <TableCell>{charge.airwaybillNumber}</TableCell>
                    <TableCell>{charge.orderNumber}</TableCell>
                    <TableCell>{new Date(charge.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{charge.originCity}</TableCell>
                    <TableCell>{charge.destinationCity}</TableCell>
                    <TableCell>{charge.bookedWeight}</TableCell>
                    <TableCell className="font-medium">{charge.amountAfterDiscount}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          {
                            "bg-green-100 text-green-800": charge.status === "delivered",
                            "bg-blue-100 text-blue-800": charge.status === "in_transit",
                            "bg-yellow-100 text-yellow-800": charge.status === "out_for_delivery",
                            "bg-orange-100 text-orange-800": charge.status === "pickup_pending",
                            "bg-red-100 text-red-800": charge.status === "rto",
                            "bg-gray-100 text-gray-800": charge.status === "cancelled"
                          }
                        )}
                      >
                        {charge.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
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
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} charges
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

export default ShippingCharges;
