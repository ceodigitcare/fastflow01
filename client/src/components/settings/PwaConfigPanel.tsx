import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Smartphone, Download, Settings, Palette, Globe, Shield } from "lucide-react";

const pwaConfigSchema = z.object({
  appName: z.string().min(1, "App name is required").max(50, "App name must be less than 50 characters"),
  shortName: z.string().min(1, "Short name is required").max(12, "Short name must be less than 12 characters"),
  description: z.string().min(1, "Description is required").max(200, "Description must be less than 200 characters"),
  themeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  appIconUrl: z.string().url().optional().or(z.literal("")),
  enableNotifications: z.boolean(),
  enableOfflineMode: z.boolean(),
  autoUpdate: z.boolean(),
});

type PwaConfigFormData = z.infer<typeof pwaConfigSchema>;

export default function PwaConfigPanel() {
  const { toast } = useToast();
  const [isInstallPromptVisible, setIsInstallPromptVisible] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/pwa-config"],
    retry: false,
  });

  const form = useForm<PwaConfigFormData>({
    resolver: zodResolver(pwaConfigSchema),
    defaultValues: {
      appName: "Business Manager",
      shortName: "Business",
      description: "Comprehensive business management application",
      themeColor: "#000000",
      backgroundColor: "#ffffff",
      appIconUrl: "",
      enableNotifications: true,
      enableOfflineMode: true,
      autoUpdate: true,
    },
  });

  // Update form when config data is loaded
  React.useEffect(() => {
    if (config) {
      form.reset({
        appName: config.appName || "Business Manager",
        shortName: config.shortName || "Business",
        description: config.description || "Comprehensive business management application",
        themeColor: config.themeColor || "#000000",
        backgroundColor: config.backgroundColor || "#ffffff",
        appIconUrl: config.appIconUrl || "",
        enableNotifications: config.enableNotifications ?? true,
        enableOfflineMode: config.enableOfflineMode ?? true,
        autoUpdate: config.autoUpdate ?? true,
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: PwaConfigFormData) => {
      const response = await apiRequest("POST", "/api/pwa-config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pwa-config"] });
      toast({
        title: "PWA Configuration Saved",
        description: "Your Progressive Web App settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save PWA configuration",
        variant: "destructive",
      });
    },
  });

  const handleInstallApp = async () => {
    if ('serviceWorker' in navigator) {
      // Check if app is already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        toast({
          title: "Already Installed",
          description: "The app is already installed on this device.",
        });
        return;
      }

      // Trigger install prompt if available
      const event = (window as any).deferredPrompt;
      if (event) {
        event.prompt();
        const { outcome } = await event.userChoice;
        if (outcome === 'accepted') {
          toast({
            title: "App Installed",
            description: "The app has been installed successfully!",
          });
        }
        (window as any).deferredPrompt = null;
      } else {
        toast({
          title: "Manual Installation",
          description: "Please use your browser's 'Add to Home Screen' or 'Install App' option.",
        });
      }
    }
  };

  const onSubmit = (data: PwaConfigFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          Progressive Web App Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure your app to work as a Progressive Web App with offline capabilities and installable features.
        </p>
      </div>

      {/* App Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Installation Status
          </CardTitle>
          <CardDescription>
            Current PWA installation and feature status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">App Installation</p>
              <p className="text-sm text-muted-foreground">
                {window.matchMedia('(display-mode: standalone)').matches 
                  ? "App is installed and running in standalone mode"
                  : "App is running in browser mode"
                }
              </p>
            </div>
            <Badge variant={window.matchMedia('(display-mode: standalone)').matches ? "default" : "secondary"}>
              {window.matchMedia('(display-mode: standalone)').matches ? "Installed" : "Not Installed"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Service Worker</p>
              <p className="text-sm text-muted-foreground">
                {'serviceWorker' in navigator ? "Supported and available" : "Not supported in this browser"}
              </p>
            </div>
            <Badge variant={'serviceWorker' in navigator ? "default" : "destructive"}>
              {'serviceWorker' in navigator ? "Available" : "Unavailable"}
            </Badge>
          </div>

          <Separator />
          
          <Button onClick={handleInstallApp} className="w-full" disabled={window.matchMedia('(display-mode: standalone)').matches}>
            <Download className="h-4 w-4 mr-2" />
            {window.matchMedia('(display-mode: standalone)').matches ? "Already Installed" : "Install App"}
          </Button>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            App Configuration
          </CardTitle>
          <CardDescription>
            Customize your Progressive Web App settings and appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Business App" {...field} />
                        </FormControl>
                        <FormDescription>
                          Full name displayed when installing the app
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shortName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Business" maxLength={12} {...field} />
                        </FormControl>
                        <FormDescription>
                          Short name for home screen (max 12 chars)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Comprehensive business management application with financial tracking and inventory management"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of your app functionality
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Appearance */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Appearance</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="themeColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" className="w-16 h-10 p-1" {...field} />
                            <Input placeholder="#000000" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Primary theme color for the app
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="backgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" className="w-16 h-10 p-1" {...field} />
                            <Input placeholder="#ffffff" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Background color for splash screen
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="appIconUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Icon URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/icon.png" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL to your app icon (512x512 PNG recommended)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <h3 className="text-lg font-semibold">Features</h3>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Push Notifications</FormLabel>
                          <FormDescription>
                            Allow the app to send push notifications for important updates
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableOfflineMode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Offline Mode</FormLabel>
                          <FormDescription>
                            Enable offline functionality with cached data
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoUpdate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto Update</FormLabel>
                          <FormDescription>
                            Automatically update the app when new versions are available
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => form.reset()}
                  disabled={saveMutation.isPending}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}