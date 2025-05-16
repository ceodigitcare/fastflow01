import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { Transaction, User, Account, Product } from "@shared/schema";
import { purchaseBillSchema, PurchaseBill, PurchaseBillItem } from "@/lib/validation";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Calendar as CalendarIcon, X, Plus } from "lucide-react";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Local state for line items
  const [billItems, setBillItems] = useState<PurchaseBillItem[]>([]);
  
  // Get vendors (users of type "vendor")
  const { data: vendors, isLoading: vendorsLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.type === "vendor")
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
  
  // Set up form
  const form = useForm<PurchaseBill>({
    resolver: zodResolver(purchaseBillSchema),
    defaultValues: {
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
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.description || product.name,
        unitPrice: product.price / 100, // Convert from cents to dollars
        amount: (product.price / 100) * newItems[index].quantity
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
      
      // Format the data for the transaction endpoint
      const transactionData = {
        type: "expense",
        accountId: data.accountId,
        amount: Math.round(data.totalAmount * 100), // Convert to cents
        date: data.billDate, // Use the bill date for the transaction date
        description: `Bill #${data.billNumber}`,
        category: "Purchases",
        documentType: "bill",
        documentNumber: data.billNumber,
        status: data.status,
        contactName: vendor?.name || "",
        contactEmail: vendor?.email || "",
        contactPhone: vendor?.phone || "",
        contactAddress: vendor?.address || "",
        notes: data.notes,
        items: data.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          amount: item.amount
        })),
        paymentReceived: data.paymentMade
      };
      
      const response = await apiRequest("POST", "/api/transactions", transactionData);
      return await response.json();
    },
    onSuccess: (data: Transaction) => {
      toast({
        title: "Success",
        description: "Purchase bill has been saved successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
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
    
    saveBillMutation.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Vendor Selection */}
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
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
          
          {/* Bill Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
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
            <h3 className="text-lg font-semibold">Items</h3>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Item
            </Button>
          </div>
          
          {/* Table headers */}
          <div className="grid grid-cols-12 gap-2 px-2 py-2 bg-muted text-sm font-medium">
            <div className="col-span-3">Product</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2 text-center">Unit Price</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1"></div>
          </div>
          
          {/* Line items */}
          {billItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center border-b pb-2">
              {/* Product */}
              <div className="col-span-3">
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
              
              {/* Description */}
              <div className="col-span-3">
                <Input 
                  value={item.description} 
                  onChange={(e) => {
                    const newItems = [...billItems];
                    newItems[index].description = e.target.value;
                    setBillItems(newItems);
                  }}
                />
              </div>
              
              {/* Quantity */}
              <div className="col-span-1">
                <Input 
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItemQuantity(parseInt(e.target.value) || 1, index)}
                  className="text-center"
                />
              </div>
              
              {/* Unit Price */}
              <div className="col-span-2">
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => updateItemPrice(parseFloat(e.target.value) || 0, index)}
                  className="text-right"
                />
              </div>
              
              {/* Amount */}
              <div className="col-span-2 text-right font-medium">
                {formatCurrency(item.amount)}
              </div>
              
              {/* Remove button */}
              <div className="col-span-1 text-right">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeItem(index)}
                  className="h-8 w-8 text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {/* Totals */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span className="font-medium">Subtotal:</span>
              <span>{formatCurrency(form.watch('subtotal'))}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tax:</span>
              <span>{formatCurrency(form.watch('taxAmount'))}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(form.watch('totalAmount'))}</span>
            </div>
          </div>
          
          {/* Payment Made */}
          <div className="border-t pt-4">
            <FormField
              control={form.control}
              name="paymentMade"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Payment Made</FormLabel>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(0)}
                      >
                        No Payment
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(form.watch('totalAmount'))}
                      >
                        Pay in Full
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  {form.watch('paymentMade') > 0 && form.watch('paymentMade') < form.watch('totalAmount') && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Remaining balance: {formatCurrency(form.watch('totalAmount') - form.watch('paymentMade'))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    placeholder="Enter any notes about this purchase bill"
                    className="min-h-20"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
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
  );
}