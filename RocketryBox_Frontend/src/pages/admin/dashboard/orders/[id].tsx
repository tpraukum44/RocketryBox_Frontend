import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminService } from "@/services/admin.service";
import { ArrowLeftIcon, Copy, Edit, Loader2, Printer, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

interface OrderDetails {
  orderNo: string;
  orderDate: string;
  totalAmount: string;
  paymentType: string;
  orderCreationType: string;
  shipmentType: string;
  weight: string;
  status: string;
  category: string;
  orderType: string; // Added to track if it's customer or seller order
  customerDetails: {
    name: string;
    address: string;
    phone: string;
  };
  warehouseDetails: {
    name: string;
    address: string;
    phone: string;
  };
  products: {
    image: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    total: number;
  }[];
}

const AdminOrderDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isUpdateTrackingOpen, setIsUpdateTrackingOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Real API state management
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const adminService = new AdminService();

  // Fetch real order details from API
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) {
        setError("No order ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Fetching order details for ID:', id);

        // Try to get order details - first without type (auto-detect), then try specific types
        let response;
        try {
          console.log('🔄 Trying auto-detect approach...');
          response = await adminService.getOrderDetails(id);
          console.log('📥 Auto-detect response:', response);
        } catch (autoDetectError: any) {
          console.log('❌ Auto-detect failed, trying customer type...', autoDetectError.message);

          try {
            response = await adminService.getOrderDetails(id, 'customer');
            console.log('📥 Customer type response:', response);
          } catch (customerError: any) {
            console.log('❌ Customer type failed, trying seller type...', customerError.message);
            response = await adminService.getOrderDetails(id, 'seller');
            console.log('📥 Seller type response:', response);
          }
        }

        // AdminService.getOrderDetails returns the order data directly
        // Check if we have order data (response could be the order object itself or wrapped)
        const order = response.data || response;

        if (order && (order.id || (order as any)._id || order.orderId)) {
          console.log('✅ Valid order data found:', order);

          // Cast order as any to access dynamic API properties
          const orderData = order as any;

          // Transform API response to match interface
          const transformedOrder: OrderDetails = {
            orderNo: orderData.orderId || orderData.awb || orderData.id || id,
            orderDate: orderData.date || orderData.createdAt || new Date().toISOString().split('T')[0],
            totalAmount: `₹${orderData.amount || orderData.payment?.total || '0'}`,
            paymentType: orderData.orderType === 'customer' ? 'Prepaid' : (orderData.payment?.method || orderData.paymentMethod || orderData.payment || 'COD'),
            orderCreationType: orderData.orderType === 'seller' ? 'Seller Order' : 'Customer Order',
            shipmentType: orderData.serviceType || 'Forward Shipment',
            weight: `${orderData.weight || orderData.package?.weight || '0'} kg`,
            status: orderData.status || 'Unknown',
            category: orderData.category || 'General',
            orderType: orderData.orderType || 'seller', // Add orderType to transformed data
            customerDetails: {
              name: orderData.orderType === 'customer' ?
                (orderData.deliveryAddress?.name || orderData.customer?.name || 'Unknown Customer') :
                (orderData.customer?.name || 'Unknown Customer'),
              address: orderData.orderType === 'customer' ?
                (orderData.deliveryAddress?.address ?
                  `${orderData.deliveryAddress.address.line1 || ''}${orderData.deliveryAddress.address.line2 ? '\n' + orderData.deliveryAddress.address.line2 : ''}\n${orderData.deliveryAddress.address.city || ''}, ${orderData.deliveryAddress.address.state || ''} ${orderData.deliveryAddress.address.pincode || ''}\n${orderData.deliveryAddress.address.country || ''}` :
                  'Delivery address not available') :
                (orderData.customer?.address ||
                  (orderData.deliveryAddress ?
                    `${orderData.deliveryAddress.address1 || ''}\n${orderData.deliveryAddress.city || ''}, ${orderData.deliveryAddress.state || ''} ${orderData.deliveryAddress.pincode || ''}` :
                    'Address not available')),
              phone: orderData.orderType === 'customer' ?
                (orderData.deliveryAddress?.phone || orderData.customer?.phone || 'Not available') :
                (orderData.customer?.phone || orderData.deliveryAddress?.phone || 'Not available')
            },
            warehouseDetails: {
              name: orderData.orderType === 'customer' ?
                (orderData.pickupAddress?.name || 'Pickup Location') :
                (orderData.seller?.businessName || 'RocketryBox Warehouse'),
              address: orderData.orderType === 'customer' ?
                (orderData.pickupAddress?.address ?
                  `${orderData.pickupAddress.address.line1 || ''}${orderData.pickupAddress.address.line2 ? '\n' + orderData.pickupAddress.address.line2 : ''}\n${orderData.pickupAddress.address.city || ''}, ${orderData.pickupAddress.address.state || ''} ${orderData.pickupAddress.address.pincode || ''}\n${orderData.pickupAddress.address.country || ''}` :
                  'Pickup address not available') :
                (orderData.seller?.address ?
                  `${orderData.seller.address.address1 || ''}${orderData.seller.address.address2 ? '\n' + orderData.seller.address.address2 : ''}\n${orderData.seller.address.city || ''}, ${orderData.seller.address.state || ''} ${orderData.seller.address.pincode || ''}\n${orderData.seller.address.country || 'India'}` :
                  'Seller warehouse address not available'),
              phone: orderData.orderType === 'customer' ?
                (orderData.pickupAddress?.phone || 'Not available') :
                (orderData.seller?.phone || '+91-800-123-4567')
            },
            products: orderData.items ||
              (orderData.package?.items ? orderData.package.items.map((item: any) => ({
                image: '/images/default-product.jpg',
                name: item.name || 'Product',
                sku: item.sku || 'N/A',
                quantity: Number(item.quantity) || 1,
                price: Number(item.value || item.price) || 0,
                total: (Number(item.value || item.price) || 0) * (Number(item.quantity) || 1)
              })) : []) ||
              (orderData.product ? [{
                image: '/images/default-product.jpg',
                name: orderData.product.name || 'Product',
                sku: orderData.product.sku || 'N/A',
                quantity: Number(orderData.product.quantity) || 1,
                price: Number(orderData.product.price) || 0,
                total: (Number(orderData.product.price) || 0) * (Number(orderData.product.quantity) || 1)
              }] : [])
          };

          setOrderDetails(transformedOrder);
          console.log('✅ Order details transformed and set:', transformedOrder);
        } else {
          throw new Error(response.message || 'Failed to fetch order details');
        }
      } catch (err: any) {
        console.error('❌ Error fetching order details:', err);
        setError(err.message || 'Failed to load order details');
        toast.error('Failed to load order details: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  // Show loading state
  if (loading) {
    return (
      <div className="container py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading order details...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !orderDetails) {
    return (
      <div className="container py-4 max-w-7xl mx-auto">
        <div className="flex items-center mb-4">
          <Link to="/admin/dashboard/orders" className="mr-4">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Order Details</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleEdit = () => {
    navigate(`/admin/dashboard/orders/edit/${id}`);
    toast.success("Navigating to edit order");
  };

  const handleDuplicate = () => {
    navigate('/seller/dashboard/new-order', {
      state: { duplicateFrom: orderDetails }
    });
    toast.success("Redirecting to seller dashboard to create duplicate order");
  };

  const handlePrintLabel = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Generating shipping label...',
        success: () => {
          // Create a simple text content for the PDF (in a real app, this would be actual PDF content)
          const textContent = `
                    SHIPPING LABEL
                    ------------------
                    Order ID: ${orderDetails.orderNo}
                    Date: ${orderDetails.orderDate}

                    Customer:
                    ${orderDetails.customerDetails.name}
                    ${orderDetails.customerDetails.address}
                    Phone: ${orderDetails.customerDetails.phone}

                    Warehouse:
                    ${orderDetails.warehouseDetails.name}
                    ${orderDetails.warehouseDetails.address}

                    Weight: ${orderDetails.weight}
                    Shipment Type: ${orderDetails.shipmentType}

                    Products:
                    ${orderDetails.products.map(p => `${p.quantity}x ${p.name} (${p.sku})`).join('\n')}
                    `;

          // Create a blob with the text content
          const blob = new Blob([textContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);

          // Create a download link and trigger the download
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `shipping-label-${orderDetails.orderNo}.txt`);
          document.body.appendChild(link);
          link.click();

          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          return 'Shipping label downloaded successfully';
        },
        error: 'Failed to generate shipping label'
      }
    );
  };

  const handlePrintInvoice = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Generating invoice...',
        success: () => {
          // Calculate total with null safety
          const subtotal = orderDetails.products.reduce((sum, product) => sum + (product.total || 0), 0);
          const tax = subtotal * 0.18; // Assuming 18% tax
          const total = subtotal + tax;

          // Create a simple text content for the PDF (in a real app, this would be actual PDF content)
          const textContent = `
                    INVOICE
                    ------------------
                    Invoice #: INV-${orderDetails.orderNo}
                    Date: ${orderDetails.orderDate}

                    Billed To:
                    ${orderDetails.customerDetails.name}
                    ${orderDetails.customerDetails.address}
                    Phone: ${orderDetails.customerDetails.phone}

                    Products:
                    ${orderDetails.products.map(p =>
            `${p.quantity || 0}x ${p.name} (${p.sku}) - ₹${(p.price || 0).toFixed(2)}/item - ₹${(p.total || 0).toFixed(2)}`
          ).join('\n')}

                    Subtotal: ₹${subtotal.toFixed(2)}
                    Tax (18%): ₹${tax.toFixed(2)}
                    Total: ₹${total.toFixed(2)}

                    Payment Method: ${orderDetails.paymentType}

                    Thank you for your business!
                    `;

          // Create a blob with the text content
          const blob = new Blob([textContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);

          // Create a download link and trigger the download
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `invoice-${orderDetails.orderNo}.txt`);
          document.body.appendChild(link);
          link.click();

          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          return 'Invoice downloaded successfully';
        },
        error: 'Failed to generate invoice'
      }
    );
  };

  const handleCancelOrder = () => {
    setIsCancelDialogOpen(true);
  };

  const confirmCancelOrder = () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Cancelling order...',
        success: () => {
          setIsCancelDialogOpen(false);
          setCancelReason("");
          navigate("/admin/dashboard/orders");
          return 'Order cancelled successfully';
        },
        error: 'Failed to cancel order'
      }
    );
  };

  const handleMarkAsShipped = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Updating order status...',
        success: 'Order marked as shipped',
        error: 'Failed to update order status'
      }
    );
  };

  const handleUpdateTracking = () => {
    setIsUpdateTrackingOpen(true);
  };

  const confirmUpdateTracking = () => {
    if (!trackingNumber.trim()) {
      toast.error("Please provide a tracking number");
      return;
    }

    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Updating tracking number...',
        success: () => {
          setIsUpdateTrackingOpen(false);
          setTrackingNumber("");
          return 'Tracking number updated successfully';
        },
        error: 'Failed to update tracking number'
      }
    );
  };

  return (
    <div className="container py-4 max-w-7xl mx-auto">
      {/* Header with back button and actions */}
      <div className="flex items-center mb-4">
        <Link to="/admin/dashboard/orders" className="mr-4">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Order Details</h1>

        <div className="flex ml-auto space-x-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintLabel}>
            <Printer className="h-4 w-4 mr-2" />
            Print Label
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
          <Button variant="destructive" size="sm" onClick={handleCancelOrder}>
            <X className="h-4 w-4 mr-2" />
            Cancel Order
          </Button>
          <Button variant="outline" size="sm" onClick={handleMarkAsShipped}>
            Mark as Shipped
          </Button>
          <Button variant="outline" size="sm" onClick={handleUpdateTracking}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Tracking
          </Button>
        </div>
      </div>

      {/* Order information section */}
      <Card className="mb-4">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500">Order ID</div>
              <div className="flex items-center">
                <span className="font-medium">{orderDetails.orderNo}</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2" onClick={() => handleCopy(orderDetails.orderNo)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Order Date</div>
              <div className="font-medium">{orderDetails.orderDate}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="font-medium">{orderDetails.totalAmount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Payment Type</div>
              <div className="font-medium">{orderDetails.paymentType}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Order Creation Type</div>
              <div className="font-medium">{orderDetails.orderCreationType}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Shipment Type</div>
              <div className="font-medium">{orderDetails.shipmentType}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Weight</div>
              <div className="font-medium">{orderDetails.weight}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                {orderDetails.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-gray-500">Category</div>
              <div className="font-medium">{orderDetails.category}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address details - conditional based on order type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {orderDetails.orderType === 'customer' ? (
          <>
            {/* Pickup Address for Customer Orders */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Pickup Address</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium">{orderDetails.warehouseDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="whitespace-pre-line">{orderDetails.warehouseDetails.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium">{orderDetails.warehouseDetails.phone}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address for Customer Orders */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium">{orderDetails.customerDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="whitespace-pre-line">{orderDetails.customerDetails.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium">{orderDetails.customerDetails.phone}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Customer details for Seller Orders */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium">{orderDetails.customerDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="whitespace-pre-line">{orderDetails.customerDetails.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium">{orderDetails.customerDetails.phone}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warehouse details for Seller Orders */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Warehouse Details</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium">{orderDetails.warehouseDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="whitespace-pre-line">{orderDetails.warehouseDetails.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium">{orderDetails.warehouseDetails.phone}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Products table */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Products</h2>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-12">PRODUCT</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">QUANTITY</TableHead>
                <TableHead className="text-right">PRICE</TableHead>
                <TableHead className="text-right">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderDetails.products.map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                      <img src={product.image} alt={product.name} className="h-8 w-8 object-contain" />
                    </div>
                    <span className="font-medium">{product.name}</span>
                  </TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell className="text-center">{product.quantity || 0}</TableCell>
                  <TableCell className="text-right">₹{(product.price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{(product.total || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-6">
            <div className="w-64">
              <div className="flex justify-between font-medium text-lg">
                <span>Total Amount:</span>
                <span>{orderDetails.totalAmount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Tracking Dialog */}
      <Dialog open={isUpdateTrackingOpen} onOpenChange={setIsUpdateTrackingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Tracking Number</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="tracking-number">Tracking Number</Label>
            <Input
              id="tracking-number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateTrackingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUpdateTracking}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Reason for Cancellation</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={confirmCancelOrder}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrderDetailsPage;
