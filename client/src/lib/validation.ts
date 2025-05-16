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

// Purchase Bill schema
export const purchaseBillItemSchema = z.object({
  productId: z.number().min(1, "Please select a product"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  taxRate: z.number().default(0),
  discount: z.number().default(0),
  amount: z.number().min(0.01, "Amount must be greater than 0")
});

export const purchaseBillSchema = z.object({
  vendorId: z.number().min(1, "Please select a vendor"),
  accountId: z.number().min(1, "Please select a bank account"),
  billNumber: z.string().min(1, "Bill number is required"),
  billDate: z.date(),
  dueDate: z.date(),
  status: z.enum(["draft", "received", "paid", "overdue", "cancelled"]).optional().default("draft"),
  items: z.array(purchaseBillItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  taxAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  totalAmount: z.number().min(0.01, "Total amount must be greater than 0"),
  paymentMade: z.number().min(0, "Payment amount cannot be negative").optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  vendorNotes: z.string().optional(),
});

// Export types for all schemas
export type SalesInvoiceItem = z.infer<typeof salesInvoiceItemSchema>;
export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;
export type PurchaseBillItem = z.infer<typeof purchaseBillItemSchema>;
export type PurchaseBill = z.infer<typeof purchaseBillSchema>;
export type InvoicePdfConfig = z.infer<typeof invoicePdfConfigSchema>;