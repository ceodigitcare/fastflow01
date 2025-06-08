import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Alert,
  AlertDescription,
  AlertTitle 
} from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Upload, Save, User, CreditCard, Bell, Smartphone, HelpCircle, CheckCircle, Palette } from "lucide-react";
import { insertPwaSettingsSchema } from "@shared/schema";

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  logoUrl: z.string().optional(),
  bio: z.string().optional(),
});

// PWA form schema
const pwaFormSchema = insertPwaSettingsSchema.omit({ businessId: true }).extend({
  appName: z.string().min(1, { message: "App name is required." }),
  shortName: z.string().max(12, { message: "Short name must be 12 characters or less." }).min(1, { message: "Short name is required." }),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Theme color must be a valid hex color." }),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Background color must be a valid hex color." }),
  iconUrl: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [pwaReadiness, setPwaReadiness] = useState<{
    https: boolean;
    manifest: boolean;
    serviceWorker: boolean;
    installable: boolean;
  } | null>(null);
  
  // Get business data
  const { data: business, isLoading } = useQuery({
    queryKey: ["/api/business"],
  });
  
  // Get PWA settings data
  const { data: pwaSettings, isLoading: isPwaLoading } = useQuery({
    queryKey: ["/api/pwa-settings"],
  });
  
  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: business?.name || "",
      email: business?.email || "",
      username: business?.username || "",
      logoUrl: business?.logoUrl || "",
      bio: "",
    },
  });
  
  // PWA form
  const pwaForm = useForm<z.infer<typeof pwaFormSchema>>({
    resolver: zodResolver(pwaFormSchema),
    defaultValues: {
      appName: pwaSettings?.appName || business?.name || "",
      shortName: pwaSettings?.shortName || business?.name?.substring(0, 12) || "",
      themeColor: pwaSettings?.themeColor || "#FFFFFF",
      backgroundColor: pwaSettings?.backgroundColor || "#FFFFFF",
      iconUrl: pwaSettings?.iconUrl || "",
    },
  });
  
  // Update profile when business data is loaded
  React.useEffect(() => {
    if (business) {
      profileForm.reset({
        name: business.name || "",
        email: business.email || "",
        username: business.username || "",
        logoUrl: business.logoUrl || "",
        bio: "",
      });
      
      if (business.logoUrl) {
        setLogoPreview(business.logoUrl);
      }
    }
  }, [business, profileForm]);

  // Update PWA form when data is loaded
  React.useEffect(() => {
    if (pwaSettings || business) {
      pwaForm.reset({
        appName: pwaSettings?.appName || business?.name || "",
        shortName: pwaSettings?.shortName || business?.name?.substring(0, 12) || "",
        themeColor: pwaSettings?.themeColor || "#FFFFFF",
        backgroundColor: pwaSettings?.backgroundColor || "#FFFFFF",
        iconUrl: pwaSettings?.iconUrl || "/icon-512.png",
      });
      
      if (pwaSettings?.iconUrl) {
        setIconPreview(pwaSettings.iconUrl);
      } else {
        setIconPreview("/icon-512.png");
      }
    }
  }, [pwaSettings, business, pwaForm]);
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      return await apiRequest("PATCH", "/api/business", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // PWA Settings mutations
  const createPwaSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pwaFormSchema>) => {
      return await apiRequest("POST", "/api/pwa-settings", data);
    },
    onSuccess: () => {
      toast({
        title: "PWA settings created",
        description: "Your PWA settings have been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pwa-settings"] });
    },
    onError: (error: any) => {
      console.error("PWA settings create error:", error);
      let errorMessage = "Failed to create PWA settings. Please try again.";
      
      if (error?.message) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = "Authentication failed. Please refresh the page and log in again.";
        } else if (error.message.includes('400')) {
          errorMessage = "Invalid data provided. Please check your inputs and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updatePwaSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pwaFormSchema>) => {
      return await apiRequest("PATCH", "/api/pwa-settings", data);
    },
    onSuccess: () => {
      toast({
        title: "PWA settings updated",
        description: "Your PWA settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pwa-settings"] });
      
      // Force refresh manifest and service worker
      setTimeout(() => {
        // Clear manifest cache by forcing a reload
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink) {
          const href = manifestLink.href;
          manifestLink.href = '';
          setTimeout(() => {
            manifestLink.href = href + '?v=' + Date.now();
          }, 100);
        }
        
        // Update service worker if available
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
              registration.update();
            });
          });
        }
      }, 500);
    },
    onError: (error: any) => {
      console.error("PWA settings update error:", error);
      let errorMessage = "Failed to update PWA settings. Please try again.";
      
      if (error?.message) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = "Authentication failed. Please refresh the page and log in again.";
        } else if (error.message.includes('400')) {
          errorMessage = "Invalid data provided. Please check your inputs and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would upload the file to a server and get the URL
      // For this demo, we'll just use a local URL
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      profileForm.setValue("logoUrl", url);
    }
  };

  // Handle PWA icon upload with proper file upload
  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show loading state with blob URL preview
      const tempUrl = URL.createObjectURL(file);
      setIconPreview(tempUrl);
      
      try {
        // Upload file to server
        const formData = new FormData();
        formData.append('icon', file);
        
        const response = await fetch('/api/upload/icon', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include session cookies
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const { iconUrl } = await response.json();
        
        // Update form with actual uploaded URL
        pwaForm.setValue("iconUrl", iconUrl);
        setIconPreview(iconUrl);
        
        // Clean up blob URL
        URL.revokeObjectURL(tempUrl);
        
        toast({
          title: "Icon uploaded",
          description: "Your PWA icon has been uploaded successfully.",
        });
      } catch (error) {
        console.error('Upload failed:', error);
        // Revert to previous icon on failure
        URL.revokeObjectURL(tempUrl);
        setIconPreview(pwaSettings?.iconUrl || "/icon-512.png");
        
        toast({
          title: "Upload failed",
          description: "Failed to upload icon. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Handle profile form submission
  const onProfileSubmit = (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };
  
  // Handle PWA form submission
  const onPwaSubmit = (data: z.infer<typeof pwaFormSchema>) => {
    console.log('PWA form submission data:', data);
    
    // Validate required fields
    if (!data.appName || !data.shortName) {
      toast({
        title: "Validation Error",
        description: "App Name and Short Name are required.",
        variant: "destructive",
      });
      return;
    }
    
    if (pwaSettings) {
      updatePwaSettingsMutation.mutate(data);
    } else {
      createPwaSettingsMutation.mutate(data);
    }
  };

  // Check PWA readiness
  React.useEffect(() => {
    const checkPwaReadiness = async () => {
      const readiness = {
        https: location.protocol === 'https:' || location.hostname === 'localhost',
        manifest: false,
        serviceWorker: 'serviceWorker' in navigator,
        installable: false,
      };

      // Check for manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      readiness.manifest = !!manifestLink;

      // Check if app is installable
      window.addEventListener('beforeinstallprompt', () => {
        readiness.installable = true;
        setPwaReadiness({ ...readiness });
      });

      setPwaReadiness(readiness);
    };

    checkPwaReadiness();
  }, []);
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and preferences</p>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="pwa" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">PWA</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="hidden sm:flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 10h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v6a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z"/>
            </svg>
            <span>API</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="hidden sm:flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span>Support</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="hidden sm:flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your business profile and information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-6 items-center mb-6">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={logoPreview || undefined} />
                          <AvatarFallback className="text-lg">{business?.name?.charAt(0) || "B"}</AvatarFallback>
                        </Avatar>
                        <label 
                          htmlFor="logo-upload" 
                          className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 cursor-pointer shadow-md hover:bg-primary-dark"
                        >
                          <Upload className="h-4 w-4" />
                          <input 
                            id="logo-upload" 
                            type="file" 
                            className="sr-only" 
                            accept="image/*" 
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="font-medium text-lg">{business?.name}</h3>
                        <p className="text-sm text-gray-500">{business?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Recommended image size: 200x200px. Max file size: 5MB.
                        </p>
                      </div>
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Tell customers about your business..." 
                              className="resize-none min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="flex items-center"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pwa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progressive Web App Configuration</CardTitle>
              <CardDescription>Configure your app for installation on mobile devices and desktop</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-none overflow-visible">
              {/* PWA Readiness Status */}
              {pwaReadiness && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    PWA Readiness Status
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center">
                      {pwaReadiness.https ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      HTTPS
                    </div>
                    <div className="flex items-center">
                      {pwaReadiness.manifest ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      Manifest
                    </div>
                    <div className="flex items-center">
                      {pwaReadiness.serviceWorker ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      Service Worker
                    </div>
                    <div className="flex items-center">
                      {pwaReadiness.installable ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                      )}
                      Installable
                    </div>
                  </div>
                </div>
              )}

              <Form {...pwaForm}>
                <form onSubmit={pwaForm.handleSubmit(onPwaSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={pwaForm.control}
                      name="appName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>App Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="My Business App" />
                          </FormControl>
                          <FormDescription>
                            The full name of your app as it appears to users
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={pwaForm.control}
                      name="shortName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Short Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="MyApp" maxLength={12} />
                          </FormControl>
                          <FormDescription>
                            Short name for home screen (max 12 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={pwaForm.control}
                      name="themeColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme Color</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input 
                                {...field} 
                                type="color" 
                                className="w-16 h-10 p-1 border-2" 
                              />
                              <Input 
                                {...field} 
                                placeholder="#FFFFFF" 
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Primary theme color for status bars and UI
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={pwaForm.control}
                      name="backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background Color</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input 
                                {...field} 
                                type="color" 
                                className="w-16 h-10 p-1 border-2" 
                              />
                              <Input 
                                {...field} 
                                placeholder="#FFFFFF" 
                                className="flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Background color shown while app loads
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={pwaForm.control}
                    name="iconUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Icon</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                              {iconPreview && (
                                <div className="relative">
                                  <img 
                                    src={iconPreview} 
                                    alt="App Icon Preview" 
                                    className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                    onClick={() => {
                                      setIconPreview("/icon-512.png");
                                      pwaForm.setValue("iconUrl", "/icon-512.png");
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              )}
                              <div className="flex-1">
                                <Input {...field} placeholder="Icon URL or upload below" readOnly className="sr-only" />
                                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                                  {field.value ? "Custom icon uploaded" : "Using default icon"}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                <div className="flex flex-col items-center">
                                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                  <span className="text-sm text-gray-500">Click to upload icon</span>
                                  <span className="text-xs text-gray-400">PNG, JPG (512x512 recommended)</span>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleIconChange}
                                />
                              </label>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Icon displayed on home screen and app stores (512x512 recommended)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="flex items-center"
                    disabled={createPwaSettingsMutation.isPending || updatePwaSettingsMutation.isPending || isPwaLoading}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {(createPwaSettingsMutation.isPending || updatePwaSettingsMutation.isPending) 
                      ? "Saving..." 
                      : pwaSettings 
                        ? "Update PWA Settings" 
                        : "Create PWA Settings"
                    }
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Manage your subscription and payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border p-4">
                <div className="flex flex-col sm:flex-row justify-between">
                  <div>
                    <h3 className="font-medium">Current Plan: Free</h3>
                    <p className="text-sm text-gray-500 mt-1">Basic features for small businesses</p>
                  </div>
                  <Button className="mt-4 sm:mt-0">Upgrade to Pro</Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Payment Methods</h3>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No payment methods</AlertTitle>
                  <AlertDescription>
                    You don't have any payment methods added yet. Add a payment method to upgrade to our Pro plan.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Order Notifications</h3>
                    <p className="text-sm text-gray-500">Get notified when new orders are placed</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Customer Chat Notifications</h3>
                    <p className="text-sm text-gray-500">Be alerted when customers start a chat</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Marketing Updates</h3>
                    <p className="text-sm text-gray-500">Receive marketing tips and product updates</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>Manage your API keys and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border p-4">
                <h3 className="font-medium mb-2">API Keys</h3>
                <div className="flex items-center justify-between">
                  <Input 
                    type="password" 
                    value="sk_test_api_key_here" 
                    className="font-mono"
                    readOnly
                  />
                  <Button variant="outline" className="ml-2">Show</Button>
                  <Button variant="outline" className="ml-2">Copy</Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This key gives access to all API endpoints. Keep it secure!
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Webhook Endpoints</h3>
                <div className="flex items-center">
                  <Input 
                    placeholder="https://your-website.com/webhook"
                    className="flex-1"
                  />
                  <Button className="ml-2">Add</Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Receive real-time updates for orders, customer chats, and more.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="destructive">Regenerate API Key</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
              <CardDescription>Get help with your StoreFront account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documentation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Explore our guides and examples to make the most of StoreFront.
                    </p>
                    <Button variant="outline" className="w-full">
                      View Documentation
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Having trouble? Our support team is here to help.
                    </p>
                    <Button variant="outline" className="w-full">
                      Contact Support
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Community</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Join our community forum to ask questions and share ideas.
                    </p>
                    <Button variant="outline" className="w-full">
                      Join Community
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Frequently Asked Questions</h3>
                <div className="space-y-2">
                  <div className="rounded-md border p-3">
                    <h4 className="font-medium">How do I connect a custom domain?</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      You can add your custom domain in the Website Builder section.
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <h4 className="font-medium">How do I set up the AI chatbot?</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Go to the AI Chatbot section and follow the setup instructions.
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <h4 className="font-medium">Can I export my financial data?</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Yes, you can export your financial data in CSV or PDF format.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced settings for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Data Privacy</h3>
                  <Select defaultValue="strict">
                    <SelectTrigger>
                      <SelectValue placeholder="Select privacy level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">Strict</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="permissive">Permissive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Control how customer data is collected and processed
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">AI Feature Usage</h3>
                    <p className="text-sm text-gray-500">Allow AI to learn from customer interactions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">Set Up</Button>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Account Deletion</h3>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account and all associated data
                  </p>
                  <Button variant="destructive" className="mt-2">Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
