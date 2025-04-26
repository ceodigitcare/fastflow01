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

// Financial transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  orderId: integer("order_id"),
  amount: integer("amount").notNull(), // Amount in cents
  type: text("type").notNull(), // 'sale', 'refund', 'expense'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
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

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
