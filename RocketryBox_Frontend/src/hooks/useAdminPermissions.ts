import { useEffect, useState } from 'react';

interface AdminPermissions {
  // Core Access
  dashboardAccess: boolean;

  // Navigation Permissions - All Sidebar Items
  usersAccess: boolean;
  teamsAccess: boolean;
  partnersAccess: boolean;
  ordersAccess: boolean;
  shipmentsAccess: boolean;
  ticketsAccess: boolean;
  ndrAccess: boolean;
  billingAccess: boolean;
  reportsAccess: boolean;
  escalationAccess: boolean;
  settingsAccess: boolean;

  // Granular Operation Permissions
  userManagement: boolean;
  teamManagement: boolean;
  ordersShipping: boolean;
  financialOperations: boolean;
  systemConfig: boolean;
  sellerManagement: boolean;
  supportTickets: boolean;
  reportsAnalytics: boolean;
  marketingPromotions: boolean;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isSuperAdmin: boolean;
  permissions: AdminPermissions;
}

export const useAdminPermissions = () => {
  const [permissions, setPermissions] = useState<AdminPermissions>({
    // Core Access
    dashboardAccess: false,

    // Navigation Permissions
    usersAccess: false,
    teamsAccess: false,
    partnersAccess: false,
    ordersAccess: false,
    shipmentsAccess: false,
    ticketsAccess: false,
    ndrAccess: false,
    billingAccess: false,
    reportsAccess: false,
    escalationAccess: false,
    settingsAccess: false,

    // Granular Operation Permissions
    userManagement: false,
    teamManagement: false,
    ordersShipping: false,
    financialOperations: false,
    systemConfig: false,
    sellerManagement: false,
    supportTickets: false,
    reportsAnalytics: false,
    marketingPromotions: false,
  });
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = () => {
      try {
        console.log('🔐 useAdminPermissions: Loading admin user permissions...');

        const userStr = localStorage.getItem('user');
        if (!userStr) {
          console.warn('🔐 useAdminPermissions: No user data in localStorage');
          setLoading(false);
          return;
        }

        const user = JSON.parse(userStr);
        console.log('🔐 useAdminPermissions: User data from localStorage:', user);

        // Extract user information
        const adminUser: AdminUser = {
          id: user.id || '',
          name: user.name || user.fullName || '',
          email: user.email || '',
          role: user.role || '',
          department: user.department || '',
          isSuperAdmin: user.isSuperAdmin === true,
          permissions: user.permissions || {}
        };

        setCurrentUser(adminUser);

        // If Super Admin, grant all permissions
        if (adminUser.isSuperAdmin) {
          console.log('🔥 useAdminPermissions: Super Admin detected - granting all permissions');
          setPermissions({
            // Core Access
            dashboardAccess: true,

            // Navigation Permissions
            usersAccess: true,
            teamsAccess: true,
            partnersAccess: true,
            ordersAccess: true,
            shipmentsAccess: true,
            ticketsAccess: true,
            ndrAccess: true,
            billingAccess: true,
            reportsAccess: true,
            escalationAccess: true,
            settingsAccess: true,

            // Granular Operation Permissions
            userManagement: true,
            teamManagement: true,
            ordersShipping: true,
            financialOperations: true,
            systemConfig: true,
            sellerManagement: true,
            supportTickets: true,
            reportsAnalytics: true,
            marketingPromotions: true,
          });
        } else {
          // Use actual user permissions
          const userPermissions = user.permissions || {};
          console.log('🔐 useAdminPermissions: Setting regular user permissions:', userPermissions);

          setPermissions({
            // Core Access
            dashboardAccess: userPermissions.dashboardAccess ?? true, // Default to true

            // Navigation Permissions
            usersAccess: userPermissions.usersAccess ?? false,
            teamsAccess: userPermissions.teamsAccess ?? false,
            partnersAccess: userPermissions.partnersAccess ?? false,
            ordersAccess: userPermissions.ordersAccess ?? false,
            shipmentsAccess: userPermissions.shipmentsAccess ?? false,
            ticketsAccess: userPermissions.ticketsAccess ?? false,
            ndrAccess: userPermissions.ndrAccess ?? false,
            billingAccess: userPermissions.billingAccess ?? false,
            reportsAccess: userPermissions.reportsAccess ?? false,
            escalationAccess: userPermissions.escalationAccess ?? false,
            settingsAccess: userPermissions.settingsAccess ?? false,

            // Granular Operation Permissions
            userManagement: userPermissions.userManagement ?? false,
            teamManagement: userPermissions.teamManagement ?? false,
            ordersShipping: userPermissions.ordersShipping ?? false,
            financialOperations: userPermissions.financialOperations ?? false,
            systemConfig: userPermissions.systemConfig ?? false,
            sellerManagement: userPermissions.sellerManagement ?? false,
            supportTickets: userPermissions.supportTickets ?? false,
            reportsAnalytics: userPermissions.reportsAnalytics ?? false,
            marketingPromotions: userPermissions.marketingPromotions ?? false,
          });
        }

        console.log('🔐 useAdminPermissions: Final permissions set for user:', adminUser.email);
      } catch (error) {
        console.error('❌ useAdminPermissions: Error loading admin permissions:', error);
        setPermissions({
          // Core Access
          dashboardAccess: false,

          // Navigation Permissions
          usersAccess: false,
          teamsAccess: false,
          partnersAccess: false,
          ordersAccess: false,
          shipmentsAccess: false,
          ticketsAccess: false,
          ndrAccess: false,
          billingAccess: false,
          reportsAccess: false,
          escalationAccess: false,
          settingsAccess: false,

          // Granular Operation Permissions
          userManagement: false,
          teamManagement: false,
          ordersShipping: false,
          financialOperations: false,
          systemConfig: false,
          sellerManagement: false,
          supportTickets: false,
          reportsAnalytics: false,
          marketingPromotions: false,
        });
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const hasPermission = (permission: keyof AdminPermissions): boolean => {
    if (currentUser?.isSuperAdmin) {
      return true; // Super Admin has all permissions
    }
    return permissions[permission] || false;
  };

  const hasAnyPermission = (permissionList: (keyof AdminPermissions)[]): boolean => {
    if (currentUser?.isSuperAdmin) {
      return true; // Super Admin has all permissions
    }
    return permissionList.some(permission => permissions[permission]);
  };

  const hasAllPermissions = (permissionList: (keyof AdminPermissions)[]): boolean => {
    if (currentUser?.isSuperAdmin) {
      return true; // Super Admin has all permissions
    }
    return permissionList.every(permission => permissions[permission]);
  };

  const canAccess = (feature: string): boolean => {
    if (currentUser?.isSuperAdmin) {
      return true; // Super Admin can access everything
    }

    const featurePermissions: Record<string, keyof AdminPermissions> = {
      'dashboard': 'dashboardAccess',
      'users': 'usersAccess',
      'teams': 'teamsAccess',
      'partners': 'partnersAccess',
      'orders': 'ordersAccess',
      'shipments': 'shipmentsAccess',
      'tickets': 'ticketsAccess',
      'ndr': 'ndrAccess',
      'billing': 'billingAccess',
      'reports': 'reportsAccess',
      'escalation': 'escalationAccess',
      'settings': 'settingsAccess',

      // Legacy mappings for backward compatibility
      'finance': 'billingAccess',
      'financial': 'billingAccess',
      'system': 'settingsAccess',
      'config': 'settingsAccess',
      'sellers': 'partnersAccess',
      'seller': 'partnersAccess',
      'support': 'ticketsAccess',
      'analytics': 'reportsAccess',
      'marketing': 'settingsAccess',
      'promotions': 'settingsAccess',
    };

    const requiredPermission = featurePermissions[feature.toLowerCase()];
    return requiredPermission ? hasPermission(requiredPermission) : false;
  };

  const isSuperAdmin = (): boolean => {
    return currentUser?.isSuperAdmin || false;
  };

  const getDepartment = (): string => {
    return currentUser?.department || '';
  };

  const getRole = (): string => {
    return currentUser?.role || '';
  };

  return {
    permissions,
    currentUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    isSuperAdmin,
    getDepartment,
    getRole,
    loading
  };
};
