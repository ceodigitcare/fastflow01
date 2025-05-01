import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountCategory, InsertAccountCategory, Account, Transaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Helper function to safely format transaction dates
function formatTransactionDate(transaction: any): string {
  if (!transaction) return '';
  
  const dateValue = transaction.date || transaction.createdAt;
  if (!dateValue) return 'Unknown date';
  
  return new Date(dateValue).toLocaleDateString();
}
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlusCircle, Edit, Trash2, Printer, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Info, DollarSign } from "lucide-react";

// Form validation schema
const accountCategorySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  type: z.enum(["asset", "liability", "equity", "income", "expense"], {
    required_error: "Please select a category type",
  }),
  description: z.string().optional(),
});

type AccountCategoryFormValues = z.infer<typeof accountCategorySchema>;

export default function AccountCategoriesPanel() {
  const [selectedType, setSelectedType] = useState("asset");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);
  const [showTransactionInfo, setShowTransactionInfo] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch account categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<AccountCategory[]>({
    queryKey: ["/api/account-categories"],
  });
  
  // Fetch accounts to display under categories
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });
  
  // Fetch transactions for transaction info
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: showTransactionInfo, // Only fetch when transaction info is visible
  });

  // Form setup
  const form = useForm<AccountCategoryFormValues>({
    resolver: zodResolver(accountCategorySchema),
    defaultValues: {
      name: "",
      type: "asset",
      description: "",
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof accountCategorySchema>) => {
      const res = await apiRequest("POST", "/api/account-categories", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "Your account category has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account-categories"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof accountCategorySchema> }) => {
      const res = await apiRequest("PATCH", `/api/account-categories/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Category updated",
        description: "Your account category has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account-categories"] });
      setDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/account-categories/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "Your account category has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account-categories"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter categories by type
  const filteredCategories = categories?.filter((category) => category.type === selectedType);
  
  // Helper function to get accounts for a specific category
  const getAccountsForCategory = (categoryId: number) => {
    return accounts?.filter(account => account.categoryId === categoryId) || [];
  };
  
  // Helper function to get transactions for a specific account
  const getTransactionsForAccount = (accountId: number) => {
    if (!showTransactionInfo || !transactions) return [];
    return transactions.filter(transaction => transaction.accountId === accountId);
  };
  
  // Get the most recent transaction for an account
  const getLastTransactionForAccount = (accountId: number) => {
    const accountTransactions = getTransactionsForAccount(accountId);
    if (accountTransactions.length === 0) return null;
    
    // Sort by date descending and return the first one
    return accountTransactions.sort((a, b) => {
      // Safely handle dates with fallbacks to avoid null issues
      const dateAValue = a.date || a.createdAt || new Date();
      const dateBValue = b.date || b.createdAt || new Date();
      
      // Convert to timestamp for comparison
      const dateATime = typeof dateAValue === 'string' ? new Date(dateAValue).getTime() : dateAValue.getTime();
      const dateBTime = typeof dateBValue === 'string' ? new Date(dateBValue).getTime() : dateBValue.getTime();
      
      return dateBTime - dateATime;
    })[0];
  };

  // Handle form submission
  const onSubmit = (values: AccountCategoryFormValues) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: values });
    } else {
      createCategoryMutation.mutate(values);
    }
  };

  // Define type-safe account types
  const accountTypes = ["asset", "liability", "equity", "income", "expense"] as const;
  type AccountType = typeof accountTypes[number];
  
  // Check if a string is a valid account type
  const isValidAccountType = (type: string): type is AccountType => {
    return accountTypes.includes(type as AccountType);
  };

  // Open dialog for editing
  const handleEdit = (category: AccountCategory) => {
    setEditingCategory(category);
    
    // Ensure type safety
    const categoryType = isValidAccountType(category.type) ? category.type : "asset";
    
    form.reset({
      name: category.name,
      type: categoryType,
      description: category.description || "",
    });
    setDialogOpen(true);
  };

  // Open dialog for creating
  const handleCreate = () => {
    setEditingCategory(null);
    
    // Ensure type safety
    const categoryType = isValidAccountType(selectedType) ? selectedType : "asset";
    
    form.reset({
      name: "",
      type: categoryType,
      description: "",
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number, isSystem: boolean | undefined | null) => {
    // Check if isSystem is true, handling all possible types
    if (isSystem === true) {
      toast({
        title: "Cannot delete system category",
        description: "System categories cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Are you sure you want to delete this category? This cannot be undone.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const getCategoryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      asset: "Assets",
      liability: "Liabilities",
      equity: "Equity",
      income: "Income",
      expense: "Expenses",
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Toggle expanded state for a category
  const toggleCategoryExpanded = (categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  // Toggle expand all categories
  const toggleExpandAll = () => {
    if (!categories) return;
    
    const newExpandState = !expandAll;
    setExpandAll(newExpandState);
    
    // Create a new object with all categories expanded or collapsed
    const expandStates: Record<number, boolean> = {};
    categories.forEach(category => {
      expandStates[category.id] = newExpandState;
    });
    
    setExpandedCategories(expandStates);
  };
  
  // Effect to apply expand all changes when categories data loads
  useEffect(() => {
    if (expandAll && categories?.length) {
      const expandStates: Record<number, boolean> = {};
      categories.forEach(category => {
        expandStates[category.id] = true;
      });
      setExpandedCategories(expandStates);
    }
  }, [categories, expandAll]);

  // Generate a unique account code based on type and id
  const generateAccountCode = (type: string, id: number) => {
    const prefixes: Record<string, string> = {
      asset: 'A',
      liability: 'L',
      equity: 'E',
      income: 'I',
      expense: 'X'
    };
    
    const prefix = prefixes[type] || 'O';  // Default to 'O' for Other
    // Pad IDs with leading zeros to ensure consistent formatting (e.g., A0001)
    return `${prefix}${id.toString().padStart(4, '0')}`;
  };

  // Generate HTML for the complete chart of accounts (all categories and accounts)
  const generatePrintableChartOfAccounts = () => {
    if (!categories || !accounts) return '';
    
    // Group categories by type
    const accountTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    let html = '';
    
    accountTypes.forEach(type => {
      const typeCategories = categories.filter(category => category.type === type);
      
      if (typeCategories.length > 0) {
        html += `
          <div style="margin-bottom: 30px;">
            <h2 style="margin-bottom: 10px; color: #0052CC; border-bottom: 1px solid #eee; padding-bottom: 5px;">
              ${getCategoryTypeLabel(type)}
            </h2>
            <div style="margin-left: 15px;">
        `;
        
        typeCategories.forEach(category => {
          const categoryAccounts = accounts.filter(account => account.categoryId === category.id);
          const categoryCode = generateAccountCode(category.type, category.id);
          
          html += `
            <div style="margin-bottom: 15px;">
              <h3 style="margin-bottom: 5px; font-size: 16px; display: flex; justify-content: space-between;">
                <span>
                  <span style="font-weight: 600; color: #444;">${categoryCode} - ${category.name}</span>
                  ${category.isSystem ? '<span style="margin-left: 8px; background-color: #f0f0f0; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: normal;">System</span>' : ''}
                </span>
              </h3>
              ${category.description ? `<p style="margin-top: 0; margin-bottom: 5px; font-size: 14px; color: #666;">${category.description}</p>` : ''}
              <div style="margin-left: 20px; border-left: 1px solid #eee; padding-left: 15px;">
          `;
          
          if (categoryAccounts.length > 0) {
            categoryAccounts.forEach(account => {
              const accountCode = generateAccountCode(category.type, account.id);
              const formattedBalance = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
              }).format((account.currentBalance || 0) / 100); // Convert from cents to dollars
              
              // Only include transaction info when showTransactionInfo is enabled
              const lastTransaction = showTransactionInfo ? getLastTransactionForAccount(account.id) : null;
              
              html += `
                <div style="margin-bottom: 10px; font-size: 14px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 500;">${accountCode} - ${account.name}</span>
                    <div>
                      ${showTransactionInfo ? `<span style="font-weight: 500; color: #0052CC; margin-right: 8px;">${formattedBalance}</span>` : ''}
                      ${!account.isActive ? '<span style="background-color: #f0f0f0; padding: 1px 6px; border-radius: 10px; font-size: 11px;">Inactive</span>' : ''}
                    </div>
                  </div>
                  ${showTransactionInfo && lastTransaction ? `
                    <div style="margin-top: 4px; margin-left: 20px; font-size: 12px; color: #666;">
                      <div style="display: flex; justify-content: space-between;">
                        <span>Last transaction: ${formatTransactionDate(lastTransaction)}</span>
                        <span>${lastTransaction.description || lastTransaction.reference || 'No description'}</span>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            });
          } else {
            html += '<p style="font-size: 14px; color: #888; font-style: italic;">No accounts in this category</p>';
          }
          
          html += `
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      }
    });
    
    return html;
  };

  // Handle printing chart of accounts
  const handlePrintChartOfAccounts = () => {
    // Create a new window for printing to avoid interfering with the main UI
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "Print failed",
        description: "Unable to open print window. Please check if pop-ups are blocked.",
        variant: "destructive"
      });
      return;
    }
    
    // Get business name from the authenticated user
    const businessName = user?.name || 'My Business';
    const printDate = new Date().toLocaleDateString();
    
    // Generate the complete chart of accounts content
    const chartContent = generatePrintableChartOfAccounts();
    
    // Write the HTML content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chart of Accounts</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-title {
            font-size: 18px;
            margin-bottom: 5px;
          }
          .print-date {
            font-size: 14px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          @media print {
            body {
              padding: 0;
              font-size: 12px;
            }
            h2 {
              font-size: 18px;
              margin-top: 20px;
              page-break-after: avoid;
            }
            h3 {
              font-size: 14px;
              page-break-after: avoid;
            }
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${businessName}</div>
          <div class="report-title">Chart of Accounts</div>
          <div class="print-date">As of ${printDate}</div>
        </div>
        ${chartContent}
      </body>
      </html>
    `);
    
    // Give time for resources to load, then print
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      // Don't immediately close the window to allow the user to use browser's print dialog
      // The user can close it manually after printing or canceling
    }, 500);
  };



  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Chart of Accounts</CardTitle>
          <CardDescription>View and manage standard financial account categories</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrintChartOfAccounts}>
            <Printer className="h-4 w-4 mr-2" />
            Print Chart
          </Button>
          <Button onClick={handleCreate}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={printRef}>
          <Tabs defaultValue="asset" value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="asset">Assets</TabsTrigger>
              <TabsTrigger value="liability">Liabilities</TabsTrigger>
              <TabsTrigger value="equity">Equity</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType} className="pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{getCategoryTypeLabel(selectedType)}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTransactionInfo(!showTransactionInfo)}
                    className={`text-xs flex items-center gap-1 ${showTransactionInfo ? 'bg-blue-50' : ''}`}
                  >
                    <Info className="h-3.5 w-3.5" />
                    {showTransactionInfo ? "Hide Transaction Info" : "Show Transaction Info"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleExpandAll}
                    className="text-xs flex items-center gap-1"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    {expandAll ? "Collapse All" : "Expand All"}
                  </Button>
                </div>
              </div>

              {categoriesLoading || accountsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse"></div>
                  ))}
                </div>
              ) : filteredCategories?.length ? (
                <div className="space-y-3">
                  {filteredCategories.map((category) => (
                    <Collapsible key={category.id} open={!!expandedCategories[category.id]} onOpenChange={() => {}}>
                      <div className="flex items-center justify-between p-4 rounded-md border">
                        <div className="flex items-center">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6" 
                              onClick={() => toggleCategoryExpanded(category.id)}>
                              {expandedCategories[category.id] ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                          <div className="ml-2">
                            <h4 className="font-medium text-sm flex flex-wrap items-center gap-x-2">
                              <span className="text-xs text-gray-500 font-mono">
                                {generateAccountCode(category.type, category.id)}
                              </span>
                              {category.name}
                              {category.isSystem && (
                                <Badge variant="outline" className="text-xs bg-gray-100 px-2 py-1">
                                  System
                                </Badge>
                              )}
                            </h4>
                            {category.description && (
                              <p className="text-sm text-gray-500">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            disabled={category.isSystem === true}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id, category.isSystem)}
                            disabled={category.isSystem === true}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      <CollapsibleContent>
                        <div className="pl-10 pr-4 pb-2 pt-1">
                          {getAccountsForCategory(category.id).length > 0 ? (
                            <div className="space-y-1 border-l-2 border-gray-200 pl-4">
                              {getAccountsForCategory(category.id).map(account => {
                                const accountCode = generateAccountCode(category.type, account.id);
                                const lastTransaction = showTransactionInfo ? getLastTransactionForAccount(account.id) : null;
                                const formattedBalance = new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 2
                                }).format((account.currentBalance || 0) / 100); // Convert from cents to dollars
                                
                                return (
                                  <div key={account.id} className="py-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">
                                        <span className="text-xs text-gray-500 font-mono mr-2">{accountCode}</span>
                                        {account.name}
                                      </span>
                                      <div className="flex gap-2 items-center">
                                        {showTransactionInfo && (
                                          <span className="text-sm font-medium text-blue-600">{formattedBalance}</span>
                                        )}
                                        {!account.isActive && (
                                          <Badge variant="outline" className="text-xs bg-gray-100">
                                            Inactive
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {showTransactionInfo && lastTransaction && (
                                      <div className="mt-1 ml-8 text-xs text-gray-500">
                                        <div className="flex justify-between">
                                          <span>Last transaction: {formatTransactionDate(lastTransaction)}</span>
                                          <span>{lastTransaction.description || lastTransaction.reference || 'No description'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No accounts in this category</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-gray-500">No {selectedType} categories available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Account Category" : "Create New Account Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update this account category in your chart of accounts"
                : "Add a new account category to your chart of accounts to organize your finances"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Checking Accounts" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assets are what you own, liabilities what you owe
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a description of this category"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createCategoryMutation.isPending || updateCategoryMutation.isPending
                  }
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                    "Saving..."
                  ) : editingCategory ? (
                    "Update Account Category"
                  ) : (
                    "Create Account Category"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}