import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AlertTriangle, Shield } from 'lucide-react';
import React from 'react';

interface PermissionGuardProps {
  permission?: keyof AdminPermissions;
  permissions?: (keyof AdminPermissions)[];
  requireAll?: boolean;
  feature?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showWarning?: boolean;
}

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

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  requireAll = false,
  feature,
  children,
  fallback,
  showWarning = true
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    loading,
    currentUser,
    isSuperAdmin
  } = useAdminPermissions();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-gray-600">Checking permissions...</span>
      </div>
    );
  }

  // Check permissions
  let hasAccess = false;

  // Super Admin bypass
  if (isSuperAdmin()) {
    hasAccess = true;
  } else {
    // Single permission check
    if (permission) {
      hasAccess = hasPermission(permission);
    }
    // Multiple permissions check
    else if (permissions && permissions.length > 0) {
      hasAccess = requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);
    }
    // Feature-based check
    else if (feature) {
      hasAccess = canAccess(feature);
    }
    // Default to false if no permission specified
    else {
      hasAccess = false;
    }
  }

  // Grant access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Return fallback component if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show warning message if requested
  if (showWarning) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-yellow-800">
              Access Restricted
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                You don't have permission to access this feature.
                {permission && ` Required permission: ${permission}`}
                {permissions && ` Required permissions: ${permissions.join(', ')}`}
                {feature && ` Required feature access: ${feature}`}
              </p>
              <div className="mt-3 space-y-1">
                <p><strong>Your Role:</strong> {currentUser?.role || 'Unknown'}</p>
                <p><strong>Your Department:</strong> {currentUser?.department || 'Unknown'}</p>
                <p><strong>Super Admin:</strong> {isSuperAdmin() ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="bg-yellow-100 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Contact your administrator to request access
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Return nothing (hide completely)
  return null;
};

export default PermissionGuard;

// Convenience component for Super Admin only content
export const SuperAdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showWarning?: boolean;
}> = ({ children, fallback, showWarning = true }) => {
  const { isSuperAdmin, loading } = useAdminPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isSuperAdmin()) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showWarning) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-red-800">
            Super Admin access required
          </span>
        </div>
      </div>
    );
  }

  return null;
};

// Convenience component for hiding elements without permissions
export const PermissionHide: React.FC<PermissionGuardProps> = (props) => {
  return (
    <PermissionGuard {...props} showWarning={false} />
  );
};
