import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + '/api/v2/customer';

export interface RateCalculationRequest {
  weight: number;
  pickupPincode: string;
  deliveryPincode: string;
  serviceType: 'standard' | 'express' | 'cod';
}

export interface RateCalculationResponse {
  success: boolean;
  data: {
    rates: Array<{
      courier: string;
      mode: string;
      service: string;
      rate: number;
      estimatedDelivery: string;
      codCharge: number;
      available: boolean;
    }>;
    summary: {
      totalCouriers: number;
      cheapestRate: number;
      fastestDelivery: string;
    };
  };
}

export interface CreateOrderRequest {
  pickupAddress: {
    name: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  deliveryAddress: {
    name: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  package: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    declaredValue?: number;
    items: Array<{
      name: string;
      quantity: number;
      value: number;
    }>;
  };
  selectedProvider?: {
    id: string;
    name: string;
    serviceType: string;
    totalRate: number;
    estimatedDays: string;
  };
  serviceType: string;
  paymentMethod: string;
  instructions?: string;
  pickupDate: string;
}

export interface CreateOrderResponse {
  success: boolean;
  data: {
    message: string;
    order: {
      id: string;
      orderNumber: string;
      status: string;
      paymentStatus: string;
      totalAmount: number;
      shippingRate: number;
      awb?: string;
      createdAt: string;
    };
  };
}

export class CustomerApiService {
  private static instance: CustomerApiService;

  // Create axios instance with JWT token authentication
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  private constructor() {
    // Setup request interceptor to add JWT token
    this.api.interceptors.request.use(
      async (config) => {
        // Smart token resolution - prioritize impersonation tokens
        let token = null;

        // PRIORITY 1: Check for impersonation token in localStorage (admin impersonating customer)
        const impersonationToken = localStorage.getItem('token');
        if (impersonationToken) {
          try {
            // Validate that it's a proper JWT and includes impersonation info
            const parts = impersonationToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const now = Math.floor(Date.now() / 1000);

              // Check if token is valid and contains impersonation info
              if (payload.exp && payload.exp > now && payload.isImpersonated && payload.role === 'customer') {
                token = impersonationToken;
                console.log('🔥 Using customer impersonation token for API call');
              } else if (payload.exp && payload.exp <= now) {
                // Token expired, clean it up
                console.log('🔄 Impersonation token expired, cleaning up');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
              }
            }
          } catch (e) {
            console.warn('Invalid impersonation token format, removing');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }

        // PRIORITY 2: Check for regular auth token in secureStorage
        if (!token) {
          token = await secureStorage.getItem('auth_token');
          if (token) {
            console.log('🔐 Using regular customer auth token for API call');
          }
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token if available
        const csrfToken = await secureStorage.getItem('csrf_token');
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  static getInstance(): CustomerApiService {
    if (!CustomerApiService.instance) {
      CustomerApiService.instance = new CustomerApiService();
    }
    return CustomerApiService.instance;
  }

  async calculateRates(request: RateCalculationRequest): Promise<RateCalculationResponse> {
    try {
      console.log('Sending rate calculation request:', request);
      const response = await this.api.post<RateCalculationResponse>(
        `/orders/rates`,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Rate calculation error details:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`Failed to calculate shipping rates: ${errorMessage}`);
      }
      throw new Error('Failed to calculate shipping rates');
    }
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      console.log('Creating order with data:', request);
      const response = await this.api.post<CreateOrderResponse>(
        `/orders`,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Order creation error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error response data:', error.response?.data);
        console.error('Error status:', error.response?.status);
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`Failed to create order: ${errorMessage}`);
      }
      throw new Error('Failed to create order');
    }
  }

  async getOrderByAwb(awb: string) {
    try {
      const response = await this.api.get(`/orders/awb/${awb}`);
      return response.data;
    } catch (error) {
      console.error('Order fetch error:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  async listOrders(params?: { page?: number; limit?: number; status?: string }) {
    try {
      const response = await this.api.get(`/orders`, { params });
      return response.data;
    } catch (error) {
      console.error('Orders list error:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  async checkServiceAvailability(data: {
    pickupPincode: string;
    deliveryPincode: string;
    package: {
      weight: number;
      dimensions: {
        length: number;
        width: number;
        height: number;
      };
    };
  }) {
    try {
      const response = await this.api.post(`/services/check`, data);
      return response.data;
    } catch (error) {
      console.error('Service availability error:', error);
      throw new Error('Failed to check service availability');
    }
  }
}

export const customerApiService = CustomerApiService.getInstance();
