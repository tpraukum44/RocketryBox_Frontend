import { secureStorage } from '@/utils/secureStorage';
import { toast } from 'sonner';
import { ServiceFactory } from './service-factory';

interface ImpersonationData {
  isImpersonated: boolean;
  impersonatedBy?: string;
  targetUser?: {
    id: string;
    email: string;
    type: string;
  };
  details?: {
    adminId: string;
    adminEmail: string;
    adminName: string;
    startedAt: string;
  };
}

export class ImpersonationService {

  /**
   * Check if currently in an impersonated session
   */
  static async isImpersonated(): Promise<boolean> {
    try {
      const response = await ServiceFactory.admin.getImpersonationStatus();
      return response.success && response.data?.isImpersonated === true;
    } catch (error) {
      console.error('Error checking impersonation status:', error);
      return false;
    }
  }

  /**
   * Get current impersonation details
   */
  static async getImpersonationDetails(): Promise<ImpersonationData | null> {
    try {
      const response = await ServiceFactory.admin.getImpersonationStatus();
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting impersonation details:', error);
      return null;
    }
  }

  /**
   * Start impersonating a seller
   */
  static async impersonateSeller(sellerId: string, sellerName: string): Promise<boolean> {
    try {
      // Store original admin session
      const originalToken = localStorage.getItem('token');
      const originalUser = localStorage.getItem('user');

      if (originalToken && originalUser) {
        await secureStorage.setItem('original_admin_token', originalToken);
        await secureStorage.setItem('original_admin_user', originalUser);
      }

      // Start impersonation
      const response = await ServiceFactory.admin.impersonateSeller(sellerId);

      if (response.success && response.data) {
        // Store impersonated user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('impersonation_mode', 'true');

        toast.success(`Now logged in as ${sellerName}`, {
          description: 'You are viewing the seller dashboard. Look for the admin banner to return.',
          duration: 5000
        });

        // Redirect to seller dashboard
        window.location.href = response.data.redirectTo || '/seller/dashboard';
        return true;
      }

      toast.error('Failed to impersonate seller');
      return false;
    } catch (error: any) {
      console.error('Seller impersonation error:', error);

      // Provide specific error messages based on the error
      let errorMessage = 'Failed to impersonate seller';

      if (error?.message) {
        if (error.message.includes('Cannot impersonate inactive seller')) {
          errorMessage = `Cannot impersonate ${sellerName} - This seller account is inactive. Only active sellers can be impersonated.`;
        } else if (error.message.includes('Cannot impersonate suspended seller')) {
          errorMessage = `Cannot impersonate ${sellerName} - This seller account is suspended. Contact support to reactivate.`;
        } else if (error.message.includes('Cannot impersonate pending seller')) {
          errorMessage = `Cannot impersonate ${sellerName} - This seller account is still pending activation.`;
        } else if (error.message.includes('Only Super Admins can impersonate')) {
          errorMessage = 'Permission denied - Only Super Admins can impersonate users.';
        } else if (error.message.includes('Seller not found')) {
          errorMessage = `Seller ${sellerName} not found. They may have been deleted or the ID is invalid.`;
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, {
        duration: 6000,
        description: error.message?.includes('inactive') || error.message?.includes('suspended') || error.message?.includes('pending')
          ? 'Contact the seller or support to resolve the account status.' : undefined
      });
      return false;
    }
  }

  /**
   * Start impersonating a customer
   */
  static async impersonateCustomer(customerId: string, customerName: string): Promise<boolean> {
    try {
      // Store original admin session
      const originalToken = localStorage.getItem('token');
      const originalUser = localStorage.getItem('user');

      if (originalToken && originalUser) {
        await secureStorage.setItem('original_admin_token', originalToken);
        await secureStorage.setItem('original_admin_user', originalUser);
      }

      // Start impersonation
      const response = await ServiceFactory.admin.impersonateCustomer(customerId);

      if (response.success && response.data) {
        // Store impersonated user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('impersonation_mode', 'true');

        toast.success(`Now logged in as ${customerName}`, {
          description: 'You are viewing the customer dashboard. Look for the admin banner to return.',
          duration: 5000
        });

        // Redirect to customer home
        window.location.href = response.data.redirectTo || '/customer/home';
        return true;
      }

      toast.error('Failed to impersonate customer');
      return false;
    } catch (error: any) {
      console.error('Customer impersonation error:', error);

      // Provide specific error messages based on the error
      let errorMessage = 'Failed to impersonate customer';

      if (error?.message) {
        if (error.message.includes('Cannot impersonate inactive customer')) {
          errorMessage = `Cannot impersonate ${customerName} - This customer account is inactive. Only active customers can be impersonated.`;
        } else if (error.message.includes('Cannot impersonate suspended customer')) {
          errorMessage = `Cannot impersonate ${customerName} - This customer account is suspended. Contact support to reactivate.`;
        } else if (error.message.includes('Cannot impersonate pending customer')) {
          errorMessage = `Cannot impersonate ${customerName} - This customer account is still pending activation.`;
        } else if (error.message.includes('Only Super Admins can impersonate')) {
          errorMessage = 'Permission denied - Only Super Admins can impersonate users.';
        } else if (error.message.includes('Customer not found')) {
          errorMessage = `Customer ${customerName} not found. They may have been deleted or the ID is invalid.`;
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, {
        duration: 6000,
        description: error.message?.includes('inactive') || error.message?.includes('suspended') || error.message?.includes('pending')
          ? 'Contact the customer or support to resolve the account status.' : undefined
      });
      return false;
    }
  }

  /**
   * Stop impersonation and return to admin panel
   */
  static async stopImpersonation(): Promise<boolean> {
    try {
      // Get original session
      const originalToken = await secureStorage.getItem('original_admin_token');
      const originalUser = await secureStorage.getItem('original_admin_user');

      if (originalToken && originalUser) {
        // Restore original admin session
        localStorage.setItem('token', originalToken);
        localStorage.setItem('user', originalUser);
        localStorage.removeItem('impersonation_mode');

        // Clean up stored data
        await secureStorage.removeItem('original_admin_token');
        await secureStorage.removeItem('original_admin_user');

        toast.success('Returned to admin panel', {
          description: 'You are now back in the admin dashboard.',
          duration: 3000
        });

        // Redirect to admin dashboard
        window.location.href = '/admin/dashboard';
        return true;
      }

      toast.error('Failed to return to admin panel');
      return false;
    } catch (error: any) {
      console.error('Stop impersonation error:', error);
      toast.error(error?.message || 'Failed to return to admin panel');
      return false;
    }
  }

  /**
   * Check if user has permission to impersonate
   */
  static canImpersonate(): boolean {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.isSuperAdmin === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking impersonation permission:', error);
      return false;
    }
  }

  /**
   * Check if currently in impersonation mode
   */
  static isInImpersonationMode(): boolean {
    return localStorage.getItem('impersonation_mode') === 'true';
  }
}
