import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import session from "express-session";
import { z } from "zod";
import { pool } from "./db";
import connectPg from "connect-pg-simple";
import { 
  insertBusinessSchema, 
  insertProductSchema, 
  insertWebsiteSchema, 
  insertOrderSchema,
  insertTransactionSchema,
  insertConversationSchema 
} from "@shared/schema";
import { chatbotRouter } from "./chatbot";
import { authenticateUser } from "./auth";

// Extend express-session to include businessId
declare module "express-session" {
  interface SessionData {
    businessId?: number;
  }
}

// Setup PostgreSQL session store
const PgSessionStore = connectPg(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup sessions
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new PgSessionStore({
        pool,
        createTableIfMissing: true
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "storefrontsecret",
    })
  );

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.businessId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const businessData = insertBusinessSchema.parse(req.body);
      
      // Check if username already exists
      const existingBusiness = await storage.getBusinessByUsername(businessData.username);
      if (existingBusiness) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the business account
      const business = await storage.createBusiness(businessData);
      
      // Set session
      req.session.businessId = business.id;
      
      // Return the user without password
      const { password, ...businessWithoutPassword } = business;
      res.status(201).json(businessWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to register" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = authenticateUser.parse(req.body);
      const business = await storage.getBusinessByUsername(username);
      
      if (!business || business.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set session
      req.session.businessId = business.id;
      
      // Return the user without password
      const { password: _, ...businessWithoutPassword } = business;
      res.json(businessWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to login" });
      }
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.businessId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const business = await storage.getBusiness(req.session.businessId);
    if (!business) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Business not found" });
    }
    
    const { password, ...businessWithoutPassword } = business;
    res.json(businessWithoutPassword);
  });

  // Business routes
  app.get("/api/business", requireAuth, async (req, res) => {
    const business = await storage.getBusiness(req.session.businessId as number);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    
    const { password, ...businessWithoutPassword } = business;
    res.json(businessWithoutPassword);
  });

  app.patch("/api/business", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
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
    const businessId = req.session.businessId as number;
    const products = await storage.getProductsByBusiness(businessId);
    res.json(products);
  });

  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
      
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
        variants: z.array(z.any()).optional().default([]),
        additionalImages: z.array(z.string()).optional().default([]),
        weight: z.union([z.number(), z.string()]).optional().nullish(),
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
        tags: Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? [req.body.tags] : [])
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
    const businessId = req.session.businessId as number;
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
  });

  app.patch("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
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
        variants: z.array(z.any()).optional(),
        additionalImages: z.array(z.string()).optional(),
        weight: z.union([z.number(), z.string()]).optional().nullish(),
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
        tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : undefined
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
      const businessId = req.session.businessId as number;
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
    const businessId = req.session.businessId as number;
    const websites = await storage.getWebsitesByBusiness(businessId);
    res.json(websites);
  });

  app.post("/api/websites", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
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
    const businessId = req.session.businessId as number;
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
  });

  app.patch("/api/websites/:id", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
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
    const businessId = req.session.businessId as number;
    const orders = await storage.getOrdersByBusiness(businessId);
    res.json(orders);
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
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
          category: "income",
          orderId: order.id,
          amount: order.total,
          type: "income",
          date: new Date(),
          description: `Order #${order.id}`,
          status: "completed"
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
      const businessId = req.session.businessId as number;
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

  // Transaction routes
  app.get("/api/transactions", requireAuth, async (req, res) => {
    const businessId = req.session.businessId as number;
    const transactions = await storage.getTransactionsByBusiness(businessId);
    res.json(transactions);
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        businessId,
      });
      
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create transaction" });
      }
    }
  });

  // Conversation routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    const businessId = req.session.businessId as number;
    const conversations = await storage.getConversationsByBusiness(businessId);
    res.json(conversations);
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const businessId = req.session.businessId as number;
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
      const businessId = req.session.businessId as number;
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
  app.use("/api/chatbot", chatbotRouter);

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
