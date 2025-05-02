import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, BalanceHistoryEntry } from "@shared/schema";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Share, Upload, Trash2, FileType, Download, Printer, Eye, EyeOff, PlusCircle, MinusCircle } from "lucide-react";

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
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  
  // Balance adjustment state
  const [balanceAmount, setBalanceAmount] = useState<string>("");
  const [balanceType, setBalanceType] = useState<'add' | 'deduct'>('add');
  const [balanceNote, setBalanceNote] = useState<string>("");
  
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
  
  // Update user balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, type, note }: { userId: number; amount: number; type: 'add' | 'deduct'; note?: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/balance`, {
        amount,
        type,
        note
      });
      return res.json();
    },
    onSuccess: (updatedUser) => {
      // Update the editing user directly in the UI without waiting for a refetch
      setEditingUser(updatedUser);
      
      // Also invalidate the query to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      setBalanceAmount("");
      setBalanceNote("");
      toast({
        title: "Success",
        description: `Balance ${balanceType === 'add' ? 'increased' : 'decreased'} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update balance: ${error.message}`,
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
        // Get the latest business info from the current session
        // For simplicity, using Demo Business as value
        return {
          ...newData,
          businessName: "Demo Business",
          address: "123 Business St, Demo City, 12345", // Always set the default address for employees
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
    const submissionData = { ...formData } as any;
    
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
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };
  
  // Handle balance update
  const handleUpdateBalance = () => {
    if (!editingUser) return;
    
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }
    
    updateBalanceMutation.mutate({
      userId: editingUser.id,
      amount,
      type: balanceType,
      note: balanceNote
    });
  };
  
  // Handle balance type change
  const handleBalanceTypeChange = (type: 'add' | 'deduct') => {
    setBalanceType(type);
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="main">Main Information</TabsTrigger>
              <TabsTrigger value="balance">Balance</TabsTrigger>
              <TabsTrigger value="invitation">Invitation</TabsTrigger>
              <TabsTrigger value="login">Login History</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Left column - User Type and Profile Image */}
                  <div className="col-span-5">
                    {/* User Type */}
                    <div className="mb-4">
                      <Label className="mb-2 block" htmlFor="type">User Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={handleTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Profile Image */}
                    <div className="mt-4">
                      <Label className="mb-2 block" htmlFor="profileImage">Profile Image</Label>
                      <div>
                        <div className="flex items-center justify-center mb-4">
                          {/* Image preview area with drop zone - clickable */}
                          <div 
                            className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center overflow-hidden cursor-pointer"
                            onClick={handleImageButtonClick}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const file = e.dataTransfer.files[0];
                              if (file) {
                                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                                if (validTypes.includes(file.type)) {
                                  const imageUrl = URL.createObjectURL(file);
                                  setImagePreview(imageUrl);
                                  setFormData(prev => ({
                                    ...prev,
                                    profileImageUrl: imageUrl,
                                  }));
                                  toast({
                                    title: "Image uploaded",
                                    description: "Your profile image has been uploaded successfully",
                                  });
                                } else {
                                  toast({
                                    title: "Invalid file type",
                                    description: "Please upload a JPG, PNG, or WebP image",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            {imagePreview ? (
                              <img 
                                src={imagePreview} 
                                alt="Profile preview" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="text-center p-4">
                                <FileType className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">Drag & drop image</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          onChange={handleImageUpload}
                          accept="image/jpeg,image/png,image/webp"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          Accepted: JPG, PNG, WebP
                        </p>
                        {imagePreview && (
                          <div className="mt-2 flex justify-center">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={handleClearImage}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="mt-4">
                      <Label className="mb-2 block" htmlFor="isActive">Active Status</Label>
                      <div className="flex items-center space-x-2">
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

                  {/* Right column - User Details */}
                  <div className="col-span-7 space-y-4">
                    {/* Business Name */}
                    <div>
                      <Label className="mb-2 block" htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        name="businessName"
                        value={formData.businessName || ''}
                        onChange={handleInputChange}
                        required
                        readOnly={formData.type === 'employee'} // Read-only for employee type
                      />
                    </div>
                    
                    {/* Business Address */}
                    <div>
                      <Label className="mb-2 block" htmlFor="address">Business Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter business address"
                        readOnly={formData.type === 'employee'} // Read-only for employee type
                      />
                    </div>
                    
                    {/* Email */}
                    <div>
                      <Label className="mb-2 block" htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="email@example.com"
                      />
                    </div>
                    
                    {/* Phone Number */}
                    <div>
                      <Label className="mb-2 block" htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="e.g., +1 123-456-7890"
                      />
                    </div>
                    
                    {/* Password */}
                    <div>
                      <Label className="mb-2 block" htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder={editingUser ? "Leave blank to keep current password" : "Create a password"}
                          required={!editingUser}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Contact Person Name */}
                    <div>
                      <Label className="mb-2 block" htmlFor="name">Contact Person Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Full name"
                      />
                    </div>
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

            <TabsContent value="balance" className="mt-4">
              {editingUser ? (
                <div className="space-y-6">
                  {/* Balance card with user-type specific content */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {formData.type === 'customer' ? 'Customer Balance' : 
                         formData.type === 'vendor' ? 'Vendor Balance' : 'Employee Balance'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Current balance display with styling based on type */}
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium">
                            {formData.type === 'customer' ? 'Amount Owed:' : 
                             formData.type === 'vendor' ? 'Amount Payable:' : 'Current Salary:'}
                          </span>
                          <span className={`text-xl font-bold ${formData.type === 'customer' ? 'text-blue-600' : formData.type === 'vendor' ? 'text-orange-600' : 'text-green-600'}`}>
                            ${editingUser.balance || '0.00'}
                          </span>
                        </div>

                        {/* Balance history table */}
                        <div className="mt-4">
                          <h3 className="text-lg font-medium mb-2">Manual Balance History</h3>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Note</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {editingUser.balanceHistory && Array.isArray(editingUser.balanceHistory) && editingUser.balanceHistory.length > 0 ? (
                                  editingUser.balanceHistory.map((entry: BalanceHistoryEntry, index: number) => (
                                    <TableRow key={index}>
                                      <TableCell>{new Date(entry.date).toLocaleString()}</TableCell>
                                      <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${entry.type === 'add' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {entry.type === 'add' ? 'Increase' : 'Decrease'}
                                        </span>
                                      </TableCell>
                                      <TableCell>${entry.amount.toFixed(2)}</TableCell>
                                      <TableCell>{entry.note || '-'}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center">
                                      No balance history available
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Balance adjustment form */}
                        <div className="mt-6 p-4 border rounded-lg">
                          <h3 className="text-lg font-medium mb-4">Adjust Balance</h3>
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4">
                              <Label htmlFor="balanceType">Operation</Label>
                              <div className="flex mt-2 space-x-2">
                                <Button 
                                  type="button" 
                                  size="sm"
                                  variant={balanceType === 'add' ? 'default' : 'outline'}
                                  onClick={() => handleBalanceTypeChange('add')}
                                  className="flex-1"
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                                <Button 
                                  type="button" 
                                  size="sm"
                                  variant={balanceType === 'deduct' ? 'default' : 'outline'}
                                  onClick={() => handleBalanceTypeChange('deduct')}
                                  className="flex-1"
                                >
                                  <MinusCircle className="h-4 w-4 mr-1" />
                                  Deduct
                                </Button>
                              </div>
                            </div>
                            <div className="col-span-3">
                              <Label htmlFor="balanceAmount">Amount</Label>
                              <Input
                                id="balanceAmount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                                value={balanceAmount}
                                onChange={(e) => setBalanceAmount(e.target.value)}
                                className="mt-2"
                              />
                            </div>
                            <div className="col-span-5">
                              <Label htmlFor="balanceNote">Note (Optional)</Label>
                              <Input
                                id="balanceNote"
                                placeholder="Reason for adjustment"
                                value={balanceNote}
                                onChange={(e) => setBalanceNote(e.target.value)}
                                className="mt-2"
                              />
                            </div>
                            <div className="col-span-12 flex justify-end">
                              <Button 
                                type="button" 
                                onClick={handleUpdateBalance}
                                disabled={!balanceAmount || parseFloat(balanceAmount) <= 0 || updateBalanceMutation.isPending}
                              >
                                {updateBalanceMutation.isPending ? 'Updating...' : 'Update Balance'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <p>Save the user first to manage balance</p>
                </div>
              )}
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
