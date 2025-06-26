import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { customerApi } from '../services/api';
import { OrderData } from '../types/order';

export const useOrderData = () => {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setError(null);
        const orderId = new URLSearchParams(location.search).get('orderId') ||
          location.state?.orderId;

        if (!orderId) {
          throw new Error("No Order ID found. Please create an order first.");
        }

        const response = await customerApi.orders.getById(orderId);

        // Safely handle response and create OrderData structure
        const pickupDate = (response as any).pickupDate || (response as any).createdAt || new Date().toISOString();

        setOrderData({
          ...response,
          pickupDate: new Date(pickupDate)
        } as unknown as OrderData);
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Failed to load order details";
        setError(errorMessage);
        toast.error(errorMessage);

        setTimeout(() => {
          navigate('/customer/create-order');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [location, navigate]);

  return { orderData, isLoading, error };
};
