import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, CalendarIcon, Package, ShoppingCart, ArrowRightLeft, X, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Account, AccountCategory, Transaction } from "@shared/schema";
import { transactionSchema, accountSchema, categorySchema } from "@/lib/validation";
import { z } from "zod";

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

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
  accounts?: Account[];
  categories?: AccountCategory[];
}

type AccountFormValues = z.infer<typeof accountSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

export default function TransactionForm({ 
  open, 
  onOpenChange, 
  editingTransaction,
  accounts,
  categories
}: TransactionFormProps) {
  const [selectedType, setSelectedType] = useState<"income" | "expense" | "transfer">("expense");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, amount: 0 }
  ]);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize the form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      accountId: 0,
      category: "",
      amount: 0,
      date: new Date(),
      description: "",
      reference: "",
      notes: "",
      contactName: "Default Vendor",
      contactEmail: "vendor@example.com",
      contactPhone: "555-123-4567",
      contactAddress: "123 Business Street, City",
      items: [],
    },
  });

  // Update form when editing transaction
  useEffect(() => {
    if (editingTransaction && open) {
      form.reset({
        type: editingTransaction.type as "income" | "expense" | "transfer",
        accountId: editingTransaction.accountId,
        category: editingTransaction.category,
        amount: editingTransaction.amount,
        date: new Date(editingTransaction.date || new Date()),
        description: editingTransaction.description || "",
        reference: editingTransaction.reference || "",
        notes: editingTransaction.notes || "",
        contactName: editingTransaction.contactName || "Default Vendor",
        contactEmail: editingTransaction.contactEmail || "vendor@example.com",
        contactPhone: editingTransaction.contactPhone || "555-123-4567",
        contactAddress: editingTransaction.contactAddress || "123 Business Street, City",
      });
      setSelectedType(editingTransaction.type as "income" | "expense" | "transfer");
    } else if (open) {
      form.reset({
        type: "expense",
        accountId: 0,
        category: "",
        amount: 0,
        date: new Date(),
        description: "",
        reference: "",
        notes: "",
        contactName: "Default Vendor",
        contactEmail: "vendor@example.com",
        contactPhone: "555-123-4567",
        contactAddress: "123 Business Street, City",
      });
      setSelectedType("expense");
    }
  }, [editingTransaction, open, form]);

  // Watch for type changes
  const watchType = form.watch("type");
  useEffect(() => {
    if (watchType !== selectedType) {
      setSelectedType(watchType as "income" | "expense" | "transfer");
    }
  }, [watchType, selectedType]);
  
  // Watch for account changes and update toAccountId if needed
  const watchAccountId = form.watch("accountId");
  useEffect(() => {
    if (selectedType === "transfer" && form.getValues("toAccountId") === watchAccountId) {
      // Clear the toAccountId if it's the same as accountId
      form.setValue("toAccountId", undefined);
    }
  }, [watchAccountId, selectedType, form]);

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      try {
        const res = await apiRequest("POST", "/api/transactions", values);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Transaction API error:", errorData);
          throw new Error(errorData.message || "Failed to create transaction");
        }
        return await res.json();
      } catch (error) {
        console.error("Transaction creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Transaction created",
        description: "Your transaction has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TransactionFormValues }) => {
      try {
        const res = await apiRequest("PATCH", `/api/transactions/${id}`, data);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Transaction update API error:", errorData);
          throw new Error(errorData.message || "Failed to update transaction");
        }
        return await res.json();
      } catch (error) {
        console.error("Transaction update error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Transaction updated",
        description: "Your transaction has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter accounts by type for better UX
  const getFilteredAccounts = () => {
    if (!accounts) return [];
    
    if (selectedType === "transfer") {
      return accounts.filter(a => a.isActive);
    }
    
    // For income and expense, filter accounts that are appropriate for each type
    const appropriateCategories = categories?.filter(c => {
      if (selectedType === "income") {
        return ["asset", "income"].includes(c.type);
      } else {
        return ["asset", "expense"].includes(c.type);
      }
    }) || [];
    
    const categoryIds = new Set(appropriateCategories.map(c => c.id));
    
    return accounts.filter(a => 
      a.isActive && 
      (categoryIds.has(a.categoryId) || 
       (selectedType === "expense" && categories?.find(c => c.id === a.categoryId)?.type === "liability"))
    );
  };

  // Get category options based on selected type
  const getCategoryOptions = () => {
    if (!categories) return [];
    
    if (selectedType === "income") {
      return categories.filter(c => c.type === "income");
    } else if (selectedType === "expense") {
      return categories.filter(c => c.type === "expense");
    } else {
      return []; // Transfers don't use categories
    }
  };

  // Function to get document type based on transaction type
  const getDocumentType = (transactionType: string) => {
    switch (transactionType) {
      case "income":
        return "invoice";
      case "expense":
        return "bill";
      case "transfer":
        return "voucher";
      default:
        return "";
    }
  };
  
  // Function to generate a unique document number
  const generateDocumentNumber = (transactionType: string) => {
    const prefix = transactionType === "income" ? "INV" 
                 : transactionType === "expense" ? "BILL"
                 : "VCH";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * (999 - 100) + 100);
    return `${prefix}-${timestamp}-${random}`;
  };

  // Handle form submission
  const onSubmit = async (values: TransactionFormValues) => {
    if (selectedType === "transfer") {
      // Handle transfers differently through a dedicated API endpoint
      if (!values.toAccountId) {
        toast({
          title: "Missing information",
          description: "Please select a destination account for the transfer.",
          variant: "destructive",
        });
        return;
      }
      
      const documentType = "voucher";
      const documentNumber = generateDocumentNumber(selectedType);
      
      const transferData = {
        fromAccountId: values.accountId,
        toAccountId: values.toAccountId,
        amount: values.amount,
        date: values.date,
        description: values.description || `Transfer between accounts`,
        reference: values.reference,
        notes: values.notes,
        contactName: values.contactName,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        contactAddress: values.contactAddress,
        documentType: documentType,
        documentNumber: documentNumber,
        status: "final"
      };
      
      try {
        const res = await apiRequest("POST", "/api/transfers", transferData);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Transfer API error:", errorData);
          throw new Error(errorData.message || "Failed to complete transfer");
        }
        
        toast({
          title: "Transfer completed",
          description: "Funds have been transferred successfully. A voucher has been generated.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        onOpenChange(false);
      } catch (error) {
        console.error("Transfer error:", error);
        toast({
          title: "Transfer failed",
          description: error instanceof Error ? error.message : "Please check all fields and try again",
          variant: "destructive",
        });
      }
      
      return;
    }
    
    // For income/expense transactions, add document generation
    const documentType = getDocumentType(selectedType);
    const documentNumber = generateDocumentNumber(selectedType);
    
    // Make sure the amount matches the line items total if there are line items
    if (lineItems.length > 0) {
      const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      values.amount = lineItemsTotal;
    }
    
    // Format line items to match the expected schema
    // Only include valid items with all required fields
    const formattedItems = lineItems.length > 0 
      ? lineItems.filter(item => 
          item.description && 
          item.quantity > 0 && 
          item.unitPrice >= 0 && 
          item.amount > 0
        )
      : [];
      
    // Prepare a clean copy of values with document fields added,
    // omitting any fields that don't match the server schema
    const transactionData = {
      type: values.type,
      accountId: values.accountId,
      amount: values.amount,
      date: values.date,
      category: values.category || "Uncategorized",
      description: values.description || "",
      reference: values.reference || "",
      notes: values.notes || "",
      toAccountId: values.toAccountId,
      documentType: documentType || undefined,
      documentNumber: documentNumber || undefined,
      status: "final",
      contactName: values.contactName || "",
      contactEmail: values.contactEmail || "",
      contactPhone: values.contactPhone || "",
      contactAddress: values.contactAddress || "",
      // Only include items if we have valid ones
      ...(formattedItems.length > 0 ? { items: formattedItems } : {})
    };
    
    if (editingTransaction) {
      updateTransactionMutation.mutate({ 
        id: editingTransaction.id, 
        data: transactionData 
      });
    } else {
      createTransactionMutation.mutate(transactionData);
    }
  };

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (values: AccountFormValues & { businessId: number }) => {
      const res = await apiRequest("POST", "/api/accounts", values);
      return await res.json();
    },
    onSuccess: (newAccount) => {
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setOpenAccountDialog(false);
      
      // Set the newly created account as the selected account
      form.setValue("accountId", newAccount.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create account",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues & { businessId: number }) => {
      const res = await apiRequest("POST", "/api/account-categories", values);
      return await res.json();
    },
    onSuccess: (newCategory) => {
      toast({
        title: "Category created",
        description: "Your category has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account-categories"] });
      setOpenCategoryDialog(false);
      
      // If it's a relevant category for the current transaction type, select it
      if ((selectedType === "income" && newCategory.type === "income") || 
          (selectedType === "expense" && newCategory.type === "expense")) {
        form.setValue("category", newCategory.name);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Setup form for account creation
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: 0,
      initialBalance: 0,
    },
  });
  
  // Handle account form submission
  const onAccountSubmit = (values: AccountFormValues) => {
    const businessId = 1; // This should be retrieved from context in a real app
    createAccountMutation.mutate({ ...values, businessId });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Edit Transaction" : "Record New Transaction"}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction
                ? "Update the details of this transaction"
                : "Record a new financial transaction or transfer"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="basic" className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Basic Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="document" className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>Document Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="items" className="flex items-center gap-1">
                    {selectedType === "transfer" ? (
                      <ArrowRightLeft className="h-4 w-4" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    <span>Item Details</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <Select
                          onValueChange={(value: "income" | "expense" | "transfer") => {
                            field.onChange(value);
                            setSelectedType(value);
                          }}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {selectedType === "income" 
                            ? "Money coming into your business" 
                            : selectedType === "expense"
                            ? "Money going out of your business"
                            : "Move money between accounts"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className={selectedType === "transfer" ? "grid grid-cols-2 gap-4" : ""}>
                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>{selectedType === "transfer" ? "From Account" : "Account"}</FormLabel>
                          </div>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value ? field.value.toString() : undefined}
                            value={field.value ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getFilteredAccounts().map((account) => (
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

                    {selectedType === "transfer" && (
                      <FormField
                        control={form.control}
                        name="toAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To Account</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value ? field.value.toString() : undefined}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getFilteredAccounts()
                                  .filter(a => a.id !== form.getValues("accountId"))
                                  .map((account) => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                      {account.name}
                                    </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a different account to transfer funds to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {selectedType !== "transfer" && (
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getCategoryOptions().map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={`${selectedType === "income" ? "Payment received for..." : selectedType === "expense" ? "Payment for..." : "Transfer for..."}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Reference and Notes fields moved to Document Info tab */}
                </TabsContent>
                
                <TabsContent value="document" className="space-y-4 pt-2">
                  <div className="flex items-center mb-4">
                    <Package className="h-4 w-4 mr-2" />
                    <h3 className="text-sm font-medium">
                      {selectedType === "income" && "Sales Invoice"}
                      {selectedType === "expense" && "Purchase Bill"}
                      {selectedType === "transfer" && "Transfer Voucher"}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {selectedType === "income" ? "Customer Name" : "Vendor Name"}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {selectedType === "income" ? "Customer Email" : "Vendor Email"}
                          </FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {selectedType === "income" ? "Customer Phone" : "Vendor Phone"}
                          </FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {selectedType === "income" ? "Customer Address" : "Vendor Address"}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Invoice #, Receipt #, etc."
                              {...field}
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
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Additional details..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Item details moved to Items tab */}
                </TabsContent>
                
                <TabsContent value="items" className="space-y-4 pt-2">
                  {(selectedType === "income" || selectedType === "expense") ? (
                    <div className="space-y-4">
                      <div className="flex items-center mb-4">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        <h3 className="text-sm font-medium">
                          {selectedType === "income" ? "Products or Services" : "Purchased Items"}
                        </h3>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <div className="flex-1">Description</div>
                          <div className="w-20 text-center">Quantity</div>
                          <div className="w-24 text-center">Unit Price</div>
                          <div className="w-24 text-right">Amount</div>
                          <div className="w-8"></div>
                        </div>
                        
                        {lineItems.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Input 
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...lineItems];
                                newItems[index].description = e.target.value;
                                setLineItems(newItems);
                              }}
                              placeholder="Description"
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...lineItems];
                                newItems[index].quantity = parseFloat(e.target.value) || 0;
                                newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
                                setLineItems(newItems);
                                
                                // Update the main amount field to match line items total
                                const total = newItems.reduce((sum, item) => sum + item.amount, 0);
                                form.setValue("amount", total);
                              }}
                              placeholder="Qty"
                              className="w-20"
                            />
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...lineItems];
                                newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                                newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
                                setLineItems(newItems);
                                
                                // Update the main amount field to match line items total
                                const total = newItems.reduce((sum, item) => sum + item.amount, 0);
                                form.setValue("amount", total);
                              }}
                              placeholder="Price"
                              className="w-24"
                            />
                            <span className="w-24 text-right">
                              {(item.amount).toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              })}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newItems = [...lineItems];
                                newItems.splice(index, 1);
                                setLineItems(newItems);
                                
                                // Update the main amount field after removing an item
                                const total = newItems.reduce((sum, item) => sum + item.amount, 0);
                                form.setValue("amount", total);
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = [
                              ...lineItems,
                              {
                                description: "",
                                quantity: 1,
                                unitPrice: 0,
                                amount: 0
                              }
                            ];
                            setLineItems(newItems);
                            
                            // Update amount when adding a new item (keeping the total the same)
                            const total = newItems.reduce((sum, item) => sum + item.amount, 0);
                            form.setValue("amount", total);
                          }}
                          className="mb-2"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                        
                        {lineItems.length > 0 && (
                          <div className="flex justify-between pt-4 border-t text-sm">
                            <div className="font-medium">Summary</div>
                            <div className="text-right">
                              <div className="font-medium">
                                Total: {lineItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD'
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Amount will be automatically calculated
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <ArrowRightLeft className="h-8 w-8 mb-2 opacity-30" />
                      <p>Item details are not applicable for transfers.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
                >
                  {editingTransaction ? (
                    "Update Transaction"
                  ) : selectedType === "transfer" ? (
                    "Make Transfer"
                  ) : (
                    "Record Transaction"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Account Creation Dialog */}
      <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Add a new account to track your finances. You can create different accounts
              for cash, bank accounts, credit cards, etc.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
              <FormField
                control={accountForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bank Account, Cash, Credit Card, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={accountForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.filter(c => c.type === "asset").map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={accountForm.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Balance</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={accountForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional information about this account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createAccountMutation.isPending}>
                  Create Account
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}