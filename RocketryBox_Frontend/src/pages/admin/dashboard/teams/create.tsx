import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ServiceFactory } from "@/services/service-factory";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Shield, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

// Helper function to check if current user is Super Admin
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

// Enhanced validation schema
const createUserSchema = z.object({
  fullName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name should only contain letters and spaces"),
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
  role: z.enum(["Admin", "Manager", "Support", "Agent"], {
    required_error: "Please select a role"
  }).optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number and special character"),
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
  status: z.enum(["Active", "Inactive"], {
    required_error: "Please select a status"
  }),
  department: z.string()
    .min(2, "Department is required")
    .max(50, "Department must not exceed 50 characters")
    .optional(),
  designation: z.string().optional(),
  address: z.string().optional(),
  remarks: z.string().optional(),
  // Financial & Identity Details
  aadharNumber: z.string()
    .regex(/^[0-9]{12}$/, "Aadhar number must be exactly 12 digits")
    .optional(),
  panNumber: z.string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN number format: ABCDE1234F")
    .optional(),
  bankAccountNumber: z.string()
    .min(9, "Bank account number must be at least 9 digits")
    .max(18, "Bank account number must not exceed 18 digits")
    .regex(/^[0-9]+$/, "Bank account number should only contain digits")
    .optional(),
  ifscCode: z.string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC code format: ABCD0123456")
    .optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  // Super Admin privileges
  isSuperAdmin: z.boolean().default(false),
  sendInvitation: z.boolean().default(true)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
}).refine((data) => {
  // Role validation: Skip if Super Admin, otherwise require role
  if (data.isSuperAdmin) {
    return true; // Super Admin users don't need role validation
  }
  return !!data.role; // Regular users need a role
}, {
  message: "Role is required for non-Super Admin users",
  path: ["role"]
}).refine((data) => {
  // Department validation: Skip if Super Admin, otherwise require department
  if (data.isSuperAdmin) {
    return true; // Super Admin users don't need department validation
  }
  return !!(data.department && data.department.length >= 2); // Regular users need a department
}, {
  message: "Department is required for non-Super Admin users",
  path: ["department"]
});

type CreateUserInput = z.infer<typeof createUserSchema>;

// Department-based permission mappings for Manager role
type DepartmentPermissions = {
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  restrictions: string[];
};

type ManagerDepartments = {
  [key: string]: DepartmentPermissions;
};

const MANAGER_DEPARTMENT_PERMISSIONS: ManagerDepartments = {
  "Operations": {
    name: "Operations Manager",
    description: "Manages tracking, delivery assignment, and shipping workflows",
    permissions: {
      dashboardAccess: true,
      ordersShipping: true,
      shipmentTracking: true,
      deliveryAssignment: true,
      statusUpdates: true,
    },
    restrictions: [
      "Cannot change pricing or view financials",
      "No access to customer financial data"
    ]
  },
  "Customer Support": {
    name: "Customer Support Manager",
    description: "Handles communication with customers, complaints, and service resolutions",
    permissions: {
      dashboardAccess: true,
      supportTickets: true,
      customerCommunication: true,
      refundRequests: true,
      chatEmailLogs: true,
    },
    restrictions: [
      "Cannot alter shipment data",
      "No access to bulk shipment tools",
      "Cannot approve financial transactions"
    ]
  },
  "Sales & Business Development": {
    name: "Sales & BD Manager",
    description: "Manages client onboarding, business leads, and sales performance",
    permissions: {
      dashboardAccess: true,
      clientOnboarding: true,
      leadManagement: true,
      salesReports: true,
      businessDevelopment: true,
    },
    restrictions: [
      "Cannot approve pricing/discounts",
      "No access to operational areas",
      "Cannot access financial records"
    ]
  },
  "Accounts & Finance": {
    name: "Accounts & Finance Manager",
    description: "Handles payment records, billing, and partner financial summaries",
    permissions: {
      dashboardAccess: true,
      financialOperations: true,
      invoiceAccess: true,
      paymentLogs: true,
      payoutSummaries: true,
    },
    restrictions: [
      "Cannot approve or initiate payments",
      "Cannot access customer support tools",
      "No operational control access"
    ]
  },
  "Logistics Coordination": {
    name: "Logistics Coordination Manager",
    description: "Coordinates pickups, tracks issues, and ensures dispatch scheduling",
    permissions: {
      dashboardAccess: true,
      pickupAssignment: true,
      logisticsTracking: true,
      dispatchScheduling: true,
      issueResolution: true,
    },
    restrictions: [
      "No customer financial data access",
      "Cannot access customer support tools",
      "No pricing or billing access"
    ]
  },
  "Warehouse Management": {
    name: "Warehouse Manager",
    description: "Oversees internal inventory, packing, and order movements",
    permissions: {
      dashboardAccess: true,
      warehouseOperations: true,
      inventoryTracking: true,
      packingStatus: true,
      storageManagement: true,
    },
    restrictions: [
      "Cannot interact with customers directly",
      "No access to third-party logistics tools",
      "No financial or sales access"
    ]
  },
  "IT Support": {
    name: "IT Support Manager",
    description: "Supports backend operations, account issues, and system logs",
    permissions: {
      dashboardAccess: true,
      systemLogs: true,
      technicalSupport: true,
      userCredentials: true,
      systemAlerts: true,
    },
    restrictions: [
      "Cannot access sales or finance data",
      "Cannot alter admin-level access",
      "No customer-facing operations"
    ]
  }
};

const CreateNewUserPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [sendInvitation, setSendInvitation] = useState<boolean>(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [showPermissionPreview, setShowPermissionPreview] = useState(false);
  const [selectedManagerDepartment, setSelectedManagerDepartment] = useState<string>("");

  // File upload states
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [bankPassbookFile, setBankPassbookFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [_uploadingFiles, setUploadingFiles] = useState<boolean>(false);

  // Super Admin confirmation dialog state
  const [showSuperAdminConfirm, setShowSuperAdminConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CreateUserInput | null>(null);

  // Get current user permissions
  const currentUser = getCurrentUser();

  // Check Super Admin permission on page load
  useEffect(() => {
    if (!currentUser.isSuperAdmin) {
      console.warn('Access denied: User is not a Super Admin');
      toast.error('Access Denied', {
        description: 'Only Super Admins can create team members'
      });

      // Redirect back to teams page
      navigate('/admin/dashboard/teams', { replace: true });
    }
  }, [currentUser.isSuperAdmin, navigate]);

  // Don't render the form if user is not Super Admin
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
            <Link to="/admin/dashboard/teams">
              <Button variant="outline" className="border-red-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Teams
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    mode: "onChange", // Validate on change to provide immediate feedback
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      role: undefined,
      password: "",
      confirmPassword: "",
      status: "Active",
      department: "",
      designation: "",
      address: "",
      remarks: "",
      // Financial & Identity Details
      aadharNumber: "",
      panNumber: "",
      bankAccountNumber: "",
      ifscCode: "",
      bankName: "",
      accountHolderName: "",
      // Super Admin privileges
      isSuperAdmin: false,
      sendInvitation: true,
    },
  });

  const watchedRole = form.watch("role");
  const watchedDepartment = form.watch("department");

  // Handle role selection changes
  useEffect(() => {
    if (watchedRole === "Manager") {
      setShowPermissionPreview(true);
      // Clear department when switching to Manager role
      const currentDepartment = form.getValues("department");
      if (currentDepartment && !MANAGER_DEPARTMENT_PERMISSIONS[currentDepartment]) {
        form.setValue("department", "");
        setSelectedManagerDepartment("");
      }
    } else {
      setShowPermissionPreview(false);
      setSelectedManagerDepartment("");
    }
  }, [watchedRole, form]);

  // Handle department selection for Manager role
  useEffect(() => {
    if (watchedRole === "Manager" && watchedDepartment && MANAGER_DEPARTMENT_PERMISSIONS[watchedDepartment]) {
      setSelectedManagerDepartment(watchedDepartment);
    }
  }, [watchedRole, watchedDepartment]);

  const handleSendInvitationToggle = (checked: boolean) => {
    setSendInvitation(checked);
    form.setValue("sendInvitation", checked);
  };

  const handleSuperAdminToggle = async (checked: boolean) => {
    console.log("🔄 Super Admin toggle:", checked);
    setIsSuperAdmin(checked);
    form.setValue("isSuperAdmin", checked);

    if (checked) {
      // Clear role and department when Super Admin is enabled since they're not needed
      form.setValue("role", undefined);
      form.setValue("department", "Administration"); // Set a default value to pass validation
      setShowPermissionPreview(false);
      setSelectedManagerDepartment("");
      console.log("✅ Super Admin enabled - role cleared, department set to Administration");
    } else {
      // Restore default values when Super Admin is disabled
      form.setValue("role", undefined); // User will need to select
      form.setValue("department", ""); // User will need to select
      console.log("❌ Super Admin disabled - role and department cleared");
    }

    // Trigger form validation to clear any existing errors
    await form.trigger(["role", "department", "isSuperAdmin"]);
    console.log("🔍 Form validation triggered after Super Admin toggle");
  };

  // File upload handlers
  const handleFileUpload = (file: File | null, type: 'aadhar' | 'pan' | 'bankPassbook' | 'profilePhoto') => {
    if (!file) return;

    // Validate file type (images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload JPG, PNG, or PDF files only"
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Please upload files smaller than 5MB"
      });
      return;
    }

    switch (type) {
      case 'aadhar':
        setAadharFile(file);
        break;
      case 'pan':
        setPanFile(file);
        break;
      case 'bankPassbook':
        setBankPassbookFile(file);
        break;
      case 'profilePhoto':
        setProfilePhotoFile(file);
        break;
    }

    toast.success("File selected successfully", {
      description: `${file.name} is ready to upload`
    });
  };

  const removeFile = (type: 'aadhar' | 'pan' | 'bankPassbook' | 'profilePhoto') => {
    switch (type) {
      case 'aadhar':
        setAadharFile(null);
        break;
      case 'pan':
        setPanFile(null);
        break;
      case 'bankPassbook':
        setBankPassbookFile(null);
        break;
      case 'profilePhoto':
        setProfilePhotoFile(null);
        break;
    }
    toast.info("File removed");
  };

  const getPermissionPreview = () => {
    if (!selectedManagerDepartment || !MANAGER_DEPARTMENT_PERMISSIONS[selectedManagerDepartment]) {
      return null;
    }

    const deptData = MANAGER_DEPARTMENT_PERMISSIONS[selectedManagerDepartment];

    return (
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-800">
            Permission Preview: {deptData.name}
          </h3>
        </div>

        <p className="text-blue-700 mb-4">{deptData.description}</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-1">
              ✅ Access Granted
            </h4>
            <ul className="space-y-1">
              {Object.keys(deptData.permissions).map((permission: string) => (
                <li key={permission} className="text-sm text-green-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-red-800 mb-2 flex items-center gap-1">
              ❌ Restrictions
            </h4>
            <ul className="space-y-1">
              {deptData.restrictions.map((restriction: string, index: number) => (
                <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  {restriction}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> After creation, Super Admins can grant additional permissions or modify department associations from the user's "Role & Access" section.
          </p>
        </div>
      </div>
    );
  };

  const handleConfirmedSuperAdminCreation = async (data: CreateUserInput) => {
    console.log("✅ Super Admin creation confirmed by user");

    try {
      setSubmitting(true);
      setUploadingFiles(true);
      setError(null);

      // Create FormData for file uploads
      const formData = new FormData();

      // Append form data with proper type handling
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Handle boolean values properly
          if (typeof value === 'boolean') {
            formData.append(key, String(value));
          } else if (value !== '') {
            formData.append(key, value as string);
          }
        }
      });

      // Explicitly set isSuperAdmin based on UI state to prevent inconsistencies
      const actualIsSuperAdmin = isSuperAdmin; // Use state variable as source of truth
      formData.set("isSuperAdmin", String(actualIsSuperAdmin));

      // For Super Admin users, set role to "Admin" and department to "Administration" by default
      if (actualIsSuperAdmin) {
        formData.set("role", "Admin");
        formData.set("department", "Administration");
        console.log("✅ Super Admin: Role set to Admin, Department set to Administration");
      } else {
        // For regular users, ensure we have proper role and department
        if (!data.role) {
          throw new Error("Role is required for non-Super Admin users");
        }
        if (!data.department) {
          throw new Error("Department is required for non-Super Admin users");
        }
        console.log("👤 Regular User: Role =", data.role, ", Department =", data.department);
      }

      // Add dateOfJoining
      formData.append('dateOfJoining', new Date().toISOString().split('T')[0]);

      // Append files if they exist
      if (aadharFile) {
        formData.append('aadharDocument', aadharFile);
      }
      if (panFile) {
        formData.append('panDocument', panFile);
      }
      if (bankPassbookFile) {
        formData.append('bankPassbookDocument', bankPassbookFile);
      }
      if (profilePhotoFile) {
        formData.append('profilePhoto', profilePhotoFile);
      }

      console.log("🌐 Calling API...");
      const response = await ServiceFactory.admin.registerAdminTeamMemberWithFiles(formData);
      console.log("📨 API response:", response);

      if (response.success) {
        toast.success("User Created Successfully! 🎉", {
          description: data.sendInvitation
            ? `Welcome email sent to ${data.email} with login credentials. Profile and documents uploaded successfully.`
            : "User account created successfully with profile photo and documents uploaded.",
          duration: 5000
        });

        // Navigate back to team list
        navigate("/admin/dashboard/teams");
      } else {
        throw new Error(response.message || "Failed to create user");
      }
    } catch (err) {
      console.error("❌ User creation error:", err);

      const errorMessage = err instanceof Error ? err.message : "Failed to create user. Please try again.";
      setError(errorMessage);
      toast.error("User Creation Failed", {
        description: errorMessage,
        duration: 5000
      });
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
      setShowSuperAdminConfirm(false);
      setPendingFormData(null);
    }
  };

  const onSubmit = async (data: CreateUserInput) => {
    console.log("🚀 Form submission started", data);
    console.log("🔍 Super Admin Status Check:", {
      formData_isSuperAdmin: data.isSuperAdmin,
      stateVariable_isSuperAdmin: isSuperAdmin,
      typeof_isSuperAdmin: typeof data.isSuperAdmin,
      role: data.role,
      department: data.department
    });

    // Super Admin confirmation dialog
    if (isSuperAdmin) {
      // Store form data and show custom confirmation dialog instead of native browser alert
      setPendingFormData(data);
      setShowSuperAdminConfirm(true);
      return;
    }

    // For regular users, proceed directly
    await handleConfirmedSuperAdminCreation(data);
  };

  const handleReset = () => {
    form.reset();
    setError(null);
    // Clear all uploaded files
    setAadharFile(null);
    setPanFile(null);
    setBankPassbookFile(null);
    setProfilePhotoFile(null);
    // Reset toggles
    setIsSuperAdmin(false);
    setSendInvitation(true);
    // Reset form values to defaults
    form.reset({
      fullName: "",
      email: "",
      phoneNumber: "",
      role: undefined,
      password: "",
      confirmPassword: "",
      status: "Active",
      department: "",
      designation: "",
      address: "",
      remarks: "",
      aadharNumber: "",
      panNumber: "",
      bankAccountNumber: "",
      ifscCode: "",
      bankName: "",
      accountHolderName: "",
      isSuperAdmin: false,
      sendInvitation: true,
    });
    toast.info("Form cleared", { description: "All fields, uploaded files, and settings have been reset" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/dashboard/teams")}
              className="flex items-center gap-2 hover:bg-white/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Team
            </Button>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Card Header */}
            <div className={`px-8 py-6 ${isSuperAdmin
              ? 'bg-gradient-to-r from-red-600 to-red-800'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600'
              } transition-all duration-500`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-lg p-2">
                  {isSuperAdmin ? (
                    <Shield className="h-6 w-6 text-white animate-pulse" />
                  ) : (
                    <UserPlus className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {isSuperAdmin ? '🚨 Create Super Admin User' : 'Create New User'}
                  </h1>
                  <p className={`mt-1 ${isSuperAdmin ? 'text-red-100' : 'text-indigo-100'
                    }`}>
                    {isSuperAdmin
                      ? 'Creating user with MAXIMUM system privileges'
                      : 'Add a new team member to the admin panel'
                    }
                  </p>
                </div>
                <div className="ml-auto">
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-1 ${isSuperAdmin
                    ? 'bg-white/20 border border-white/30'
                    : 'bg-white/10'
                    }`}>
                    <Shield className="h-4 w-4 text-white" />
                    <span className="text-sm text-white font-medium">
                      {isSuperAdmin ? 'SUPER ADMIN MODE' : 'Super Admin Only'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mx-8 mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Creation Error</span>
                </div>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <div className="p-8">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.error("❌ Form validation errors:", errors);
                    toast.error("Form Validation Failed", {
                      description: "Please check the form for errors and try again.",
                      duration: 5000
                    });
                  })}
                  className="space-y-8"
                >
                  {/* Profile Photo Upload Section */}
                  <div className="flex justify-center mb-8">
                    <div className="flex flex-col items-center space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                        Profile Photo
                      </h3>

                      <div className="relative">
                        {!profilePhotoFile ? (
                          <label className="relative flex flex-col items-center justify-center w-32 h-32 border-2 border-gray-300 border-dashed rounded-full cursor-pointer bg-gray-50 hover:bg-gray-100 group">
                            <div className="flex flex-col items-center justify-center pt-2 pb-3">
                              <svg className="w-8 h-8 mb-2 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                              </svg>
                              <p className="text-xs text-gray-500 text-center px-2">Upload Photo</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Validate image file types
                                  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                  if (!allowedImageTypes.includes(file.type)) {
                                    toast.error("Invalid file type", {
                                      description: "Please upload JPG, PNG, or WebP images only"
                                    });
                                    return;
                                  }
                                  handleFileUpload(file, 'profilePhoto');
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-200 shadow-lg">
                            <img
                              src={URL.createObjectURL(profilePhotoFile)}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removeFile('profilePhoto')}
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {profilePhotoFile && (
                        <div className="text-center">
                          <p className="text-sm font-medium text-green-800">{profilePhotoFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(profilePhotoFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 text-center max-w-xs">
                        Upload a professional profile photo. Accepted formats: JPG, PNG, WebP (Max: 5MB)
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                          Basic Information
                        </h3>
                      </div>

                      {/* Name */}
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Full Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter full name"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Email */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Email Address *
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter email address"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Phone Number */}
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Phone Number *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter phone number"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Role - Hidden when Super Admin is enabled */}
                      {!isSuperAdmin && (
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Role *
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Manager">Manager</SelectItem>
                                  <SelectItem value="Support">Support</SelectItem>
                                  <SelectItem value="Agent">Agent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          Account Settings
                        </h3>
                      </div>

                      {/* Password */}
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Password *
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter password"
                                  className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Confirm Password */}
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Confirm Password *
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm password"
                                  className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Status */}
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Status *
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Active">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    Active
                                  </div>
                                </SelectItem>
                                <SelectItem value="Inactive">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    Inactive
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Department - Hidden when Super Admin is enabled */}
                      {!isSuperAdmin && (
                        <FormField
                          control={form.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Department *
                                {watchedRole === "Manager" && (
                                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    Manager Departments
                                  </span>
                                )}
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                    <SelectValue placeholder={
                                      watchedRole === "Manager"
                                        ? "Select specialized department"
                                        : "Select department"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {watchedRole === "Manager" ? (
                                    // Manager-specific departments with permissions
                                    <>
                                      {Object.entries(MANAGER_DEPARTMENT_PERMISSIONS).map(([key, dept]) => (
                                        <SelectItem key={key} value={key}>
                                          <div className="flex flex-col py-1">
                                            <span className="font-medium">{dept.name}</span>
                                            <span className="text-xs text-gray-600 max-w-xs truncate">
                                              {dept.description}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </>
                                  ) : (
                                    // Standard departments for other roles
                                    <>
                                      <SelectItem value="Administration">Administration</SelectItem>
                                      <SelectItem value="Executive">Executive</SelectItem>
                                      <SelectItem value="Finance">Finance</SelectItem>
                                      <SelectItem value="IT">IT</SelectItem>
                                      <SelectItem value="Marketing">Marketing</SelectItem>
                                      <SelectItem value="Sales">Sales</SelectItem>
                                      <SelectItem value="Customer Support">Customer Support</SelectItem>
                                      <SelectItem value="Operations">Operations</SelectItem>
                                      <SelectItem value="Logistics">Logistics</SelectItem>
                                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-xs" />
                              {watchedRole === "Manager" && !watchedDepartment && (
                                <p className="text-xs text-blue-600 mt-1">
                                  💡 Selecting a department will automatically grant specific permissions for that area
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  {/* Permission Preview Section - Show after department selection for Manager */}
                  {showPermissionPreview && selectedManagerDepartment && getPermissionPreview()}

                  {/* Super Admin Toggle Section */}
                  {currentUser.isSuperAdmin && (
                    <div className={`rounded-2xl p-6 border-2 transition-all duration-500 ${isSuperAdmin
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                      : 'bg-purple-50 border-purple-200'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <h3 className={`font-bold text-lg ${isSuperAdmin ? 'text-red-800' : 'text-purple-800'
                            }`}>
                            {isSuperAdmin ? '🚨 SUPER ADMIN MODE' : '🔒 Super Admin Privileges'}
                          </h3>
                          <p className={`text-sm ${isSuperAdmin ? 'text-red-700' : 'text-purple-700'
                            }`}>
                            {isSuperAdmin
                              ? 'Creating user with MAXIMUM system privileges and full platform access'
                              : 'Enable to grant comprehensive administrative rights beyond standard roles'
                            }
                          </p>
                        </div>

                        <FormField
                          control={form.control}
                          name="isSuperAdmin"
                          render={() => (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className={`text-sm font-bold ${isSuperAdmin ? 'text-orange-600' : 'text-gray-500'}`}>
                                    {isSuperAdmin ? 'ENABLED' : 'DISABLED'}
                                  </span>
                                  <p className="text-xs text-orange-600 mt-1">
                                    {isSuperAdmin ? '⚡ Maximum Access' : '🔒 Standard Access'}
                                  </p>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={isSuperAdmin}
                                    onCheckedChange={handleSuperAdminToggle}
                                    className={`scale-125 transition-all duration-300 ${isSuperAdmin
                                      ? "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-red-600 data-[state=checked]:to-red-800 data-[state=checked]:shadow-lg data-[state=checked]:shadow-red-500/50"
                                      : "data-[state=unchecked]:bg-gray-300"
                                      }`}
                                  />
                                </FormControl>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Super Admin Warning */}
                      {isSuperAdmin && (
                        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-xl">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-bold text-red-800 text-sm">⚠️ MAXIMUM PRIVILEGES ENABLED</h4>
                              <ul className="text-xs text-red-700 mt-2 space-y-1 ml-4">
                                <li>• Complete database and user management access</li>
                                <li>• System configuration and security overrides</li>
                                <li>• Financial operations and payment approvals</li>
                                <li>• Admin account creation and deletion</li>
                              </ul>
                              <p className="font-bold bg-red-100 px-2 py-1 rounded mt-2">
                                ⚠️ Role will be set to "Admin" and Department to "Administration"
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="border-t pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      Additional Information
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Designation */}
                      <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Designation
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter designation"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Address */}
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Address
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter address"
                                className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 resize-none"
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Remarks */}
                    <div className="mt-6">
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Remarks
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter any additional remarks"
                                className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Financial & Identity Information */}
                  <div className="border-t pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      Financial & Identity Information
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Aadhar Number */}
                      <FormField
                        control={form.control}
                        name="aadharNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Aadhar Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter 12-digit Aadhar number"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                maxLength={12}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* PAN Number */}
                      <FormField
                        control={form.control}
                        name="panNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              PAN Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ABCDE1234F"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 uppercase"
                                maxLength={10}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Bank Account Number */}
                      <FormField
                        control={form.control}
                        name="bankAccountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Bank Account Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter bank account number"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* IFSC Code */}
                      <FormField
                        control={form.control}
                        name="ifscCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              IFSC Code
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ABCD0123456"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 uppercase"
                                maxLength={11}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Bank Name */}
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Bank Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter bank name"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Account Holder Name */}
                      <FormField
                        control={form.control}
                        name="accountHolderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Account Holder Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter account holder name"
                                className="h-11 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="border-t pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      Document Uploads
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Aadhar Document Upload */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 11-4 0 2 2 0 014 0zm8-2a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                          </svg>
                          Aadhar Card
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">Upload Aadhar card (front/back)</p>

                        {!aadharFile ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg className="w-6 h-6 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                              </svg>
                              <p className="text-xs text-gray-500">Click to upload</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'aadhar')}
                            />
                          </label>
                        ) : (
                          <div className="bg-white border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-green-800">{aadharFile.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile('aadhar')}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {(aadharFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>

                      {/* PAN Document Upload */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                          </svg>
                          PAN Card
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">Upload PAN card copy</p>

                        {!panFile ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg className="w-6 h-6 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                              </svg>
                              <p className="text-xs text-gray-500">Click to upload</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'pan')}
                            />
                          </label>
                        ) : (
                          <div className="bg-white border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-green-800">{panFile.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile('pan')}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {(panFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bank Passbook Upload */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 2h6v4H7V4zm8 6v2h1v-2h-1zM3 10v2h1v-2H3zm3 0h6v2H6v-2z" clipRule="evenodd" />
                          </svg>
                          Bank Passbook
                        </h4>
                        <p className="text-xs text-gray-600 mb-3">Upload bank passbook front page</p>

                        {!bankPassbookFile ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg className="w-6 h-6 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                              </svg>
                              <p className="text-xs text-gray-500">Click to upload</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'bankPassbook')}
                            />
                          </label>
                        ) : (
                          <div className="bg-white border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-green-800">{bankPassbookFile.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile('bankPassbook')}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {(bankPassbookFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">Document Upload Guidelines</h4>
                          <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                            <li>• Accepted formats: JPG, PNG, PDF</li>
                            <li>• Maximum file size: 5MB per document</li>
                            <li>• Ensure documents are clear and readable</li>
                            <li>• Bank passbook: Upload front page showing account details</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Invitation Toggle */}
                  <div className="border-t pt-8">
                    <FormField
                      control={form.control}
                      name="sendInvitation"
                      render={() => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-6 hover:bg-indigo-100 transition-colors">
                          <div className="space-y-0.5">
                            <FormLabel className="text-indigo-800 font-semibold cursor-pointer text-base">
                              Send Welcome Email
                            </FormLabel>
                            <p className="text-sm text-indigo-700">
                              Automatically send login credentials and welcome message to the user's email
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${sendInvitation ? 'text-green-600' : 'text-gray-500'}`}>
                              {sendInvitation ? 'Enabled' : 'Disabled'}
                            </span>
                            <FormControl>
                              <Switch
                                checked={sendInvitation}
                                onCheckedChange={handleSendInvitationToggle}
                                className="data-[state=checked]:bg-indigo-600"
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 pt-8 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={submitting}
                      className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Reset Form
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate("/admin/dashboard/teams")}
                      disabled={submitting}
                      className="px-6 py-2.5"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      onClick={() => {
                        console.log("🖱️ Create User button clicked!");
                        console.log("📋 Current form state:", form.getValues());
                        console.log("❌ Form errors:", form.formState.errors);
                        console.log("✅ Form is valid:", form.formState.isValid);
                      }}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 min-w-[140px]"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create User
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Only Super Admins can create new users. All fields marked with * are required.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Super Admin Confirmation Dialog */}
      <AlertDialog open={showSuperAdminConfirm} onOpenChange={setShowSuperAdminConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-800">
              <Shield className="h-5 w-5 text-red-600" />
              Rocketry Box Admin Alert
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-700 space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-800 mb-2">🚨 SUPER ADMIN CREATION CONFIRMATION</p>
                <p className="text-red-700 mb-3">
                  You are about to create a Super Admin user with MAXIMUM system privileges:
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  <li>• Complete database and user management access</li>
                  <li>• System configuration and security overrides</li>
                  <li>• Admin account creation and deletion rights</li>
                </ul>
              </div>

              {pendingFormData && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="font-medium text-gray-800 mb-1">User Details:</p>
                  <p className="text-sm text-gray-700">
                    <strong>Name:</strong> {pendingFormData.fullName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> {pendingFormData.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Role:</strong> Admin (Super Admin)
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Department:</strong> Administration
                  </p>
                </div>
              )}

              <p className="text-red-700 font-medium text-center">
                ⚠️ This action cannot be undone easily.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => {
                console.log("❌ Super Admin creation cancelled by user");
                setShowSuperAdminConfirm(false);
                setPendingFormData(null);
                toast.info("Super Admin Creation Cancelled", {
                  description: "Please review your settings and try again if needed.",
                  duration: 3000
                });
              }}
              className="border-gray-300"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingFormData) {
                  handleConfirmedSuperAdminCreation(pendingFormData);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Create Super Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateNewUserPage;
