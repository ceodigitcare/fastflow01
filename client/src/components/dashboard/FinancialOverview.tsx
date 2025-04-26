import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface TransactionWithOrder {
  id: number;
  orderId: number | null;
  customerName: string;
  date: string;
  amount: number;
  status: string;
}

export default function FinancialOverview() {
  // Get transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Converting transactions to the expected format for display
  const formattedTransactions: TransactionWithOrder[] = transactions?.slice(0, 4).map(tx => ({
    id: tx.id,
    orderId: tx.orderId || null,
    customerName: "Customer", // This would come from orders data in a real app
    date: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
    amount: tx.amount / 100, // Convert cents to dollars
    status: tx.type === 'sale' ? 'Completed' : tx.type === 'refund' ? 'Refunded' : 'Processing',
  })) || [];
  
  // For the financial metrics (these would be calculated from real data in a production app)
  const monthlyRevenue = 12426;
  const monthlyRevenueGoal = 18000;
  const revenuePercentage = Math.round((monthlyRevenue / monthlyRevenueGoal) * 100);
  const daysLeft = 12;
  
  const directSales = 8642;
  const aiChatSales = 3784;
  
  const monthlyExpenses = 4850;
  const netProfit = monthlyRevenue - monthlyExpenses;
  const profitMargin = Math.round((netProfit / monthlyRevenue) * 100);
  
  return (
    <div className="col-span-1 lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="shadow-card lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Select defaultValue="7days">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    ORDER ID
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    CUSTOMER
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    DATE
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    AMOUNT
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  // Loading skeleton
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 px-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-5 w-20" /></td>
                    </tr>
                  ))
                ) : (
                  formattedTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">#{tx.orderId || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm">{tx.customerName}</td>
                      <td className="py-3 px-4 text-sm">{tx.date}</td>
                      <td className="py-3 px-4 text-sm font-medium">{formatCurrency(tx.amount)}</td>
                      <td className="py-3 px-4">
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === 'Completed' 
                              ? 'bg-green-100 text-success' 
                              : tx.status === 'Processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Button variant="link">
              View All Transactions
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Financial Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Monthly Revenue Goal</p>
              <p className="text-sm font-medium">{revenuePercentage}%</p>
            </div>
            <Progress value={revenuePercentage} className="h-2.5" />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">{formatCurrency(monthlyRevenue)} of {formatCurrency(monthlyRevenueGoal)}</p>
              <p className="text-xs text-gray-500">{daysLeft} days left</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-3">Revenue Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary rounded-sm mr-2"></div>
                  <p className="text-sm">Direct Sales</p>
                </div>
                <p className="text-sm font-medium">{formatCurrency(directSales)}</p>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-secondary rounded-sm mr-2"></div>
                  <p className="text-sm">AI Chat Sales</p>
                </div>
                <p className="text-sm font-medium">{formatCurrency(aiChatSales)}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-3">Expenses Overview</h4>
            <div className="p-4 bg-background rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm">Monthly Expenses</p>
                <p className="text-sm font-medium">{formatCurrency(monthlyExpenses)}</p>
              </div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm">Net Profit</p>
                <p className="text-sm font-medium text-success">{formatCurrency(netProfit)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm">Profit Margin</p>
                <p className="text-sm font-medium">{profitMargin}%</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Download Financial Report
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
