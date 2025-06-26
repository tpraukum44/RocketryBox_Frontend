import { sellerAuthService } from '@/services/seller-auth.service';
import { useEffect, useState } from 'react';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        console.log('🔐 usePermissions: Loading user permissions...');
        const userPermissions = await sellerAuthService.getCurrentUserPermissions();
        console.log('🔐 usePermissions: Received permissions:', {
          type: typeof userPermissions,
          isArray: Array.isArray(userPermissions),
          content: userPermissions,
          length: userPermissions?.length
        });
        setPermissions(userPermissions);
      } catch (error) {
        console.error('❌ usePermissions: Error loading user permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const hasPermission = (permission: string): boolean => {
    // Safety check: ensure permissions is an array
    if (!Array.isArray(permissions)) {
      console.warn('🔐 hasPermission: permissions is not an array:', {
        type: typeof permissions,
        content: permissions
      });
      return false;
    }

    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (!Array.isArray(permissions)) {
      console.warn('🔐 hasAnyPermission: permissions is not an array');
      return false;
    }
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (!Array.isArray(permissions)) {
      console.warn('🔐 hasAllPermissions: permissions is not an array');
      return false;
    }
    return permissionList.every(permission => permissions.includes(permission));
  };

  const canAccess = (feature: string): boolean => {
    const featurePermissions: Record<string, string[]> = {
      'dashboard': ['Dashboard access'],
      'orders': ['Order', 'Shipments', 'Manifest'],
      'users': ['Manage Users'],
      'billing': ['Fright', 'Wallet', 'Invoice', 'Ledger'],
      'support': ['Support', 'Warehouse', 'Service'],
      'settings': ['Stores', 'Priority', 'Label']
    };

    const requiredPermissions = featurePermissions[feature] || [];
    return hasAnyPermission(requiredPermissions);
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    loading
  };
};
