import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// E-commerce products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Price in cents
  sku: text("sku"),
  category: text("category"),
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
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
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
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
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

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
