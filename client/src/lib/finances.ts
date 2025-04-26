import { apiRequest } from "./queryClient";
import { insertTransactionSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

export interface TransactionSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueBySource: {
    direct: number;
    chatbot: number;
  };
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

export async function getTransactions() {
  return await apiRequest("GET", "/api/transactions", undefined);
}

export async function createTransaction(data: z.infer<typeof insertTransactionSchema>) {
  return await apiRequest("POST", "/api/transactions", data);
}

export async function getOrders() {
  return await apiRequest("GET", "/api/orders", undefined);
}

export async function createOrder(data: z.infer<typeof insertOrderSchema>) {
  return await apiRequest("POST", "/api/orders", data);
}

export async function updateOrderStatus(id: number, status: string) {
  return await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
}

// This would typically be calculated on the server, but for demo purposes
// we're calculating it on the client using the transactions data
export function calculateFinancialSummary(transactions: any[]): TransactionSummary {
  if (!transactions || transactions.length === 0) {
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      revenueBySource: {
        direct: 0,
        chatbot: 0,
      },
      expenses: 0,
      netProfit: 0,
      profitMargin: 0,
    };
  }
  
  // Current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filter transactions for this month
  const monthlyTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });
  
  // Calculate totals
  const totalRevenue = transactions
    .filter(tx => tx.type === 'sale')
    .reduce((sum, tx) => sum + tx.amount, 0) / 100;
  
  const monthlyRevenue = monthlyTransactions
    .filter(tx => tx.type === 'sale')
    .reduce((sum, tx) => sum + tx.amount, 0) / 100;
  
  // Simple approximation for demo
  const directSales = monthlyRevenue * 0.7;
  const chatbotSales = monthlyRevenue * 0.3;
  
  const expenses = monthlyRevenue * 0.4;
  const netProfit = monthlyRevenue - expenses;
  const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;
  
  return {
    totalRevenue,
    monthlyRevenue,
    revenueBySource: {
      direct: directSales,
      chatbot: chatbotSales,
    },
    expenses,
    netProfit,
    profitMargin,
  };
}
