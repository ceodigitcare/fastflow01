import { TransactionSummary } from "@/lib/finances";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface FinancialSummaryProps {
  summary: TransactionSummary | null;
  isLoading: boolean;
}

export default function FinancialSummary({ summary, isLoading }: FinancialSummaryProps) {
  // Function to render a progress bar with percentage
  const renderProgressBar = (label: string, value: number, max: number, colorClass: string) => {
    const percentage = Math.min(Math.round((value / max) * 100), 100);
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span>{formatCurrency(value)}</span>
        </div>
        <Progress value={percentage} className={`h-2 ${colorClass}`} />
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ) : summary ? (
          <>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Net Profit</h3>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(summary.netProfit)}
              </div>
            </div>
            
            <div className="space-y-4">
              {renderProgressBar(
                "Total Revenue", 
                summary.totalRevenue, 
                Math.max(summary.totalRevenue, 10000), 
                "bg-primary"
              )}
              
              {renderProgressBar(
                "Monthly Revenue", 
                summary.monthlyRevenue, 
                Math.max(summary.totalRevenue, 10000), 
                "bg-secondary"
              )}
              
              {renderProgressBar(
                "Expenses", 
                summary.expenses, 
                Math.max(summary.totalRevenue, 10000), 
                "bg-destructive"
              )}
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Revenue Sources</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Direct Sales</span>
                    <span className="font-medium">
                      {formatCurrency(summary.revenueBySource.direct)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.round((summary.revenueBySource.direct / summary.totalRevenue) * 100)} 
                    className="h-2 bg-slate-100" 
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>AI Chatbot</span>
                    <span className="font-medium">
                      {formatCurrency(summary.revenueBySource.chatbot)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.round((summary.revenueBySource.chatbot / summary.totalRevenue) * 100)} 
                    className="h-2 bg-slate-100" 
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-secondary/10 p-4 rounded-lg mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Profit Margin</span>
                <span className="font-semibold text-lg">
                  {Math.round(summary.profitMargin)}%
                </span>
              </div>
              <Progress 
                value={Math.round(summary.profitMargin)} 
                className="h-2 mt-2 bg-secondary/20" 
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No financial data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}