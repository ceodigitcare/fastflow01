import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef, useEffect } from "react";
import { Product, productVariantSchema } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { generateId } from "@/lib/utils";
import { Plus, Trash, Image, Upload, X, Edit, Package, Tag, RefreshCw } from "lucide-react";

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
  variants: z.array(productVariantSchema).optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product: Product | null;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function ProductForm({ product, onSubmit, onCancel, isSubmitting }: ProductFormProps) {
  // States for handling file uploads
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for variants management
  const [variantFormOpen, setVariantFormOpen] = useState(false);
  const [currentVariant, setCurrentVariant] = useState<z.infer<typeof productVariantSchema> | null>(null);
  const [availableAttributes, setAvailableAttributes] = useState<{ name: string, values: string[] }[]>([
    { name: "Color", values: ["Red", "Blue", "Green", "Black", "White"] },
    { name: "Size", values: ["Small", "Medium", "Large", "XL", "XXL"] },
    { name: "Material", values: ["Cotton", "Polyester", "Wool", "Leather", "Silk"] }
  ]);
  
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
      variants: product?.variants || [],
    },
  });
  
  // Set up initial images from product data
  useEffect(() => {
    if (product?.imageUrl) {
      setUploadedImage(product.imageUrl);
    }
    if (product?.additionalImages && Array.isArray(product.additionalImages)) {
      setAdditionalImages(product.additionalImages as string[]);
    }
  }, [product]);

  // Handler for drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handler for drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handler for file input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Handler for handling files
  const handleFiles = (files: FileList) => {
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        // For demo purposes: simulate URL creation (in a real app, this would upload to a server)
        const imageUrl = reader.result.toString();
        setUploadedImage(imageUrl);
        form.setValue("imageUrl", imageUrl);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Handler for adding additional images
  const handleAddAdditionalImage = (files: FileList) => {
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
  
  // Handler for removing an additional image
  const handleRemoveAdditionalImage = (index: number) => {
    const newAdditionalImages = additionalImages.filter((_, i) => i !== index);
    setAdditionalImages(newAdditionalImages);
    form.setValue("additionalImages", newAdditionalImages);
  };
  
  // Handler for adding a variant
  const handleAddVariant = (variant: z.infer<typeof productVariantSchema>) => {
    const currentVariants = form.getValues("variants") || [];
    const newVariants = [...currentVariants, variant];
    form.setValue("variants", newVariants);
    setVariantFormOpen(false);
    setCurrentVariant(null);
  };
  
  // Handler for editing a variant
  const handleEditVariant = (variant: z.infer<typeof productVariantSchema>, index: number) => {
    const currentVariants = form.getValues("variants") || [];
    const newVariants = [...currentVariants];
    newVariants[index] = variant;
    form.setValue("variants", newVariants);
    setVariantFormOpen(false);
    setCurrentVariant(null);
  };
  
  // Handler for removing a variant
  const handleRemoveVariant = (index: number) => {
    const currentVariants = form.getValues("variants") || [];
    const newVariants = currentVariants.filter((_, i) => i !== index);
    form.setValue("variants", newVariants);
  };
  
  // Handler for adjusting inventory
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
      additionalImages: additionalImages,
    };
    onSubmit(formattedValues);
  };
  
  // Get form values
  const watchHasVariants = form.watch("hasVariants");
  const variants = form.watch("variants") || [];
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            {watchHasVariants && <TabsTrigger value="variants">Variants</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
            </div>
            
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
              name="hasVariants"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>This product has multiple variants</FormLabel>
                    <FormDescription>
                      Enable this for products with different sizes, colors, etc.
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
          
          <TabsContent value="images" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Main Product Image</CardTitle>
                  <CardDescription>
                    Upload or drag and drop your main product image
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className={`border-2 border-dashed rounded-md ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'} h-[200px] flex items-center justify-center relative overflow-hidden`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadedImage ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={uploadedImage} 
                          alt="Product preview" 
                          className="w-full h-full object-contain"
                        />
                        <Button 
                          type="button"
                          size="icon"
                          variant="destructive" 
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedImage(null);
                            form.setValue("imageUrl", "");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Image className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-2">
                          <p className="text-sm font-medium">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="file-upload"
                      accept="image/*"
                      onChange={handleChange}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Images</CardTitle>
                  <CardDescription>
                    Add more images to showcase your product from different angles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {additionalImages.map((img, index) => (
                      <div key={index} className="relative h-20 border rounded-md overflow-hidden">
                        <img 
                          src={img} 
                          alt={`Additional ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <Button 
                          type="button"
                          size="icon"
                          variant="destructive" 
                          className="absolute top-0 right-0 h-5 w-5 p-0.5"
                          onClick={() => handleRemoveAdditionalImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {additionalImages.length < 6 && (
                      <div 
                        className="h-20 border border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            if (input.files && input.files[0]) {
                              handleAddAdditionalImage(input.files);
                            }
                          };
                          input.click();
                        }}
                      >
                        <Plus className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Or enter image URL</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="https://example.com/image.jpg" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value) {
                            setUploadedImage(e.target.value);
                          } else {
                            setUploadedImage(null);
                          }
                        }}
                      />
                      {field.value && !uploadedImage && (
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setUploadedImage(field.value)}
                        >
                          Preview
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inventory Management</CardTitle>
                <CardDescription>
                  Track and manage your product stock levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inventory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Inventory</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value >= 0) {
                                  field.onChange(value);
                                }
                              }}
                            />
                            <div className="flex gap-1">
                              <Button 
                                type="button" 
                                size="icon" 
                                variant="outline"
                                onClick={() => handleAdjustInventory(-1)}
                                disabled={field.value <= 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button 
                                type="button" 
                                size="icon" 
                                variant="outline"
                                onClick={() => handleAdjustInventory(1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="inStock"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-[74px]">
                        <div className="space-y-0.5">
                          <FormLabel>Available for Purchase</FormLabel>
                          <FormDescription>
                            Mark this product as available
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
                </div>
                
                <div className="p-4 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Inventory status will automatically update based on orders
                    </span>
                  </div>
                </div>
                
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Inventory Adjustment</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => handleAdjustInventory(5)}
                          >
                            Add 5 units
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => handleAdjustInventory(10)}
                          >
                            Add 10 units
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => handleAdjustInventory(-5)}
                            disabled={form.getValues("inventory") < 5}
                          >
                            Remove 5 units
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => handleAdjustInventory(-10)}
                            disabled={form.getValues("inventory") < 10}
                          >
                            Remove 10 units
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            placeholder="Custom amount" 
                            min="1"
                            id="custom-inventory-amount"
                          />
                          <Button 
                            type="button"
                            onClick={() => {
                              const input = document.getElementById("custom-inventory-amount") as HTMLInputElement;
                              const value = parseInt(input.value);
                              if (!isNaN(value) && value > 0) {
                                handleAdjustInventory(value);
                                input.value = "";
                              }
                            }}
                          >
                            Add
                          </Button>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const input = document.getElementById("custom-inventory-amount") as HTMLInputElement;
                              const value = parseInt(input.value);
                              if (!isNaN(value) && value > 0) {
                                handleAdjustInventory(-value);
                                input.value = "";
                              }
                            }}
                            disabled={form.getValues("inventory") <= 0}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
          
          {watchHasVariants && (
            <TabsContent value="variants" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Product Variants</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setCurrentVariant(null);
                        setVariantFormOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Variant
                    </Button>
                  </div>
                  <CardDescription>
                    Create and manage different versions of your product
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {variants.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-md">
                      <Package className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="mt-2 font-medium">No variants added yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Add variants like different sizes, colors, or materials
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setCurrentVariant(null);
                          setVariantFormOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Variant
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Variant Name</TableHead>
                            <TableHead>Attributes</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Price Adj.</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variants.map((variant, index) => (
                            <TableRow key={variant.id || index}>
                              <TableCell className="font-medium">{variant.name}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                  {Object.entries(variant.attributes || {}).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="whitespace-nowrap">
                                      {key}: {value}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>{variant.sku || '-'}</TableCell>
                              <TableCell>
                                {variant.price !== undefined ? (
                                  variant.price > 0 ? `+$${(variant.price / 100).toFixed(2)}` : `-$${Math.abs(variant.price / 100).toFixed(2)}`
                                ) : '-'}
                              </TableCell>
                              <TableCell>{variant.inventory !== undefined ? variant.inventory : '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setCurrentVariant(variant);
                                      setVariantFormOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => handleRemoveVariant(index)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Dialog open={variantFormOpen} onOpenChange={setVariantFormOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{currentVariant ? "Edit Variant" : "Add New Variant"}</DialogTitle>
                    <DialogDescription>
                      {currentVariant ? "Update this product variant's details." : "Create a new version of your product."}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <VariantForm 
                    variant={currentVariant}
                    availableAttributes={availableAttributes}
                    basePrice={form.getValues("price") * 100} // Convert to cents
                    onSubmit={(variant) => {
                      if (currentVariant) {
                        const variantIndex = variants.findIndex(v => v.id === currentVariant.id);
                        if (variantIndex !== -1) {
                          handleEditVariant(variant, variantIndex);
                        }
                      } else {
                        handleAddVariant(variant);
                      }
                    }}
                    onCancel={() => {
                      setVariantFormOpen(false);
                      setCurrentVariant(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}
        </Tabs>
        
        <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : product ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface VariantFormProps {
  variant: z.infer<typeof productVariantSchema> | null;
  availableAttributes: { name: string, values: string[] }[];
  basePrice: number; // In cents
  onSubmit: (variant: z.infer<typeof productVariantSchema>) => void;
  onCancel: () => void;
}

function VariantForm({ variant, availableAttributes, basePrice, onSubmit, onCancel }: VariantFormProps) {
  const [formData, setFormData] = useState<z.infer<typeof productVariantSchema>>({
    id: variant?.id || generateId(),
    name: variant?.name || "",
    sku: variant?.sku || "",
    price: variant?.price || 0,
    inventory: variant?.inventory || 0,
    imageUrl: variant?.imageUrl || "",
    attributes: variant?.attributes || {}
  });
  
  const [selectedAttributes, setSelectedAttributes] = useState<{ name: string, value: string }[]>(
    variant ? Object.entries(variant.attributes || {}).map(([name, value]) => ({ name, value })) : []
  );
  
  const [attributeName, setAttributeName] = useState("");
  const [attributeValue, setAttributeValue] = useState("");
  
  // Compute price display
  const computePriceDisplay = () => {
    const adjustmentCents = formData.price || 0;
    const totalPriceCents = basePrice + adjustmentCents;
    return {
      adjustment: (Math.abs(adjustmentCents) / 100).toFixed(2),
      total: (totalPriceCents / 100).toFixed(2),
      isPositive: adjustmentCents >= 0
    };
  };
  
  const priceInfo = computePriceDisplay();
  
  const handleAddAttribute = () => {
    if (attributeName && attributeValue) {
      const newAttribute = { name: attributeName, value: attributeValue };
      setSelectedAttributes([...selectedAttributes, newAttribute]);
      
      // Update attributes in formData
      const updatedAttributes = { ...formData.attributes, [attributeName]: attributeValue };
      setFormData({ ...formData, attributes: updatedAttributes });
      
      // Auto-generate name from attributes
      const variantName = Object.entries(updatedAttributes)
        .map(([key, value]) => `${value}`)
        .join(" / ");
      
      setFormData(prev => ({ ...prev, name: variantName }));
      
      // Reset inputs
      setAttributeName("");
      setAttributeValue("");
    }
  };
  
  const handleRemoveAttribute = (index: number) => {
    const attrToRemove = selectedAttributes[index];
    const newSelectedAttributes = selectedAttributes.filter((_, i) => i !== index);
    setSelectedAttributes(newSelectedAttributes);
    
    // Update attributes in formData
    const updatedAttributes = { ...formData.attributes };
    delete updatedAttributes[attrToRemove.name];
    setFormData({ ...formData, attributes: updatedAttributes });
    
    // Auto-update name from remaining attributes
    if (newSelectedAttributes.length > 0) {
      const variantName = newSelectedAttributes
        .map(attr => attr.value)
        .join(" / ");
      setFormData(prev => ({ ...prev, name: variantName }));
    } else {
      setFormData(prev => ({ ...prev, name: "" }));
    }
  };
  
  const handleFormChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Variant Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="e.g., Red Small"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              SKU (Optional)
            </label>
            <Input
              value={formData.sku || ""}
              onChange={(e) => handleFormChange("sku", e.target.value)}
              placeholder="SKU123-RED-S"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Price Adjustment ($)
            </label>
            <Input
              type="number"
              step="0.01"
              value={(formData.price || 0) / 100}
              onChange={(e) => {
                const dollars = parseFloat(e.target.value);
                const cents = Math.round(dollars * 100);
                handleFormChange("price", cents);
              }}
              placeholder="0.00"
            />
            <div className="text-xs text-gray-500">
              {priceInfo.isPositive ? 
                `+$${priceInfo.adjustment} (Total: $${priceInfo.total})` : 
                `-$${priceInfo.adjustment} (Total: $${priceInfo.total})`
              }
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Inventory
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.inventory || 0}
              onChange={(e) => handleFormChange("inventory", parseInt(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Attributes
            </label>
            <span className="text-xs text-gray-500">
              {selectedAttributes.length} of 5 max
            </span>
          </div>
          
          {selectedAttributes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedAttributes.map((attr, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {attr.name}: {attr.value}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleRemoveAttribute(index)}
                  />
                </Badge>
              ))}
            </div>
          )}
          
          {selectedAttributes.length < 5 && (
            <div className="flex gap-2">
              <Select value={attributeName} onValueChange={setAttributeName}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Attribute" />
                </SelectTrigger>
                <SelectContent>
                  {availableAttributes.map((attr) => (
                    <SelectItem key={attr.name} value={attr.name}>
                      {attr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={attributeValue} 
                onValueChange={setAttributeValue}
                disabled={!attributeName}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Value" />
                </SelectTrigger>
                <SelectContent>
                  {attributeName && availableAttributes
                    .find(attr => attr.name === attributeName)?.values
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              <Button 
                type="button" 
                size="icon" 
                onClick={handleAddAttribute}
                disabled={!attributeName || !attributeValue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Image URL (Optional)
          </label>
          <Input
            value={formData.imageUrl || ""}
            onChange={(e) => handleFormChange("imageUrl", e.target.value)}
            placeholder="https://example.com/variant-image.jpg"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {variant ? "Update Variant" : "Add Variant"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Utilities
function Minus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
    </svg>
  );
}
