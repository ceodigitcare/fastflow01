import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Trash2, Plus, PackageCheck, QrCode, Share2, Printer } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Product, Account, Transaction } from "@shared/schema";
import { SalesInvoice, SalesInvoiceItem, salesInvoiceSchema } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SalesInvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInvoice?: Transaction | null;
}

export default function SalesInvoiceForm({ 
  open, 
  onOpenChange, 
  editingInvoice = null 
}: SalesInvoiceFormProps) {
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

  // React Hook Form setup
  const form = useForm<SalesInvoice>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: {
      customerId: 0,
      accountId: 0,
      invoiceNumber: generateInvoiceNumber(),
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days from now
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

  // Function to generate a unique invoice number
  function generateInvoiceNumber() {
    const prefix = "INV";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * (999 - 100) + 100);
    return `${prefix}-${timestamp}-${random}`;
  }

  // Set form values if editing an existing invoice
  useEffect(() => {
    if (editingInvoice) {
      // Extract items from JSON if available
      const items = editingInvoice.items as SalesInvoiceItem[] || [];
      setInvoiceItems(items);
      
      form.reset({
        customerId: editingInvoice.contactName ? 
          findCustomerByName(editingInvoice.contactName)?.id || 0 : 0,
        accountId: editingInvoice.accountId || 0,
        invoiceNumber: editingInvoice.documentNumber || generateInvoiceNumber(),
        invoiceDate: editingInvoice.date ? new Date(editingInvoice.date) : new Date(),
        dueDate: editingInvoice.date ? 
          new Date(new Date(editingInvoice.date).getTime() + 30 * 24 * 60 * 60 * 1000) : 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: (editingInvoice.status as "draft" | "sent" | "paid" | "overdue" | "cancelled") || "draft",
        items: items,
        subtotal: editingInvoice.amount || 0,
        taxAmount: 0, // Default if not available
        discountAmount: 0, // Default if not available
        totalAmount: editingInvoice.amount || 0,
        notes: editingInvoice.notes || "",
        termsAndConditions: "Payment is due within 30 days of the invoice date.",
        customerNotes: "",
      });
    } else {
      // Reset form for new invoice
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
        notes: "",
        termsAndConditions: "Payment is due within 30 days of the invoice date.",
        customerNotes: "",
      });
      setInvoiceItems([]);
    }
  }, [editingInvoice, form]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: `Invoice ${editingInvoice ? "updated" : "created"} successfully`,
      });
      onOpenChange(false);
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

  // Function to handle WhatsApp sharing
  const handleShareWhatsApp = () => {
    // Implement WhatsApp sharing logic
    toast({
      title: "Share Feature",
      description: "WhatsApp sharing will be implemented soon.",
    });
  };

  // Function to handle printing
  const handlePrint = () => {
    // Implement printing logic
    toast({
      title: "Print Feature",
      description: "Printing functionality will be implemented soon.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
          </DialogTitle>
          <DialogDescription>
            {editingInvoice 
              ? 'Update the invoice details below' 
              : 'Fill in the invoice details below'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Invoice Header Details */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
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
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
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
                                  format(field.value, "PPP")
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
                                  format(field.value, "PPP")
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
            </div>
            
            {/* Invoice Line Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Invoice Items</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[80px]">Qty</TableHead>
                      <TableHead className="w-[100px]">Unit Price</TableHead>
                      <TableHead className="w-[80px]">Tax %</TableHead>
                      <TableHead className="w-[80px]">Disc %</TableHead>
                      <TableHead className="w-[100px]">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                          No items added yet. Click "Add Item" to add products to this invoice.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoiceItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.productId.toString()}
                              onValueChange={(value) => updateLineItem(index, 'productId', parseInt(value))}
                            >
                              <SelectTrigger className="h-8">
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
                                      {product.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="0" disabled>No products available</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.taxRate}
                              onChange={(e) => updateLineItem(index, 'taxRate', parseFloat(e.target.value))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) => updateLineItem(index, 'discount', parseFloat(e.target.value))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* Totals and Summary */}
            <div className="flex justify-end">
              <Card className="w-[300px]">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(form.watch('subtotal'))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{formatCurrency(form.watch('taxAmount'))}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(form.watch('totalAmount'))}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Invoice Notes */}
            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
                <TabsTrigger value="customer">Customer Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="pt-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Add any notes about this invoice"
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        These notes will appear on the invoice but are primarily for your reference.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              <TabsContent value="terms" className="pt-4">
                <FormField
                  control={form.control}
                  name="termsAndConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Add terms and conditions"
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Standard terms and conditions that will appear on the invoice.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              <TabsContent value="customer" className="pt-4">
                <FormField
                  control={form.control}
                  name="customerNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer-Specific Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Add notes for this specific customer"
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        These notes will be visible to the customer on the invoice.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
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
            
            <DialogFooter className="flex justify-between items-center gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  disabled={saveInvoiceMutation.isPending}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  disabled={saveInvoiceMutation.isPending}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share via WhatsApp
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saveInvoiceMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={saveInvoiceMutation.isPending || invoiceItems.length === 0}
                >
                  {saveInvoiceMutation.isPending ? "Saving..." : "Save Invoice"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
