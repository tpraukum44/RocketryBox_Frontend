import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangleIcon, ClipboardListIcon, HeartHandshakeIcon, LayoutDashboard, MessageSquare, PackageIcon, SettingsIcon, TruckIcon, UsersIcon, WalletIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Icons from "../shared/icons";

interface SidebarLink {
    icon: any;
    to: string;
    label: string;
    permission: keyof AdminPermissions;
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

const SIDEBAR_LINKS: SidebarLink[] = [
    {
        icon: LayoutDashboard,
        to: "/admin/dashboard",
        label: "Dashboard",
        permission: "dashboardAccess",
    },
    {
        icon: UsersIcon,
        to: "/admin/dashboard/users",
        label: "Users",
        permission: "usersAccess",
    },
    {
        icon: Icons.team,
        to: "/admin/dashboard/teams",
        label: "Teams",
        permission: "teamsAccess",
    },
    {
        icon: HeartHandshakeIcon,
        to: "/admin/dashboard/partners",
        label: "Partners",
        permission: "partnersAccess",
    },
    {
        icon: PackageIcon,
        to: "/admin/dashboard/orders",
        label: "Orders",
        permission: "ordersAccess",
    },
    {
        icon: TruckIcon,
        to: "/admin/dashboard/shipments",
        label: "Shipments",
        permission: "shipmentsAccess",
    },
    {
        icon: MessageSquare,
        to: "/admin/dashboard/tickets",
        label: "Tickets",
        permission: "ticketsAccess",
    },
    {
        icon: AlertCircle,
        to: "/admin/dashboard/ndr",
        label: "NDR",
        permission: "ndrAccess",
    },
    {
        icon: WalletIcon,
        to: "/admin/dashboard/billing",
        label: "Billing",
        permission: "billingAccess",
    },
    {
        icon: ClipboardListIcon,
        to: "/admin/dashboard/reports",
        label: "Reports",
        permission: "reportsAccess",
    },
    {
        icon: AlertTriangleIcon,
        to: "/admin/dashboard/escalation",
        label: "Escalation",
        permission: "escalationAccess",
    },
    {
        icon: SettingsIcon,
        to: "/admin/dashboard/settings",
        label: "Settings",
        permission: "settingsAccess",
    },
];

const AdminDashboardSidebar = () => {
    const { pathname } = useLocation();
    const isExpanded = useSidebarStore((state) => state.isExpanded);
    const { hasPermission, isSuperAdmin, loading } = useAdminPermissions();

    // Filter sidebar links based on permissions
    const visibleLinks = SIDEBAR_LINKS.filter(link => {
        // Super Admin can see everything
        if (isSuperAdmin()) {
            return true;
        }

        // Check if user has specific permission
        return hasPermission(link.permission);
    });

    // Show loading state
    if (loading) {
        return (
            <aside className={cn(
                "fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r transition-all duration-300 z-40",
                isExpanded ? "w-64" : "w-16",
                "lg:sticky lg:top-16"
            )}>
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
            </aside>
        );
    }

    return (
        <aside className={cn(
            "fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r transition-all duration-300 z-40",
            isExpanded ? "w-64" : "w-16",
            "lg:sticky lg:top-16"
        )}>
            <div className={cn(
                "flex flex-col items-start px-2 pt-4 space-y-1",
                isExpanded && "min-w-[256px]"
            )}>
                <TooltipProvider delayDuration={0}>
                    {/* Sidebar Links */}
                    {visibleLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.to || pathname.startsWith(link.to + '/');

                        return (
                            <div key={link.label} className="w-full mx-auto">
                                {!isExpanded ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                to={link.to}
                                                className={cn(
                                                    "group relative flex items-center justify-center size-10 rounded-lg hover:bg-main/10 mx-auto",
                                                    isActive && "bg-main/10"
                                                )}
                                            >
                                                <Icon className={cn(
                                                    "h-5 w-5 text-muted-foreground group-hover:text-main",
                                                    isActive && "text-main"
                                                )} />
                                                <span className="sr-only">{link.label}</span>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            {link.label}
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Link
                                        to={link.to}
                                        className={cn(
                                            "group relative flex items-center px-3 h-10 w-full rounded-lg hover:bg-main/10",
                                            isActive && "bg-main/10"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "h-5 w-5 text-muted-foreground group-hover:text-main",
                                            isActive && "text-main"
                                        )} />
                                        <AnimatePresence>
                                            <motion.span
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className={cn(
                                                    "ml-3 text-sm text-muted-foreground group-hover:text-main",
                                                    isActive && "text-main"
                                                )}
                                            >
                                                {link.label}
                                            </motion.span>
                                        </AnimatePresence>
                                    </Link>
                                )}
                            </div>
                        );
                    })}

                    {/* Show permission info if expanded and not super admin */}
                    {isExpanded && !isSuperAdmin() && (
                        <div className="mt-6 px-3 py-2 bg-gray-50 rounded-lg w-full">
                            <p className="text-xs text-gray-600 font-medium mb-1">Access Level</p>
                            <p className="text-xs text-gray-500">
                                {visibleLinks.length} of {SIDEBAR_LINKS.length} sections available
                            </p>
                        </div>
                    )}
                </TooltipProvider>
            </div>
        </aside>
    );
};

export default AdminDashboardSidebar;
