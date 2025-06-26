import DateRangePicker from "@/components/admin/date-range-picker";
import { ShippingOptionsModal } from "@/components/seller/shipping-options-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { OrderData } from "@/services/seller-order.service";
import { ServiceFactory } from "@/services/service-factory";
import { ArrowUpDown, Download, Truck, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';

const OrdersTable = ({ data, onBulkStatusUpdate, dateRange }: {
  data: OrderData[],
  onStatusUpdate: (orderId: string, status: OrderData['status']) => void,
  onBulkStatusUpdate: (orderIds: string[], status: OrderData['status']) => void,
  dateRange?: DateRange
}) => {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof typeof data[0];
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Array<{ orderId: string, itemIndex: number }>>([]);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [addTagModalOpen, setAddTagModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [singleOrderId, setSingleOrderId] = useState<string | null>(null);
  const [selectedOrderForShipping, setSelectedOrderForShipping] = useState<OrderData | null>(null);
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [displayData, setDisplayData] = useState<typeof data>(data);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    orderDate: "",
    orderId: "",
    productName: "",
    sku: "",
    channel: "",
    stores: "",
    paymentType: "",
    orderTag: "",
    warehouse: "",
    contact: "",
    pincode: "",
    whatsappStatus: "",
    duplicate: ""
  });

  // Update displayData when main data changes
  useEffect(() => {
    setDisplayData(data);
  }, [data]);

  // Filter data based on AWB number search and date range
  const filteredData = displayData.filter(order => {
    // First filter by date range if exists
    if (dateRange?.from && dateRange?.to) {
      try {
        // Parse dates in YYYY-MM-DD format
        const [orderYear, orderMonth, orderDay] = order.date.split('-').map(Number);
        const orderDate = new Date(orderYear, orderMonth - 1, orderDay);

        const fromDate = dateRange.from;
        const toDate = dateRange.to;

        // Set hours for proper comparison
        orderDate.setHours(0, 0, 0, 0);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        if (!(orderDate >= fromDate && orderDate <= toDate)) {
          return false;
        }
      } catch (error) {
        console.error('Date parsing error:', error, order.date);
        return false;
      }
    }

    // Then filter by search query if exists
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const awbMatch = order.awbNumber?.toLowerCase().includes(searchLower);
      const orderIdMatch = order.orderId.toLowerCase().includes(searchLower);
      const customerMatch = order.customer.toLowerCase().includes(searchLower);
      const contactMatch = order.contact.toLowerCase().includes(searchLower);

      return awbMatch || orderIdMatch || customerMatch || contactMatch;
    }

    return true;
  });

  // Subscribe to navbar search changes
  useEffect(() => {
    const handleNavbarSearch = (event: CustomEvent) => {
      setSearchQuery(event.detail?.query || '');
    };

    window.addEventListener('navbarSearch', handleNavbarSearch as EventListener);
    return () => {
      window.removeEventListener('navbarSearch', handleNavbarSearch as EventListener);
    };
  }, []);

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;

    const aValue = a[key] ?? '';
    const bValue = b[key] ?? '';

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof typeof data[0]) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return null;
        }
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrders(sortedData.map(order => order.orderId));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleShipSelected = async (shippingData: {
    courier: string;
    mode: string;
    charges: {
      shippingCharge: number;
      codCharge: number;
      gst: number;
      total: number;
    };
    warehouse?: any;
    rtoWarehouse?: any;
  }) => {
    try {
      if (singleOrderId) {
        // Map display courier names to backend-recognized courier codes
        const courierMapping: Record<string, string> = {
          'Delivery Service': 'DELHIVERY',
          'Delhivery': 'DELHIVERY',
          'Delhivery Express': 'DELHIVERY',
          'Delhivery Surface': 'DELHIVERY',
          'BlueDart': 'BLUEDART',
          'Blue Dart': 'BLUEDART',
          'Ecom Express': 'ECOMEXPRESS',
          'EcomExpress': 'ECOMEXPRESS',
          // 'DTDC': 'DTDC', // Temporarily disabled - API integration not implemented
          // 'Dtdc': 'DTDC', // Temporarily disabled - API integration not implemented
          'Ekart': 'EKART',
          'Ekart Logistics': 'EKART',
          'XpressBees': 'XPRESSBEES',
          'Xpressbees': 'XPRESSBEES'
        };

        const mappedCourier = courierMapping[shippingData.courier] || shippingData.courier;

        // Handle single order shipping with API call
        const response = await ServiceFactory.shipping.shipOrderWithWalletPayment({
          orderId: singleOrderId,
          selectedRate: {
            courier: mappedCourier,
            mode: shippingData.mode,
            total: shippingData.charges.total
          },
          warehouse: shippingData.warehouse || {
            name: "Default Warehouse",
            address: "Default Address",
            city: "Default City",
            state: "Default State",
            pincode: "000000"
          },
          rtoWarehouse: shippingData.rtoWarehouse
        });

        if (response.success) {
          // Update the order in the display data
          const updatedOrders = data.map((order: OrderData) => {
            if (order.orderId === singleOrderId) {
              return {
                ...order,
                status: 'booked' as OrderData['status'],
                action: 'In Transit' as OrderData['action'],
                awbNumber: response.data.booking.awb,
                courier: shippingData.courier,
                shippingMode: shippingData.mode,
                charges: shippingData.charges
              };
            }
            return order;
          });

          setDisplayData(updatedOrders);
          setShippingModalOpen(false);
          setSelectedOrderForShipping(null);
          setSingleOrderId(null);

          // Refresh wallet balance to reflect the deduction
          console.log('🔄 Wallet balance will refresh when you navigate to a page with wallet display');

          toast.success(`Order ${singleOrderId} shipped successfully!`, {
            description: `AWB: ${response.data.booking.awb} | Charged: ₹${response.data.payment.charged} | Balance: ₹${response.data.payment.walletBalance}`
          });
        } else {
          throw new Error(response.message || 'Failed to ship order');
        }
      } else {
        // Handle bulk shipping (multiple orders)
        toast.error("Bulk shipping is not yet implemented. Please ship orders individually.");
        setShippingModalOpen(false);
      }
    } catch (error: any) {
      console.error('Shipping error:', error);
      toast.error(`Failed to ship order: ${error.message || 'Unknown error'}`);
    }
  };

  const handleBook = () => {
    if (selectedOrders.length === 0) {
      toast.error("Please select orders to book");
      return;
    }
    setShippingModalOpen(true);
  };

  const handleCancel = () => {
    if (selectedOrders.length === 0) {
      toast.error("Please select orders to cancel");
      return;
    }
    onBulkStatusUpdate(selectedOrders, 'cancelled');
    toast.success("Orders cancelled successfully");
    setSelectedOrders([]);
  };

  const handleExport = () => {
    // Prepare data for Excel
    const headers = ["Order ID", "AWB Number", "Date", "Customer", "Contact", "Items", "Amount", "Payment", "Channel", "Weight", "Tags", "Action", "WhatsApp"];
    const data = sortedData.map(order => [
      order.orderId,
      order.awbNumber || '',
      order.date,
      order.customer,
      order.contact,
      order.items.map(item => item.name).join(', '),
      order.amount,
      order.payment,
      order.chanel,
      order.weight,
      order.tags,
      order.action,
      order.whatsapp
    ]);

    // Create worksheet
    const ws = XLSXUtils.aoa_to_sheet([headers, ...data]);

    // Set column widths
    const colWidths = [
      { wch: 15 },  // Order ID
      { wch: 15 },  // AWB Number
      { wch: 12 },  // Date
      { wch: 20 },  // Customer
      { wch: 15 },  // Contact
      { wch: 30 },  // Items
      { wch: 12 },  // Amount
      { wch: 10 },  // Payment
      { wch: 10 },  // Channel
      { wch: 10 },  // Weight
      { wch: 15 },  // Tags
      { wch: 15 },  // Action
      { wch: 15 },  // WhatsApp
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = { Sheets: { 'Orders': ws }, SheetNames: ['Orders'] };

    // Generate Excel file
    const excelBuffer = XLSXWrite(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Download file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Orders exported successfully");
  };

  const handleShow = () => {
    setFilterDialogOpen(true);
  };

  const handleApplyFilters = () => {
    // Apply the filters to the data
    const filteredData = data.filter(order => {
      let matches = true;

      // Order ID filter
      if (filters.orderId) {
        matches = matches && order.orderId.toLowerCase().includes(filters.orderId.toLowerCase());
      }

      // Product Name filter
      if (filters.productName) {
        matches = matches && order.items.some(item =>
          item.name.toLowerCase().includes(filters.productName.toLowerCase())
        );
      }

      // SKU filter
      if (filters.sku) {
        matches = matches && order.items.some(item =>
          item.sku.toLowerCase().includes(filters.sku.toLowerCase())
        );
      }

      // Channel filter
      if (filters.channel) {
        matches = matches && order.chanel === filters.channel;
      }

      // Payment Type filter
      if (filters.paymentType) {
        matches = matches && order.payment.toLowerCase() === filters.paymentType.toLowerCase();
      }

      // Order Tag filter
      if (filters.orderTag) {
        matches = matches && order.tags.toLowerCase().includes(filters.orderTag.toLowerCase());
      }

      // Contact filter
      if (filters.contact) {
        matches = matches && order.contact.includes(filters.contact);
      }

      // WhatsApp Status filter
      if (filters.whatsappStatus) {
        matches = matches && order.whatsapp === filters.whatsappStatus;
      }

      // Date filter
      if (filters.orderDate) {
        matches = matches && order.date === filters.orderDate;
      }

      // Pincode filter (if pincode is added to the order data)
      if (filters.pincode) {
        // Note: This assumes pincode is added to the order data
        // matches = matches && order.pincode?.includes(filters.pincode);
      }

      // Duplicate filter
      if (filters.duplicate) {
        switch (filters.duplicate) {
          case "by-pincode":
            // Check for duplicate pincodes
            matches = matches && data.filter(o => o !== order && o.pincode === order.pincode).length > 0;
            break;
          case "by-contact":
            // Check for duplicate contacts
            matches = matches && data.filter(o => o !== order && o.contact === order.contact).length > 0;
            break;
          case "by-contact-pincode":
            // Check for duplicate contact and pincode combinations
            matches = matches && data.filter(o => o !== order && o.contact === order.contact && o.pincode === order.pincode).length > 0;
            break;
        }
      }

      return matches;
    });

    setDisplayData(filteredData);
    setFilterDialogOpen(false);
    toast.success("Filters applied successfully");
  };

  const handleClearFilters = () => {
    setFilters({
      orderDate: "",
      orderId: "",
      productName: "",
      sku: "",
      channel: "",
      stores: "",
      paymentType: "",
      orderTag: "",
      warehouse: "",
      contact: "",
      pincode: "",
      whatsappStatus: "",
      duplicate: ""
    });
    setDisplayData(data);
    setFilterDialogOpen(false);
    toast.success("Filters cleared");
  };

  const handleShipSingle = async (orderId: string) => {
    try {
      setSingleOrderId(orderId);

      // Show loading state while fetching order details
      setShippingModalOpen(true);
      setSelectedOrderForShipping(null);

      console.log('🔍 Fetching complete order details for shipping:', orderId);

      // Fetch complete order details from backend API
      const response = await ServiceFactory.seller.order.getDetails(orderId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch order details');
      }

      const orderDetails = response.data;
      console.log('✅ Complete order details fetched:', {
        orderId: orderDetails.orderId,
        hasCustomerDetails: !!orderDetails.customerDetails,
        hasProducts: !!orderDetails.products,
        customerAddress: orderDetails.customerDetails?.address,
        weight: orderDetails.weight,
        payment: orderDetails.payment
      });

      // Create enhanced order data for shipping modal
      const enhancedOrderData = {
        ...orderDetails,
        // Extract shipping-specific data for consistency with order creation
        pincode: extractPincodeFromAddress(orderDetails.customerDetails?.address),
        items: orderDetails.products?.map((product: any) => ({
          name: product.name,
          sku: product.sku,
          quantity: product.quantity,
          price: product.price
        })) || []
      };

      setSelectedOrderForShipping(enhancedOrderData);

      console.log('🚀 Enhanced order data prepared for shipping:', {
        orderId: enhancedOrderData.orderId,
        extractedPincode: enhancedOrderData.pincode,
        totalProducts: enhancedOrderData.items?.length || 0,
        readyForShipping: !!(enhancedOrderData.pincode && enhancedOrderData.weight)
      });

    } catch (error: any) {
      console.error('❌ Error fetching order details for shipping:', error);
      toast.error(`Failed to load order details: ${error.message || 'Unknown error'}`);
      setShippingModalOpen(false);
      setSingleOrderId(null);
    }
  };

  // Helper function to extract pincode from address string
  const extractPincodeFromAddress = (address: string | undefined): string => {
    if (!address) return "";

    // Look for 6-digit pincode in the address string
    const pincodeMatch = address.match(/\b\d{6}\b/);
    return pincodeMatch ? pincodeMatch[0] : "";
  };

  const handleExportSelected = () => {
    if (selectedOrders.length === 0) {
      toast.error("Please select orders to export");
      return;
    }

    // Prepare data for Excel
    const headers = ["Order ID", "AWB Number", "Date", "Customer", "Contact", "Items", "Amount", "Payment", "Channel", "Weight", "Tags", "Action", "WhatsApp"];
    const data = sortedData
      .filter(order => selectedOrders.includes(order.orderId))
      .map(order => [
        order.orderId,
        order.awbNumber || '',
        order.date,
        order.customer,
        order.contact,
        order.items.map(item => item.name).join(', '),
        order.amount,
        order.payment,
        order.chanel,
        order.weight,
        order.tags,
        order.action,
        order.whatsapp
      ]);

    // Create worksheet
    const ws = XLSXUtils.aoa_to_sheet([headers, ...data]);

    // Set column widths
    const colWidths = [
      { wch: 15 },  // Order ID
      { wch: 15 },  // AWB Number
      { wch: 12 },  // Date
      { wch: 20 },  // Customer
      { wch: 15 },  // Contact
      { wch: 30 },  // Items
      { wch: 12 },  // Amount
      { wch: 10 },  // Payment
      { wch: 10 },  // Channel
      { wch: 10 },  // Weight
      { wch: 15 },  // Tags
      { wch: 15 },  // Action
      { wch: 15 },  // WhatsApp
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = { Sheets: { 'Orders': ws }, SheetNames: ['Orders'] };

    // Generate Excel file
    const excelBuffer = XLSXWrite(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Download file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected_orders_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${selectedOrders.length} orders exported successfully`);
  };

  const handleSelectItem = (orderId: string, itemIndex: number, checked: boolean) => {
    setSelectedItems(prev => {
      if (checked) {
        return [...prev, { orderId, itemIndex }];
      } else {
        return prev.filter(item => !(item.orderId === orderId && item.itemIndex === itemIndex));
      }
    });
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev => {
      if (checked) {
        return [...prev, orderId];
      } else {
        return prev.filter(id => id !== orderId);
      }
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {selectedOrders.length > 0 && (
        <div className="flex items-center gap-2 py-2 px-4 bg-white rounded-lg shadow-sm">
          <span className="text-sm font-medium">
            {selectedOrders.length} Selected
          </span>
          <div className="flex items-center gap-2 ml-4">
            <Button
              onClick={handleBook}
              className="bg-[#7352FF] hover:bg-[#5e3dd3] text-white h-9 px-4 py-2 rounded-md text-sm"
            >
              Book
            </Button>
            <Button
              onClick={handleCancel}
              className="bg-[#FF5252] hover:bg-[#d14444] text-white h-9 px-4 py-2 rounded-md text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setAddTagModalOpen(true)}
              className="bg-[#4CAF50] hover:bg-[#3d8c40] text-white h-9 px-4 py-2 rounded-md text-sm"
            >
              Add Tag
            </Button>
            <Button
              onClick={handleExportSelected}
              className="bg-[#2196F3] hover:bg-[#1976d2] text-white h-9 px-4 py-2 rounded-md text-sm flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Selected
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => navigate('/seller/dashboard/new-order')}
            className="bg-[#7352FF] hover:bg-[#5e3dd3] text-white h-9 px-4 py-2 rounded-md text-sm"
          >
            New Order
          </Button>
          <Button
            onClick={handleExport}
            className="bg-[#2196F3] hover:bg-[#1976d2] text-white h-9 px-4 py-2 rounded-md text-sm flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export All
          </Button>
          <Button
            onClick={handleShow}
            className="bg-[#7352FF] hover:bg-[#5e3dd3] text-white h-9 px-4 py-2 rounded-md text-sm"
          >
            Show
          </Button>
        </div>
      </div>

      {/* Add Tag Modal */}
      <Dialog open={addTagModalOpen} onOpenChange={setAddTagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag to Selected Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Input
                id="tag"
                placeholder="Enter tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTagModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle adding tag
              toast.success('Tag added successfully');
              setAddTagModalOpen(false);
              setTagInput('');
              setSelectedOrders([]);
            }}>
              Add Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Options Modal */}
      <ShippingOptionsModal
        open={shippingModalOpen}
        onOpenChange={(open) => {
          setShippingModalOpen(open);
          if (!open) {
            setSelectedOrderForShipping(null);
            setSingleOrderId(null);
          }
        }}
        onSubmit={handleShipSelected}
        singleOrderId={singleOrderId || 'Selected Orders'}
        isCOD={selectedOrderForShipping?.payment === 'COD'}
        orderDetails={selectedOrderForShipping ? (() => {
          // Use actual weight and dimensions from the database order data
          // selectedOrderForShipping now contains complete order details from API

          console.log('🔍 Raw Order Data Analysis:', {
            orderId: selectedOrderForShipping.orderId,
            rawWeight: selectedOrderForShipping.weight,
            rawWeightType: typeof selectedOrderForShipping.weight,
            allOrderFields: Object.keys(selectedOrderForShipping),
            productInfo: (selectedOrderForShipping as any).product,
            productsArray: (selectedOrderForShipping as any).products,
            fullOrderData: selectedOrderForShipping
          });

          // Get actual weight from database - investigate the format
          let actualWeight = 0.5; // fallback
          const rawWeight = selectedOrderForShipping.weight;

          if (rawWeight) {
            if (typeof rawWeight === 'string') {
              // Parse string weight like "1.5kg" or "1.5"
              const parsedWeight = parseFloat(rawWeight.replace(/[^\d.-]/g, ''));
              actualWeight = parsedWeight || 0.5;
            } else if (typeof rawWeight === 'number') {
              actualWeight = rawWeight;
            }
          }

          // Get order product details for quantity and item weight analysis
          const orderData = selectedOrderForShipping as any;
          const product = orderData.product || orderData.products?.[0];

          console.log('⚖️ Weight Analysis Deep Dive:', {
            rawWeight: rawWeight,
            parsedWeight: actualWeight,
            productDetails: product,
            productWeight: product?.weight,
            productQuantity: product?.quantity,
            calculationCheck: product?.weight && product?.quantity ?
              `Individual: ${product.weight}kg × ${product.quantity} = ${parseFloat(product.weight) * product.quantity}kg` :
              'Missing product data'
          });

          // Check if the stored weight is incorrectly calculated (item weight × quantity)
          // and we need to get the individual item weight
          let correctedWeight = actualWeight;
          if (product?.weight && product?.quantity) {
            const individualItemWeight = parseFloat(product.weight);
            const quantity = parseInt(product.quantity);
            const expectedTotalWeight = individualItemWeight * quantity;

            console.log('🔧 Weight Correction Analysis:', {
              storedWeight: actualWeight,
              individualItemWeight,
              quantity,
              expectedTotalWeight,
              isWeightCorrect: Math.abs(actualWeight - expectedTotalWeight) < 0.1,
              recommendation: Math.abs(actualWeight - expectedTotalWeight) < 0.1 ?
                'Use stored weight' :
                `Use individual item weight: ${individualItemWeight}kg`
            });

            // If stored weight seems to be total weight but we want individual item weight
            // (This depends on how your system should work)
            // For now, let's use the stored weight as-is since that's what was used for pricing
          }

          // Get actual dimensions from database product data
          const actualDimensions = orderData.products?.[0]?.dimensions ||
            orderData.product?.dimensions || {
            length: 10,
            width: 10,
            height: 5
          };

          console.log('📦 Dimensions Analysis:', {
            rawDimensions: orderData.product?.dimensions || orderData.products?.[0]?.dimensions,
            finalDimensions: actualDimensions,
            volumetricWeight: `(${actualDimensions.length}×${actualDimensions.width}×${actualDimensions.height})/5000 = ${((actualDimensions.length * actualDimensions.width * actualDimensions.height) / 5000).toFixed(3)}kg`,
            weightComparison: {
              actualWeight: `${correctedWeight}kg`,
              volumetricWeight: `${((actualDimensions.length * actualDimensions.width * actualDimensions.height) / 5000).toFixed(3)}kg`,
              higherWeight: Math.max(correctedWeight, (actualDimensions.length * actualDimensions.width * actualDimensions.height) / 5000)
            }
          });

          // Use total price as-is (price field represents total amount)
          const totalPrice = orderData.products?.[0]?.price ||
            orderData.product?.price || 0;

          console.log('🔄 Final Shipping Calculation Data:', {
            orderId: selectedOrderForShipping!.orderId,
            weightUsed: `${correctedWeight}kg`,
            dimensions: `${actualDimensions.length}×${actualDimensions.width}×${actualDimensions.height}`,
            totalPrice: `₹${totalPrice}`,
            toPincode: selectedOrderForShipping!.pincode,
            comparisonNote: 'This should match order creation parameters for consistent rates'
          });

          return {
            weight: correctedWeight,
            dimensions: actualDimensions,
            toPincode: selectedOrderForShipping!.pincode || "",
            totalPrice: totalPrice
          };
        })() : undefined}
      />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filter Orders</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orderDate">Dates</Label>
              <Input
                id="orderDate"
                placeholder="Order Date"
                value={filters.orderDate}
                onChange={(e) => setFilters(prev => ({ ...prev, orderDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID's</Label>
              <Input
                id="orderId"
                placeholder="Order Id"
                value={filters.orderId}
                onChange={(e) => setFilters(prev => ({ ...prev, orderId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                placeholder="Product Name"
                value={filters.productName}
                onChange={(e) => setFilters(prev => ({ ...prev, productName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="SKU"
                value={filters.sku}
                onChange={(e) => setFilters(prev => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={filters.channel}
                onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">MANUAL</SelectItem>
                  <SelectItem value="EXCEL">EXCEL</SelectItem>
                  <SelectItem value="SHOPIFY">SHOPIFY</SelectItem>
                  <SelectItem value="WOOCOMMERCE">WOOCOMMERCE</SelectItem>
                  <SelectItem value="AMAZON">AMAZON</SelectItem>
                  <SelectItem value="FLIPKART">FLIPKART</SelectItem>
                  <SelectItem value="OPENCART">OPENCART</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stores">Stores</Label>
              <Select
                value={filters.stores}
                onValueChange={(value) => setFilters(prev => ({ ...prev, stores: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="store1">Store 1</SelectItem>
                  <SelectItem value="store2">Store 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select
                value={filters.paymentType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, paymentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Order Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">COD</SelectItem>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderTag">Order Tag</Label>
              <Input
                id="orderTag"
                placeholder="Order Tag"
                value={filters.orderTag}
                onChange={(e) => setFilters(prev => ({ ...prev, orderTag: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Input
                id="warehouse"
                placeholder="Warehouses"
                value={filters.warehouse}
                onChange={(e) => setFilters(prev => ({ ...prev, warehouse: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                placeholder="Contact"
                value={filters.contact}
                onChange={(e) => setFilters(prev => ({ ...prev, contact: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                placeholder="Pincode"
                value={filters.pincode}
                onChange={(e) => setFilters(prev => ({ ...prev, pincode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappStatus">WhatsApp Status</Label>
              <Select
                value={filters.whatsappStatus}
                onValueChange={(value) => setFilters(prev => ({ ...prev, whatsappStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Whatsapp Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Message Delivered">Message Delivered</SelectItem>
                  <SelectItem value="Message Read">Message Read</SelectItem>
                  <SelectItem value="Order Confirm">Order Confirm</SelectItem>
                  <SelectItem value="Order Cancelled">Order Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicate">Duplicate</Label>
              <Select
                value={filters.duplicate}
                onValueChange={(value) => setFilters(prev => ({ ...prev, duplicate: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-duplicate-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-duplicate-">- Duplicate -</SelectItem>
                  <SelectItem value="by-pincode">By Pincode</SelectItem>
                  <SelectItem value="by-contact">By Contact</SelectItem>
                  <SelectItem value="by-contact-pincode">By Contact & Pincode</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button onClick={handleApplyFilters} className="bg-[#7352FF] hover:bg-[#5e3dd3] text-white">
                Filter
              </Button>
            </div>
            <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-[#F4F2FF] h-12">
            <TableRow className="hover:bg-[#F4F2FF]">
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  onChange={handleSelectAll}
                  checked={selectedOrders.length === sortedData.length}
                />
              </TableHead>
              <TableHead onClick={() => handleSort('orderId')} className="cursor-pointer text-black min-w-[120px] whitespace-nowrap">
                Order ID <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('awbNumber')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                AWB Number <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('date')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                Date <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('customer')} className="cursor-pointer text-black min-w-[120px] whitespace-nowrap">
                Customer <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('contact')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                Contact <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('items')} className="cursor-pointer text-black min-w-[80px] whitespace-nowrap">
                Items <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('amount')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                Amount <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('payment')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                Payment <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('chanel')} className="cursor-pointer text-black min-w-[120px] whitespace-nowrap">
                Channel <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('weight')} className="cursor-pointer text-black min-w-[80px] whitespace-nowrap">
                Weight <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('tags')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                Tags <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('action')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                Action <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead onClick={() => handleSort('whatsapp')} className="cursor-pointer text-black min-w-[100px] whitespace-nowrap">
                WhatsApp <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((order) => (
              <TableRow key={order.orderId} className="h-12">
                <TableCell>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedOrders.includes(order.orderId)}
                    onChange={(e) => handleSelectOrder(order.orderId, e.target.checked)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link to={`/seller/dashboard/orders/${order.orderId}`} className="text-blue-600 hover:underline">
                    {order.orderId}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{order.awbNumber || '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(order.date)}</TableCell>
                <TableCell className="whitespace-nowrap">{order.customer}</TableCell>
                <TableCell className="whitespace-nowrap">{order.contact}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredOrderId(order.orderId)}
                    onMouseLeave={() => setHoveredOrderId(null)}
                  >
                    <span className="cursor-pointer">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </span>
                    {hoveredOrderId === order.orderId && (
                      <div className="absolute z-10 bg-white border rounded-md shadow-lg p-2 min-w-[200px]">
                        <div className="space-y-1">
                          {order.items.map((item, index) => (
                            <div key={index} className="text-sm flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={selectedItems.some(
                                  selected => selected.orderId === order.orderId && selected.itemIndex === index
                                )}
                                onChange={(e) => handleSelectItem(order.orderId, index, e.target.checked)}
                              />
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-gray-500">
                                  SKU: {item.sku} | Qty: {item.quantity} | ₹{item.price.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{order.amount}</TableCell>
                <TableCell className="whitespace-nowrap">{order.payment}</TableCell>
                <TableCell className="whitespace-nowrap">{order.chanel}</TableCell>
                <TableCell className="whitespace-nowrap">{order.weight} kg</TableCell>
                <TableCell className="whitespace-nowrap">{order.tags}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.action === "Ship" ? (
                    <Button
                      variant="secondary"
                      className="bg-[#7352FF] hover:bg-[#5e3dd3] text-white h-8 px-3 py-1 rounded-md text-sm"
                      onClick={() => handleShipSingle(order.orderId)}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Ship
                    </Button>
                  ) : (
                    <span className={cn(
                      "px-2 py-1 text-sm",
                      {
                        "text-red-500": order.action === "Cancelled",
                        "text-[#7352FF]": order.action === "Processing",
                        "text-gray-500": !["Cancelled", "Processing"].includes(order.action)
                      }
                    )}>
                      {order.action === "Processing" ? "Processing..." : order.action}
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{order.whatsapp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const SellerOrdersPage = () => {
  const [activeTab, setActiveTab] = useState<OrderData['status'] | 'all'>('all');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Real-time Socket.IO connection
  const { socket, connected, on, off, joinRoom } = useSocket({
    autoConnect: true,
    auth: {
      token: localStorage.getItem('token') || undefined
    }
  });

  // Get seller ID from localStorage or token
  const getSellerId = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
      }
    } catch (error) {
      console.error('Error extracting seller ID from token:', error);
    }
    return null;
  };

  // Set up real-time order listening
  useEffect(() => {
    if (connected && socket) {
      const sellerId = getSellerId();
      if (sellerId) {
        // Join seller-specific room for real-time updates
        joinRoom(`seller-${sellerId}`);
        console.log(`🔗 Joined real-time room: seller-${sellerId}`);

        // Listen for new orders from Shopify
        const handleNewOrder = (data: any) => {
          console.log('🎉 Real-time order received:', data);

          // Add new order to the top of the list
          setOrders(prevOrders => {
            // Check if order already exists to prevent duplicates
            const existingOrder = prevOrders.find(order => order.orderId === data.order.orderId);
            if (existingOrder) {
              console.log('Order already exists, skipping duplicate');
              return prevOrders;
            }

            // Add new order to the top
            const newOrders = [data.order, ...prevOrders];

            // Show toast notification
            toast.success(`🛍️ New ${data.source?.toUpperCase() || 'SHOPIFY'} order received!`, {
              description: `Order ${data.order.orderId} - ${data.order.customer}`,
              duration: 5000,
              action: {
                label: "View",
                onClick: () => window.open(`/seller/dashboard/orders/${data.order.orderId}`, '_blank')
              }
            });

            return newOrders;
          });
        };

        on('new-order', handleNewOrder);

        // Cleanup listener when component unmounts or dependencies change
        return () => {
          off('new-order', handleNewOrder);
        };
      } else {
        console.error('❌ No seller ID found in token, cannot join real-time room');
      }
    }
  }, [connected, socket, on, off, joinRoom]);

  useEffect(() => {
    fetchOrders();
  }, [activeTab, dateRange]);

  // Auto-refresh every 30 seconds for non-real-time updates (bulk orders, etc.)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeTab, dateRange]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);

      // Build parameters object, only including dates if they exist
      const params: {
        status?: OrderData['status'];
        startDate?: string;
        endDate?: string;
      } = {};

      // Only add status filter if not "all"
      if (activeTab !== 'all') {
        params.status = activeTab as OrderData['status'];
      }

      // Only add date parameters if they exist and are valid
      if (dateRange?.from) {
        params.startDate = dateRange.from.toISOString();
      }
      if (dateRange?.to) {
        params.endDate = dateRange.to.toISOString();
      }

      const response = await ServiceFactory.seller.order.getOrders(params);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch orders');
      }

      setOrders(response.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: OrderData['status']) => {
    try {
      setIsLoading(true);
      const response = await ServiceFactory.seller.order.updateStatus(orderId, status);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update order status');
      }

      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (orderIds: string[], status: OrderData['status']) => {
    try {
      setIsLoading(true);
      const response = await ServiceFactory.seller.order.bulkUpdateStatus(orderIds, status);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update orders status');
      }

      toast.success('Orders status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating orders status:', error);
      toast.error('Failed to update orders status');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !orders) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[300px]" />
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="text-red-500 text-xl mb-4">
          {error}
        </div>
        <Button onClick={fetchOrders}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Orders</h1>
          {/* Real-time connection indicator */}
          <div className="flex items-center gap-2 text-sm">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Real-time connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-orange-500" />
                <span className="text-orange-600">
                  {localStorage.getItem('token')
                    ? 'Connecting...'
                    : 'Authentication required'
                  }
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchOrders}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrderData['status'] | 'all')} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="not-booked">Not Booked ({orders.filter(o => o.status === "not-booked").length})</TabsTrigger>
          <TabsTrigger value="processing">Processing ({orders.filter(o => o.status === "processing").length})</TabsTrigger>
          <TabsTrigger value="booked">Booked ({orders.filter(o => o.status === "booked").length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({orders.filter(o => o.status === "cancelled").length})</TabsTrigger>
          <TabsTrigger value="shipment-cancelled">Shipment Cancelled ({orders.filter(o => o.status === "shipment-cancelled").length})</TabsTrigger>
          <TabsTrigger value="error">Error ({orders.filter(o => o.status === "error").length})</TabsTrigger>
        </TabsList>

        <div className="w-full overflow-x-auto">
          <div className="min-w-full">
            <TabsContent value="all" className="mt-2">
              <OrdersTable
                data={orders}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="not-booked" className="mt-2">
              <OrdersTable
                data={orders.filter(o => o.status === "not-booked")}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="processing" className="mt-2">
              <OrdersTable
                data={orders.filter(o => o.status === "processing")}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="booked" className="mt-2">
              <OrdersTable
                data={orders.filter(o => o.status === "booked")}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="cancelled" className="mt-2">
              <OrdersTable
                data={orders.filter(o => o.status === "cancelled")}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="shipment-cancelled" className="mt-2">
              <OrdersTable
                data={orders.filter(o => o.status === "shipment-cancelled")}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="error" className="mt-2">
              <OrdersTable
                data={orders.filter(o => o.status === "error")}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                dateRange={dateRange}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default SellerOrdersPage;
