import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Check, Edit2, Eye, EyeOff, Mail, Phone, Save, Shield, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/config/api.config";

interface TeamUserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  permissions: Record<string, boolean>;
  seller: {
    _id: string;
    businessName: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  lastActive?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SubSellerProfilePage = () => {
  const [profile, setProfile] = useState<TeamUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Fetch team user profile
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Confirm if this endpoint requires seller_token instead of auth_token
      const response = await api.get('/api/v2/seller/team-auth/profile');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch profile');
      }

      setProfile(response.data.data);
      setProfileForm({
        name: response.data.data.name || "",
        phone: response.data.data.phone || ""
      });
    } catch (err) {
      console.error('Error fetching team user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile
  const handleProfileUpdate = async () => {
    try {
      setProfileLoading(true);

      const response = await api.patch('/api/v2/seller/team-auth/profile', {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim()
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update profile');
      }

      setProfile(response.data.data);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password
  const handlePasswordChange = async () => {
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      setPasswordLoading(true);

      const response = await api.patch('/api/v2/seller/team-auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to change password');
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setIsChangingPassword(false);
      toast.success('Password changed successfully!');
    } catch (err) {
      console.error('Error changing password:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getPermissionsList = () => {
    if (!profile?.permissions) return [];

    return Object.entries(profile.permissions)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 text-center mb-4">{error}</div>
        <Button onClick={fetchProfile} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center mb-4">No profile data found</div>
        <Button onClick={fetchProfile} variant="outline">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600">Manage your sub-seller account information</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Profile Section */}
        <div className="w-full lg:w-[30%] space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <User className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">{profile.name}</h2>
                <p className="text-gray-600 mt-1">{profile.role}</p>
                <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(profile.status)}`}>
                  {profile.status}
                </div>
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  Team Member
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Member since: {new Date(profile.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{profile.email}</span>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parent Seller Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{profile.seller.businessName}</p>
                <p className="text-xs text-gray-500">Parent Organization</p>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{profile.seller.email}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content Section */}
        <div className="w-full lg:w-[70%]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile Details</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Profile Details Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Update your personal details</CardDescription>
                    </div>
                    {!isEditingProfile && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      {isEditingProfile ? (
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 rounded border">
                          {profile.name}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="p-2 bg-gray-50 rounded border text-gray-600">
                        {profile.email}
                        <span className="text-xs text-gray-400 block">Cannot be changed</span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      {isEditingProfile ? (
                        <Input
                          id="phone"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 rounded border">
                          {profile.phone || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="role">Role</Label>
                      <div className="p-2 bg-gray-50 rounded border text-gray-600">
                        {profile.role}
                        <span className="text-xs text-gray-400 block">Assigned by admin</span>
                      </div>
                    </div>
                  </div>

                  {isEditingProfile && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleProfileUpdate}
                        disabled={profileLoading}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Your Permissions
                  </CardTitle>
                  <CardDescription>
                    These permissions determine what features you can access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getPermissionsList().map((permission, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {permission}
                        </span>
                      </div>
                    ))}
                  </div>

                  {getPermissionsList().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No permissions assigned</p>
                      <p className="text-sm">Contact your admin to get permissions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Update your account password</CardDescription>
                    </div>
                    {!isChangingPassword && (
                      <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {isChangingPassword && (
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        >
                          {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        >
                          {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handlePasswordChange}
                        disabled={passwordLoading}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {passwordLoading ? 'Changing...' : 'Change Password'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPasswordForm({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: ""
                          });
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Security Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Information</CardTitle>
                  <CardDescription>Account security details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Account Status: {profile.status}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-2">
                    <p>• Your account is managed by {profile.seller.businessName}</p>
                    <p>• Contact your admin for permission changes</p>
                    <p>• Keep your password secure and change it regularly</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SubSellerProfilePage;
