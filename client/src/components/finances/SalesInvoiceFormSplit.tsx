import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { Transaction, User, Account, Product } from "@shared/schema";
import { salesInvoiceSchema, SalesInvoice, SalesInvoiceItem } from "@/lib/validation";
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

// Helper function to generate a new invoice number
function generateInvoiceNumber() {
  const prefix = "INV";
  const dateStr = format(new Date(), "yyyyMMdd");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${random}`;
}

interface SalesInvoiceFormSplitProps {
  onCancel: () => void;
  onSave: (invoice: Transaction) => void;
  editingInvoice?: Transaction | null;
}

export default function SalesInvoiceFormSplit({ 
  onCancel, 
  onSave,
  editingInvoice = null 
}: SalesInvoiceFormSplitProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Local state for line items
  const [invoiceItems, setInvoiceItems] = useState<SalesInvoiceItem[]>([]);
  
  // Get customers (users of type "customer")
  const { data: customers, isLoading: customersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.type === "customer")
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
  const form = useForm<SalesInvoice>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: {
      customerId: 0,
      accountId: 0,
      invoiceNumber: generateInvoiceNumber(),
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: "draft" as "draft" | "sent" | "paid" | "overdue" | "cancelled",
      items: [],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      notes: "",
      termsAndConditions: "Payment is due within 30 days of the invoice date.",
      customerNotes: "",
    }
  });
  
  // Update form with editing invoice data if provided
  useEffect(() => {
    if (editingInvoice) {
      // Find the customer
      const customer = customers?.find(c => c.name === editingInvoice.contactName);
      
      // Initialize the form with invoice data
      form.reset({
        customerId: customer?.id || 0,
        accountId: editingInvoice.accountId,
        invoiceNumber: editingInvoice.documentNumber || generateInvoiceNumber(),
        invoiceDate: editingInvoice.date ? new Date(editingInvoice.date) : new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: (editingInvoice.status as any) || "draft",
        items: editingInvoice.items as any[] || [],
        subtotal: editingInvoice.amount / 100, // Convert cents to dollars
        taxAmount: 0, // Would need to be calculated from items
        discountAmount: 0, // Would need to be calculated from items
        totalAmount: editingInvoice.amount / 100, // Convert cents to dollars
        paymentReceived: editingInvoice.paymentReceived ? editingInvoice.paymentReceived / 100 : 0, // Convert cents to dollars
        notes: editingInvoice.notes || "",
        termsAndConditions: "Payment is due within 30 days of the invoice date.",
        customerNotes: "",
      });
      
      // Set invoice items if they exist
      if (Array.isArray(editingInvoice.items) && editingInvoice.items.length > 0) {
        setInvoiceItems(editingInvoice.items as any[]);
      }
    } else {
      form.reset({
        customerId: 0,
        accountId: 0,
        invoiceNumber: generateInvoiceNumber(),
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "draft" as "draft" | "sent" | "paid" | "overdue" | "cancelled",
        items: [],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        paymentReceived: 0,
        notes: "",
        termsAndConditions: "Payment is due within 30 days of the invoice date.",
        customerNotes: "",
      });
      setInvoiceItems([]);
    }
  }, [editingInvoice, form, customers]);

  // Helper to find customer by name
  const findCustomerByName = (name: string): User | undefined => {
    return customers?.find(customer => customer.name === name);
  };

  // Function to add a new line item
  const addLineItem = () => {
    const newItem: SalesInvoiceItem = {
      productId: 0,
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
      discount: 0,
      amount: 0
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  // Function to update a line item
  const updateLineItem = (index: number, field: keyof SalesInvoiceItem, value: any) => {
    const updatedItems = [...invoiceItems];
    const item = { ...updatedItems[index], [field]: value };
    
    // If product ID changed, update description and unit price
    if (field === 'productId') {
      const product = products?.find(p => p.id === value);
      if (product) {
        item.description = product.name;
        item.unitPrice = product.price / 100; // Convert cents to dollars
        item.amount = item.quantity * item.unitPrice;
      }
    }
    
    // Recalculate amount if quantity, unitPrice, or discount changed
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const subtotal = item.quantity * item.unitPrice;
      const discountAmount = subtotal * (item.discount / 100);
      item.amount = subtotal - discountAmount;
    }
    
    updatedItems[index] = item;
    setInvoiceItems(updatedItems);
    
    // Update form values for total calculations
    updateTotals(updatedItems);
  };

  // Function to remove a line item
  const removeLineItem = (index: number) => {
    const updatedItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(updatedItems);
    
    // Update form values for total calculations
    updateTotals(updatedItems);
  };

  // Function to update totals based on line items
  const updateTotals = (items: SalesInvoiceItem[]) => {
    const subtotal = items.reduce((total, item) => total + item.amount, 0);
    const taxAmount = items.reduce((total, item) => {
      return total + (item.amount * (item.taxRate / 100));
    }, 0);
    
    form.setValue('items', items);
    form.setValue('subtotal', subtotal);
    form.setValue('taxAmount', taxAmount);
    form.setValue('totalAmount', subtotal + taxAmount);
  };

  // Save invoice mutation
  const saveInvoiceMutation = useMutation({
    mutationFn: async (data: SalesInvoice) => {
      // Find the customer
      const customer = customers?.find(c => c.id === data.customerId);
      
      // Format for transaction API
      const transactionData = {
        type: "income",
        accountId: data.accountId,
        amount: Math.round(data.totalAmount * 100), // Convert to cents
        date: data.invoiceDate,
        description: `Invoice #${data.invoiceNumber}`,
        category: "Sales",
        documentType: "invoice",
        documentNumber: data.invoiceNumber,
        status: data.status,
        contactName: customer?.name || "",
        contactEmail: customer?.email || "",
        contactPhone: customer?.phone || "",
        contactAddress: customer?.address || "",
        notes: data.notes,
        items: data.items,
        paymentReceived: Math.round((data.paymentReceived || 0) * 100), // Convert to cents
      };
      
      // Update or create transaction
      if (editingInvoice) {
        const res = await apiRequest(
          "PATCH", 
          `/api/transactions/${editingInvoice.id}`, 
          transactionData
        );
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/transactions", transactionData);
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: `Invoice ${editingInvoice ? "updated" : "created"} successfully`,
      });
      onSave(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingInvoice ? "update" : "create"} invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (data: SalesInvoice) => {
    // Ensure items are included
    data.items = invoiceItems;
    saveInvoiceMutation.mutate(data);
  };

  // Calculate initial totals if there are items
  useEffect(() => {
    if (invoiceItems.length > 0) {
      updateTotals(invoiceItems);
    }
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Invoice Header Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Invoice Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "MMM dd, yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
          </div>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "MMM dd, yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
          </div>
        </div>

        {/* Customer Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">To</h3>
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customersLoading ? (
                      <SelectItem value="0" disabled>Loading customers...</SelectItem>
                    ) : customers && customers.length > 0 ? (
                      customers.map((customer) => (
                        <SelectItem 
                          key={customer.id} 
                          value={customer.id.toString()}
                        >
                          {customer.name} {customer.businessName ? `(${customer.businessName})` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="0" disabled>No customers available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Line Items Section */}
        <div className="mb-6">
          <div className="grid grid-cols-12 gap-2 mb-2 bg-gray-50 p-2 rounded">
            <div className="col-span-5 font-medium text-sm">Item</div>
            <div className="col-span-2 font-medium text-sm">Quantity</div>
            <div className="col-span-2 font-medium text-sm">Rate</div>
            <div className="col-span-2 font-medium text-sm">Total</div>
            <div className="col-span-1"></div>
          </div>
          
          {invoiceItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
              {/* Item/Product */}
              <div className="col-span-5">
                <Select
                  value={item.productId.toString()}
                  onValueChange={(value) => updateLineItem(index, 'productId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsLoading ? (
                      <SelectItem value="0" disabled>Loading products...</SelectItem>
                    ) : products && products.length > 0 ? (
                      products.map((product) => (
                        <SelectItem 
                          key={product.id} 
                          value={product.id.toString()}
                        >
                          {product.name} - {formatCurrency(product.price / 100)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="0" disabled>No products available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Quantity */}
              <div className="col-span-2">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value))}
                />
              </div>
              
              {/* Rate (Unit Price) */}
              <div className="col-span-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                />
              </div>
              
              {/* Total */}
              <div className="col-span-2">
                <Input
                  type="text"
                  value={formatCurrency(item.amount)}
                  readOnly
                  disabled
                />
              </div>
              
              {/* Remove Button */}
              <div className="col-span-1 text-right">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeLineItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={addLineItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Invoice Details Section */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transport cost</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="0.00"
                      value={field.value ? field.value : ""}  
                      onChange={(e) => {
                        field.onChange(e.target.value); 
                        const transportCost = parseFloat(e.target.value) || 0;
                        const subtotal = form.getValues('subtotal');
                        form.setValue('totalAmount', subtotal + transportCost);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Account</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountsLoading ? (
                        <SelectItem value="0" disabled>Loading accounts...</SelectItem>
                      ) : accounts && accounts.length > 0 ? (
                        accounts.map((account) => (
                          <SelectItem 
                            key={account.id} 
                            value={account.id.toString()}
                          >
                            {account.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="0" disabled>No accounts available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="mb-6">
          <FormField
            control={form.control}
            name="customerNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add any notes for the customer..."
                    className="resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Totals & Buttons */}
        <div className="flex flex-col mb-4">
          <div className="font-medium mb-2">Payment Information</div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentReceived"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Received</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      placeholder="0.00" 
                      {...field}
                      value={field.value !== undefined ? field.value : ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                        field.onChange(value);
                        
                        // Auto-set status to paid if payment equals total amount
                        if (value >= form.getValues('totalAmount')) {
                          form.setValue('status', 'paid');
                        } else if (value > 0 && value < form.getValues('totalAmount')) {
                          form.setValue('status', 'sent');
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: "draft" | "sent" | "paid" | "overdue" | "cancelled") => 
                      field.onChange(value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
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
        </div>
        
        <div className="flex justify-between items-end">
          <div className="text-sm text-gray-500">
            {form.watch('paymentReceived') > 0 && form.watch('paymentReceived') < form.watch('totalAmount') && (
              <div>Remaining: {formatCurrency(form.watch('totalAmount') - form.watch('paymentReceived'))}</div>
            )}
          </div>
          
          <div className="text-right">
            <div className="font-medium mb-1">Total: {formatCurrency(form.watch('totalAmount'))}</div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveInvoiceMutation.isPending || invoiceItems.length === 0}
              >
                {saveInvoiceMutation.isPending ? "Saving..." : "Save Invoice"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
