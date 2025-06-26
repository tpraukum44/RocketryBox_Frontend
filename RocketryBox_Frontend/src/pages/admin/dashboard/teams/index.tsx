import PermissionGuard, { SuperAdminOnly } from '@/components/admin/PermissionGuard';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServiceFactory } from "@/services/service-factory";
import { AlertCircle, ArrowUpDown, Loader2, MoreHorizontal, Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Support" | "Agent";
  registrationDate: string;
  status: "Active" | "Inactive" | "On Leave";
  phone: string;
  remarks: string;
  profileImage?: string;
  department?: string;
  designation?: string;
  isSuperAdmin?: boolean;
  employeeId?: string;
  bankAccountNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
}

type SortConfig = {
  key: keyof TeamMember | null;
  direction: "asc" | "desc" | null;
};

const getStatusStyle = (status: TeamMember["status"]) => {
  return {
    "Active": "bg-green-50 text-green-700",
    "Inactive": "bg-red-50 text-red-700",
    "On Leave": "bg-yellow-50 text-yellow-700"
  }[status];
};

const getRoleStyle = (role: TeamMember["role"]) => {
  return {
    "Admin": "bg-purple-50 text-purple-700",
    "Manager": "bg-blue-50 text-blue-700",
    "Support": "bg-indigo-50 text-indigo-700",
    "Agent": "bg-cyan-50 text-cyan-700"
  }[role];
};

const TeamsTable = ({ data, loading, onStatusUpdate }: {
  data: TeamMember[];
  loading: boolean;
  onStatusUpdate: (userId: string, status: TeamMember["status"]) => void;
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null
  });

  // Get current user permissions
  const currentUser = getCurrentUser();

  const handleSort = (key: keyof TeamMember) => {
    let direction: "asc" | "desc" | null = "asc";

    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }

    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction || !Array.isArray(data)) return data;

    return [...data].sort((a, b) => {
      const aValue = String(a[sortConfig.key!] || "");
      const bValue = String(b[sortConfig.key!] || "");

      if (sortConfig.direction === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  const getSortIcon = (key: keyof TeamMember) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="size-3" />;
    }
    return <ArrowUpDown className="size-3" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="text-muted-foreground">Loading team members...</p>
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg">
        <p className="text-muted-foreground mb-4">No team members found</p>
        {/* Only show Add Team Member button to Super Admins */}
        {currentUser.isSuperAdmin && (
          <Link to="/admin/dashboard/teams/handler">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </Link>
        )}
        {!currentUser.isSuperAdmin && (
          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
            Only Super Admins can add team members
          </div>
        )}
      </div>
    );
  }

  const sortedData = getSortedData();

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Photo</TableHead>
            <TableHead>
              <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleSort("name")}
              >
                Name & ID {getSortIcon("name")}
              </div>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleSort("email")}
              >
                Contact {getSortIcon("email")}
              </div>
            </TableHead>
            <TableHead>
              <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleSort("role")}
              >
                Role & Type {getSortIcon("role")}
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleSort("department")}
              >
                Department {getSortIcon("department")}
              </div>
            </TableHead>
            <TableHead>
              <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleSort("status")}
              >
                Status {getSortIcon("status")}
              </div>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleSort("registrationDate")}
              >
                Joined {getSortIcon("registrationDate")}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((member) => (
            <TableRow key={member.userId || Math.random()}>
              {/* Profile Photo */}
              <TableCell>
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center relative">
                  {member.profileImage ? (
                    <>
                      <img
                        src={member.profileImage}
                        alt={member.name}
                        className="h-full w-full object-cover absolute inset-0"
                        onError={(e) => {
                          console.error('Profile image failed to load:', member.profileImage);
                          console.log('Member data:', {
                            name: member.name,
                            profileImage: member.profileImage
                          });
                          // Hide the image on error
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Profile image loaded successfully:', member.profileImage);
                        }}
                      />
                      <span className="text-sm font-medium text-gray-600 absolute inset-0 flex items-center justify-center">
                        {member.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      {member.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Name & ID */}
              <TableCell>
                <div className="space-y-1">
                  <Link
                    to={`/admin/dashboard/teams/${member.userId}`}
                    className="font-medium text-purple-600 hover:underline block"
                  >
                    {member.name || 'N/A'}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    ID: {member.employeeId || member.userId || 'N/A'}
                  </div>
                </div>
              </TableCell>

              {/* Contact */}
              <TableCell className="hidden md:table-cell">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{member.email || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">{member.phone || 'N/A'}</div>
                </div>
              </TableCell>

              {/* Role & Type */}
              <TableCell>
                <div className="space-y-2">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${getRoleStyle(
                      member.role || 'Agent'
                    )}`}
                  >
                    {member.role || 'Agent'}
                  </span>
                  {member.isSuperAdmin && (
                    <div>
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        Super Admin
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Department */}
              <TableCell className="hidden lg:table-cell">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{member.department || 'N/A'}</div>
                  {member.designation && (
                    <div className="text-xs text-muted-foreground">{member.designation}</div>
                  )}
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusStyle(
                    member.status || 'Active'
                  )}`}
                >
                  {member.status || 'Active'}
                </span>
              </TableCell>

              {/* Joined Date */}
              <TableCell className="hidden md:table-cell">
                <div className="text-sm">{member.registrationDate || 'N/A'}</div>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Link to={`/admin/dashboard/teams/${member.userId}`} className="flex items-center w-full">
                        View Profile
                      </Link>
                    </DropdownMenuItem>
                    {/* Only Super Admins can change status */}
                    {currentUser.isSuperAdmin && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onStatusUpdate(member.userId, "Active")}
                          disabled={member.status === "Active"}
                        >
                          Set as Active
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onStatusUpdate(member.userId, "Inactive")}
                          disabled={member.status === "Inactive"}
                        >
                          Set as Inactive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onStatusUpdate(member.userId, "On Leave")}
                          disabled={member.status === "On Leave"}
                        >
                          Set as On Leave
                        </DropdownMenuItem>
                      </>
                    )}
                    {!currentUser.isSuperAdmin && (
                      <DropdownMenuItem disabled>
                        Super Admin Only
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const AdminTeamsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const navigate = useNavigate();

  // Get current user permissions
  const currentUser = getCurrentUser();

  // Fetch team members data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching team members...');

        // Use the correct team management API endpoint
        const response = await ServiceFactory.admin.getAdminTeamMembers({
          page: 1,
          limit: 100,
          search: ""
        });

        console.log('Team API Response:', response);

        if (response.success && response.data) {
          // Handle different response structures
          let members: any[] = [];

          // New structure: { data: { teamMembers: [...], pagination: {...} } }
          if (response.data.teamMembers && Array.isArray(response.data.teamMembers)) {
            members = response.data.teamMembers;
          }
          // Legacy structure: { data: [...] }
          else if (Array.isArray(response.data)) {
            members = response.data;
          }
          // Nested data structure: { data: { data: [...] } }
          else if (response.data.data && Array.isArray(response.data.data)) {
            members = response.data.data;
          }
          else {
            console.warn('Unexpected response structure:', response.data);
            members = [];
          }

          console.log('Processing members:', members);

          // Transform members to expected structure
          const transformedMembers: TeamMember[] = members.map((member: any) => ({
            userId: member._id || member.userId || '',
            name: member.fullName || member.name || '',
            email: member.email || '',
            role: member.role || 'Agent',
            registrationDate: member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '',
            status: member.status || 'Active',
            phone: member.phoneNumber || member.phone || '',
            remarks: member.remarks || '',
            profileImage: member.profileImage || '',
            department: member.department || '',
            designation: member.designation || '',
            isSuperAdmin: member.isSuperAdmin || false,
            employeeId: member.employeeId || '',
            bankAccountNumber: member.bankAccountNumber || '',
            aadharNumber: member.aadharNumber || '',
            panNumber: member.panNumber || ''
          }));

          console.log('Transformed members:', transformedMembers);
          setTeamMembers(transformedMembers);
        } else {
          console.error('API response not successful:', response);
          throw new Error(response.message || 'Failed to fetch team members');
        }
      } catch (err) {
        console.error("Error fetching team members:", err);
        setError("Failed to load team members. Please try again.");
        // Ensure teamMembers is always an array
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatusUpdate = async (userId: string, newStatus: TeamMember["status"]) => {
    if (!userId) {
      toast.error("Invalid user ID");
      return;
    }

    // Check if user has permission to update status
    if (!currentUser.isSuperAdmin) {
      toast.error("Only Super Admins can update team member status");
      return;
    }

    try {
      setStatusUpdateLoading(true);

      console.log(`Updating status for user ${userId} to ${newStatus}`);

      // Use the correct team status update API
      await ServiceFactory.admin.updateAdminTeamMemberStatus(userId, newStatus);

      // Update local state with safety check
      setTeamMembers(prevMembers =>
        Array.isArray(prevMembers)
          ? prevMembers.map(member =>
            member.userId === userId ? { ...member, status: newStatus } : member
          )
          : []
      );

      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Filter team members based on search term with safety checks
  const filteredMembers = Array.isArray(teamMembers)
    ? teamMembers.filter(member => {
      if (!member) return false;

      const searchTermLower = searchTerm.toLowerCase();
      return (
        (member.userId || '').toLowerCase().includes(searchTermLower) ||
        (member.name || '').toLowerCase().includes(searchTermLower) ||
        (member.email || '').toLowerCase().includes(searchTermLower) ||
        (member.department || '').toLowerCase().includes(searchTermLower) ||
        (member.designation || '').toLowerCase().includes(searchTermLower) ||
        (member.employeeId || '').toLowerCase().includes(searchTermLower) ||
        (member.phone || '').toLowerCase().includes(searchTermLower)
      );
    })
    : [];

  return (
    <PermissionGuard permission="teamManagement">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600">Manage your team members and their permissions</p>
          </div>
          <SuperAdminOnly>
            <Button
              onClick={() => navigate('/admin/dashboard/teams/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </SuperAdminOnly>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by ID, name, or email"
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {error && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry Loading
            </Button>
          )}
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-red-50 border-red-200 p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Team Members</h3>
            <p className="text-red-700 text-center mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-red-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <TeamsTable
            data={filteredMembers}
            loading={loading}
            onStatusUpdate={handleStatusUpdate}
          />
        )}

        {statusUpdateLoading && (
          <div className="flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-purple-600">Updating status...</span>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
};

export default AdminTeamsPage;
