import { AlertCircle, Loader2, Shield } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Helper function to check if current user is Super Admin
const getCurrentUser = (): { isSuperAdmin: boolean; role: string } => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        isSuperAdmin: user.isSuperAdmin === true,
        role: user.role || ''
      };
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  return { isSuperAdmin: false, role: '' };
};

/**
 * This component handles navigation to the team member creation page,
 * ensuring compatibility between local development and Vercel deployment.
 * It's designed to overcome routing issues that can occur in Vercel deployments
 * with client-side routing.
 *
 * Now includes Super Admin permission check.
 */
const AdminRegisterHandler = () => {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();

    useEffect(() => {
        // Check if user is Super Admin
        if (!currentUser.isSuperAdmin) {
            console.warn('Access denied: User is not a Super Admin');
            toast.error('Access Denied', {
                description: 'Only Super Admins can create team members'
            });

            // Redirect back to teams page after a short delay
            const timer = setTimeout(() => {
                navigate('/admin/dashboard/teams', { replace: true });
            }, 2000);

            return () => clearTimeout(timer);
        }

        // If user is Super Admin, proceed with navigation
        const timer = setTimeout(() => {
            navigate('/admin/dashboard/teams/create', { replace: true });
        }, 100);

        return () => clearTimeout(timer);
    }, [navigate, currentUser.isSuperAdmin]);

    // Show access denied message if not Super Admin
    if (!currentUser.isSuperAdmin) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md mx-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-6">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>

                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
                        <p className="text-red-600 mb-4">
                            Only Super Admins can create team members
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-red-700">
                                <strong>Your Role:</strong> {currentUser.role || 'Unknown'}
                            </p>
                            <p className="text-sm text-red-700">
                                <strong>Required:</strong> Super Admin
                            </p>
                        </div>
                        <p className="text-sm text-gray-600">
                            Redirecting back to teams page...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show loading for Super Admins
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
            <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
                <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
            </div>
            <p className="text-lg text-gray-700">Redirecting to team member registration...</p>
            <p className="text-sm text-green-600 mt-2">✓ Super Admin Access Verified</p>
        </div>
    );
};

export default AdminRegisterHandler;
