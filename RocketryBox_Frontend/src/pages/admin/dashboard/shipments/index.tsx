import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminService } from "@/services/admin.service";
import { ArrowUpDown, Download, Loader2, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

interface Shipment {
  _id: string;
  orderId?: string;
  awb: string;
  createdAt: string;
  pickupDate?: string;
  customer: {
    name?: string;
    phone?: string;
    email?: string;
  };
  seller: {
    name?: string;
    businessName?: string;
  };
  courier: string;
  status: string;
  weight?: number;
  shippingCharge?: number;
  codAmount?: number;
  isCod: boolean;
  channel?: string;
  trackingUrl?: string;
}

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "booked":
    case "pending":
      return "bg-blue-100 text-blue-800";
    case "in-transit":
    case "shipped":
      return "bg-purple-100 text-purple-800";
    case "delivered":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "exception":
    case "failed":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPaymentStyle = (isCod: boolean) => {
  return isCod ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
};

type SortConfig = {
  key: keyof Shipment | null;
  direction: 'asc' | 'desc' | null;
};

const ShipmentsTable = ({ data, loading }: { data: Shipment[]; loading: boolean }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null
  });

  const handleSort = (key: keyof Shipment) => {
    let direction: 'asc' | 'desc' | null = 'asc';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!] || '';
      const bValue = b[sortConfig.key!] || '';

      if (sortConfig.direction === 'asc') {
        return String(aValue).localeCompare(String(bValue));
      } else {
        return String(bValue).localeCompare(String(aValue));
      }
    });
  };

  const getSortIcon = (_key: keyof Shipment) => {
    return <ArrowUpDown className="size-3" />;
  };

  const sortedData = getSortedData();

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="rounded-md border w-full overflow-hidden">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading shipments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border w-full overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F4F2FF] hover:bg-[#F4F2FF]">
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('awb')}
                >
                  AWB
                  {getSortIcon('awb')}
                </div>
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('createdAt')}
                >
                  Order Date
                  {getSortIcon('createdAt')}
                </div>
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('pickupDate')}
                >
                  Pickup Date
                  {getSortIcon('pickupDate')}
                </div>
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                Customer
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                Seller
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('shippingCharge')}
                >
                  Amount
                  {getSortIcon('shippingCharge')}
                </div>
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                Payment
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('weight')}
                >
                  Wt.(Kg)
                  {getSortIcon('weight')}
                </div>
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('channel')}
                >
                  Channel
                  {getSortIcon('channel')}
                </div>
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('courier')}
                >
                  Courier
                  {getSortIcon('courier')}
                </div>
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                Tracking
              </TableHead>
              <TableHead className="min-w-[90px] whitespace-nowrap text-black">
                <div
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                  No shipments found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((shipment) => (
                <TableRow key={shipment._id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/admin/dashboard/shipments/${shipment._id}`}
                      className="text-purple-600 hover:underline font-medium"
                    >
                      {shipment.awb}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDate(shipment.createdAt)}
                  </TableCell>
                  <TableCell>
                    {formatDate(shipment.pickupDate || '')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{shipment.customer?.name || 'N/A'}</div>
                      {shipment.customer?.phone && (
                        <div className="text-sm text-gray-500">{shipment.customer.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {shipment.seller?.businessName || shipment.seller?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(shipment.shippingCharge)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStyle(shipment.isCod)}`}>
                      {shipment.isCod ? 'COD' : 'Prepaid'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {shipment.weight ? `${shipment.weight} kg` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {shipment.channel || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {shipment.courier}
                  </TableCell>
                  <TableCell>
                    {shipment.trackingUrl ? (
                      <Button variant="link" className="p-0 h-auto text-violet-600" asChild>
                        <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                          Track
                        </a>
                      </Button>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const AdminShipmentsPage = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 20
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const adminService = new AdminService();

  const currentTab = searchParams.get("tab") || "all";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const fetchShipments = async (params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams: any = {
        page: params.page || 1,
        limit: params.limit || 20,
        sort: '-createdAt'
      };

      // Apply status filter based on tab
      if (params.status && params.status !== 'all') {
        // Map frontend tab names to backend status values
        const statusMapping: Record<string, string> = {
          'booked': 'booked',
          'pending-pickup': 'pending',
          'in-transit': 'in-transit',
          'delivered': 'delivered',
          'cancelled': 'cancelled',
          'exception': 'exception'
        };
        queryParams.status = statusMapping[params.status] || params.status;
      }

      // Apply search filter
      if (params.search?.trim()) {
        queryParams.awb = params.search.trim();
      }

      const response = await adminService.getShipments(queryParams);

      if (response.success && response.data) {
        const shipmentsData = response.data || [];

        setShipments(shipmentsData);
        setPagination({
          currentPage: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          total: response.total || 0,
          limit: queryParams.limit
        });
      } else {
        setShipments([]);
        setError('Failed to fetch shipments');
      }
    } catch (err: any) {
      console.error('Error fetching shipments:', err);
      setError(err.message || 'Failed to fetch shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter shipments based on current tab
  const getFilteredShipments = () => {
    if (currentTab === 'all') {
      return shipments;
    }

    const statusFilters: Record<string, string[]> = {
      'booked': ['booked'],
      'pending-pickup': ['pending', 'pickup pending'],
      'in-transit': ['in-transit', 'shipped', 'in transit', 'out for delivery'],
      'delivered': ['delivered'],
      'cancelled': ['cancelled'],
      'exception': ['exception', 'failed']
    };

    const allowedStatuses = statusFilters[currentTab] || [];

    return shipments.filter(shipment =>
      allowedStatuses.some(status =>
        shipment.status?.toLowerCase().includes(status.toLowerCase())
      )
    );
  };

  // Apply search filter to displayed data
  const getDisplayedShipments = () => {
    const filtered = getFilteredShipments();

    if (!searchQuery.trim()) {
      return filtered;
    }

    const query = searchQuery.toLowerCase();
    return filtered.filter(shipment =>
      shipment.awb?.toLowerCase().includes(query) ||
      shipment.customer?.name?.toLowerCase().includes(query) ||
      shipment.customer?.phone?.includes(query) ||
      shipment.seller?.businessName?.toLowerCase().includes(query) ||
      shipment.courier?.toLowerCase().includes(query)
    );
  };

  const handleRefresh = () => {
    fetchShipments({
      status: currentTab,
      search: searchQuery,
      page: pagination.currentPage
    });
  };

  // Initial load and tab change effects
  useEffect(() => {
    fetchShipments({
      status: currentTab,
      search: searchQuery
    });
  }, [currentTab]);

  // Search effect with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 3 || searchQuery.trim().length === 0) {
        fetchShipments({
          status: currentTab,
          search: searchQuery
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (searchParams.get("tab")) {
      handleTabChange(searchParams.get("tab")!);
    }
  }, []);

  return (
    <div className="space-y-8 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-semibold">
          Shipments
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      <Tabs defaultValue={currentTab} className="w-full" onValueChange={handleTabChange}>
        <div className="w-full">
          <div className="w-full overflow-x-auto scrollbar-hide">
            <TabsList className="w-max min-w-full p-0 h-12 z-0 bg-white rounded-none relative">
              <div className="absolute bottom-0 w-full h-px -z-10 bg-violet-200"></div>
              <TabsTrigger
                value="all"
                className="flex-1 items-center gap-2 h-full data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-black whitespace-nowrap px-4"
              >
                All ({pagination.total})
              </TabsTrigger>
              <TabsTrigger
                value="booked"
                className="flex-1 items-center gap-2 h-full data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-black whitespace-nowrap px-4"
              >
                Booked
              </TabsTrigger>
              <TabsTrigger
                value="pending-pickup"
                className="flex-1 items-center gap-2 h-full data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-black whitespace-nowrap px-4"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="in-transit"
                className="flex-1 items-center gap-2 h-full data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-black whitespace-nowrap px-4"
              >
                In-transit
              </TabsTrigger>
              <TabsTrigger
                value="delivered"
                className="flex-1 items-center gap-2 h-full data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-black whitespace-nowrap px-4"
              >
                Delivered
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="flex-1 items-center gap-2 h-full data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-black whitespace-nowrap px-4"
              >
                Cancelled
              </TabsTrigger>
              <TabsTrigger
                value="exception"
                className="flex-1 items-center gap-2 h-full data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-black whitespace-nowrap px-4"
              >
                Exception
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 py-4 w-full">
          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 px-px">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by AWB, Customer, Seller..."
                className="pl-9 w-full bg-[#F8F7FF]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="whitespace-nowrap">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="w-full">
          <TabsContent value="all" className="mt-2">
            <ShipmentsTable data={getDisplayedShipments()} loading={loading} />
          </TabsContent>

          <TabsContent value="booked" className="mt-2">
            <ShipmentsTable data={getDisplayedShipments()} loading={loading} />
          </TabsContent>

          <TabsContent value="pending-pickup" className="mt-2">
            <ShipmentsTable data={getDisplayedShipments()} loading={loading} />
          </TabsContent>

          <TabsContent value="in-transit" className="mt-2">
            <ShipmentsTable data={getDisplayedShipments()} loading={loading} />
          </TabsContent>

          <TabsContent value="delivered" className="mt-2">
            <ShipmentsTable data={getDisplayedShipments()} loading={loading} />
          </TabsContent>

          <TabsContent value="cancelled" className="mt-2">
            <ShipmentsTable data={getDisplayedShipments()} loading={loading} />
          </TabsContent>

          <TabsContent value="exception" className="mt-2">
            <ShipmentsTable data={getDisplayedShipments()} loading={loading} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminShipmentsPage;
