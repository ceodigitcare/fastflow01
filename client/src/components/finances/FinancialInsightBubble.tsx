import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  AlertCircle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  X, 
  Lightbulb
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface InsightType {
  type: 'success' | 'warning' | 'info' | 'suggestion';
  title: string;
  description: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface FinancialInsightBubbleProps {
  accountId?: number;
}

export default function FinancialInsightBubble({ accountId }: FinancialInsightBubbleProps) {
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Get transactions
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const generateInsights = (): InsightType[] => {
    if (!transactions || transactions.length === 0) {
      return [{
        type: 'info',
        title: 'Welcome to Financial Insights',
        description: 'Start making transactions to receive personalized financial advice.',
      }];
    }

    const insights: InsightType[] = [];
    
    // Calculate total income and expenses for the current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyTransactions = transactions.filter(tx => {
      // Handle all possible date formats and null cases
      const txDate = tx.date instanceof Date 
        ? tx.date 
        : typeof tx.date === 'string' 
          ? new Date(tx.date) 
          : new Date();
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
    
    const totalIncome = monthlyTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const totalExpenses = monthlyTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    // Check if specific account is provided
    if (accountId) {
      const accountTransactions = transactions.filter(tx => tx.accountId === accountId);
      const recentAccountTransactions = accountTransactions
        .sort((a, b) => {
          // Handle all possible date formats and null cases
          const dateA = a.date instanceof Date 
            ? a.date 
            : typeof a.date === 'string' 
              ? new Date(a.date) 
              : new Date();
          const dateB = b.date instanceof Date 
            ? b.date 
            : typeof b.date === 'string' 
              ? new Date(b.date) 
              : new Date();
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      
      // Check for irregular high expenses
      const averageAmount = accountTransactions.reduce((sum, tx) => sum + tx.amount, 0) / 
        (accountTransactions.length || 1);
      
      const highExpenses = recentAccountTransactions.filter(
        tx => tx.type === 'expense' && tx.amount > averageAmount * 1.5
      );
      
      if (highExpenses.length > 0) {
        insights.push({
          type: 'warning',
          title: 'Unusual Expense Detected',
          description: `A recent expense of ${formatCurrency(highExpenses[0].amount / 100)} is higher than your average.`,
          action: {
            text: 'Review Transaction',
            onClick: () => window.location.href = `#transaction-${highExpenses[0].id}`
          }
        });
      }
    }
    
    // Monthly budget insights
    if (totalExpenses > totalIncome * 0.8) {
      insights.push({
        type: 'warning',
        title: 'Budget Alert',
        description: `Your expenses (${formatCurrency(totalExpenses / 100)}) are approaching your income (${formatCurrency(totalIncome / 100)}) this month.`,
        action: {
          text: 'Review Budget',
          onClick: () => {
            // Navigate to the accounts tab
            const accountsTab = document.querySelector('[data-value="accounts"]');
            if (accountsTab) {
              (accountsTab as HTMLElement).click();
            }
          }
        }
      });
    } else if (totalExpenses < totalIncome * 0.5) {
      insights.push({
        type: 'success',
        title: 'Healthy Savings',
        description: `You're saving ${formatCurrency((totalIncome - totalExpenses) / 100)} this month. Great job maintaining a positive cash flow!`,
      });
    }
    
    // Check invoice payment status
    const unpaidInvoices = transactions.filter(
      tx => tx.type === 'income' && 
      tx.documentType === 'invoice' && 
      (tx.status === 'draft' || tx.status === 'final') &&
      (!tx.paymentReceived || tx.paymentReceived < tx.amount)
    );
    
    if (unpaidInvoices.length > 0) {
      insights.push({
        type: 'suggestion',
        title: 'Outstanding Invoices',
        description: `You have ${unpaidInvoices.length} unpaid ${unpaidInvoices.length === 1 ? 'invoice' : 'invoices'} totaling ${formatCurrency(unpaidInvoices.reduce((sum, tx) => sum + tx.amount - (tx.paymentReceived || 0), 0) / 100)}.`,
        action: {
          text: 'Follow Up',
          onClick: () => {
            // Navigate to the sales invoice tab
            const salesInvoiceTab = document.querySelector('[data-value="sales-invoice"]');
            if (salesInvoiceTab) {
              (salesInvoiceTab as HTMLElement).click();
            }
          }
        }
      });
    }
    
    // Return filtered insights (removing dismissed ones)
    return insights.filter(insight => !dismissedInsights.includes(insight.title));
  };
  
  const activeInsights = generateInsights();
  
  const dismissInsight = (title: string) => {
    setDismissedInsights([...dismissedInsights, title]);
  };
  
  if (activeInsights.length === 0) return null;
  
  const getIconForInsightType = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-purple-500" />;
      default:
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="rounded-full fixed bottom-6 right-6 h-14 w-14 shadow-lg bg-primary text-white hover:bg-primary/90 hover:text-white"
        >
          <Lightbulb className="h-6 w-6" />
          {activeInsights.length > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {activeInsights.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 bg-muted/50 border-b">
          <h3 className="font-medium">Financial Insights</h3>
          <p className="text-sm text-muted-foreground">
            Quick feedback based on your financial data
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {activeInsights.map((insight, index) => (
            <Card key={index} className="m-2 border-l-4 shadow-sm" 
              style={{ 
                borderLeftColor: insight.type === 'success' 
                  ? 'hsl(var(--success))' 
                  : insight.type === 'warning' 
                  ? 'hsl(var(--warning))' 
                  : insight.type === 'suggestion'
                  ? 'hsl(var(--purple))' 
                  : 'hsl(var(--primary))' 
              }}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-start">
                    {getIconForInsightType(insight.type)}
                    <div>
                      <h4 className="text-sm font-medium">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      {insight.action && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto mt-2 text-xs"
                          onClick={() => {
                            insight.action?.onClick();
                            setIsOpen(false);
                          }}
                        >
                          {insight.action.text}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => dismissInsight(insight.title)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}