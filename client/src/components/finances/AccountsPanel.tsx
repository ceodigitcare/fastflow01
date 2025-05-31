import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Account, AccountCategory, InsertAccount } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatCurrencyDisplay, normalizeCurrency } from "@/lib/currency-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, ArrowUpDown, CircleDollarSign } from "lucide-react";

// Form validation schema
const accountSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  categoryId: z.coerce.number({
    required_error: "Please select a category",
    invalid_type_error: "Category ID must be a number",
  }),
  description: z.string().optional(),
  initialBalance: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function AccountsPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Fetch account categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<AccountCategory[]>({
    queryKey: ["/api/account-categories"],
  });

  // Form setup
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      description: "",
      initialBalance: 0,
      isActive: true,
    },
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const res = await apiRequest("POST", "/api/accounts", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AccountFormValues }) => {
      const res = await apiRequest("PATCH", `/api/accounts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account updated",
        description: "Your account has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setDialogOpen(false);
      setEditingAccount(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/accounts/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group accounts by category type
  const groupedAccounts = accounts?.reduce((acc: Record<string, Account[]>, account) => {
    const category = categories?.find(c => c.id === account.categoryId);
    const type = category?.type || "other";
    
    if (!acc[type]) {
      acc[type] = [];
    }
    
    acc[type].push(account);
    return acc;
  }, {});

  // Handle form submission
  const onSubmit = (values: AccountFormValues) => {
    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, data: values });
    } else {
      createAccountMutation.mutate(values);
    }
  };

  // Open dialog for editing
  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    form.reset({
      name: account.name,
      categoryId: account.categoryId,
      description: account.description || "",
      initialBalance: account.initialBalance,
      isActive: account.isActive,
    });
    setDialogOpen(true);
  };

  // Open dialog for creating
  const handleCreate = () => {
    setEditingAccount(null);
    form.reset({
      name: "",
      categoryId: 0,
      description: "",
      initialBalance: 0,
      isActive: true,
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this account? This cannot be undone.")) {
      deleteAccountMutation.mutate(id);
    }
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  // Calculate total balances
  const calculateTotals = () => {
    if (!accounts) return { assets: 0, liabilities: 0, net: 0 };
    
    const totals = accounts.reduce((acc, account) => {
      const category = categories?.find(c => c.id === account.categoryId);
      if (category?.type === "asset") {
        acc.assets += account.currentBalance;
      } else if (category?.type === "liability") {
        acc.liabilities += account.currentBalance;
      }
      return acc;
    }, { assets: 0, liabilities: 0, net: 0 });
    
    totals.net = totals.assets - totals.liabilities;
    return totals;
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Manage your financial accounts</CardDescription>
        </div>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </CardHeader>
      <CardContent>
        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-500">Total Assets</div>
                <CircleDollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold mt-2">{formatCurrencyDisplay(totals.assets)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-500">Total Liabilities</div>
                <CircleDollarSign className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold mt-2">{formatCurrency(totals.liabilities)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-500">Net Worth</div>
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
              </div>
              <div className={`text-2xl font-bold mt-2 ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.net)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        {accountsLoading || categoriesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse"></div>
            ))}
          </div>
        ) : accounts?.length ? (
          <div className="space-y-6">
            {/* Asset Accounts */}
            {groupedAccounts?.asset?.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Assets</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedAccounts.asset.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>{getCategoryName(account.categoryId)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.currentBalance)}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Liability Accounts */}
            {groupedAccounts?.liability?.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Liabilities</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedAccounts.liability.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>{getCategoryName(account.categoryId)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.currentBalance)}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Other Accounts */}
            {(groupedAccounts?.income?.length > 0 || groupedAccounts?.expense?.length > 0 || groupedAccounts?.equity?.length > 0) && (
              <div>
                <h3 className="text-lg font-medium mb-2">Other Accounts</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...groupedAccounts.income || [], ...groupedAccounts.expense || [], ...groupedAccounts.equity || []].map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>{getCategoryName(account.categoryId)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.currentBalance)}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-md">
            <p className="text-gray-500">No accounts yet</p>
            <Button variant="link" onClick={handleCreate}>
              Create your first account
            </Button>
          </div>
        )}

        {/* Create/Edit Account Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Account" : "Create New Account"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Update this financial account"
                  : "Add a new financial account to track your balances"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Checking Account" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name} ({category.type.charAt(0).toUpperCase() + category.type.slice(1)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the category this account belongs to
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
                          placeholder="Enter a description of this account"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="initialBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Starting balance for this account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active Account</FormLabel>
                        <FormDescription>
                          Inactive accounts won't show up in transaction forms
                        </FormDescription>
                      </div>
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
                      createAccountMutation.isPending || updateAccountMutation.isPending
                    }
                  >
                    {createAccountMutation.isPending || updateAccountMutation.isPending ? (
                      "Saving..."
                    ) : editingAccount ? (
                      "Update Account"
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}