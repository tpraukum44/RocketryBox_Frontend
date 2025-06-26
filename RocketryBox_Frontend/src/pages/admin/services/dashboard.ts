import api from '@/config/api.config';
import { DashboardFilters, DashboardStats, Order, Shipment } from "../types/dashboard";

export const dashboardService = {
    async getDashboardStats(filters: DashboardFilters): Promise<DashboardStats> {
        try {
            const response = await api.get('/admin/dashboard/stats', {
                params: filters
            });
            return response.data;
        } catch (error) {
            throw new Error("Failed to fetch dashboard stats");
        }
    },

    async getRecentOrders(): Promise<Order[]> {
        try {
            const response = await api.get('/admin/dashboard/recent-orders');
            return response.data.data;
        } catch (error) {
            throw new Error("Failed to fetch recent orders");
        }
    },

    async getShipments(filters: DashboardFilters): Promise<Shipment[]> {
        try {
            const response = await api.get('/admin/dashboard/shipments', {
                params: filters
            });
            return response.data;
        } catch (error) {
            throw new Error("Failed to fetch shipments");
        }
    },

    async downloadReport(filters: DashboardFilters, format: "csv" | "pdf"): Promise<Blob> {
        try {
            const response = await api.get('/admin/dashboard/report', {
                params: { ...filters, format },
                responseType: "blob"
            });
            return response.data;
        } catch (error) {
            throw new Error("Failed to download report");
        }
    }
};
