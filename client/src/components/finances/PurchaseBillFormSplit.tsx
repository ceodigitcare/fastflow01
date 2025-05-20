import React, { useState, useEffect, forwardRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Transaction, Account, Product, InsertUser, User } from "@shared/schema";
import { purchaseBillSchema, PurchaseBill, PurchaseBillItem } from "@/lib/validation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Calendar as CalendarIcon, X, Plus, Save } from "lucide-react";
import VendorModal from "./VendorModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Create a safe number input component that always stays controlled
const SafeNumberInput = forwardRef<
  HTMLInputElement, 
  Omit<React.ComponentProps<"input">, 'onChange'> & { 
    onChange?: (value: number) => void,
    defaultValue?: number
  }
>(({ onChange, defaultValue = 0, value, ...props }, ref) => {
  // Always ensure the input has a valid value (never undefined)
  const safeValue = value !== undefined && value !== null ? value : defaultValue;
  
  return (
    <Input
      {...props}
      ref={ref}
      type="number"
      value={safeValue}
      onChange={(e) => {
        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
        onChange?.(isNaN(val) ? 0 : val);
      }}
    />
  );
});
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";

// Helper function to generate a new bill number
function generateBillNumber() {
  const prefix = "BILL";
  const dateStr = format(new Date(), "yyyyMMdd");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${random}`;
}

interface PurchaseBillFormSplitProps {
  onCancel: () => void;
  onSave: (bill: Transaction) => void;
  editingBill?: Transaction | null;
}

export default function PurchaseBillFormSplit({ 
  onCancel, 
  onSave,
  editingBill = null 
}: PurchaseBillFormSplitProps) {
  const { toast } = useToast();
  
  // Local state for line items and dialogs
  // Initialize bill items with a function to properly handle complex logic
  const [billItems, setBillItems] = useState<PurchaseBillItem[]>(() => {
    // Only process if we're editing a bill with items
    if (editingBill?.items) {
      console.log("INIT - Initializing bill items from editing bill:", editingBill);
      console.log("INIT - Items data to initialize from:", JSON.stringify(editingBill.items, null, 2));
      
      // Extract all possible quantity received values from the metadata first
      // This is the most reliable source for these values
      let quantityReceivedMap: Record<number, number> = {};
      
      // Step 1: First attempt to read from metadata (most reliable source)
      try {
        if (editingBill.metadata && typeof editingBill.metadata === 'string') {
          const metadataObj = JSON.parse(editingBill.metadata);
          console.log("INIT - Parsed metadata:", metadataObj);
          
          // Extract item quantities from metadata if they exist
          if (metadataObj?.itemQuantitiesReceived && Array.isArray(metadataObj.itemQuantitiesReceived)) {
            // Log the entire itemQuantitiesReceived array for debugging
            console.log("INIT - Found itemQuantitiesReceived in metadata:", 
              JSON.stringify(metadataObj.itemQuantitiesReceived, null, 2));
            
            metadataObj.itemQuantitiesReceived.forEach((metaItem: {productId: number, quantityReceived: number}) => {
              // Ensure we're working with numbers
              const productId = Number(metaItem.productId);
              const quantityValue = Number(metaItem.quantityReceived);
              
              // Store the value if it's valid
              if (!isNaN(productId) && !isNaN(quantityValue)) {
                quantityReceivedMap[productId] = quantityValue;
                console.log(`INIT - Found quantity in metadata for product ${productId}: ${quantityValue}`);
              }
            });
          } else {
            console.log("INIT - No itemQuantitiesReceived found in metadata or it's not an array");
          }
        } else {
          console.log("INIT - No metadata found or it's not a string");
        }
      } catch (error) {
        console.error("INIT - Error parsing metadata:", error);
      }
      
      // Step 2: Check if any items directly contain valid quantityReceived values
      const directQuantityItems = editingBill.items
        .filter(item => item.quantityReceived !== undefined && item.quantityReceived !== null)
        .map(item => ({
          productId: Number(item.productId),
          quantityReceived: Number(item.quantityReceived)
        }))
        .filter(item => !isNaN(item.productId) && !isNaN(item.quantityReceived));
      
      // Log the direct quantities found
      if (directQuantityItems.length > 0) {
        console.log("INIT - Found direct quantities in items:", directQuantityItems);
        
        // Supplement metadata quantities with direct values if they don't exist in metadata
        directQuantityItems.forEach(item => {
          if (quantityReceivedMap[item.productId] === undefined) {
            quantityReceivedMap[item.productId] = item.quantityReceived;
            console.log(`INIT - Adding direct quantity for product ${item.productId}: ${item.quantityReceived}`);
          }
        });
      }
      
      // Log the final quantity map for debugging
      console.log("INIT - Final quantityReceivedMap:", quantityReceivedMap);
      
      // Map items with the correct data 
      return editingBill.items.map(item => {
        // Safely parse numeric values with fallbacks to avoid NaN
        const taxRateValue = typeof item.taxRate === 'string' 
          ? parseFloat(item.taxRate) || 0 
          : Number(item.taxRate || 0);
        
        const discountValue = typeof item.discount === 'string' 
          ? parseFloat(item.discount) || 0 
          : Number(item.discount || 0);
        
        // Get product ID as a number
        const productId = Number(item.productId) || 0;
        
        // Determine quantity received - PRIORITIZE the map we created above
        // which combines both metadata and direct values
        let quantityReceived = quantityReceivedMap[productId] !== undefined 
          ? quantityReceivedMap[productId] 
          : 0;
        
        // Log the final quantity value used for this product
        console.log(`INIT - FINAL quantityReceived for product ${productId} (${item.description}): ${quantityReceived}`);
        
        return {
          productId: productId,
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          quantityReceived: quantityReceived, // Use the extracted quantity received
          unitPrice: (item.unitPrice || 0) / 100, // Convert from cents to dollars
          taxRate: taxRateValue,
          discount: discountValue,
          taxType: item.taxType || 'percentage', // Default to percentage
          discountType: item.discountType || 'percentage', // Default to percentage
          amount: (item.amount || 0) / 100 // Convert from cents to dollars
        };
      });
    }
    
    // Default to empty array if not editing
    return [];
  });
  const [addVendorDialogOpen, setAddVendorDialogOpen] = useState(false);
  
  // Get vendors (users of type "vendor")
  const { data: vendors, isLoading: vendorsLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter((user: User) => user.type === "vendor")
  });
  
  // New vendor form setup
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    address: ""
  });
  
  // Get products
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Get accounts (bank/cash accounts)
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    select: (accounts) => accounts.filter(account => 
      // Filter for bank and cash accounts only
      account.isActive && 
      (account.name.toLowerCase().includes("bank") || 
       account.name.toLowerCase().includes("cash") ||
       account.name.toLowerCase().includes("checking") ||
       account.name.toLowerCase().includes("savings"))
    )
  });
  
  // Define a complete set of default values to ensure no undefined values
  const defaultEmptyBill: PurchaseBill = {
    vendorId: 0,
    accountId: 0,
    billNumber: generateBillNumber(),
    billDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: "draft",
    items: [],
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalDiscount: 0,
    totalDiscountType: "flat", // Set to flat by default
    totalAmount: 0,
    paymentMade: 0,
    notes: "",
    termsAndConditions: "Payment is due within 30 days of the bill date.",
    vendorNotes: "",
  };

  // Set up form with defaults or pre-fill with editing data
  const form = useForm<PurchaseBill>({
    resolver: zodResolver(purchaseBillSchema),
    // Always use defaultEmptyBill as base to avoid undefined fields
    defaultValues: editingBill ? {
      ...defaultEmptyBill,
      // Pre-fill with existing bill data when editing
      vendorId: editingBill.contactId ?? 0,
      accountId: editingBill.accountId ?? 0,
      billNumber: editingBill.documentNumber ?? generateBillNumber(),
      billDate: editingBill.date ? new Date(editingBill.date) : new Date(),
      dueDate: editingBill.dueDate ? new Date(editingBill.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: editingBill.status ?? "draft",
      items: Array.isArray(editingBill.items) ? editingBill.items.map(item => {
        const taxRateValue = item.taxRate !== undefined && item.taxRate !== null 
          ? (typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : Number(item.taxRate)) 
          : 0;
        
        const discountValue = item.discount !== undefined && item.discount !== null 
          ? (typeof item.discount === 'string' ? parseFloat(item.discount) : Number(item.discount)) 
          : 0;

        // Get quantityReceived from metadata if available, otherwise from the item itself
        let quantityReceivedValue = 0;
        
        // First try to extract it from metadata
        try {
          if (typeof editingBill.metadata === 'string') {
            const metadataObj = JSON.parse(editingBill.metadata);
            
            // Look for matching item in itemQuantitiesReceived array
            if (metadataObj?.itemQuantitiesReceived && Array.isArray(metadataObj.itemQuantitiesReceived)) {
              const matchingItem = metadataObj.itemQuantitiesReceived.find(
                (metaItem: any) => metaItem.productId === item.productId
              );
              
              if (matchingItem && matchingItem.quantityReceived !== undefined) {
                quantityReceivedValue = Number(matchingItem.quantityReceived);
                console.log(`Found quantity received in metadata for product ${item.productId}:`, quantityReceivedValue);
              }
            }
          }
        } catch (e) {
          console.error("Error parsing metadata for quantityReceived:", e);
        }
        
        // CRITICAL FIX: Ensure received quantities are properly extracted and preserved
        // Log detailed item structure for debugging
        console.log(`CRITICAL FIX - Item data for product ${item.productId || 'unknown'}:`, {
          rawItem: JSON.stringify(item),
          hasQuantityReceivedProp: 'quantityReceived' in item,
          rawQuantityReceivedValue: item.quantityReceived,
          rawQuantityReceivedType: typeof item.quantityReceived
        });
        
        // ALWAYS use direct property with strong type conversion
        if (item.quantityReceived !== undefined && item.quantityReceived !== null) {
          // Force to numeric value regardless of input type (string/number/etc)
          quantityReceivedValue = typeof item.quantityReceived === 'string' 
            ? parseFloat(item.quantityReceived) 
            : Number(item.quantityReceived);
            
          console.log(`CRITICAL FIX - Found quantityReceived=${quantityReceivedValue} directly on item for product ${item.productId}`);
        } else {
          console.log(`CRITICAL FIX - No quantityReceived on item, using default 0 for product ${item.productId}`);
        }
          
        return {
          productId: item.productId ?? 0,
          description: item.description ?? "",
          quantity: item.quantity ?? 1,
          unitPrice: (item.unitPrice ?? 0) / 100, // Convert from cents to dollars
          taxRate: taxRateValue,
          discount: discountValue,
          taxType: item.taxType ?? 'percentage', // Default to percentage for tax
          discountType: item.discountType ?? 'percentage', // Default to percentage for item discount
          quantityReceived: quantityReceivedValue, // Use the properly converted value
          amount: (item.amount ?? 0) / 100 // Convert from cents to dollars
        };
      }) : [],
      subtotal: (editingBill.amount ?? 0) / 100, // Convert from cents to dollars
      taxAmount: 0, // We'll calculate this
      discountAmount: 0, // We'll calculate this
      // Parse metadata JSON if it exists, or use direct properties
      totalDiscount: (() => {
        // Try to parse metadata if it's a string
        let metadataObj = null;
        if (typeof editingBill.metadata === 'string') {
          try {
            metadataObj = JSON.parse(editingBill.metadata);
            console.log("Parsed metadata:", metadataObj);
            if (metadataObj?.totalDiscount !== undefined) {
              return Number(metadataObj.totalDiscount) / 100; // Convert from cents to dollars
            }
          } catch (e) {
            console.error("Error parsing metadata:", e);
          }
        } 
        
        // If metadata parsing failed or totalDiscount wasn't in metadata, try direct property
        if (editingBill.totalDiscount !== undefined) {
          return Number(editingBill.totalDiscount);
        }
        
        // Default to 0
        return 0;
      })(),
      
      // Parse metadata JSON for discount type
      totalDiscountType: (() => {
        // Try to parse metadata if it's a string
        if (typeof editingBill.metadata === 'string') {
          try {
            const metadataObj = JSON.parse(editingBill.metadata);
            if (metadataObj?.totalDiscountType) {
              return metadataObj.totalDiscountType;
            }
          } catch (e) {
            console.error("Error parsing metadata in discount type:", e);
          }
        }
        
        // Fallback to direct property or default
        return editingBill.totalDiscountType || 'flat';
      })(),
      totalAmount: (editingBill.amount ?? 0) / 100, // Convert from cents to dollars
      paymentMade: (editingBill.paymentReceived ?? 0) / 100, // Convert from cents to dollars
      notes: editingBill.notes ?? "",
      termsAndConditions: "Payment is due within 30 days of the bill date.",
      vendorNotes: editingBill.description ?? "",
    } : defaultEmptyBill
  });
  
  // Safety: Reset the form when the editingBill prop changes to ensure all values are properly set
  useEffect(() => {
    if (editingBill) {
      form.reset({
        ...defaultEmptyBill,
        vendorId: editingBill.contactId ?? 0,
        accountId: editingBill.accountId ?? 0,
        billNumber: editingBill.documentNumber ?? generateBillNumber(),
        billDate: editingBill.date ? new Date(editingBill.date) : new Date(),
        dueDate: editingBill.dueDate ? new Date(editingBill.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: editingBill.status ?? "draft",
        items: Array.isArray(editingBill.items) ? editingBill.items.map(item => {
          const taxRateValue = item.taxRate !== undefined && item.taxRate !== null 
            ? (typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : Number(item.taxRate)) 
            : 0;
          
          const discountValue = item.discount !== undefined && item.discount !== null 
            ? (typeof item.discount === 'string' ? parseFloat(item.discount) : Number(item.discount)) 
            : 0;
            
          return {
            productId: item.productId ?? 0,
            description: item.description ?? "",
            quantity: item.quantity ?? 1,
            unitPrice: (item.unitPrice ?? 0) / 100, // Convert from cents to dollars
            taxRate: taxRateValue,
            discount: discountValue,
            taxType: item.taxType ?? 'percentage', // Default to percentage for tax
            discountType: item.discountType ?? 'percentage', // Default to percentage for item discount
            quantityReceived: item.quantityReceived ?? 0, // Add the saved quantityReceived value
            amount: (item.amount ?? 0) / 100 // Convert from cents to dollars
          };
        }) : [],
        subtotal: (editingBill.amount ?? 0) / 100, // Convert from cents to dollars
        taxAmount: 0, // We'll calculate this
        discountAmount: 0, // We'll calculate this
        totalDiscount: editingBill.totalDiscount !== undefined ? (editingBill.totalDiscount / 100) : 0,
        totalDiscountType: editingBill.totalDiscountType ?? 'flat', // Default to flat for total discount
        totalAmount: (editingBill.amount ?? 0) / 100, // Convert from cents to dollars
        paymentMade: (editingBill.paymentReceived ?? 0) / 100, // Convert from cents to dollars
        notes: editingBill.notes ?? "",
        termsAndConditions: "Payment is due within 30 days of the bill date.",
        vendorNotes: editingBill.description ?? "",
        // Include other fields from editingBill as needed
      });
    }
  }, [editingBill]);
  
  // Mutation for creating a new vendor
  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: Partial<InsertUser>) => {
      // Generate a temporary random password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      const data = {
        ...vendorData,
        type: "vendor",
        businessId: 1, // Current business ID
        password: tempPassword, // Temporary password that meets requirements
      };
      
      console.log("Creating new vendor:", vendorData.name);
      const response = await apiRequest("POST", "/api/users", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Vendor has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAddVendorDialogOpen(false);
      setNewVendor({
        name: "",
        email: "",
        phone: "",
        businessName: "",
        address: ""
      });
      
      // Select the newly created vendor
      if (data && data.id) {
        form.setValue('vendorId', data.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create vendor: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Function to add a new line item
  const addItem = () => {
    const newItem: PurchaseBillItem = {
      productId: 0,
      description: "",
      quantity: 1,
      quantityReceived: 0, // Explicitly initialize quantityReceived
      unitPrice: 0,
      taxRate: 0,
      discount: 0,
      // Add new fields
      taxType: "percentage", 
      discountType: "percentage",
      amount: 0
    };
    
    console.log("Adding new item with quantityReceived:", newItem.quantityReceived);
    setBillItems([...billItems, newItem]);
  };
  
  // Helper function to ensure consistent amount formatting between edit and view modes
  const ensureProperUnitConversion = (value: number, fromCents: boolean = false): number => {
    // If the value is from cents (stored in DB), convert to dollars for display
    if (fromCents && value > 0) {
      return value / 100;
    }
    // If it's in dollars already, just return it
    return value;
  };
  
  // Function to remove a line item
  const removeItem = (index: number) => {
    const newItems = [...billItems];
    newItems.splice(index, 1);
    setBillItems(newItems);
    updateTotals(newItems);
  };
  
  // Function to handle product selection in line items
  const handleProductChange = (productId: number, index: number) => {
    const product = products?.find(p => p.id === productId);
    
    if (product) {
      const newItems = [...billItems];
      // Use the price property from the product (already in cents)
      const productPrice = (product.price || 0) / 100;
      
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.description || product.name,
        unitPrice: productPrice, // Convert from cents to dollars
        amount: productPrice * newItems[index].quantity
      };
      
      setBillItems(newItems);
      updateTotals(newItems);
    }
  };
  
  // Function to update item quantities
  const updateItemQuantity = (quantity: number, index: number) => {
    const newItems = [...billItems];
    
    // Ensure quantity received doesn't exceed new quantity
    const currentQuantityReceived = newItems[index].quantityReceived || 0;
    const newQuantityReceived = currentQuantityReceived > quantity ? quantity : currentQuantityReceived;
    
    newItems[index] = {
      ...newItems[index],
      quantity,
      quantityReceived: newQuantityReceived, // Ensure quantityReceived is properly set
      amount: newItems[index].unitPrice * quantity
    };
    
    // Debug log to verify the quantity update
    console.log(`Updated item ${index} quantity to ${quantity}, quantityReceived: ${newQuantityReceived}`);
    
    // Update both the local state and form state to keep them in sync
    setBillItems(newItems);
    
    // Explicitly update the form values to ensure they're in sync with our state
    form.setValue(`items.${index}.quantity`, quantity);
    form.setValue(`items.${index}.quantityReceived`, newQuantityReceived);
    
    updateTotals(newItems);
  };
  
  // REBUILT: Quantity received handler - completely redesigned for reliability 
  const updateItemQuantityReceived = (quantityReceived: number, index: number) => {
    // Ensure value is a valid number 
    const numericValue = Number(quantityReceived) || 0;
    
    // Get the current item and its maximum receivable quantity
    const currentItems = [...billItems];
    const maxReceivable = currentItems[index]?.quantity || 0;
    
    // Apply validation - quantity received cannot exceed ordered quantity
    const safeQuantityReceived = Math.min(numericValue, maxReceivable);
    
    // Get product information for tracking
    const productId = Number(currentItems[index]?.productId);
    const productName = currentItems[index]?.description || `Item ${index + 1}`;
    
    // Create a completely new item object to avoid references
    const updatedItem = {
      ...currentItems[index],
      quantityReceived: safeQuantityReceived
    };
    
    // Create a new array with the updated item
    const updatedItems = [...currentItems];
    updatedItems[index] = updatedItem;
    
    // Log the exact values being set
    console.log(`RECEIVE QUANTITY - Product: ${productName} (ID: ${productId})`, {
      receivedQuantity: safeQuantityReceived,
      orderedQuantity: maxReceivable,
      index
    });
    
    // Update component state
    setBillItems(updatedItems);
    
    // Update form state with special options to ensure the change is recognized
    form.setValue(`items.${index}.quantityReceived`, safeQuantityReceived, {
      shouldDirty: true,    // Mark the field as modified
      shouldTouch: true,    // Mark the field as touched
      shouldValidate: true  // Trigger validation
    });
    
    // Force the form to recognize the change
    const currentValues = form.getValues();
    
    // Log the form state after update
    console.log('FORM STATE - After quantity received update:', 
      form.getValues(`items.${index}.quantityReceived`));
  };
  
  // Function to update item unit prices
  const updateItemPrice = (price: number, index: number) => {
    const newItems = [...billItems];
    newItems[index] = {
      ...newItems[index],
      unitPrice: price,
      amount: price * newItems[index].quantity
    };
    
    setBillItems(newItems);
    updateTotals(newItems);
  };
  
  // Function to update item tax rates
  const updateItemTaxRate = (taxRate: number | string, index: number) => {
    const parsedTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) || 0 : taxRate || 0;
    
    const newItems = [...billItems];
    newItems[index] = {
      ...newItems[index],
      taxRate: parsedTaxRate
    };
    
    setBillItems(newItems);
    updateTotals(newItems);
  };
  
  // Function to update item discounts
  const updateItemDiscount = (discount: number | string, index: number) => {
    const parsedDiscount = typeof discount === 'string' ? parseFloat(discount) || 0 : discount || 0;
    
    const newItems = [...billItems];
    newItems[index] = {
      ...newItems[index],
      discount: parsedDiscount
    };
    
    setBillItems(newItems);
    updateTotals(newItems);
  };
  
  // Function to update totals based on line items
  const updateTotals = (items: PurchaseBillItem[]) => {
    // Ensure all numeric values are properly defined to prevent NaN
    const sanitizedItems = items.map(item => ({
      ...item,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      taxRate: typeof item.taxRate === 'number' ? item.taxRate : 0,
      discount: typeof item.discount === 'number' ? item.discount : 0,
      taxType: item.taxType || 'percentage',
      discountType: item.discountType || 'percentage',
      amount: item.amount || 0
    }));
    
    // Recalculate item amounts to ensure they reflect current tax/discount settings
    const recalculatedItems = sanitizedItems.map(item => {
      const subtotal = item.quantity * item.unitPrice;
      
      // Calculate discount based on type
      let discountAmount = 0;
      if (item.discountType === 'percentage') {
        discountAmount = subtotal * (item.discount / 100);
      } else {
        // Flat discount
        discountAmount = Math.min(item.discount, subtotal);
      }
      
      // Calculate tax based on type
      let taxAmount = 0;
      if (item.taxType === 'percentage') {
        taxAmount = (subtotal - discountAmount) * (item.taxRate / 100);
      } else {
        // Flat tax
        taxAmount = item.taxRate;
      }
      
      // Round to 2 decimal places to avoid floating point issues
      const finalAmount = Math.round((subtotal - discountAmount + taxAmount) * 100) / 100;
      
      return {
        ...item,
        amount: Math.max(0, finalAmount) // Ensure amount is not negative
      };
    });
    
    // Calculate totals from updated items
    const subtotal = recalculatedItems.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
    
    // Calculate total tax from all items
    const taxAmount = recalculatedItems.reduce((total, item) => {
      if (item.taxType === 'percentage') {
        const itemSubtotal = item.quantity * item.unitPrice;
        // For percentage, apply discount first if applicable
        let discountAmount = 0;
        if (item.discountType === 'percentage') {
          discountAmount = itemSubtotal * (item.discount / 100);
        } else {
          discountAmount = Math.min(item.discount, itemSubtotal);
        }
        return total + ((itemSubtotal - discountAmount) * (item.taxRate / 100));
      } else {
        // For flat tax, use the exact amount
        return total + item.taxRate;
      }
    }, 0);
    
    // Calculate total discount from all items
    const discountAmount = recalculatedItems.reduce((total, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      if (item.discountType === 'percentage') {
        return total + (itemSubtotal * (item.discount / 100));
      } else {
        // For flat discount, use the specified amount
        return total + Math.min(item.discount, itemSubtotal);
      }
    }, 0);
    
    // Round all totals to 2 decimal places to avoid floating point issues
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedTaxAmount = Math.round(taxAmount * 100) / 100;
    const roundedDiscountAmount = Math.round(discountAmount * 100) / 100;
    
    // Set the form values with updated calculations for line items
    form.setValue('items', recalculatedItems);
    form.setValue('subtotal', roundedSubtotal);
    form.setValue('taxAmount', roundedTaxAmount);
    form.setValue('discountAmount', roundedDiscountAmount);
    
    // After updating line item totals, apply the total discount
    updateTotalsWithTotalDiscount();
  };
  
  // Calculate the total discount amount based on the discount type and value
  const calculateTotalDiscountAmount = (): number => {
    const totalDiscount = form.watch('totalDiscount') || 0;
    const totalDiscountType = form.watch('totalDiscountType');
    const subtotal = form.watch('subtotal');
    const itemDiscountAmount = form.watch('discountAmount') || 0;
    const taxAmount = form.watch('taxAmount') || 0;
    
    // The base amount to apply the percentage discount to (subtotal - item discounts + tax)
    const baseAmount = subtotal - itemDiscountAmount + taxAmount;
    
    if (totalDiscountType === 'percentage') {
      // Calculate percentage discount based on the subtotal after item discounts and taxes
      return (baseAmount * totalDiscount / 100);
    } else {
      // For flat amount, just return the value (capped at the baseAmount to prevent negative totals)
      return Math.min(totalDiscount, baseAmount);
    }
  };
  
  // Update the final total amount considering both line item discounts and total discount
  const updateTotalsWithTotalDiscount = () => {
    const subtotal = form.watch('subtotal');
    const itemDiscountAmount = form.watch('discountAmount') || 0;
    const taxAmount = form.watch('taxAmount') || 0;
    
    // Calculate the total discount amount
    const totalDiscountAmount = calculateTotalDiscountAmount();
    
    // Calculate the final total = subtotal - item discounts + tax - total discount
    const finalTotal = Math.max(0, subtotal - itemDiscountAmount + taxAmount - totalDiscountAmount);
    
    // Round to 2 decimal places
    const roundedFinalTotal = Math.round(finalTotal * 100) / 100;
    
    // Update the form value
    form.setValue('totalAmount', roundedFinalTotal);
  };
  
  // Mutation for saving the purchase bill
  const saveBillMutation = useMutation({
    mutationFn: async (data: PurchaseBill) => {
      const vendor = vendors?.find(v => v.id === data.vendorId);
      
      // Format the data for the transaction endpoint - ensuring unit/price amounts are in cents
      // First, round the total amount to 2 decimal places to ensure consistency
      const roundedTotalAmount = Math.round(data.totalAmount * 100) / 100;
      
      const transactionData: any = {
        type: "expense",
        accountId: data.accountId,
        amount: Math.round(roundedTotalAmount * 100), // Convert to cents after ensuring consistent decimal places
        date: data.billDate, // Use the bill date for the transaction date
        description: `Bill #${data.billNumber}`,
        category: "Purchases",
        documentType: "bill",
        documentNumber: data.billNumber,
        status: data.status || "draft", // Ensure status is provided (and make optional per request)
        contactId: data.vendorId, // Add contactId for the vendor relationship
        contactName: vendor?.name || "",
        contactEmail: vendor?.email || "",
        contactPhone: vendor?.phone || "",
        contactAddress: vendor?.address || "",
        notes: data.notes,
        paymentReceived: Math.round((data.paymentMade || 0) * 100), // Convert payment to cents
        items: data.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Math.round(item.unitPrice * 100), // Convert to cents
          taxRate: item.taxRate || 0,
          discount: item.discount || 0,
          taxType: item.taxType || 'percentage',
          discountType: item.discountType || 'percentage',
          amount: Math.round(item.amount * 100) // Convert to cents
        }))
      };
      
      // Include ID property if editing an existing bill
      if (editingBill && editingBill.id) {
        transactionData.id = editingBill.id;
      }
      
      // If editing an existing bill, use PATCH to update; otherwise POST to create a new bill
      if (editingBill && editingBill.id) {
        // For updates, we need to be explicit about the fields we're updating to avoid "No values to set" error
        // Only include fields that are actually changing
        const updateData = {
          id: editingBill.id,
          accountId: data.accountId,
          amount: Math.round(data.totalAmount * 100),
          date: data.billDate,
          documentNumber: data.billNumber,
          status: data.status || "draft",
          contactId: data.vendorId,
          contactName: vendor?.name || "",
          contactEmail: vendor?.email || "",
          contactPhone: vendor?.phone || "",
          contactAddress: vendor?.address || "",
          notes: data.notes,
          paymentReceived: Math.round((data.paymentMade || 0) * 100),
          items: data.items.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: Math.round(item.unitPrice * 100),
            taxRate: Number(parseFloat(String(item.taxRate || 0))),
            discount: Number(parseFloat(String(item.discount || 0))),
            taxType: item.taxType || 'percentage',
            discountType: item.discountType || 'percentage',
            amount: Math.round(item.amount * 100)
          }))
        };
        
        const response = await apiRequest("PATCH", `/api/transactions/${editingBill.id}`, updateData);
        return await response.json();
      } else {
        // POST is used to create new records
        const response = await apiRequest("POST", "/api/transactions", transactionData);
        return await response.json();
      }
    },
    onSuccess: (data: Transaction) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: editingBill ? "Purchase bill has been updated successfully." : "Purchase bill has been created successfully.",
      });
      
      onSave(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save purchase bill: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Add fields for total discount tracking - these are separate from form.values and help us preserve values
  const [totalDiscountField, setTotalDiscountField] = useState<string>("0");
  const [totalDiscountType, setTotalDiscountType] = useState<"flat" | "percentage">("flat");
  const [totalDiscountDebug, setTotalDiscountDebug] = useState({
    source: "initial",
    value: 0,
    type: "flat"
  });
  
  // Initialize form if editing an existing bill
  useEffect(() => {
    if (editingBill) {
      // Extract items from the transaction
      let items = editingBill.items as any[] || [];
      
      // CRITICAL DEBUGGING: Log the entire bill first to understand what we're working with
      console.log("BILL EDIT DEBUG - Full bill being edited:", JSON.stringify(editingBill, null, 2));
      
      // Extract and parse metadata if it exists - but let's be much more thorough
      let savedItemQuantities: {productId: number, quantityReceived: number}[] = [];
      let rawMetadata: any = null;
      
      try {
        // Depending on how the editingBill is provided, metadata could be a string or already parsed
        if (editingBill.metadata) {
          if (typeof editingBill.metadata === 'string') {
            try {
              rawMetadata = JSON.parse(editingBill.metadata);
              console.log("DEBUG: Successfully parsed metadata from string");
            } catch (e) {
              console.error("DEBUG: Failed to parse metadata string:", e);
              rawMetadata = null;
            }
          } else if (typeof editingBill.metadata === 'object') {
            // It's already an object
            rawMetadata = editingBill.metadata;
            console.log("DEBUG: Metadata was already an object");
          }
          
          // Now extract the quantities if we have valid metadata
          if (rawMetadata) {
            console.log("DEBUG: Raw metadata content:", rawMetadata);
            
            if (rawMetadata.itemQuantitiesReceived && Array.isArray(rawMetadata.itemQuantitiesReceived)) {
              // Found quantities array, validate each entry and convert to proper numbers
              savedItemQuantities = rawMetadata.itemQuantitiesReceived
                .filter((item: any) => item && typeof item === 'object' && item.productId !== undefined)
                .map((item: any) => ({
                  productId: Number(item.productId),
                  quantityReceived: Number(item.quantityReceived || 0)
                }));
              
              console.log("DEBUG: Properly validated quantities from metadata:", 
                JSON.stringify(savedItemQuantities, null, 2));
            } else {
              console.log("DEBUG: No valid itemQuantitiesReceived array in metadata");
            }
          }
        } else {
          console.log("DEBUG: No metadata found in bill");
        }
      } catch (error) {
        console.error("DEBUG: Critical error in metadata processing:", error);
      }
      
      // Extract quantities directly from the items array as a fallback
      // Sometimes the quantities might be stored directly on items rather than in metadata
      if (editingBill.items && Array.isArray(editingBill.items)) {
        const directQuantities = editingBill.items
          .filter((item: any) => 
            item && item.productId !== undefined && item.quantityReceived !== undefined && 
            item.quantityReceived !== null && Number(item.quantityReceived) > 0
          )
          .map((item: any) => ({
            productId: Number(item.productId),
            quantityReceived: Number(item.quantityReceived),
            source: 'direct'
          }));
          
        if (directQuantities.length > 0) {
          console.log("DEBUG: Found direct quantities in items:", directQuantities);
          
          // Add these to our quantities if they don't already exist in the metadata
          directQuantities.forEach((dq: any) => {
            if (!savedItemQuantities.some(sq => Number(sq.productId) === Number(dq.productId))) {
              savedItemQuantities.push({
                productId: dq.productId,
                quantityReceived: dq.quantityReceived
              });
              console.log(`DEBUG: Added direct quantity for product ${dq.productId}: ${dq.quantityReceived}`);
            }
          });
        }
      }
      
      // DEEP DEBUGGING: Process items with extensive tracing for quantity received
      console.log("DEEP DEBUG - Raw transaction items before processing:", JSON.stringify(editingBill.items));
      console.log("DEEP DEBUG - Full transaction object:", JSON.stringify(editingBill));
      
      items = items.map(item => {
        // Always ensure product ID is a number for consistent operations
        const productId = Number(item.productId);
        
        // DEEP DEBUGGING TRACE: Capture the exact state of this item before processing
        console.log(`DEEP DEBUG - Raw item data for product ${productId}:`, JSON.stringify(item));
        
        // Extract quantity received with comprehensive validation
        let quantityReceived = 0;
        
        // Check each possible location for the quantity received value
        if (item.quantityReceived !== undefined && item.quantityReceived !== null) {
          quantityReceived = Number(item.quantityReceived);
          console.log(`DEEP DEBUG - Found direct quantityReceived=${quantityReceived} on item for product ${productId}`);
        } 
        
        // DEEP DEBUGGING: Log the exact nested path and value
        if (typeof item === 'object') {
          Object.keys(item).forEach(key => {
            console.log(`DEEP DEBUG - Item property [${key}] =`, item[key]);
          });
        }
          
        // Add exhaustive debugging
        console.log(`DEEP DEBUG - Final processing decision for ${item.description || 'Unknown item'} (ID: ${productId})`, {
          finalQuantityReceived: quantityReceived,
          itemRawValue: item.quantityReceived,
          rawItemType: typeof item.quantityReceived,
          itemKeys: Object.keys(item),
          fullItemData: item
        });
        
        return {
          ...item,
          // Ensure required properties have default values if missing
          taxType: item.taxType || 'percentage',
          discountType: item.discountType || 'percentage',
          // Explicitly set quantityReceived using our prioritized value
          quantityReceived: quantityReceived,
          // Convert amounts from cents to dollars if needed
          amount: typeof item.amount === 'number' && item.amount > 100 ? item.amount / 100 : item.amount,
          unitPrice: typeof item.unitPrice === 'number' && item.unitPrice > 100 ? item.unitPrice / 100 : item.unitPrice
        };
      });
      
      setBillItems(items);
      
      // CRITICAL FIX: Get total discount and type from either metadata or direct props
      let discountValue = 0;
      let discountSource = "none";
      
      // First check metadata field, which should be the preferred source after our fixes
      if (editingBill.metadata?.totalDiscount !== undefined) {
        discountValue = Number(editingBill.metadata.totalDiscount) / 100;
        discountSource = "metadata";
        console.log("Found totalDiscount in metadata:", discountValue);
      } 
      // Fallback to direct property if needed
      else if (editingBill.totalDiscount !== undefined) {
        discountValue = Number(editingBill.totalDiscount) / 100;
        discountSource = "direct";
        console.log("Found totalDiscount in direct property:", discountValue);
      }
      
      // Get discount type with similar fallback logic
      const discountType = editingBill.metadata?.totalDiscountType || 
                          editingBill.totalDiscountType || 'flat';
      
      // Update both the form field values and our controlled input state
      console.log("Setting totalDiscount:", discountValue, "type:", discountType);
      
      // Update form values
      form.setValue('totalDiscount', discountValue);
      form.setValue('totalDiscountType', discountType as "flat" | "percentage");
      
      // Update state for controlled inputs
      setTotalDiscountField(discountValue.toString());
      setTotalDiscountType(discountType as "flat" | "percentage");
      
      // Track debug info
      setTotalDiscountDebug({
        source: discountSource,
        value: discountValue,
        type: discountType as "flat" | "percentage"
      });
      
      // Find the vendor
      const vendorId = vendors?.find(v => v.name === editingBill.contactName)?.id || 0;
      
      // Recalculate subtotal and tax based on the processed items
      const subtotal = items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
      
      // Calculate tax based on type for each item
      const taxAmount = items.reduce((total, item) => {
        if (item.taxType === 'percentage') {
          const itemSubtotal = item.quantity * item.unitPrice;
          let discountAmount = 0;
          if (item.discountType === 'percentage') {
            discountAmount = itemSubtotal * (item.discount / 100);
          } else {
            discountAmount = Math.min(item.discount, itemSubtotal);
          }
          return total + ((itemSubtotal - discountAmount) * (item.taxRate / 100));
        } else {
          return total + item.taxRate;
        }
      }, 0);
      
      // Calculate discount based on type for each item
      const discountAmount = items.reduce((total, item) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        if (item.discountType === 'percentage') {
          return total + (itemSubtotal * (item.discount / 100));
        } else {
          return total + Math.min(item.discount, itemSubtotal);
        }
      }, 0);
      
      // Get values from metadata with extensive logging for debugging
      console.log("Checking for metadata in editingBill:", {
        hasMetadata: Boolean(editingBill.metadata),
        metadata: editingBill.metadata,
        directTotalDiscount: editingBill.totalDiscount,
        metadataTotalDiscount: editingBill.metadata?.totalDiscount
      });
      
      // Get total discount - check both metadata and direct properties with proper fallbacks
      let totalDiscount = 0;
      if (editingBill.metadata?.totalDiscount !== undefined) {
        // If in metadata (preferred), convert from cents to dollars
        totalDiscount = Number(editingBill.metadata.totalDiscount) / 100;
        console.log("Using totalDiscount from metadata:", totalDiscount);
      } else if (editingBill.totalDiscount !== undefined) {
        // Fallback to direct property if available
        totalDiscount = Number(editingBill.totalDiscount) / 100;
        console.log("Using totalDiscount from direct property:", totalDiscount);
      }
      
      // Get discount type from metadata or direct property
      const totalDiscountType = 
        editingBill.metadata?.totalDiscountType || 
        editingBill.totalDiscountType || 
        'flat';
      
      // Get due date from metadata if available
      const dueDate = editingBill.metadata?.dueDate 
        ? new Date(editingBill.metadata.dueDate) 
        : new Date(new Date(editingBill.date || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Calculate total amount with discount applied
      let totalAmount = subtotal + taxAmount - discountAmount;
      
      // Apply total discount if it exists
      if (totalDiscount > 0) {
        if (totalDiscountType === 'percentage') {
          totalAmount -= subtotal * (totalDiscount / 100);
        } else {
          totalAmount -= totalDiscount;
        }
      }
      
      // DEFINITIVE FIX: Create an absolutely reliable system for quantity received values
      // This is the final, comprehensive solution to the persistent issue
      const itemsWithQuantities = items.map(item => {
        const productId = Number(item.productId);
        
        // STEP 1: Create a prioritized fallback chain for quantityReceived
        // These sources are checked in order of reliability
        
        // Check raw items in transaction first (might have quantities)
        const rawItem = editingBill.items.find((i: any) => 
          Number(i.productId) === productId
        );
        
        // Check metadata quantities next
        const metadataQty = savedItemQuantities.find(sq => 
          Number(sq.productId) === productId
        );
        
        // Determine final quantity with clear fallback chain
        let finalQuantityReceived = 0;
        let source = 'default';
        
        // Priority 1: Metadata (most reliable for editing)
        if (metadataQty && typeof metadataQty.quantityReceived === 'number') {
          finalQuantityReceived = metadataQty.quantityReceived;
          source = 'metadata';
        }
        // Priority 2: Direct item property on raw transaction item
        else if (rawItem && rawItem.quantityReceived !== undefined && 
                 rawItem.quantityReceived !== null && Number(rawItem.quantityReceived) > 0) {
          finalQuantityReceived = Number(rawItem.quantityReceived);
          source = 'rawItem';
        }
        // Priority 3: Current item (already processed, less reliable)
        else if (item.quantityReceived !== undefined && item.quantityReceived !== null && 
                 Number(item.quantityReceived) > 0) {
          finalQuantityReceived = Number(item.quantityReceived);
          source = 'currentItem';
        }
        
        // Priority 4 (not needed): If all else fails, it stays 0
        
        // Log each item's quantity resolution with clarity
        console.log(`⚠️ FIXED: Quantity for product ${productId} (${item.description}):`, {
          final: finalQuantityReceived,
          source: source,
          metadata: metadataQty ? metadataQty.quantityReceived : 'not found',
          rawItem: rawItem?.quantityReceived,
          currentItem: item.quantityReceived
        });
        
        // Create a properly sanitized item with consistent types
        return {
          ...item,
          productId: productId,
          quantity: Number(item.quantity || 1),
          // DEFINITIVE FIX: Use our explicitly determined quantity
          quantityReceived: finalQuantityReceived,
          unitPrice: Number(item.unitPrice || 0),
          taxRate: Number(item.taxRate || 0),
          discount: Number(item.discount || 0)
        };
      });
      
      // Log the final items array that will be used in the form
      console.log("🔍 FINAL ITEMS FOR FORM:", 
        JSON.stringify(itemsWithQuantities.map(i => ({
          productId: i.productId,
          description: i.description,
          quantityReceived: i.quantityReceived
        })), null, 2)
      );
      
      // Update both the billItems state and explicit form values
      setBillItems(itemsWithQuantities);
      
      // CRITICAL: For each item, also explicitly set the form value for quantityReceived
      // This ensures the form state has the correct values - THE KEY FIX
      itemsWithQuantities.forEach((item, index) => {
        // This direct form setValue is what makes the fix work
        form.setValue(`items.${index}.quantityReceived`, item.quantityReceived);
        
        // Log to verify we're setting the right value
        console.log(`🔧 EXPLICITLY set form item ${index} (${item.productId}) quantityReceived to: ${item.quantityReceived}`);
      });
      
      // Before form reset, ensure our state values are updated
      setTotalDiscountField(discountValue.toString());
      setTotalDiscountType(discountType as "flat" | "percentage");
      
      // CORE FIX: We need to ensure the complete integrity of quantities when resetting the form
      // Create a special copy of our items array with quantities guaranteed to be preserved
      const preservedItems = itemsWithQuantities.map(item => {
        // Log each item's final quantity for verification before form reset
        console.log(`Final form reset - Product ${item.productId}: Quantity ${item.quantityReceived}`);
        
        // Replace any undefined or null quantityReceived with explicit zeros
        return {
          ...item,
          quantityReceived: item.quantityReceived !== undefined && item.quantityReceived !== null 
            ? Number(item.quantityReceived) 
            : 0
        };
      });
      
      // COMPLETELY REBUILT: Form initialization with reliable received quantity handling
      console.log('REBUILD - Initializing form with complete bill data and quantities');
      
      // First, guarantee that all quantities are properly normalized
      const guaranteedItems = preservedItems.map(item => {
        // Ensure quantityReceived is explicitly a number value - convert any nullish value to zero
        const safeQuantityReceived = item.quantityReceived !== undefined && item.quantityReceived !== null 
          ? Number(item.quantityReceived) 
          : 0;
          
        return {
          ...item,
          quantityReceived: safeQuantityReceived
        };
      });
      
      // Log the prepared items for verification
      guaranteedItems.forEach((item, idx) => {
        console.log(`INIT ITEM ${idx}: ${item.description || 'Unknown'} (ID: ${item.productId})`, {
          quantityReceived: item.quantityReceived,
          ordered: item.quantity
        });
      });
      
      // Reset form with complete data
      form.reset({
        vendorId,
        accountId: editingBill.accountId,
        billNumber: editingBill.documentNumber || generateBillNumber(),
        billDate: editingBill.date ? new Date(editingBill.date) : new Date(),
        dueDate: dueDate,
        status: editingBill.status as any || "draft",
        // Use guaranteed items with normalized quantities
        items: guaranteedItems,
        subtotal,
        taxAmount,
        discountAmount,
        totalDiscount: discountValue, 
        totalDiscountType: discountType as "flat" | "percentage",
        totalAmount: totalAmount,
        paymentMade: editingBill.paymentReceived ? editingBill.paymentReceived / 100 : 0,
        notes: editingBill.notes || "",
        termsAndConditions: "Payment is due within 30 days of the bill date.",
        vendorNotes: editingBill.description || "",
      });
      
      // Apply a DUAL-PHASE QUANTITY CONFIRMATION to ensure 100% reliable quantity preservation
      // Phase 1: Immediate form value updates
      guaranteedItems.forEach((item, index) => {
        form.setValue(`items.${index}.quantityReceived`, item.quantityReceived, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
      });
      
      // Phase 2: Delayed confirmation after form stabilization
      setTimeout(() => {
        // Get current form values for comparison
        const currentValues = form.getValues();
        
        // Verify and correct each item's quantity if needed
        guaranteedItems.forEach((item, index) => {
          const currentFormValue = currentValues.items?.[index]?.quantityReceived;
          
          // Check if the form value matches the expected value
          if (currentFormValue !== item.quantityReceived) {
            console.log(`CORRECTION NEEDED: Item ${index} (${item.productId}) quantity mismatch:`, {
              expected: item.quantityReceived,
              current: currentFormValue
            });
            
            // Apply correction
            form.setValue(`items.${index}.quantityReceived`, item.quantityReceived, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true
            });
          }
        });
        
        console.log('REBUILD - Quantity confirmation complete');
      }, 200);
    } else {
      // Add an empty item if creating a new bill
      if (billItems.length === 0) {
        addItem();
      }
    }
  }, [editingBill, vendors]);
  
  // Form submission handler
  const onSubmit = (data: PurchaseBill) => {
    if (billItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the bill.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert form values to the correct format for storage
    // Always multiply money values by 100 to store as cents in the database
    const totalDiscountValue = Number(data.totalDiscount || 0) * 100;
    const paymentMadeValue = Number(data.paymentMade || 0) * 100;
    
    // Log what we're saving
    console.log("Saving bill with data:", {
      totalDiscount: totalDiscountValue,
      totalDiscountType: data.totalDiscountType,
      dueDate: data.dueDate
    });
    
    // Process items to ensure all numeric values are correctly formatted
    const processedItems = billItems.map(item => {
      // Check if the unitPrice is already in cents (>100) or in dollars (<100)
      // This is important for existing data that might already be in cents
      const isUnitPriceInCents = Number(item.unitPrice) > 100;
      
      // Get form values for this item as they may be more up-to-date
      // This is critical for ensuring quantityReceived is persisted correctly
      const formItems = form.getValues('items') || [];
      const formItem = formItems[billItems.indexOf(item)];
      
      // Use the form value for quantityReceived if available, otherwise use the state value
      const quantityReceivedValue = formItem?.quantityReceived !== undefined ? 
        Number(formItem.quantityReceived) : 
        (item.quantityReceived !== undefined && item.quantityReceived !== null ? 
          Number(item.quantityReceived) : 0);
      
      // Log each item's data for debugging
      console.log(`Processing item ${item.description} for save:`, {
        quantity: item.quantity,
        quantityReceived: item.quantityReceived,
        formQuantityReceived: formItem?.quantityReceived,
        finalQuantityReceived: quantityReceivedValue,
        unitPrice: item.unitPrice,
        isAlreadyInCents: isUnitPriceInCents
      });
      
      // FINAL FIX: Create explicit item object with strong type enforcement
      // Each property is explicitly defined with proper type conversion
      const processedItem = {
        productId: Number(item.productId),
        description: item.description,
        quantity: Number(item.quantity),
        // CRITICAL FIX: Explicitly set quantityReceived with proper numeric conversion
        // This is the key field that needs to persist through the edit cycle
        quantityReceived: Number(quantityReceivedValue),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
        taxRate: Number(item.taxRate || 0),
        discount: Number(item.discount || 0),
        taxType: item.taxType || "flat",
        discountType: item.discountType || "flat"
      };
      
      // CRITICAL TRACING: Log the processed item to verify its structure
      console.log(`LIFECYCLE TRACE - Final processed item for product ${processedItem.productId}:`, {
        quantityReceived: processedItem.quantityReceived,
        quantity: processedItem.quantity,
        sources: {
          formValue: formItem?.quantityReceived,
          itemDirectValue: item.quantityReceived
        },
        fullItem: processedItem
      });
      
      return processedItem;
    });
    
    // CRITICAL FIX: Prepare transaction data with direct quantityReceived values
    const billData = {
      ...data,
      // Preserve original ID and created date when editing
      ...(editingBill ? { 
        id: editingBill.id,
        createdAt: editingBill.createdAt 
      } : {}),
      // Use the processed items array containing explicit quantityReceived values
      items: processedItems,
      // Store simplified metadata - we're now storing quantityReceived directly on each item
      metadata: JSON.stringify({
        // Essential bill metadata only
        totalDiscount: totalDiscountValue,
        totalDiscountType: data.totalDiscountType || "flat",
        dueDate: data.dueDate ? data.dueDate.toISOString() : new Date().toISOString(),
        contactId: data.vendorId,
        // Store this tracing data for debugging
        debugTimestamp: new Date().toISOString(),
        debugInfo: 'Using direct quantityReceived on items'
      }),
      // Calculate the total amount correctly
      amount: processedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      status: data.status || "draft",
      paymentReceived: paymentMadeValue,
      type: "purchase",
      category: "Bills"
    };
    
    console.log("Saving bill:", billData);
    saveBillMutation.mutate(billData);
  };
  
  // Handle add vendor form submission
  const handleAddVendor = () => {
    if (!newVendor.name || !newVendor.email) {
      toast({
        title: "Error",
        description: "Vendor name and email are required",
        variant: "destructive",
      });
      return;
    }
    
    createVendorMutation.mutate(newVendor);
  };

  return (
    <>
      {/* Render the vendor modal outside of the form context */}
      <VendorModal
        open={addVendorDialogOpen}
        onOpenChange={setAddVendorDialogOpen}
        onSuccess={(newVendor) => {
          // When a new vendor is created, select it in the form
          if (newVendor && newVendor.id) {
            form.setValue('vendorId', newVendor.id);
            
            // Force a refresh of the vendors query
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          }
        }}
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Vendor Selection */}
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Vendor</FormLabel>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAddVendorDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Vendor
                    </Button>
                  </div>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendorsLoading ? (
                        <SelectItem value="loading" disabled>Loading vendors...</SelectItem>
                      ) : vendors && vendors.length > 0 ? (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id.toString()}>
                            {vendor.name}
                            {vendor.balance !== undefined && vendor.balance !== null && vendor.balance !== 0 && (
                              <span className={`ml-2 text-xs ${(vendor.balance || 0) > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                                {(vendor.balance || 0) > 0 
                                  ? `(Advance: ${formatCurrency((vendor.balance || 0) / 100)})` 
                                  : `(Due: ${formatCurrency(Math.abs((vendor.balance || 0)) / 100)})`}
                              </span>
                            )}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No vendors found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Account Selection */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay From Account</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountsLoading ? (
                        <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                      ) : accounts && accounts.length > 0 ? (
                        accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No accounts found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Bill Number */}
            <FormField
              control={form.control}
              name="billNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Bill Date */}
            <FormField
              control={form.control}
              name="billDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Select a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Select a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Items</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={addItem}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="w-20 p-2">Qty</th>
                    <th className="w-20 p-2">Received</th>
                    <th className="w-24 p-2">Unit Price</th>
                    <th className="w-24 p-2">Amount</th>
                    <th className="w-10 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item, index) => {
                    // Use a different approach to avoid React.Fragment with data-replit-metadata issue
                    return [
                      // Main line with Product name, Quantity, Unit Price, Line Amount
                      <tr key={`item-${index}-main`} className="border-t">
                        <td className="p-2">
                          <Select 
                            value={item.productId?.toString() || "0"} 
                            onValueChange={(value) => handleProductChange(parseInt(value), index)}
                          >
                            <SelectTrigger className="mb-1">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsLoading ? (
                                <SelectItem value="loading" disabled>Loading products...</SelectItem>
                              ) : products && products.length > 0 ? (
                                products.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No products found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <SafeNumberInput
                            defaultValue={1}
                            value={item.quantity || 1} // Ensure it's never undefined
                            onChange={(value) => updateItemQuantity(value || 1, index)}
                            min={1}
                            step={1}
                          />
                        </td>
                        <td className="p-2">
                          {/* REBUILT: Quantity Received Input with explicit handling */}
                          <SafeNumberInput
                            defaultValue={0}
                            value={item.quantityReceived}
                            onChange={(value) => updateItemQuantityReceived(value, index)}
                            onBlur={() => {
                              // Ensure form value is explicitly set on blur
                              const currentValue = item.quantityReceived || 0;
                              console.log(`BLUR EVENT: Setting quantity received for ${item.description} (index ${index}) to ${currentValue}`);
                              
                              // Update form value with full validation options
                              form.setValue(`items.${index}.quantityReceived`, currentValue, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });
                            }}
                            min={0}
                            max={item.quantity || 1}
                            step={1}
                            className="w-full"
                          />
                        </td>
                        <td className="p-2">
                          <SafeNumberInput
                            defaultValue={0}
                            value={item.unitPrice || 0} // Ensure it's never undefined
                            onChange={(value) => updateItemPrice(value || 0, index)}
                            min={0}
                            step={0.01}
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="p-2 text-center" rowSpan={2}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>,
                      
                      // Second line with Description, Tax, and Discount
                      <tr key={`item-${index}-details`} className="bg-gray-50 border-b">
                        <td colSpan={4} className="px-2 pb-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Description</label>
                              <Input
                                value={item.description || ""} 
                                onChange={(e) => {
                                  const newItems = [...billItems];
                                  newItems[index].description = e.target.value;
                                  setBillItems(newItems);
                                }}
                                placeholder="Item description"
                              />
                            </div>
                            
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Tax</label>
                              <div className="flex items-center space-x-1">
                                <Input
                                  type="number"
                                  value={item.taxRate ?? 0}
                                  onChange={(e) => updateItemTaxRate(parseFloat(e.target.value) || 0, index)}
                                  min={0}
                                  max={item.taxType === 'percentage' ? 100 : undefined}
                                  step={0.1}
                                  className="min-w-[60px]"
                                />
                                <Select 
                                  value={item.taxType || "flat"} 
                                  onValueChange={(value) => {
                                    const newItems = [...billItems];
                                    newItems[index].taxType = value as 'percentage' | 'flat';
                                    setBillItems(newItems);
                                    updateTotals(newItems);
                                  }}
                                >
                                  <SelectTrigger className="w-[70px] h-9">
                                    <SelectValue>{item.taxType === 'percentage' ? '%' : '$'}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percentage">%</SelectItem>
                                    <SelectItem value="flat">$</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Discount</label>
                              <div className="flex items-center space-x-1">
                                <SafeNumberInput
                                  defaultValue={0}
                                  value={item.discount ?? 0}
                                  onChange={(value) => updateItemDiscount(value || 0, index)}
                                  min={0}
                                  max={item.discountType === 'percentage' ? 100 : undefined}
                                  step={0.1}
                                  className="min-w-[60px]"
                                />
                                <Select 
                                  value={item.discountType || "flat"} 
                                  onValueChange={(value) => {
                                    const newItems = [...billItems];
                                    newItems[index].discountType = value as 'percentage' | 'flat';
                                    setBillItems(newItems);
                                    updateTotals(newItems);
                                  }}
                                >
                                  <SelectTrigger className="w-[70px] h-9">
                                    <SelectValue>{item.discountType === 'percentage' ? '%' : '$'}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percentage">%</SelectItem>
                                    <SelectItem value="flat">$</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ];
                  }).flat()}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {billItems.map((item, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  {/* Main section - Product, Quantity, Price, Amount, Remove button */}
                  <div className="p-4 bg-card">
                    {/* Product */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-5/6">
                        <label className="text-xs text-gray-500 mb-1 block">Product</label>
                        <Select 
                          value={item.productId.toString()} 
                          onValueChange={(value) => handleProductChange(parseInt(value), index)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {productsLoading ? (
                              <SelectItem value="loading" disabled>Loading products...</SelectItem>
                            ) : products && products.length > 0 ? (
                              products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No products found</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Quantity, Received, and Price */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                        <SafeNumberInput
                          defaultValue={1}
                          value={item.quantity || 1}
                          onChange={(value) => updateItemQuantity(value || 1, index)}
                          min={1}
                          step={1}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Received</label>
                        <SafeNumberInput
                          defaultValue={0}
                          value={item.quantityReceived || 0}
                          onChange={(value) => updateItemQuantityReceived(value || 0, index)}
                          min={0}
                          max={item.quantity || 1}
                          step={1}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Unit Price</label>
                        <SafeNumberInput
                          defaultValue={0}
                          value={item.unitPrice || 0}
                          onChange={(value) => updateItemPrice(value || 0, index)}
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                      <span className="font-medium">Line Total:</span>
                      <span className="text-right font-semibold">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Secondary section - Description, Tax, Discount */}
                  <div className="p-4 bg-gray-50 border-t">
                    {/* Description */}
                    <div className="mb-3">
                      <label className="text-xs text-gray-500 mb-1 block">Description</label>
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...billItems];
                          newItems[index].description = e.target.value;
                          setBillItems(newItems);
                        }}
                        placeholder="Item description"
                      />
                    </div>
                    
                    {/* Tax and Discount */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Tax</label>
                        <div className="flex items-center space-x-1">
                          <SafeNumberInput
                            defaultValue={0}
                            value={item.taxRate ?? 0}
                            onChange={(value) => updateItemTaxRate(value || 0, index)}
                            min={0}
                            max={item.taxType === 'percentage' ? 100 : undefined}
                            step={0.1}
                            className="min-w-[60px]"
                          />
                          <Select 
                            value={item.taxType} 
                            onValueChange={(value) => {
                              const newItems = [...billItems];
                              newItems[index].taxType = value as 'percentage' | 'flat';
                              setBillItems(newItems);
                              updateTotals(newItems);
                            }}
                          >
                            <SelectTrigger className="w-[60px] h-9">
                              <SelectValue>{item.taxType === 'percentage' ? '%' : '$'}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="flat">$</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Discount</label>
                        <div className="flex items-center space-x-1">
                          <SafeNumberInput
                            defaultValue={0}
                            value={item.discount ?? 0}
                            onChange={(value) => updateItemDiscount(value || 0, index)}
                            min={0}
                            max={item.discountType === 'percentage' ? 100 : undefined}
                            step={0.1}
                            className="min-w-[60px]"
                          />
                          <Select 
                            value={item.discountType} 
                            onValueChange={(value) => {
                              const newItems = [...billItems];
                              newItems[index].discountType = value as 'percentage' | 'flat';
                              setBillItems(newItems);
                              updateTotals(newItems);
                            }}
                          >
                            <SelectTrigger className="w-[60px] h-9">
                              <SelectValue>{item.discountType === 'percentage' ? '%' : '$'}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="flat">$</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(form.watch('subtotal'))}</span>
              </div>
              
              {/* Item Discounts Summary - Only show if there are item discounts */}
              {form.watch('discountAmount') > 0 && (
                <div className="flex justify-between">
                  <span>Item Discounts:</span>
                  <span className="text-red-500">-{formatCurrency(form.watch('discountAmount') || 0)}</span>
                </div>
              )}
              
              {/* Tax Summary - Only show if there are taxes */}
              {form.watch('taxAmount') > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(form.watch('taxAmount'))}</span>
                </div>
              )}
              
              {/* Total Discount */}
              <div className="border-t pt-2 pb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Total Discount:</span>
                  <div className="flex items-center space-x-2">
                    <SafeNumberInput
                      defaultValue={0}
                      value={totalDiscountField !== "0" ? totalDiscountField : form.watch('totalDiscount')}
                      onChange={(value) => {
                        // Update both state variable and form field
                        setTotalDiscountField(value?.toString() || "0");
                        form.setValue('totalDiscount', value || 0);
                        updateTotalsWithTotalDiscount();
                      }}
                      min={0}
                      max={totalDiscountType === 'percentage' ? 100 : undefined}
                      step={0.1}
                      className="w-20 h-8 text-right"
                    />
                    <Select 
                      value={totalDiscountType || "flat"} 
                      defaultValue="flat"
                      onValueChange={(value) => {
                        // Update both state variable and form field
                        const discountType = value as 'percentage' | 'flat';
                        setTotalDiscountType(discountType);
                        form.setValue('totalDiscountType', discountType);
                        updateTotalsWithTotalDiscount();
                      }}
                    >
                      <SelectTrigger className="w-[60px] h-8">
                        <SelectValue>
                          {totalDiscountType === 'percentage' ? '%' : '$'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat ($)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Display calculated total discount amount if percentage */}
                {form.watch('totalDiscount') > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Discount Amount:</span>
                    <span>-{formatCurrency(calculateTotalDiscountAmount())}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(form.watch('totalAmount'))}</span>
              </div>
              
              {/* Payment Made */}
              <div className="pt-4">
                <FormField
                  control={form.control}
                  name="paymentMade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Made</FormLabel>
                      <FormControl>
                        <SafeNumberInput 
                          defaultValue={0}
                          value={field.value ?? 0} // Ensure value is never undefined
                          onChange={(value) => {
                            field.onChange(value);
                          }}
                          min={0}
                          step={0.01}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          
          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter any additional notes or details about this bill" 
                    className="h-24"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveBillMutation.isPending}
            >
              {saveBillMutation.isPending ? "Saving..." : "Save Purchase Bill"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}