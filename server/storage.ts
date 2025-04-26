import {
  businesses, Business, InsertBusiness,
  products, Product, InsertProduct,
  templates, Template, InsertTemplate,
  websites, Website, InsertWebsite,
  orders, Order, InsertOrder,
  transactions, Transaction, InsertTransaction,
  conversations, Conversation, InsertConversation,
  accountCategories, AccountCategory, InsertAccountCategory,
  accounts, Account, InsertAccount,
  transfers, Transfer, InsertTransfer
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc } from "drizzle-orm";

export interface IStorage {
  // Business methods
  getBusiness(id: number): Promise<Business | undefined>;
  getBusinessByUsername(username: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: number, data: Partial<Business>): Promise<Business | undefined>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByBusiness(businessId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Template methods
  getTemplate(id: number): Promise<Template | undefined>;
  getAllTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  
  // Website methods
  getWebsite(id: number): Promise<Website | undefined>;
  getWebsitesByBusiness(businessId: number): Promise<Website[]>;
  createWebsite(website: InsertWebsite): Promise<Website>;
  updateWebsite(id: number, data: Partial<Website>): Promise<Website | undefined>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByBusiness(businessId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  
  // Account Category methods
  getAccountCategory(id: number): Promise<AccountCategory | undefined>;
  getAccountCategoriesByBusiness(businessId: number): Promise<AccountCategory[]>;
  getAccountCategoriesByType(businessId: number, type: string): Promise<AccountCategory[]>;
  createAccountCategory(category: InsertAccountCategory): Promise<AccountCategory>;
  updateAccountCategory(id: number, data: Partial<AccountCategory>): Promise<AccountCategory | undefined>;
  deleteAccountCategory(id: number): Promise<boolean>;
  
  // Account methods
  getAccount(id: number): Promise<Account | undefined>;
  getAccountsByBusiness(businessId: number): Promise<Account[]>;
  getAccountsByCategory(categoryId: number): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, data: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  
  // Transaction methods
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByBusiness(businessId: number): Promise<Transaction[]>;
  getTransactionsByAccount(accountId: number): Promise<Transaction[]>;
  getTransactionsByDateRange(businessId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Transfer methods
  getTransfer(id: number): Promise<Transfer | undefined>;
  getTransfersByBusiness(businessId: number): Promise<Transfer[]>;
  getTransfersByAccount(accountId: number): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByBusiness(businessId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation | undefined>;
  
  // Financial Reports methods
  getCashFlow(businessId: number, startDate: Date, endDate: Date): Promise<any>;
  getProfitAndLoss(businessId: number, startDate: Date, endDate: Date): Promise<any>;
  getBalanceSheet(businessId: number, asOfDate: Date): Promise<any>;
}

export class MemStorage implements IStorage {
  private businesses: Map<number, Business>;
  private products: Map<number, Product>;
  private templates: Map<number, Template>;
  private websites: Map<number, Website>;
  private orders: Map<number, Order>;
  private transactions: Map<number, Transaction>;
  private conversations: Map<number, Conversation>;
  private accountCategories: Map<number, AccountCategory>;
  private accounts: Map<number, Account>;
  private transfers: Map<number, Transfer>;
  
  private businessId: number;
  private productId: number;
  private templateId: number;
  private websiteId: number;
  private orderId: number;
  private transactionId: number;
  private conversationId: number;
  private accountCategoryId: number;
  private accountId: number;
  private transferId: number;
  
  constructor() {
    this.businesses = new Map();
    this.products = new Map();
    this.templates = new Map();
    this.websites = new Map();
    this.orders = new Map();
    this.transactions = new Map();
    this.conversations = new Map();
    this.accountCategories = new Map();
    this.accounts = new Map();
    this.transfers = new Map();
    
    this.businessId = 1;
    this.productId = 1;
    this.templateId = 1;
    this.websiteId = 1;
    this.orderId = 1;
    this.transactionId = 1;
    this.conversationId = 1;
    this.accountCategoryId = 1;
    this.accountId = 1;
    this.transferId = 1;
    
    // Initialize with some template data
    this.initializeTemplates();
  }
  
  private initializeTemplates() {
    const initialTemplates: InsertTemplate[] = [
      {
        name: "Modern Shop",
        description: "Clean, minimal design for fashion and accessories",
        previewUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "fashion",
        isPopular: true,
      },
      {
        name: "Food & Grocery",
        description: "Perfect for food delivery and grocery stores",
        previewUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "food",
        isPopular: false,
      },
      {
        name: "Digital Products",
        description: "Optimized for selling digital downloads and services",
        previewUrl: "https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "digital",
        isPopular: false,
      },
      {
        name: "Handmade Crafts",
        description: "Showcase your handmade products with this artistic template",
        previewUrl: "https://images.unsplash.com/photo-1560421683-6856ea585c78?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "handmade",
        isPopular: false,
      },
      {
        name: "Electronics",
        description: "Technical specifications and sleek design for electronic products",
        previewUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "electronics",
        isPopular: true,
      }
    ];
    
    initialTemplates.forEach(template => {
      this.createTemplate(template);
    });
  }
  
  // Initialize default account categories for a business
  private async initializeAccountCategories(businessId: number) {
    const defaultCategories: InsertAccountCategory[] = [
      // Asset categories
      { businessId, name: "Cash & Bank", type: "asset", description: "Cash and bank accounts", isSystem: true },
      { businessId, name: "Accounts Receivable", type: "asset", description: "Money owed to the business", isSystem: true },
      { businessId, name: "Inventory", type: "asset", description: "Products held for sale", isSystem: true },
      { businessId, name: "Fixed Assets", type: "asset", description: "Long-term tangible property", isSystem: true },
      
      // Liability categories
      { businessId, name: "Accounts Payable", type: "liability", description: "Money owed by the business", isSystem: true },
      { businessId, name: "Credit Cards", type: "liability", description: "Credit card balances", isSystem: true },
      { businessId, name: "Loans", type: "liability", description: "Long-term debt", isSystem: true },
      
      // Equity categories
      { businessId, name: "Owner's Equity", type: "equity", description: "Owner's investment in the business", isSystem: true },
      { businessId, name: "Retained Earnings", type: "equity", description: "Accumulated profits", isSystem: true },
      
      // Income categories
      { businessId, name: "Sales Revenue", type: "income", description: "Income from product sales", isSystem: true },
      { businessId, name: "Service Revenue", type: "income", description: "Income from services", isSystem: true },
      { businessId, name: "Other Income", type: "income", description: "Miscellaneous income", isSystem: true },
      
      // Expense categories
      { businessId, name: "Cost of Goods Sold", type: "expense", description: "Direct costs of products sold", isSystem: true },
      { businessId, name: "Advertising & Marketing", type: "expense", description: "Promotional expenses", isSystem: true },
      { businessId, name: "Rent & Utilities", type: "expense", description: "Office and facility costs", isSystem: true },
      { businessId, name: "Salaries & Wages", type: "expense", description: "Employee compensation", isSystem: true },
      { businessId, name: "Office Supplies", type: "expense", description: "Consumable office items", isSystem: true },
      { businessId, name: "Professional Services", type: "expense", description: "Legal, accounting, etc.", isSystem: true },
      { businessId, name: "Travel", type: "expense", description: "Business travel expenses", isSystem: true },
      { businessId, name: "Taxes", type: "expense", description: "Business taxes", isSystem: true },
      { businessId, name: "Other Expenses", type: "expense", description: "Miscellaneous expenses", isSystem: true },
    ];
    
    for (const category of defaultCategories) {
      await this.createAccountCategory(category);
    }
    
    // Create a default Cash account
    const cashCategory = await this.getAccountCategoriesByType(businessId, "asset")
      .then(categories => categories.find(c => c.name === "Cash & Bank"));
    
    if (cashCategory) {
      await this.createAccount({
        businessId,
        categoryId: cashCategory.id,
        name: "Primary Bank Account",
        description: "Main operating account",
        initialBalance: 0,
        currentBalance: 0,
        isActive: true
      });
    }
  }

  // Business methods
  async getBusiness(id: number): Promise<Business | undefined> {
    return this.businesses.get(id);
  }
  
  async getBusinessByUsername(username: string): Promise<Business | undefined> {
    return Array.from(this.businesses.values()).find(
      (business) => business.username === username
    );
  }
  
  async createBusiness(business: InsertBusiness): Promise<Business> {
    const id = this.businessId++;
    const now = new Date();
    const newBusiness: Business = { 
      ...business, 
      id,
      createdAt: now,
    };
    this.businesses.set(id, newBusiness);
    return newBusiness;
  }
  
  async updateBusiness(id: number, data: Partial<Business>): Promise<Business | undefined> {
    const business = await this.getBusiness(id);
    if (!business) return undefined;
    
    const updatedBusiness = { ...business, ...data };
    this.businesses.set(id, updatedBusiness);
    return updatedBusiness;
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProductsByBusiness(businessId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.businessId === businessId
    );
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productId++;
    const now = new Date();
    const newProduct: Product = { 
      ...product, 
      id,
      createdAt: now,
    };
    this.products.set(id, newProduct);
    return newProduct;
  }
  
  async updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...data };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }
  
  // Template methods
  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }
  
  async getAllTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }
  
  async createTemplate(template: InsertTemplate): Promise<Template> {
    const id = this.templateId++;
    const newTemplate: Template = { ...template, id };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }
  
  // Website methods
  async getWebsite(id: number): Promise<Website | undefined> {
    return this.websites.get(id);
  }
  
  async getWebsitesByBusiness(businessId: number): Promise<Website[]> {
    return Array.from(this.websites.values()).filter(
      (website) => website.businessId === businessId
    );
  }
  
  async createWebsite(website: InsertWebsite): Promise<Website> {
    const id = this.websiteId++;
    const now = new Date();
    const newWebsite: Website = { 
      ...website, 
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.websites.set(id, newWebsite);
    return newWebsite;
  }
  
  async updateWebsite(id: number, data: Partial<Website>): Promise<Website | undefined> {
    const website = await this.getWebsite(id);
    if (!website) return undefined;
    
    const updatedWebsite = { 
      ...website, 
      ...data,
      updatedAt: new Date(),
    };
    this.websites.set(id, updatedWebsite);
    return updatedWebsite;
  }
  
  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getOrdersByBusiness(businessId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter((order) => order.businessId === businessId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderId++;
    const now = new Date();
    const newOrder: Order = { 
      ...order, 
      id,
      createdAt: now,
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async getTransactionsByBusiness(businessId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.businessId === businessId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    const now = new Date();
    const newTransaction: Transaction = { 
      ...transaction, 
      id,
      createdAt: now,
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async getConversationsByBusiness(businessId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((conversation) => conversation.businessId === businessId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationId++;
    const now = new Date();
    const newConversation: Conversation = { 
      ...conversation, 
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }
  
  async updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = await this.getConversation(id);
    if (!conversation) return undefined;
    
    const updatedConversation = { 
      ...conversation, 
      ...data,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
}

export class DatabaseStorage implements IStorage {
  async getBusiness(id: number): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async getBusinessByUsername(username: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.username, username));
    return business || undefined;
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const [business] = await db
      .insert(businesses)
      .values(insertBusiness)
      .returning();
    return business;
  }

  async updateBusiness(id: number, data: Partial<Business>): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set(data)
      .where(eq(businesses.id, id))
      .returning();
    return business || undefined;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductsByBusiness(businessId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.businessId, businessId));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    return result.length > 0;
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db
      .insert(templates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async getWebsite(id: number): Promise<Website | undefined> {
    const [website] = await db.select().from(websites).where(eq(websites.id, id));
    return website || undefined;
  }

  async getWebsitesByBusiness(businessId: number): Promise<Website[]> {
    return await db
      .select()
      .from(websites)
      .where(eq(websites.businessId, businessId));
  }

  async createWebsite(insertWebsite: InsertWebsite): Promise<Website> {
    const [website] = await db
      .insert(websites)
      .values(insertWebsite)
      .returning();
    return website;
  }

  async updateWebsite(id: number, data: Partial<Website>): Promise<Website | undefined> {
    const [website] = await db
      .update(websites)
      .set(data)
      .where(eq(websites.id, id))
      .returning();
    return website || undefined;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByBusiness(businessId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.businessId, businessId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(insertOrder)
      .returning();
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByBusiness(businessId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.businessId, businessId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationsByBusiness(businessId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.businessId, businessId))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(data)
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }
}

// Initialize templates when creating database storage for the first time
async function initializeTemplates(storage: DatabaseStorage) {
  const templates = await storage.getAllTemplates();
  if (templates.length === 0) {
    const initialTemplates: InsertTemplate[] = [
      {
        name: "Modern Shop",
        description: "Clean, minimal design for fashion and accessories",
        previewUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "fashion",
        isPopular: true,
      },
      {
        name: "Food & Grocery",
        description: "Perfect for food delivery and grocery stores",
        previewUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "food",
        isPopular: false,
      },
      {
        name: "Digital Products",
        description: "Optimized for selling digital downloads and services",
        previewUrl: "https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "digital",
        isPopular: false,
      },
      {
        name: "Handmade Crafts",
        description: "Showcase your handmade products with this artistic template",
        previewUrl: "https://images.unsplash.com/photo-1560421683-6856ea585c78?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "handmade",
        isPopular: false,
      },
      {
        name: "Electronics",
        description: "Technical specifications and sleek design for electronic products",
        previewUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "electronics",
        isPopular: true,
      }
    ];
    
    for (const template of initialTemplates) {
      await storage.createTemplate(template);
    }
  }
}

export const storage = new DatabaseStorage();

// Initialize the database
(async () => {
  try {
    await initializeTemplates(storage);
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
})();
