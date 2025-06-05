import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Smartphone, Upload, Palette, Type, Image } from "lucide-react";

const pwaConfigSchema = z.object({
  appName: z.string().min(1, "App name is required").max(50, "App name must be less than 50 characters"),
  shortName: z.string().min(1, "Short name is required").max(12, "Short name must be less than 12 characters"),
  themeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  appIconUrl: z.string().optional(),
});

type PwaConfigFormData = z.infer<typeof pwaConfigSchema>;

export default function PwaConfigPanel() {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const form = useForm<PwaConfigFormData>({
    resolver: zodResolver(pwaConfigSchema),
    defaultValues: {
      appName: "Business Manager",
      shortName: "Business",
      themeColor: "#000000",
      backgroundColor: "#ffffff",
      appIconUrl: "",
    },
  });

  const handleFileUpload = (file: File) => {
    if (!file.type.match(/^image\/(png|jpg|jpeg|svg\+xml)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or SVG file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    const fileUrl = URL.createObjectURL(file);
    form.setValue("appIconUrl", fileUrl);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: PwaConfigFormData) => {
      const response = await apiRequest("POST", "/api/pwa-config", {
        ...data,
        description: "Comprehensive business management application",
        enableNotifications: true,
        enableOfflineMode: true,
        autoUpdate: true,
      });
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
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PwaConfigFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="h-4 w-4" />
        <span>Configure your app for mobile installation and offline support</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* App Name */}
            <FormField
              control={form.control}
              name="appName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    App Name
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Business Manager" />
                  </FormControl>
                  <FormDescription>
                    Full name shown in install popup and launcher
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Short Name */}
            <FormField
              control={form.control}
              name="shortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Short Name
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Business" maxLength={12} />
                  </FormControl>
                  <FormDescription>
                    Short identifier for compact display (max 12 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Theme Color */}
            <FormField
              control={form.control}
              name="themeColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Theme Color
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input 
                        {...field} 
                        placeholder="#000000" 
                        className="flex-1"
                      />
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-12 h-10 border border-input rounded-md cursor-pointer"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Used in browser toolbar and splash screen
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Background Color */}
            <FormField
              control={form.control}
              name="backgroundColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Background Color
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input 
                        {...field} 
                        placeholder="#ffffff" 
                        className="flex-1"
                      />
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-12 h-10 border border-input rounded-md cursor-pointer"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Sets background color for splash screen
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* App Icon Upload */}
          <FormField
            control={form.control}
            name="appIconUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  App Icon
                </FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                        dragActive 
                          ? "border-primary bg-primary/5" 
                          : "border-muted-foreground/25 hover:border-primary/50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('icon-upload')?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {uploadedFile ? uploadedFile.name : "Drag & drop your app icon here"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Or click to browse files
                        </p>
                      </div>
                      <input
                        id="icon-upload"
                        type="file"
                        accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accepts .png, .jpg, .svg — Minimum size: 512x512 pixels
                    </p>
                    {field.value && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <img 
                          src={field.value} 
                          alt="App icon preview" 
                          className="w-8 h-8 rounded"
                        />
                        <span className="text-sm">Icon uploaded successfully</span>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="min-w-32"
            >
              {saveMutation.isPending ? "Saving..." : "Save PWA Settings"}
            </Button>
          </div>
        </form>
      </Form>

      {/* PWA Status Indicator */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>PWA Status</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Progressive Web App features are active. Your app can be installed on devices and works offline.
        </p>
      </div>
    </div>
  );
}