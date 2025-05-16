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
import { RefreshCw, Share, Upload, Trash2, Eye, EyeOff, PlusCircle, MinusCircle } from "lucide-react";

interface VendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (vendor: User) => void;
  editingVendor?: User | null;
}

export default function VendorModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  editingVendor: initialVendor 
}: VendorModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Vendor state
  const [editingVendor, setEditingVendor] = useState<User | null>(initialVendor || null);
  
  // Form state - maintaining exact field order as specified
  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    email: "",
    phone: "",
    password: "",
    name: "", // Contact Person Name
    type: "vendor" as const, // Locked to vendor
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
  
  // Sync editingVendor when initialVendor changes
  useEffect(() => {
    setEditingVendor(initialVendor || null);
  }, [initialVendor]);
  
  // Reset form when local editingVendor state changes
  useEffect(() => {
    if (editingVendor) {
      setFormData({
        businessName: editingVendor.businessName || "",
        address: editingVendor.address || "",
        email: editingVendor.email || "",
        phone: editingVendor.phone || "",
        password: "", // Don't populate password for editing
        name: editingVendor.name || "",
        type: "vendor", // Always locked to vendor
        profileImageUrl: editingVendor.profileImageUrl || "",
        isActive: editingVendor.isActive === null ? true : editingVendor.isActive,
      });
      
      // Set image preview if profileImageUrl exists
      if (editingVendor.profileImageUrl) {
        setImagePreview(editingVendor.profileImageUrl);
      } else {
        setImagePreview(null);
      }
      
      if (editingVendor.invitationToken) {
        setInvitationUrl(`${window.location.origin}/register/invite/${editingVendor.invitationToken}`);
      }
    } else {
      setFormData({
        businessName: "",
        address: "",
        email: "",
        phone: "",
        password: "",
        name: "",
        type: "vendor", // Always locked to vendor
        profileImageUrl: "",
        isActive: true,
      });
      setImagePreview(null);
      setInvitationUrl("");
    }
  }, [editingVendor]);
  
  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: any) => {
      // Force the type to be vendor regardless of what might be sent
      const data = {
        ...vendorData,
        type: "vendor",
        businessId: 1 // Current business ID
      };
      
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create vendor: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, vendorData }: { id: number; vendorData: any }) => {
      // Force the type to be vendor
      const data = {
        ...vendorData,
        type: "vendor",
      };
      
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update vendor: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Generate invitation token mutation
  const generateInvitationMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      const res = await apiRequest("POST", `/api/users/${vendorId}/invitation`, {});
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
  
  // Update vendor balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, type, note }: { userId: number; amount: number; type: 'add' | 'deduct'; note?: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/balance`, {
        amount,
        type,
        note
      });
      return res.json();
    },
    onSuccess: (updatedVendor) => {
      // Update the editing vendor directly in the UI without waiting for a refetch
      setEditingVendor(updatedVendor);
      
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
    
    // Check for required fields
    if (!submissionData.name) {
      toast({
        title: "Missing information",
        description: "Contact Person Name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!submissionData.email) {
      toast({
        title: "Missing information",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    
    // If password is empty and we're editing, remove it to avoid overwriting
    if (editingVendor && !submissionData.password) {
      delete submissionData.password;
    }
    
    if (editingVendor) {
      updateVendorMutation.mutate({
        id: editingVendor.id,
        vendorData: submissionData,
      });
    } else {
      // Generate a random password if none is provided
      if (!submissionData.password) {
        submissionData.password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }
      createVendorMutation.mutate(submissionData);
    }
  };
  
  // Generate new invitation token
  const handleGenerateToken = () => {
    if (editingVendor) {
      generateInvitationMutation.mutate(editingVendor.id);
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
    if (!editingVendor) return;
    
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
      userId: editingVendor.id,
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
            {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
          </DialogTitle>
          <DialogDescription>
            {editingVendor ? 'Update vendor information' : 'Fill in the details to create a new vendor'}
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
                  {/* Left column - Profile Image */}
                  <div className="col-span-5">
                    {/* Profile Image */}
                    <div className="mb-4">
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
                              <div className="flex flex-col items-center text-gray-400">
                                <Upload className="h-8 w-8 mb-2" />
                                <span className="text-xs text-center px-2">Upload or drag & drop</span>
                              </div>
                            )}
                          </div>
                          <input 
                            type="file" 
                            id="profileImage"
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                          />
                        </div>
                        
                        {/* Image buttons */}
                        <div className="flex justify-center space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleImageButtonClick}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </Button>
                          {imagePreview && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={handleClearImage}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="mt-4">
                      <Label className="mb-2 block">Vendor Status</Label>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="isActive" 
                          checked={formData.isActive}
                          onCheckedChange={handleSwitchChange} 
                        />
                        <Label htmlFor="isActive" className="cursor-pointer">
                          {formData.isActive ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column - Vendor Info Fields - in EXACT specified order */}
                  <div className="col-span-7 grid gap-4">
                    {/* Business Name */}
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input 
                        id="businessName" 
                        name="businessName"
                        value={formData.businessName} 
                        onChange={handleInputChange}
                        placeholder="Enter business name"
                      />
                    </div>
                    
                    {/* Business Address */}
                    <div>
                      <Label htmlFor="address">Business Address</Label>
                      <Textarea 
                        id="address" 
                        name="address"
                        value={formData.address} 
                        onChange={handleInputChange}
                        placeholder="Enter business address"
                        rows={3}
                      />
                    </div>
                    
                    {/* Email */}
                    <div>
                      <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                      <Input 
                        id="email" 
                        name="email"
                        value={formData.email} 
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    
                    {/* Phone Number */}
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        name="phone"
                        value={formData.phone} 
                        onChange={handleInputChange}
                        placeholder="Enter phone number"
                      />
                    </div>
                    
                    {/* Password */}
                    <div>
                      <Label htmlFor="password">Password {!editingVendor && <span className="text-red-500">*</span>}</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password} 
                          onChange={handleInputChange}
                          placeholder={editingVendor ? "Leave blank to keep current password" : "Enter password"}
                          required={!editingVendor}
                        />
                        <button 
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Contact Person Name */}
                    <div>
                      <Label htmlFor="name">Contact Person Name <span className="text-red-500">*</span></Label>
                      <Input 
                        id="name" 
                        name="name"
                        value={formData.name} 
                        onChange={handleInputChange}
                        placeholder="Enter contact person name"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="balance" className="mt-4">
              <div className="grid gap-4">
                {editingVendor ? (
                  <>
                    {/* Current Balance */}
                    <div className="mb-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Current Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            ${editingVendor.balance ? editingVendor.balance.toFixed(2) : '0.00'}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Last updated: {editingVendor.updatedAt ? new Date(editingVendor.updatedAt).toLocaleDateString() : 'Never'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Balance Adjustment */}
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Adjust Balance</h3>
                      <div className="flex space-x-2 mb-4">
                        <Button 
                          type="button" 
                          variant={balanceType === 'add' ? 'default' : 'outline'} 
                          className="flex-1"
                          onClick={() => handleBalanceTypeChange('add')}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Funds
                        </Button>
                        <Button 
                          type="button" 
                          variant={balanceType === 'deduct' ? 'default' : 'outline'} 
                          className="flex-1"
                          onClick={() => handleBalanceTypeChange('deduct')}
                        >
                          <MinusCircle className="h-4 w-4 mr-2" />
                          Deduct Funds
                        </Button>
                      </div>
                      
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="balanceAmount">Amount</Label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                            <Input 
                              id="balanceAmount" 
                              value={balanceAmount} 
                              onChange={(e) => setBalanceAmount(e.target.value)}
                              placeholder="0.00"
                              className="pl-7"
                              type="number"
                              min="0.01"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="balanceNote">Note</Label>
                          <Textarea 
                            id="balanceNote" 
                            value={balanceNote} 
                            onChange={(e) => setBalanceNote(e.target.value)}
                            placeholder="Add a note for this adjustment"
                            rows={2}
                          />
                        </div>
                        <Button 
                          type="button" 
                          onClick={handleUpdateBalance}
                          disabled={updateBalanceMutation.isPending || !balanceAmount}
                        >
                          {updateBalanceMutation.isPending ? "Processing..." : "Update Balance"}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Balance History */}
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Balance History</h3>
                      <div className="border rounded-md">
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
                            {editingVendor.balanceHistory && Array.isArray(editingVendor.balanceHistory) && editingVendor.balanceHistory.length > 0 ? (
                              editingVendor.balanceHistory.map((entry: BalanceHistoryEntry, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    <span className={entry.type === 'add' ? 'text-green-600' : 'text-red-600'}>
                                      {entry.type === 'add' ? 'Credit' : 'Debit'}
                                    </span>
                                  </TableCell>
                                  <TableCell>${entry.amount.toFixed(2)}</TableCell>
                                  <TableCell>{entry.note || '-'}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                                  No balance history available
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-2">Balance Management</h3>
                      <p className="text-gray-500">
                        Balance management is available after vendor creation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="invitation" className="mt-4">
              <div className="grid gap-4">
                {editingVendor ? (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Invitation Link</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Generate and share an invitation link for this vendor to join your platform.
                      </p>
                      
                      {invitationUrl ? (
                        <div>
                          <div className="flex items-center mb-4">
                            <Input 
                              value={invitationUrl}
                              readOnly
                              className="flex-1 mr-2"
                            />
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={handleShareLink}
                            >
                              <Share className="h-4 w-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                          <div className="flex justify-center mb-4">
                            <div className="bg-white p-4 rounded-lg">
                              <QRCodeSVG 
                                value={invitationUrl} 
                                size={200}
                                level="H"
                              />
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="outline"
                            className="w-full"
                            onClick={handleGenerateToken}
                            disabled={generateInvitationMutation.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${generateInvitationMutation.isPending ? 'animate-spin' : ''}`} />
                            {generateInvitationMutation.isPending ? "Generating..." : "Generate New Link"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          type="button" 
                          onClick={handleGenerateToken}
                          disabled={generateInvitationMutation.isPending}
                        >
                          {generateInvitationMutation.isPending ? "Generating..." : "Generate Invitation Link"}
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-2">Invitations</h3>
                      <p className="text-gray-500">
                        Invitation management is available after vendor creation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="login" className="mt-4">
              <div className="grid gap-4">
                {editingVendor ? (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Login History</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>IP Address</TableHead>
                              <TableHead>Device</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingVendor.loginHistory && Array.isArray(editingVendor.loginHistory) && editingVendor.loginHistory.length > 0 ? (
                              editingVendor.loginHistory.map((login: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{new Date(login.timestamp).toLocaleString()}</TableCell>
                                  <TableCell>{login.ipAddress}</TableCell>
                                  <TableCell>{login.device || 'Unknown'}</TableCell>
                                  <TableCell>
                                    <span className={login.success ? 'text-green-600' : 'text-red-600'}>
                                      {login.success ? 'Success' : 'Failed'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                                  No login history available
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-2">Login History</h3>
                      <p className="text-gray-500">
                        Login history will be available after vendor creation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
            >
              {(createVendorMutation.isPending || updateVendorMutation.isPending) ? "Saving..." : 
                editingVendor ? "Save Changes" : "Create Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}