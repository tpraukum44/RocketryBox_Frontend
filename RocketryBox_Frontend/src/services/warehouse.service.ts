import api from '@/config/api.config';

interface WarehouseData {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddWarehouseRequest {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

interface WarehouseResponse {
  success: boolean;
  data?: {
    warehouses: WarehouseData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface AddWarehouseResponse {
  success: boolean;
  data?: {
    warehouse: WarehouseData;
  };
  error?: {
    code: string;
    message: string;
  };
}

class WarehouseService {
  // Auth headers are now handled automatically by the centralized API instance

  async getWarehouses(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<WarehouseResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.search) queryParams.set('search', params.search);

      const url = `/api/v2/seller/warehouse${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      // TODO: Confirm if this endpoint requires seller_token instead of auth_token
      const response = await api.get(url);

      return response.data;
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      throw error;
    }
  }

  async addWarehouse(warehouseData: AddWarehouseRequest): Promise<AddWarehouseResponse> {
    try {
      const response = await api.post('/api/v2/seller/warehouse', warehouseData);

      return response.data;
    } catch (error) {
      console.error('Error adding warehouse:', error);
      throw error;
    }
  }
}

export const warehouseService = new WarehouseService();
export type { AddWarehouseRequest, AddWarehouseResponse, WarehouseData, WarehouseResponse };
