import { toast } from 'sonner';
import { Admin, ApiResponse, Order, UserRole, UserStatus } from '../types/api';
import { ApiService } from './api.service';

export class AdminService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  // User Management
  async getUsers(params?: {
    role?: UserRole;
    search?: string;
    status?: UserStatus;
    sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ data: Admin[]; pagination: any }>> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.role) queryParams.role = params.role;
        if (params.search) queryParams.search = params.search;
        if (params.status) queryParams.status = params.status;
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
        if (params.page) queryParams.page = params.page.toString();
        if (params.limit) queryParams.limit = params.limit.toString();
      }
      const response = await this.apiService.get<ApiResponse<{ data: Admin[]; pagination: any }>>('/admin/users', queryParams);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch users');
      throw error;
    }
  }

  async getUserDetails(userId: string): Promise<ApiResponse<Admin>> {
    try {
      const response = await this.apiService.get<ApiResponse<Admin>>(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch user details');
      throw error;
    }
  }

  async updateUserStatus(userId: string, status: UserStatus, reason?: string): Promise<ApiResponse<Admin>> {
    try {
      const response = await this.apiService.patch<ApiResponse<Admin>>(`/admin/users/${userId}/status`, { status, reason });
      return response.data;
    } catch (error) {
      toast.error('Failed to update user status');
      throw error;
    }
  }

  async updateUserPermissions(userId: string, permissions: string[]): Promise<ApiResponse<Admin>> {
    try {
      const response = await this.apiService.patch<ApiResponse<Admin>>(`/admin/users/${userId}/permissions`, { permissions });
      return response.data;
    } catch (error) {
      toast.error('Failed to update user permissions');
      throw error;
    }
  }

  async addAdminNote(userId: string, note: string): Promise<ApiResponse<Admin>> {
    try {
      const response = await this.apiService.post<ApiResponse<Admin>>(`/admin/users/${userId}/notes`, { note });
      return response.data;
    } catch (error) {
      toast.error('Failed to add admin note');
      throw error;
    }
  }

  // Order Management
  async getOrders(params?: {
    from?: string;
    to?: string;
    status?: string | string[];
    sellerId?: string;
    customerId?: string;
    paymentType?: 'COD' | 'Prepaid';
    priority?: 'High' | 'Medium' | 'Low';
    courier?: string;
    awbNumber?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    type?: 'seller' | 'customer' | 'all';
  }): Promise<ApiResponse<{ data: Order[]; pagination: any }>> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.status) queryParams.status = Array.isArray(params.status) ? params.status.join(',') : params.status;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.customerId) queryParams.customerId = params.customerId;
        if (params.paymentType) queryParams.paymentType = params.paymentType;
        if (params.priority) queryParams.priority = params.priority;
        if (params.courier) queryParams.courier = params.courier;
        if (params.awbNumber) queryParams.awbNumber = params.awbNumber;
        if (params.search) queryParams.search = params.search;
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
        if (params.page) queryParams.page = params.page.toString();
        if (params.limit) queryParams.limit = params.limit.toString();
        if (params.type) queryParams.type = params.type; // Fixed: Added missing type parameter
      }
      console.log('AdminService: Making API call to /admin/orders with params:', queryParams);
      console.log('AdminService: API Base URL:', this.apiService);

      const startTime = Date.now();
      const response = await this.apiService.get<ApiResponse<{ data: Order[]; pagination: any }>>('/admin/orders', queryParams);
      const endTime = Date.now();

      console.log(`AdminService: API call completed in ${endTime - startTime}ms`);
      console.log('AdminService: Raw API response:', response);
      console.log('AdminService: Response status:', response?.status);
      console.log('AdminService: Response data keys:', response?.data ? Object.keys(response.data) : 'no data');
      console.log('AdminService: Returning response.data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('AdminService.getOrders error:', error);
      const errorMessage = error.message || error.error || 'Failed to fetch orders';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async getOrderDetails(orderId: string, type?: 'seller' | 'customer'): Promise<ApiResponse<Order>> {
    try {
      const queryParams: Record<string, string> = {};
      if (type) {
        queryParams.type = type;
      }
      const response = await this.apiService.get<ApiResponse<Order>>(`/admin/orders/${orderId}`, queryParams);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch order details');
      throw error;
    }
  }

  async updateOrder(orderId: string, data: Partial<Order>): Promise<ApiResponse<Order>> {
    try {
      const response = await this.apiService.patch<ApiResponse<Order>>(`/admin/orders/${orderId}`, data);
      return response.data;
    } catch (error) {
      toast.error('Failed to update order');
      throw error;
    }
  }

  async addOrderHistory(orderId: string, action: string, details: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.apiService.post<ApiResponse<void>>(`/admin/orders/${orderId}/history`, { action, details });
      return response.data;
    } catch (error) {
      toast.error('Failed to add order history');
      throw error;
    }
  }

  async getOrderStatusCounts(params?: {
    from?: string;
    to?: string;
    sellerId?: string;
    type?: 'seller' | 'customer' | 'all';
  }): Promise<ApiResponse<{
    total: number;
    byStatus: Record<string, number>;
    byPaymentType: Record<string, number>;
    byDate: any[];
    avgOrderValue: number;
    today: number;
    revenue: number;
    todayRevenue: number;
  }>> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.type) queryParams.type = params.type;
      }
      const response = await this.apiService.get<ApiResponse<{
        total: number;
        byStatus: Record<string, number>;
        byPaymentType: Record<string, number>;
        byDate: any[];
        avgOrderValue: number;
        today: number;
        revenue: number;
        todayRevenue: number;
      }>>('/admin/orders/stats/overview', queryParams);
      return response.data;
    } catch (error: any) {
      // NO ERROR TOAST - just throw the error for the component to handle silently
      throw error;
    }
  }

  // Dashboard
  async getDashboardStats(period?: 'today' | 'yesterday' | 'week' | 'month' | 'year'): Promise<ApiResponse<any>> {
    try {
      const queryParams: Record<string, string> = {};
      if (period) queryParams.period = period;
      const response = await this.apiService.get<ApiResponse<any>>('/admin/dashboard/stats', queryParams);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
      throw error;
    }
  }

  async getKPIs(params?: {
    from?: string;
    to?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
      }
      const response = await this.apiService.get<ApiResponse<any>>('/admin/dashboard/kpi', queryParams);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch KPIs');
      throw error;
    }
  }

  async getOrderTrends(params: {
    granularity: 'daily' | 'weekly' | 'monthly';
    from?: string;
    to?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const queryParams: Record<string, string> = {
        granularity: params.granularity,
      };
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      const response = await this.apiService.get<ApiResponse<any>>('/admin/dashboard/order-trends', queryParams);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch order trends');
      throw error;
    }
  }

  async getSystemHealth(): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiService.get<ApiResponse<any>>('/admin/dashboard/system-health');
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch system health');
      throw error;
    }
  }

  // Billing & Wallet Management
  async getWalletTransactions(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    type?: 'Recharge' | 'Debit' | 'COD Credit' | 'Refund';
    orderId?: string;
    referenceNumber?: string;
    remark?: string;
    sellerId?: string;
  }): Promise<{ success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number }> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.page) queryParams.page = params.page.toString();
        if (params.limit) queryParams.limit = params.limit.toString();
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.type) queryParams.type = params.type;
        if (params.orderId) queryParams.orderId = params.orderId;
        if (params.referenceNumber) queryParams.referenceNumber = params.referenceNumber;
        if (params.remark) queryParams.remark = params.remark;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
      }

      // ApiService wraps backend response in ApiResponse, so we access .data
      const response = await this.apiService.get<any>('/admin/billing/wallet-history', queryParams);
      return response.data as { success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number };
    } catch (error) {
      console.error('AdminService.getWalletTransactions error:', error);
      throw error;
    }
  }

  async getWalletTransactionById(transactionId: string): Promise<{ success: boolean; data: any }> {
    try {
      const response = await this.apiService.get<any>(`/admin/billing/wallet-history/${transactionId}`);
      return response.data as { success: boolean; data: any };
    } catch (error) {
      toast.error('Failed to fetch transaction details');
      throw error;
    }
  }

  async addWalletTransaction(data: {
    sellerId: string;
    referenceNumber: string;
    orderId?: string;
    type: 'Recharge' | 'Debit' | 'COD Credit' | 'Refund';
    amount: number;
    codCharge?: number;
    igst?: number;
    remark?: string;
  }): Promise<{ success: boolean; data: any }> {
    try {
      const response = await this.apiService.post<any>('/admin/billing/wallet-history', data);
      return response.data as { success: boolean; data: any };
    } catch (error) {
      toast.error('Failed to add wallet transaction');
      throw error;
    }
  }

  async exportWalletTransactions(params?: {
    from?: string;
    to?: string;
    type?: string;
    orderId?: string;
    referenceNumber?: string;
    remark?: string;
    sellerId?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.type) queryParams.type = params.type;
        if (params.orderId) queryParams.orderId = params.orderId;
        if (params.referenceNumber) queryParams.referenceNumber = params.referenceNumber;
        if (params.remark) queryParams.remark = params.remark;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.format) queryParams.format = params.format;
      }

      const response = await this.apiService.get('/admin/billing/wallet-history/export', queryParams, {
        responseType: 'blob'
      });
      return response.data as Blob;
    } catch (error) {
      toast.error('Failed to export wallet transactions');
      throw error;
    }
  }

  // Invoice Management
  async getInvoices(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    status?: 'paid' | 'due' | 'cancelled';
    sellerId?: string;
    invoiceNumber?: string;
  }): Promise<{ success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number }> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.page) queryParams.page = params.page.toString();
        if (params.limit) queryParams.limit = params.limit.toString();
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.status) queryParams.status = params.status;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.invoiceNumber) queryParams.invoiceNumber = params.invoiceNumber;
      }

      const response = await this.apiService.get<{ success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number }>('/admin/billing/invoices', queryParams);
      return response.data;
    } catch (error) {
      console.error('AdminService.getInvoices error:', error);
      throw error;
    }
  }

  async getInvoiceById(invoiceId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiService.get<ApiResponse<any>>(`/admin/billing/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch invoice details');
      throw error;
    }
  }

  async createInvoice(data: {
    sellerId: string;
    sellerName: string;
    amount: number;
    dueDate: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
    tax?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiService.post<ApiResponse<any>>('/admin/billing/invoices', data);
      return response.data;
    } catch (error) {
      toast.error('Failed to create invoice');
      throw error;
    }
  }

  async updateInvoiceStatus(invoiceId: string, data: {
    status: 'paid' | 'due' | 'cancelled';
    paymentReference?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiService.patch<ApiResponse<any>>(`/admin/billing/invoices/${invoiceId}/status`, data);
      return response.data;
    } catch (error) {
      toast.error('Failed to update invoice status');
      throw error;
    }
  }

  async exportInvoices(params?: {
    from?: string;
    to?: string;
    status?: string;
    sellerId?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.status) queryParams.status = params.status;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.format) queryParams.format = params.format;
      }

      const response = await this.apiService.get('/admin/billing/invoices/export', queryParams, {
        responseType: 'blob'
      });
      return response.data as Blob;
    } catch (error) {
      toast.error('Failed to export invoices');
      throw error;
    }
  }

  // Shipping Charges Management
  async getShippingCharges(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    sellerId?: string;
    courier?: string;
    status?: string;
  }): Promise<{ success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number }> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.page) queryParams.page = params.page.toString();
        if (params.limit) queryParams.limit = params.limit.toString();
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.courier) queryParams.courier = params.courier;
        if (params.status) queryParams.status = params.status;
      }

      const response = await this.apiService.get<{ success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number }>('/admin/billing/shipping-charges', queryParams);
      return response.data;
    } catch (error) {
      console.error('AdminService.getShippingCharges error:', error);
      throw error;
    }
  }

  async getShippingChargeById(chargeId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiService.get<ApiResponse<any>>(`/admin/billing/shipping-charges/${chargeId}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch shipping charge details');
      throw error;
    }
  }

  async exportShippingCharges(params?: {
    from?: string;
    to?: string;
    sellerId?: string;
    courier?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.from) queryParams.from = params.from;
        if (params.to) queryParams.to = params.to;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.courier) queryParams.courier = params.courier;
        if (params.format) queryParams.format = params.format;
      }

      const response = await this.apiService.get('/admin/billing/shipping-charges/export', queryParams, {
        responseType: 'blob'
      });
      return response.data as Blob;
    } catch (error) {
      toast.error('Failed to export shipping charges');
      throw error;
    }
  }

  // Shipment Management
  async getShipments(params?: {
    awb?: string;
    courier?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sellerId?: string;
    customerPhone?: string;
    customerEmail?: string;
    sort?: string;
    limit?: number;
    page?: number;
  }): Promise<{ success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number }> {
    try {
      const queryParams: Record<string, string> = {};
      if (params) {
        if (params.awb) queryParams.awb = params.awb;
        if (params.courier) queryParams.courier = params.courier;
        if (params.status) queryParams.status = params.status;
        if (params.startDate) queryParams.startDate = params.startDate;
        if (params.endDate) queryParams.endDate = params.endDate;
        if (params.sellerId) queryParams.sellerId = params.sellerId;
        if (params.customerPhone) queryParams.customerPhone = params.customerPhone;
        if (params.customerEmail) queryParams.customerEmail = params.customerEmail;
        if (params.sort) queryParams.sort = params.sort;
        if (params.limit) queryParams.limit = params.limit.toString();
        if (params.page) queryParams.page = params.page.toString();
      }

      const response = await this.apiService.get<{ success: boolean; data: any[]; total: number; totalPages: number; currentPage: number; count: number }>('/admin/shipments', queryParams);
      return response.data;
    } catch (error) {
      console.error('AdminService.getShipments error:', error);
      throw error;
    }
  }

  async getShipmentById(shipmentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiService.get<ApiResponse<any>>(`/admin/shipments/${shipmentId}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch shipment details');
      throw error;
    }
  }

  async syncShipments(data: {
    fromDate?: string;
    sellerId?: string;
  }): Promise<ApiResponse<{ syncedCount: number; skippedCount: number; errors?: any[] }>> {
    try {
      const response = await this.apiService.post<ApiResponse<{ syncedCount: number; skippedCount: number; errors?: any[] }>>('/admin/shipments/sync', data);
      return response.data;
    } catch (error) {
      toast.error('Failed to sync shipments');
      throw error;
    }
  }
}
