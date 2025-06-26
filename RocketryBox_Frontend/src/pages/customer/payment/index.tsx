import { Button } from "@/components/ui/button";
import apiClient from "@/config/api.config";
import { formatAddress, formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RazorpayErrorHandler } from "../../../utils/razorpayErrorHandler";

// Types
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface OrderResponse {
  _id: string;
  orderNumber: string;
  receiverName: string;
  receiverAddress1: string;
  receiverAddress2?: string;
  receiverCity: string;
  receiverState: string;
  receiverPincode: string;
  receiverMobile: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  packageType: string;
  pickupDate: string; // ISO date string from backend
  shippingPartner: {
    name: string;
    rate: number;
  };
  status: string;
  paymentStatus: string;
  totalAmount: number;
  awb?: string;
}

interface OrderData extends Omit<OrderResponse, 'pickupDate'> {
  pickupDate: Date;
  temporaryOrderData?: any; // Store original temporary order data for payment creation
}

interface PriceDetail {
  label: string;
  value: number;
}

// Constants
const GST_RATE = 0.18;
const PLATFORM_FEE = 25;

// Custom hooks
const useOrderData = () => {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setError(null);

        // Try to get order data from navigation state first
        let tempOrderData = location.state?.orderData;

        // If not in state, try session storage
        if (!tempOrderData) {
          const storedData = sessionStorage.getItem('pendingOrderData');
          if (storedData) {
            tempOrderData = JSON.parse(storedData);
          }
        }

        if (!tempOrderData) {
          throw new Error("No order data found. Please create an order first.");
        }

        console.log('📦 Loaded temporary order data:', tempOrderData);

        // Transform temporary order data to match OrderData interface
        const transformedData: OrderData = {
          _id: 'temp_' + Date.now(), // Temporary ID
          orderNumber: 'PENDING', // Will be generated after payment
          receiverName: tempOrderData.deliveryAddress.name,
          receiverAddress1: tempOrderData.deliveryAddress.address1,
          receiverAddress2: tempOrderData.deliveryAddress.address2 || '',
          receiverCity: tempOrderData.deliveryAddress.city,
          receiverState: tempOrderData.deliveryAddress.state,
          receiverPincode: tempOrderData.deliveryAddress.pincode,
          receiverMobile: tempOrderData.deliveryAddress.phone,
          weight: tempOrderData.package.weight,
          length: tempOrderData.package.dimensions.length,
          width: tempOrderData.package.dimensions.width,
          height: tempOrderData.package.dimensions.height,
          packageType: tempOrderData.selectedProvider?.serviceType || 'standard',
          pickupDate: new Date(tempOrderData.pickupDate),
          shippingPartner: {
            name: tempOrderData.selectedProvider?.name || 'RocketryBox Logistics',
            rate: tempOrderData.shippingRate || tempOrderData.selectedProvider?.totalRate || 0
          },
          status: 'pending',
          paymentStatus: 'pending',
          totalAmount: tempOrderData.shippingRate || tempOrderData.selectedProvider?.totalRate || 0,
          // Store the original temporary data for payment creation
          temporaryOrderData: tempOrderData
        };

        setOrderData(transformedData);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Failed to load order details";
        setError(errorMessage);
        toast.error(errorMessage);

        // Redirect to create order page after a delay
        setTimeout(() => {
          navigate('/customer/create-order');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderData();
  }, [location, navigate]);

  return { orderData, isLoading, error };
};

const usePayment = (orderData: OrderData | null) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate();

  const calculatePriceDetails = (data: OrderData): PriceDetail[] => {
    const shippingCost = data.shippingPartner.rate;
    const gstAmount = Math.round(shippingCost * GST_RATE);

    return [
      { label: "Shipping Cost", value: shippingCost },
      { label: "GST", value: gstAmount },
      { label: "Insurance", value: 0 },
      { label: "Platform Fee", value: PLATFORM_FEE }
    ];
  };

  const priceDetails = orderData ? calculatePriceDetails(orderData) : [];
  const total = priceDetails.reduce((acc, item) => acc + item.value, 0);

  const createPaymentOrder = async () => {
    console.log('🚀 Creating payment order...');

    // Create payment order with temporary order data
    const response = await apiClient.post('/api/v2/customer/payments/create-order', {
      orderData: orderData?.temporaryOrderData,
      amount: total,
      currency: 'INR'
    });

    if (!response.data || !response.data.success) {
      throw new Error(`Invalid response structure: ${JSON.stringify(response.data)}`);
    }

    const { data: responseData } = response.data;
    if (!responseData.orderId || !responseData.keyId) {
      throw new Error(`Missing required fields in response. orderId: ${responseData.orderId}, keyId: ${responseData.keyId}`);
    }

    return responseData;
  };

  const initializePayment = async () => {
    console.log('🔘 Pay button clicked!');

    if (!orderData) {
      console.log('❌ No order data available');
      toast.error('Order data not loaded. Please try again.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { orderId: razorpayOrderId, keyId } = await createPaymentOrder();

      console.log('✅ Payment order created successfully:', {
        razorpayOrderId,
        keyId: keyId ? 'Present' : 'Missing',
        amount: total
      });

      // Use enhanced Razorpay initialization with error handling
      const options = {
        key: keyId,
        amount: total * 100,
        currency: "INR",
        name: "RocketryBox",
        description: `Order Payment - ${orderData.orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: orderData.receiverName,
          contact: orderData.receiverMobile,
        },
        theme: {
          color: "#0070BA"
        },
        modal: {
          ondismiss: () => {
            console.log('💸 Payment modal dismissed');
            setIsProcessing(false);
          }
        },
        // Add config to handle validation issues
        config: {
          display: {
            language: 'en'
          }
        },
        // Disable retry for test mode to avoid validation loops
        retry: {
          enabled: false
        }
      };

      // Use the enhanced Razorpay error handler
      try {
        const response: RazorpayResponse = await RazorpayErrorHandler.initializeRazorpay(options);

        // Handle successful payment
        console.log('🎉 Payment completed, verifying...', response);

        // Verify payment
        const verificationResponse = await apiClient.post('/api/v2/customer/payments/verify', {
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        });

        console.log('✅ Payment verification response:', verificationResponse.data);

        // Enhanced success notification
        const verifiedOrder = verificationResponse.data?.data?.order;
        const orderNumber = verifiedOrder?.orderNumber || 'PENDING';
        const awbNumber = verifiedOrder?.awb;

        // Clear temporary order data
        sessionStorage.removeItem('pendingOrderData');

        // Show success message
        toast.success(
          <div className="flex flex-col gap-2">
            <div className="font-semibold text-green-800">🎉 Order Created Successfully!</div>
            <div className="text-sm text-gray-700">
              <strong>Order #{orderNumber}</strong> has been confirmed and is being processed.
            </div>
            {awbNumber && (
              <div className="text-sm text-gray-700">
                <strong>AWB:</strong> {awbNumber}
              </div>
            )}
          </div>,
          { duration: 8000 }
        );

        // Navigate to orders page
        setTimeout(() => {
          if (verifiedOrder?.id) {
            navigate(`/customer/orders/${verifiedOrder.id}`);
          } else {
            navigate("/customer/orders");
          }
        }, 2000);

      } catch (razorpayError) {
        console.error('❌ Razorpay payment failed:', razorpayError);

        // Handle specific Razorpay errors
        setPaymentError(razorpayError);
        setShowErrorModal(true);
      }

    } catch (error) {
      console.error('❌ Payment initialization failed:', error);

      // Handle general payment errors
      let errorMessage = "Payment initialization failed. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const axiosError = error as any;
        if (axiosError.response) {
          errorMessage = `Server error: ${axiosError.response.data?.message || axiosError.response.status}`;
        } else if (axiosError.request) {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = axiosError.message || errorMessage;
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const retryPayment = async () => {
    setShowErrorModal(false);
    await initializePayment();
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setPaymentError(null);
  };

  return {
    isProcessing,
    priceDetails,
    total,
    initializePayment,
    paymentError,
    showErrorModal,
    retryPayment,
    closeErrorModal
  };
};

// Components
const LoadingSpinner = () => (
  <div className="container mx-auto py-6 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-[#0070BA]" />
    <span className="ml-2 text-gray-600">Loading order details...</span>
  </div>
);

const ErrorDisplay = ({ error }: { error: string }) => (
  <div className="container mx-auto py-6 text-center">
    <p className="text-red-600">{error}</p>
    <Button
      onClick={() => window.location.href = '/customer/create-order'}
      className="mt-4"
    >
      Return to Create Order
    </Button>
  </div>
);

const PaymentPage = () => {
  const { orderData, isLoading, error } = useOrderData();
  const {
    isProcessing,
    priceDetails,
    total,
    initializePayment,
    paymentError,
    showErrorModal,
    retryPayment,
    closeErrorModal
  } = usePayment(orderData);
  const navigate = useNavigate();

  // Test Razorpay loading on component mount
  useEffect(() => {
    console.log('💳 PaymentPage mounted');
    console.log('🔧 Razorpay loaded:', typeof (window as any).Razorpay !== 'undefined');
    if (typeof (window as any).Razorpay === 'undefined') {
      console.warn('⚠️ Razorpay not loaded! Check if script is included in index.html');
    }
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error || !orderData) return <ErrorDisplay error={error || "Failed to load order details"} />;

  const handleChangeAddress = () => {
    // Store current order data back to session storage for editing
    if (orderData?.temporaryOrderData) {
      sessionStorage.setItem('pendingOrderData', JSON.stringify(orderData.temporaryOrderData));
    }
    navigate('/customer/create-order', {
      state: {
        editMode: 'address',
        orderData: orderData?.temporaryOrderData
      }
    });
  };

  const handleChangeOrder = () => {
    // Store current order data back to session storage for editing
    if (orderData?.temporaryOrderData) {
      sessionStorage.setItem('pendingOrderData', JSON.stringify(orderData.temporaryOrderData));
    }
    navigate('/customer/create-order', {
      state: {
        editMode: 'order',
        orderData: orderData?.temporaryOrderData
      }
    });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-xl font-medium mb-4 text-center">PAYMENT</h1>
      <div className="max-w-3xl mx-auto grid grid-cols-1 gap-4">
        <div className="space-y-4">
          {/* Delivery Address */}
          <div className="bg-[#0070BA] text-white p-4 rounded flex justify-between items-start">
            <div>
              <p className="text-sm mb-2">Delivery Address</p>
              <p className="text-sm">{orderData.receiverName}</p>
              <p className="text-sm">{formatAddress([
                orderData.receiverAddress1,
                orderData.receiverAddress2,
                orderData.receiverCity,
                orderData.receiverState,
                orderData.receiverPincode
              ])}</p>
            </div>
            <button
              className="text-xs bg-transparent border border-white px-2 py-1 rounded"
              onClick={handleChangeAddress}
            >
              Change
            </button>
          </div>

          {/* Order Summary */}
          <div className="bg-[#0070BA] text-white p-4 rounded flex justify-between items-start">
            <div>
              <p className="text-sm mb-2">Order Summary</p>
              <p className="text-sm">
                {orderData.length}×{orderData.width}×{orderData.height} cm, {orderData.packageType},
                Pickup: {formatDate(orderData.pickupDate)}
              </p>
            </div>
            <button
              className="text-xs bg-transparent border border-white px-2 py-1 rounded"
              onClick={handleChangeOrder}
            >
              Change
            </button>
          </div>
        </div>

        {/* Price Details */}
        <div className="bg-[#0070BA] text-white p-4 rounded">
          <p className="text-sm mb-3">Price Details</p>
          <div className="space-y-2 text-sm">
            {priceDetails.map((item) => (
              <div key={item.label} className="flex justify-between">
                <span>{item.label}</span>
                <span>{item.value ? formatCurrency(item.value) : '-'}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-white/20 mt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <Button
          className="w-full bg-[#0070BA] hover:bg-[#0070BA]/90 text-white"
          size="sm"
          disabled={isProcessing}
          onClick={initializePayment}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </span>
          ) : (
            `Pay ${formatCurrency(total)}`
          )}
        </Button>

        {/* Debug Info */}
        <div className="text-xs text-gray-500 text-center">
          Order: {orderData?._id ? 'Loaded' : 'Not loaded'} |
          Total: {formatCurrency(total)}
        </div>

        {/* Debug Test Button (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🧪 Test button clicked');
              console.log('🔧 Razorpay available:', typeof (window as any).Razorpay !== 'undefined');
              console.log('🔧 Payment state:', { orderData: !!orderData, total });
              if (typeof (window as any).Razorpay !== 'undefined') {
                console.log('✅ Razorpay is loaded and ready');
              } else {
                console.error('❌ Razorpay is not loaded');
              }
            }}
            className="w-full"
          >
            🧪 Test Razorpay (Dev Only)
          </Button>
        )}
      </div>

      {/* Payment Error Modal */}
      {showErrorModal && paymentError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Issue</h3>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                {paymentError?.errorHandler?.userMessage ||
                  "Payment service is temporarily unavailable. Please try again in a few minutes."}
              </p>

              <div className="mt-3">
                <p className="text-sm font-medium text-gray-600 mb-2">Try these solutions:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Wait 2-3 minutes and try again
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Clear browser cache and cookies
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Try using a different browser
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Contact customer support if issue persists
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={retryPayment}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Retrying...
                  </span>
                ) : (
                  'Try Again'
                )}
              </button>

              <button
                onClick={closeErrorModal}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            {/* Technical details for debugging */}
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer">Technical Details</summary>
              <div className="mt-2 text-xs text-gray-400 bg-gray-100 p-2 rounded">
                <p><strong>Error:</strong> {paymentError?.message || 'Unknown error'}</p>
                {paymentError?.statusCode && <p><strong>Status Code:</strong> {paymentError.statusCode}</p>}
                {paymentError?.code && <p><strong>Error Code:</strong> {paymentError.code}</p>}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
