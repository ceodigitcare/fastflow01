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