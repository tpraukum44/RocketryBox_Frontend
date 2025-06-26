import { ShippingOptionsModal } from "@/components/seller/shipping-options-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { NewOrderInput, newOrderSchema } from "@/lib/validations/new-order";
import { ServiceFactory } from "@/services/service-factory";
import { type WarehouseData } from "@/services/warehouse.service";
import { generateBusinessOrderNumber } from "@/utils/orderNumberGenerator";
import { zodResolver } from "@hookform/resolvers/zod";
import { BoxesIcon, CreditCard, Info, MapPin, Package, RefreshCw, Save, Truck, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const SellerNewOrderPage = () => {
  const navigate = useNavigate();
  const [sameAsShipping, setSameAsShipping] = useState<boolean>(false);
  const [shippingModalOpen, setShippingModalOpen] = useState<boolean>(false);
  const [calculatedWeight, setCalculatedWeight] = useState<number>(0);
  const [volumetricWeight, setVolumetricWeight] = useState<number>(0);
  const [actualWeight, setActualWeight] = useState<number>(0);
  const [shipMode, setShipMode] = useState<boolean>(false); // Track if we're in ship mode or check rates mode

  // Get seller's profile for warehouse details
  const { profile, isLoading: profileLoading } = useProfile();

  // Get wallet information for balance checking
  const { walletBalance, isLoadingBalance, getWalletBalance } = useWallet();

  // Extract warehouse pincode from seller's profile
  const warehousePincode = useMemo(() => {
    if (!profile || !profile.address) return null;

    // Check multiple possible pincode fields based on the backend structure
    const address = profile.address as any;
    const pincode = address.pincode || address.postalCode;

    // Validate pincode format
    if (pincode && /^\d{6}$/.test(pincode)) {
      return pincode;
    }

    return null;
  }, [profile]);

  // Show warning if warehouse pincode is not configured
  useEffect(() => {
    if (!profileLoading && profile && !warehousePincode) {
      toast.error(
        "Warehouse address not configured",
        {
          description: "Please complete your business address in Profile Settings before creating orders. A valid 6-digit pincode is required for shipping."
        }
      );
    }
  }, [profileLoading, profile, warehousePincode]);

  // Check if seller has GST TIN configured
  const sellerGstTin = useMemo(() => {
    if (!profile) return null;
    // Check the actual GST field from documents structure
    const profileAny = profile as any;
    const gstTin = profileAny.documents?.gstin?.number || profileAny.documents?.gstin;

    // Debug logging to see profile structure
    console.log('🔍 Profile GST TIN Check:', {
      hasProfile: !!profile,
      hasDocuments: !!profileAny.documents,
      hasGstin: !!profileAny.documents?.gstin,
      gstinStructure: profileAny.documents?.gstin,
      detectedGstTin: gstTin,
      fullDocuments: profileAny.documents
    });

    return gstTin || null;
  }, [profile]);

  // Utility function to safely convert any value to number
  const toNumber = (value: any, fallback: number = 0): number => {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? fallback : num;
  };

  // Utility function to safely convert any value to integer
  const toInteger = (value: any, fallback: number = 0): number => {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(Number(value));
    return isNaN(num) ? fallback : num;
  };

  const [items, setItems] = useState<Array<{
    sku: string;
    itemName: string;
    quantity: number;
    itemWeight: number;
    itemPrice: number;
  }>>([]);

  // Order number generation states
  const [isGeneratingOrderNumber, setIsGeneratingOrderNumber] = useState<boolean>(false);

  const form = useForm<NewOrderInput>({
    resolver: zodResolver(newOrderSchema),
    mode: "onChange",
    criteriaMode: "all",
    defaultValues: {
      orderNumber: "",
      shipmentType: "FORWARD",
      paymentType: "COD",
      fullName: "",
      contactNumber: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      landmark: "",
      pincode: "",
      city: "",
      state: "",
      items: [],
      sku: "",
      itemName: "",
      quantity: undefined,
      itemWeight: undefined,
      itemPrice: undefined,
      collectibleAmount: undefined,
      shippingCharge: 0,
      codCharge: 0,
      taxAmount: 0,
      discount: 0,
      length: undefined,
      width: undefined,
      height: undefined,
      weight: undefined,
      totalAmount: 0,
      courier: "",
      warehouse: "",
      rtoWarehouse: "",
      shippingMode: "",
    },
  });

  // Note: Order number is now manually entered by seller
  // Auto-generation removed to allow seller input

  /**
   * Generate a suggested order number (optional for seller)
   */
  const generateNewOrderNumber = async () => {
    setIsGeneratingOrderNumber(true);

    try {
      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get seller ID from context/storage (fallback to random if not available)
      const sellerId = localStorage.getItem('seller_id') || Math.random().toString(36).substr(2, 8);

      // Generate professional order number
      const newOrderNumber = generateBusinessOrderNumber(sellerId);

      // Set the suggested order number in the form
      form.setValue('orderNumber', newOrderNumber, {
        shouldValidate: true,
        shouldDirty: true // Mark as dirty since user can edit
      });

      toast.success(`Suggested order number: ${newOrderNumber}`, {
        description: "You can edit this or use your own format",
        duration: 3000,
      });

    } catch (error) {
      console.error('Error generating order number:', error);
      toast.error('Failed to generate suggestion. You can enter your own order number.');
    } finally {
      setIsGeneratingOrderNumber(false);
    }
  };

  /**
   * Handle generating a suggested order number
   */
  const handleRegenerateOrderNumber = () => {
    generateNewOrderNumber();
  };

  // Calculate volumetric weight when dimensions or actual weight change
  useEffect(() => {
    // Get raw values from form
    const rawLength = form.getValues('length');
    const rawWidth = form.getValues('width');
    const rawHeight = form.getValues('height');
    const rawQuantity = form.getValues('quantity');
    const rawItemWeight = form.getValues('itemWeight');

    // Convert to numbers using utility functions
    const length = toNumber(rawLength);
    const width = toNumber(rawWidth);
    const height = toNumber(rawHeight);
    const quantity = toInteger(rawQuantity, 1);
    const itemWeight = toNumber(rawItemWeight);

    // Calculate volumetric weight only if all dimensions are provided
    // IMPORTANT: Dimensions should represent the PACKAGE dimensions (containing all items)
    let newVolumetricWeight = 0;
    if (length > 0 && width > 0 && height > 0) {
      // Standard volumetric weight formula: (L × W × H) / 5000
      // NOTE: Don't multiply by quantity if dimensions are package dimensions
      newVolumetricWeight = (length * width * height) / 5000;
      setVolumetricWeight(newVolumetricWeight);
    } else {
      setVolumetricWeight(0);
    }

    // Calculate actual weight (total weight of all items)
    const newActualWeight = itemWeight * quantity;
    setActualWeight(newActualWeight);

    // Use the higher weight for shipping calculations (industry standard)
    const finalWeight = Math.max(newVolumetricWeight, newActualWeight);
    setCalculatedWeight(finalWeight);
    form.setValue('weight', finalWeight);

    // Enhanced debugging for weight calculation consistency
    console.log('📦 Order Creation Weight Calculation:', {
      individualItemWeight: `${itemWeight}kg`,
      quantity: quantity,
      totalActualWeight: `${newActualWeight}kg (${itemWeight}kg × ${quantity})`,
      packageDimensions: `${length}×${width}×${height}cm`,
      volumetricWeight: `${newVolumetricWeight.toFixed(3)}kg ((${length}×${width}×${height})/5000)`,
      comparisonCheck: `Max(${newActualWeight}kg, ${newVolumetricWeight.toFixed(3)}kg) = ${finalWeight}kg`,
      finalChargeableWeight: `${finalWeight}kg`,
      weightUsed: finalWeight === newActualWeight ? 'Actual Weight (heavier)' : 'Volumetric Weight (heavier)',
      consistencyNote: 'This logic should match shipment calculation for same rates',
      dimensionAssumption: 'Dimensions represent package dimensions (not individual item)'
    });

  }, [form.watch(['length', 'width', 'height', 'quantity', 'itemWeight'])]);

  const onSubmit = async (data: NewOrderInput) => {
    try {
      // Smart item handling: Use items array if available, otherwise use current form fields
      let itemToUse;
      let totalItemPrice = 0;

      if (data.items.length > 0) {
        // Use items from the array (for multiple items workflow)
        itemToUse = data.items[0];
        totalItemPrice = data.items.reduce((sum, item) => sum + item.itemPrice, 0); // itemPrice is already total price
      } else {
        // Use current form fields directly (simpler workflow)
        const itemName = data.itemName;
        const itemWeight = toNumber(data.itemWeight);
        const itemPrice = toNumber(data.itemPrice);
        const quantity = toInteger(data.quantity, 1);

        // Validate that required item fields are filled
        if (!itemName || itemWeight <= 0 || itemPrice <= 0) {
          toast.error("Please fill in all required item details: Item Name, Weight, and Price");
          return;
        }

        // Create item object from form fields
        itemToUse = {
          sku: data.sku || '',
          itemName: itemName,
          quantity: quantity,
          itemWeight: itemWeight,
          itemPrice: itemPrice
        };

        totalItemPrice = itemPrice; // itemPrice is already the total price
      }

      // Transform frontend form data to backend expected structure
      const firstItem = itemToUse;

      // Prepare order data in backend expected format
      const orderData = {
        orderId: data.orderNumber,
        customer: {
          name: data.fullName,
          phone: data.contactNumber,
          email: data.email || '', // Provide default if empty
          address: {
            street: data.addressLine2 ? `${data.addressLine1}, ${data.addressLine2}` : data.addressLine1,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            country: 'India'
          }
        },
        product: {
          name: firstItem.itemName,
          sku: firstItem.sku || '',
          quantity: firstItem.quantity,
          price: firstItem.itemPrice,
          weight: (firstItem.itemWeight * firstItem.quantity).toString(), // Total weight = item weight × quantity
          dimensions: {
            length: toNumber(data.length, 10),
            width: toNumber(data.width, 10),
            height: toNumber(data.height, 10)
          }
        },
        payment: {
          method: data.paymentType === 'COD' ? 'COD' as const : 'Prepaid' as const,
          amount: totalItemPrice.toString(),
          codCharge: data.paymentType === 'COD' ? toNumber(data.codCharge).toString() : '0',
          shippingCharge: toNumber(data.shippingCharge).toString(),
          gst: toNumber(data.taxAmount).toString(),
          total: toNumber(data.totalAmount, totalItemPrice).toString()
        },
        channel: 'MANUAL'
      };

      console.log('✅ Creating order with complete data:', {
        ...orderData,
        additionalInfo: {
          volumetricWeight,
          actualWeight: firstItem.itemWeight * firstItem.quantity,
          chargeableWeight: calculatedWeight || (firstItem.itemWeight * firstItem.quantity),
          warehouseConfigured: !!warehousePincode
        }
      });

      const response = await ServiceFactory.seller.order.createOrder(orderData);

      if (!response.success) {
        // 🚨 LOG RAW ERROR DETAILS FOR DEBUGGING
        console.error('🔥 RAW ORDER CREATION ERROR:', {
          fullResponse: response,
          errorMessage: response.message,
          statusCode: response.status,
          rawResponseData: JSON.stringify(response, null, 2)
        });

        // Handle duplicate order ID error specifically
        if (response.message?.includes('E11000') && response.message?.includes('orderId')) {
          throw new Error(`Order ID "${data.orderNumber}" already exists. Please use a different order number.`);
        }
        throw new Error(response.message || 'Failed to create order');
      }

      const createdOrder = response.data.order;
      toast.success(`Order created successfully with ID: ${createdOrder.orderId}`);

      // Navigate to orders page after successful creation
      navigate('/seller/dashboard/orders');
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create order");
    }
  };



  const handleShipSelected = async (options: {
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
    console.log('📦 New Order Received Shipping Selection:', {
      courier: options.courier,
      mode: options.mode,
      receivedCharges: {
        shippingCharge: `₹${options.charges.shippingCharge}`,
        codCharge: `₹${options.charges.codCharge}`,
        gst: `₹${options.charges.gst}`,
        total: `₹${options.charges.total}`
      },
      rawCharges: options.charges,
      source: 'ShippingOptionsModal',
      shipMode: shipMode
    });

    if (shipMode) {
      // Create shipment directly
      await handleCreateShipment(options);
    } else {
      // Original behavior: update form values
      // Ensure all charges are proper numbers
      const shippingCharge = toNumber(options.charges.shippingCharge);
      const codCharge = toNumber(options.charges.codCharge);
      const gst = toNumber(options.charges.gst);
      const total = toNumber(options.charges.total);

      const processedCharges = {
        shippingCharge,
        codCharge,
        gst,
        total
      };

      console.log('🔢 Processed charges after toNumber conversion:', {
        original: options.charges,
        processed: processedCharges,
        differences: {
          shippingCharge: shippingCharge !== options.charges.shippingCharge ? `${options.charges.shippingCharge} → ${shippingCharge}` : 'No change',
          codCharge: codCharge !== options.charges.codCharge ? `${options.charges.codCharge} → ${codCharge}` : 'No change',
          gst: gst !== options.charges.gst ? `${options.charges.gst} → ${gst}` : 'No change',
          total: total !== options.charges.total ? `${options.charges.total} → ${total}` : 'No change'
        }
      });

      // Set form values with explicit field updates using correct breakdown
      form.setValue("courier", options.courier);
      form.setValue("shippingMode", options.mode);
      form.setValue("shippingCharge", shippingCharge); // Use base shipping charge
      form.setValue("codCharge", codCharge);
      form.setValue("taxAmount", gst);
      form.setValue("totalAmount", total); // Total includes shipping + COD + GST

      console.log('✅ Setting form values:', {
        courier: options.courier,
        shippingMode: options.mode,
        shippingCharge: shippingCharge, // Base shipping cost
        codCharge: codCharge,
        taxAmount: gst,
        totalAmount: total, // Complete total
        breakdown: `₹${shippingCharge} + ₹${codCharge} + ₹${gst} = ₹${total}`,
        formUpdate: 'Individual setValue calls made'
      });

      // Get current form values to verify they were set correctly
      const currentFormValues = form.getValues();
      console.log('🔍 Current form values after update:', {
        courier: currentFormValues.courier,
        shippingMode: currentFormValues.shippingMode,
        shippingCharge: `₹${currentFormValues.shippingCharge}`,
        codCharge: `₹${currentFormValues.codCharge}`,
        taxAmount: `₹${currentFormValues.taxAmount}`,
        totalAmount: `₹${currentFormValues.totalAmount}`,
        allShippingFields: {
          courier: currentFormValues.courier,
          shippingMode: currentFormValues.shippingMode,
          shippingCharge: currentFormValues.shippingCharge,
          codCharge: currentFormValues.codCharge,
          taxAmount: currentFormValues.taxAmount,
          totalAmount: currentFormValues.totalAmount
        }
      });
    }

    setShippingModalOpen(false);
  };

  const handleCreateShipment = async (shippingOptions: {
    courier: string;
    mode: string;
    charges: {
      shippingCharge: number;
      codCharge: number;
      gst: number;
      total: number;
    };
    warehouse?: WarehouseData | null;
    rtoWarehouse?: WarehouseData | null;
  }) => {
    try {
      // First create the order
      const data = form.getValues();

      // Smart item handling: Use items array if available, otherwise use current form fields
      let itemToUse;
      let totalItemPrice = 0;

      if (data.items.length > 0) {
        // Use items from the array (for multiple items workflow)
        itemToUse = data.items[0];
        totalItemPrice = data.items.reduce((sum, item) => sum + item.itemPrice, 0); // itemPrice is already total price
      } else {
        // Use current form fields directly (simpler workflow)
        const itemName = data.itemName;
        const itemWeight = toNumber(data.itemWeight);
        const itemPrice = toNumber(data.itemPrice);
        const quantity = toInteger(data.quantity, 1);

        // Validate that required item fields are filled
        if (!itemName || itemWeight <= 0 || itemPrice <= 0) {
          toast.error("Please fill in all required item details: Item Name, Weight, and Price");
          return;
        }

        // Create item object from form fields
        itemToUse = {
          sku: data.sku || '',
          itemName: itemName,
          quantity: quantity,
          itemWeight: itemWeight,
          itemPrice: itemPrice
        };

        totalItemPrice = itemPrice; // itemPrice is already the total price
      }

      // Transform frontend form data to backend expected structure
      const firstItem = itemToUse;

      // Prepare order data in backend expected format
      const orderData = {
        orderId: data.orderNumber,
        customer: {
          name: data.fullName,
          phone: data.contactNumber,
          email: data.email || '', // Provide default if empty
          address: {
            street: data.addressLine2 ? `${data.addressLine1}, ${data.addressLine2}` : data.addressLine1,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            country: 'India'
          }
        },
        product: {
          name: firstItem.itemName,
          sku: firstItem.sku || '',
          quantity: firstItem.quantity,
          price: firstItem.itemPrice,
          weight: (firstItem.itemWeight * firstItem.quantity).toString(), // Total weight = item weight × quantity
          dimensions: {
            length: toNumber(data.length, 10),
            width: toNumber(data.width, 10),
            height: toNumber(data.height, 10)
          }
        },
        payment: {
          method: data.paymentType === 'COD' ? 'COD' as const : 'Prepaid' as const,
          amount: totalItemPrice.toString(),
          codCharge: data.paymentType === 'COD' ? toNumber(shippingOptions.charges.codCharge).toString() : '0',
          shippingCharge: toNumber(shippingOptions.charges.shippingCharge).toString(),
          gst: toNumber(shippingOptions.charges.gst).toString(),
          total: toNumber(shippingOptions.charges.total, totalItemPrice).toString()
        },
        channel: 'MANUAL'
      };

      console.log('✅ Creating order with complete data for shipment:', {
        ...orderData,
        shippingSelection: shippingOptions,
        additionalInfo: {
          volumetricWeight,
          actualWeight: firstItem.itemWeight * firstItem.quantity,
          chargeableWeight: calculatedWeight || (firstItem.itemWeight * firstItem.quantity),
          warehouseConfigured: !!warehousePincode
        }
      });

      // Create the order first
      const orderResponse = await ServiceFactory.seller.order.createOrder(orderData);

      if (!orderResponse.success) {
        // 🚨 LOG RAW ERROR DETAILS FOR DEBUGGING
        console.error('🔥 RAW ORDER CREATION ERROR:', {
          fullResponse: orderResponse,
          errorMessage: orderResponse.message,
          statusCode: orderResponse.status,
          rawResponseData: JSON.stringify(orderResponse, null, 2)
        });

        // Handle duplicate order ID error specifically
        if (orderResponse.message?.includes('E11000') && orderResponse.message?.includes('orderId')) {
          throw new Error(`Order ID "${data.orderNumber}" already exists. Please use a different order number.`);
        }
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const createdOrder = orderResponse.data.order;
      toast.success(`Order created successfully with ID: ${createdOrder.orderId}`);

      // Now create the shipment
      const shipmentData = {
        orderId: createdOrder.orderId,
        selectedRate: {
          courier: shippingOptions.courier,
          mode: shippingOptions.mode,
          total: shippingOptions.charges.total,
          zone: '', // Will be filled by backend
          weight: calculatedWeight?.toString() || (firstItem.itemWeight * firstItem.quantity).toString(),
          base: shippingOptions.charges.shippingCharge,
          addlCharge: 0
        },
        warehouse: shippingOptions.warehouse || {
          name: "Default Warehouse",
          address: "Default Address",
          city: "Default City",
          state: "Default State",
          pincode: "000000"
        },
        rtoWarehouse: shippingOptions.rtoWarehouse || undefined
      };

      console.log('🚢 Creating shipment with data:', shipmentData);

      // Show wallet payment processing message
      toast.info("Processing wallet payment and creating shipment...", {
        duration: 2000,
      });

      const shipmentResponse = await ServiceFactory.shipping.shipOrderWithWalletPayment(shipmentData);

      console.log('🔍 Full shipment response:', shipmentResponse);

      if (!shipmentResponse.success) {
        console.error('❌ Shipment creation failed:', {
          success: shipmentResponse.success,
          message: shipmentResponse.message,
          data: shipmentResponse.data,
          fullResponse: shipmentResponse
        });

        // Handle specific wallet payment errors
        if (shipmentResponse.message?.toLowerCase().includes('insufficient balance') ||
          shipmentResponse.message?.toLowerCase().includes('wallet balance')) {
          throw new Error('Insufficient wallet balance. Please recharge your wallet and try again.');
        }

        // Handle specific Ekart serviceability errors
        if (shipmentResponse.message?.includes('SWIFT_RESOURCE_NOT_FOUND_EXCEPTION')) {
          throw new Error('Ekart service not available for this location combination. This often happens in development mode. Please try BlueDart, Delhivery, or other shipping partners from the rates list.');
        }

        // Handle other Ekart API errors
        if (shipmentResponse.message?.includes('Ekart API booking failed')) {
          throw new Error(shipmentResponse.message + ' For development testing, we recommend using BlueDart, Delhivery, or XpressBees instead of Ekart.');
        }

        // Handle EcomExpress service unavailable errors
        if (shipmentResponse.message?.includes('EcomExpress API booking failed') &&
          shipmentResponse.message?.includes('503')) {
          throw new Error('EcomExpress service is temporarily unavailable (503 error). Please try BlueDart or Delhivery from the rates list.');
        }

        // Handle other EcomExpress API errors
        if (shipmentResponse.message?.includes('EcomExpress API booking failed')) {
          throw new Error(shipmentResponse.message + ' Please try BlueDart or Delhivery for more reliable development testing.');
        }

        throw new Error(shipmentResponse.message || 'Failed to create shipment');
      }

      const createdShipment = shipmentResponse.data;

      // Show detailed success message with payment info
      const paymentInfo = createdShipment.payment;
      if (paymentInfo) {
        toast.success(
          `Shipment created successfully! AWB: ${createdShipment.shipment.awb}
           Payment: ₹${paymentInfo.charged} deducted from wallet
           Remaining Balance: ₹${paymentInfo.walletBalance}`,
          {
            duration: 5000,
          }
        );
      } else {
        toast.success(`Shipment created successfully with AWB: ${createdShipment.shipment.awb}`);
      }

      console.log('💰 Wallet Payment Details:', {
        orderId: createdOrder.orderId,
        awb: createdShipment.shipment.awb,
        paymentCharged: paymentInfo?.charged ? `₹${paymentInfo.charged}` : 'N/A',
        remainingBalance: paymentInfo?.walletBalance ? `₹${paymentInfo.walletBalance}` : 'N/A',
        transactionId: paymentInfo?.transactionId,
        courier: createdShipment.shipment.courier
      });

      // Refresh wallet balance to reflect the deduction
      console.log('🔄 Refreshing wallet balance after successful shipment...');
      await getWalletBalance();

      // Navigate to shipment details page
      navigate(`/seller/dashboard/shipments/${createdShipment.shipment.awb}`);

    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create shipment");
    }
  };

  const handleShipClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Get all form values
    const formValues = form.getValues();

    // Check wallet balance before proceeding
    if (!isLoadingBalance && walletBalance) {
      const currentBalance = walletBalance.walletBalance || 0;
      console.log('💰 Wallet Balance Check:', {
        currentBalance: `₹${currentBalance}`,
        loading: isLoadingBalance
      });

      if (currentBalance <= 0) {
        toast.error("Insufficient wallet balance. Please recharge your wallet before shipping.", {
          action: {
            label: "Recharge",
            onClick: () => {
              // You could implement navigation to wallet recharge here
              toast.info("Please visit the wallet section to recharge.");
            }
          }
        });
        return;
      }
    }

    // Extract and validate required fields
    const fullName = formValues.fullName;
    const contactNumber = formValues.contactNumber;
    const addressLine1 = formValues.addressLine1;
    const pincode = formValues.pincode;
    const city = formValues.city;
    const state = formValues.state;
    const orderNumber = formValues.orderNumber;

    // Validate delivery address details with specific field feedback
    const missingFields = [];
    if (!orderNumber) missingFields.push("Order Number");
    if (!fullName) missingFields.push("Customer Name");
    if (!contactNumber) missingFields.push("Contact Number");
    if (!addressLine1) missingFields.push("Address Line 1");
    if (!pincode) missingFields.push("Delivery Pincode");
    if (!city) missingFields.push("City");
    if (!state) missingFields.push("State");

    if (missingFields.length > 0) {
      toast.error(`Please fill in the following details: ${missingFields.join(", ")}`);
      return;
    }

    // Additional pincode validation
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      toast.error("Please enter a valid 6-digit delivery pincode");
      return;
    }

    // Smart item detection for rate calculation
    let totalActualWeight = 0;
    let totalPrice = 0;
    let itemSource = '';

    if (items.length > 0) {
      // Use items from the array (multiple items workflow)
      totalActualWeight = items.reduce((sum, item) => sum + (item.itemWeight * item.quantity), 0);
      totalPrice = items.reduce((sum, item) => sum + item.itemPrice, 0); // itemPrice is already total price
      itemSource = `${items.length} added item(s)`;
    } else {
      // Use current form fields directly (simpler workflow)
      const itemWeightValue = formValues.itemWeight;
      const itemPriceValue = formValues.itemPrice;
      const quantity = formValues.quantity;

      // Convert to numbers using utility functions
      const numWeight = toNumber(itemWeightValue);
      const numPrice = toNumber(itemPriceValue);
      const numQuantity = toInteger(quantity, 1);

      // Validate that required item fields are filled
      if (!itemWeightValue || numWeight <= 0) {
        toast.error("Please enter valid item weight (greater than 0)");
        return;
      }

      if (!itemPriceValue || numPrice <= 0) {
        toast.error("Please enter valid item price (greater than 0)");
        return;
      }

      totalActualWeight = numWeight * numQuantity;
      totalPrice = numPrice; // numPrice is already the total price
      itemSource = 'current form fields';
    }

    // Get package dimensions using utility functions
    const length = toNumber(formValues.length, 10); // Default dimensions if not provided
    const width = toNumber(formValues.width, 10);
    const height = toNumber(formValues.height, 10);

    // Calculate volumetric weight to ensure consistency with shipment calculation
    const volumetricWeight = (length * width * height) / 5000;

    // Use higher of actual vs volumetric weight (same logic as shipment)
    const finalWeight = Math.max(totalActualWeight, volumetricWeight);

    // Validate warehouse pincode before rate calculation
    if (!warehousePincode) {
      toast.error("Warehouse pincode not configured. Please update your business address in Profile Settings.");
      return;
    }

    // Validate GST TIN before shipping
    if (!sellerGstTin) {
      toast.error("GST TIN not configured. Please update your GST details in Profile Settings before shipping.", {
        description: "GST TIN is required by shipping partners for creating shipments."
      });
      return;
    }

    console.log('🚢 Ship Button - Rate Calculation for Immediate Shipping:', {
      orderDetails: 'Generated from form',
      fromPincode: warehousePincode,
      toPincode: pincode,
      weight: finalWeight,
      dimensions: { length, width, height },
      orderType: formValues.paymentType === 'COD' ? 'cod' : 'prepaid',
      codCollectableAmount: formValues.paymentType === 'COD' ? totalPrice : 0,
      totalPrice: totalPrice,
      itemSource,
      itemsCount: items.length,
      mode: 'Ship - Create Shipment Directly'
    });

    try {
      const result = await form.trigger(['orderNumber', 'fullName', 'contactNumber', 'addressLine1', 'pincode', 'city', 'state']);

      if (result) {
        // Set ship mode to true before opening modal
        setShipMode(true);

        // Use the correct method with proper parameters
        const response = await ServiceFactory.shipping.calculateRatesFromPincodes({
          fromPincode: warehousePincode,
          toPincode: pincode,
          weight: finalWeight,
          length: length,
          width: width,
          height: height,
          mode: 'Surface',
          orderType: formValues.paymentType === 'COD' ? 'cod' : 'prepaid',
          codCollectableAmount: formValues.paymentType === 'COD' ? totalPrice : 0,
          includeRTO: false
        });

        if (!response.success) {
          throw new Error(response.message || 'Failed to calculate rates');
        }

        toast.success(`Shipping rates calculated for immediate shipping!`);
        setShippingModalOpen(true);
      } else {
        const errors = form.formState.errors;
        const errorFields = Object.keys(errors);

        if (errorFields.length > 0) {
          const firstError = errors[errorFields[0] as keyof typeof errors];
          const errorMessage = firstError?.message ? String(firstError.message) : "Please fill required details";
          toast.error(errorMessage);
        } else {
          toast.error("Please fill required details");
        }
      }
    } catch (error) {
      console.error("Ship rate calculation error:", error);
      toast.error("Failed to calculate shipping rates. Please try again.");
    }
  };

  const handleAddItem = () => {
    const rawItemWeight = form.getValues('itemWeight');
    const rawItemPrice = form.getValues('itemPrice');
    const rawQuantity = form.getValues('quantity');
    const itemName = form.getValues('itemName');

    // Convert to numbers using utility functions
    const itemWeight = toNumber(rawItemWeight);
    const itemPrice = toNumber(rawItemPrice);
    const quantity = toInteger(rawQuantity, 1);

    if (!itemName || itemWeight === 0 || itemPrice === 0) {
      toast.error("Please fill in all item details");
      return;
    }

    const newItem = {
      sku: form.getValues('sku') || '',
      itemName: itemName,
      quantity: quantity,
      itemWeight,
      itemPrice
    };

    // Update both the items state and form value
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    form.setValue('items', updatedItems);

    // Reset item form fields
    form.setValue('sku', '');
    form.setValue('itemName', '');
    form.setValue('quantity', undefined);
    form.setValue('itemWeight', undefined);
    form.setValue('itemPrice', undefined);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    form.setValue('items', updatedItems);
  };

  // Refresh wallet balance when component loads
  useEffect(() => {
    if (!isLoadingBalance && walletBalance === null) {
      getWalletBalance();
    }
  }, [isLoadingBalance, walletBalance, getWalletBalance]);

  return (
    <div className="w-full flex flex-col gap-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between w-full bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-800">
            Create New Order
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Wallet Balance Display */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <Wallet className="w-4 h-4" />
            <span>Balance: </span>
            {isLoadingBalance ? (
              <span>Loading...</span>
            ) : (
              <span className="font-semibold text-green-600">
                ₹{walletBalance?.walletBalance || 0}
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate('/seller/dashboard/bulk-orders')}>
            <BoxesIcon className="w-4 h-4 mr-2" />
            Bulk Orders Page
          </Button>
        </div>
      </div>

      {/* Bulk Upload Section */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BoxesIcon className="w-5 h-5" />
            Quick Bulk Upload
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload an Excel file to create multiple orders at once.
            <span
              className="text-purple-600 hover:text-purple-700 cursor-pointer ml-1"
              onClick={() => navigate('/seller/dashboard/bulk-orders')}
            >
              View full bulk orders page →
            </span>
          </p>
        </div>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Input
              type="file"
              accept=".xlsx,.xls"
              className="flex-1"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Show toast and redirect to bulk orders page for processing
                  toast.success('File selected! Redirecting to bulk orders page for processing...');
                  setTimeout(() => {
                    navigate('/seller/dashboard/bulk-orders');
                  }, 1000);
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Download template functionality
                  import('@/services/bulkOrder.service').then(({ bulkOrderService }) => {
                    bulkOrderService.downloadBulkOrderTemplate()
                      .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = 'bulk_order_template.xlsx';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success('Template downloaded successfully');
                      })
                      .catch(error => {
                        console.error('Download error:', error);
                        toast.error('Failed to download template');
                      });
                  });
                }}
              >
                Download Template
              </Button>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            <p>• Upload .xlsx or .xls files (max 5MB)</p>
            <p>• Download the template to see the required format</p>
            <p>• For processing and tracking, use the full bulk orders page</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Details Section */}
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Order Details
              </h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      Order Number *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Enter your own order number/ID for tracking. Make it unique for your reference.
                              You can also use the button to generate a suggested format.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl className="flex-1">
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="Enter your order number (e.g., ORD-2024-001, INV123, etc.)"
                            className="mt-1"
                          />
                          {isGeneratingOrderNumber && (
                            <RefreshCw className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                          )}
                        </div>
                      </FormControl>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={handleRegenerateOrderNumber}
                              disabled={isGeneratingOrderNumber}
                              className="mt-1 h-10"
                            >
                              <RefreshCw className={`w-4 h-4 ${isGeneratingOrderNumber ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate suggested order number</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormDescription className="text-xs text-gray-500">
                      Enter your own order ID or click the refresh button for a suggested format
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Shipment Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select shipment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FORWARD">Forward Shipment</SelectItem>
                        <SelectItem value="REVERSE">Reverse Shipment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Payment Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="COD">COD</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Shipping Details Section */}
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Details
                </h2>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => setSameAsShipping(checked as boolean)}
                  />
                  <label htmlFor="sameAsShipping" className="text-sm text-gray-600">
                    Same as shipping address
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-6">
              {/* Customer Information */}
              <div className="grid md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Contact Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact Number" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" type="email" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address Fields */}
              <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-4">
                      <FormLabel className="text-sm font-medium">Address Line 1 *</FormLabel>
                      <FormControl>
                        <Input placeholder="Address Line 1" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-4">
                      <FormLabel className="text-sm font-medium">Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Address Line 2" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="landmark"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel className="text-sm font-medium">Landmark</FormLabel>
                      <FormControl>
                        <Input placeholder="Landmark" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Pincode *</FormLabel>
                      <FormControl>
                        <Input placeholder="Pincode" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">State *</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Item Details Section */}
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Item Details
              </h2>
            </div>
            <div className="p-4 space-y-6">
              {/* Item Input Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter SKU" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Item Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter item name" {...field} className="mt-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Enter quantity"
                          {...field}
                          value={field.value === undefined ? '' : field.value.toString()}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                              field.onChange(undefined);
                            } else {
                              const numValue = parseInt(inputValue);
                              if (!isNaN(numValue) && numValue > 0) {
                                field.onChange(numValue);
                              }
                            }
                          }}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itemWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Item Weight (kg) *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter item weight"
                          {...field}
                          value={field.value === undefined ? '' : field.value.toString()}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                              field.onChange(inputValue === '' ? undefined : inputValue);
                            }
                          }}
                          onBlur={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue && inputValue !== '') {
                              const numValue = parseFloat(inputValue);
                              if (!isNaN(numValue) && numValue > 0) {
                                field.onChange(numValue);
                              } else {
                                field.onChange(undefined);
                              }
                            }
                          }}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itemPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Total Item Price (₹) *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter total price"
                          {...field}
                          value={field.value === undefined ? '' : field.value.toString()}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                              field.onChange(inputValue === '' ? undefined : inputValue);
                            }
                          }}
                          onBlur={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue && inputValue !== '') {
                              const numValue = parseFloat(inputValue);
                              if (!isNaN(numValue) && numValue >= 0) {
                                field.onChange(numValue);
                              } else {
                                field.onChange(undefined);
                              }
                            }
                          }}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* COD Amount Field - Only show when COD is selected */}
              {form.watch('paymentType') === 'COD' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="collectibleAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          COD Collection Amount (₹) *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Enter COD amount to collect"
                            {...field}
                            value={field.value === undefined ? '' : field.value.toString()}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                                field.onChange(inputValue === '' ? undefined : inputValue);
                              }
                            }}
                            onBlur={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue && inputValue !== '') {
                                const numValue = parseFloat(inputValue);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  field.onChange(numValue);
                                } else {
                                  field.onChange(undefined);
                                }
                              }
                            }}
                            className="mt-1"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500 mt-1">
                          Amount to collect from customer on delivery
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Add Item Button */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  className="w-fit"
                >
                  Add Item
                </Button>
              </div>

              {/* Added Items List */}
              {items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3">Added Items ({items.length})</h3>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                        <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                          <span><strong>Name:</strong> {item.itemName}</span>
                          <span><strong>Qty:</strong> {item.quantity}</span>
                          <span><strong>Weight:</strong> {item.itemWeight}kg</span>
                          <span><strong>Price:</strong> ₹{item.itemPrice}</span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Package Dimensions */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Length (cm) *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter length"
                          {...field}
                          value={field.value === undefined ? '' : field.value.toString()}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                              field.onChange(inputValue === '' ? undefined : inputValue);
                            }
                          }}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Width (cm) *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter width"
                          {...field}
                          value={field.value === undefined ? '' : field.value.toString()}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                              field.onChange(inputValue === '' ? undefined : inputValue);
                            }
                          }}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Height (cm) *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter height"
                          {...field}
                          value={field.value === undefined ? '' : field.value.toString()}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                              field.onChange(inputValue === '' ? undefined : inputValue);
                            }
                          }}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Weight Details and Rate Check */}
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-sm font-medium">Weight Details</Label>
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Volumetric Weight:</span>
                    <span className="font-medium">{volumetricWeight ? volumetricWeight.toFixed(2) : '-'} {volumetricWeight ? 'kg' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Item Weight:</span>
                    <span className="font-medium">{actualWeight ? actualWeight.toFixed(2) : '-'} {actualWeight ? 'kg' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium text-gray-900">Chargeable Weight:</span>
                    <span className="font-semibold text-purple-600">{calculatedWeight ? calculatedWeight.toFixed(2) : '-'} {calculatedWeight ? 'kg' : ''}</span>
                  </div>
                  {calculatedWeight > 0 && (
                    <div className="text-xs text-gray-500 text-center">
                      Using {calculatedWeight === actualWeight ? 'Actual Weight' : 'Volumetric Weight'} (higher)
                    </div>
                  )}
                </div>


              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/seller/dashboard/orders')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleShipClick}
              disabled={!warehousePincode || !sellerGstTin || profileLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck className="w-4 h-4 mr-2" />
              {!warehousePincode ? 'Configure Warehouse' : !sellerGstTin ? 'Configure GST TIN' : 'Ship'}
            </Button>
            <Button
              type="submit"
              variant="default"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Order
            </Button>
          </div>

          {/* Configuration Warnings */}
          {(!warehousePincode || !sellerGstTin) && !profileLoading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Configuration Required</h3>
                  <div className="mt-1 text-sm text-yellow-700">
                    <p>Please configure the following in your Profile Settings before shipping:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      {!warehousePincode && <li>Business address with valid pincode</li>}
                      {!sellerGstTin && <li>GST TIN number (required by shipping partners)</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <ShippingOptionsModal
            open={shippingModalOpen}
            onOpenChange={(open: boolean) => {
              setShippingModalOpen(open);
              if (!open) setShipMode(false);
            }}
            onSubmit={handleShipSelected}
            singleOrderId={form.getValues('orderNumber') || 'New Order'}
            isCOD={form.getValues('paymentType') === 'COD'}
            shipMode={shipMode}
            orderDetails={(() => {
              const rawToPincode = form.getValues('pincode');
              const toPincode = rawToPincode || "110001";

              return {
                weight: (() => {
                  let finalWeight;
                  if (calculatedWeight > 0) {
                    finalWeight = calculatedWeight;
                  } else if (items.length > 0) {
                    finalWeight = items.reduce((sum, item) => sum + (item.itemWeight * item.quantity), 0);
                  } else {
                    finalWeight = toNumber(form.getValues('itemWeight')) * toInteger(form.getValues('quantity'), 1);
                  }
                  return finalWeight;
                })(),
                dimensions: {
                  length: toNumber(form.getValues('length'), 10),
                  width: toNumber(form.getValues('width'), 10),
                  height: toNumber(form.getValues('height'), 10)
                },
                toPincode: toPincode,
                totalPrice: items.length > 0
                  ? items.reduce((sum, item) => sum + item.itemPrice, 0)
                  : toNumber(form.getValues('itemPrice'))
              };
            })()}
          />
        </form>
      </Form>
    </div>
  );
};

export default SellerNewOrderPage;
