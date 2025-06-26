import { cn } from "@/lib/utils";
import { secureStorage } from "@/utils/secureStorage";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  { label: "Home", href: "/customer/home" },
  { label: "Create Order", href: "/customer/create-order" },
  { label: "My Orders", href: "/customer/orders" },
  { label: "Profile", href: "/customer/profile" },
];

const CustomerNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const isAuthPage = location.pathname === "/customer/auth/login" || location.pathname === "/customer/auth/register";

      // Skip auth check on auth pages or if already checked
      if (isAuthPage || hasCheckedAuth.current) {
        return;
      }

      try {
        let isAuthenticated = false;

        // PRIORITY 1: Check for impersonation token in localStorage (admin impersonating customer)
        const impersonationToken = localStorage.getItem('token');
        if (impersonationToken) {
          try {
            const parts = impersonationToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const now = Math.floor(Date.now() / 1000);

              // Check if token is valid and contains customer impersonation info
              if (payload.exp && payload.exp > now && payload.isImpersonated && payload.role === 'customer') {
                isAuthenticated = true;
                console.log('🔥 Customer navbar: Found valid impersonation token');
              } else if (payload.exp && payload.exp <= now) {
                // Token expired, clean it up
                console.log('🔄 Customer navbar: Impersonation token expired, cleaning up');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
              }
            }
          } catch (e) {
            console.warn('Customer navbar: Invalid impersonation token format, removing');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }

        // PRIORITY 2: Check for regular auth token in secureStorage
        if (!isAuthenticated) {
          const authToken = await secureStorage.getItem('auth_token');
          if (authToken) {
            isAuthenticated = true;
            console.log('🔐 Customer navbar: Found regular auth token');
          }
        }

        // Only redirect if not authenticated and not already on an auth page
        if (!isAuthenticated && !isAuthPage) {
          hasCheckedAuth.current = true;
          navigate('/customer/auth/login', { replace: true });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Don't redirect on error to prevent loops
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  // Reset auth check flag when visiting auth pages
  useEffect(() => {
    const isAuthPage = location.pathname === "/customer/auth/login" || location.pathname === "/customer/auth/register";
    if (isAuthPage) {
      hasCheckedAuth.current = false;
    }
  }, [location.pathname]);

  const isActiveLink = (href: string) => {
    if (href === "/customer/home" && location.pathname === "/customer") {
      return true;
    }
    return location.pathname === href;
  };

  const isAuthPage = location.pathname === "/customer/auth/login" || location.pathname === "/customer/auth/register";

  if (isAuthPage) {
    return (
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-white",
          isOpen && "shadow-xl shadow-neutral-400/30"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/" className="flex items-center">
                <img
                  src="/icons/logo.svg"
                  alt="Rocketry Box"
                  className="h-10"
                />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>
    );
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white",
        isOpen && "shadow-xl shadow-neutral-400/30"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/customer/home" className="flex items-center">
              <img
                src="/icons/logo.svg"
                alt="Rocketry Box"
                className="h-10"
              />
            </Link>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-1">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center px-1 py-2 rounded-lg bg-main text-white gap-x-1"
            >
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to={link.href}
                    className={cn(
                      "px-4 py-1.5 rounded-md transition-all duration-200",
                      isActiveLink(link.href)
                        ? "bg-white/20 font-medium"
                        : "hover:bg-white/10"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMenu}
            className="lg:hidden p-2 text-gray-700 hover:text-main"
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden overflow-hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="p-4 bg-main text-white rounded-lg mb-4"
              >
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * (index + 1) }}
                    >
                      <Link
                        to={link.href}
                        className={cn(
                          "px-4 py-2 rounded-lg block transition-all duration-200",
                          isActiveLink(link.href)
                            ? "bg-white/20 font-medium"
                            : "hover:bg-white/10"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default CustomerNavbar;
