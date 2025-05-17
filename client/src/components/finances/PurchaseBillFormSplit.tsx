import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  const [billItems, setBillItems] = useState<PurchaseBillItem[]>(
    // Initialize with existing items if editing a bill
    editingBill?.items ? editingBill.items.map(item => {
      // Safely parse numeric values with fallbacks to avoid NaN
      const taxRateValue = typeof item.taxRate === 'string' 
        ? parseFloat(item.taxRate) || 0 
        : Number(item.taxRate || 0);
      
      const discountValue = typeof item.discount === 'string' 
        ? parseFloat(item.discount) || 0 
        : Number(item.discount || 0);
      
      return {
        productId: item.productId || 0,
        description: item.description || "",
        quantity: item.quantity || 1,
        unitPrice: (item.unitPrice || 0) / 100, // Convert from cents to dollars
        taxRate: taxRateValue,
        discount: discountValue,
        // Add type flags for tax and discount
        taxType: 'percentage', // Default to percentage
        discountType: 'percentage', // Default to percentage
        amount: (item.amount || 0) / 100 // Convert from cents to dollars
      };
    }) : []
  );
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
  
  // Set up form with defaults or pre-fill with editing data
  const form = useForm<PurchaseBill>({
    resolver: zodResolver(purchaseBillSchema),
    defaultValues: editingBill ? {
      // Pre-fill with existing bill data when editing
      vendorId: editingBill.contactId || 0,
      accountId: editingBill.accountId || 0,
      billNumber: editingBill.documentNumber || generateBillNumber(),
      billDate: editingBill.date ? new Date(editingBill.date) : new Date(),
      dueDate: editingBill.dueDate ? new Date(editingBill.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: editingBill.status || "draft",
      items: Array.isArray(editingBill.items) ? editingBill.items.map(item => {
        const taxRateValue = item.taxRate !== undefined && item.taxRate !== null 
          ? (typeof item.taxRate === 'string' ? parseFloat(item.taxRate) : Number(item.taxRate)) 
          : 0;
        
        const discountValue = item.discount !== undefined && item.discount !== null 
          ? (typeof item.discount === 'string' ? parseFloat(item.discount) : Number(item.discount)) 
          : 0;
          
        return {
          productId: item.productId || 0,
          description: item.description || "",
          quantity: item.quantity || 1,
          unitPrice: (item.unitPrice || 0) / 100, // Convert from cents to dollars
          taxRate: taxRateValue,
          discount: discountValue,
          taxType: item.taxType || 'percentage', // Default to percentage for tax
          discountType: item.discountType || 'percentage', // Default to percentage for item discount
          amount: (item.amount || 0) / 100 // Convert from cents to dollars
        };
      }) : [],
      subtotal: (editingBill.amount || 0) / 100, // Convert from cents to dollars
      taxAmount: 0, // We'll calculate this
      discountAmount: 0, // We'll calculate this
      // Set total discount properties - if editing a bill with a total discount, use its values
      // otherwise default to a flat discount of 0
      totalDiscount: editingBill.totalDiscount !== undefined ? (editingBill.totalDiscount / 100) : 0,
      totalDiscountType: editingBill.totalDiscountType || 'flat', // Default to flat for total discount
      totalAmount: (editingBill.amount || 0) / 100, // Convert from cents to dollars
      paymentMade: (editingBill.paymentReceived || 0) / 100, // Convert from cents to dollars
      notes: editingBill.notes || "",
      termsAndConditions: "Payment is due within 30 days of the bill date.",
      vendorNotes: editingBill.description || "",
    } : {
      // Default values for new bill
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
    }
  });
  
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
      unitPrice: 0,
      taxRate: 0,
      discount: 0,
      // Add new fields
      taxType: "percentage", 
      discountType: "percentage",
      amount: 0
    };
    
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
    newItems[index] = {
      ...newItems[index],
      quantity,
      amount: newItems[index].unitPrice * quantity
    };
    
    setBillItems(newItems);
    updateTotals(newItems);
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
  
  // Initialize form if editing an existing bill
  useEffect(() => {
    if (editingBill) {
      // Extract items from the transaction
      let items = editingBill.items as any[] || [];
      
      // Ensure each item has the taxType and discountType properties
      // If they don't exist in the data, default to percentage
      items = items.map(item => ({
        ...item,
        taxType: item.taxType || 'percentage',
        discountType: item.discountType || 'percentage',
        // Convert amounts from cents to dollars if needed
        amount: typeof item.amount === 'number' && item.amount > 100 ? item.amount / 100 : item.amount,
        unitPrice: typeof item.unitPrice === 'number' && item.unitPrice > 100 ? item.unitPrice / 100 : item.unitPrice
      }));
      
      setBillItems(items);
      
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
      
      form.reset({
        vendorId,
        accountId: editingBill.accountId,
        billNumber: editingBill.documentNumber || generateBillNumber(),
        billDate: editingBill.date ? new Date(editingBill.date) : new Date(),
        dueDate: new Date(new Date(editingBill.date || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000),
        status: editingBill.status as any || "draft",
        items,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount: subtotal + taxAmount - discountAmount,
        paymentMade: editingBill.paymentReceived ? editingBill.paymentReceived / 100 : 0,
        notes: editingBill.notes || "",
        termsAndConditions: "Payment is due within 30 days of the bill date.",
        vendorNotes: "",
      });
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
    
    // Prepare transaction data for saving/updating
    const billData = {
      ...data,
      // Preserve original ID and created date when editing
      ...(editingBill ? { 
        id: editingBill.id,
        createdAt: editingBill.createdAt 
      } : {}),
      items: billItems,
      // Use unitPrice instead of price to calculate the amount correctly
      amount: billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      status: data.status || "draft", // Use "draft" as default status
      paymentReceived: data.paymentMade || 0, // Use paymentMade from form data
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
                          <Input
                            type="number"
                            value={item.quantity || 1} // Ensure it's never undefined
                            onChange={(e) => updateItemQuantity(parseFloat(e.target.value) || 1, index)}
                            min={1}
                            step={1}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.unitPrice || 0} // Ensure it's never undefined
                            onChange={(e) => updateItemPrice(parseFloat(e.target.value) || 0, index)}
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
                                <Input
                                  type="number"
                                  value={item.discount ?? 0}
                                  onChange={(e) => updateItemDiscount(parseFloat(e.target.value) || 0, index)}
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
                    
                    {/* Quantity and Price */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(parseFloat(e.target.value), index)}
                          min={1}
                          step={1}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Unit Price</label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItemPrice(parseFloat(e.target.value), index)}
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
                          <Input
                            type="number"
                            value={item.taxRate ?? 0}
                            onChange={(e) => updateItemTaxRate(parseFloat(e.target.value), index)}
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
                          <Input
                            type="number"
                            value={item.discount ?? 0}
                            onChange={(e) => updateItemDiscount(parseFloat(e.target.value), index)}
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
                    <Input
                      type="number"
                      value={form.watch('totalDiscount')}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        form.setValue('totalDiscount', value);
                        updateTotalsWithTotalDiscount();
                      }}
                      min={0}
                      max={form.watch('totalDiscountType') === 'percentage' ? 100 : undefined}
                      step={0.1}
                      className="w-20 h-8 text-right"
                    />
                    <Select 
                      value={form.watch('totalDiscountType')} 
                      defaultValue="flat"
                      onValueChange={(value) => {
                        form.setValue('totalDiscountType', value as 'percentage' | 'flat');
                        updateTotalsWithTotalDiscount();
                      }}
                    >
                      <SelectTrigger className="w-[60px] h-8">
                        <SelectValue>
                          {form.watch('totalDiscountType') === 'percentage' ? '%' : '$'}
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
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
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