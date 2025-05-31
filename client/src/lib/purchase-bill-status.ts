// Purchase Bill Status Calculation System
// Automatically determines status based on payment and receiving data

export interface PurchaseBillStatusData {
  totalAmount: number;
  paymentReceived: number;
  items: Array<{
    quantity: number;
    quantityReceived: number;
  }>;
}

export type PurchaseBillStatus = 
  | "draft"
  | "partial_received"
  | "partial_received_partial_paid"
  | "partial_received_paid"
  | "received"
  | "received_partial_paid"
  | "received_paid"
  | "partial_paid"
  | "paid";

// Status color mapping (no icons as per requirement)
export const statusColors = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  partial_received: "bg-blue-100 text-blue-800 border-blue-200",
  partial_received_partial_paid: "bg-indigo-100 text-indigo-800 border-indigo-200",
  partial_received_paid: "bg-purple-100 text-purple-800 border-purple-200",
  received: "bg-teal-100 text-teal-800 border-teal-200",
  received_partial_paid: "bg-cyan-100 text-cyan-800 border-cyan-200",
  received_paid: "bg-green-100 text-green-800 border-green-200",
  partial_paid: "bg-orange-100 text-orange-800 border-orange-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200"
};

// Status display labels
export const statusLabels = {
  draft: "Draft",
  partial_received: "Partial Received",
  partial_received_partial_paid: "Partial Received & Partial Paid",
  partial_received_paid: "Partial Received & Paid",
  received: "Received",
  received_partial_paid: "Received & Partial Paid",
  received_paid: "Received & Paid",
  partial_paid: "Partial Paid",
  paid: "Paid"
};

/**
 * Calculate Purchase Bill status based on payment and receiving data
 */
export function calculatePurchaseBillStatus(data: PurchaseBillStatusData): PurchaseBillStatus {
  const { totalAmount, paymentReceived, items } = data;
  
  // Determine payment status
  const hasNoPayment = paymentReceived === 0;
  const hasPartialPayment = paymentReceived > 0 && paymentReceived < totalAmount;
  const hasFullPayment = paymentReceived >= totalAmount;
  
  // Determine receiving status
  const hasNoItemsReceived = items.every(item => (item.quantityReceived || 0) === 0);
  const hasAllItemsReceived = items.every(item => (item.quantityReceived || 0) >= item.quantity);
  const hasPartialItemsReceived = !hasNoItemsReceived && !hasAllItemsReceived;
  
  // Apply status logic exactly as specified
  if (hasNoItemsReceived && hasNoPayment) {
    return "draft";
  }
  
  if (hasPartialItemsReceived && hasNoPayment) {
    return "partial_received";
  }
  
  if (hasPartialItemsReceived && hasPartialPayment) {
    return "partial_received_partial_paid";
  }
  
  if (hasPartialItemsReceived && hasFullPayment) {
    return "partial_received_paid";
  }
  
  if (hasAllItemsReceived && hasNoPayment) {
    return "received";
  }
  
  if (hasAllItemsReceived && hasPartialPayment) {
    return "received_partial_paid";
  }
  
  if (hasAllItemsReceived && hasFullPayment) {
    return "received_paid";
  }
  
  if (hasNoItemsReceived && hasPartialPayment) {
    return "partial_paid";
  }
  
  if (hasNoItemsReceived && hasFullPayment) {
    return "paid";
  }
  
  // Fallback to draft if no conditions match
  return "draft";
}

/**
 * Render status badge component properties
 */
export function renderStatusBadge(status: PurchaseBillStatus) {
  const colorClass = statusColors[status] || statusColors.draft;
  const label = statusLabels[status] || "Unknown";

  return {
    colorClass,
    label
  };
}