import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QRCodeSVG } from "qrcode.react";

// Shadcn UI components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Share } from "lucide-react";

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: User | null;
}

export default function UserModal({ open, onOpenChange, editingUser }: UserModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "customer",
    phone: "",
    address: "",
    businessName: "",
    profileImageUrl: "",
    isActive: true,
  });
  
  // Invitation token state
  const [invitationUrl, setInvitationUrl] = useState<string>("");
  
  // Reset form when user changes
  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || "",
        email: editingUser.email || "",
        type: editingUser.type || "customer",
        phone: editingUser.phone || "",
        address: editingUser.address || "",
        businessName: editingUser.businessName || "",
        profileImageUrl: editingUser.profileImageUrl || "",
        isActive: editingUser.isActive === null ? true : editingUser.isActive,
      });
      
      if (editingUser.invitationToken) {
        setInvitationUrl(`${window.location.origin}/register/invite/${editingUser.invitationToken}`);
      }
    } else {
      setFormData({
        name: "",
        email: "",
        type: "customer",
        phone: "",
        address: "",
        businessName: "Demo Business", // Default business name for new users
        profileImageUrl: "",
        isActive: true,
      });
      setInvitationUrl("");
    }
  }, [editingUser]);
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: any }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Generate invitation token mutation
  const generateInvitationMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/invitation`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setInvitationUrl(data.invitationUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Invitation token generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to generate invitation token: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Handle switch change
  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isActive: checked,
    }));
  };
  
  // Handle type change
  const handleTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      type: value,
      // Auto-fill business name for employees if not already set
      ...(value === 'employee' && (!prev.businessName || prev.businessName === "") ? { businessName: "Demo Business" } : {})
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        userData: formData,
      });
    } else {
      createUserMutation.mutate(formData);
    }
  };
  
  // Generate new invitation token
  const handleGenerateToken = () => {
    if (editingUser) {
      generateInvitationMutation.mutate(editingUser.id);
    }
  };
  
  // Share invitation link
  const handleShareLink = async () => {
    if (invitationUrl) {
      try {
        await navigator.clipboard.writeText(invitationUrl);
        toast({
          title: "Success",
          description: "Invitation link copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy invitation link",
          variant: "destructive",
        });
      }
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {editingUser ? 'Update user information' : 'Fill in the details to create a new user'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="main">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="main">Main Information</TabsTrigger>
              <TabsTrigger value="login">Login History</TabsTrigger>
              <TabsTrigger value="invitation">Invitation</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="type">Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                    readOnly={formData.type === 'employee'} // Read-only for employee type
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="col-span-3"
                    rows={3}
                    readOnly={formData.type === 'employee'} // Read-only for employee type
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="profileImageUrl">Profile Image URL</Label>
                  <Input
                    id="profileImageUrl"
                    name="profileImageUrl"
                    value={formData.profileImageUrl}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="https://example.com/profile.jpg"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="isActive">Active</Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={handleSwitchChange}
                    />
                    <span className="text-sm text-gray-500">
                      {formData.isActive ? 'User is active' : 'User is inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="login" className="mt-4">
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingUser && editingUser.loginHistory && Array.isArray(editingUser.loginHistory) && editingUser.loginHistory.length > 0 ? (
                        editingUser.loginHistory.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{new Date(entry.date).toLocaleString()}</TableCell>
                            <TableCell>{entry.ipAddress || '-'}</TableCell>
                            <TableCell>{entry.location || '-'}</TableCell>
                            <TableCell>{entry.userAgent || '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No login history available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="invitation" className="mt-4">
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="text-center">
                    <div className="my-4 flex justify-center">
                      {invitationUrl ? (
                        <QRCodeSVG value={invitationUrl} size={200} />
                      ) : (
                        <div className="w-[200px] h-[200px] bg-muted flex items-center justify-center">
                          <p className="text-muted-foreground">No invitation token generated</p>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-medium mt-2">Invitation Link</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {invitationUrl || 'Generate an invitation token first'}
                    </p>
                    <div className="flex space-x-2 justify-center">
                      <Button 
                        type="button" 
                        onClick={handleGenerateToken}
                        disabled={!editingUser || generateInvitationMutation.isPending}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate New Token
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleShareLink}
                        disabled={!invitationUrl}
                      >
                        <Share className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {createUserMutation.isPending || updateUserMutation.isPending ? 
                'Saving...' : 
                (editingUser ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
