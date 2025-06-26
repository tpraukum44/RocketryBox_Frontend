import { SellerLoginInput, SellerRegisterInput } from '@/lib/validations/seller';
import {
    ApiError,
    ApiResponse,
    ERROR_CODES,
    Seller
} from '@/types/api';
import { secureStorage } from '@/utils/secureStorage';
import { toast } from 'sonner';
import { ApiService } from './api.service';
import { ServiceFactory } from './service-factory';

interface SellerLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  seller: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    businessName: string;
  };
}

interface TeamUserLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  teamUser: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    permissions: Record<string, any>;
    seller: {
      _id: string;
      businessName: string;
      email: string;
    };
  };
  userType: 'team_user';
}

interface SellerRegisterResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  seller: Seller;
}

export class SellerAuthService {
  private api: ApiService;

  constructor() {
    this.api = ApiService.getInstance();
  }

  async login(data: SellerLoginInput): Promise<ApiResponse<SellerLoginResponse | TeamUserLoginResponse>> {
    try {
      console.log('SellerAuthService.login called with:', {
        emailOrPhone: data.emailOrPhone,
        hasPassword: !!data.password,
        rememberMe: data.rememberMe
      });

      // Use unified login endpoint that handles both sellers and team users
      console.log('Making unified login request to API...');
      const credentials = {
        emailOrPhone: data.emailOrPhone.includes('@') ? data.emailOrPhone.toLowerCase() : data.emailOrPhone,
        password: data.password || '',
        rememberMe: data.rememberMe || false
      };

      const response = await this.api.post<any>('/seller/auth/login', credentials);
      console.log('Login API response received:', {
        success: response.success,
        hasData: !!response.data,
        hasToken: !!(response.data?.accessToken),
        hasSellerData: !!(response.data?.seller),
        hasTeamUserData: !!(response.data?.teamUser),
        userType: response.data?.userType
      });

      // Validate basic response structure
      if (!response.success || !response.data) {
        throw new Error('Incomplete login response from server');
      }

      if (!response.data.accessToken) {
        throw new Error('Incomplete login response from server: missing access token');
      }

      // Check if this is a team user response
      if (response.data.userType === 'team_user' && response.data.teamUser) {
        console.log('Team user login successful:', response.data.teamUser.name);

        // Validate team user data
        if (!response.data.teamUser.id) {
          throw new Error('Incomplete login response from server: missing team user data');
        }

        // Store team user context
        await secureStorage.setItem('auth_token', response.data.accessToken);
        await secureStorage.setItem('refresh_token', response.data.refreshToken);
        await secureStorage.setItem('user_type', 'team_user');
        await secureStorage.setItem('user_permissions', JSON.stringify(response.data.teamUser.permissions));
        await secureStorage.setItem('user_context', JSON.stringify({
          id: response.data.teamUser.id,
          name: response.data.teamUser.name,
          email: response.data.teamUser.email,
          role: response.data.teamUser.role,
          permissions: response.data.teamUser.permissions,
          userType: 'team_user',
          sellerId: response.data.teamUser.seller._id
        }));

        // Also store seller_token for navbar compatibility
        localStorage.setItem('seller_token', response.data.accessToken);

        console.log('Team user auth tokens stored successfully');
        return {
          success: true,
          data: response.data,
          message: 'Team user login successful',
          status: 200
        };
      }

      // Handle regular seller response
      if (!response.data.seller || (!response.data.seller.id && !response.data.seller._id)) {
        throw new Error('Incomplete login response from server: missing seller data');
      }

      console.log('Seller login successful:', response.data.seller.name);

      // Store seller token and context
      await secureStorage.setItem('auth_token', response.data.accessToken);
      if (response.data.refreshToken) {
        await secureStorage.setItem('refresh_token', response.data.refreshToken);
      }
      await secureStorage.setItem('user_type', 'seller');
      await secureStorage.setItem('user_context', JSON.stringify({
        id: response.data.seller.id || response.data.seller._id,
        name: response.data.seller.name,
        email: response.data.seller.email,
        businessName: response.data.seller.businessName,
        userType: 'seller'
      }));

      // Store seller data in localStorage so team members can access it
      localStorage.setItem('current_seller_data', JSON.stringify({
        sellerId: response.data.seller.id || response.data.seller._id,
        name: response.data.seller.name,
        email: response.data.seller.email,
        businessName: response.data.seller.businessName
      }));

      // Also store seller_token for navbar compatibility
      localStorage.setItem('seller_token', response.data.accessToken);

      console.log('Seller auth tokens stored successfully');
      return response;
    } catch (error: any) {
      console.error('Login request failed:', {
        name: error.name,
        message: error.message,
        status: error.status || error.response?.status,
        code: error.code,
        response: error.response?.data
      });

      // Properly handle 404 error
      if (error.response?.status === 404) {
        const apiError: ApiError = {
          message: 'Account not found with the provided email/phone. Please check your credentials or contact your admin if you are a team member.',
          status: 404,
          code: ERROR_CODES.NOT_FOUND
        };
        throw apiError;
      }

      // Handle other errors
      const apiError = error as ApiError;
      if (!apiError.message) {
        apiError.message = 'Login failed. Please try again.';
      }
      throw apiError;
    }
  }

  async register(data: SellerRegisterInput, verifiedOtp: string): Promise<ApiResponse<SellerRegisterResponse>> {
    try {
      // Format the data for the API
      const registerData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        companyName: data.companyName,
        monthlyShipments: data.monthlyShipments,
        otp: verifiedOtp
      };

      const response = await this.api.post<SellerRegisterResponse>('/seller/auth/register', registerData);

      // Store the token in secure storage
      if (response.data?.accessToken) {
        await secureStorage.setItem('auth_token', response.data.accessToken);
        if (response.data.refreshToken) {
          await secureStorage.setItem('refresh_token', response.data.refreshToken);
        }
        await secureStorage.setItem('user_type', 'seller');
      }

      return response;
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Registration failed');
      throw error;
    }
  }

  async logout(): Promise<void> {
    // Check if this is an impersonated session
    const token = localStorage.getItem('token');
    let isImpersonated = false;

    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          isImpersonated = payload.isImpersonated === true;
        }
      } catch (e) {
        console.warn('Error checking impersonation status during logout:', e);
      }
    }

    try {
      // If impersonated, call the stop impersonation endpoint instead
      if (isImpersonated) {
        console.log('🔄 Impersonated session detected - stopping impersonation');
        try {
          // Use the admin API to stop impersonation
          const adminApi = ServiceFactory.getInstance().getApiService();
          await adminApi.post('/admin/auth/stop-impersonation');
          console.log('✅ Impersonation stopped successfully');

          // For impersonation, redirect to admin dashboard
          window.location.href = '/admin/dashboard';
          return;
        } catch (impersonationError) {
          console.error('❌ Failed to stop impersonation via API:', impersonationError);
          // Continue with manual cleanup
        }
      } else {
        // Regular seller logout
        await this.api.post('/seller/auth/logout');
      }
    } catch (error) {
      console.error('❌ Logout API call failed:', error);
      // Continue with cleanup even if API call fails
    } finally {
      // Always clear ALL authentication data
      await this.clearAllAuthData();

      // For regular logout, let the AuthProvider handle redirect
      // by dispatching a custom event that the AuthProvider can listen to
      if (!isImpersonated) {
        console.log('🔄 Logout complete, triggering auth refresh');
        window.dispatchEvent(new CustomEvent('auth-logout'));
      }
    }
  }

  // Helper method to clear all authentication data including impersonation
  private async clearAllAuthData(): Promise<void> {
    try {
      console.log('🧹 Clearing all authentication data...');

      // Clear secureStorage items
      await secureStorage.removeItem('auth_token');
      await secureStorage.removeItem('refresh_token');
      await secureStorage.removeItem('user_type');
      await secureStorage.removeItem('user_permissions');
      await secureStorage.removeItem('user_context');

      // Clear localStorage items (including impersonation tokens)
      localStorage.removeItem('token'); // ← CRITICAL: Clear impersonation token
      localStorage.removeItem('user'); // ← CRITICAL: Clear impersonation user data
      localStorage.removeItem('seller_token');
      localStorage.removeItem('current_seller_data');

      // Clear any other impersonation-related storage
      localStorage.removeItem('original_admin_token');
      localStorage.removeItem('original_admin_user');

      console.log('✅ All authentication data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  }

  async getCurrentUser(): Promise<any | null> {
    try {
      const token = await secureStorage.getItem('auth_token');
      if (!token) return null;

      const userType = await secureStorage.getItem('user_type');
      const userContext = await secureStorage.getItem('user_context');

      if (userContext) {
        return JSON.parse(userContext);
      }

      // Fallback to API call for seller
      if (userType === 'seller') {
        const response = await this.api.get<Seller>('/seller/profile');
        return response.data;
      }

      return null;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === ERROR_CODES.UNAUTHORIZED) {
        await secureStorage.removeItem('auth_token');
        await secureStorage.removeItem('user_type');
        await secureStorage.removeItem('user_context');
      }
      return null;
    }
  }

  // Helper method to get current user permissions
  async getCurrentUserPermissions(): Promise<string[]> {
    try {
      // First, check if this is an impersonated session
      const token = localStorage.getItem('token'); // Check main token storage used by impersonation
      if (token) {
        try {
          // Decode JWT token to check for impersonation
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('🔐 JWT token payload:', payload);

            // If this is an impersonated seller session, grant full seller permissions
            if (payload.isImpersonated && payload.role === 'seller') {
              console.log('🔥 Impersonated seller detected - granting full seller permissions');
              return [
                "Dashboard access", "Order", "Shipments", "Manifest", "Received", "New Order",
                "NDR List", "Weight Dispute", "Fright", "Wallet", "Invoice", "Ledger",
                "COD Remittance", "Support", "Warehouse", "Service", "Items & SKU",
                "Stores", "Priority", "Label", "Manage Users"
              ];
            }
          }
        } catch (jwtError) {
          console.warn('🔐 JWT decode error (continuing with normal flow):', jwtError);
        }
      }

      const userType = await secureStorage.getItem('user_type');
      console.log('🔐 getCurrentUserPermissions: userType =', userType);

      if (userType === 'team_user') {
        const permissions = await secureStorage.getItem('user_permissions');
        console.log('🔐 getCurrentUserPermissions: raw permissions from storage =', permissions);

        if (permissions) {
          try {
            const permissionsObj = JSON.parse(permissions);
            console.log('🔐 getCurrentUserPermissions: parsed permissions =', {
              type: typeof permissionsObj,
              isArray: Array.isArray(permissionsObj),
              isObject: typeof permissionsObj === 'object' && permissionsObj !== null,
              content: permissionsObj
            });

            // Convert permissions object to array of allowed permissions
            if (typeof permissionsObj === 'object' && permissionsObj !== null && !Array.isArray(permissionsObj)) {
              // If it's an object like { "Dashboard access": true, "Order": false }
              const allowedPermissions = Object.keys(permissionsObj).filter(key => permissionsObj[key] === true);
              console.log('🔐 getCurrentUserPermissions: converted to array =', allowedPermissions);
              return allowedPermissions;
            } else if (Array.isArray(permissionsObj)) {
              // If it's already an array, return as is
              console.log('🔐 getCurrentUserPermissions: already an array, returning as-is');
              return permissionsObj;
            } else {
              console.warn('🔐 getCurrentUserPermissions: unexpected permissions format:', permissionsObj);
              return [];
            }
          } catch (parseError) {
            console.error('🔐 getCurrentUserPermissions: JSON parse error:', parseError);
            return [];
          }
        } else {
          console.log('🔐 getCurrentUserPermissions: no permissions in storage');
          return [];
        }
      }

      // Sellers have all permissions
      if (userType === 'seller') {
        console.log('🔐 getCurrentUserPermissions: seller user, returning all permissions');
        return [
          "Dashboard access", "Order", "Shipments", "Manifest", "Received", "New Order",
          "NDR List", "Weight Dispute", "Fright", "Wallet", "Invoice", "Ledger",
          "COD Remittance", "Support", "Warehouse", "Service", "Items & SKU",
          "Stores", "Priority", "Label", "Manage Users"
        ];
      }

      console.log('🔐 getCurrentUserPermissions: unknown user type, returning empty array');
      return [];
    } catch (error) {
      console.error('❌ getCurrentUserPermissions: Error getting user permissions:', error);
      return [];
    }
  }

  // Helper method to check if current user has permission
  async hasPermission(permission: string): Promise<boolean> {
    const permissions = await this.getCurrentUserPermissions();
    return permissions.includes(permission);
  }

  // Method to check authentication status
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await secureStorage.getItem('auth_token');
      const userType = await secureStorage.getItem('user_type');

      if (!token || !userType) {
        return false;
      }

      // Basic JWT validation for both sellers and team users
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp && Date.now() >= payload.exp * 1000) {
            console.log('🔐 Token expired, attempting refresh');

            // Try to refresh token
            if (userType === 'team_user') {
              const refreshed = await this.refreshTeamUserToken();
              return refreshed;
            } else if (userType === 'seller') {
              // Implement seller token refresh if needed
              const refreshToken = await secureStorage.getItem('refresh_token');
              if (refreshToken) {
                try {
                  const response = await this.refreshToken(refreshToken);
                  if (response.success && response.data) {
                    await secureStorage.setItem('auth_token', response.data.accessToken);
                    localStorage.setItem('seller_token', response.data.accessToken);
                    return true;
                  }
                } catch (refreshError) {
                  console.error('Seller token refresh failed:', refreshError);
                }
              }
            }

            await this.clearAuthData();
            return false;
          }
        }
      } catch (tokenError) {
        console.error('🔐 Token validation error:', tokenError);
        await this.clearAuthData();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  // Helper method to clear all authentication data
  private async clearAuthData(): Promise<void> {
    try {
      await secureStorage.removeItem('auth_token');
      await secureStorage.removeItem('refresh_token');
      await secureStorage.removeItem('user_type');
      await secureStorage.removeItem('user_permissions');
      await secureStorage.removeItem('user_context');
      localStorage.removeItem('seller_token');
      localStorage.removeItem('current_seller_data');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Method to refresh team user token if needed
  async refreshTeamUserToken(): Promise<boolean> {
    try {
      const userType = await secureStorage.getItem('user_type');
      if (userType !== 'team_user') {
        return false;
      }

      const refreshToken = await secureStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.log('🔐 No refresh token found, clearing auth');
        await this.clearAuthData();
        return false;
      }

      // Call the team user refresh token API endpoint
      const response = await this.api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>('/seller/team-auth/refresh-token', {
        refreshToken
      });

      if (response.success && response.data) {
        // Store the new tokens
        await secureStorage.setItem('auth_token', response.data.accessToken);
        await secureStorage.setItem('refresh_token', response.data.refreshToken);
        localStorage.setItem('seller_token', response.data.accessToken);

        console.log('🔐 Team user token refreshed successfully via API');
        return true;
      }

      console.log('🔐 Token refresh failed, clearing auth');
      await this.clearAuthData();
      return false;
    } catch (error) {
      console.error('Error refreshing team user token:', error);
      await this.clearAuthData();
      return false;
    }
  }

  // Method to validate and restore session on page load
  async validateAndRestoreSession(): Promise<boolean> {
    try {
      const isAuth = await this.isAuthenticated();

      if (!isAuth) {
        return false;
      }

      const userType = await secureStorage.getItem('user_type');
      const authToken = await secureStorage.getItem('auth_token');
      const sellerToken = localStorage.getItem('seller_token');

      // Ensure localStorage token matches for compatibility
      if (authToken && authToken !== sellerToken) {
        console.log('🔐 Token mismatch detected, synchronizing');
        localStorage.setItem('seller_token', authToken);
      }

      // Validate user context is available
      const userContext = await secureStorage.getItem('user_context');
      if (!userContext) {
        console.log('🔐 User context missing, fetching from API');

        try {
          if (userType === 'team_user') {
            const response = await this.api.get<any>('/seller/team-auth/profile');
            if (response.success && response.data) {
              await secureStorage.setItem('user_context', JSON.stringify({
                id: response.data.id || response.data._id,
                name: response.data.name,
                email: response.data.email,
                role: response.data.role,
                permissions: response.data.permissions,
                userType: 'team_user',
                sellerId: response.data.seller?._id || response.data.seller
              }));
              console.log('🔐 Team user context restored from API');
            }
          } else if (userType === 'seller') {
            const response = await this.api.get<any>('/seller/profile');
            if (response.success && response.data) {
              await secureStorage.setItem('user_context', JSON.stringify({
                id: response.data.id || response.data._id,
                name: response.data.name,
                email: response.data.email,
                businessName: response.data.businessName,
                userType: 'seller'
              }));
              console.log('🔐 Seller context restored from API');
            }
          }
        } catch (apiError) {
          console.error('Failed to restore user context from API:', apiError);
          await this.clearAuthData();
          return false;
        }
      }

      console.log('🔐 Session validated successfully');
      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  async sendOTP(emailOrPhone: string, purpose: string = 'login', options?: { phone?: string }): Promise<ApiResponse<{ message: string }>> {
    try {
      // For registration with both email and phone
      if (purpose === 'register' && options?.phone) {
        return await this.api.post('/seller/auth/otp/send', {
          email: emailOrPhone,
          phone: options.phone,
          purpose
        });
      }

      // Standard OTP sending
      return await this.api.sendSellerOTP(emailOrPhone, purpose);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Failed to send OTP');
      throw error;
    }
  }

  async verifyOTP(emailOrPhone: string, otp: string, purpose: string = 'login'): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.verifySellerOTP(emailOrPhone, otp, purpose);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'OTP verification failed');
      throw error;
    }
  }

  async resetPassword(emailOrPhone: string, otp: string, newPassword: string, confirmPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.post<{ message: string }>('/seller/auth/reset-password', {
        emailOrPhone,
        otp,
        newPassword,
        confirmPassword
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Password reset failed');
      throw error;
    }
  }

  async getCurrentSeller(): Promise<Seller | null> {
    try {
      const token = await secureStorage.getItem('auth_token');
      if (!token) return null;

      const response = await this.api.get<Seller>('/seller/profile');
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === ERROR_CODES.UNAUTHORIZED) {
        await secureStorage.removeItem('auth_token');
      }
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
    return this.api.post<{ accessToken: string }>('/seller/auth/refresh-token', { refreshToken });
  }
}

export const sellerAuthService = new SellerAuthService();
