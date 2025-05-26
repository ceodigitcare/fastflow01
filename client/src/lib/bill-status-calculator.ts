import { Transaction } from "@shared/schema";

export interface BillItem {
  quantity: number;
  quantityReceived: number;
}

export interface BillStatusData {
  grandTotal: number; // in dollars
  totalPaid: number; // in dollars
  items: BillItem[];
  isCancelled?: boolean;
}

export type BillStatus = 
  | "draft"
  | "partially_paid"
  | "paid"
  | "partially_received"
  | "received"
  | "paid_received"
  | "paid_partially_received"
  | "partially_paid_received"
  | "partially_paid_partially_received"
  | "cancelled";

/**
 * Calculate the accurate status of a purchase bill based on payments and item receipts
 * This is the SINGLE SOURCE OF TRUTH for all status calculations
 */
export function calculateBillStatus(billData: BillStatusData): BillStatus {
  // Handle cancelled bills first
  if (billData.isCancelled) {
    return "cancelled";
  }

  const { grandTotal, totalPaid, items } = billData;

  // Calculate payment status
  const isFullyPaid = totalPaid >= grandTotal && grandTotal > 0;
  const isPartiallyPaid = totalPaid > 0 && totalPaid < grandTotal;
  const isUnpaid = totalPaid <= 0;

  // Calculate receiving status
  let totalOrdered = 0;
  let totalReceived = 0;
  
  items.forEach(item => {
    totalOrdered += item.quantity || 0;
    totalReceived += item.quantityReceived || 0;
  });

  const isFullyReceived = totalReceived >= totalOrdered && totalOrdered > 0;
  const isPartiallyReceived = totalReceived > 0 && totalReceived < totalOrdered;
  const isNotReceived = totalReceived <= 0;

  // Determine composite status based on payment + receiving
  if (isUnpaid && isNotReceived) {
    return "draft";
  }

  if (isFullyPaid && isFullyReceived) {
    return "paid_received";
  }

  if (isFullyPaid && isPartiallyReceived) {
    return "paid_partially_received";
  }

  if (isPartiallyPaid && isFullyReceived) {
    return "partially_paid_received";
  }

  if (isPartiallyPaid && isPartiallyReceived) {
    return "partially_paid_partially_received";
  }

  // Single dimension statuses
  if (isFullyPaid && isNotReceived) {
    return "paid";
  }

  if (isPartiallyPaid && isNotReceived) {
    return "partially_paid";
  }

  if (isUnpaid && isFullyReceived) {
    return "received";
  }

  if (isUnpaid && isPartiallyReceived) {
    return "partially_received";
  }

  // Default fallback
  return "draft";
}

/**
 * Convert a Transaction object to BillStatusData format
 */
export function transactionToBillData(transaction: Transaction): BillStatusData {
  return {
    grandTotal: (transaction.amount || 0) / 100, // Convert cents to dollars
    totalPaid: (transaction.paymentMade || 0) / 100, // Convert cents to dollars
    items: Array.isArray(transaction.items) ? transaction.items.map((item: any) => ({
      quantity: item.quantity || 0,
      quantityReceived: item.quantityReceived || 0
    })) : [],
    isCancelled: transaction.status === "cancelled"
  };
}

/**
 * Calculate status directly from a Transaction object
 */
export function calculateTransactionStatus(transaction: Transaction): BillStatus {
  const billData = transactionToBillData(transaction);
  return calculateBillStatus(billData);
}

/**
 * Get human-readable status labels
 */
export const statusLabels: Record<BillStatus, string> = {
  draft: "Draft",
  partially_paid: "Partially Paid",
  paid: "Paid",
  partially_received: "Partially Received",
  received: "Received",
  paid_received: "Paid & Received",
  paid_partially_received: "Paid & Partially Received",
  partially_paid_received: "Partially Paid & Received",
  partially_paid_partially_received: "Partially Paid & Partially Received",
  cancelled: "Cancelled"
};

/**
 * Get status colors for consistent styling
 */
export const statusColors: Record<BillStatus, string> = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  partially_paid: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  partially_received: "bg-blue-50 text-blue-700 border-blue-200",
  received: "bg-indigo-50 text-indigo-700 border-indigo-200",
  paid_received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid_partially_received: "bg-teal-50 text-teal-700 border-teal-200",
  partially_paid_received: "bg-cyan-50 text-cyan-700 border-cyan-200",
  partially_paid_partially_received: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200"
};