import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import TransactionsTable from "@/components/finances/TransactionsTable";
import FinancialSummary from "@/components/finances/FinancialSummary";
import AccountCategoriesPanel from "@/components/finances/AccountCategoriesPanel";
import AccountsPanel from "@/components/finances/AccountsPanel";
import TransactionForm from "@/components/finances/TransactionForm";
import SalesInvoiceList from "@/components/finances/SalesInvoiceList";
import SalesInvoiceForm from "@/components/finances/SalesInvoiceForm";
import SalesInvoiceSplitView from "@/components/finances/SalesInvoiceSplitView";
import PurchaseBillSplitView from "@/components/finances/PurchaseBillSplitView";
import { InvoicePrintDialog } from "@/components/finances/InvoicePrint";
import UsersPanel from "@/components/finances/UsersPanel";
import FinancialInsightBubble from "@/components/finances/FinancialInsightBubble";
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
import { Download, FileText, DollarSign, TrendingUp, CreditCard, Plus, BarChart4 } from "lucide-react";

export default function Finances() {
  const [period, setPeriod] = useState("month");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [salesInvoiceDialogOpen, setSalesInvoiceDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Transaction | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Transaction | null>(null);
  const [invoicePrintDialogOpen, setInvoicePrintDialogOpen] = useState(false);
  
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
  
  // State to track which tab is currently active
  const [activeTab, setActiveTab] = useState("overview");
  
  // Check if summary cards should be hidden (for Transactions, Sales Invoice, Purchase Bill)
  const shouldHideSummaryCards = ["transactions", "sales-invoice", "purchase-bill"].includes(activeTab);
  
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
      
      {/* Only show summary cards when not in restricted sections */}
      {!shouldHideSummaryCards && (
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
      )}
      
      <Tabs 
        defaultValue="overview" 
        className="mb-8"
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="sales-invoice">Sales Invoice</TabsTrigger>
          <TabsTrigger value="purchase-bill">Purchase Bill</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 relative">
          {/* Financial Insight Bubble - only shown in Overview tab */}
          <FinancialInsightBubble />
          
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
          <SalesInvoiceSplitView 
            businessData={{
              name: "My Business",
              email: "business@example.com",
              phone: "+1 (555) 123-4567",
              address: "123 Business St, Demo City, 12345"
            }}
          />
        </TabsContent>

        <TabsContent value="purchase-bill" className="mt-6">
          <PurchaseBillSplitView 
            businessData={{
              name: "My Business",
              email: "business@example.com",
              phone: "+1 (555) 123-4567",
              address: "123 Business St, Demo City, 12345"
            }}
          />
        </TabsContent>
        
        <TabsContent value="accounts" className="mt-6">
          <AccountsPanel />
        </TabsContent>
        
        <TabsContent value="chart-of-accounts" className="mt-6">
          <AccountCategoriesPanel />
        </TabsContent>
        
        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>View and generate financial reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <Button variant="outline" className="w-full flex flex-col items-center justify-center h-24">
                      <BarChart4 className="h-8 w-8 mb-2" />
                      <span>Cash Flow</span>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Button variant="outline" className="w-full flex flex-col items-center justify-center h-24">
                      <BarChart4 className="h-8 w-8 mb-2" />
                      <span>Profit & Loss</span>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Button variant="outline" className="w-full flex flex-col items-center justify-center h-24">
                      <BarChart4 className="h-8 w-8 mb-2" />
                      <span>Balance Sheet</span>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="user" className="mt-6">
          <UsersPanel 
            users={users} 
            isLoading={usersLoading} 
          />
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
      
      {/* Sales Invoice Form Dialog */}
      <SalesInvoiceForm
        open={salesInvoiceDialogOpen}
        onOpenChange={setSalesInvoiceDialogOpen}
        editingInvoice={editingInvoice}
      />
      
      {/* Invoice Print Dialog */}
      <InvoicePrintDialog
        open={invoicePrintDialogOpen}
        onOpenChange={setInvoicePrintDialogOpen}
        invoice={viewingInvoice}
      />

    </MainLayout>
  );
}
