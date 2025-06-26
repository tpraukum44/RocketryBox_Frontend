import { CustomerRegisterInput } from '@/lib/validations/customer';
import {
    Admin,
    ApiError,
    ApiResponse,
    Customer,
    ERROR_CODES,
    Seller
} from '@/types/api';
import { toast } from 'sonner';
import { ApiService } from './api.service';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export class AuthService {
  private api: ApiService;

  constructor() {
    this.api = ApiService.getInstance();
  }

  async login(credentials: { phoneOrEmail: string; password: string; otp?: string; rememberMe?: boolean }): Promise<ApiResponse<LoginResponse>> {
    return this.api.post<LoginResponse>('/customer/auth/login', credentials);
  }

  async register(data: CustomerRegisterInput): Promise<ApiResponse<LoginResponse>> {
    return this.api.post<LoginResponse>('/customer/auth/register', data);
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
          isImpersonated = payload.isImpersonated === true && payload.role === 'customer';
        }
      } catch (e) {
        console.warn('Error checking customer impersonation status during logout:', e);
      }
    }

    try {
      // If impersonated, call the stop impersonation endpoint instead
      if (isImpersonated) {
        console.log('🔄 Customer impersonated session detected - stopping impersonation');
        try {
          // Use the admin API to stop impersonation
          const adminApi = ApiService.getInstance();
          await adminApi.post('/admin/auth/stop-impersonation');
          console.log('✅ Customer impersonation stopped successfully');

          // For impersonation, redirect to admin dashboard
          window.location.href = '/admin/dashboard';
          return;
        } catch (impersonationError) {
          console.error('❌ Failed to stop customer impersonation via API:', impersonationError);
          // Continue with manual cleanup
        }
      } else {
        // Regular customer logout
        await this.api.post('/customer/auth/logout');
      }
    } catch (error) {
      console.error('❌ Customer logout API call failed:', error);
      // Continue with cleanup even if API call fails
    } finally {
      // Always clear ALL authentication data
      await this.clearAllAuthData();

      // For regular logout, let the AuthProvider handle redirect
      // by dispatching a custom event that the AuthProvider can listen to
      if (!isImpersonated) {
        console.log('🔄 Customer logout complete, triggering auth refresh');
        window.dispatchEvent(new CustomEvent('auth-logout'));
      }
    }
  }

  // Helper method to clear all authentication data including impersonation
  private async clearAllAuthData(): Promise<void> {
    try {
      console.log('🧹 Clearing all customer authentication data...');

      // Import secureStorage locally to avoid circular dependencies
      const { secureStorage } = await import('@/utils/secureStorage');

      // Clear secureStorage items
      await secureStorage.removeItem('auth_token');
      await secureStorage.removeItem('refresh_token');
      await secureStorage.removeItem('user_type');
      await secureStorage.removeItem('user_permissions');
      await secureStorage.removeItem('user_context');

      // Clear localStorage items (including impersonation tokens)
      localStorage.removeItem('token'); // ← CRITICAL: Clear impersonation token
      localStorage.removeItem('user'); // ← CRITICAL: Clear impersonation user data
      localStorage.removeItem('impersonation_mode');

      // Clear any other impersonation-related storage
      localStorage.removeItem('original_admin_token');
      localStorage.removeItem('original_admin_user');

      console.log('✅ All customer authentication data cleared');
    } catch (error) {
      console.error('❌ Error clearing customer auth data:', error);
    }
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    return this.api.post<{ accessToken: string }>('/customer/auth/refresh-token');
  }

  async sendMobileOTP(mobile: string, purpose: string = 'verify'): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.post<{ message: string }>('/customer/auth/otp/send', {
        phoneOrEmail: mobile,
        purpose: purpose
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Failed to send OTP');
      throw error;
    }
  }

  async sendEmailOTP(email: string, purpose: string = 'verify'): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.post<{ message: string }>('/customer/auth/otp/send', {
        phoneOrEmail: email,
        purpose: purpose
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Failed to send OTP');
      throw error;
    }
  }

  async verifyMobileOTP(mobile: string, otp: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.post<{ message: string }>('/customer/auth/otp/verify', {
        phoneOrEmail: mobile,
        otp
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'OTP verification failed');
      throw error;
    }
  }

  async verifyEmailOTP(email: string, otp: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.post<{ message: string }>('/customer/auth/otp/verify', {
        phoneOrEmail: email,
        otp
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'OTP verification failed');
      throw error;
    }
  }

  async resetPassword(emailOrPhone: string, otp: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.post<{ message: string }>('/customer/auth/reset-password', {
        emailOrPhone,
        otp,
        newPassword
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Password reset failed');
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return await this.api.post<{ message: string }>('/customer/auth/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Password change failed');
      throw error;
    }
  }

  async getCurrentUser(): Promise<Customer | Seller | Admin | null> {
    try {
      const response = await this.api.get<Customer | Seller | Admin>('/customer/profile');
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === ERROR_CODES.UNAUTHORIZED) {
        console.error('User not authenticated');
      }
      return null;
    }
  }

  async checkAuthStatus(): Promise<{ isAuthenticated: boolean; user: any | null }> {
    try {
      const response = await this.api.get<{ user: any }>('/customer/auth/check');

      return {
        isAuthenticated: response.success,
        user: response.data?.user || null
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null
      };
    }
  }

  async sendMobileOTPForReset(mobile: string): Promise<ApiResponse<{ message: string }>> {
    return this.sendMobileOTP(mobile, 'reset');
  }

  async sendEmailOTPForReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.sendEmailOTP(email, 'reset');
  }
}

export const authService = new AuthService();
