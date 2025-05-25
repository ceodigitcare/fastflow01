import React, { useState, useEffect, useRef } from "react";
import { X, PackageCheck, DollarSign, ImageIcon, FileText, Plus, Minus, Upload } from "lucide-react";
import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

interface ProductPanelProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

// Product form schema
const productFormSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  sku: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  additionalImages: z.array(z.string()).optional(),
  inventory: z.coerce.number().min(0, "Inventory must be a positive number").default(0),
  inStock: z.boolean().default(true),
  hasVariants: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isOnSale: z.boolean().default(false),
  salePrice: z.coerce.number().min(0, "Sale price must be a positive number").optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductPanel({ 
  product, 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting 
}: ProductPanelProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);

  // Initialize form with product data if editing
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product ? product.price / 100 : 0, // Convert cents to dollars for display
      sku: product?.sku || "",
      category: product?.category || "",
      imageUrl: product?.imageUrl || "",
      inventory: product?.inventory || 0,
      inStock: product?.inStock ?? true,
      hasVariants: product?.hasVariants || false,
      isFeatured: product?.isFeatured || false,
      isOnSale: product?.isOnSale || false,
      salePrice: product?.salePrice ? product.salePrice / 100 : undefined, // Convert dollars to cents
    },
  });
  
  // Set up initial images and reset form when product changes
  useEffect(() => {
    if (product) {
      // Reset the form with product data
      form.reset({
        name: product.name || "",
        description: product.description || "",
        price: product.price / 100, // Convert cents to dollars for display
        sku: product.sku || "",
        category: product.category || "",
        imageUrl: product.imageUrl || "",
        inventory: product.inventory || 0,
        inStock: product.inStock ?? true,
        hasVariants: product.hasVariants || false,
        isFeatured: product.isFeatured || false,
        isOnSale: product.isOnSale || false,
        salePrice: product.salePrice ? product.salePrice / 100 : undefined, // Convert cents to dollars
      });
      
      // Set image states
      setUploadedImage(product.imageUrl || null);
      if (product.additionalImages && Array.isArray(product.additionalImages)) {
        setAdditionalImages(product.additionalImages as string[]);
      } else {
        setAdditionalImages([]);
      }
    } else {
      // Reset form and images for a new product
      form.reset({
        name: "",
        description: "",
        price: 0,
        sku: "",
        category: "",
        imageUrl: "",
        inventory: 0,
        inStock: true,
        hasVariants: false,
        isFeatured: false,
        isOnSale: false,
        salePrice: undefined,
      });
      setUploadedImage(null);
      setAdditionalImages([]);
    }
  }, [product, form]);

  // Reset tab when opening for a new product
  useEffect(() => {
    if (isOpen) {
      setActiveTab("general");
    }
  }, [isOpen, product]);

  // File upload handlers
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle main image drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Handle processing files for main image
  const handleFiles = (files: FileList) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const imageUrl = reader.result.toString();
        setUploadedImage(imageUrl);
        form.setValue("imageUrl", imageUrl);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Handle additional image drop
  const handleAdditionalImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAdditionalImageFiles(e.dataTransfer.files);
    }
  };
  
  // Handle additional image file input change
  const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleAdditionalImageFiles(e.target.files);
    }
  };
  
  // Process additional image files
  const handleAdditionalImageFiles = (files: FileList) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const imageUrl = reader.result.toString();
        const newAdditionalImages = [...additionalImages, imageUrl];
        setAdditionalImages(newAdditionalImages);
        form.setValue("additionalImages", newAdditionalImages);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Remove an additional image
  const handleRemoveAdditionalImage = (index: number) => {
    const newAdditionalImages = additionalImages.filter((_, i) => i !== index);
    setAdditionalImages(newAdditionalImages);
    form.setValue("additionalImages", newAdditionalImages);
  };
  
  // Handle inventory adjustment
  const handleAdjustInventory = (amount: number) => {
    const currentInventory = form.getValues("inventory") || 0;
    const newInventory = Math.max(0, currentInventory + amount); // Never go below 0
    form.setValue("inventory", newInventory);
  };

  // Main form submission handler
  const handleSubmit = (values: ProductFormValues) => {
    // Convert price to cents for storage
    const formattedValues = {
      ...values,
      price: Math.round(values.price * 100), // Convert dollars to cents
      salePrice: values.salePrice ? Math.round(values.salePrice * 100) : undefined, // Convert dollars to cents
      additionalImages: additionalImages,
    };
    onSubmit(formattedValues);
  };

  return (
    <div 
      className={cn(
        "fixed top-0 right-0 z-50 h-full bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out w-full max-w-md flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {product ? "Edit Product" : "Add New Product"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabbed Interface */}
      <Form {...form}>
        <form id="product-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="px-4 pt-2 bg-muted/20 border-b">
                <TabsTrigger value="general" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>General</span>
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Pricing</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-1">
                  <PackageCheck className="h-4 w-4" />
                  <span>Inventory</span>
                </TabsTrigger>
                <TabsTrigger value="images" className="flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" />
                  <span>Images</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-y-auto">
                {/* General Tab Content */}
                <TabsContent value="general" className="mt-0 p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter product description" 
                            className="resize-none min-h-[120px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="clothing">Clothing</SelectItem>
                            <SelectItem value="electronics">Electronics</SelectItem>
                            <SelectItem value="home">Home & Kitchen</SelectItem>
                            <SelectItem value="beauty">Beauty & Personal Care</SelectItem>
                            <SelectItem value="sports">Sports & Outdoors</SelectItem>
                            <SelectItem value="toys">Toys & Games</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Pricing Tab Content */}
                <TabsContent value="pricing" className="mt-0 p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            step="0.01"
                            min="0"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isOnSale"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>On Sale</FormLabel>
                          <FormDescription>
                            Mark this product as being on sale with a special price
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
                  
                  {form.watch("isOnSale") && (
                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Price ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              step="0.01"
                              min="0"
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            This price will be displayed as the current price, with the original price shown as strikethrough
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Featured Product</FormLabel>
                          <FormDescription>
                            Featured products will be displayed prominently on your website
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
                </TabsContent>
                
                {/* Inventory Tab Content */}
                <TabsContent value="inventory" className="mt-0 p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="SKU12345" {...field} />
                        </FormControl>
                        <FormDescription>
                          Stock Keeping Unit - unique identifier for your product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="inventory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inventory Quantity</FormLabel>
                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleAdjustInventory(-1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              step="1"
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleAdjustInventory(1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormDescription>
                          Use buttons to adjust quantity or enter a specific value
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="inStock"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>In Stock</FormLabel>
                          <FormDescription>
                            Toggle whether this product is currently in stock
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
                </TabsContent>
                
                {/* Images Tab Content */}
                <TabsContent value="images" className="mt-0 p-4 space-y-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Main Product Image</h3>
                    
                    {/* Main Image Upload Area */}
                    <div 
                      className={cn(
                        "border-2 border-dashed rounded-md p-6 transition-colors text-center flex flex-col items-center justify-center gap-2",
                        dragActive ? "border-primary bg-primary/5" : "border-border",
                        "hover:border-primary hover:bg-primary/5"
                      )}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                    >
                      {uploadedImage ? (
                        <div className="relative w-full max-w-xs">
                          <img 
                            src={uploadedImage} 
                            alt="Product preview" 
                            className="max-h-48 mx-auto object-contain rounded-md"
                            onError={(e) => {
                              e.currentTarget.src = "https://placehold.co/400x300?text=Image+Not+Found";
                            }}
                          />
                          <Button 
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => {
                              setUploadedImage(null);
                              form.setValue("imageUrl", "");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="bg-muted/30 p-4 rounded-full">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <img 
                            src="https://placehold.co/400x300?text=No+Image" 
                            alt="Placeholder" 
                            className="max-h-36 mx-auto object-contain rounded-md opacity-30 mt-2"
                          />
                          <p className="text-sm text-muted-foreground">
                            Drag and drop your product image here, or{" "}
                            <span 
                              className="text-primary cursor-pointer hover:underline"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              browse
                            </span>
                          </p>
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Recommended size: 800x800px. Maximum file size: 2MB.
                    </p>
                    
                    {/* Additional Images Section */}
                    <div className="mt-8">
                      <h3 className="text-sm font-medium mb-2">Additional Product Images</h3>
                      
                      {/* Additional Images Grid */}
                      {additionalImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                          {additionalImages.map((img, index) => (
                            <div key={index} className="relative border rounded-md p-2">
                              <img 
                                src={img} 
                                alt={`Product image ${index + 1}`} 
                                className="h-24 w-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = "https://placehold.co/400x300?text=Error";
                                }}
                              />
                              <Button 
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                                onClick={() => handleRemoveAdditionalImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Additional Image Upload */}
                      <div 
                        className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                        onClick={() => additionalFileInputRef.current?.click()}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleAdditionalImageDrop}
                      >
                        <Plus className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                        <p className="text-sm text-muted-foreground">Add another image</p>
                        <input 
                          ref={additionalFileInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={handleAdditionalImageChange}
                        />
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        You can add up to 5 additional product images
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          
          {/* Action Buttons */}
          <div className="p-4 border-t bg-background flex justify-end gap-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={onClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (product ? 'Save Changes' : 'Add Product')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}