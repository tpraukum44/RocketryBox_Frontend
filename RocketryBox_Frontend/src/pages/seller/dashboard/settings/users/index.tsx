import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import {
  addTeamMember,
  deleteTeamMember,
  fetchTeamMembers,
  JobRole,
  resetTeamMemberPassword,
  SellerTeamMember,
  updateTeamMember
} from "@/lib/api/seller-users";
import { Calculator, Eye, Loader2, Shield, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// Define role-based permission sets
const ROLE_PERMISSIONS = {
  Manager: [
    'Dashboard access', 'Order', 'Shipments', 'Manifest', 'Received', 'New Order',
    'NDR List', 'Weight Dispute', 'Fright', 'Invoice', 'Ledger', 'COD Remittance',
    'Support', 'Warehouse', 'Service', 'Items & SKU', 'Stores', 'Priority', 'Label'
  ],
  Support: [
    'Dashboard access', 'Order', 'Shipments', 'Manifest', 'Received', 'New Order',
    'NDR List', 'Weight Dispute', 'Support', 'Warehouse', 'Service', 'Items & SKU'
  ],
  Finance: [
    'Dashboard access', 'Order', 'Shipments', 'Manifest', 'Received',
    'NDR List', 'Weight Dispute', 'Fright', 'Invoice', 'Ledger', 'COD Remittance'
  ]
};

// Permissions that are always blocked for sub-sellers
const BLOCKED_PERMISSIONS = ['Wallet', 'Manage Users'];

// Role descriptions
const ROLE_DESCRIPTIONS = {
  Manager: "Full access to operations, orders, shipments, and team management features",
  Support: "Access to orders, shipments, customer support, and warehouse operations",
  Finance: "Access to billing, invoices, payments, and financial reporting features"
};

const ManageUsersPage = () => {
  const { hasPermission, canAccess } = usePermissions();
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<SellerTeamMember[]>([]);
  const [searchParams] = useSearchParams();
  const [editingUser, setEditingUser] = useState<SellerTeamMember | null>(null);
  const [previewingRole, setPreviewingRole] = useState<JobRole | null>(null);

  // Form state for adding new user
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    contactNumber: "",
    password: "",
    jobRole: "" as JobRole | ""
  });

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const teamMembers = await fetchTeamMembers();
        setUsers(teamMembers);
      } catch (err) {
        setError("Failed to load users. Please try again.");
        console.error("Error loading users:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleAddUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.contactNumber || !newUser.password || !newUser.jobRole) {
        toast.error("Please fill in all required fields including job role");
        return;
      }

      setLoading(true);

      // Role-based permissions are handled automatically on backend
      const addedUser = await addTeamMember({
        name: newUser.name,
        email: newUser.email,
        contactNumber: newUser.contactNumber,
        password: newUser.password,
        jobRole: newUser.jobRole as JobRole,
        permissions: [], // Will be auto-assigned based on role
        status: "active"
      });

      setUsers(prev => [...prev, addedUser]);
      toast.success(`User added successfully with ${newUser.jobRole} role`);
      setShowAddUser(false);

      // Reset form
      setNewUser({
        name: "",
        email: "",
        contactNumber: "",
        password: "",
        jobRole: ""
      });
    } catch (err) {
      toast.error("Failed to add user. Please try again.");
      console.error("Error adding user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!hasPermission("Manage Users")) {
      toast.error("You don't have permission to reset passwords");
      return;
    }

    try {
      setLoading(true);
      await resetTeamMemberPassword(userId);
      toast.success("Password reset email sent");
    } catch (err) {
      toast.error("Failed to reset password. Please try again.");
      console.error("Error resetting password:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!hasPermission("Manage Users")) {
      toast.error("You don't have permission to delete users");
      return;
    }

    try {
      setLoading(true);
      await deleteTeamMember(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success("User deleted successfully");
    } catch (err) {
      toast.error("Failed to delete user. Please try again.");
      console.error("Error deleting user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: JobRole) => {
    if (!hasPermission("Manage Users")) {
      toast.error("You don't have permission to update users");
      return;
    }

    try {
      setLoading(true);
      await updateTeamMember(userId, {
        jobRole: newRole
        // Permissions will be auto-assigned based on new role on backend
      });
      setUsers(prev => prev.map(user =>
        user.id === userId
          ? { ...user, jobRole: newRole, permissions: ROLE_PERMISSIONS[newRole] }
          : user
      ));
      toast.success(`User role updated to ${newRole}`);
      setEditingUser(null);
    } catch (err) {
      toast.error("Failed to update user role. Please try again.");
      console.error("Error updating user:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter users based on search query from URL parameters
  const searchQuery = searchParams.get("search") || "";
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.jobRole.toLowerCase().includes(query)
    );
  });

  // Get role icon
  const getRoleIcon = (role: JobRole) => {
    switch (role) {
      case 'Manager': return <Users className="h-4 w-4" />;
      case 'Support': return <Shield className="h-4 w-4" />;
      case 'Finance': return <Calculator className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  // Get role color
  const getRoleColor = (role: JobRole) => {
    switch (role) {
      case 'Manager': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Support': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Finance': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Check if current user can manage users
  const canManageUsers = canAccess('users');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold">
            Manage Team Members
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Add and manage team members with role-based permissions
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={() => setShowAddUser(true)} disabled={loading}>
            Add Team Member
          </Button>
        )}
      </div>

      {/* Role Permission Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role-Based Access Control
          </CardTitle>
          <CardDescription>
            Team members are assigned predefined roles with specific permission sets. Wallet and administrative functions remain restricted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
              <div key={role} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getRoleIcon(role as JobRole)}
                  <h3 className="font-semibold">{role}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewingRole(role as JobRole)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600">{description}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {ROLE_PERMISSIONS[role as JobRole].length} permissions
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              View and manage all team members associated with your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && users.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created On</TableHead>
                    {canManageUsers && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageUsers ? 7 : 6} className="text-center py-8 text-gray-500">
                        {searchQuery ? "No matching users found" : "No team members found. Add your first team member to get started."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getRoleColor(user.jobRole)} border`}>
                            <span className="flex items-center gap-1">
                              {getRoleIcon(user.jobRole)}
                              {user.jobRole}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewingRole(user.jobRole)}
                          >
                            View {ROLE_PERMISSIONS[user.jobRole]?.length || 0} permissions
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(user.createdAt)}
                        </TableCell>
                        {canManageUsers && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                disabled={loading}
                              >
                                Edit Role
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetPassword(user.id)}
                                disabled={loading}
                              >
                                Reset Password
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={loading}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add User Modal */}
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent className="max-w-2xl" showCloseButton={false}>
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Add New Team Member</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddUser(false)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                Create a new team member with role-based permissions
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name*</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email*</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number*</Label>
                <Input
                  id="contactNumber"
                  placeholder="Enter contact number"
                  value={newUser.contactNumber}
                  onChange={(e) => setNewUser({ ...newUser, contactNumber: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password*</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobRole">Role*</Label>
                <Select
                  value={newUser.jobRole}
                  onValueChange={(role: JobRole) => setNewUser({ ...newUser, jobRole: role })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role as JobRole)}
                          <div>
                            <div className="font-medium">{role}</div>
                            <div className="text-xs text-gray-500">{description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Role determines access permissions automatically. Wallet and admin features are restricted for all team members.
                </p>
              </div>

              {newUser.jobRole && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Permissions for {newUser.jobRole} Role:</h4>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_PERMISSIONS[newUser.jobRole].map(permission => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <h5 className="text-sm font-medium text-red-600 mb-1">Restricted Permissions:</h5>
                    <div className="flex flex-wrap gap-2">
                      {BLOCKED_PERMISSIONS.map(permission => (
                        <Badge key={permission} variant="outline" className="text-xs text-red-600 border-red-200">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-6">
                <Button variant="outline" onClick={() => setShowAddUser(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={loading || !newUser.jobRole}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : "Add Team Member"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Role Modal */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-lg" showCloseButton={false}>
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Edit User Role</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingUser(null)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                {editingUser && `Change role for ${editingUser.name}. This will update their permissions automatically.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editJobRole">New Role</Label>
                <Select
                  value={editingUser?.jobRole || ""}
                  onValueChange={(role: JobRole) => handleUpdateUserRole(editingUser!.id, role)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role as JobRole)}
                          <div>
                            <div className="font-medium">{role}</div>
                            <div className="text-xs text-gray-500">{description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Changing the role will immediately update the user's permissions.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Role Permission Preview Modal */}
        <Dialog open={!!previewingRole} onOpenChange={(open) => !open && setPreviewingRole(null)}>
          <DialogContent className="max-w-2xl" showCloseButton={false}>
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle className="flex items-center gap-2">
                  {previewingRole && getRoleIcon(previewingRole)}
                  {previewingRole} Role Permissions
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewingRole(null)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                {previewingRole && ROLE_DESCRIPTIONS[previewingRole]}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-medium mb-3 text-green-600">✅ Allowed Permissions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {previewingRole && ROLE_PERMISSIONS[previewingRole].map(permission => (
                    <Badge key={permission} variant="secondary" className="justify-start">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3 text-red-600">❌ Restricted Permissions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCKED_PERMISSIONS.map(permission => (
                    <Badge key={permission} variant="outline" className="justify-start border-red-200 text-red-600">
                      {permission}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These permissions are restricted for all team members to maintain security.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManageUsersPage;
