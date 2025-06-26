import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type StoreSettings = {
  storeType: string;
  storeUrl: string;
  apiKey: string;
  apiSecret: string;
  autoFetch: boolean;
  autoCreate: boolean;
  autoNotify: boolean;
  defaultShippingMode: "surface" | "air";
  shopifyStore?: string;
  shopifyConnected?: boolean;
};

const STORE_TYPES = [
  { value: "amazon", label: "Amazon" },
  { value: "shopify", label: "Shopify" },
  { value: "flipkart", label: "Flipkart" },
  { value: "meesho", label: "Meesho" },
  { value: "myntra", label: "Myntra" },
  { value: "ajio", label: "AJIO" },
  { value: "nykaa", label: "Nykaa" },
  { value: "custom", label: "Custom Store" },
];

// Shopify environment variables
const SHOPIFY_CLIENT_ID = import.meta.env.VITE_SHOPIFY_CLIENT_ID || "YOUR_SHOPIFY_API_KEY";
const SHOPIFY_REDIRECT_URI = `${import.meta.env.VITE_BACKEND_URL || "https://017a-2409-40e1-314b-2d84-7c9b-18f0-fa52-731d.ngrok-free.app"}/api/v2/seller/shopify/callback`;

const ManageStorePage = () => {
  const { profile, updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeType: "",
    storeUrl: "",
    apiKey: "",
    apiSecret: "",
    autoFetch: false,
    autoCreate: false,
    autoNotify: false,
    defaultShippingMode: "surface",
    shopifyStore: "",
    shopifyConnected: false
  });

  useEffect(() => {
    if (profile) {
      // Initialize store settings from profile
      setStoreSettings(prev => ({
        ...prev,
        storeType: profile.storeLinks?.amazon ? "amazon" :
          profile.storeLinks?.shopify ? "shopify" :
            profile.storeLinks?.opencart ? "opencart" : "custom",
        storeUrl: profile.storeLinks?.website || "",
        shopifyStore: profile.storeLinks?.shopify || "",
        shopifyConnected: !!profile.storeLinks?.shopify
      }));

      // Fetch Shopify integration status if store type is shopify
      if (profile.storeLinks?.shopify) {
        fetchShopifyStatus();
      }
    }
  }, [profile]);

  useEffect(() => {
    // Check for Shopify connection success parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('shopify') === 'connected') {
      toast.success('Shopify store connected successfully!');
      fetchShopifyStatus();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchShopifyStatus = async () => {
    try {
      const response = await fetch('/api/v2/seller/shopify/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStoreSettings(prev => ({
          ...prev,
          shopifyConnected: data.data?.isActive || false
        }));
      }
    } catch (error) {
      console.error('Failed to fetch Shopify status:', error);
    }
  };

  const validateShopifyStore = (storeDomain: string) => {
    if (!storeDomain) return false;

    // Remove protocol if present
    const cleanDomain = storeDomain.replace(/^https?:\/\//, '');

    // Check if it ends with .myshopify.com
    if (!cleanDomain.endsWith('.myshopify.com')) {
      return false;
    }

    // Check if it's not just .myshopify.com
    if (cleanDomain === '.myshopify.com') {
      return false;
    }

    return true;
  };

    const handleShopifyConnect = () => {
    if (storeSettings.storeType !== 'shopify') {
      toast.error('Please select Shopify as store type');
      return;
    }

    if (!storeSettings.shopifyStore) {
      toast.error('Please enter your Shopify store domain');
      return;
    }

    if (!validateShopifyStore(storeSettings.shopifyStore)) {
      toast.error('Please enter a valid Shopify store domain (e.g., mystore.myshopify.com)');
      return;
    }

    // Clean the domain
    const cleanDomain = storeSettings.shopifyStore.replace(/^https?:\/\//, '');

    // Construct OAuth URL
    const oauthUrl = `https://${cleanDomain}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=read_orders&redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}`;

    // Open Shopify OAuth in new tab
    window.open(oauthUrl, '_blank');
  };

  const handleShopifyDisconnect = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/v2/seller/shopify/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setStoreSettings(prev => ({
          ...prev,
          shopifyConnected: false
        }));
        toast.success('Shopify store disconnected successfully');
      } else {
        toast.error('Failed to disconnect Shopify store');
      }
    } catch (error) {
      toast.error('Failed to disconnect Shopify store');
      console.error('Disconnect error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Special validation for Shopify
      if (storeSettings.storeType === 'shopify') {
        if (!storeSettings.shopifyStore) {
          toast.error('Please enter your Shopify store domain');
          return;
        }

        if (!validateShopifyStore(storeSettings.shopifyStore)) {
          toast.error('Please enter a valid Shopify store domain (e.g., mystore.myshopify.com)');
          return;
        }
      }

      // Update store links based on store type
      const storeLinks = {
        ...profile?.storeLinks,
        website: storeSettings.storeUrl,
        [storeSettings.storeType]: storeSettings.storeType === 'shopify' ? storeSettings.shopifyStore : storeSettings.storeUrl
      };

      // Update profile with new store settings
      await updateProfile({
        storeLinks,
        settings: {
          autoFetch: storeSettings.autoFetch,
          autoCreate: storeSettings.autoCreate,
          autoNotify: storeSettings.autoNotify,
          defaultShippingMode: storeSettings.defaultShippingMode
        }
      });

      toast.success("Store settings saved successfully");
    } catch (error) {
      toast.error("Failed to save store settings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold">
          Manage Store
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your store settings and integrate with ecommerce platforms
        </p>
      </div>

      <div className="grid gap-6">
        {/* Store Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Store Integration</CardTitle>
            <CardDescription>
              Connect your ecommerce store to automatically fetch orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Store Type</Label>
                  <Select
                    value={storeSettings.storeType}
                    onValueChange={(value) => setStoreSettings(prev => ({ ...prev, storeType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shopify specific fields */}
                {storeSettings.storeType === 'shopify' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                    <div className="space-y-2">
                      <Label>Shopify Store Domain</Label>
                      <Input
                        placeholder="mystore.myshopify.com"
                        value={storeSettings.shopifyStore}
                        onChange={(e) => setStoreSettings(prev => ({ ...prev, shopifyStore: e.target.value }))}
                      />
                      <p className="text-sm text-gray-500">
                        Enter your Shopify store domain (e.g., mystore.myshopify.com)
                      </p>
                    </div>

                    {storeSettings.shopifyConnected ? (
                      <div className="flex items-center justify-between p-3 bg-green-100 rounded-md">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-green-700 font-medium">Store Connected</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={handleShopifyConnect}>
                            Reconnect
                          </Button>
                          <Button variant="destructive" size="sm" onClick={handleShopifyDisconnect}>
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={handleShopifyConnect}
                        className="w-full"
                        variant="default"
                      >
                        Connect Shopify Store
                      </Button>
                    )}
                  </div>
                )}

                {/* Regular store URL for non-Shopify stores */}
                {storeSettings.storeType !== 'shopify' && (
                  <div className="space-y-2">
                    <Label>Store URL</Label>
                    <Input
                      placeholder="Enter your store URL"
                      value={storeSettings.storeUrl}
                      onChange={(e) => setStoreSettings(prev => ({ ...prev, storeUrl: e.target.value }))}
                    />
                  </div>
                )}

                {/* API fields for non-Shopify stores */}
                {storeSettings.storeType !== 'shopify' && (
                  <>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        placeholder="Enter your API key"
                        value={storeSettings.apiKey}
                        onChange={(e) => setStoreSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Secret</Label>
                      <Input
                        type="password"
                        placeholder="Enter your API secret"
                        value={storeSettings.apiSecret}
                        onChange={(e) => setStoreSettings(prev => ({ ...prev, apiSecret: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-fetch"
                  checked={storeSettings.autoFetch}
                  onCheckedChange={(checked) => setStoreSettings(prev => ({ ...prev, autoFetch: checked }))}
                />
                <Label htmlFor="auto-fetch">
                  Automatically fetch orders
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Order Settings</CardTitle>
            <CardDescription>
              Configure how orders are processed and managed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-create"
                  checked={storeSettings.autoCreate}
                  onCheckedChange={(checked) => setStoreSettings(prev => ({ ...prev, autoCreate: checked }))}
                />
                <Label htmlFor="auto-create">
                  Automatically create shipping orders
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-notify"
                  checked={storeSettings.autoNotify}
                  onCheckedChange={(checked) => setStoreSettings(prev => ({ ...prev, autoNotify: checked }))}
                />
                <Label htmlFor="auto-notify">
                  Send automatic notifications to customers
                </Label>
              </div>
              <div className="space-y-2">
                <Label>Default Shipping Mode</Label>
                <Select
                  value={storeSettings.defaultShippingMode}
                  onValueChange={(value: "surface" | "air") => setStoreSettings(prev => ({ ...prev, defaultShippingMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipping mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="surface">Surface Delivery</SelectItem>
                    <SelectItem value="air">Air Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManageStorePage;
