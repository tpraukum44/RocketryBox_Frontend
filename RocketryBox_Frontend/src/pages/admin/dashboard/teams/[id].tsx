import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ServiceFactory } from "@/services/service-factory";
import {
    AlertCircle,
    Briefcase,
    Building,
    Calendar,
    ClipboardList,
    CreditCard,
    Eye,
    FileText,
    IdCard,
    Loader2,
    Mail,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Save,
    ShieldCheck,
    UploadCloud,
    User2,
    UserCog
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

// Helper function to check if current logged-in user is Super Admin
const getCurrentUser = (): { isSuperAdmin: boolean; role: string; name: string } => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        isSuperAdmin: user.isSuperAdmin === true,
        role: user.role || '',
        name: user.name || user.fullName || ''
      };
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  return { isSuperAdmin: false, role: '', name: '' };
};

// Helper function to convert relative URLs to absolute URLs
const getAbsoluteImageUrl = (imageUrl: string | undefined): string | undefined => {
  if (!imageUrl) return undefined;

  // If already absolute URL, return as-is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // Convert relative URL to absolute
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const absoluteUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;

  console.log('🔗 Converting relative URL to absolute:', {
    originalUrl: imageUrl,
    baseUrl,
    absoluteUrl
  });

  return absoluteUrl;
};

// Define interface for orders
interface Order {
  id: string;
  date: string;
  status: string;
  amount: string;
}

// Define user data interface
interface AdminUser {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive" | "On Leave";
  joinDate: string;
  lastActive: string;
  role: "Admin" | "Manager" | "Support" | "Agent";
  isSuperAdmin: boolean;
  remarks: string;
  profileImage?: string;
  // Enhanced fields from create form
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  // Financial & Identity Information
  aadharNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  accountHolderName?: string;
  // Document URLs (flattened)
  aadharDocument?: string;
  panDocument?: string;
  bankPassbookDocument?: string;
  // Documents object (nested structure)
  documents?: {
    aadharDocument?: string;
    panDocument?: string;
    bankPassbookDocument?: string;
    idProof?: { name: string; url: string };
    employmentContract?: { name: string; url: string };
  };
  // Permissions object
  permissions?: {
    // Core Access
    dashboardAccess?: boolean;

    // Navigation Permissions - All Sidebar Items
    usersAccess?: boolean;
    teamsAccess?: boolean;
    partnersAccess?: boolean;
    ordersAccess?: boolean;
    shipmentsAccess?: boolean;
    ticketsAccess?: boolean;
    ndrAccess?: boolean;
    billingAccess?: boolean;
    reportsAccess?: boolean;
    escalationAccess?: boolean;
    settingsAccess?: boolean;

    // Granular Operation Permissions
    userManagement?: boolean;
    teamManagement?: boolean;
    ordersShipping?: boolean;
    financialOperations?: boolean;
    systemConfig?: boolean;
    sellerManagement?: boolean;
    supportTickets?: boolean;
    reportsAnalytics?: boolean;
    marketingPromotions?: boolean;
  };
  // Legacy fields
  transactions: {
    total: number;
    successful: number;
    failed: number;
  };
  recentOrders: Order[];
}

const AdminTeamProfilePage = () => {
  const { id } = useParams();
  // const navigate = useNavigate(); // Unused

  const [userData, setUserData] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Get current logged-in user permissions
  const currentUser = getCurrentUser();

  const [editData, setEditData] = useState({
    fullName: "",
    employeeId: "",
    email: "",
    phone: "",
    address: "",
    role: "Agent" as "Admin" | "Manager" | "Support" | "Agent",
    status: "Active" as "Active" | "Inactive" | "On Leave",
    remarks: "",
    // Enhanced fields
    department: "",
    designation: "",
    // Financial & Identity Information
    aadharNumber: "",
    panNumber: "",
    bankAccountNumber: "",
    ifscCode: "",
    bankName: "",
    accountHolderName: ""
  });

  const [permissions, setPermissions] = useState({
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
    marketingPromotions: false
  });

  const [permissionsChanged, setPermissionsChanged] = useState(false);

  const [_documents, setDocuments] = useState<{
    aadharDocument?: { name: string; url: string };
    panDocument?: { name: string; url: string };
    bankPassbookDocument?: { name: string; url: string };
  }>({});

  const aadharDocInputRef = useRef<HTMLInputElement>(null);
  const panDocInputRef = useRef<HTMLInputElement>(null);
  const bankPassbookInputRef = useRef<HTMLInputElement>(null);

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.log('❌ No ID provided');
        setError('No team member ID provided');
        setLoading(false);
        return;
      }

      console.log('📡 Fetching data for ID:', id);

      try {
        setLoading(true);
        setError(null);

        const response = await ServiceFactory.admin.getAdminTeamMember(id);
        const data = response.data;

        console.log('🔍 Full API Response for team member:', {
          userId: id,
          responseSuccess: response.success,
          userData: data,
          profileImage: data?.profileImage,
          profileImageType: typeof data?.profileImage,
          hasProfileImage: !!data?.profileImage
        });

        setUserData(data);

        // Initialize edit data
        setEditData({
          fullName: data.fullName,
          employeeId: data.employeeId,
          email: data.email,
          phone: data.phone,
          address: data.address,
          role: data.role,
          status: data.status,
          remarks: data.remarks || "",
          department: data.department || "",
          designation: data.designation || "",
          aadharNumber: data.aadharNumber || "",
          panNumber: data.panNumber || "",
          bankAccountNumber: data.bankAccountNumber || "",
          ifscCode: data.ifscCode || "",
          bankName: data.bankName || "",
          accountHolderName: data.accountHolderName || ""
        });

        // Initialize permissions from actual user data
        const userPermissions = data.permissions || {};
        setPermissions({
          // Core Access
          dashboardAccess: userPermissions.dashboardAccess ?? true, // Default dashboard access

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
          marketingPromotions: userPermissions.marketingPromotions ?? false
        });

        console.log('👤 Loaded user permissions:', userPermissions);
        console.log('🔐 Current user can edit:', currentUser.isSuperAdmin);
      } catch (err) {
        console.error("Error fetching admin user:", err);
        setError("Failed to load admin data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (!currentUser.isSuperAdmin) {
      toast.error("Only Super Admins can edit user profiles");
      return;
    }

    try {
      setSaving(true);

      await ServiceFactory.admin.updateAdminTeamMember(id!, {
        fullName: editData.fullName,
        employeeId: editData.employeeId,
        email: editData.email,
        phone: editData.phone,
        address: editData.address,
        role: editData.role,
        status: editData.status,
        remarks: editData.remarks,
        // Enhanced fields
        department: editData.department,
        designation: editData.designation,
        // Financial & Identity Information
        aadharNumber: editData.aadharNumber,
        panNumber: editData.panNumber,
        bankAccountNumber: editData.bankAccountNumber,
        ifscCode: editData.ifscCode,
        bankName: editData.bankName,
        accountHolderName: editData.accountHolderName
      });

      // Refresh user data
      const response = await ServiceFactory.admin.getAdminTeamMember(id!);
      setUserData(response.data);

      toast.success("Profile updated successfully", {
        description: "All personal and financial information has been saved securely."
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving changes:", err);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    if (!currentUser.isSuperAdmin) {
      toast.error("Only Super Admins can modify user permissions");
      return;
    }

    setPermissions(prev => ({
      ...prev,
      [permission]: value
    }));

    setPermissionsChanged(true);
  };

  const handleSavePermissions = async () => {
    if (!currentUser.isSuperAdmin) {
      toast.error("Only Super Admins can save permission changes");
      return;
    }

    try {
      setSaving(true);

      await ServiceFactory.admin.updateAdminTeamMemberPermissions(id!, permissions);

      toast.success("Permissions updated successfully");
      setPermissionsChanged(false);
    } catch (err) {
      console.error("Error saving permissions:", err);
      toast.error("Failed to update permissions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = (docType: 'aadharDocument' | 'panDocument' | 'bankPassbookDocument') => {
    if (docType === "aadharDocument") aadharDocInputRef.current?.click();
    if (docType === "panDocument") panDocInputRef.current?.click();
    if (docType === "bankPassbookDocument") bankPassbookInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'aadharDocument' | 'panDocument' | 'bankPassbookDocument') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', docType);

        const response = await ServiceFactory.admin.uploadAdminTeamMemberDocument(id!, formData);

        setDocuments((prev) => ({
          ...prev,
          [docType]: { name: file.name, url: response.data.url },
        }));

        toast.success("Document uploaded successfully");
      } catch (err) {
        console.error("Error uploading document:", err);
        toast.error("Failed to upload document. Please try again.");
      }
    }
  };

  const handleViewDocument = (docType: 'aadharDocument' | 'panDocument' | 'bankPassbookDocument') => {
    if (!userData) {
      toast.error("User data not available");
      return;
    }

    // Check for document URL in flattened structure first, then nested structure
    let documentUrl: string | undefined = userData[docType] || userData.documents?.[docType];

    // If it's an object with url property (legacy structure)
    if (typeof documentUrl === 'object' && documentUrl && 'url' in documentUrl) {
      documentUrl = (documentUrl as { url: string }).url;
    }

    if (documentUrl && typeof documentUrl === 'string') {
      // Handle relative URLs by making them absolute
      if (documentUrl.startsWith('/')) {
        documentUrl = `${window.location.origin}${documentUrl}`;
      }
      window.open(documentUrl, "_blank");
    } else {
      toast.error("Document not available");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
          <p className="text-lg text-muted-foreground">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Profile</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-lg text-muted-foreground">No admin user data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold">
            Admin Profile
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground mt-1">
            View and manage administrator details
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => toast.success("Password reset link sent to admin's email")}
            disabled={saving}
          >
            Reset Password
          </Button>
          {currentUser.isSuperAdmin && (
            <Button
              variant="purple"
              onClick={() => setIsEditing(true)}
              disabled={saving}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
          {isEditing && (
            <Button
              variant="purple"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <Card className="shadow-none overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
        <CardContent className="p-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="h-24 w-24 rounded-full bg-white p-1 shadow-md">
              {userData.profileImage && getAbsoluteImageUrl(userData.profileImage) ? (
                <img
                  src={getAbsoluteImageUrl(userData.profileImage)}
                  alt={userData.fullName}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    console.error('❌ Profile image failed to load:', {
                      imageUrl: userData.profileImage,
                      absoluteUrl: getAbsoluteImageUrl(userData.profileImage),
                      userName: userData.fullName,
                      errorEvent: e
                    });

                    // Hide the image on error and show fallback
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'flex';
                    }
                  }}
                  onLoad={() => {
                    console.log('✅ Profile image loaded successfully:', {
                      imageUrl: userData.profileImage,
                      absoluteUrl: getAbsoluteImageUrl(userData.profileImage),
                      userName: userData.fullName
                    });
                  }}
                />
              ) : (
                <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm text-gray-500">No Image</span>
                </div>
              )}
              <div
                className="h-full w-full rounded-full bg-purple-100 flex items-center justify-center"
                style={{ display: (userData.profileImage && getAbsoluteImageUrl(userData.profileImage)) ? 'none' : 'flex' }}
              >
                <span className="text-2xl font-semibold text-purple-600">
                  {userData.fullName.charAt(0)}
                </span>
              </div>
            </div>
            <div className="space-y-2 mt-4 sm:mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="text-2xl font-semibold">
                  {isEditing ? (
                    <Input
                      value={editData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-64 font-semibold"
                    />
                  ) : (
                    userData.fullName
                  )}
                </h2>
                <div className="flex gap-2">
                  {isEditing ? (
                    <Select
                      value={editData.status}
                      onValueChange={(value) => handleInputChange('status', value as "Active" | "Inactive" | "On Leave")}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={userData.status === "Active" ? "secondary" : "outline"}>
                      {userData.status}
                    </Badge>
                  )}
                  {userData.isSuperAdmin && (
                    <Badge variant="default" className="bg-purple-600">
                      Super Admin
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {isEditing ? (
                    <Input
                      value={editData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-64 text-sm h-8"
                    />
                  ) : (
                    userData.email
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {isEditing ? (
                    <Input
                      value={editData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-64 text-sm h-8"
                    />
                  ) : (
                    userData.phone
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4" />
                  {isEditing ? (
                    <Input
                      value={editData.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      className="w-64 text-sm h-8"
                    />
                  ) : (
                    userData.employeeId
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">
            <User2 className="w-4 h-4 mr-2" />
            Personal Details
          </TabsTrigger>
          <TabsTrigger value="role">
            <UserCog className="w-4 h-4 mr-2" />
            Role & Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User2 className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Full Name
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      userData.fullName
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Employee ID
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.employeeId}
                        onChange={(e) => handleInputChange('employeeId', e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      userData.employeeId
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Email Address
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      userData.email
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Phone Number
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      userData.phone
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Department
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      userData.department || 'Not specified'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Designation
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        className="w-full"
                      />
                    ) : (
                      userData.designation || 'Not specified'
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">
                    Address
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Textarea
                        value={editData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full"
                        rows={2}
                      />
                    ) : (
                      userData.address
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Join Date
                  </label>
                  <div className="flex items-center gap-2 mt-1 font-medium">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    {userData.dateOfJoining || userData.joinDate} {/* Join date is not editable */}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Last Active
                  </label>
                  <div className="flex items-center gap-2 mt-1 font-medium">
                    <Calendar className="w-4 h-4 text-green-600" />
                    {userData.lastActive} {/* Last active is not editable */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial & Identity Information Card */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="w-5 h-5" />
                Financial & Identity Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Aadhar Number
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.aadharNumber}
                        onChange={(e) => handleInputChange('aadharNumber', e.target.value)}
                        className="w-full"
                        placeholder="Enter 12-digit Aadhar number"
                        maxLength={12}
                      />
                    ) : (
                      userData.aadharNumber ? `**** **** ${userData.aadharNumber.slice(-4)}` : 'Not provided'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    PAN Number
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.panNumber}
                        onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                        className="w-full"
                        placeholder="Enter PAN number"
                        maxLength={10}
                      />
                    ) : (
                      userData.panNumber || 'Not provided'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Bank Account Number
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.bankAccountNumber}
                        onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                        className="w-full"
                        placeholder="Enter bank account number"
                      />
                    ) : (
                      userData.bankAccountNumber ? `****${userData.bankAccountNumber.slice(-4)}` : 'Not provided'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    IFSC Code
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.ifscCode}
                        onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                        className="w-full"
                        placeholder="Enter IFSC code"
                        maxLength={11}
                      />
                    ) : (
                      userData.ifscCode || 'Not provided'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Bank Name
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.bankName}
                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                        className="w-full"
                        placeholder="Enter bank name"
                      />
                    ) : (
                      userData.bankName || 'Not provided'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Account Holder Name
                  </label>
                  <div className="font-medium mt-1">
                    {isEditing ? (
                      <Input
                        value={editData.accountHolderName}
                        onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                        className="w-full"
                        placeholder="Enter account holder name"
                      />
                    ) : (
                      userData.accountHolderName || userData.fullName
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Financial information is encrypted and securely stored. Only authorized personnel can view complete details.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Identity & Financial Documents
              </CardTitle>
              {userData.isSuperAdmin && (
                <Button variant="outline" size="sm" className="text-xs h-8">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Document
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Aadhar Card Document */}
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-100 p-2 rounded-md">
                      <IdCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Aadhar Card</h3>
                      <p className="text-xs text-muted-foreground">Identity Proof</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-8 w-full" onClick={() => handleViewDocument('aadharDocument')} disabled={!userData.aadharDocument && !userData.documents?.aadharDocument}>
                      <Eye className="h-3 w-3 mr-1" />
                      {(userData.aadharDocument || userData.documents?.aadharDocument) ? 'View Document' : 'Not Uploaded'}
                    </Button>
                    {currentUser.isSuperAdmin && (
                      <>
                        <input
                          type="file"
                          ref={aadharDocInputRef}
                          style={{ display: "none" }}
                          onChange={(e) => handleFileChange(e, "aadharDocument")}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => handleUploadClick("aadharDocument")}
                        >
                          <UploadCloud className="h-3 w-3 mr-1" />
                          Upload/Update
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* PAN Card Document */}
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-100 p-2 rounded-md">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">PAN Card</h3>
                      <p className="text-xs text-muted-foreground">Tax Identity</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-8 w-full" onClick={() => handleViewDocument('panDocument')} disabled={!userData.panDocument && !userData.documents?.panDocument}>
                      <Eye className="h-3 w-3 mr-1" />
                      {(userData.panDocument || userData.documents?.panDocument) ? 'View Document' : 'Not Uploaded'}
                    </Button>
                    {currentUser.isSuperAdmin && (
                      <>
                        <input
                          type="file"
                          ref={panDocInputRef}
                          style={{ display: "none" }}
                          onChange={(e) => handleFileChange(e, "panDocument")}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => handleUploadClick("panDocument")}
                        >
                          <UploadCloud className="h-3 w-3 mr-1" />
                          Upload/Update
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bank Passbook Document */}
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-yellow-100 p-2 rounded-md">
                      <Building className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Bank Passbook</h3>
                      <p className="text-xs text-muted-foreground">Account Proof</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-8 w-full" onClick={() => handleViewDocument('bankPassbookDocument')} disabled={!userData.bankPassbookDocument && !userData.documents?.bankPassbookDocument}>
                      <Eye className="h-3 w-3 mr-1" />
                      {(userData.bankPassbookDocument || userData.documents?.bankPassbookDocument) ? 'View Document' : 'Not Uploaded'}
                    </Button>
                    {currentUser.isSuperAdmin && (
                      <>
                        <input
                          type="file"
                          ref={bankPassbookInputRef}
                          style={{ display: "none" }}
                          onChange={(e) => handleFileChange(e, "bankPassbookDocument")}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => handleUploadClick("bankPassbookDocument")}
                        >
                          <UploadCloud className="h-3 w-3 mr-1" />
                          Upload/Update
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload prompt only shown when in edit mode */}
              {currentUser.isSuperAdmin && isEditing && (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-md bg-gray-50 mt-6">
                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="font-medium">Upload Documents</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1 mb-4">
                    Click on individual upload buttons above to add documents
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Supported formats: PDF, JPG, PNG (Max: 5MB each)
                  </p>
                </div>
              )}

              {!isEditing && (
                <div className="text-sm text-muted-foreground mt-4 p-3 bg-blue-50 rounded-md">
                  <p>
                    <strong>Document Security:</strong> All documents are encrypted and stored securely. Only authorized Super Admins can view or update documents. Edit profile to manage document uploads.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Account Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Bank Name
                  </label>
                  <div className="font-medium mt-1">
                    {userData.bankName || 'Not provided'}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Account Holder Name
                  </label>
                  <div className="font-medium mt-1">
                    {userData.accountHolderName || userData.fullName}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Account Number
                  </label>
                  <div className="font-medium mt-1 flex items-center gap-2">
                    <span>
                      {userData.bankAccountNumber ? `****${userData.bankAccountNumber.slice(-4)}` : 'Not provided'}
                    </span>
                    {currentUser.isSuperAdmin && userData.bankAccountNumber && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-purple-600">
                        <Eye className="h-3 w-3 mr-1" />
                        View Full
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    IFSC Code
                  </label>
                  <div className="font-medium mt-1">
                    {userData.ifscCode || 'Not provided'}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Account Type
                  </label>
                  <div className="font-medium mt-1">
                    Salary Account
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Verification Status
                  </label>
                  <div className="font-medium mt-1 flex items-center gap-2">
                    {userData.bankAccountNumber && userData.ifscCode ? (
                      <>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                        <Building className="w-4 h-4 text-green-600" />
                      </>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending Verification
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Security Note:</strong> Account details are masked for security. Complete information is available in the Financial & Identity section above for authorized personnel.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Remarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="w-full"
                  rows={3}
                  placeholder="Add any remarks about this admin user"
                />
              ) : (
                <p>{userData.remarks || "No remarks available."}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role" className="space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Role Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Role
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditing ? (
                      <Select
                        value={editData.role}
                        onValueChange={(value) => handleInputChange('role', value as "Admin" | "Manager" | "Support" | "Agent")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                          <SelectItem value="Agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className="font-medium">
                        {userData.role}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Admin Status
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditing ? (
                      <Select
                        value={editData.status}
                        onValueChange={(value) => handleInputChange('status', value as "Active" | "Inactive" | "On Leave")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="On Leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={userData.status === "Active" ? "secondary" : "outline"}>
                        {userData.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Admin Type
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {userData.isSuperAdmin ? (
                      <Badge className="bg-purple-600">Super Admin</Badge>
                    ) : (
                      <Badge variant="outline">Regular Admin</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Access & Permissions
              </CardTitle>
              <div className="flex items-center gap-2">
                {currentUser.isSuperAdmin ? (
                  <p className="text-sm text-muted-foreground">Toggle switches to update permissions</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Read Only</Badge>
                    <p className="text-sm text-muted-foreground">Super Admin access required to modify</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Core Access Section */}
                <div className="border-b pb-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Access</h3>

                  {/* Dashboard Access */}
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <h4 className="font-medium">Dashboard Access</h4>
                      <p className="text-sm text-muted-foreground">View analytics and performance reports</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={permissions.dashboardAccess}
                        onCheckedChange={(value) => handlePermissionChange('dashboardAccess', value)}
                        disabled={!currentUser.isSuperAdmin}
                        className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                      />
                      {!currentUser.isSuperAdmin && (
                        <Badge variant={permissions.dashboardAccess ? "secondary" : "outline"} className="text-xs">
                          {permissions.dashboardAccess ? "Granted" : "Restricted"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation Permissions Section */}
                <div className="border-b pb-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Navigation Access</h3>
                  <p className="text-sm text-muted-foreground mb-4">Control which menu items appear in the admin dashboard sidebar</p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Users Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Users</h4>
                        <p className="text-sm text-muted-foreground">Access Users management page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.usersAccess}
                          onCheckedChange={(value) => handlePermissionChange('usersAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.usersAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.usersAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Teams Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Teams</h4>
                        <p className="text-sm text-muted-foreground">Access Teams management page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.teamsAccess}
                          onCheckedChange={(value) => handlePermissionChange('teamsAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.teamsAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.teamsAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Partners Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Partners</h4>
                        <p className="text-sm text-muted-foreground">Access Partners management page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.partnersAccess}
                          onCheckedChange={(value) => handlePermissionChange('partnersAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.partnersAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.partnersAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Orders Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Orders</h4>
                        <p className="text-sm text-muted-foreground">Access Orders management page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.ordersAccess}
                          onCheckedChange={(value) => handlePermissionChange('ordersAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.ordersAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.ordersAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Shipments Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Shipments</h4>
                        <p className="text-sm text-muted-foreground">Access Shipments tracking page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.shipmentsAccess}
                          onCheckedChange={(value) => handlePermissionChange('shipmentsAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.shipmentsAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.shipmentsAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Tickets Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Tickets</h4>
                        <p className="text-sm text-muted-foreground">Access Support tickets page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.ticketsAccess}
                          onCheckedChange={(value) => handlePermissionChange('ticketsAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.ticketsAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.ticketsAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* NDR Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">NDR</h4>
                        <p className="text-sm text-muted-foreground">Access Non-Delivery Reports page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.ndrAccess}
                          onCheckedChange={(value) => handlePermissionChange('ndrAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.ndrAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.ndrAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Billing Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Billing</h4>
                        <p className="text-sm text-muted-foreground">Access Billing and payments page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.billingAccess}
                          onCheckedChange={(value) => handlePermissionChange('billingAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.billingAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.billingAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Reports Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Reports</h4>
                        <p className="text-sm text-muted-foreground">Access Reports and analytics page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.reportsAccess}
                          onCheckedChange={(value) => handlePermissionChange('reportsAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.reportsAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.reportsAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Escalation Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Escalation</h4>
                        <p className="text-sm text-muted-foreground">Access Escalation management page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.escalationAccess}
                          onCheckedChange={(value) => handlePermissionChange('escalationAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.escalationAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.escalationAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Settings Access */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Settings</h4>
                        <p className="text-sm text-muted-foreground">Access System settings page</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.settingsAccess}
                          onCheckedChange={(value) => handlePermissionChange('settingsAccess', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.settingsAccess ? "secondary" : "outline"} className="text-xs">
                            {permissions.settingsAccess ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Operations Section */}
                <div className="border-b pb-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Advanced Operations</h3>
                  <p className="text-sm text-muted-foreground mb-4">Control advanced operational permissions within accessed pages</p>

                  <div className="space-y-4">
                    {/* User Management */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">User Management</h4>
                        <p className="text-sm text-muted-foreground">Create, edit, and manage customer accounts</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.userManagement}
                          onCheckedChange={(value) => handlePermissionChange('userManagement', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.userManagement ? "secondary" : "outline"} className="text-xs">
                            {permissions.userManagement ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Team Management */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Team Management</h4>
                        <p className="text-sm text-muted-foreground">Add, edit and remove team members</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.teamManagement}
                          onCheckedChange={(value) => handlePermissionChange('teamManagement', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.teamManagement ? "secondary" : "outline"} className="text-xs">
                            {permissions.teamManagement ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Orders & Shipping Operations */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Orders & Shipping Operations</h4>
                        <p className="text-sm text-muted-foreground">Edit orders, update status, manage shipping processes</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.ordersShipping}
                          onCheckedChange={(value) => handlePermissionChange('ordersShipping', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.ordersShipping ? "secondary" : "outline"} className="text-xs">
                            {permissions.ordersShipping ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Financial Operations */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Financial Operations</h4>
                        <p className="text-sm text-muted-foreground">Process refunds, payments and financial transactions</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.financialOperations}
                          onCheckedChange={(value) => handlePermissionChange('financialOperations', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.financialOperations ? "secondary" : "outline"} className="text-xs">
                            {permissions.financialOperations ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* System Configuration */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">System Configuration</h4>
                        <p className="text-sm text-muted-foreground">Modify system settings and configurations</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.systemConfig}
                          onCheckedChange={(value) => handlePermissionChange('systemConfig', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.systemConfig ? "secondary" : "outline"} className="text-xs">
                            {permissions.systemConfig ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Seller Management */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Seller Management</h4>
                        <p className="text-sm text-muted-foreground">Onboard, edit, and manage seller profiles</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.sellerManagement}
                          onCheckedChange={(value) => handlePermissionChange('sellerManagement', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.sellerManagement ? "secondary" : "outline"} className="text-xs">
                            {permissions.sellerManagement ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Support Tickets Operations */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Support Tickets Operations</h4>
                        <p className="text-sm text-muted-foreground">Create, edit, and resolve customer support requests</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.supportTickets}
                          onCheckedChange={(value) => handlePermissionChange('supportTickets', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.supportTickets ? "secondary" : "outline"} className="text-xs">
                            {permissions.supportTickets ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Reports & Analytics Operations */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Reports & Analytics Operations</h4>
                        <p className="text-sm text-muted-foreground">Generate, export and manage detailed reports</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.reportsAnalytics}
                          onCheckedChange={(value) => handlePermissionChange('reportsAnalytics', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.reportsAnalytics ? "secondary" : "outline"} className="text-xs">
                            {permissions.reportsAnalytics ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Marketing & Promotions Operations */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <h4 className="font-medium">Marketing & Promotions Operations</h4>
                        <p className="text-sm text-muted-foreground">Create and manage campaigns and promotional offers</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={permissions.marketingPromotions}
                          onCheckedChange={(value) => handlePermissionChange('marketingPromotions', value)}
                          disabled={!currentUser.isSuperAdmin}
                          className="data-[state=checked]:bg-purple-600 disabled:opacity-50"
                        />
                        {!currentUser.isSuperAdmin && (
                          <Badge variant={permissions.marketingPromotions ? "secondary" : "outline"} className="text-xs">
                            {permissions.marketingPromotions ? "Granted" : "Restricted"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button - Only show if Super Admin and changes made */}
                {currentUser.isSuperAdmin && permissionsChanged && (
                  <div className="flex justify-end mt-6">
                    <Button
                      variant="purple"
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Permission Changes
                    </Button>
                  </div>
                )}

                {/* Info section for non-Super Admins */}
                {!currentUser.isSuperAdmin && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800">Permission Management</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Only Super Admins can modify user permissions. The toggles above show the current permission status for this user but cannot be changed with your current access level.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTeamProfilePage;
