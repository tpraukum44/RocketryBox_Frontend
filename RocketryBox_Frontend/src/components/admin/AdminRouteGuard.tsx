import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import React from 'react';
import { Navigate } from 'react-router-dom';

interface AdminRouteGuardProps {
  permission?: keyof AdminPermissions;
  permissions?: (keyof AdminPermissions)[];
  requireAll?: boolean;
  feature?: string;
  requireSuperAdmin?: boolean;
  children: React.ReactNode;
  redirectTo?: string;
  showUnauthorized?: boolean;
}

interface AdminPermissions {
  dashboardAccess: boolean;
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

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  permission,
  permissions,
  requireAll = false,
  feature,
  requireSuperAdmin = false,
  children,
  redirectTo = '/admin/dashboard',
  showUnauthorized = true
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="text-gray-600">Verifying permissions...</span>
        </div>
      </div>
    );
  }

  // Check permissions
  let hasAccess = false;

  // Super Admin check
  if (requireSuperAdmin) {
    hasAccess = isSuperAdmin();
  } else if (isSuperAdmin()) {
    hasAccess = true; // Super Admin bypasses all checks
  } else {
    // Regular permission checks
    if (permission) {
      hasAccess = hasPermission(permission);
    } else if (permissions && permissions.length > 0) {
      hasAccess = requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);
    } else if (feature) {
      hasAccess = canAccess(feature);
    } else {
      hasAccess = true; // No specific permission required
    }
  }

  // Grant access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show unauthorized page instead of redirecting
  if (showUnauthorized) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Access Denied</CardTitle>
            <CardDescription className="text-lg">
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-800">Missing Required Access</span>
              </div>
              <div className="text-sm text-red-700 space-y-1">
                {requireSuperAdmin && (
                  <p>• Super Admin access required</p>
                )}
                {permission && (
                  <p>• Required permission: <code className="bg-red-100 px-1 rounded">{permission}</code></p>
                )}
                {permissions && permissions.length > 0 && (
                  <p>• Required permissions: {permissions.map(p =>
                    <code key={p} className="bg-red-100 px-1 rounded mr-1">{p}</code>
                  )}</p>
                )}
                {feature && (
                  <p>• Required feature access: <code className="bg-red-100 px-1 rounded">{feature}</code></p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Your Current Access Level</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div><strong>Role:</strong> {currentUser?.role || 'Unknown'}</div>
                <div><strong>Department:</strong> {currentUser?.department || 'Unknown'}</div>
                <div><strong>Super Admin:</strong> {isSuperAdmin() ? 'Yes' : 'No'}</div>
                <div><strong>User ID:</strong> {currentUser?.id || 'Unknown'}</div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-600">
                If you believe you should have access to this page, please contact your administrator.
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Go Back</span>
                </Button>
                <Button
                  onClick={() => window.location.href = redirectTo}
                  className="flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to specified route
  return <Navigate to={redirectTo} replace />;
};

export default AdminRouteGuard;

// Convenience component for Super Admin only routes
export const SuperAdminRoute: React.FC<{
  children: React.ReactNode;
  redirectTo?: string;
  showUnauthorized?: boolean;
}> = ({ children, redirectTo, showUnauthorized }) => {
  return (
    <AdminRouteGuard
      requireSuperAdmin={true}
      redirectTo={redirectTo}
      showUnauthorized={showUnauthorized}
    >
      {children}
    </AdminRouteGuard>
  );
};
