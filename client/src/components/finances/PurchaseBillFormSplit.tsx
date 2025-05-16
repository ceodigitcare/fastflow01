import { useState, useEffect } from "react";
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
          amount: (item.amount || 0) / 100 // Convert from cents to dollars
        };
      }) : [],
      subtotal: (editingBill.amount || 0) / 100, // Convert from cents to dollars
      taxAmount: 0, // We'll calculate this
      discountAmount: 0, // We'll calculate this
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
      amount: 0
    };
    
    setBillItems([...billItems, newItem]);
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
  
  // Function to update totals based on line items
  const updateTotals = (items: PurchaseBillItem[]) => {
    const subtotal = items.reduce((total, item) => total + item.amount, 0);
    const taxAmount = items.reduce((total, item) => {
      return total + (item.amount * (item.taxRate / 100));
    }, 0);
    
    form.setValue('items', items);
    form.setValue('subtotal', subtotal);
    form.setValue('taxAmount', taxAmount);
    form.setValue('totalAmount', subtotal + taxAmount);
  };
  
  // Mutation for saving the purchase bill
  const saveBillMutation = useMutation({
    mutationFn: async (data: PurchaseBill) => {
      const vendor = vendors?.find(v => v.id === data.vendorId);
      
      // Format the data for the transaction endpoint - ensuring unit/price amounts are in cents
      const transactionData: any = {
        type: "expense",
        accountId: data.accountId,
        amount: Math.round(data.totalAmount * 100), // Convert to cents
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
      const items = editingBill.items as PurchaseBillItem[] || [];
      setBillItems(items);
      
      // Find the vendor
      const vendorId = vendors?.find(v => v.name === editingBill.contactName)?.id || 0;
      
      form.reset({
        vendorId,
        accountId: editingBill.accountId,
        billNumber: editingBill.documentNumber || generateBillNumber(),
        billDate: editingBill.date ? new Date(editingBill.date) : new Date(),
        dueDate: new Date(new Date(editingBill.date || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000),
        status: editingBill.status as any || "draft",
        items,
        subtotal: items.reduce((total, item) => total + item.amount, 0),
        taxAmount: items.reduce((total, item) => total + (item.amount * (item.taxRate / 100)), 0),
        totalAmount: editingBill.amount / 100, // Convert from cents to dollars
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
      amount: billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0),
      status: data.status || "pending",
      paymentReceived: data.paymentReceived || 0,
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
            
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Description</th>
                    <th className="w-20 p-2">Qty</th>
                    <th className="w-24 p-2">Price</th>
                    <th className="w-24 p-2">Amount</th>
                    <th className="w-10 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">
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
                      </td>
                      <td className="p-2">
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...billItems];
                            newItems[index].description = e.target.value;
                            setBillItems(newItems);
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(parseFloat(e.target.value), index)}
                          min={1}
                          step={1}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItemPrice(parseFloat(e.target.value), index)}
                          min={0}
                          step={0.01}
                        />
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-2 text-center">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(form.watch('subtotal'))}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(form.watch('taxAmount'))}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>{formatCurrency(form.watch('discountAmount') || 0)}</span>
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