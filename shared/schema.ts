import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Business users
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  logoUrl: text("logo_url"),
  chatbotSettings: jsonb("chatbot_settings"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
});

// Product categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
});

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

// E-commerce products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Price in cents
  sku: text("sku"),
  category: text("category"), // Legacy category text field
  categoryId: integer("category_id"), // Reference to product_categories
  imageUrl: text("image_url"),
  additionalImages: jsonb("additional_images").default([]),
  inventory: integer("inventory").default(0),
  inStock: boolean("in_stock").default(true),
  hasVariants: boolean("has_variants").default(false),
  variants: jsonb("variants").default([]),
  weight: decimal("weight", { precision: 10, scale: 2 }), // in kg
  dimensions: jsonb("dimensions").default({}), // { length, width, height } in cm
  tags: text("tags").array(),
  isFeatured: boolean("is_featured").default(false), // Featured products appear at the top of lists
  isOnSale: boolean("is_on_sale").default(false), // Products with special offers or discounts
  salePrice: integer("sale_price"), // Optional sale price in cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Product variant schema for frontend validation
export const productVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number().optional(), // Price adjustment in cents (can be positive or negative)
  inventory: z.number().optional(),
  imageUrl: z.string().optional(),
  attributes: z.record(z.string(), z.string()), // e.g., { "Color": "Red", "Size": "Large" }
});

// Website templates
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  previewUrl: text("preview_url"),
  category: text("category").notNull(),
  isPopular: boolean("is_popular").default(false),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
});

// Website customizations per business
export const websites = pgTable("websites", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  templateId: integer("template_id").notNull(),
  name: text("name").notNull(),
  customizations: jsonb("customizations"), // Store colors, content, layout options
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWebsiteSchema = createInsertSchema(websites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Customer orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  total: integer("total").notNull(), // Total in cents
  status: text("status").notNull(), // 'pending', 'processing', 'completed', etc.
  items: jsonb("items").notNull(), // Array of product IDs and quantities
  fromChatbot: boolean("from_chatbot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

// Account Categories
export const accountCategories = pgTable("account_categories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'asset', 'liability', 'equity', 'income', 'expense'
  description: text("description"),
  isSystem: boolean("is_system").default(false), // if true, cannot be deleted by user
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccountCategorySchema = createInsertSchema(accountCategories).omit({
  id: true,
  createdAt: true,
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  categoryId: integer("category_id").notNull(), // References account_categories
  name: text("name").notNull(),
  description: text("description"),
  initialBalance: integer("initial_balance").default(0), // Amount in cents
  currentBalance: integer("current_balance").default(0), // Amount in cents
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Financial transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  orderId: integer("order_id"),
  accountId: integer("account_id").notNull(), // The account this transaction affects
  amount: integer("amount").notNull(), // Amount in cents
  type: text("type").notNull(), // 'income', 'expense', 'transfer'
  category: text("category").notNull(), // User-defined category (e.g., "Rent", "Utilities", "Sales")
  description: text("description"),
  date: timestamp("date").defaultNow(), // Transaction date (can be different from created date)
  createdAt: timestamp("created_at").defaultNow(),
  reference: text("reference"), // External reference number or invoice number
  notes: text("notes"),
  documentType: text("document_type"), // 'invoice', 'receipt', 'bill', 'voucher'
  documentNumber: text("document_number"), // Unique document identifier
  documentUrl: text("document_url"), // URL to the generated document
  contactName: text("contact_name"), // Customer or vendor name
  contactEmail: text("contact_email"), // Customer or vendor email
  contactPhone: text("contact_phone"), // Customer or vendor phone
  contactAddress: text("contact_address"), // Customer or vendor address
  items: jsonb("items").default([]), // Line items for invoice/bill details
  status: text("status").default('draft'), // 'draft', 'final', 'paid', 'cancelled'
  paymentReceived: integer("payment_received").default(0), // Amount paid so far in cents
  metadata: jsonb("metadata").default({}), // For document-specific custom fields (totalDiscount, etc.)
});

// Purchase Bill Item for strong typing and validation
export const PurchaseBillItemSchema = z.object({
  productId: z.number(),
  description: z.string(),
  quantity: z.number().min(0),
  unitPrice: z.number(),
  taxRate: z.number().default(0),
  discount: z.number().default(0),
  taxType: z.enum(['flat', 'percentage']).default('flat'),
  discountType: z.enum(['flat', 'percentage']).default('flat'),
  amount: z.number(),
  // Explicitly define quantityReceived as a required field with a default value
  quantityReceived: z.number().min(0).default(0)
});

export type PurchaseBillItem = z.infer<typeof PurchaseBillItemSchema>;

// Define metadata types for transaction documents
export const PurchaseBillMetadataSchema = z.object({
  totalDiscount: z.number().optional().default(0),
  totalDiscountType: z.enum(['flat', 'percentage']).optional().default('flat'),
  dueDate: z.date().or(z.string().transform(str => new Date(str))).optional(),
  contactId: z.number().optional(), // Vendor/customer ID for bills/invoices
});

export type PurchaseBillMetadata = z.infer<typeof PurchaseBillMetadataSchema>;

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Allow date to be provided as either a Date object or a string (which will be converted to a Date)
    date: z.date().or(z.string().transform(str => new Date(str))),
    // Make status field optional with a default value of 'draft'
    status: z.string().optional().default('draft'),
    // Make paymentReceived optional with a default of 0
    paymentReceived: z.number().optional().default(0),
    // Add metadata with validation for document-specific fields
    metadata: z.object({}).passthrough().optional().default({}),
  });

// For transaction transfers between accounts
export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  fromAccountId: integer("from_account_id").notNull(),
  toAccountId: integer("to_account_id").notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  description: text("description"),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  reference: text("reference"),
  notes: text("notes"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
  documentType: text("document_type"),
  documentNumber: text("document_number"),
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
});

// Transaction Version History (for tracking changes to purchase bills, invoices, etc.)
export const transactionVersions = pgTable("transaction_versions", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(), // References the original transaction
  version: integer("version").notNull(), // Version number, starts at 1
  businessId: integer("business_id").notNull(),
  userId: integer("user_id"), // User who made the change (null for system/initial create)
  timestamp: timestamp("timestamp").defaultNow(),
  changeDescription: text("change_description"), // Short description of changes
  changeType: text("change_type").notNull(), // Type of change: create, update, restore
  data: jsonb("data").notNull(), // Complete snapshot of transaction data at this version
  important: boolean("important").default(false), // Flag for important versions
});

export const transactionVersionsRelations = relations(transactionVersions, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionVersions.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [transactionVersions.userId],
    references: [users.id],
    relationName: "versionUser"
  }),
}));

export const insertTransactionVersionSchema = createInsertSchema(transactionVersions).omit({
  id: true,
  timestamp: true,
});

// Chatbot conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  messages: jsonb("messages").notNull(), // Array of messages
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Users: Customers, Vendors, Employees
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  type: text("type").notNull(), // 'customer', 'vendor', 'employee'
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  password: text("password").notNull(),
  businessName: text("business_name"),
  profileImageUrl: text("profile_image_url"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  loginHistory: jsonb("login_history").default([]),
  invitationToken: text("invitation_token"),
  balance: integer("balance").default(0), // Balance amount in cents
  balanceHistory: jsonb("balance_history").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  loginHistory: true,
  invitationToken: true,
});

// LoginHistory type for frontend validation
export const loginHistoryEntrySchema = z.object({
  date: z.date().or(z.string().transform(str => new Date(str))),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  location: z.string().optional(),
});

// BalanceHistory type for frontend validation
export const balanceHistoryEntrySchema = z.object({
  date: z.date().or(z.string().transform(str => new Date(str))),
  amount: z.number(),
  type: z.enum(['add', 'deduct']),
  note: z.string().optional(),
  previousBalance: z.number(),
  newBalance: z.number(),
});

// Export types
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Website = typeof websites.$inferSelect;
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type AccountCategory = typeof accountCategories.$inferSelect;
export type InsertAccountCategory = z.infer<typeof insertAccountCategorySchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect & {
  metadata?: {
    totalDiscount?: number;
    totalDiscountType?: 'flat' | 'percentage';
    dueDate?: Date;
    contactId?: number;
    [key: string]: any;
  };
};
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginHistoryEntry = z.infer<typeof loginHistoryEntrySchema>;
export type BalanceHistoryEntry = z.infer<typeof balanceHistoryEntrySchema>;

export type TransactionVersion = typeof transactionVersions.$inferSelect;
export type InsertTransactionVersion = z.infer<typeof insertTransactionVersionSchema>;
