import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import { z } from "zod";
import { pool, db } from "./db";
import { sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { 
  insertBusinessSchema, 
  insertProductSchema, 
  insertWebsiteSchema, 
  insertOrderSchema,
  insertTransactionSchema,
  insertConversationSchema,
  insertAccountCategorySchema,
  insertAccountSchema,
  insertTransferSchema,
  insertUserSchema,
  loginHistoryEntrySchema,
  insertPwaSettingsSchema,
  Business
} from "@shared/schema";
import { chatbotRouter } from "./chatbot";
import { setupAuth } from "./auth";
import { updateAccountBalance, getAccountsWithBalances, syncAllAccountBalances } from "./account-balance-sync";

// Setup PostgreSQL session store
const PgSessionStore = connectPg(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Static PWA Icon endpoints - must be registered first to avoid frontend routing conflicts
  app.get("/pwa-icon-192.png", async (req, res) => {
    try {
      const allSettings = await storage.getAllPwaSettings();
      const pwaSettings = allSettings[0] || null;
      
      if (!pwaSettings?.iconUrl || !pwaSettings.iconUrl.startsWith('data:')) {
        return res.redirect('/icon-192.png');
      }
      
      // Extract base64 data from data URL
      const matches = pwaSettings.iconUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) {
        return res.redirect('/icon-192.png');
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Set proper headers for PWA icon
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.end(buffer);
    } catch (error) {
      console.error("Error serving PWA icon 192:", error);
      res.redirect('/icon-192.png');
    }
  });

  app.get("/pwa-icon-512.png", async (req, res) => {
    try {
      const allSettings = await storage.getAllPwaSettings();
      const pwaSettings = allSettings[0] || null;
      
      if (!pwaSettings?.iconUrl || !pwaSettings.iconUrl.startsWith('data:')) {
        return res.redirect('/icon-512.png');
      }
      
      // Extract base64 data from data URL
      const matches = pwaSettings.iconUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) {
        return res.redirect('/icon-512.png');
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Set proper headers for PWA icon
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.end(buffer);
    } catch (error) {
      console.error("Error serving PWA icon 512:", error);
      res.redirect('/icon-512.png');
    }
  });

  // Setup authentication with Passport.js
  setupAuth(app);

  // Authentication middleware using Passport
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
  
  // Helper to get the authenticated business ID
  const getBusinessId = (req: Request): number => {
    if (!req.user) {
      throw new Error('User is not authenticated');
    }
    // Cast user to Business type since we know it's a Business instance from Passport authentication
    return (req.user as Business).id;
  };

  // Business routes
  app.get("/api/business", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const { password, ...businessWithoutPassword } = business;
      res.json(businessWithoutPassword);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.patch("/api/business", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const updatedBusiness = await storage.updateBusiness(businessId, req.body);
      
      if (!updatedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      const { password, ...businessWithoutPassword } = updatedBusiness;
      res.json(businessWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  // Product routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const products = await storage.getProductsByBusiness(businessId);
      res.json(products);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      
      // Create a custom validation schema for the product with proper type handling
      const productValidationSchema = z.object({
        name: z.string().min(2),
        description: z.string().min(10),
        price: z.number().min(0),
        businessId: z.number(),
        imageUrl: z.string().url().nullish(),
        inStock: z.boolean().optional().default(true),
        sku: z.string().optional().nullish(),
        category: z.string().optional().nullish(),
        inventory: z.number().min(0).optional().default(0),
        hasVariants: z.boolean().optional().default(false),
        variants: z.union([
          z.array(z.any()),  // Legacy array format
          z.object({         // New frontend format with groups and combinations
            groups: z.array(z.object({
              name: z.string(),
              values: z.array(z.string())
            })),
            combinations: z.array(z.object({
              options: z.array(z.object({
                group: z.string(),
                value: z.string()
              })),
              sku: z.string().optional(),
              price: z.number().optional(),
              inventory: z.number().default(0)
            }))
          })
        ]).optional().default([]),
        additionalImages: z.array(z.string()).optional().default([]),
        weight: z.string().optional().nullish(),
        dimensions: z.record(z.string(), z.any()).optional().default({}),
        tags: z.array(z.string()).optional().default([]),
        isFeatured: z.boolean().optional().default(false),
        isOnSale: z.boolean().optional().default(false),
        salePrice: z.number().min(0).optional().nullish()
      });
      
      // Ensure arrays and objects are properly parsed
      let body = {
        ...req.body,
        businessId,
        variants: req.body.variants ? JSON.parse(JSON.stringify(req.body.variants)) : [],
        additionalImages: req.body.additionalImages ? JSON.parse(JSON.stringify(req.body.additionalImages)) : [],
        dimensions: req.body.dimensions ? JSON.parse(JSON.stringify(req.body.dimensions)) : {},
        tags: Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? [req.body.tags] : []),
        weight: req.body.weight ? String(req.body.weight) : undefined,
        imageUrl: req.body.imageUrl || undefined  // Convert null/empty to undefined
      };
      
      // Auto-update inStock status based on inventory levels
      if (typeof body.inventory === 'number') {
        // If inventory is 0, automatically set inStock to false
        if (body.inventory <= 0) {
          body.inStock = false;
        }
        // If inventory is positive, automatically set inStock to true
        else if (body.inventory > 0) {
          body.inStock = true;
        }
      }
      
      const productData = productValidationSchema.parse(body);
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Create product error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.get("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this product" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.patch("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this product" });
      }
      
      // Validate update data
      const updateSchema = z.object({
        name: z.string().min(2).optional(),
        description: z.string().min(10).optional(),
        price: z.number().min(0).optional(),
        imageUrl: z.string().url().nullish(),
        inStock: z.boolean().optional(),
        sku: z.string().optional().nullish(),
        category: z.string().optional().nullish(),
        inventory: z.number().min(0).optional(),
        hasVariants: z.boolean().optional(),
        variants: z.union([
          z.array(z.any()),  // Legacy array format
          z.object({         // New frontend format with groups and combinations
            groups: z.array(z.object({
              name: z.string(),
              values: z.array(z.string())
            })),
            combinations: z.array(z.object({
              options: z.array(z.object({
                group: z.string(),
                value: z.string()
              })),
              sku: z.string().optional(),
              price: z.number().optional(),
              inventory: z.number().default(0)
            }))
          })
        ]).optional(),
        additionalImages: z.array(z.string()).optional(),
        weight: z.string().optional().nullish(),
        dimensions: z.record(z.string(), z.any()).optional(),
        tags: z.array(z.string()).optional(),
        isFeatured: z.boolean().optional(),
        isOnSale: z.boolean().optional(),
        salePrice: z.number().min(0).optional().nullish()
      });
      
      // Ensure arrays and objects are properly parsed
      // Prepare the request body
      let body = {
        ...req.body,
        variants: req.body.variants ? JSON.parse(JSON.stringify(req.body.variants)) : undefined,
        additionalImages: req.body.additionalImages ? JSON.parse(JSON.stringify(req.body.additionalImages)) : undefined,
        dimensions: req.body.dimensions ? JSON.parse(JSON.stringify(req.body.dimensions)) : undefined,
        tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : undefined,
        weight: req.body.weight ? String(req.body.weight) : undefined
      };
      
      // Auto-update inStock status based on inventory levels
      if (typeof body.inventory === 'number') {
        // If inventory is 0, automatically set inStock to false
        if (body.inventory <= 0) {
          body.inStock = false;
        }
        // If inventory is positive, automatically set inStock to true
        else if (body.inventory > 0) {
          body.inStock = true;
        }
      }
      
      const validatedData = updateSchema.parse(body);
      
      const updatedProduct = await storage.updateProduct(productId, validatedData);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Update product error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      if (product.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this product" });
      }
      
      await storage.deleteProduct(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Product Category routes
  app.get("/api/product-categories", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const categories = await storage.getProductCategoriesByBusiness(businessId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  app.post("/api/product-categories", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Invalid category name" });
      }
      
      // Check if category already exists
      const existingCategories = await storage.getProductCategoriesByBusiness(businessId);
      if (existingCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ message: "Category already exists" });
      }
      
      const newCategory = await storage.createProductCategory({
        businessId,
        name: name.trim(),
        isDefault: false
      });
      
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating product category:", error);
      res.status(500).json({ message: "Failed to create product category" });
    }
  });

  app.delete("/api/product-categories/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getProductCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this category" });
      }
      
      if (category.isDefault) {
        return res.status(403).json({ message: "Default categories cannot be deleted" });
      }
      
      // Check if there are products using this category
      const productsWithCategory = await storage.getProductsByCategory(categoryId);
      
      // If there are products using this category, reassign them to the default "Other" category
      if (productsWithCategory.length > 0) {
        // Find the default "Other" category
        const categories = await storage.getProductCategoriesByBusiness(businessId);
        const defaultCategory = categories.find(c => c.isDefault);
        
        if (!defaultCategory) {
          return res.status(500).json({ 
            message: "Default category not found. Cannot reassign products."
          });
        }
        
        // Reassign all products to the default category
        for (const product of productsWithCategory) {
          await storage.updateProduct(product.id, {
            categoryId: defaultCategory.id,
            category: defaultCategory.name
          });
        }
      }
      
      const result = await storage.deleteProductCategory(categoryId);
      
      if (result) {
        if (productsWithCategory.length > 0) {
          res.status(200).json({ 
            success: true, 
            message: `Category deleted and ${productsWithCategory.length} product(s) reassigned to 'Other' category`
          });
        } else {
          res.status(200).json({ success: true });
        }
      } else {
        res.status(500).json({ message: "Failed to delete category" });
      }
    } catch (error) {
      console.error("Error deleting product category:", error);
      res.status(500).json({ message: "Failed to delete product category" });
    }
  });

  // Template routes
  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getAllTemplates();
    res.json(templates);
  });

  app.get("/api/templates/:id", async (req, res) => {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }
    
    const template = await storage.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.json(template);
  });

  // Website routes
  app.get("/api/websites", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const websites = await storage.getWebsitesByBusiness(businessId);
      res.json(websites);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post("/api/websites", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const websiteData = insertWebsiteSchema.parse({
        ...req.body,
        businessId,
      });
      
      const website = await storage.createWebsite(websiteData);
      res.status(201).json(website);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create website" });
      }
    }
  });

  app.get("/api/websites/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const websiteId = parseInt(req.params.id);
      
      if (isNaN(websiteId)) {
        return res.status(400).json({ message: "Invalid website ID" });
      }
      
      const website = await storage.getWebsite(websiteId);
      
      if (!website) {
        return res.status(404).json({ message: "Website not found" });
      }
      
      if (website.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this website" });
      }
      
      res.json(website);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.patch("/api/websites/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const websiteId = parseInt(req.params.id);
      
      if (isNaN(websiteId)) {
        return res.status(400).json({ message: "Invalid website ID" });
      }
      
      const website = await storage.getWebsite(websiteId);
      
      if (!website) {
        return res.status(404).json({ message: "Website not found" });
      }
      
      if (website.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this website" });
      }
      
      const updatedWebsite = await storage.updateWebsite(websiteId, req.body);
      res.json(updatedWebsite);
    } catch (error) {
      res.status(500).json({ message: "Failed to update website" });
    }
  });

  // Order routes
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const orders = await storage.getOrdersByBusiness(businessId);
      res.json(orders);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const orderData = insertOrderSchema.parse({
        ...req.body,
        businessId,
      });
      
      const order = await storage.createOrder(orderData);
      
      // Find the sales revenue account category and account
      const salesCategories = await storage.getAccountCategoriesByType(businessId, "income");
      const salesCategory = salesCategories.find(c => c.name === "Sales Revenue");
      
      if (salesCategory) {
        // Find or create a Sales account
        let salesAccounts = await storage.getAccountsByCategory(salesCategory.id);
        let salesAccount = salesAccounts.find(a => a.name === "Online Sales");
        
        if (!salesAccount) {
          salesAccount = await storage.createAccount({
            businessId,
            categoryId: salesCategory.id,
            name: "Online Sales",
            description: "Revenue from online sales",
            initialBalance: 0,
            currentBalance: 0,
            isActive: true
          });
        }
        
        // Create a transaction for this order
        await storage.createTransaction({
          businessId,
          accountId: salesAccount.id,
          category: "Sales Revenue",
          orderId: order.id,
          amount: order.total,
          type: "income",
          date: new Date(),
          description: `Order #${order.id}`
        });
      }
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Order creation error:", error);
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this order" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Account Category routes
  app.get("/api/account-categories", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const categories = await storage.getAccountCategoriesByBusiness(businessId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching account categories:", error);
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post("/api/account-categories", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const categoryData = insertAccountCategorySchema.parse({
        ...req.body,
        businessId,
        isSystem: false,
      });
      
      const category = await storage.createAccountCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating account category:", error);
        res.status(500).json({ message: "Failed to create account category" });
      }
    }
  });

  app.patch("/api/account-categories/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getAccountCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this category" });
      }
      
      if (category.isSystem) {
        return res.status(403).json({ message: "System categories cannot be modified" });
      }
      
      const updatedCategory = await storage.updateAccountCategory(categoryId, req.body);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating account category:", error);
      res.status(500).json({ message: "Failed to update account category" });
    }
  });

  app.delete("/api/account-categories/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getAccountCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this category" });
      }
      
      if (category.isSystem) {
        return res.status(403).json({ message: "System categories cannot be deleted" });
      }
      
      // Check if there are any accounts using this category
      const accounts = await storage.getAccountsByCategory(categoryId);
      
      if (accounts.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete category that has accounts. Please delete or reassign accounts first."
        });
      }
      
      const result = await storage.deleteAccountCategory(categoryId);
      
      if (result) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete category" });
      }
    } catch (error) {
      console.error("Error deleting account category:", error);
      res.status(500).json({ message: "Failed to delete account category" });
    }
  });

  // Account routes
  app.get("/api/accounts", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      // Use the real-time balance calculation system
      const accounts = await getAccountsWithBalances(businessId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // Bulk sync all account balances (for admin/maintenance purposes)
  app.post("/api/accounts/sync-balances", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      await syncAllAccountBalances(businessId);
      res.json({ message: "All account balances synchronized successfully" });
    } catch (error) {
      console.error("Error syncing account balances:", error);
      res.status(500).json({ message: "Failed to sync account balances" });
    }
  });

  app.post("/api/accounts", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      console.log("SERVER - Received POST data:", req.body);
      console.log("SERVER - Initial balance value:", req.body.initialBalance, typeof req.body.initialBalance);
      
      const accountData = insertAccountSchema.parse({
        ...req.body,
        businessId,
        currentBalance: req.body.initialBalance || 0,
      });
      
      console.log("SERVER - Parsed account data:", accountData);
      const account = await storage.createAccount(accountData);
      console.log("SERVER - Created account:", account);
      
      // Immediately sync the account balance after creation
      await updateAccountBalance(account.id, businessId);
      
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating account:", error);
        res.status(500).json({ message: "Failed to create account" });
      }
    }
  });

  app.patch("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const account = await storage.getAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (account.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this account" });
      }
      
      const updatedAccount = await storage.updateAccount(accountId, req.body);
      
      // Sync account balance after update (especially important for initial balance changes)
      await updateAccountBalance(accountId, businessId);
      
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const accountId = parseInt(req.params.id);
      
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const account = await storage.getAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      if (account.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this account" });
      }
      
      // Check if there are any transactions using this account
      const transactions = await storage.getTransactionsByAccount(accountId);
      
      if (transactions.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete account that has transactions. Please delete transactions first or deactivate the account instead."
        });
      }
      
      const result = await storage.deleteAccount(accountId);
      
      if (result) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete account" });
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactions = await storage.getTransactionsByBusiness(businessId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      console.log("Transaction data received:", JSON.stringify(req.body, null, 2));
      
      try {
        // Ensure proper decimal precision for all monetary fields
        const bodyData = {
          ...req.body,
          amount: req.body.amount ? Number(Number(req.body.amount).toFixed(2)) : 0,
          paymentReceived: req.body.paymentReceived ? Number(Number(req.body.paymentReceived).toFixed(2)) : 0,
        };
        
        const transactionData = insertTransactionSchema.parse({
          ...bodyData,
          businessId,
        });
        console.log("Parsed transaction data:", JSON.stringify(transactionData, null, 2));
        
        const transaction = await storage.createTransaction(transactionData);
        
        // Automatically sync account balance after transaction creation
        if (transaction.accountId) {
          await updateAccountBalance(transaction.accountId, businessId);
        }
        
        res.status(201).json(transaction);
      } catch (parseError) {
        console.error("Schema validation error:", parseError);
        if (parseError instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid data", errors: parseError.errors });
        } else {
          throw parseError;
        }
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });
  
  app.put("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactionId = parseInt(req.params.id);
      
      // Verify the transaction exists and belongs to this business
      const existingTransaction = await storage.getTransaction(transactionId);
      if (!existingTransaction || existingTransaction.businessId !== businessId) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Update the transaction with new data
      console.log("Updating transaction with data:", JSON.stringify(req.body, null, 2));
      
      // Ensure date is properly formatted as a Date object for database compatibility
      let transactionData = { ...req.body };
      
      // Convert string date to Date object if needed
      if (typeof transactionData.date === 'string') {
        transactionData.date = new Date(transactionData.date);
      }
      
      // Handle items array - ensure all numeric values are properly formatted
      if (Array.isArray(transactionData.items)) {
        transactionData.items = transactionData.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0),
          discount: Number(item.discount || 0),
          amount: Number(item.amount)
        }));
      }
      
      const parsedData = {
        ...transactionData,
        businessId,
        id: transactionId,
        // Add any other required default values with proper decimal precision
        paymentReceived: transactionData.paymentReceived !== undefined ? Number(Number(transactionData.paymentReceived).toFixed(2)) : 0,
        amount: Number(Number(transactionData.amount).toFixed(2)),
        // Add the authenticated user ID for proper version history attribution
        updatedBy: req.user.id
      };
      
      // Parse the transaction data
      console.log("Parsed transaction data:", JSON.stringify(parsedData, null, 2));
      const updatedTransaction = await storage.updateTransaction(parsedData);
      
      if (updatedTransaction) {
        // Sync account balance after transaction update
        if (updatedTransaction.accountId) {
          await updateAccountBalance(updatedTransaction.accountId, businessId);
        }
        // Also sync the previous account if it was changed
        if (existingTransaction.accountId !== updatedTransaction.accountId) {
          await updateAccountBalance(existingTransaction.accountId, businessId);
        }
        
        res.status(200).json(updatedTransaction);
      } else {
        res.status(500).json({ message: "Failed to update transaction" });
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction: " + (error instanceof Error ? error.message : String(error)) });
    }
  });
  
  // This is for compatibility with older code - redirect to PUT
  app.patch("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactionId = parseInt(req.params.id);
      
      if (isNaN(transactionId)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this transaction" });
      }
      
      // Ensure date is properly handled
      let transactionData = { ...req.body };
      
      // Convert string date to Date object if needed
      if (typeof transactionData.date === 'string') {
        transactionData.date = new Date(transactionData.date);
      }
      
      // Handle items array - ensure all numeric values are properly formatted
      if (Array.isArray(transactionData.items)) {
        transactionData.items = transactionData.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0),
          discount: Number(item.discount || 0),
          amount: Number(item.amount)
        }));
      }
      
      // Combine the ID with the request body to create a complete transaction object
      const updatedTransaction = await storage.updateTransaction({
        ...transactionData,
        businessId,
        id: transactionId,
        paymentReceived: transactionData.paymentReceived !== undefined ? Number(transactionData.paymentReceived) : 0,
        amount: Number(transactionData.amount),
        // Add the authenticated user ID for proper version history attribution
        updatedBy: req.user.id
      });
      
      if (updatedTransaction) {
        res.json(updatedTransaction);
      } else {
        res.status(500).json({ message: "Failed to update transaction" });
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactionId = parseInt(req.params.id);
      
      if (isNaN(transactionId)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this transaction" });
      }
      
      const result = await storage.deleteTransaction(transactionId);
      
      if (result) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete transaction" });
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });
  
  // Transfer routes
  app.post("/api/transfers", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transferData = insertTransferSchema.parse({
        ...req.body,
        businessId,
      });
      
      const transfer = await storage.createTransfer(transferData);
      res.status(201).json(transfer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating transfer:", error);
        res.status(500).json({ message: "Failed to create transfer" });
      }
    }
  });

  // Conversation routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const conversations = await storage.getConversationsByBusiness(businessId);
      res.json(conversations);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        businessId,
      });
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create conversation" });
      }
    }
  });

  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this conversation" });
      }
      
      const updatedConversation = await storage.updateConversation(conversationId, req.body);
      res.json(updatedConversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  // Register chatbot router for Gemini AI integration
  // User Management Routes (Customer, Vendor, Employee) for Finances section
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const users = await storage.getUsersByBusiness(businessId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:type", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const type = req.params.type;
      
      // Validate type
      if (!['customer', 'vendor', 'employee'].includes(type.toLowerCase())) {
        return res.status(400).json({ message: "Invalid user type. Must be 'customer', 'vendor', or 'employee'" });
      }
      
      const users = await storage.getUsersByType(businessId, type.toLowerCase());
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users by type" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      
      // Validate user data
      const userSchema = insertUserSchema.extend({
        type: z.enum(['customer', 'vendor', 'employee']),
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        // Make password optional for invitation-based accounts
        password: z.string().min(6).optional()
      });
      
      const userData = userSchema.parse({
        ...req.body,
        businessId,
        // For employees, we'll use business contact info
        // For customers and vendors, we'll use their provided info
        isActive: true
      });
      
      // If password isn't provided, generate a random one
      if (!userData.password) {
        userData.password = Math.random().toString(36).substring(2, 10);
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Create user error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.get("/api/users/detail/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this user" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this user" });
      }
      
      // Validate update data
      const updateSchema = z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        profileImageUrl: z.string().url().optional().nullable(),
        isActive: z.boolean().optional(),
        type: z.enum(['customer', 'vendor', 'employee']).optional()
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this user" });
      }
      
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/users/:id/invitation", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this user" });
      }
      
      // Generate a new invitation token
      const token = await storage.generateInvitationToken(userId);
      
      // Generate the invitation URL
      const invitationUrl = `${req.protocol}://${req.get('host')}/register/invite/${token}`;
      
      res.json({ token, invitationUrl });
    } catch (error) {
      console.error("Generate invitation error:", error);
      res.status(500).json({ message: "Failed to generate invitation" });
    }
  });

  app.post("/api/users/:id/login-history", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this user" });
      }
      
      // Validate login history entry
      const loginEntry = loginHistoryEntrySchema.parse(req.body);
      
      // Add login history entry
      const updatedUser = await storage.addLoginHistory(userId, loginEntry);
      res.json(updatedUser);
    } catch (error) {
      console.error("Add login history error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add login history" });
      }
    }
  });

  // Balance update endpoint for user financial relationship management
  app.post("/api/users/:id/balance", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this user" });
      }
      
      // Validate balance update data
      const balanceUpdateSchema = z.object({
        amount: z.number().min(1, "Amount must be at least 1"),
        type: z.enum(['add', 'deduct']),
        note: z.string().optional()
      });
      
      const { amount, type, note } = balanceUpdateSchema.parse(req.body);
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(userId, amount, type, note);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user balance" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Balance update error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update balance" });
      }
    }
  });

  app.use("/api/chatbot", chatbotRouter);

  // Transaction version history routes
  // Get all versions for a transaction
  app.get("/api/transactions/:id/versions", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactionId = parseInt(req.params.id);
      
      if (isNaN(transactionId)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      // Check if transaction exists and belongs to the business
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this transaction" });
      }
      
      // Get all versions for this transaction
      const versions = await storage.getTransactionVersions(transactionId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching transaction versions:", error);
      res.status(500).json({ message: "Failed to fetch transaction versions" });
    }
  });
  
  // Get specific version of a transaction
  app.get("/api/transactions/:id/versions/:versionId", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactionId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      
      if (isNaN(transactionId) || isNaN(versionId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }
      
      // Check if transaction exists and belongs to the business
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this transaction" });
      }
      
      // Get specific version
      const version = await storage.getTransactionVersion(versionId);
      
      if (!version || version.transactionId !== transactionId) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      res.json(version);
    } catch (error) {
      console.error("Error fetching transaction version:", error);
      res.status(500).json({ message: "Failed to fetch transaction version" });
    }
  });
  
  // Restore a specific version
  app.post("/api/transactions/:id/versions/:versionId/restore", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactionId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      
      if (isNaN(transactionId) || isNaN(versionId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }
      
      // Check if transaction exists and belongs to the business
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this transaction" });
      }
      
      // Get version to restore
      const versionToRestore = await storage.getTransactionVersion(versionId);
      
      if (!versionToRestore || versionToRestore.transactionId !== transactionId) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      // Use our SQL function to directly restore the transaction
      // This avoids issues with JSON/date conversions
      const [result] = await db.execute(sql`
        SELECT restore_transaction_version(${transactionId}, ${versionId}, ${req.user.id}) as result;
      `);
      
      if (result && result.result) {
        // Get the freshly restored transaction from database
        const restoredTransaction = await storage.getTransaction(transactionId);
        res.json(restoredTransaction);
      } else {
        throw new Error("Restore operation failed");
      }
    } catch (error) {
      console.error("Error restoring transaction version:", error);
      res.status(500).json({ message: "Failed to restore transaction version" });
    }
  });
  
  // Mark version as important
  app.patch("/api/transactions/:id/versions/:versionId/important", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const transactionId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      const { important } = req.body;
      
      if (isNaN(transactionId) || isNaN(versionId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }
      
      if (typeof important !== 'boolean') {
        return res.status(400).json({ message: "Important flag must be a boolean" });
      }
      
      // Check if transaction exists and belongs to the business
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.businessId !== businessId) {
        return res.status(403).json({ message: "Unauthorized access to this transaction" });
      }
      
      // Get version to mark as important
      const version = await storage.getTransactionVersion(versionId);
      
      if (!version || version.transactionId !== transactionId) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      // Update version importance
      await storage.updateVersionImportance(versionId, important);
      
      res.json({ message: `Version marked as ${important ? 'important' : 'not important'}` });
    } catch (error) {
      console.error("Error updating version importance:", error);
      res.status(500).json({ message: "Failed to update version importance" });
    }
  });

  // PWA Settings routes
  app.get("/api/pwa-settings", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const settings = await storage.getPwaSettings(businessId);
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching PWA settings:", error);
      res.status(500).json({ message: "Failed to fetch PWA settings" });
    }
  });

  app.post("/api/pwa-settings", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const validatedData = insertPwaSettingsSchema.parse({ ...req.body, businessId });
      
      // Check if settings already exist
      const existingSettings = await storage.getPwaSettings(businessId);
      if (existingSettings) {
        return res.status(400).json({ message: "PWA settings already exist. Use PATCH to update." });
      }
      
      const settings = await storage.createPwaSettings(validatedData);
      res.status(201).json(settings);
    } catch (error) {
      console.error("Error creating PWA settings:", error);
      res.status(500).json({ message: "Failed to create PWA settings" });
    }
  });

  app.patch("/api/pwa-settings", requireAuth, async (req, res) => {
    try {
      const businessId = getBusinessId(req);
      const settings = await storage.updatePwaSettings(businessId, req.body);
      if (settings) {
        res.json(settings);
      } else {
        res.status(404).json({ message: "PWA settings not found" });
      }
    } catch (error) {
      console.error("Error updating PWA settings:", error);
      res.status(500).json({ message: "Failed to update PWA settings" });
    }
  });

  // Generate manifest.json dynamically from PWA settings
  app.get("/manifest.json", async (req, res) => {
    try {
      // Get PWA settings from the first available business
      let pwaSettings = null;
      
      try {
        const allSettings = await storage.getAllPwaSettings();
        pwaSettings = allSettings[0] || null;
      } catch (error) {
        console.log("No PWA settings found, using defaults");
      }

      // Create proper icon array with enhanced cache-busting
      const icons = [];
      const cacheVersion = pwaSettings?.updatedAt ? new Date(pwaSettings.updatedAt).getTime() : Date.now();
      
      if (pwaSettings?.iconUrl && 
          !pwaSettings.iconUrl.startsWith('blob:') && 
          (pwaSettings.iconUrl.startsWith('data:') || pwaSettings.iconUrl.startsWith('http'))) {
        
        if (pwaSettings.iconUrl.startsWith('data:')) {
          // For data URLs, serve as static files with cache-busting
          icons.push(
            {
              src: `/pwa-icon-192.png?v=${cacheVersion}`,
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: `/pwa-icon-512.png?v=${cacheVersion}`,
              sizes: "512x512", 
              type: "image/png",
              purpose: "any"
            },
            {
              src: `/pwa-icon-192.png?v=${cacheVersion}`,
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable"
            }
          );
        } else {
          // For HTTP URLs, use directly with cache-busting
          icons.push(
            {
              src: `${pwaSettings.iconUrl}?v=${cacheVersion}`,
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: `${pwaSettings.iconUrl}?v=${cacheVersion}`,
              sizes: "512x512", 
              type: "image/png",
              purpose: "any"
            }
          );
        }
      } else {
        // Use default fallback icons with cache-busting
        icons.push(
          {
            src: `/icon-192.png?v=${cacheVersion}`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: `/icon-512.png?v=${cacheVersion}`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        );
      }

      const manifest = {
        name: pwaSettings?.appName || "Business Manager",
        short_name: pwaSettings?.shortName || "BizManager",
        description: "Comprehensive business management platform",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: pwaSettings?.backgroundColor || "#ffffff",
        theme_color: pwaSettings?.themeColor || "#000000",
        categories: ["business", "finance", "productivity"],
        prefer_related_applications: false,
        lang: "en",
        icons
      };
      
      res.setHeader("Content-Type", "application/manifest+json");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.json(manifest);
    } catch (error) {
      console.error("Error generating manifest:", error);
      res.status(500).json({ message: "Failed to generate manifest" });
    }
  });



  // Dynamic PWA Icon endpoint for serving base64 icons (legacy support)
  app.get("/api/pwa-icon", async (req, res) => {
    try {
      const size = req.query.size || "512";
      const allSettings = await storage.getAllPwaSettings();
      const pwaSettings = allSettings[0] || null;
      
      if (!pwaSettings?.iconUrl || !pwaSettings.iconUrl.startsWith('data:')) {
        return res.status(404).json({ message: "Icon not found" });
      }
      
      // Extract base64 data from data URL
      const matches = pwaSettings.iconUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ message: "Invalid icon format" });
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Set proper headers for PWA icon caching
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.end(buffer);
    } catch (error) {
      console.error("Error serving PWA icon:", error);
      res.status(500).json({ message: "Failed to serve icon" });
    }
  });

  // Default PWA Icons
  app.get("/icon-192.png", (req, res) => {
    // Create a simple SVG icon and convert to PNG format
    const svg = `
      <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="192" height="192" rx="24" fill="url(#gradient)"/>
        <rect x="48" y="48" width="96" height="96" rx="12" fill="white" opacity="0.9"/>
        <rect x="64" y="64" width="16" height="64" fill="#4F46E5"/>
        <rect x="80" y="80" width="16" height="48" fill="#7C3AED"/>
        <rect x="96" y="72" width="16" height="56" fill="#4F46E5"/>
        <rect x="112" y="88" width="16" height="40" fill="#7C3AED"/>
      </svg>
    `;
    
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  });

  app.get("/icon-512.png", (req, res) => {
    // Create a larger version of the same icon
    const svg = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="64" fill="url(#gradient)"/>
        <rect x="128" y="128" width="256" height="256" rx="32" fill="white" opacity="0.9"/>
        <rect x="172" y="172" width="42" height="168" fill="#4F46E5"/>
        <rect x="214" y="214" width="42" height="126" fill="#7C3AED"/>
        <rect x="256" y="192" width="42" height="148" fill="#4F46E5"/>
        <rect x="298" y="234" width="42" height="106" fill="#7C3AED"/>
      </svg>
    `;
    
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  });

  // Service Worker with dynamic versioning
  app.get("/sw.js", async (req, res) => {
    // Get latest PWA settings to determine cache version
    let cacheVersion = 'v1';
    try {
      const allSettings = await storage.getAllPwaSettings();
      const pwaSettings = allSettings[0] || null;
      if (pwaSettings?.updatedAt) {
        cacheVersion = `v${new Date(pwaSettings.updatedAt).getTime()}`;
      }
    } catch (error) {
      // Use default version if no settings found
    }

    const swContent = `
// Service worker for PWA functionality with dynamic cache versioning
const CACHE_NAME = 'business-manager-${cacheVersion}';
const DYNAMIC_CACHE_NAME = 'business-manager-dynamic-${cacheVersion}';

// URLs that should always bypass cache (PWA-related resources)
const BYPASS_CACHE_URLS = ['/manifest.json', '/api/pwa-settings'];

// Install event - cache essential resources
self.addEventListener('install', function(event) {
  console.log('Service Worker installing with cache version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        // Cache basic resources, but let manifest be fetched fresh
        return cache.addAll(['/']);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  const shouldBypassCache = BYPASS_CACHE_URLS.some(bypassUrl => url.pathname.includes(bypassUrl));
  
  if (shouldBypassCache) {
    // Always fetch fresh for PWA-related resources
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Normal caching strategy for other resources
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // If we got a successful response, cache it
        if (response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(function() {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});

// Listen for messages from the main thread to clear cache
self.addEventListener('message', function(event) {
  if (event.data.action === 'CLEAR_PWA_CACHE') {
    console.log('Clearing PWA-related cache...');
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName.includes('business-manager')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      event.ports[0].postMessage({success: true});
    });
  }
});
`;
    
    res.setHeader("Content-Type", "application/javascript");
    res.send(swContent);
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
