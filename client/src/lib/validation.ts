import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { 
  transactions, 
  accounts, 
  accountCategories,
  users,
  products
} from "@shared/schema";

// Transaction schema
export const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  accountId: z.number().min(1, "Please select an account"),
  toAccountId: z.number().optional(),
  category: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.date(),
  description: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      amount: z.number()
    })
  ).optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  status: z.string().optional(),
});

// Account schema
export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  categoryId: z.number().min(1, "Please select an account type"),
  description: z.string().optional(),
  initialBalance: z.number().default(0),
  isActive: z.boolean().default(true)
});

// Category schema
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  description: z.string().optional(),
  isSystem: z.boolean().default(false)
});

// Product schema
export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price cannot be negative"),
  inventory: z.number().int().default(0),
  sku: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  additionalImages: z.array(z.string()).optional(),
  inStock: z.boolean().default(true),
  hasVariants: z.boolean().default(false),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      attributes: z.record(z.string()).optional(),
      price: z.number().optional(),
      sku: z.string().optional(),
      imageUrl: z.string().optional(),
      inventory: z.number().optional()
    })
  ).optional(),
  weight: z.string().optional(),
  dimensions: z.record(z.any()).optional(),
  isFeatured: z.boolean().default(false),
  isOnSale: z.boolean().default(false),
  salePrice: z.number().optional()
});

// Sales Invoice schema
export const salesInvoiceItemSchema = z.object({
  productId: z.number().min(1, "Please select a product"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  taxRate: z.number().default(0),
  discount: z.number().default(0),
  amount: z.number().min(0.01, "Amount must be greater than 0")
});

export const salesInvoiceSchema = z.object({
  customerId: z.number().min(1, "Please select a customer"),
  accountId: z.number().min(1, "Please select a bank account"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date(),
  dueDate: z.date(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional().default("draft"),
  items: z.array(salesInvoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  taxAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  totalAmount: z.number().min(0.01, "Total amount must be greater than 0"),
  paymentReceived: z.number().min(0, "Payment amount cannot be negative").optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  customerNotes: z.string().optional(),
});

// Invoice PDF configuration schema
export const invoicePdfConfigSchema = z.object({
  showLogo: z.boolean().default(true),
  showPaymentInfo: z.boolean().default(true),
  primaryColor: z.string().default("#4F46E5"),
  secondaryColor: z.string().default("#8B5CF6"),
  fontSize: z.number().default(12),
  fontFamily: z.string().default("Arial"),
});

// Purchase Bill schema with reliable quantity tracking
export const purchaseBillItemSchema = z.object({
  productId: z.number().min(1, "Please select a product"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  // Make quantityReceived required with a default of 0 to ensure consistent data handling
  quantityReceived: z.number().min(0, "Quantity received cannot be negative").default(0),
  taxRate: z.number().default(0),
  discount: z.number().default(0),
  taxType: z.enum(["percentage", "flat"]).default("percentage"),
  discountType: z.enum(["percentage", "flat"]).default("percentage"),
  amount: z.number().min(0.01, "Amount must be greater than 0")
}).superRefine((data, ctx) => {
  // Validate that quantityReceived doesn't exceed ordered quantity
  if (data.quantityReceived > data.quantity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Quantity received cannot exceed ordered quantity",
      path: ["quantityReceived"],
    });
  }
});

export const purchaseBillSchema = z.object({
  vendorId: z.number().min(1, "Please select a vendor"),
  accountId: z.number().min(1, "Please select a bank account"),
  billNumber: z.string().min(1, "Bill number is required"),
  billDate: z.date(),
  dueDate: z.date(),
  // Status is now calculated automatically, but we keep it for compatibility
  status: z.enum([
    "draft", 
    "cancelled", 
    "paid", 
    "partial_paid", 
    "received", 
    "partial_received",
    "paid_received",
    "paid_partial_received", 
    "partial_paid_received",
    "partial_paid_partial_received"
  ]).optional().default("draft"),
  items: z.array(purchaseBillItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  taxAmount: z.number().default(0),
  discountAmount: z.number().default(0), // Line item discounts
  totalDiscount: z.number().default(0), // Total discount amount
  totalDiscountType: z.enum(["percentage", "flat"]).default("flat"), // Total discount type (% or flat) - default to flat amount
  totalAmount: z.number().min(0.01, "Total amount must be greater than 0"),
  paymentMade: z.number().min(0, "Payment amount cannot be negative").optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  vendorNotes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Check that payment doesn't exceed total amount
  if (data.paymentMade !== undefined && data.paymentMade !== null) {
    if (data.paymentMade > data.totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment cannot exceed total bill amount",
        path: ["paymentMade"],
      });
    }
  }
});

// Export types for all schemas
export type SalesInvoiceItem = z.infer<typeof salesInvoiceItemSchema>;
export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;
export type PurchaseBillItem = z.infer<typeof purchaseBillItemSchema>;
export type PurchaseBill = z.infer<typeof purchaseBillSchema>;

// Automated status calculation function for Purchase Bills
export function calculatePurchaseBillStatus(
  totalAmount: number,
  paymentMade: number = 0,
  items: Array<{ quantity: number; quantityReceived: number }> = [],
  isCancelled: boolean = false
): string {
  // If bill is cancelled, return cancelled status
  if (isCancelled) {
    return "cancelled";
  }

  // Calculate payment status
  const isFullyPaid = paymentMade >= totalAmount;
  const isPartiallyPaid = paymentMade > 0 && paymentMade < totalAmount;
  const isNotPaid = paymentMade === 0;

  // Calculate receipt status
  const totalQuantityOrdered = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalQuantityReceived = items.reduce((sum, item) => sum + (item.quantityReceived || 0), 0);
  
  const isFullyReceived = totalQuantityReceived >= totalQuantityOrdered && totalQuantityOrdered > 0;
  const isPartiallyReceived = totalQuantityReceived > 0 && totalQuantityReceived < totalQuantityOrdered;
  const isNotReceived = totalQuantityReceived === 0;

  // If no payment and no receipt, it's draft
  if (isNotPaid && isNotReceived) {
    return "draft";
  }

  // Determine combined status based on payment and receipt conditions
  if (isFullyPaid && isFullyReceived) {
    return "paid_received"; // Fully paid + Fully received
  } else if (isFullyPaid && isPartiallyReceived) {
    return "paid_partial_received"; // Fully paid + Partially received
  } else if (isPartiallyPaid && isFullyReceived) {
    return "partial_paid_received"; // Partially paid + Fully received
  } else if (isPartiallyPaid && isPartiallyReceived) {
    return "partial_paid_partial_received"; // Partially paid + Partially received
  } else if (isFullyPaid && isNotReceived) {
    return "paid"; // Fully paid but not received
  } else if (isPartiallyPaid && isNotReceived) {
    return "partial_paid"; // Partially paid but not received
  } else if (isNotPaid && isFullyReceived) {
    return "received"; // Fully received but not paid
  } else if (isNotPaid && isPartiallyReceived) {
    return "partial_received"; // Partially received but not paid
  }

  // Default fallback
  return "draft";
}
export type InvoicePdfConfig = z.infer<typeof invoicePdfConfigSchema>;