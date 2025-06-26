import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sellerAuthService } from "@/services/seller-auth.service";
import {
    LogOutIcon,
    MessageSquareTextIcon,
    ReceiptTextIcon,
    StoreIcon,
    TerminalIcon,
    TruckIcon,
    UserCogIcon,
    WrenchIcon,
    X
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SETTINGS_CARDS = [
    {
        title: "MANAGE STORE",
        description: "EASILY MANAGE YOUR STORES BY CONFIGURING THEM TO AUTOMATICALLY FETCH ORDERS FROM YOUR ECOMMERCE PLATFORM TO THE ROCKETRYBOX",
        image: "/images/settings/manage-store.png",
        buttonText: "MANAGE STORE",
        icon: StoreIcon,
        path: "/seller/dashboard/settings/manage-store"
    },
    {
        title: "COURIERS SETTINGS",
        description: "YOU CAN EASILY MANAGE COURIER SETTINGS, ENABLING OR DISABLING COURIERS & MODES, ALSO SET COURIER PRIORITY FOR SEAMLESS DELIVERIES",
        image: "/images/settings/courier-settings.png",
        buttonText: "COURIERS SETTINGS",
        icon: TruckIcon,
        path: "/seller/dashboard/settings/couriers"
    },
    {
        title: "LABEL SETTING",
        description: "YOU CAN CUSTOMIZE LABEL SETTINGS, LOGO, SIZE, FORMAT, AND ESSENTIAL SHIPPING INFORMATION FOR STREAMLINED AND BRANDED SHIPMENTS",
        image: "/images/settings/label-settings.png",
        buttonText: "LABEL SETTING",
        icon: ReceiptTextIcon,
        path: "/seller/dashboard/settings/labels"
    },
    {
        title: "MANAGE USER",
        description: "SELLERS CAN ADD NEW USERS, MANAGE USER ACCESS LEVELS, RESET PASSWORDS, AND CONFIGURE PERMISSIONS FOR TEAM COLLABORATION",
        image: "/images/settings/manage-user.jpeg",
        buttonText: "MANAGE USER",
        icon: UserCogIcon,
        path: "/seller/dashboard/settings/users"
    },
    {
        title: "WHATSAPP SETTING",
        description: "EASILY ENABLE WHATSAPP MESSAGING FOR ORDER CONFIRMATIONS, PACKED NOTIFICATIONS, OUT-FOR-DELIVERY UPDATES, AND DELIVERY CONFIRMATIONS TO ENHANCE CUSTOMER COMMUNICATION",
        image: "/images/settings/whatsapp-settings.jpeg",
        buttonText: "WHATSAPP SETTING",
        icon: MessageSquareTextIcon,
        path: "/seller/dashboard/settings/whatsapp"
    },
    {
        title: "API SETTING",
        description: "CONFIGURE YOUR API SETTINGS TO SEAMLESSLY INTEGRATE YOUR ECOMMERCE PLATFORM WITH ROCKETRY BOX FOR AUTOMATED SHIPPING, TRACKING, AND ORDER MANAGEMENT",
        image: "/images/settings/api-settings.png",
        buttonText: "API SETTING",
        icon: TerminalIcon,
        path: "/seller/dashboard/settings/api"
    },
];

const SellerSettingsPage = () => {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
    const [maintenanceFeature, setMaintenanceFeature] = useState("");

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await sellerAuthService.logout();
            toast.success("Logged out successfully");
            // Note: Navigation will be handled by AuthProvider after logout event
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Failed to logout. Please try again.");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleCardClick = (card: typeof SETTINGS_CARDS[0]) => {
        if (card.title === "MANAGE USER") {
            setMaintenanceFeature("Manage User");
            setShowMaintenanceDialog(true);
        } else if (card.title === "API SETTING") {
            setMaintenanceFeature("API Setting");
            setShowMaintenanceDialog(true);
        } else {
            navigate(card.path);
        }
    };

    return (
        <div className="w-full space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-xl lg:text-2xl font-semibold">
                    Settings
                </h1>

                <Button
                    variant="outline"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
                >
                    <LogOutIcon className="w-4 h-4 mr-2" />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {SETTINGS_CARDS.map((card) => (
                    <div
                        key={card.title}
                        className="relative bg-[#BCDDFF] rounded-xl lg:rounded-2xl overflow-hidden"
                    >
                        {/* Image */}
                        <div className="w-full h-48 relative p-4">
                            <img
                                src={card.image}
                                alt={card.title}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            {/* Store Icon */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                                <div className="bg-white p-3 rounded-lg shadow-lg">
                                    <div className="size-6 bg-white rounded-lg flex items-center justify-center">
                                       <card.icon className="size-4 lg:size-6" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 pt-6 flex flex-col items-center text-center">
                            <Button
                                variant="purple"
                                className="mb-4"
                                onClick={() => handleCardClick(card)}
                            >
                                {card.buttonText}
                            </Button>
                            <p className="text-xs text-gray-600 font-medium">
                                {card.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Maintenance Dialog */}
            <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
                <DialogContent className="max-w-md" showCloseButton={false}>
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <DialogTitle className="flex items-center gap-2 text-orange-600">
                                <WrenchIcon className="h-5 w-5" />
                                Under Maintenance
                            </DialogTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMaintenanceDialog(false)}
                                className="h-6 w-6"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <DialogDescription className="text-center space-y-4 pt-4">
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <WrenchIcon className="h-8 w-8 text-orange-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                                    Feature Under Maintenance
                                </h3>
                                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                    The "{maintenanceFeature}" feature is currently under maintenance and will be available soon.
                                </p>
                                <p className="text-sm text-gray-600">
                                    For any assistance, please contact the{" "}
                                    <span className="font-semibold text-orange-600">RocketryBox team</span>.
                                </p>
                            </div>
                            <Button
                                onClick={() => setShowMaintenanceDialog(false)}
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                            >
                                Understood
                            </Button>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SellerSettingsPage;
