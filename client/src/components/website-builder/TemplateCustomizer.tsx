import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Template } from "@shared/schema";
import { createWebsite, defaultCustomization, TemplateCustomization } from "@/lib/templates";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Save, Eye, Upload, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface TemplateCustomizerProps {
  template: Template;
  onCancel: () => void;
}

// Form schema
const websiteFormSchema = z.object({
  name: z.string().min(2, "Website name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  domain: z.string().optional(),
  isActive: z.boolean().default(false),
});

export default function TemplateCustomizer({ template, onCancel }: TemplateCustomizerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [customization, setCustomization] = useState<TemplateCustomization>(defaultCustomization);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form for general website info
  const form = useForm<z.infer<typeof websiteFormSchema>>({
    resolver: zodResolver(websiteFormSchema),
    defaultValues: {
      name: "",
      description: "",
      domain: "",
      isActive: false,
    },
  });
  
  // Create website mutation
  const createWebsiteMutation = useMutation({
    mutationFn: async (data: any) => {
      return await createWebsite(data);
    },
    onSuccess: () => {
      toast({
        title: "Website created",
        description: "Your website has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      onCancel(); // Go back to templates/websites list
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create website. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Update customization
  const updateCustomization = (field: string, value: any) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Update nested customization
  const updateNestedCustomization = (section: string, field: string, value: any) => {
    setCustomization(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [field]: value
        }
      }
    }));
  };
  
  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you would upload the file to a server and get a URL
      // For this demo, create a data URL
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCustomization(prev => ({
            ...prev,
            logo: reader.result
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: z.infer<typeof websiteFormSchema>) => {
    setIsLoading(true);
    try {
      const websiteData = {
        ...data,
        templateId: template.id,
        customizations: customization
      };
      
      createWebsiteMutation.mutate(websiteData);
    } catch (error) {
      console.error("Error creating website:", error);
      toast({
        title: "Error",
        description: "Failed to create website. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
          <h2 className="text-xl font-semibold">Customizing: {template.name}</h2>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Create Website"}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left panel: Preview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>See how your website will look</CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <div className="relative bg-gray-100 h-[500px] flex items-center justify-center">
              <img 
                src={template.previewUrl} 
                alt={template.name} 
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <div className="text-center">
                  <p className="text-xl font-semibold mb-2">Live Preview Coming Soon</p>
                  <p>Your customizations will be applied to this template.</p>
                  <Button variant="outline" className="mt-4 text-white border-white hover:text-white hover:bg-white/20">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview in New Tab
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Right panel: Customization options */}
        <Card>
          <CardHeader>
            <CardTitle>Customize Website</CardTitle>
            <CardDescription>Personalize your website settings</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 w-full rounded-none border-b">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>
              
              {/* General tab */}
              <TabsContent value="general" className="p-4 pt-6">
                <Form {...form}>
                  <form className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Online Store" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter a description for your website" 
                              className="resize-none min-h-[80px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Domain (optional)</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                <Globe className="h-4 w-4" />
                              </span>
                              <Input 
                                placeholder="mystore.com" 
                                className="rounded-l-none"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Enter without http:// or https://
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Activate Website</FormLabel>
                            <FormDescription>
                              Make this website live and accessible to visitors
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </TabsContent>
              
              {/* Design tab */}
              <TabsContent value="design" className="p-4 pt-6 space-y-6">
                <div>
                  <Label className="block mb-2">Logo</Label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded border flex items-center justify-center bg-gray-50">
                      {customization.logo ? (
                        <img 
                          src={customization.logo} 
                          alt="Logo" 
                          className="max-w-full max-h-full object-contain" 
                        />
                      ) : (
                        <span className="text-gray-400">No logo</span>
                      )}
                    </div>
                    <div>
                      <Button variant="outline" size="sm" asChild>
                        <label className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Logo
                          <input 
                            type="file" 
                            className="sr-only" 
                            accept="image/*" 
                            onChange={handleLogoUpload}
                          />
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Color Scheme</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Primary Color</Label>
                      <div className="flex mt-1">
                        <input 
                          type="color" 
                          className="w-8 h-8 rounded-l border border-input" 
                          value={customization.colors.primary}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, primary: e.target.value })}
                        />
                        <Input 
                          value={customization.colors.primary}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, primary: e.target.value })}
                          className="rounded-l-none flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Secondary Color</Label>
                      <div className="flex mt-1">
                        <input 
                          type="color" 
                          className="w-8 h-8 rounded-l border border-input" 
                          value={customization.colors.secondary}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, secondary: e.target.value })}
                        />
                        <Input 
                          value={customization.colors.secondary}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, secondary: e.target.value })}
                          className="rounded-l-none flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Background Color</Label>
                      <div className="flex mt-1">
                        <input 
                          type="color" 
                          className="w-8 h-8 rounded-l border border-input" 
                          value={customization.colors.background}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, background: e.target.value })}
                        />
                        <Input 
                          value={customization.colors.background}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, background: e.target.value })}
                          className="rounded-l-none flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Text Color</Label>
                      <div className="flex mt-1">
                        <input 
                          type="color" 
                          className="w-8 h-8 rounded-l border border-input" 
                          value={customization.colors.text}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, text: e.target.value })}
                        />
                        <Input 
                          value={customization.colors.text}
                          onChange={(e) => updateCustomization('colors', { ...customization.colors, text: e.target.value })}
                          className="rounded-l-none flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Typography</Label>
                  <div className="space-y-2">
                    <Label className="text-xs">Heading Font</Label>
                    <Select 
                      value={customization.fonts.headings}
                      onValueChange={(value) => updateCustomization('fonts', { ...customization.fonts, headings: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Montserrat">Montserrat</SelectItem>
                        <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                        <SelectItem value="Poppins">Poppins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Body Font</Label>
                    <Select 
                      value={customization.fonts.body}
                      onValueChange={(value) => updateCustomization('fonts', { ...customization.fonts, body: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                        <SelectItem value="Lato">Lato</SelectItem>
                        <SelectItem value="Nunito">Nunito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              {/* Content tab */}
              <TabsContent value="content" className="p-4 pt-6 space-y-6">
                <div className="space-y-4">
                  <Label>Hero Section</Label>
                  <div className="space-y-2">
                    <Input 
                      placeholder="Hero Title" 
                      value={customization.sections.hero.title}
                      onChange={(e) => updateNestedCustomization('hero', 'title', e.target.value)}
                    />
                    <Input 
                      placeholder="Subtitle" 
                      value={customization.sections.hero.subtitle}
                      onChange={(e) => updateNestedCustomization('hero', 'subtitle', e.target.value)}
                    />
                    <Input 
                      placeholder="Button Text" 
                      value={customization.sections.hero.buttonText}
                      onChange={(e) => updateNestedCustomization('hero', 'buttonText', e.target.value)}
                    />
                    <div className="flex items-center space-x-2 pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <label className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          Hero Background
                          <input type="file" className="sr-only" accept="image/*" />
                        </label>
                      </Button>
                      <p className="text-xs text-gray-500">
                        Recommended size: 1600×800px
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Features Section</Label>
                  <Input 
                    placeholder="Section Title" 
                    value={customization.sections.features.title}
                    onChange={(e) => updateNestedCustomization('features', 'title', e.target.value)}
                  />
                  <div className="border rounded-md p-4 space-y-4">
                    <p className="text-sm font-medium">Feature Items</p>
                    {customization.sections.features.items.map((item, index) => (
                      <div key={index} className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0">
                        <Input 
                          placeholder={`Feature ${index + 1} Title`}
                          value={item.title}
                          onChange={(e) => {
                            const newItems = [...customization.sections.features.items];
                            newItems[index].title = e.target.value;
                            updateNestedCustomization('features', 'items', newItems);
                          }}
                        />
                        <Textarea 
                          placeholder="Description"
                          className="resize-none min-h-[60px]"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...customization.sections.features.items];
                            newItems[index].description = e.target.value;
                            updateNestedCustomization('features', 'items', newItems);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>About Section</Label>
                  <Input 
                    placeholder="Section Title" 
                    value={customization.sections.about.title}
                    onChange={(e) => updateNestedCustomization('about', 'title', e.target.value)}
                  />
                  <Textarea 
                    placeholder="About content" 
                    className="resize-none min-h-[100px]"
                    value={customization.sections.about.content}
                    onChange={(e) => updateNestedCustomization('about', 'content', e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Contact Section</Label>
                  <Input 
                    placeholder="Section Title" 
                    value={customization.sections.contact.title}
                    onChange={(e) => updateNestedCustomization('contact', 'title', e.target.value)}
                  />
                  <Input 
                    placeholder="Address" 
                    value={customization.sections.contact.address || ""}
                    onChange={(e) => updateNestedCustomization('contact', 'address', e.target.value)}
                  />
                  <Input 
                    placeholder="Phone Number" 
                    value={customization.sections.contact.phone || ""}
                    onChange={(e) => updateNestedCustomization('contact', 'phone', e.target.value)}
                  />
                  <Input 
                    placeholder="Email" 
                    value={customization.sections.contact.email || ""}
                    onChange={(e) => updateNestedCustomization('contact', 'email', e.target.value)}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="show-map"
                      checked={customization.sections.contact.showMap}
                      onCheckedChange={(value) => updateNestedCustomization('contact', 'showMap', value)}
                    />
                    <Label htmlFor="show-map" className="cursor-pointer">Show Map</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}