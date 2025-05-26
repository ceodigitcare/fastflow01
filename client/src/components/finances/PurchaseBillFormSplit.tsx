import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { type User, type Product, type Account, type Transaction } from "@shared/schema";
import { purchaseBillSchema } from "@/lib/validation";
import { z } from "zod";
import { calculatePurchaseBillStatus } from "@/lib/purchase-bill-utils";

// Generate unique bill number with timestamp
function generateBillNumber() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = Math.floor(now.getTime() / 1000).toString().slice(-4);
  const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BILL-${dateStr}-${timeStr}${randomStr}`;
}

type PurchaseBill = z.infer<typeof purchaseBillSchema>;

interface PurchaseBillFormSplitProps {
  onCancel: () => void;
  onSave: (bill: Transaction) => void;
  editingBill?: Transaction | null;
}

interface PurchaseBillItem {
  productId: number;
  description: string;
  quantity: number;
  quantityReceived: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  discount: number;
  taxType: 'flat' | 'percentage';
  discountType: 'flat' | 'percentage';
}

// Utility function for extracting quantity received values
function extractQuantityReceived(editingBill: Transaction, productId: number): number {
  console.log(`INITIALIZATION: Starting extraction for product ${productId} (${getProductDescription(editingBill, productId)})`);
  
  // Primary method: Check direct property on items
  if (editingBill?.items && Array.isArray(editingBill.items)) {
    const matchingItem = editingBill.items.find((item: any) => item.productId === productId);
    if (matchingItem && typeof matchingItem.quantityReceived === 'number' && matchingItem.quantityReceived > 0) {
      console.log(`EXTRACT: Direct property found with value ${matchingItem.quantityReceived} for product ${productId}`);
      return matchingItem.quantityReceived;
    }
  }
  
  // Fallback method: Check metadata
  if (editingBill?.metadata) {
    let metadataObj: any = editingBill.metadata;
    
    if (typeof editingBill.metadata === 'string') {
      try {
        metadataObj = JSON.parse(editingBill.metadata);
      } catch (e) {
        console.log("Could not parse metadata for quantity extraction");
        return 0;
      }
    }
    
    // Check receivedQuantityMap
    if (metadataObj?.receivedQuantityMap?.[productId]) {
      const metadataValue = Number(metadataObj.receivedQuantityMap[productId]);
      if (!isNaN(metadataValue) && metadataValue > 0) {
        console.log(`EXTRACT: Metadata receivedQuantityMap found with value ${metadataValue} for product ${productId}`);
        return metadataValue;
      }
    }
    
    // Check itemQuantitiesReceived array
    if (metadataObj?.itemQuantitiesReceived && Array.isArray(metadataObj.itemQuantitiesReceived)) {
      const itemEntry = metadataObj.itemQuantitiesReceived.find((item: any) => item.productId === productId);
      if (itemEntry && typeof itemEntry.quantityReceived === 'number' && itemEntry.quantityReceived > 0) {
        console.log(`EXTRACT: Metadata itemQuantitiesReceived found with value ${itemEntry.quantityReceived} for product ${productId}`);
        return itemEntry.quantityReceived;
      }
    }
  }
  
  console.log(`EXTRACT: No quantity received found for product ${productId}, returning 0`);
  return 0;
}

function getProductDescription(editingBill: Transaction, productId: number): string {
  if (editingBill?.items && Array.isArray(editingBill.items)) {
    const item = editingBill.items.find((item: any) => item.productId === productId);
    return item?.description || `Product ${productId}`;
  }
  return `Product ${productId}`;
}

export default function PurchaseBillFormSplit({ 
  onCancel, 
  onSave, 
  editingBill 
}: PurchaseBillFormSplitProps) {
  const queryClient = useQueryClient();

  // Initialize bill items from editing bill or empty array
  const [billItems, setBillItems] = useState<PurchaseBillItem[]>(() => {
    console.log("INIT - Initializing bill items from editing bill:", editingBill);
    console.log("INIT - Items data to initialize from:", editingBill?.items);
    
    if (!editingBill?.items || !Array.isArray(editingBill.items)) {
      console.log("INIT - No items to initialize, starting with empty array");
      return [];
    }

    // Initialize quantities from metadata if available
    let quantityReceivedMap: { [productId: number]: number } = {};
    
    if (editingBill.metadata) {
      console.log("✅ INIT - Bill has metadata property");
      let metadataObj: any = editingBill.metadata;
      
      // Parse metadata if it's a string
      if (typeof editingBill.metadata === 'string') {
        try {
          metadataObj = JSON.parse(editingBill.metadata);
          console.log("✅ INIT - Successfully parsed metadata string:", metadataObj);
        } catch (e) {
          console.log("⚠️ INIT - Could not parse metadata string:", e);
          metadataObj = {};
        }
      }

      // Debug metadata content
      console.log("INIT - Full metadata object:", metadataObj);
      
      // Extract receivedQuantityMap if available
      if (metadataObj?.receivedQuantityMap && typeof metadataObj.receivedQuantityMap === 'object') {
        console.log("✅ INIT - Found receivedQuantityMap in metadata:", metadataObj.receivedQuantityMap);
        
        // Convert string keys to numbers and ensure values are numbers
        Object.keys(metadataObj.receivedQuantityMap).forEach(key => {
          const productId = Number(key);
          const quantity = Number(metadataObj.receivedQuantityMap[key]);
          if (!isNaN(productId) && !isNaN(quantity) && quantity > 0) {
            quantityReceivedMap[productId] = quantity;
            console.log(`INIT - Mapped product ${productId} to quantity ${quantity}`);
          }
        });
      }
      
      // Also try to extract from itemQuantitiesReceived array format
      if (metadataObj?.itemQuantitiesReceived && Array.isArray(metadataObj.itemQuantitiesReceived)) {
        console.log("✅ INIT - Found itemQuantitiesReceived array in metadata:", metadataObj.itemQuantitiesReceived);
        
        metadataObj.itemQuantitiesReceived.forEach((item: any) => {
          if (item?.productId && item?.quantityReceived) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantityReceived);
            if (!isNaN(productId) && !isNaN(quantity) && quantity > 0) {
              quantityReceivedMap[productId] = quantity;
              console.log(`INIT - Mapped product ${productId} to quantity ${quantity} from array`);
            }
          }
        });
      } else {
        console.log("⚠️ INIT - No received quantities found in metadata");
      }
    }

    // Debug: Check if we found any quantities from metadata
    console.log("INIT - Metadata quantities found:", quantityReceivedMap);
    
    // Process items and also check for direct quantities in items themselves
    const initialItems: PurchaseBillItem[] = [];
    
    // If no metadata quantities, check items for direct quantityReceived properties
    if (Object.keys(quantityReceivedMap).length === 0) {
      console.log("INIT - No metadata quantities, checking items for direct properties");
      
      editingBill.items.forEach((item: any) => {
        if (item.productId && typeof item.quantityReceived === 'number' && item.quantityReceived > 0) {
          quantityReceivedMap[item.productId] = item.quantityReceived;
          console.log(`INIT - Found direct quantity for product ${item.productId}: ${item.quantityReceived}`);
        }
      });
      
      console.log("INIT - Found direct quantities in items:", Object.keys(quantityReceivedMap));
      editingBill.items.forEach((item: any) => {
        if (item.productId && typeof item.quantityReceived === 'number' && item.quantityReceived > 0) {
          console.log(`INIT - Adding direct quantity for product ${item.productId}: ${item.quantityReceived}`);
          quantityReceivedMap[item.productId] = item.quantityReceived;
        }
      });
    }
    
    console.log("INIT - Final quantityReceivedMap:", quantityReceivedMap);
    
    // Convert items to the format needed by the form
    editingBill.items.forEach((item: any, index: number) => {
      // Get the quantityReceived for this product
      const quantityReceived = quantityReceivedMap[item.productId] || 0;
      
      console.log(`INIT - Processing item ${index}:`, {
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        quantityReceived: quantityReceived,
        unitPrice: item.unitPrice / 100,
        amount: item.amount / 100
      });
      
      console.log(`INIT - FINAL quantityReceived for product ${item.productId} (${item.description}): ${quantityReceived}`);
      
      initialItems.push({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        quantityReceived: quantityReceived,
        unitPrice: item.unitPrice / 100, // Convert from cents to dollars for display
        amount: item.amount / 100, // Convert from cents to dollars for display
        taxRate: item.taxRate || 0,
        discount: item.discount || 0,
        taxType: item.taxType || 'percentage',
        discountType: item.discountType || 'percentage'
      });
    });
    
    console.log("INIT - Final initialized items:", initialItems);
    
    // Default to empty array if not editing
    return initialItems;
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
    address: ""
  });

  // Get products for product selection
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });

  // Get accounts for account selection
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"]
  });

  // Default values for the form
  const defaultEmptyBill: PurchaseBill = {
    accountId: accounts?.[0]?.id || 1,
    items: [],
    status: "draft",
    vendorId: 1,
    billNumber: generateBillNumber(),
    billDate: new Date(),
    dueDate: new Date(),
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    totalDiscount: 0,
    totalDiscountType: "flat",
    paymentMade: 0,
    notes: "",
    vendorNotes: ""
  };

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: { name: string; email: string; phone: string; address: string; }) => {
      const response = await apiRequest("POST", "/api/users", {
        ...vendorData,
        type: "vendor"
      });
      return response.json();
    },
    onSuccess: (data: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAddVendorDialogOpen(false);
      setNewVendor({ name: "", email: "", phone: "", address: "" });
      form.setValue("vendorId", data.id);
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form setup with proper default values
  const form = useForm<PurchaseBill>({
    resolver: zodResolver(purchaseBillSchema),
    defaultValues: editingBill ? {
      vendorId: editingBill.vendorId || null,
      accountId: editingBill.accountId || accounts?.[0]?.id || 1,
      billNumber: editingBill.billNumber || editingBill.documentNumber || generateBillNumber(),
      billDate: editingBill.billDate ? new Date(editingBill.billDate) : editingBill.date ? new Date(editingBill.date) : new Date(),
      dueDate: editingBill.dueDate ? new Date(editingBill.dueDate) : editingBill.dueDate ? new Date(editingBill.dueDate) : new Date(),
      status: editingBill.status as any,
      items: billItems.map(item => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        quantityReceived: item.quantityReceived,
        unitPrice: item.unitPrice,
        amount: item.amount,
        taxRate: item.taxRate,
        discount: item.discount,
        taxType: item.taxType as 'flat' | 'percentage',
        discountType: item.discountType as 'flat' | 'percentage'
      })),
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      totalDiscount: 0,
      totalDiscountType: "flat",
      paymentMade: 0,
      notes: editingBill.notes || "",
      attachments: [],
      vendorNotes: ""
    } : defaultEmptyBill
  });

  // Function to parse and extract quantities correctly
  function parseQuantitiesFromTransaction(editingBill: Transaction): { [productId: number]: number } {
    console.log("INITIALIZATION: Starting extraction for all products in bill");
    
    const quantities: { [productId: number]: number } = {};
    
    if (!editingBill?.items || !Array.isArray(editingBill.items)) {
      console.log("EXTRACT: No items array found");
      return quantities;
    }
    
    // Process each item and extract its quantity received
    editingBill.items.forEach((item: any) => {
      if (item.productId) {
        const extractedQty = extractQuantityReceived(editingBill, item.productId);
        quantities[item.productId] = extractedQty;
        
        const debugInfo = {
          productId: item.productId,
          extractedQuantity: extractedQty,
          directProperty: item.quantityReceived,
          description: item.description
        };
        
        console.log(`EXTRACTION COMPLETE for product ${item.productId}:`, debugInfo);
      }
    });
    
    return quantities;
  }

  // Parse metadata for quantities when editing
  function parseMetadataQuantities(editingBill: Transaction): { [productId: number]: number } {
    const quantities: { [productId: number]: number } = {};
    
    if (!editingBill?.metadata) {
      return quantities;
    }
    
    let metadataObj: any = editingBill.metadata;
    
    // Parse metadata if string
    if (typeof editingBill.metadata === 'string') {
      try {
        metadataObj = JSON.parse(editingBill.metadata);
        console.log("Parsed metadata:", metadataObj);
      } catch (e) {
        console.log("Failed to parse metadata:", e);
        return quantities;
      }
    }
    
    // Extract from receivedQuantityMap
    if (metadataObj?.receivedQuantityMap) {
      Object.keys(metadataObj.receivedQuantityMap).forEach(productIdStr => {
        const productId = Number(productIdStr);
        const quantity = Number(metadataObj.receivedQuantityMap[productIdStr]);
        if (!isNaN(productId) && !isNaN(quantity) && quantity > 0) {
          quantities[productId] = quantity;
        }
      });
    }
    
    // Extract from itemQuantitiesReceived array
    if (metadataObj?.itemQuantitiesReceived && Array.isArray(metadataObj.itemQuantitiesReceived)) {
      metadataObj.itemQuantitiesReceived.forEach((item: any) => {
        if (item?.productId && item?.quantityReceived) {
          const productId = Number(item.productId);
          const quantity = Number(item.quantityReceived);
          if (!isNaN(productId) && !isNaN(quantity) && quantity > 0) {
            quantities[productId] = quantity;
          }
        }
      });
    }
    
    return quantities;
  }

  // Get total discount from bill metadata or bill direct property
  function getTotalDiscountFromBill(editingBill: Transaction): { amount: number; type: string } {
    console.log("Getting totalDiscount from bill:", editingBill);
    
    // First check if bill has direct totalDiscount property
    if (editingBill.totalDiscount !== undefined && editingBill.totalDiscount !== null) {
      console.log("Found totalDiscount in direct property:", editingBill.totalDiscount);
      const discountType = editingBill.totalDiscountType || "flat";
      console.log("Setting totalDiscount:", editingBill.totalDiscount, "type:", discountType);
      return {
        amount: Number(editingBill.totalDiscount) / 100, // Convert from cents to dollars
        type: discountType
      };
    }
    
    // Then check metadata
    if (editingBill.metadata) {
      let metadataObj: any = editingBill.metadata;
      
      if (typeof editingBill.metadata === 'string') {
        try {
          metadataObj = JSON.parse(editingBill.metadata);
        } catch (e) {
          console.log("Could not parse metadata for totalDiscount");
          return { amount: 0, type: "flat" };
        }
      }
      
      if (metadataObj?.totalDiscount !== undefined) {
        console.log("Found totalDiscount in metadata:", metadataObj.totalDiscount);
        return {
          amount: Number(metadataObj.totalDiscount) / 100, // Convert from cents to dollars
          type: metadataObj.totalDiscountType || "flat"
        };
      }
    }
    
    return { amount: 0, type: "flat" };
  }

  // Initialize form when editing bill changes
  useEffect(() => {
    console.log("BILL EDIT DEBUG - Full bill being edited:", editingBill);
    
    if (!editingBill) {
      // Reset form to defaults for new bill
      form.reset(defaultEmptyBill);
      setBillItems([]);
      return;
    }
    
    // Parse metadata to object if needed
    let metadataObj: any = {};
    if (editingBill.metadata) {
      if (typeof editingBill.metadata === 'string') {
        try {
          metadataObj = JSON.parse(editingBill.metadata);
          console.log("DEBUG: Successfully parsed metadata from string");
        } catch (e) {
          console.log("DEBUG: Failed to parse metadata string");
          metadataObj = {};
        }
      } else if (typeof editingBill.metadata === 'object') {
        metadataObj = editingBill.metadata;
        console.log("DEBUG: Metadata was already an object");
      }
    }
    
    console.log("DEBUG: Raw metadata content:", metadataObj);
    
    // Parse quantities from metadata first
    const metadataQuantities = parseMetadataQuantities(editingBill);
    console.log("DEBUG: Properly validated quantities from metadata:", metadataQuantities);
    
    // Create quantities map combining metadata and direct properties
    const finalQuantities: { [productId: number]: number } = { ...metadataQuantities };
    
    // Also check direct properties on items as fallback
    if (editingBill.items && Array.isArray(editingBill.items)) {
      if (Object.keys(finalQuantities).length === 0) {
        console.log("DEBUG: Found direct quantities in items:", editingBill.items.length);
        editingBill.items.forEach((item: any) => {
          if (item.productId && typeof item.quantityReceived === 'number' && item.quantityReceived > 0) {
            console.log(`DEBUG: Added direct quantity for product ${item.productId}: ${item.quantityReceived}`);
            finalQuantities[item.productId] = item.quantityReceived;
          }
        });
      }
      
      console.log("DEEP DEBUG - Raw transaction items before processing:", editingBill.items);
      console.log("DEEP DEBUG - Full transaction object:", JSON.stringify(editingBill).substring(0, 500) + "...[Truncated]");
      
      editingBill.items.forEach((item: any, index: number) => {
        console.log(`DEEP DEBUG - Raw item data for product ${item.productId}:`, item);
        
        // Check for direct quantityReceived property
        if (typeof item.quantityReceived === 'number') {
          console.log(`DEEP DEBUG - Found direct quantityReceived=${item.quantityReceived} on item for product ${item.productId}`);
          
          // Log all properties of the item for debugging
          Object.keys(item).forEach(key => {
            console.log(`DEEP DEBUG - Item property [${key}] = ${item[key]}`);
          });
          
          const finalDecision = {
            productId: item.productId,
            finalQuantity: item.quantityReceived,
            source: "direct-property"
          };
          
          console.log(`DEEP DEBUG - Final processing decision for ${item.description} (ID: ${item.productId})`, finalDecision);
        }
      });
    }
    
    // Get totalDiscount information
    const totalDiscountInfo = getTotalDiscountFromBill(editingBill);
    console.log("Found totalDiscount in direct property:", totalDiscountInfo.amount);
    console.log("Setting totalDiscount:", totalDiscountInfo.amount, "type:", totalDiscountInfo.type);
    
    // Convert items to the format needed by the form
    const formattedItems: PurchaseBillItem[] = [];
    
    if (editingBill.items && Array.isArray(editingBill.items)) {
      editingBill.items.forEach((item: any) => {
        // CRITICAL: Get the correct quantityReceived value
        let quantityReceived = 0;
        
        // Priority 1: Direct property
        if (typeof item.quantityReceived === 'number') {
          quantityReceived = item.quantityReceived;
        } 
        // Priority 2: From finalQuantities map (metadata)
        else if (finalQuantities[item.productId]) {
          quantityReceived = finalQuantities[item.productId];
        }
        
        // DEBUG: Track how we got this value
        const debugInfo = {
          productId: item.productId,
          description: item.description,
          directProperty: item.quantityReceived,
          fromMetadata: finalQuantities[item.productId],
          finalValue: quantityReceived,
          source: typeof item.quantityReceived === 'number' ? 'direct' : 'metadata'
        };
        
        console.log("DEBUG: Checking for metadata in editingBill:", !!editingBill.metadata);
        
        // Get totalDiscount from metadata if available
        if (editingBill.metadata) {
          let metadataObj: any = editingBill.metadata;
          
          if (typeof editingBill.metadata === 'string') {
            try {
              metadataObj = JSON.parse(editingBill.metadata);
            } catch (e) {
              metadataObj = {};
            }
          }
          
          console.log("Using totalDiscount from direct property:", totalDiscountInfo.amount);
        }
        
        console.log("⚠️ FIXED: Quantity for product", item.productId, `(${item.description}):`, debugInfo);
        
        formattedItems.push({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          quantityReceived: quantityReceived,
          unitPrice: (item.unitPrice || 0) / 100, // Convert from cents
          amount: (item.amount || 0) / 100, // Convert from cents
          taxRate: item.taxRate || 0,
          discount: item.discount || 0,
          taxType: item.taxType || 'percentage',
          discountType: item.discountType || 'percentage'
        });
      });
    }
    
    console.log("🔍 FINAL ITEMS FOR FORM:", formattedItems.map(item => ({
      productId: item.productId,
      description: item.description,
      quantityReceived: item.quantityReceived
    })));
    
    // Update bill items state
    setBillItems(formattedItems);
    
    // Update form with the correct values
    const formData: PurchaseBill = {
      vendorId: editingBill.vendorId || null,
      accountId: editingBill.accountId || 1,
      billNumber: editingBill.billNumber || editingBill.documentNumber || generateBillNumber(),
      billDate: editingBill.billDate ? new Date(editingBill.billDate) : new Date(editingBill.date || Date.now()),
      dueDate: editingBill.dueDate ? new Date(editingBill.dueDate) : new Date(editingBill.dueDate || Date.now()),
      status: editingBill.status as any,
      items: formattedItems.map((item, index) => {
        console.log(`🔧 EXPLICITLY set form item ${index} (${item.productId}) quantityReceived to: ${item.quantityReceived}`);
        return {
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          quantityReceived: item.quantityReceived, // This should be the correct value
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxRate: item.taxRate,
          discount: item.discount,
          taxType: item.taxType as 'flat' | 'percentage',
          discountType: item.discountType as 'flat' | 'percentage'
        };
      }),
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      totalDiscount: totalDiscountInfo.amount,
      totalDiscountType: totalDiscountInfo.type as 'flat' | 'percentage',
      paymentMade: (editingBill.paymentReceived || 0) / 100, // Convert from cents
      notes: editingBill.notes || "",
      attachments: [],
      vendorNotes: ""
    };
    
    formattedItems.forEach((item, index) => {
      console.log(`Final form reset - Product ${item.productId}: Quantity ${item.quantityReceived}`);
    });
    
    console.log("REBUILD - Initializing form with complete bill data and quantities");
    
    // Reset form with proper data
    form.reset(formData);
    
    // Verify the quantities were set correctly
    setTimeout(() => {
      formattedItems.forEach((item, index) => {
        console.log(`INIT ITEM ${index}: ${item.description} (ID: ${item.productId})`, {
          quantityReceived: item.quantityReceived,
          source: 'final-verification'
        });
        
        // Get the actual form value to verify
        const formItems = form.getValues('items');
        if (formItems && formItems[index]) {
          const formQuantity = formItems[index].quantityReceived;
          console.log(`FORM VERIFICATION: Item ${index} form quantityReceived = ${formQuantity}`);
        }
      });
      
      console.log("REBUILD - Quantity confirmation complete");
      
    }, 200);
    
  }, [editingBill, vendors]);

  // Calculate totals whenever bill items change
  useEffect(() => {
    calculateTotals();
  }, [billItems]);

  // Mutation for saving/updating the bill
  const mutation = useMutation({
    mutationFn: async (data: PurchaseBill) => {
      const url = editingBill ? `/api/transactions/${editingBill.id}` : "/api/transactions";
      const method = editingBill ? "PATCH" : "POST";
      
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: (data: Transaction) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      onSave(data);
      toast({
        title: "Success",
        description: editingBill ? "Purchase bill updated successfully" : "Purchase bill created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form submission handler with automated status calculation
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
    // FIX: Ensure no NaN values are sent to database
    const totalDiscountValue = isNaN(Number(data.totalDiscount)) ? 0 : Number(data.totalDiscount || 0) * 100;
    const paymentMadeValue = isNaN(Number(data.paymentMade)) ? 0 : Number(data.paymentMade || 0) * 100;
    
    // Calculate automated status based on payment and receipt conditions
    const calculatedStatus = calculatePurchaseBillStatus(
      data.totalAmount,
      data.paymentMade || 0,
      billItems.map(item => ({
        quantity: item.quantity,
        quantityReceived: item.quantityReceived || 0
      })),
      false // No longer using cancelled status
    );
    
    // Log what we're saving
    console.log("Saving bill with data:", {
      totalDiscount: totalDiscountValue,
      totalDiscountType: data.totalDiscountType,
      dueDate: data.dueDate,
      calculatedStatus: calculatedStatus
    });
    
    // COMPLETELY SIMPLIFIED: Process items with a clean, reliable approach
    // FIX: Ensure no NaN values in any numeric fields
    const processedItems = billItems.map(item => {
      // Check if the unitPrice is already in cents or dollars for conversion
      const isUnitPriceInCents = Number(item.unitPrice) > 100;
      
      // Get the most up-to-date form values first
      const formItems = form.getValues('items') || [];
      const formIndex = billItems.indexOf(item);
      const formItem = formItems[formIndex];
      
      // ----- CRITICAL DATA FLOW: SUBMISSION PHASE -----
      // During form submission, we need to extract & validate received quantities
      
      // Track all values and sources for debugging
      const qtySourceTracker = {
        formValue: null as number | null,
        stateValue: null as number | null,
        finalValue: null as number | null,
        source: "unknown"
      };
      
      // ATTEMPT 1: Form state is most reliable source (direct user input)
      if (formItem && formItem.quantityReceived !== undefined) {
        const formValue = Number(formItem.quantityReceived);
        if (!isNaN(formValue)) {
          qtySourceTracker.formValue = formValue;
          qtySourceTracker.finalValue = formValue;
          qtySourceTracker.source = "form-value";
          console.log(`SUBMIT EXTRACTION: Form value ${formValue} for product ${item.productId}`);
        }
      }
      
      // ATTEMPT 2: Item state is fallback if form state is unavailable
      if ((!qtySourceTracker.finalValue || qtySourceTracker.finalValue === 0) && 
          item.quantityReceived !== undefined && item.quantityReceived > 0) {
        qtySourceTracker.stateValue = item.quantityReceived;
        qtySourceTracker.finalValue = item.quantityReceived;
        qtySourceTracker.source = "item-state";
        console.log(`SUBMIT EXTRACTION: Item state value ${item.quantityReceived} for product ${item.productId}`);
      }
      
      // ATTEMPT 3: Default to 0 if nothing found
      if (!qtySourceTracker.finalValue) {
        qtySourceTracker.finalValue = 0;
        qtySourceTracker.source = "default-zero";
      }
      
      console.log(`FINAL SUBMIT QUANTITY for product ${item.productId}:`, qtySourceTracker);
      
      return {
        productId: item.productId,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        quantityReceived: qtySourceTracker.finalValue,
        unitPrice: Math.round((isUnitPriceInCents ? Number(item.unitPrice) : Number(item.unitPrice) * 100) || 0), // Convert to cents
        amount: Math.round(Number(item.amount) * 100 || 0), // Convert to cents
        taxRate: Number(item.taxRate) || 0,
        discount: Number(item.discount) || 0,
        taxType: item.taxType || 'percentage',
        discountType: item.discountType || 'percentage'
      };
    });
    
    console.log("Processing items for submission:", processedItems);
    
    // Create the final data object for submission
    const submissionData = {
      type: "expense" as const,
      category: "Purchases",
      businessId: 1, // This should come from context or props
      ...data,
      amount: Math.round(data.totalAmount * 100), // Convert to cents
      date: data.billDate,
      documentNumber: data.billNumber,
      description: `Bill #${data.billNumber}`,
      contactName: data.vendorId ? vendors?.find(v => v.id === data.vendorId)?.name || "Unknown Vendor" : "No Vendor Selected",
      paymentReceived: paymentMadeValue,
      totalDiscount: totalDiscountValue,
      status: calculatedStatus,
      items: processedItems,
      metadata: {
        totalDiscount: totalDiscountValue,
        totalDiscountType: data.totalDiscountType,
        dueDate: data.dueDate?.toISOString(),
        // Store item quantities in metadata for reliable retrieval
        itemQuantitiesReceived: processedItems.map(item => ({
          productId: item.productId,
          quantityReceived: item.quantityReceived
        })),
        receivedQuantityMap: processedItems.reduce((acc, item) => {
          acc[item.productId] = item.quantityReceived;
          return acc;
        }, {} as { [key: number]: number })
      }
    };
    
    console.log("Final submission data:", submissionData);
    
    mutation.mutate(submissionData);
  };

  // Helper functions for managing bill items
  const addItem = () => {
    const newItem: PurchaseBillItem = {
      productId: 0,
      description: "",
      quantity: 1,
      quantityReceived: 0,
      unitPrice: 0,
      amount: 0,
      taxRate: 0,
      discount: 0,
      taxType: 'percentage',
      discountType: 'percentage'
    };
    
    setBillItems([...billItems, newItem]);
    
    // Add to form array as well
    const currentItems = form.getValues("items") || [];
    form.setValue("items", [...currentItems, {
      productId: 0,
      description: "",
      quantity: 1,
      quantityReceived: 0,
      unitPrice: 0,
      amount: 0,
      taxRate: 0,
      discount: 0,
      taxType: 'percentage' as const,
      discountType: 'percentage' as const
    }]);
    
    calculateTotals();
  };

  const removeItem = (index: number) => {
    const newItems = billItems.filter((_, i) => i !== index);
    setBillItems(newItems);
    
    // Update form array
    const currentItems = form.getValues("items") || [];
    const newFormItems = currentItems.filter((_, i) => i !== index);
    form.setValue("items", newFormItems);
    
    calculateTotals();
  };

  const handleProductChange = (productId: number, index: number) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      const updatedItems = [...billItems];
      updatedItems[index] = {
        ...updatedItems[index],
        productId: product.id,
        description: product.description || product.name,
        unitPrice: product.price / 100, // Convert from cents to dollars
      };
      setBillItems(updatedItems);
      
      // Update form
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.description`, product.description || product.name);
      form.setValue(`items.${index}.unitPrice`, product.price / 100);
      
      // Recalculate line amount
      updateLineAmount(index, updatedItems[index]);
    }
  };

  const updateLineAmount = (index: number, item: PurchaseBillItem) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;
    
    let lineTotal = quantity * unitPrice;
    
    // Apply discount
    if (item.discountType === 'percentage') {
      lineTotal = lineTotal * (1 - discount / 100);
    } else {
      lineTotal = lineTotal - discount;
    }
    
    // Apply tax
    if (item.taxType === 'percentage') {
      lineTotal = lineTotal * (1 + taxRate / 100);
    } else {
      lineTotal = lineTotal + taxRate;
    }
    
    const updatedItems = [...billItems];
    updatedItems[index] = { ...item, amount: lineTotal };
    setBillItems(updatedItems);
    
    // Update form
    form.setValue(`items.${index}.amount`, lineTotal);
    
    calculateTotals();
  };

  const calculateTotals = () => {
    const subtotal = billItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDiscountValue = Number(form.getValues("totalDiscount")) || 0;
    const totalDiscountType = form.getValues("totalDiscountType") || "flat";
    
    let discountAmount = 0;
    if (totalDiscountType === 'percentage') {
      discountAmount = subtotal * (totalDiscountValue / 100);
    } else {
      discountAmount = totalDiscountValue;
    }
    
    const totalAmount = Math.max(0, subtotal - discountAmount);
    
    // Update form with calculated values
    form.setValue("subtotal", subtotal);
    form.setValue("discountAmount", discountAmount);
    form.setValue("totalAmount", totalAmount);
  };

  // Get status information for display
  const getStatusInfo = () => {
    if (!editingBill) {
      return { label: "Draft", colorClass: "text-gray-600 bg-gray-100 border-gray-200" };
    }
    
    const status = editingBill.status;
    switch (status) {
      case "draft":
        return { label: "Draft", colorClass: "text-gray-600 bg-gray-100 border-gray-200" };
      case "received":
        return { label: "Fully Received", colorClass: "text-green-600 bg-green-100 border-green-200" };
      case "paid":
        return { label: "Paid", colorClass: "text-blue-600 bg-blue-100 border-blue-200" };
      case "partial_paid":
        return { label: "Partially Paid", colorClass: "text-yellow-600 bg-yellow-100 border-yellow-200" };
      case "partial_received":
        return { label: "Partially Received", colorClass: "text-orange-600 bg-orange-100 border-orange-200" };
      case "paid_received":
        return { label: "Paid & Received", colorClass: "text-green-600 bg-green-100 border-green-200" };
      case "paid_partial_received":
        return { label: "Paid & Partially Received", colorClass: "text-blue-600 bg-blue-100 border-blue-200" };
      case "partial_paid_received":
        return { label: "Partially Paid & Received", colorClass: "text-indigo-600 bg-indigo-100 border-indigo-200" };
      case "partial_paid_partial_received":
        return { label: "Partially Paid & Partially Received", colorClass: "text-purple-600 bg-purple-100 border-purple-200" };
      case "cancelled":
        return { label: "Cancelled", colorClass: "text-red-600 bg-red-100 border-red-200" };
      default:
        return { label: status || "Unknown", colorClass: "text-gray-600 bg-gray-100 border-gray-200" };
    }
  };

  if (vendorsLoading || productsLoading || accountsLoading) {
    return <div>Loading...</div>;
  }

  const badge = getStatusInfo();

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {editingBill ? "Edit Purchase Bill" : "Create Purchase Bill"}
              </h2>
              {editingBill && (
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badge.colorClass}`}>
                    {badge.label}
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : editingBill ? "Update Bill" : "Create Bill"}
              </Button>
            </div>
          </div>
          
          {/* Basic Information */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vendor Selection */}
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <div className="flex gap-2">
                        <Select value={field.value?.toString() || ""} onValueChange={(value) => field.onChange(parseInt(value) || null)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">No Vendor Selected</SelectItem>
                            {vendors?.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAddVendorDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
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
                      <FormLabel>Account</FormLabel>
                      <Select value={field.value?.toString() || ""} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.name}
                            </SelectItem>
                          ))}
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
                
                {/* Status - Read Only Display */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="text-sm text-gray-600">
                    {badge.label}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Status updates automatically based on payments and receipts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Line Items */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Items</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addItem}
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
                                  <SelectItem value="0">Select a product</SelectItem>
                                  {products?.map((product) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = Number(e.target.value);
                                  const updatedItems = [...billItems];
                                  updatedItems[index] = { ...item, quantity: newQuantity };
                                  setBillItems(updatedItems);
                                  form.setValue(`items.${index}.quantity`, newQuantity);
                                  updateLineAmount(index, updatedItems[index]);
                                }}
                                min={0}
                                step={1}
                                className="w-20"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={item.quantityReceived || 0}
                                onChange={(e) => {
                                  const newQuantityReceived = Number(e.target.value);
                                  const updatedItems = [...billItems];
                                  updatedItems[index] = { ...item, quantityReceived: newQuantityReceived };
                                  setBillItems(updatedItems);
                                  form.setValue(`items.${index}.quantityReceived`, newQuantityReceived);
                                }}
                                min={0}
                                max={item.quantity}
                                step={1}
                                className="w-20"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newUnitPrice = Number(e.target.value);
                                  const updatedItems = [...billItems];
                                  updatedItems[index] = { ...item, unitPrice: newUnitPrice };
                                  setBillItems(updatedItems);
                                  form.setValue(`items.${index}.unitPrice`, newUnitPrice);
                                  updateLineAmount(index, updatedItems[index]);
                                }}
                                min={0}
                                step={0.01}
                                className="w-24"
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
                                    value={item.description}
                                    onChange={(e) => {
                                      const updatedItems = [...billItems];
                                      updatedItems[index] = { ...item, description: e.target.value };
                                      setBillItems(updatedItems);
                                      form.setValue(`items.${index}.description`, e.target.value);
                                    }}
                                    placeholder="Item description"
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Tax</label>
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      value={item.taxRate}
                                      onChange={(e) => {
                                        const newTaxRate = Number(e.target.value);
                                        const updatedItems = [...billItems];
                                        updatedItems[index] = { ...item, taxRate: newTaxRate };
                                        setBillItems(updatedItems);
                                        form.setValue(`items.${index}.taxRate`, newTaxRate);
                                        updateLineAmount(index, updatedItems[index]);
                                      }}
                                      min={0}
                                      step={0.01}
                                      className="h-8 flex-1"
                                    />
                                    <Select 
                                      value={item.taxType} 
                                      onValueChange={(value: 'flat' | 'percentage') => {
                                        const updatedItems = [...billItems];
                                        updatedItems[index] = { ...item, taxType: value };
                                        setBillItems(updatedItems);
                                        form.setValue(`items.${index}.taxType`, value);
                                        updateLineAmount(index, updatedItems[index]);
                                      }}
                                    >
                                      <SelectTrigger className="h-8 w-16">
                                        <SelectValue />
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
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      value={item.discount}
                                      onChange={(e) => {
                                        const newDiscount = Number(e.target.value);
                                        const updatedItems = [...billItems];
                                        updatedItems[index] = { ...item, discount: newDiscount };
                                        setBillItems(updatedItems);
                                        form.setValue(`items.${index}.discount`, newDiscount);
                                        updateLineAmount(index, updatedItems[index]);
                                      }}
                                      min={0}
                                      step={0.01}
                                      className="h-8 flex-1"
                                    />
                                    <Select 
                                      value={item.discountType}
                                      onValueChange={(value: 'flat' | 'percentage') => {
                                        const updatedItems = [...billItems];
                                        updatedItems[index] = { ...item, discountType: value };
                                        setBillItems(updatedItems);
                                        form.setValue(`items.${index}.discountType`, value);
                                        updateLineAmount(index, updatedItems[index]);
                                      }}
                                    >
                                      <SelectTrigger className="h-8 w-16">
                                        <SelectValue />
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
                            <td></td>
                          </tr>
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {billItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Select 
                            value={item.productId?.toString() || "0"} 
                            onValueChange={(value) => handleProductChange(parseInt(value), index)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Select a product</SelectItem>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="ml-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const updatedItems = [...billItems];
                          updatedItems[index] = { ...item, description: e.target.value };
                          setBillItems(updatedItems);
                          form.setValue(`items.${index}.description`, e.target.value);
                        }}
                        placeholder="Item description"
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = Number(e.target.value);
                              const updatedItems = [...billItems];
                              updatedItems[index] = { ...item, quantity: newQuantity };
                              setBillItems(updatedItems);
                              form.setValue(`items.${index}.quantity`, newQuantity);
                              updateLineAmount(index, updatedItems[index]);
                            }}
                            min={0}
                            step={1}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Received</Label>
                          <Input
                            type="number"
                            value={item.quantityReceived || 0}
                            onChange={(e) => {
                              const newQuantityReceived = Number(e.target.value);
                              const updatedItems = [...billItems];
                              updatedItems[index] = { ...item, quantityReceived: newQuantityReceived };
                              setBillItems(updatedItems);
                              form.setValue(`items.${index}.quantityReceived`, newQuantityReceived);
                            }}
                            min={0}
                            max={item.quantity}
                            step={1}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Unit Price</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const newUnitPrice = Number(e.target.value);
                              const updatedItems = [...billItems];
                              updatedItems[index] = { ...item, unitPrice: newUnitPrice };
                              setBillItems(updatedItems);
                              form.setValue(`items.${index}.unitPrice`, newUnitPrice);
                              updateLineAmount(index, updatedItems[index]);
                            }}
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Amount</Label>
                          <div className="text-lg font-medium">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">Tax</Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={item.taxRate}
                              onChange={(e) => {
                                const newTaxRate = Number(e.target.value);
                                const updatedItems = [...billItems];
                                updatedItems[index] = { ...item, taxRate: newTaxRate };
                                setBillItems(updatedItems);
                                form.setValue(`items.${index}.taxRate`, newTaxRate);
                                updateLineAmount(index, updatedItems[index]);
                              }}
                              min={0}
                              step={0.01}
                              className="flex-1"
                            />
                            <Select 
                              value={item.taxType} 
                              onValueChange={(value: 'flat' | 'percentage') => {
                                const updatedItems = [...billItems];
                                updatedItems[index] = { ...item, taxType: value };
                                setBillItems(updatedItems);
                                form.setValue(`items.${index}.taxType`, value);
                                updateLineAmount(index, updatedItems[index]);
                              }}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="flat">$</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Discount</Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => {
                                const newDiscount = Number(e.target.value);
                                const updatedItems = [...billItems];
                                updatedItems[index] = { ...item, discount: newDiscount };
                                setBillItems(updatedItems);
                                form.setValue(`items.${index}.discount`, newDiscount);
                                updateLineAmount(index, updatedItems[index]);
                              }}
                              min={0}
                              step={0.01}
                              className="flex-1"
                            />
                            <Select 
                              value={item.discountType}
                              onValueChange={(value: 'flat' | 'percentage') => {
                                const updatedItems = [...billItems];
                                updatedItems[index] = { ...item, discountType: value };
                                setBillItems(updatedItems);
                                form.setValue(`items.${index}.discountType`, value);
                                updateLineAmount(index, updatedItems[index]);
                              }}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
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
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Totals and Payment */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Payment Information</h3>
                  
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
                            value={field.value || 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                            min={0}
                            step={0.01}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Totals</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(form.watch("subtotal") || 0)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="totalDiscount"
                        render={({ field }) => (
                          <div className="flex justify-between items-center">
                            <span>Total Discount:</span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                {...field}
                                value={field.value || 0}
                                onChange={(e) => {
                                  field.onChange(Number(e.target.value) || 0);
                                  calculateTotals();
                                }}
                                min={0}
                                step={0.01}
                                className="w-24 h-8"
                              />
                              <FormField
                                control={form.control}
                                name="totalDiscountType"
                                render={({ field: discountTypeField }) => (
                                  <Select
                                    value={discountTypeField.value}
                                    onValueChange={(value) => {
                                      discountTypeField.onChange(value);
                                      calculateTotals();
                                    }}
                                  >
                                    <SelectTrigger className="w-16 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="flat">$</SelectItem>
                                      <SelectItem value="percentage">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Discount Amount:</span>
                      <span>-{formatCurrency(form.watch("discountAmount") || 0)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(form.watch("totalAmount") || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Add Vendor Dialog */}
      <Dialog open={addVendorDialogOpen} onOpenChange={setAddVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Create a new vendor that can be used for purchase bills.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor-name" className="text-right">
                Name
              </Label>
              <Input
                id="vendor-name"
                value={newVendor.name}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor-email" className="text-right">
                Email
              </Label>
              <Input
                id="vendor-email"
                type="email"
                value={newVendor.email}
                onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="vendor-phone"
                value={newVendor.phone}
                onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor-address" className="text-right">
                Address
              </Label>
              <Input
                id="vendor-address"
                value={newVendor.address}
                onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddVendorDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => createVendorMutation.mutate(newVendor)}
              disabled={createVendorMutation.isPending || !newVendor.name}
            >
              {createVendorMutation.isPending ? "Creating..." : "Create Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}