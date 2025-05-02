import { useState, useEffect, useRef } from "react";
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
import { RefreshCw, Share, Upload, Trash2, FileType, Download, Printer } from "lucide-react";

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: User | null;
}

export default function UserModal({ open, onOpenChange, editingUser }: UserModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: "customer",
    businessName: "",
    address: "",
    phone: "",
    email: "",
    name: "",
    password: "",
    profileImageUrl: "",
    isActive: true,
  });
  
  // Image preview state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Invitation token state
  const [invitationUrl, setInvitationUrl] = useState<string>("");
  
  // Reset form when user changes
  useEffect(() => {
    if (editingUser) {
      setFormData({
        type: editingUser.type || "customer",
        businessName: editingUser.businessName || "",
        address: editingUser.address || "",
        phone: editingUser.phone || "",
        email: editingUser.email || "",
        name: editingUser.name || "",
        password: "", // Don't populate password for editing
        profileImageUrl: editingUser.profileImageUrl || "",
        isActive: editingUser.isActive === null ? true : editingUser.isActive,
      });
      
      // Set image preview if profileImageUrl exists
      if (editingUser.profileImageUrl) {
        setImagePreview(editingUser.profileImageUrl);
      } else {
        setImagePreview(null);
      }
      
      if (editingUser.invitationToken) {
        setInvitationUrl(`${window.location.origin}/register/invite/${editingUser.invitationToken}`);
      }
    } else {
      setFormData({
        type: "customer",
        businessName: "Demo Business", // Default business name for new users
        address: "",
        phone: "",
        email: "",
        name: "",
        password: "",
        profileImageUrl: "",
        isActive: true,
      });
      setImagePreview(null);
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
    setFormData(prev => {
      const newData = {
        ...prev,
        type: value,
      };
      
      // Auto-fill business name and address for employees
      if (value === 'employee') {
        return {
          ...newData,
          businessName: "Demo Business",
          address: prev.address || "123 Business St, Demo City, 12345",
        };
      }
      
      return newData;
    });
  };
  
  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive",
      });
      return;
    }
    
    // Create a URL for the file to preview
    const imageUrl = URL.createObjectURL(file);
    setImagePreview(imageUrl);
    
    // In a real implementation, you would upload the file to a server
    // For now, we'll just set the URL and simulate the upload
    toast({
      title: "Image uploaded",
      description: "Your profile image has been uploaded successfully",
    });
    
    // Set the URL in form data
    setFormData(prev => ({
      ...prev,
      profileImageUrl: imageUrl,
    }));
  };
  
  // Trigger file input click
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // Clear image
  const handleClearImage = () => {
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      profileImageUrl: "",
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a copy of form data for submission
    const submissionData = { ...formData };
    
    // If password is empty and we're editing, remove it to avoid overwriting
    if (editingUser && !submissionData.password) {
      delete submissionData.password;
    }
    
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        userData: submissionData,
      });
    } else {
      createUserMutation.mutate(submissionData);
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
      <DialogContent className="sm:max-w-[650px]">
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
                {/* User Type */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="type">User Type</Label>
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
                
                {/* Business Name */}
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
                
                {/* Business Address */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="address">Business Address</Label>
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
                
                {/* Phone Number */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder="e.g., +1 123-456-7890"
                  />
                </div>
                
                {/* Email */}
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
                    placeholder="email@example.com"
                  />
                </div>
                
                {/* Contact Person Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="name">Contact Person Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                    placeholder="Full name"
                  />
                </div>
                
                {/* Password */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="col-span-3"
                    placeholder={editingUser ? "Leave blank to keep current password" : "Create a password"}
                    required={!editingUser}
                  />
                </div>
                
                {/* Profile Image Upload */}
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right mt-2" htmlFor="profileImage">Profile Image</Label>
                  <div className="col-span-3">
                    <div className="flex flex-col items-center space-y-4">
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                        accept="image/jpeg,image/png,image/webp"
                      />
                      
                      {/* Image preview area */}
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center overflow-hidden">
                        {imagePreview ? (
                          <img 
                            src={imagePreview} 
                            alt="Profile preview" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-center p-4">
                            <FileType className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No image selected</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Upload buttons */}
                      <div className="flex space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleImageButtonClick}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </Button>
                        {imagePreview && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleClearImage}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Accepted formats: JPG, PNG, WebP
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Active Status */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="isActive">Active Status</Label>
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
                    <p className="text-sm text-muted-foreground mb-4 break-all px-4">
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
