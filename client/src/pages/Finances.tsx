import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import TransactionsTable from "@/components/finances/TransactionsTable";
import FinancialSummary from "@/components/finances/FinancialSummary";
import AccountCategoriesPanel from "@/components/finances/AccountCategoriesPanel";
import AccountsPanel from "@/components/finances/AccountsPanel";
import TransactionForm from "@/components/finances/TransactionForm";
import UsersPanel from "@/components/finances/UsersPanel";
import { calculateFinancialSummary } from "@/lib/finances";
import { Transaction, User } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

// Shadcn UI components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, FileText, DollarSign, TrendingUp, CreditCard, Plus, BarChart4, RefreshCw, Share } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function Finances() {
  const [period, setPeriod] = useState("month");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Get transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Get accounts and categories for the transaction form
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/accounts"],
  });
  
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/account-categories"],
  });
  
  // Get orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Get users for the user management panel
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Calculate financial summary
  const financialSummary = transactions ? calculateFinancialSummary(transactions) : null;
  
  // Monthly revenue goal
  const monthlyRevenueGoal = 18000;
  const revenuePercentage = financialSummary 
    ? Math.round((financialSummary.monthlyRevenue / monthlyRevenueGoal) * 100) 
    : 0;
  
  // Sample data for revenue chart
  const revenueData = [
    { name: "Jan", revenue: 4200, expenses: 1800 },
    { name: "Feb", revenue: 3800, expenses: 1600 },
    { name: "Mar", revenue: 4800, expenses: 2000 },
    { name: "Apr", revenue: 5200, expenses: 2200 },
    { name: "May", revenue: 5800, expenses: 2400 },
    { name: "Jun", revenue: 6200, expenses: 2600 },
  ];

  // Handle new transaction button click
  const handleNewTransaction = () => {
    setEditingTransaction(null);
    setTransactionDialogOpen(true);
  };
  
  return (
    <MainLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Finances</h1>
          <p className="text-sm text-gray-500">Manage your business finances and track revenue</p>
        </div>
        <Button onClick={handleNewTransaction}>
          <Plus className="mr-2 h-4 w-4" /> New Transaction
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold mt-1">
                  {transactionsLoading 
                    ? "Loading..." 
                    : formatCurrency(financialSummary?.totalRevenue || 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary">
                <DollarSign size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-semibold mt-1">
                  {transactionsLoading 
                    ? "Loading..." 
                    : formatCurrency(financialSummary?.monthlyRevenue || 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-success">
                <TrendingUp size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-semibold mt-1">
                  {ordersLoading ? "Loading..." : orders?.length || 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary bg-opacity-10 flex items-center justify-center text-secondary">
                <FileText size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Profit Margin</p>
                <p className="text-2xl font-semibold mt-1">
                  {transactionsLoading 
                    ? "Loading..." 
                    : `${Math.round(financialSummary?.profitMargin || 0)}%`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <CreditCard size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="mb-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales-invoice">Sales Invoice</TabsTrigger>
          <TabsTrigger value="purchase-bill">Purchase Bill</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Revenue Overview</CardTitle>
                  <Select defaultValue={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`$${value}`, ""]}
                      labelStyle={{ fontWeight: "bold" }}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="hsl(var(--primary))" 
                      barSize={40} 
                      radius={[4, 4, 0, 0]} 
                      name="Revenue"
                    />
                    <Bar 
                      dataKey="expenses" 
                      fill="hsl(var(--muted))" 
                      barSize={40} 
                      radius={[4, 4, 0, 0]} 
                      name="Expenses"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <FinancialSummary 
              summary={financialSummary} 
              isLoading={transactionsLoading} 
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Goal</CardTitle>
                <CardDescription>Track your progress towards your monthly revenue target</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">
                      {formatCurrency(financialSummary?.monthlyRevenue || 0)} of {formatCurrency(monthlyRevenueGoal)}
                    </p>
                    <p className="font-medium">{revenuePercentage}%</p>
                  </div>
                  <Progress value={revenuePercentage} className="h-2" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <p>Current monthly revenue</p>
                    <p>12 days remaining</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Financial Reports</CardTitle>
                <CardDescription>Generate reports for any time period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                    <BarChart4 className="h-8 w-8 mb-2" />
                    <span>Cash Flow</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                    <BarChart4 className="h-8 w-8 mb-2" />
                    <span>Profit & Loss</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                    <BarChart4 className="h-8 w-8 mb-2" />
                    <span>Balance Sheet</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          <TransactionsTable 
            transactions={transactions} 
            isLoading={transactionsLoading} 
            onNewTransaction={handleNewTransaction}
            onEditTransaction={(transaction) => {
              setEditingTransaction(transaction);
              setTransactionDialogOpen(true);
            }}
          />
        </TabsContent>
        
        <TabsContent value="sales-invoice" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Invoice</CardTitle>
              <CardDescription>Manage your sales invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sales Invoice feature coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-bill" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Bill</CardTitle>
              <CardDescription>Manage your purchase bills</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Purchase Bill feature coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="user" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage your customers, vendors, and employees</CardDescription>
              </div>
              <Button onClick={() => setUserDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">Loading users...</td>
                      </tr>
                    ) : users && users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{user.name}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" 
                              style={{
                                backgroundColor: 
                                  user.type === 'customer' ? 'rgba(var(--color-success), 0.1)' :
                                  user.type === 'vendor' ? 'rgba(var(--color-info), 0.1)' :
                                  'rgba(var(--color-warning), 0.1)',
                                color: 
                                  user.type === 'customer' ? 'hsl(var(--success))' :
                                  user.type === 'vendor' ? 'hsl(var(--info))' :
                                  'hsl(var(--warning))'
                              }}
                            >
                              {user.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">{user.email}</td>
                          <td className="py-3 px-4">{user.phone || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setUserDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-4">No users found. Click "Add User" to create one.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Transaction Form Dialog */}
      <TransactionForm 
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        editingTransaction={editingTransaction}
        accounts={accounts}
        categories={categories}
      />

      {/* User Form Dialog Placeholder */}
      {userDialogOpen && (
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user information' : 'Fill in the details to create a new user'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Tabs defaultValue="main">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="main">Main Information</TabsTrigger>
                  <TabsTrigger value="login">Login History</TabsTrigger>
                  <TabsTrigger value="invitation">Invitation</TabsTrigger>
                </TabsList>
                <TabsContent value="main" className="mt-4">
                  <form>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="name">Name</Label>
                        <Input id="name" placeholder="User name" className="col-span-3" defaultValue={editingUser?.name || ''} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="type">Type</Label>
                        <Select defaultValue={editingUser?.type || 'customer'}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="user@example.com" className="col-span-3" defaultValue={editingUser?.email || ''} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="phone">Phone</Label>
                        <Input id="phone" placeholder="Phone number" className="col-span-3" defaultValue={editingUser?.phone || ''} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="address">Address</Label>
                        <Textarea id="address" placeholder="Address" className="col-span-3" defaultValue={editingUser?.address || ''} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="status">Status</Label>
                        <div className="flex items-center space-x-2 col-span-3">
                          <Switch id="isActive" defaultChecked={editingUser?.isActive ?? true} />
                          <Label htmlFor="isActive">Active</Label>
                        </div>
                      </div>
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="login" className="mt-4">
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingUser?.loginHistory && editingUser.loginHistory.length > 0 ? (
                            editingUser.loginHistory.map((entry, index) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{entry.ipAddress}</TableCell>
                                <TableCell>{entry.device}</TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {entry.status}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">No login history available</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="invitation" className="mt-4">
                  <div className="space-y-4">
                    <div className="rounded-md border p-4">
                      <div className="text-center">
                        <div className="my-4 flex justify-center">
                          {editingUser?.invitationToken ? (
                            <QRCodeSVG value={`https://app.example.com/invite/${editingUser.invitationToken}`} size={200} />
                          ) : (
                            <div className="w-[200px] h-[200px] bg-muted flex items-center justify-center">
                              <p className="text-muted-foreground">No invitation token generated</p>
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg font-medium mt-2">Invitation Link</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {editingUser?.invitationToken ? 
                            `https://app.example.com/invite/${editingUser.invitationToken}` : 
                            'Generate an invitation token first'}
                        </p>
                        <div className="flex space-x-2 justify-center">
                          <Button>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Generate New Token
                          </Button>
                          <Button variant="outline">
                            <Share className="mr-2 h-4 w-4" />
                            Share Link
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
              <Button type="button">{editingUser ? 'Update User' : 'Create User'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
