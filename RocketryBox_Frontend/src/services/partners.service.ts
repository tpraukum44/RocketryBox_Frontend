import api from '@/config/api.config';
import { ApiResponse } from './api.service';

export type ApiStatus = "active" | "inactive" | "maintenance";
export type ServiceType = "domestic" | "international" | "express" | "standard" | "surface" | "air" | "heavy";

export interface Zone {
  name: string;
  baseRate: number;
  additionalRate: number;
}

export interface Partner {
  id: string;
  name: string;
  logoUrl?: string;
  apiStatus: ApiStatus;
  performanceScore: string;
  lastUpdated: string;
  shipmentCount: number;
  deliverySuccess: string;
  supportContact: string;
  supportEmail: string;
  apiKey?: string;
  apiEndpoint?: string;
  serviceTypes: ServiceType[];
  serviceAreas: string[];
  weightLimits: {
    min: number;
    max: number;
  };
  dimensionLimits?: {
    maxLength: number;
    maxWidth: number;
    maxHeight: number;
    maxSum: number;
  };
  rates: {
    baseRate: number;
    weightRate: number;
    dimensionalFactor: number;
  };
  zones?: Zone[];
  trackingUrl?: string;
  integrationDate: string;
  notes?: string;
}

class PartnersService {
  private static instance: PartnersService;

  private constructor() {
  }

  public static getInstance(): PartnersService {
    if (!PartnersService.instance) {
      PartnersService.instance = new PartnersService();
    }
    return PartnersService.instance;
  }

  // Auth headers are now handled automatically by the centralized API instance

  /**
   * Get all shipping partners
   */
  public async getAllPartners(filters?: { status?: ApiStatus }): Promise<ApiResponse<Partner[]>> {
    try {
      const params = filters ? { status: filters.status } : {};

      const response = await api.get('/admin/partners', { params });

      return {
        data: response.data,
        status: response.status,
        message: 'Request successful',
        success: true
      };
    } catch (error) {
      console.error('Error fetching partners:', error);
      throw error;
    }
  }

  /**
   * Get a single partner by ID
   */
  public async getPartnerById(id: string): Promise<ApiResponse<Partner>> {
    try {
      const response = await api.get(`/admin/partners/${id}`);

      return {
        data: response.data,
        status: response.status,
        message: 'Request successful',
        success: true
      };
    } catch (error) {
      console.error(`Error fetching partner with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new partner
   */
  public async createPartner(partnerData: Omit<Partner, 'id'>): Promise<ApiResponse<Partner>> {
    try {
      const response = await api.post('/admin/partners', partnerData);

      return {
        data: response.data,
        status: response.status,
        message: 'Request successful',
        success: true
      };
    } catch (error) {
      console.error('Error creating partner:', error);
      throw error;
    }
  }

  /**
   * Update an existing partner
   */
  public async updatePartner(id: string, partnerData: Partial<Partner>): Promise<ApiResponse<Partner>> {
    try {
      const response = await api.put(`/admin/partners/${id}`, partnerData);

      return {
        data: response.data,
        status: response.status,
        message: 'Request successful',
        success: true
      };
    } catch (error) {
      console.error(`Error updating partner with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a partner
   */
  public async deletePartner(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete(`/admin/partners/${id}`);

      return {
        data: response.data,
        status: response.status,
        message: 'Request successful',
        success: true
      };
    } catch (error) {
      console.error(`Error deleting partner with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple partners
   */
  public async deleteManyPartners(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await api.post('/admin/partners/batch-delete', { ids });

      return {
        data: response.data,
        status: response.status,
        message: 'Request successful',
        success: true
      };
    } catch (error) {
      console.error('Error deleting multiple partners:', error);
      throw error;
    }
  }

  /**
   * Refresh API connections for partners
   */
  public async refreshPartnerAPIs(ids: string[]): Promise<ApiResponse<{ successful: string[], failed: string[] }>> {
    try {
      const response = await api.post('/admin/partners/refresh-api', { ids });

      return {
        data: response.data,
        status: response.status,
        message: 'Request successful',
        success: true
      };
    } catch (error) {
      console.error('Error refreshing partner APIs:', error);
      throw error;
    }
  }
}

export default PartnersService.getInstance();
