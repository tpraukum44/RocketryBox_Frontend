/**
 * API functions for seller to manage users with different access levels.
 * This file defines the interface for managing team members in a seller account.
 */

import { ApiService } from '@/services/api.service';
import { ApiResponse } from '@/types/api';
import { User, UserFilters } from '@/types/user';
import { toast } from "sonner";

// Job role definitions
export type JobRole = 'Manager' | 'Support' | 'Finance';

// Types
export interface SellerTeamMember {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  jobRole: JobRole;
  status: "active" | "inactive";
  createdAt: string;
  permissions: string[];
  sellerId?: string; // ID of the parent seller
}

// Role-based permission presets (matches backend ROLE_PERMISSIONS)
export const ROLE_PERMISSIONS: Record<JobRole, string[]> = {
  Manager: [
    'Dashboard access', 'Order', 'Shipments', 'Manifest', 'Received', 'New Order',
    'NDR List', 'Weight Dispute', 'Fright', 'Invoice', 'Ledger', 'COD Remittance',
    'Support', 'Warehouse', 'Service', 'Items & SKU', 'Stores', 'Priority', 'Label'
  ],
  Support: [
    'Dashboard access', 'Order', 'Shipments', 'Manifest', 'Received', 'New Order',
    'NDR List', 'Weight Dispute', 'Support', 'Warehouse', 'Service', 'Items & SKU'
  ],
  Finance: [
    'Dashboard access', 'Order', 'Shipments', 'Manifest', 'Received',
    'NDR List', 'Weight Dispute', 'Fright', 'Invoice', 'Ledger', 'COD Remittance'
  ]
};

// Storage key for localStorage
const STORAGE_KEY = 'seller_team_members';

// Helper function to map backend role to frontend job role
const mapBackendRoleToJobRole = (backendRole: string): JobRole => {
  switch (backendRole) {
    case 'Manager':
      return 'Manager';
    case 'Support':
      return 'Support';
    case 'Finance':
      return 'Finance';
    case 'Staff':
      return 'Support';
    case 'Owner':
      return 'Manager';
    default:
      return 'Support';
  }
};

// Helper function to map frontend job role to backend role
const mapJobRoleToBackendRole = (jobRole: JobRole): string => {
  switch (jobRole) {
    case 'Manager':
      return 'Manager';
    case 'Support':
      return 'Support';
    case 'Finance':
      return 'Finance';
    default:
      return 'Support';
  }
};





// Helper functions for localStorage persistence
export const getStoredTeamMembers = (): SellerTeamMember[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading team members from localStorage:', error);
    return [];
  }
};



/**
 * Fetch all team members for the current seller
 */
export const fetchTeamMembers = async (): Promise<SellerTeamMember[]> => {
  try {
    const api = ApiService.getInstance();
    const response = await api.get('/seller/team');

    if (response.success && response.data) {
      // Transform backend data to frontend format
      const responseData = response.data as any;
      const teamMembers = responseData.users || responseData || [];
      return teamMembers.map((user: any) => ({
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        contactNumber: user.phone,
        jobRole: mapBackendRoleToJobRole(user.role),
        status: user.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        createdAt: user.createdAt,
        permissions: Array.isArray(user.permissions) ? user.permissions : Object.keys(user.permissions || {}),
        sellerId: user.seller
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching team members:", error);
    toast.error("Failed to load team members. Please try again.");
    throw error;
  }
};

/**
 * Add a new team member
 */
export const addTeamMember = async (
  member: Omit<SellerTeamMember, "id" | "createdAt"> & { password: string }
): Promise<SellerTeamMember> => {
  try {
    const api = ApiService.getInstance();

    // Transform frontend data to backend format
    const backendData = {
      name: member.name,
      email: member.email,
      phone: member.contactNumber,
      password: member.password,
      role: mapJobRoleToBackendRole(member.jobRole),
      permissions: Array.isArray(member.permissions)
        ? member.permissions.reduce((acc: any, perm: string) => {
          acc[perm] = true;
          return acc;
        }, {})
        : member.permissions
    };

    const response = await api.post('/seller/team', backendData);

    if (response.success && response.data) {
      const user = response.data as any;
      return {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        contactNumber: user.phone,
        jobRole: mapBackendRoleToJobRole(user.role),
        status: user.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        createdAt: user.createdAt,
        permissions: Array.isArray(user.permissions) ? user.permissions : Object.keys(user.permissions || {}),
        sellerId: user.seller
      };
    }

    throw new Error('Failed to create team member');
  } catch (error) {
    console.error("Error adding team member:", error);
    toast.error("Failed to add team member. Please try again.");
    throw error;
  }
};

/**
 * Update team member details
 */
export const updateTeamMember = async (
  id: string,
  updates: Partial<Omit<SellerTeamMember, "id" | "createdAt">>
): Promise<SellerTeamMember> => {
  try {
    const api = ApiService.getInstance();

    // Transform frontend data to backend format
    const backendUpdates: any = {};
    if (updates.name) backendUpdates.name = updates.name;
    if (updates.contactNumber) backendUpdates.phone = updates.contactNumber;
    if (updates.jobRole) backendUpdates.role = mapJobRoleToBackendRole(updates.jobRole);
    if (updates.status) backendUpdates.status = updates.status === 'active' ? 'Active' : 'Inactive';
    if (updates.permissions) {
      backendUpdates.permissions = Array.isArray(updates.permissions)
        ? updates.permissions.reduce((acc: any, perm: string) => {
          acc[perm] = true;
          return acc;
        }, {})
        : updates.permissions;
    }

    const response = await api.put(`/seller/team/${id}`, backendUpdates);

    if (response.success && response.data) {
      const user = response.data as any;
      return {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        contactNumber: user.phone,
        jobRole: mapBackendRoleToJobRole(user.role),
        status: user.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        createdAt: user.createdAt,
        permissions: Array.isArray(user.permissions) ? user.permissions : Object.keys(user.permissions || {}),
        sellerId: user.seller
      };
    }

    throw new Error('Failed to update team member');
  } catch (error) {
    console.error(`Error updating team member ${id}:`, error);
    toast.error("Failed to update team member. Please try again.");
    throw error;
  }
};

/**
 * Delete a team member
 */
export const deleteTeamMember = async (id: string): Promise<void> => {
  try {
    const api = ApiService.getInstance();
    const response = await api.delete(`/seller/team/${id}`);

    if (!response.success) {
      throw new Error('Failed to delete team member');
    }
  } catch (error) {
    console.error(`Error deleting team member ${id}:`, error);
    toast.error("Failed to delete team member. Please try again.");
    throw error;
  }
};

/**
 * Reset team member password
 */
export const resetTeamMemberPassword = async (id: string): Promise<void> => {
  try {
    const api = ApiService.getInstance();
    const response = await api.post(`/seller/team/${id}/reset-password`, {});

    if (!response.success) {
      throw new Error('Failed to reset team member password');
    }

    toast.success("Password reset email sent successfully");
  } catch (error) {
    console.error(`Error resetting password for team member ${id}:`, error);
    toast.error("Failed to reset password. Please try again.");
    throw error;
  }
};

/**
 * Get role-based permission presets
 */
export const getRolePermissions = (role: JobRole): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Get available job roles
 */
export const getAvailableJobRoles = (): JobRole[] => {
  return Object.keys(ROLE_PERMISSIONS) as JobRole[];
};

export const sellerUsersApi = {
  async getUsers(filters?: UserFilters): Promise<ApiResponse<User[]>> {
    try {
      const api = ApiService.getInstance();
      const response = await api.get<User[]>('/seller/users', {
        params: filters
      });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch users');
    }
  },

  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const api = ApiService.getInstance();
      const response = await api.get<User>(`/seller/users/${id}`);
      return response;
    } catch (error) {
      throw new Error('Failed to fetch user');
    }
  },

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const api = ApiService.getInstance();
      const response = await api.post<User>('/seller/users', userData);
      return response;
    } catch (error) {
      throw new Error('Failed to create user');
    }
  },

  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const api = ApiService.getInstance();
      const response = await api.put<User>(`/seller/users/${id}`, userData);
      return response;
    } catch (error) {
      throw new Error('Failed to update user');
    }
  },

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    try {
      const api = ApiService.getInstance();
      const response = await api.delete(`/seller/users/${id}`);
      return response as ApiResponse<void>;
    } catch (error) {
      throw new Error('Failed to delete user');
    }
  }
};
