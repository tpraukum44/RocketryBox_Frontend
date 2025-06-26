import { Button } from "@/components/ui/button";
import { ImpersonationService } from "@/services/impersonation.service";
import { AlertTriangle, ArrowLeft, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ImpersonationBannerProps {
  className?: string;
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({ className = "" }) => {
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    // Check if we're in impersonation mode
    const checkImpersonationMode = () => {
      const isInMode = ImpersonationService.isInImpersonationMode();
      setIsImpersonated(isInMode);

      if (isInMode) {
        // Get current user info
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            setImpersonatedUser(user);
          }
        } catch (error) {
          console.error('Error parsing impersonated user data:', error);
        }
      }
    };

    checkImpersonationMode();
  }, []);

  const handleReturnToAdmin = async () => {
    setIsReturning(true);
    try {
      const success = await ImpersonationService.stopImpersonation();
      if (!success) {
        setIsReturning(false);
      }
    } catch (error) {
      console.error('Error returning to admin panel:', error);
      toast.error('Failed to return to admin panel');
      setIsReturning(false);
    }
  };

  if (!isImpersonated) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg border-b-2 border-red-600 ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                🔒 Admin Impersonation Mode
              </p>
              <p className="text-xs opacity-90">
                You are viewing {impersonatedUser?.name || 'this user'}'s dashboard as an administrator
              </p>
            </div>
          </div>

          <Button
            onClick={handleReturnToAdmin}
            disabled={isReturning}
            size="sm"
            variant="secondary"
            className="bg-white text-red-600 hover:bg-gray-100 font-medium shadow-md"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isReturning ? 'Returning...' : 'Return to Admin Panel'}
          </Button>
        </div>
      </div>

      {/* Subtle animation border */}
      <div className="h-1 bg-gradient-to-r from-red-400 to-orange-400 animate-pulse"></div>
    </div>
  );
};
