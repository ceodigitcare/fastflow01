import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Account, AccountCategory, InsertTransaction, Transaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

// Form validation schema
const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"], {
    required_error: "Please select a transaction type",
  }),
  accountId: z.coerce.number({
    required_error: "Please select an account",
    invalid_type_error: "Account must be a number",
  }),
  category: z.string().min(1, { message: "Please select a category" }),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.date({
    required_error: "Please select a date",
  }),
  description: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  
  // For transfers only
  toAccountId: z.coerce.number().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
}

export default function TransactionForm({ open, onOpenChange, editingTransaction }: TransactionFormProps) {
  const [selectedType, setSelectedType] = useState<"income" | "expense" | "transfer">("expense");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Fetch account categories
  const { data: categories } = useQuery<AccountCategory[]>({
    queryKey: ["/api/account-categories"],
  });

  // Form setup
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

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const res = await apiRequest("POST", "/api/transactions", values);
      return await res.json();
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
      const res = await apiRequest("PATCH", `/api/transactions/${id}`, data);
      return await res.json();
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

  // Handle form submission
  const onSubmit = (values: TransactionFormValues) => {
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
      
      const transferData = {
        fromAccountId: values.accountId,
        toAccountId: values.toAccountId,
        amount: values.amount,
        date: values.date,
        description: values.description || `Transfer between accounts`,
        reference: values.reference,
        notes: values.notes,
      };
      
      apiRequest("POST", "/api/transfers", transferData)
        .then(() => {
          toast({
            title: "Transfer completed",
            description: "Funds have been transferred successfully.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
          onOpenChange(false);
        })
        .catch(error => {
          toast({
            title: "Transfer failed",
            description: error.message,
            variant: "destructive",
          });
        });
      
      return;
    }
    
    if (editingTransaction) {
      updateTransactionMutation.mutate({ 
        id: editingTransaction.id, 
        data: values 
      });
    } else {
      createTransactionMutation.mutate(values);
    }
  };

  return (
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
                    <FormLabel>{selectedType === "transfer" ? "From Account" : "Account"}</FormLabel>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
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

            <div className="grid grid-cols-2 gap-4">
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createTransactionMutation.isPending || updateTransactionMutation.isPending
                }
              >
                {createTransactionMutation.isPending || updateTransactionMutation.isPending ? (
                  "Saving..."
                ) : editingTransaction ? (
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
  );
}