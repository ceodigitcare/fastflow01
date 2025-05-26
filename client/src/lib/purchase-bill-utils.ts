import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  DollarSign, 
  Package 
} from "lucide-react";

// Status color mapping for Purchase Bills
export const statusColors = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  partial_paid: "bg-orange-100 text-orange-800 border-orange-200",
  received: "bg-blue-100 text-blue-800 border-blue-200",
  partial_received: "bg-teal-100 text-teal-800 border-teal-200",
  // Combined statuses
  paid_received: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paid_partial_received: "bg-blue-100 text-blue-800 border-blue-200",
  partial_paid_received: "bg-cyan-100 text-cyan-800 border-cyan-200",
  partial_paid_partial_received: "bg-indigo-100 text-indigo-800 border-indigo-200"
};

// Status icons
export const statusIcons = {
  draft: Clock,
  cancelled: XCircle,
  paid: CheckCircle,
  partial_paid: DollarSign,
  received: Package,
  partial_received: Package,
  paid_received: CheckCircle,
  paid_partial_received: CheckCircle,
  partial_paid_received: Package,
  partial_paid_partial_received: DollarSign
};

// Status display names
export const statusLabels = {
  draft: "Draft",
  cancelled: "Cancelled",
  paid: "Paid",
  partial_paid: "Partial Paid",
  received: "Received",
  partial_received: "Partial Received",
  paid_received: "Paid & Received",
  paid_partial_received: "Paid & Partial Received",
  partial_paid_received: "Partial Paid & Received",
  partial_paid_partial_received: "Partial Paid & Partial Received"
};

// Function to render status badge component
export function renderStatusBadge(status: string) {
  const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
  const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.draft;
  const label = statusLabels[status as keyof typeof statusLabels] || "Unknown";

  return {
    Icon,
    colorClass,
    label
  };
}

// Function to get status breakdown for combined statuses
export function getStatusBreakdown(status: string) {
  const paymentStatuses = [];
  const receiptStatuses = [];

  switch (status) {
    case "paid_received":
      paymentStatuses.push({ label: "Paid", color: "bg-green-100 text-green-800" });
      receiptStatuses.push({ label: "Received", color: "bg-blue-100 text-blue-800" });
      break;
    case "paid_partial_received":
      paymentStatuses.push({ label: "Paid", color: "bg-green-100 text-green-800" });
      receiptStatuses.push({ label: "Partial Received", color: "bg-teal-100 text-teal-800" });
      break;
    case "partial_paid_received":
      paymentStatuses.push({ label: "Partial Paid", color: "bg-orange-100 text-orange-800" });
      receiptStatuses.push({ label: "Received", color: "bg-blue-100 text-blue-800" });
      break;
    case "partial_paid_partial_received":
      paymentStatuses.push({ label: "Partial Paid", color: "bg-orange-100 text-orange-800" });
      receiptStatuses.push({ label: "Partial Received", color: "bg-teal-100 text-teal-800" });
      break;
    case "paid":
      paymentStatuses.push({ label: "Paid", color: "bg-green-100 text-green-800" });
      break;
    case "partial_paid":
      paymentStatuses.push({ label: "Partial Paid", color: "bg-orange-100 text-orange-800" });
      break;
    case "received":
      receiptStatuses.push({ label: "Received", color: "bg-blue-100 text-blue-800" });
      break;
    case "partial_received":
      receiptStatuses.push({ label: "Partial Received", color: "bg-teal-100 text-teal-800" });
      break;
  }

  return { paymentStatuses, receiptStatuses };
}

// Function to calculate purchase bill status based on payment and receipt data
export function calculatePurchaseBillStatus(
  totalAmount: number,
  paymentMade: number,
  items: Array<{ quantity: number; quantityReceived: number }>,
  isCancelled: boolean = false
): string {
  if (isCancelled) {
    return "cancelled";
  }

  // Calculate payment status
  const paymentStatus = paymentMade <= 0 ? "unpaid" : 
                       paymentMade >= totalAmount ? "paid" : "partial_paid";

  // Calculate receipt status
  const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalReceived = items.reduce((sum, item) => sum + (item.quantityReceived || 0), 0);
  
  const receiptStatus = totalReceived <= 0 ? "not_received" :
                       totalReceived >= totalOrdered ? "received" : "partial_received";

  // Combine statuses
  if (paymentStatus === "unpaid" && receiptStatus === "not_received") {
    return "draft";
  } else if (paymentStatus === "paid" && receiptStatus === "received") {
    return "paid_received";
  } else if (paymentStatus === "paid" && receiptStatus === "partial_received") {
    return "paid_partial_received";
  } else if (paymentStatus === "partial_paid" && receiptStatus === "received") {
    return "partial_paid_received";
  } else if (paymentStatus === "partial_paid" && receiptStatus === "partial_received") {
    return "partial_paid_partial_received";
  } else if (paymentStatus === "paid") {
    return "paid";
  } else if (paymentStatus === "partial_paid") {
    return "partial_paid";
  } else if (receiptStatus === "received") {
    return "received";
  } else if (receiptStatus === "partial_received") {
    return "partial_received";
  }

  return "draft";
}