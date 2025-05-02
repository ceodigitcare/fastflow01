import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Printer, FileDown, Edit, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserModal from "./UserModal";

interface UsersPanelProps {
  users: User[] | undefined;
  isLoading: boolean;
}

export default function UsersPanel({ users, isLoading }: UsersPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const tableRef = useRef<HTMLTableElement>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleAddUser = () => {
    setEditingUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserDialogOpen(true);
  };

  // Handle printing the user list
  const handlePrint = () => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin-bottom: 5px; }
        .status-active { color: green; }
        .status-inactive { color: gray; }
        .user-type { font-weight: bold; }
        @media print { body { margin: 0; padding: 15mm; } }
      </style>
      <div class="header">
        <h1>User Management Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
    
    // Create table with user data
    let table = '<table><thead><tr>';
    table += '<th>User Name</th><th>Business Name</th><th>User Type</th><th>Email</th><th>Phone</th><th>Status</th>';
    table += '</tr></thead><tbody>';
    
    users?.forEach(user => {
      table += '<tr>';
      table += `<td>${user.name}</td>`;
      table += `<td>${user.businessName || '-'}</td>`;
      table += `<td class="user-type">${user.type}</td>`;
      table += `<td>${user.email}</td>`;
      table += `<td>${user.phone || '-'}</td>`;
      table += `<td class="status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</td>`;
      table += '</tr>';
    });
    
    table += '</tbody></table>';
    printContent.innerHTML += table;
    
    // Create a new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.body.appendChild(printContent);
      printWindow.document.title = 'User Management Report';
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    } else {
      toast({
        title: "Print Error",
        description: "Unable to open print preview. Please check your popup blocker settings.",
        variant: "destructive",
      });
    }
  };

  // Export users to CSV
  const exportToCsv = () => {
    if (!users || users.length === 0) {
      toast({
        title: "Export Error",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }
    
    // Create CSV header row
    const headers = ['User Name', 'User Type', 'Email', 'Phone', 'Status', 'Business Name', 'Address'];
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    users.forEach(user => {
      const row = [
        `"${user.name?.replace(/"/g, '""') || ''}"`,
        `"${user.type?.replace(/"/g, '""') || ''}"`,
        `"${user.email?.replace(/"/g, '""') || ''}"`,
        `"${user.phone?.replace(/"/g, '""') || ''}"`,
        `"${user.isActive ? 'Active' : 'Inactive'}"`,
        `"${user.businessName?.replace(/"/g, '""') || ''}"`,
        `"${user.address?.replace(/"/g, '""') || ''}"`,
      ];
      csv += row.join(',') + '\n';
    });
    
    // Create and download the CSV file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `user_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (in a real app, you might use a library like jsPDF)
  const exportToPdf = () => {
    toast({
      title: "PDF Export",
      description: "PDF export initiated via printing functionality",
    });
    handlePrint(); // For simplicity, we'll use the print function which users can save as PDF
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage your customers, vendors, and employees</CardDescription>
          </div>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCsv}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPdf}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAddUser}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">User Name</th>
                  <th className="text-left py-3 px-4 font-medium">Business Name</th>
                  <th className="text-left py-3 px-4 font-medium">User Type</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">Loading users...</td>
                  </tr>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4">{user.businessName || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" 
                          style={{
                            backgroundColor: 
                              user.type === 'customer' ? 'rgba(var(--color-success), 0.1)' :
                              user.type === 'vendor' ? 'rgba(var(--color-info), 0.1)' :
                              'rgba(var(--color-warning), 0.1)',
                            color: 
                              user.type === 'customer' ? 'hsl(var(--success))' :
                              user.type === 'vendor' ? 'hsl(var(--info))' :
                              'hsl(var(--warning))'
                          }}
                        >
                          {user.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{user.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.invitationToken && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                window.open(`/register/invite/${user.invitationToken}`, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">No users found. Click "Add User" to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {users ? `Showing ${users.length} user${users.length !== 1 ? 's' : ''}` : 'No users to display'}
          </div>
        </CardFooter>
      </Card>

      {/* User Modal */}
      <UserModal
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        editingUser={editingUser}
      />


    </>
  );
}
