import DateRangePicker from "@/components/admin/date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Link } from "react-router-dom";
import api from "@/config/api.config";

interface DashboardCard {
  title: string;
  value: string | number;
  change: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: string;
  lastOrder: string;
  status: string;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: string;
  status: "Delivered" | "In Transit" | "Processing" | "Cancelled";
  paymentMethod: string;
}

interface CustomerActivity {
  id: string;
  customerId: string;
  customerName: string;
  activity: string;
  timestamp: string;
  details: string;
}

// API Service for customer dashboard
const CustomerDashboardService = {
  async getCustomerDashboard(filters: { from?: string; to?: string } = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.from) queryParams.append('from', filters.from);
      if (filters.to) queryParams.append('to', filters.to);

      const response = await api.get(`/api/v2/admin/dashboard/customers?${queryParams.toString()}`);

      return response.data;
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Inactive":
      return "bg-red-100 text-red-800";
    case "New":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getOrderStatusStyle = (status: Order["status"]) => {
  switch (status) {
    case "Delivered":
      return "bg-green-100 text-green-800";
    case "In Transit":
      return "bg-blue-100 text-blue-800";
    case "Processing":
      return "bg-yellow-100 text-yellow-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const CustomersTable = ({ data }: { data: Customer[] }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F4F2FF] hover:bg-[#F4F2FF]">
            <TableHead className="min-w-[100px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Customer ID
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[150px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Name
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[200px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Email
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[150px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Phone
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[100px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Orders
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Total Spent
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Last Order
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[100px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Status
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">
                <Link to={`/admin/dashboard/customers/${customer.id}`} className="text-main hover:underline">
                  {customer.id.slice(-6).toUpperCase()}
                </Link>
              </TableCell>
              <TableCell>
                {customer.name}
              </TableCell>
              <TableCell>
                {customer.email}
              </TableCell>
              <TableCell>
                {customer.phone}
              </TableCell>
              <TableCell>
                {customer.orders}
              </TableCell>
              <TableCell>
                {customer.totalSpent}
              </TableCell>
              <TableCell>
                {customer.lastOrder}
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(customer.status)}`}>
                  {customer.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const OrdersTable = ({ data }: { data: Order[] }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F4F2FF] hover:bg-[#F4F2FF]">
            <TableHead className="min-w-[100px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Order ID
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[150px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Customer
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Date
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Amount
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[120px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Payment Method
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[100px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Status
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <Link to={`/admin/dashboard/orders/${order.id}`} className="text-main hover:underline">
                  {order.id}
                </Link>
              </TableCell>
              <TableCell>
                <Link to={`/admin/dashboard/customers/${order.customerId}`} className="text-main hover:underline">
                  {order.customerName}
                </Link>
              </TableCell>
              <TableCell>
                {order.date}
              </TableCell>
              <TableCell>
                {order.amount}
              </TableCell>
              <TableCell>
                {order.paymentMethod}
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusStyle(order.status)}`}>
                  {order.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ActivityTable = ({ data }: { data: CustomerActivity[] }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F4F2FF] hover:bg-[#F4F2FF]">
            <TableHead className="min-w-[100px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Activity ID
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[150px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Customer
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[150px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Activity
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[150px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Timestamp
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
            <TableHead className="min-w-[200px] whitespace-nowrap text-black">
              <div className="flex items-center gap-1 cursor-pointer">
                Details
                <ArrowUpDown className="size-3" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="font-medium">
                {activity.id}
              </TableCell>
              <TableCell>
                <Link to={`/admin/dashboard/customers/${activity.customerId}`} className="text-main hover:underline">
                  {activity.customerName}
                </Link>
              </TableCell>
              <TableCell>
                {activity.activity}
              </TableCell>
              <TableCell>
                {activity.timestamp}
              </TableCell>
              <TableCell>
                {activity.details}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// Helper function to filter by date range
function filterByDateRange<T>(data: T[], dateRange: DateRange | undefined, getDate: (item: T) => string | undefined) {
  if (!dateRange?.from || !dateRange?.to) return data;
  const from = dateRange.from.getTime();
  const to = dateRange.to.getTime();
  return data.filter(item => {
    const value = getDate(item);
    if (!value || value === "Never") return false;
    const itemDate = new Date(value).getTime();
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

const AdminCustomerDashboardPage = () => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(), // Today
  });

  // State for real data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [customerActivities, setCustomerActivities] = useState<CustomerActivity[]>([]);

  // Fetch real customer dashboard data
  useEffect(() => {
    const fetchCustomerDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Fetching customer dashboard data...');

        const filters = {
          from: date?.from?.toISOString(),
          to: date?.to?.toISOString()
        };

        const response = await CustomerDashboardService.getCustomerDashboard(filters);
        console.log('📊 Customer dashboard response:', response);

        if (response.success) {
          const data = response.data;

          // Update dashboard cards with real data
          setDashboardCards([
            {
              title: "Total Customers",
              value: data.cards.totalCustomers.toLocaleString(),
              change: "+12% from last month"
            },
            {
              title: "Active Customers",
              value: data.cards.activeCustomers.toLocaleString(),
              change: "+8% from last month"
            },
            {
              title: "New Customers",
              value: data.cards.newCustomers.toLocaleString(),
              change: "+15% from last month"
            },
            {
              title: "Customer Retention",
              value: data.cards.customerRetention,
              change: "+3% from last month"
            }
          ]);

          setCustomers(data.customers || []);
          setRecentOrders(data.recentOrders || []);
          setCustomerActivities(data.customerActivities || []);

          console.log('✅ Customer dashboard data loaded successfully');
        } else {
          setError('Failed to load customer dashboard data');
        }
      } catch (err) {
        console.error('❌ Error fetching customer dashboard:', err);
        setError('Failed to load customer dashboard data');

        // Set fallback data
        setDashboardCards([
          {
            title: "Total Customers",
            value: "0",
            change: "No data available"
          },
          {
            title: "Active Customers",
            value: "0",
            change: "No data available"
          },
          {
            title: "New Customers",
            value: "0",
            change: "No data available"
          },
          {
            title: "Customer Retention",
            value: "0%",
            change: "No data available"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDashboard();
  }, [date]);

  // Filtered data (for date range filtering if needed)
  const filteredOrders = filterByDateRange(recentOrders, date, (order) => order.date);
  const filteredActivities = filterByDateRange(customerActivities, date, (activity) => activity.timestamp.split(' ')[0]);
  const filteredCustomers = filterByDateRange(customers, date, (customer) => customer.lastOrder);

  // Download handler
  const handleDownload = () => {
    // Download all three tables as separate CSVs
    const customerCSV = arrayToCSV(filteredCustomers, [
      'id', 'name', 'email', 'phone', 'orders', 'totalSpent', 'lastOrder', 'status'
    ]);
    downloadCSV('customers.csv', customerCSV);

    const ordersCSV = arrayToCSV(filteredOrders, [
      'id', 'customerId', 'customerName', 'date', 'amount', 'status', 'paymentMethod'
    ]);
    downloadCSV('orders.csv', ordersCSV);

    const activitiesCSV = arrayToCSV(filteredActivities, [
      'id', 'customerId', 'customerName', 'activity', 'timestamp', 'details'
    ]);
    downloadCSV('customer_activities.csv', activitiesCSV);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="text-gray-600">Loading customer dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Date Range Picker and Download Button */}
      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
        <DateRangePicker date={date} setDate={setDate} className="w-20 md:w-auto" />
        <Button variant="outline" className="w-full md:w-auto" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      {/* Cards Grid - match seller dashboard */}
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

      {/* Recent Customers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Customers</h2>
          <Button variant="link" className="text-main">View All</Button>
        </div>
        {filteredCustomers.length > 0 ? (
          <CustomersTable data={filteredCustomers} />
        ) : (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-gray-500">No customers available</p>
            <p className="text-sm text-gray-400 mt-1">Data will appear here when customers register</p>
          </div>
        )}
      </div>

      {/* Recent Orders and Customer Activity in a grid like seller dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <Button variant="link" className="text-main">View All</Button>
          </div>
          {filteredOrders.length > 0 ? (
            <OrdersTable data={filteredOrders} />
          ) : (
            <div className="border rounded-lg p-8 text-center">
              <p className="text-gray-500">No orders available</p>
              <p className="text-sm text-gray-400 mt-1">Data will appear here when orders are placed</p>
            </div>
          )}
        </div>

        {/* Customer Activity */}
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Customer Activity</h2>
            <Button variant="link" className="text-main">View All</Button>
          </div>
          {filteredActivities.length > 0 ? (
            <ActivityTable data={filteredActivities} />
          ) : (
            <div className="border rounded-lg p-8 text-center">
              <p className="text-gray-500">No activity available</p>
              <p className="text-sm text-gray-400 mt-1">Data will appear here when customers are active</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerDashboardPage;
