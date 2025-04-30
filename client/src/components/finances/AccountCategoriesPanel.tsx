import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountCategory, InsertAccountCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { PlusCircle, Edit, Trash2 } from "lucide-react";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch account categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<AccountCategory[]>({
    queryKey: ["/api/account-categories"],
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

  // Handle form submission
  const onSubmit = (values: AccountCategoryFormValues) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: values });
    } else {
      createCategoryMutation.mutate(values);
    }
  };

  // Open dialog for editing
  const handleEdit = (category: AccountCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      type: category.type,
      description: category.description || "",
    });
    setDialogOpen(true);
  };

  // Open dialog for creating
  const handleCreate = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      type: selectedType,
      description: "",
    });
    setDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number, isSystem: boolean) => {
    if (isSystem) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chart of Accounts</CardTitle>
        <CardDescription>View and manage standard financial account categories</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="asset" value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="asset">Assets</TabsTrigger>
            <TabsTrigger value="liability">Liabilities</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedType} className="pt-4">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium">{getCategoryTypeLabel(selectedType)}</h3>
            </div>

            {categoriesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse"></div>
                ))}
              </div>
            ) : filteredCategories?.length ? (
              <div className="space-y-3">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 rounded-md border"
                  >
                    <div>
                      <h4 className="font-medium text-sm">
                        {category.name}
                        {category.isSystem && (
                          <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">
                            System
                          </span>
                        )}
                      </h4>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        disabled={category.isSystem}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id, category.isSystem || false)}
                        disabled={category.isSystem}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md">
                <p className="text-gray-500">No {selectedType} categories available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
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