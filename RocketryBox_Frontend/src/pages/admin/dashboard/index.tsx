import DateRangePicker from "@/components/admin/date-range-picker";
import PermissionGuard from '@/components/admin/PermissionGuard';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceFactory } from "@/services/service-factory";
import { ArrowUpDown, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Link } from "react-router-dom";
import { io, Socket } from 'socket.io-client';
import { toast } from "sonner";
import AdminCustomerDashboardPage from "./customer";

interface DashboardCard {
  title: string;
  value: string | number;
  change: string;
}

interface Shipment {
  orderId: string;
  date: string;
  seller: string;
  product: string;
  weight: string;
  payment: string;
  customer: string;
  carrier: string;
  status: string;
  fulfilled: string;
  orders?: number;
  capacityUsed?: string;
  availableCapacity?: string;
  activeOrders?: number;
  delivered?: number;
  inTransit?: number;
  pending?: number;
  transactionAmount?: string;
}

const getStatusStyle = (status: string) => {
  const styles = {
    "Booked": "bg-green-100 text-green-800",
    "In-transit": "bg-blue-100 text-blue-800",
    "Pending Pickup": "bg-orange-100 text-orange-800",
    "Delivered": "bg-purple-100 text-purple-800"
  };
  return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
};

type SortableFields = keyof Shipment | 'orders' | 'capacityUsed' | 'availableCapacity' | 'activeOrders' | 'delivered' | 'inTransit' | 'pending';

type SortConfig = {
  key: SortableFields | null;
  direction: 'asc' | 'desc' | null;
};

const ShipmentsTable = ({ data, type = "shipment" }: { data: Shipment[], type?: "shipment" | "order" | "courierLoad" | "courierStatus" }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });

  const handleSort = (key: SortableFields) => {
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
      let aValue: any = a[sortConfig.key as keyof Shipment];
      let bValue: any = b[sortConfig.key as keyof Shipment];

      // Ensure transactionAmount is always a string for comparison
      if (sortConfig.key === 'transactionAmount') {
        aValue = aValue ? aValue.replace(/[^\d.]/g, '') : '0';
        bValue = bValue ? bValue.replace(/[^\d.]/g, '') : '0';
        return sortConfig.direction === 'asc'
          ? parseFloat(aValue) - parseFloat(bValue)
          : parseFloat(bValue) - parseFloat(aValue);
      }

      // Handle numeric fields
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string fields
      aValue = String(aValue ?? '');
      bValue = String(bValue ?? '');

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortIcon = () => {
    return <ArrowUpDown className="size-3" />;
  };

  const sortedData = getSortedData();

  if (type === "order") {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('orderId')}>
                  Order ID
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[150px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('seller')}>
                  Customer Name
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[180px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('customer')}>
                  Customer Email
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[150px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('carrier')}>
                  Seller Name
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[140px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('date')}>
                  Order Date
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[140px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('transactionAmount')}>
                  Transaction Amount
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[100px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('status')}>
                  Status
                  {getSortIcon()}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((shipment, index) => (
                <TableRow key={`${shipment.orderId}-${index}`}>
                  <TableCell className="whitespace-nowrap font-medium">
                    <Link
                      to={`/admin/dashboard/orders/${shipment.orderId}`}
                      className="text-purple-600 hover:underline font-medium"
                    >
                      {shipment.orderId}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.seller}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.customer}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.carrier}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.date}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.transactionAmount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
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
    );
  }

  if (type === "courierLoad") {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-100 hover:bg-neutral-100">
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('carrier')}>
                  Courier Name
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('orders')}>
                  Total Orders
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('weight')}>
                  Total Weight
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('capacityUsed')}>
                  Capacity Used
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('availableCapacity')}>
                  Available Capacity
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('status')}>
                  Status
                  {getSortIcon()}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No courier load data found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((shipment, index) => (
                <TableRow key={`${shipment.orderId}-${index}`}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {shipment.carrier}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.orders || 0}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.weight}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.capacityUsed || "0%"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.availableCapacity || "100%"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
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
    );
  }

  if (type === "courierStatus") {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-100 hover:bg-neutral-100">
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('carrier')}>
                  Courier Name
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('activeOrders')}>
                  Active Orders
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('delivered')}>
                  Delivered
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('inTransit')}>
                  In Transit
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('pending')}>
                  Pending
                  {getSortIcon()}
                </div>
              </TableHead>
              <TableHead className="min-w-[120px] whitespace-nowrap">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('status')}>
                  Status
                  {getSortIcon()}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No courier status data found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((shipment, index) => (
                <TableRow key={`${shipment.orderId}-${index}`}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {shipment.carrier}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.activeOrders || 0}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.delivered || 0}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.inTransit || 0}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shipment.pending || 0}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
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
    );
  }

  // Default shipment table
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-100 hover:bg-neutral-100">
            <TableHead className="min-w-[120px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('orderId')}>
                Order ID
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[100px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('date')}>
                Date
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('seller')}>
                Seller
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[150px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('product')}>
                Product
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[100px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('weight')}>
                Weight
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('transactionAmount')}>
                Transaction Amount
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('customer')}>
                Customer
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('carrier')}>
                Carrier
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[100px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('status')}>
                Status
                {getSortIcon()}
              </div>
            </TableHead>
            <TableHead className="min-w-[100px] whitespace-nowrap">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('fulfilled')}>
                Fulfilled
                {getSortIcon()}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                No shipments found
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((shipment, index) => (
              <TableRow key={`${shipment.orderId}-${index}`}>
                <TableCell className="whitespace-nowrap font-medium">
                  <Link
                    to={`/admin/dashboard/shipments/${shipment.orderId}`}
                    className="text-purple-600 hover:underline font-medium"
                  >
                    {shipment.orderId}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.date}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.seller}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.product}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.weight}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.transactionAmount}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.customer}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.carrier}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(shipment.status)}`}>
                    {shipment.status}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {shipment.fulfilled}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

// Helper function to filter by date range
function filterByDateRange<T extends { date: string }>(data: T[], dateRange: DateRange | undefined) {
  if (!dateRange?.from || !dateRange?.to) return data;
  const from = dateRange.from.getTime();
  const to = dateRange.to.getTime();
  return data.filter(item => {
    const itemDate = new Date(item.date).getTime();
    return itemDate >= from && itemDate <= to;
  });
}

// Helper to convert array of objects to CSV
function arrayToCSV<T>(data: T[], columns: string[]): string {
  const header = columns.join(",");
  const rows = data.map(row => columns.map(col => `"${(row as any)[col] ?? ''}"`).join(","));
  return [header, ...rows].join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const AdminDashboardPage = () => {
  // Set default date range to last 30 days (current data)
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(), // Today
  });
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);
  const [orders, setOrders] = useState<Shipment[]>([]);       // For Recent Orders table
  const [shipments, setShipments] = useState<Shipment[]>([]);  // For Shipments table
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fallback dashboard cards to show when API fails
  const fallbackDashboardCards: DashboardCard[] = [
    {
      title: "Total Shipments",
      value: "0",
      change: "No data available"
    },
    {
      title: "Revenue generated",
      value: "₹0",
      change: "No data available"
    },
    {
      title: "Pending Orders",
      value: "0",
      change: "No data available"
    },
    {
      title: "Active users",
      value: "0",
      change: "No data available"
    }
  ];

  // Setup Socket.IO connection for real-time dashboard updates
  useEffect(() => {
    const setupSocket = () => {
      try {
        // Get JWT token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('🔌 Admin WebSocket: No auth token available (normal for unauthenticated users)');
          return;
        }

        console.log('🔌 Connecting to admin dashboard WebSocket...');

        // Create Socket.IO connection with authentication
        const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080', {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          timeout: 5000
        });

        newSocket.on('connect', () => {
          console.log('🔌 Admin WebSocket connected successfully');

          // Join admin dashboard room
          newSocket.emit('join-admin-dashboard');
          console.log('🏠 Joined admin-dashboard room');
        });

        // Listen for real-time dashboard updates
        newSocket.on('dashboard-update', (data) => {
          console.log('📡 Real-time dashboard update received:', data);

          // Update dashboard cards if present
          if (data.users && data.orders && data.revenue) {
            setDashboardCards([
              {
                title: "Total Shipments",
                value: data.orders?.total?.toLocaleString() || "0",
                change: `${data.orders?.todayCount || 0} today`
              },
              {
                title: "Revenue generated",
                value: `₹${data.revenue?.today?.toLocaleString() || "0"}`,
                change: "Today's revenue"
              },
              {
                title: "Pending Orders",
                value: data.orders?.pending?.toLocaleString() || "0",
                change: `${data.orders?.todayCount || 0} today`
              },
              {
                title: "Active users",
                value: data.users?.total?.toLocaleString() || "0",
                change: `${data.users?.newToday || 0} new today`
              }
            ]);
          }

          // Show success toast
          toast.success('Dashboard updated', {
            description: 'Real-time data refreshed'
          });
        });

        newSocket.on('connect_error', (error) => {
          console.error('🔌 Admin WebSocket connection error:', error.message);
        });

        newSocket.on('disconnect', () => {
          console.log('🔌 Admin WebSocket disconnected');
        });

        newSocket.on('error', (error) => {
          console.error('🔌 Admin WebSocket error:', error);
        });

        setSocket(newSocket);

      } catch (error) {
        console.error('Failed to setup admin WebSocket:', error);
      }
    };

    setupSocket();

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('🔌 Cleaning up admin WebSocket connection');
        socket.disconnect();
        setSocket(null);
      }
    };
  }, []);

  // Fetch dashboard data function
  const fetchDashboardData = async () => {
    console.log('🔄 Starting seller dashboard data fetch...');
    console.log('📅 Date range:', { from: date?.from, to: date?.to });

    try {
      setLoading(true);
      setError(null);

      // Initialize with fallback data immediately
      console.log('📊 Setting fallback dashboard data');
      setDashboardCards(fallbackDashboardCards);
      setOrders([]);
      setShipments([]);

      // Set a timeout to ensure loading doesn't get stuck
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Dashboard loading timeout - forcing completion');
        setLoading(false);
        setError("Dashboard loading took too long. Showing available data.");
      }, 10000); // 10 second timeout

      try {
        console.log('📈 Fetching dashboard stats...');
        const statsResponse = await ServiceFactory.admin.getReportStats();
        console.log('📈 Stats response:', statsResponse);

        if (statsResponse.success) {
          const stats = statsResponse.data;
          console.log('📈 Seller Dashboard Stats data:', stats);

          // Handle seller dashboard data structure
          const cards = stats.cards || {};
          setDashboardCards([
            {
              title: "Total Shipments",
              value: cards.totalShipments?.toLocaleString() || "0",
              change: `${cards.todayOrders || 0} orders today`
            },
            {
              title: "Revenue generated",
              value: `₹${parseFloat(cards.totalRevenue || '0').toLocaleString()}`,
              change: `₹${parseFloat(cards.totalRevenue || '0').toFixed(2)} total`
            },
            {
              title: "Pending Orders",
              value: cards.pendingOrders?.toLocaleString() || "0",
              change: `${cards.totalOrders || 0} total orders`
            },
            {
              title: "Active Sellers",
              value: cards.activeSellers?.toLocaleString() || "0",
              change: `${cards.newSellers || 0} new sellers`
            }
          ]);

          // Set orders data for Recent Orders table
          if (stats.recentOrders) {
            setOrders(stats.recentOrders.map((order: any) => ({
              // Correct mapping for order table columns:
              orderId: order.id,                                    // Order ID
              seller: order.customerName || 'Unknown Customer',     // Customer Name
              customer: order.customerEmail || 'unknown@email.com', // Customer Email
              carrier: order.sellerName || 'Unknown Seller',        // Seller Name
              date: order.date,                                     // Order Date
              transactionAmount: order.amount,                      // Transaction Amount
              status: order.status,                                 // Status

              // Additional fields for compatibility:
              product: order.product || 'Product',
              weight: '0g',
              payment: 'COD',
              fulfilled: order.status === 'Delivered' ? 'Yes' : 'No'
            })));
          }
        } else {
          console.warn('📈 Stats API returned success=false:', statsResponse.message);
        }
      } catch (statsError) {
        console.error("❌ Failed to fetch dashboard stats:", statsError);
        // Keep fallback cards already set above
      }

      // Fetch actual shipment data for shipments table
      try {
        console.log('🚚 Fetching shipments data...');
        const shipmentsResponse = await ServiceFactory.admin.getShipments({
          from: date?.from?.toISOString(),
          to: date?.to?.toISOString()
        });
        console.log('🚚 Shipments response:', shipmentsResponse);

        if (shipmentsResponse.success && shipmentsResponse.data) {
          setShipments(shipmentsResponse.data.map((shipment: any) => ({
            orderId: shipment.orderId || shipment.id || 'N/A',
            date: shipment.date || shipment.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            seller: shipment.sellerName || 'Unknown Seller',
            product: shipment.productName || shipment.product || 'Product',
            weight: shipment.weight || '0g',
            payment: shipment.paymentMethod || 'COD',
            customer: shipment.customerName || 'Unknown Customer',
            carrier: shipment.carrier || 'Not Assigned',
            status: shipment.status || 'Pending',
            fulfilled: shipment.status === 'Delivered' ? 'Yes' : 'No',
            transactionAmount: shipment.amount || shipment.total || '₹0'
          })));
          console.log('🚚 Shipments data loaded:', shipmentsResponse.data?.length || 0, 'items');
        } else {
          console.warn('🚚 Shipments API returned no data or failed:', shipmentsResponse.message);
          setShipments([]); // Keep empty array for shipments
        }
      } catch (shipmentsError) {
        console.error("❌ Failed to fetch shipments data:", shipmentsError);
        setShipments([]); // Keep empty array for shipments
      }

      // Clear timeout since we completed successfully
      clearTimeout(timeoutId);
      setError(null);
      console.log('✅ Dashboard data fetch completed successfully');

    } catch (err) {
      console.error("❌ Critical error fetching dashboard data:", err);
      setError("Some dashboard data could not be loaded, showing available data.");
      toast.error("Some dashboard data could not be loaded");

      // Ensure we have fallback data even on complete failure
      setDashboardCards(fallbackDashboardCards);
      setOrders([]);
      setShipments([]);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  // useEffect to fetch data when component mounts or date changes
  useEffect(() => {
    fetchDashboardData();
  }, [date]);

  // Filtered data for seller dashboard
  const filteredOrders = filterByDateRange(orders, date);
  const filteredShipments = filterByDateRange(shipments, date);

  // Download handler
  const handleDownload = () => {
    console.log("Download clicked", filteredShipments);
    if (!filteredShipments.length) {
      alert("No data to download.");
      return;
    }
    const shipmentCSV = arrayToCSV(filteredShipments, [
      'orderId', 'date', 'seller', 'product', 'weight', 'payment', 'customer', 'carrier', 'status', 'fulfilled', 'transactionAmount', 'orders', 'capacityUsed', 'availableCapacity', 'activeOrders', 'delivered', 'inTransit', 'pending'
    ]);
    if (!shipmentCSV || shipmentCSV === '') {
      // Fallback: minimal test download
      const blob = new Blob(["test"], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "test.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert("CSV was empty, downloaded test file instead.");
      return;
    }
    downloadCSV('shipments.csv', shipmentCSV);
  };

  if (loading) {
    return (
      <PermissionGuard permission="dashboardAccess">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="dashboardAccess">
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="seller" className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-xl lg:text-2xl font-semibold">
              Dashboard
            </h1>
            <TabsList>
              <TabsTrigger value="seller">Seller Dashboard</TabsTrigger>
              <TabsTrigger value="customer">Customer Dashboard</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="seller" className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <DateRangePicker date={date} setDate={setDate} className="w-20 md:w-auto" />
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" className="w-full md:w-auto" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardCards.map((card) => (
                <Card
                  key={card.title}
                  className="bg-neutral-200"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base lg:text-lg font-medium">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl lg:text-3xl font-bold">
                      {card.value}
                    </p>
                    <p className="text-main text-sm mt-1">
                      {card.change}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Recent Orders</h2>
                  <Button variant="link" className="text-main">View All</Button>
                </div>
                <ShipmentsTable data={filteredOrders} type="order" />
              </div>

              {/* Shipments */}
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Shipments</h2>
                  <Button variant="link" className="text-main">View All</Button>
                </div>
                <ShipmentsTable data={filteredShipments} />
              </div>

              {/* Courier Load */}
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Courier Load</h2>
                  <Button variant="link" className="text-main">View All</Button>
                </div>
                <ShipmentsTable data={filteredShipments} type="courierLoad" />
              </div>

              {/* Courier Status */}
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Courier Status</h2>
                  <Button variant="link" className="text-main">View All</Button>
                </div>
                <ShipmentsTable data={filteredShipments} type="courierStatus" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-6">
            <AdminCustomerDashboardPage />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
};

export default AdminDashboardPage;
