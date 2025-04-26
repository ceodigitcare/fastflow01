import {
  businesses, Business, InsertBusiness,
  products, Product, InsertProduct,
  templates, Template, InsertTemplate,
  websites, Website, InsertWebsite,
  orders, Order, InsertOrder,
  transactions, Transaction, InsertTransaction,
  conversations, Conversation, InsertConversation
} from "@shared/schema";

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
  
  // Transaction methods
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByBusiness(businessId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByBusiness(businessId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation | undefined>;
}

export class MemStorage implements IStorage {
  private businesses: Map<number, Business>;
  private products: Map<number, Product>;
  private templates: Map<number, Template>;
  private websites: Map<number, Website>;
  private orders: Map<number, Order>;
  private transactions: Map<number, Transaction>;
  private conversations: Map<number, Conversation>;
  
  private businessId: number;
  private productId: number;
  private templateId: number;
  private websiteId: number;
  private orderId: number;
  private transactionId: number;
  private conversationId: number;
  
  constructor() {
    this.businesses = new Map();
    this.products = new Map();
    this.templates = new Map();
    this.websites = new Map();
    this.orders = new Map();
    this.transactions = new Map();
    this.conversations = new Map();
    
    this.businessId = 1;
    this.productId = 1;
    this.templateId = 1;
    this.websiteId = 1;
    this.orderId = 1;
    this.transactionId = 1;
    this.conversationId = 1;
    
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

export const storage = new MemStorage();
