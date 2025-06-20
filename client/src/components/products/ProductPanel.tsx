import React, { useState, useEffect, useRef } from "react";
import { X, PackageCheck, DollarSign, ImageIcon, FileText, Plus, Minus, Upload, Trash, PlusCircle, AlertCircle, Loader2, RefreshCw, HelpCircle, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { Product, ProductCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  SelectGroup,
  SelectLabel,
  SelectSeparator,
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

// Product form schema - inventory field only for editing existing products
const productFormSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  sku: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().optional().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Invalid URL" }
  ),
  additionalImages: z.array(z.string()).optional(),
  inventory: z.coerce.number().min(0, "Inventory must be a positive number").default(0).optional(),
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
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("general");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [inputTagValue, setInputTagValue] = useState("");
  
  // Variant management state
  interface VariantGroup {
    name: string;
    values: string[];
  }
  
  interface VariantOption {
    group: string;
    value: string;
  }
  
  interface VariantCombination {
    options: VariantOption[];
    sku: string;
    price?: number;
    inventory: number;
  }
  
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [newVariantValues, setNewVariantValues] = useState<string[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<VariantCombination[]>([]);
  const [skuDuplicates, setSkuDuplicates] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch product categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });
  
  // Add new category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/product-categories", { name });
      return await res.json();
    },
    onMutate: () => {
      setIsAddingCategory(true);
    },
    onSuccess: () => {
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      setCategoryError("");
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({
        title: "Category added",
        description: "Product category has been added successfully",
      });
      setIsAddingCategory(false);
    },
    onError: (error: Error) => {
      setCategoryError(error.message);
      toast({
        title: "Failed to add category",
        description: error.message,
        variant: "destructive"
      });
      setIsAddingCategory(false);
    }
  });
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      // When deleting a category, the backend will automatically reassign products 
      // to the default "Other" category
      await apiRequest("DELETE", `/api/product-categories/${categoryId}`);
    },
    onMutate: () => {
      setIsDeletingCategory(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // If the current product had the deleted category, update to "Other"
      const currentCategory = form.getValues("category");
      if (currentCategory) {
        // Check if current category matches the deleted one
        // If it does, reset to the default "Other" category
        const defaultCategory = categories.find(c => c.isDefault);
        if (defaultCategory) {
          form.setValue("category", defaultCategory.id.toString());
        }
      }
      
      toast({
        title: "Category deleted",
        description: "Category deleted and associated products moved to 'Other' category",
      });
      setIsDeletingCategory(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive"
      });
      setIsDeletingCategory(false);
    }
  });

  // Initialize form with product data if editing
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product ? product.price / 100 : 0, // Convert cents to dollars for display
      sku: product?.sku || "",
      category: product?.categoryId?.toString() || "",
      tags: product?.tags || [],
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
        category: product.categoryId?.toString() || "",
        tags: product.tags || [],
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
      
      // Load existing variants if they exist
      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        try {
          // Reconstruct variant groups from existing combinations
          const existingCombinations = product.variants as VariantCombination[];
          setVariantCombinations(existingCombinations);
          
          // Reconstruct variant groups from combinations
          const groupsMap = new Map<string, Set<string>>();
          existingCombinations.forEach(combo => {
            combo.options.forEach(option => {
              if (!groupsMap.has(option.group)) {
                groupsMap.set(option.group, new Set());
              }
              groupsMap.get(option.group)!.add(option.value);
            });
          });
          
          const reconstructedGroups: VariantGroup[] = Array.from(groupsMap.entries()).map(([name, valuesSet]) => ({
            name,
            values: Array.from(valuesSet)
          }));
          
          setVariantGroups(reconstructedGroups);
          setNewVariantValues(new Array(reconstructedGroups.length).fill(''));
          
          // Check for duplicate SKUs in existing variants
          checkForDuplicateSKUs(existingCombinations);
        } catch (error) {
          console.error('Error loading existing variants:', error);
          // Reset to empty state if there's an error
          setVariantGroups([]);
          setNewVariantValues([]);
          setVariantCombinations([]);
          setSkuDuplicates([]);
        }
      } else {
        // Reset variant management state for new products
        setVariantGroups([]);
        setNewVariantValues([]);
        setVariantCombinations([]);
        setSkuDuplicates([]);
      }
      
    } else {
      // Reset form and images for a new product
      form.reset({
        name: "",
        description: "",
        price: 0,
        sku: "",
        category: "",
        tags: [],
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
      
      // Reset variant management state for new products
      setVariantGroups([]);
      setNewVariantValues([]);
      setVariantCombinations([]);
      setSkuDuplicates([]);
    }
  }, [product, form]);

  // Reset tab when opening for a new product
  useEffect(() => {
    if (isOpen) {
      setActiveTab("general");
    }
  }, [isOpen, product]);
  
  // Watch for hasVariants changes to determine if we should show the variant UI
  useEffect(() => {
    const hasVariantsValue = form.watch("hasVariants");
    
    // When turning off variants, reset the variant state
    if (!hasVariantsValue) {
      setVariantGroups([]);
      setNewVariantValues([]);
      setVariantCombinations([]);
      setSkuDuplicates([]);
    }
  }, [form.watch("hasVariants")]);

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

  // Handle "Add Inventory" button click - navigate to purchase bill with pre-filled product
  const handleAddInventory = () => {
    if (product) {
      // Close the product panel
      onClose();
      // Navigate to purchase bill page
      // We'll pass the product ID as a query parameter to pre-fill the form
      navigate(`/finances/purchase-bill?preselect_product=${product.id}`);
    }
  };
  
  // Variant management functions
  const hasValidVariantGroups = variantGroups.length > 0 && 
    variantGroups.every(group => group.name.trim() && group.values.length > 0);
  
  // Add a new variant group (e.g., Size, Color)
  const handleAddVariantGroup = () => {
    // Limit to 3 variant types
    if (variantGroups.length >= 3) return;
    
    const newGroup: VariantGroup = {
      name: "",
      values: []
    };
    
    setVariantGroups([...variantGroups, newGroup]);
    setNewVariantValues([...newVariantValues, ""]);
  };
  
  // Update variant group name
  const handleVariantGroupNameChange = (groupIndex: number, name: string) => {
    const updatedGroups = [...variantGroups];
    updatedGroups[groupIndex].name = name;
    setVariantGroups(updatedGroups);
    
    // Update existing combinations if they exist
    if (variantCombinations.length > 0) {
      const updatedCombinations = variantCombinations.map(combo => {
        const updatedOptions = combo.options.map(option => {
          if (option.group === variantGroups[groupIndex].name) {
            return { ...option, group: name };
          }
          return option;
        });
        return { ...combo, options: updatedOptions };
      });
      setVariantCombinations(updatedCombinations);
    }
  };
  
  // Remove a variant group
  const handleRemoveVariantGroup = (groupIndex: number) => {
    const updatedGroups = variantGroups.filter((_, index) => index !== groupIndex);
    setVariantGroups(updatedGroups);
    
    // Reset combinations when a group is removed
    if (updatedGroups.length === 0) {
      setVariantCombinations([]);
    } else {
      // We could recalculate, but safer to just clear and let user regenerate
      setVariantCombinations([]);
    }
  };
  
  // Add a value to a variant group (e.g., add "Medium" to "Size")
  const handleAddVariantValue = (groupIndex: number, value: string) => {
    // Don't add empty or duplicate values
    if (!value.trim() || variantGroups[groupIndex].values.includes(value.trim())) {
      return;
    }
    
    const updatedGroups = [...variantGroups];
    updatedGroups[groupIndex].values.push(value.trim());
    setVariantGroups(updatedGroups);
    
    // Reset combinations when values change
    setVariantCombinations([]);
  };
  
  // Remove a value from a variant group
  const handleRemoveVariantValue = (groupIndex: number, valueIndex: number) => {
    const updatedGroups = [...variantGroups];
    updatedGroups[groupIndex].values.splice(valueIndex, 1);
    setVariantGroups(updatedGroups);
    
    // Reset combinations when values change
    setVariantCombinations([]);
  };
  
  // Generate all possible variant combinations
  const generateVariantCombinations = () => {
    if (!hasValidVariantGroups) return;
    
    // Helper function to generate all combinations recursively
    const generateCombos = (
      groups: VariantGroup[],
      currentIndex: number,
      currentCombo: VariantOption[] = []
    ): VariantOption[][] => {
      // Base case: we've processed all groups
      if (currentIndex >= groups.length) {
        return [currentCombo];
      }
      
      const currentGroup = groups[currentIndex];
      const results: VariantOption[][] = [];
      
      // For each value in the current group, create a new branch of combinations
      for (const value of currentGroup.values) {
        const newCombo = [
          ...currentCombo,
          { group: currentGroup.name, value }
        ];
        
        // Recursive call to process the next group with our current selection
        const combosWithThisValue = generateCombos(
          groups,
          currentIndex + 1,
          newCombo
        );
        
        results.push(...combosWithThisValue);
      }
      
      return results;
    };
    
    // Generate all option combinations
    const allOptionCombinations = generateCombos(variantGroups, 0);
    
    // Create variant combinations with default values
    const basePrice = form.getValues("price") || 0;
    const newCombinations = allOptionCombinations.map(options => {
      // Check if this combination already exists
      const existingCombo = variantCombinations.find(combo => 
        JSON.stringify(combo.options.map(o => ({ group: o.group, value: o.value }))) === 
        JSON.stringify(options.map(o => ({ group: o.group, value: o.value })))
      );
      
      // If it exists, keep its values, otherwise create a new one
      if (existingCombo) {
        return existingCombo;
      }
      
      const newCombo = {
        options,
        sku: "",
        price: undefined, // undefined means use the base product price
        inventory: 0
      };
      
      // Auto-generate SKU for new variants
      newCombo.sku = generateVariantSku(newCombo);
      
      return newCombo;
    });
    
    setVariantCombinations(newCombinations);
    
    // Check for duplicate SKUs
    checkForDuplicateSKUs(newCombinations);
  };
  
  // Helper function to check for duplicate SKUs
  const checkForDuplicateSKUs = (combinations: VariantCombination[]) => {
    const skus = combinations
      .map(combo => combo.sku)
      .filter(sku => sku && sku.trim() !== "");
      
    const duplicates = skus.filter((sku, index, self) => 
      sku && self.indexOf(sku) !== index
    );
    
    setSkuDuplicates(duplicates);
  };
  
  // Update a variant's SKU
  const handleVariantSkuChange = (index: number, sku: string) => {
    const updatedCombinations = [...variantCombinations];
    updatedCombinations[index].sku = sku;
    setVariantCombinations(updatedCombinations);
    
    // Check for duplicates
    checkForDuplicateSKUs(updatedCombinations);
  };
  
  // Update a variant's price
  const handleVariantPriceChange = (index: number, price: number | undefined) => {
    const updatedCombinations = [...variantCombinations];
    updatedCombinations[index].price = price;
    setVariantCombinations(updatedCombinations);
  };
  
  // Note: Inventory management for variants is handled through purchase bills only
  
  // Generate default SKU for a variant combination
  const generateVariantSku = (combo: VariantCombination) => {
    const baseSku = form.getValues("sku") || "PROD";
    const variantCode = combo.options
      .map(option => option.value.substring(0, 1).toUpperCase())
      .join("-");
    return `${baseSku}-${variantCode}`;
  };

  // Remove a variant combination
  const handleRemoveVariantCombination = (index: number) => {
    const updatedCombinations = variantCombinations.filter((_, i) => i !== index);
    setVariantCombinations(updatedCombinations);
    
    // Check for duplicates
    checkForDuplicateSKUs(updatedCombinations);
  };
  
  // Note: Inventory tracking for variants is managed through purchase bills
  
  // Get the total number of variant combinations
  const getVariantCombinationsCount = () => {
    if (variantGroups.length === 0) return 0;
    
    // Calculate the total possible combinations (multiply the number of values in each group)
    return variantGroups.reduce(
      (total, group) => total * (group.values.length || 1), 
      1
    );
  };

  // Add a tag to the tags array
  const handleAddTag = (tagValue: string) => {
    const tagText = tagValue.trim();
    if (!tagText) return;
    
    const currentTags = form.getValues("tags") || [];
    
    // Check if tag already exists (case insensitive)
    const tagExists = currentTags.some(
      (tag) => tag.toLowerCase() === tagText.toLowerCase()
    );
    
    if (!tagExists) {
      form.setValue("tags", [...currentTags, tagText]);
    }
    
    // Clear the input
    setInputTagValue("");
  };
  
  // Remove a tag from the tags array
  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };
  
  // Handle tag input keydown events
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      handleAddTag(inputTagValue);
    }
  };

  // Main form submission handler
  const handleSubmit = (values: ProductFormValues) => {
    console.log('Form submission started with values:', values);
    console.log('Form errors:', form.formState.errors);
    console.log('Form is valid:', form.formState.isValid);
    console.log('hasValidVariantGroups:', hasValidVariantGroups);
    console.log('variantCombinations:', variantCombinations);
    console.log('skuDuplicates:', skuDuplicates);
    
    // Convert price to cents for storage
    const formattedValues: any = {
      ...values,
      price: Math.round(values.price * 100), // Convert dollars to cents
      salePrice: values.salePrice ? Math.round(values.salePrice * 100) : undefined, // Convert dollars to cents
      additionalImages: additionalImages,
      imageUrl: values.imageUrl || null, // Convert empty string to null
    };

    // Handle inventory field based on product state
    if (!product) {
      // For new products: always set inventory to 0 (will be managed via purchase bills)
      formattedValues.inventory = 0;
    } else {
      // For existing products: exclude inventory field from submission (managed via purchase bills)
      delete formattedValues.inventory;
    }
    
    // Add variant data if hasVariants is enabled
    if (values.hasVariants && hasValidVariantGroups) {
      // Check if we have any duplicate SKUs before submitting
      if (skuDuplicates.length > 0) {
        toast({
          title: "Duplicate SKUs detected",
          description: "Please ensure all variant SKUs are unique before saving.",
          variant: "destructive"
        });
        return;
      }
      
      // Add variant combinations as a flat array to match database schema
      formattedValues.variants = variantCombinations.map(combo => ({
        ...combo,
        // Convert price from dollars to cents if defined
        price: combo.price !== undefined ? Math.round(combo.price * 100) : undefined
      }));
      
      // Note: Inventory for variants is managed through purchase bills only
    } else if (values.hasVariants === false) {
      // Clear variants if hasVariants is disabled
      formattedValues.variants = [];
    }
    
    console.log('Final formattedValues before submission:', formattedValues);
    onSubmit(formattedValues);
  };

  return (
    <div 
      className={cn(
        "fixed top-0 right-0 z-50 h-full bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out w-full max-w-md flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Panel Header - Fixed at top */}
      <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-30">
        <h2 className="text-lg font-semibold">
          {product ? "Edit Product" : "Add New Product"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main panel content with fixed header and footer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Form {...form}>
          <form id="product-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
            <div className="sticky top-[57px] z-20 bg-background border-b">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="px-4 pt-2 pb-1 w-full">
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
              </Tabs>
              {/* Added padding below tabs */}
              <div className="h-4"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto pb-[70px]">
              <Tabs value={activeTab}>
                <TabsContent value="general" className="ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-0 p-4 space-y-4 pt-[25px] pb-[25px] pl-[16px] pr-[16px]">
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
                            className="resize-y min-h-[80px] max-h-[160px]" 
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
                        <div className="space-y-3">
                          {/* Category selection dropdown - simplified to only show category names */}
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.length > 0 ? (
                                categories.map((category) => (
                                  <SelectItem 
                                    key={category.id} 
                                    value={category.id.toString()}
                                  >
                                    <span>{category.name}</span>
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="flex items-center justify-center p-2">
                                  <span className="text-sm text-muted-foreground">No categories found</span>
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          
                          {/* Category Management Section */}
                          <div className="rounded-md border border-border p-3 space-y-3">
                            <h4 className="text-sm font-medium mb-2">Category Management</h4>
                            
                            {/* Add New Category Section */}
                            {showNewCategoryInput ? (
                              <div className="space-y-3">
                                <Input
                                  placeholder="Enter new category name"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  className={categoryError ? "border-destructive" : ""}
                                />
                                {categoryError && (
                                  <p className="text-xs text-destructive mt-1">{categoryError}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Button 
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowNewCategoryInput(false);
                                      setNewCategoryName("");
                                      setCategoryError("");
                                    }}
                                    disabled={isAddingCategory}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      if (newCategoryName.trim()) {
                                        addCategoryMutation.mutate(newCategoryName.trim());
                                      } else {
                                        setCategoryError("Category name is required");
                                      }
                                    }}
                                    disabled={isAddingCategory}
                                    className="flex-1"
                                  >
                                    {isAddingCategory ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                      </>
                                    ) : "Add Category"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="w-full flex items-center justify-center gap-1"
                                onClick={() => setShowNewCategoryInput(true)}
                              >
                                <PlusCircle className="h-4 w-4" />
                                <span>Add New Category</span>
                              </Button>
                            )}
                            
                            {/* Delete Category Section */}
                            {categories.length > 1 && !showNewCategoryInput && (
                              <div className="pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground mb-2">
                                  Delete an existing category:
                                </p>
                                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                                  {categories
                                    .filter(category => !category.isDefault)
                                    .map(category => (
                                      <div 
                                        key={category.id}
                                        className="flex items-center justify-between rounded-md border border-border p-2"
                                      >
                                        <span className="text-sm">{category.name}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            if (confirm(`Are you sure you want to delete the "${category.name}" category? All products in this category will be moved to the "Other" category.`)) {
                                              deleteCategoryMutation.mutate(category.id);
                                            }
                                          }}
                                          disabled={isDeletingCategory}
                                        >
                                          <Trash className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    ))
                                  }
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  Note: "Other" category cannot be deleted. Products from deleted categories will be moved to "Other".
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* SEO Tags Field with Chip/Label Design */}
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Tags</FormLabel>
                        <FormDescription>
                          Add keywords to help customers find your product 
                          (press Enter, comma, or space to add)
                        </FormDescription>
                        
                        <div className="space-y-2">
                          <FormControl>
                            <Input
                              placeholder="e.g., modern, eco-friendly, bestseller"
                              value={inputTagValue}
                              onChange={(e) => setInputTagValue(e.target.value)}
                              onKeyDown={handleTagKeyDown}
                              onBlur={() => {
                                if (inputTagValue) handleAddTag(inputTagValue);
                              }}
                            />
                          </FormControl>
                          
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((tag, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm"
                                >
                                  <span>{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-secondary-foreground/70 hover:text-secondary-foreground rounded-full w-4 h-4 inline-flex items-center justify-center"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="pricing" className="ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-0 p-4 space-y-4 pt-[25px] pb-[25px] pl-[16px] pr-[16px]">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00" 
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>On Sale</FormLabel>
                          <FormDescription>
                            Mark this product as being on sale
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
                              min="0" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                              value={field.value === undefined ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* SKU field has been moved to the Inventory tab */}
                </TabsContent>
                
                <TabsContent value="inventory" className="ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-0 p-4 space-y-4 pt-[25px] pb-[25px] pl-[16px] pr-[16px]">
                  {/* Added space for better visual separation */}
                  <div className="h-3"></div>
                  
                  {/* Live Available Inventory Display - Only for existing products */}
                  {product && (
                    <div className="bg-muted/40 rounded-lg p-3 mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-primary" />
                        <span className="font-medium">
                          Available Inventory: {product.inventory || 0}
                        </span>
                      </div>
                      <Badge variant={form.watch("inStock") ? "default" : "destructive"}>
                        {form.watch("inStock") ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="inStock"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>In Stock</FormLabel>
                          <FormDescription>
                            Is this product currently available for purchase?
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
                  
                  {/* SKU field moved from Pricing tab */}
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                        <FormDescription>
                          Optional unique identifier for this product
                        </FormDescription>
                        <FormControl>
                          <Input placeholder="e.g., PROD-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Inventory Management - Different UI for new vs existing products */}
                  {product ? (
                    // For existing products: Show "Add Inventory" button
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Inventory Management</h3>
                        <Badge variant={form.watch("inStock") ? "default" : "destructive"}>
                          {form.watch("inStock") ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        To add inventory, create a purchase bill with this product. This ensures proper inventory tracking and cost management.
                      </p>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleAddInventory}
                        className="w-full"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add Inventory via Purchase Bill
                      </Button>
                    </div>
                  ) : (
                    // For new products: No inventory field - explain workflow
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Inventory Setup</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        After creating this product, you can add inventory by creating purchase bills. This ensures proper cost tracking and inventory management from the start.
                      </p>
                      <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                        <strong>Next steps:</strong> Create product → Go to Purchase Bills → Add inventory with supplier details
                      </div>
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="hasVariants"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Has Variants</FormLabel>
                          <FormDescription>
                            Does this product come in different variations? (e.g., sizes, colors)
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
                  
                  {/* Existing Variants Display */}
                  {form.watch("hasVariants") && variantCombinations.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <PackageCheck className="h-4 w-4" />
                          Existing Product Variants
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {variantCombinations.length} Variants
                        </Badge>
                      </div>
                      
                      <div className="rounded-lg border overflow-hidden">
                        <div className="bg-muted/30 px-4 py-2 border-b">
                          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                            <div className="col-span-4">Variant</div>
                            <div className="col-span-3">SKU</div>
                            <div className="col-span-3">Price</div>
                            <div className="col-span-2 text-center">Delete</div>
                          </div>
                        </div>
                        
                        <div className="divide-y">
                          {variantCombinations.map((combo, index) => (
                            <div key={index} className="px-4 py-3 hover:bg-muted/20">
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4">
                                  <div className="flex flex-wrap gap-1">
                                    {combo.options.map((option, optIndex) => (
                                      <Badge key={optIndex} variant="secondary" className="text-xs">
                                        {option.group}: {option.value}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="col-span-3">
                                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                    {combo.sku || generateVariantSku(combo)}
                                  </code>
                                </div>
                                <div className="col-span-3">
                                  <span className="text-sm font-medium">
                                    ${Number(combo.price ?? form.watch("price") ?? 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleRemoveVariantCombination(index)}
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <PackageCheck className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">Inventory Management</span>
                        </div>
                        <p className="text-blue-700">
                          Inventory for variants is managed through purchase bills. Create purchase bills to add stock for each variant.
                        </p>
                      </div>
                    </div>
                  )}

                  {form.watch("hasVariants") && (
                    <div className="space-y-4 border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <PackageCheck className="h-4 w-4" />
                            {variantCombinations.length > 0 ? "Manage Variants" : "Variant Management"}
                          </h3>
                          
                          {/* Help button with tooltip */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-full"
                            title="Learn how to use product variants"
                            onClick={() => {
                              // Open the help modal
                              document.getElementById('variant-help-modal')?.click();
                            }}
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getVariantCombinationsCount()} Combinations
                        </Badge>
                      </div>
                      
                      {/* Hidden dialog trigger and content - separated to avoid runtime error */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <button id="variant-help-modal" className="hidden">Open Help</button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <PackageCheck className="h-5 w-5" />
                              How to Use Product Variants
                            </DialogTitle>
                            <DialogDescription>
                              Create different versions of your product with unique pricing and inventory
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <h4 className="font-medium">What are variants?</h4>
                              <p className="text-sm text-muted-foreground">
                                Variants let you sell different versions of the same product (like different sizes or colors) 
                                with unique SKUs, prices, and inventory tracking.
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium">Quick Start Guide</h4>
                              <ol className="text-sm text-muted-foreground space-y-2 ml-5 list-decimal">
                                <li>Click <strong>"Add Variant Type"</strong> button</li>
                                <li>Enter a variant name (like "Size")</li>
                                <li>Add values (like "Small", "Medium", "Large")</li>
                                <li>(Optional) Add another variant type (like "Color")</li>
                                <li>Click <strong>"Generate All"</strong> (or "Generate More") to create combinations</li>
                              </ol>
                            </div>
                            
                            <div className="bg-muted/40 p-3 rounded-md space-y-2">
                              <h4 className="font-medium">Example</h4>
                              <div>
                                <p className="text-sm">If you add:</p>
                                <ul className="text-sm ml-5 list-disc">
                                  <li><strong>Size</strong>: Small, Medium, Large</li>
                                  <li><strong>Color</strong>: Red, Blue</li>
                                </ul>
                                <p className="text-sm mt-2">
                                  The system generates 6 combinations (3 sizes × 2 colors)
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium">For each combination, you can set:</h4>
                              <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                                <li><strong>SKU</strong> (optional): A unique identifier for inventory tracking</li>
                                <li><strong>Price</strong> (optional): A specific price that overrides the base product price</li>
                                <li><strong>Inventory</strong>: How many units are in stock</li>
                              </ul>
                            </div>
                            
                            <div className="border-t pt-2">
                              <h4 className="font-medium">Managing Your Variants</h4>
                              <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                                <li>Once created, view all variants in the <strong>Inventory tab</strong></li>
                                <li>Leave the price field empty to use the main product price</li>
                                <li>Each SKU must be unique across all variants</li>
                                <li>Inventory for variants is managed through purchase bills only</li>
                              </ul>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button">Close</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <div className="text-xs text-muted-foreground">
                        Add variant types like Size or Color to offer different versions of this product.
                      </div>
                      
                      {/* Collapsible Variant Types Section */}
                      <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1" className="border rounded-md">
                          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                            <span className="flex items-center gap-2">
                              <PlusCircle className="h-4 w-4" />
                              Variant Types
                              <Badge className="ml-2 text-xs">{variantGroups.length}</Badge>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3 pt-0">
                            <div className="space-y-3">
                              {variantGroups.length > 0 ? (
                                <div className="space-y-3">
                                  {variantGroups.map((group, groupIndex) => (
                                    <div key={groupIndex} className="border rounded-md p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Input 
                                            value={group.name}
                                            onChange={(e) => handleVariantGroupNameChange(groupIndex, e.target.value)}
                                            className="h-7 text-sm w-[120px] font-medium"
                                            placeholder="Type name..."
                                          />
                                          <Badge variant="secondary" className="text-xs">
                                            {group.values.length} options
                                          </Badge>
                                        </div>
                                        <Button 
                                          type="button" 
                                          size="icon" 
                                          variant="ghost" 
                                          className="h-6 w-6"
                                          onClick={() => handleRemoveVariantGroup(groupIndex)}
                                        >
                                          <Trash className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1">
                                          {group.values.map((value, valueIndex) => (
                                            <div key={valueIndex} className="relative group">
                                              <Badge variant="outline" className="text-xs pr-6">
                                                {value}
                                                <Button 
                                                  type="button" 
                                                  size="icon" 
                                                  variant="ghost" 
                                                  className="absolute right-0 top-0 h-full w-5 p-0 opacity-50 group-hover:opacity-100"
                                                  onClick={() => handleRemoveVariantValue(groupIndex, valueIndex)}
                                                >
                                                  <X className="h-2.5 w-2.5" />
                                                </Button>
                                              </Badge>
                                            </div>
                                          ))}
                                          <div className="inline-flex">
                                            <Input
                                              value={newVariantValues[groupIndex] || ''}
                                              onChange={(e) => {
                                                const updatedValues = [...newVariantValues];
                                                updatedValues[groupIndex] = e.target.value;
                                                setNewVariantValues(updatedValues);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newVariantValues[groupIndex]?.trim()) {
                                                  handleAddVariantValue(groupIndex, newVariantValues[groupIndex].trim());
                                                  const updatedValues = [...newVariantValues];
                                                  updatedValues[groupIndex] = '';
                                                  setNewVariantValues(updatedValues);
                                                }
                                              }}
                                              className="h-6 text-xs w-24 min-w-0"
                                              placeholder="Add value..."
                                            />
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-1"
                                              onClick={() => {
                                                if (newVariantValues[groupIndex]?.trim()) {
                                                  handleAddVariantValue(groupIndex, newVariantValues[groupIndex].trim());
                                                  const updatedValues = [...newVariantValues];
                                                  updatedValues[groupIndex] = '';
                                                  setNewVariantValues(updatedValues);
                                                }
                                              }}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        {group.values.length === 0 && (
                                          <p className="text-xs text-destructive">
                                            Add at least one value
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {variantGroups.length < 3 && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full"
                                      onClick={handleAddVariantGroup}
                                    >
                                      <PlusCircle className="h-4 w-4 mr-2" />
                                      Add Another Variant Type
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-4 space-y-3">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleAddVariantGroup}
                                  >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Variant Type
                                  </Button>
                                  <p className="text-xs text-muted-foreground text-center max-w-[240px]">
                                    Example: Size (S, M, L) or Color (Red, Blue, Black)
                                  </p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      
                      {/* Variant Combinations Section */}
                      {hasValidVariantGroups && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Variant Combinations</h4>
                            <Button 
                              type="button" 
                              size="sm" 
                              variant="outline"
                              onClick={generateVariantCombinations}
                              className="text-xs h-7"
                              disabled={!hasValidVariantGroups}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {variantCombinations.length > 0 ? "Generate More" : "Generate All"}
                            </Button>
                          </div>
                          
                          <div className="border rounded-md">
                            <div className="grid grid-cols-[2.5fr,1fr,1fr,auto] gap-2 p-2 bg-muted/30 border-b text-xs font-medium">
                              <div>Variant</div>
                              <div>SKU</div>
                              <div>Purchase Price ($)</div>
                              <div></div>
                            </div>
                            
                            <div className="max-h-[250px] overflow-y-auto">
                              {variantCombinations.length > 0 ? (
                                variantCombinations.map((combo, index) => (
                                  <div 
                                    key={index} 
                                    className={cn(
                                      "grid grid-cols-[2.5fr,1fr,1fr,auto] gap-2 p-2 items-center border-b",
                                      index % 2 === 0 ? "bg-muted/10" : ""
                                    )}
                                  >
                                    <div>
                                      <div className="flex flex-wrap items-center gap-1">
                                        {combo.options.map((option, i) => (
                                          <Badge key={i} variant="secondary" className="text-xs">
                                            {option.value}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <Input 
                                        value={combo.sku || ''} 
                                        onChange={(e) => handleVariantSkuChange(index, e.target.value)}
                                        placeholder={generateVariantSku(combo)} 
                                        className="h-7 text-xs" 
                                      />
                                      {skuDuplicates.includes(combo.sku) && (
                                        <p className="text-xs text-destructive mt-1">Duplicate SKU</p>
                                      )}
                                    </div>
                                    <div>
                                      <div className="h-7 px-2 py-1 bg-muted/40 rounded text-xs flex items-center text-muted-foreground">
                                        ${Number(combo.price ?? form.watch("price") ?? 0).toFixed(2)}
                                      </div>
                                    </div>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-7"
                                      onClick={() => handleRemoveVariantCombination(index)}
                                    >
                                      <Trash className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  {hasValidVariantGroups ? 
                                    "Click 'Generate All' to create variant combinations" : 
                                    "Add valid variant types to generate combinations"}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {variantCombinations.length > 0 && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div>
                                Total variants: <strong>{variantCombinations.length}</strong>
                              </div>
                              {skuDuplicates.length > 0 && (
                                <p className="text-destructive">
                                  {skuDuplicates.length} duplicate SKUs found
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Featured Product</FormLabel>
                          <FormDescription>
                            Featured products will be highlighted in your store
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
                
                <TabsContent value="images" className="mt-0 p-4 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Main Product Image</h3>
                      <div 
                        className={cn(
                          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                          dragActive ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                          uploadedImage ? "p-2" : "py-8"
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        
                        {uploadedImage ? (
                          <div className="relative group">
                            <img 
                              src={uploadedImage} 
                              alt="Product preview" 
                              className="max-h-[200px] mx-auto rounded-md object-contain" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                              <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm" 
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadedImage(null);
                                  form.setValue("imageUrl", "");
                                }}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Drag & drop your product image here, or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Recommended: 800 x 800px, PNG or JPG
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Additional Images</h3>
                      <div className="space-y-2">
                        <div 
                          className={cn(
                            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                            "border-border hover:bg-muted/50 py-4"
                          )}
                          onClick={() => additionalFileInputRef.current?.click()}
                          onDragEnter={handleAdditionalImageDrop}
                          onDragLeave={handleAdditionalImageDrop}
                          onDragOver={handleAdditionalImageDrop}
                          onDrop={handleAdditionalImageDrop}
                        >
                          <input
                            ref={additionalFileInputRef}
                            type="file"
                            onChange={handleAdditionalImageChange}
                            accept="image/*"
                            className="hidden"
                          />
                          
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Add more product images
                            </p>
                          </div>
                        </div>
                        
                        {additionalImages.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {additionalImages.map((img, index) => (
                              <div key={index} className="relative group rounded-md overflow-hidden">
                                <img 
                                  src={img} 
                                  alt={`Product image ${index + 1}`} 
                                  className="w-full h-24 object-cover" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleRemoveAdditionalImage(index)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          You can add up to 5 additional product images
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Action Buttons - Fixed at bottom */}
            <div className="p-4 border-t bg-background flex justify-end gap-2 sticky bottom-0 z-20">
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
                onClick={() => console.log('Submit button clicked!')}
              >
                {isSubmitting ? 'Saving...' : (product ? 'Save Changes' : 'Add Product')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}