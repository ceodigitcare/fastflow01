import { storage } from "./storage";
import { db } from "./db";
import { businesses, accountCategories, accounts, products } from "@shared/schema";
import { hashPassword } from "./auth";
import { sql } from "drizzle-orm";

async function seedDatabase() {
  console.log("Starting database seeding...");
  
  // Force database initialization to make sure all tables exist
  await db.execute('SELECT 1');
  
  // 1. Create demo business account
  const hashedPassword = await hashPassword("password123");
  
  let demoBusiness;
  const existingBusiness = await storage.getBusinessByUsername("demo");
  
  if (!existingBusiness) {
    demoBusiness = await storage.createBusiness({
      name: "Demo Business",
      username: "demo",
      password: hashedPassword,
      email: "demo@example.com",
      logoUrl: "https://via.placeholder.com/150",
      chatbotSettings: {}
    });
    console.log(`Created demo business: ${demoBusiness.name} (ID: ${demoBusiness.id})`);
  } else {
    // Update existing business to make sure password is hashed
    const updatedBusiness = await storage.updateBusiness(existingBusiness.id, {
      password: hashedPassword
    });
    demoBusiness = updatedBusiness || existingBusiness;
    console.log(`Using existing demo business: ${demoBusiness.name} (ID: ${demoBusiness.id})`);
  }
  
  const businessId = demoBusiness.id;
  
  // 2. Create comprehensive e-commerce account categories if they don't exist
  const existingCategories = await storage.getAccountCategoriesByBusiness(businessId);
  
  if (existingCategories.length === 0) {
    // ASSET CATEGORIES (System-tagged, non-deletable)
    const cashBankCategory = await storage.createAccountCategory({
      businessId,
      name: "Cash & Bank",
      type: "asset",
      description: "Cash on hand and bank accounts",
      isSystem: true
    });
    
    const inventoryCategory = await storage.createAccountCategory({
      businessId,
      name: "Inventory", 
      type: "asset",
      description: "Products held for sale",
      isSystem: true
    });
    
    const receivablesCategory = await storage.createAccountCategory({
      businessId,
      name: "Accounts Receivable",
      type: "asset", 
      description: "Money owed by customers",
      isSystem: true
    });
    
    const advanceSupplierCategory = await storage.createAccountCategory({
      businessId,
      name: "Advance to Supplier",
      type: "asset",
      description: "Prepayments made to suppliers",
      isSystem: true
    });
    
    const officeEquipmentCategory = await storage.createAccountCategory({
      businessId,
      name: "Office Equipment",
      type: "asset",
      description: "Computers, furniture, and office equipment",
      isSystem: true
    });
    
    // LIABILITY CATEGORIES (System-tagged, non-deletable)
    const bankLoanCategory = await storage.createAccountCategory({
      businessId,
      name: "Bank Loan",
      type: "liability",
      description: "Loans from banks and financial institutions",
      isSystem: true
    });
    
    const payablesCategory = await storage.createAccountCategory({
      businessId,
      name: "Accounts Payable",
      type: "liability",
      description: "Money owed to suppliers and vendors",
      isSystem: true
    });
    
    const taxesPayableCategory = await storage.createAccountCategory({
      businessId,
      name: "Taxes Payable",
      type: "liability",
      description: "Taxes owed to government",
      isSystem: true
    });
    
    const customerAdvancesCategory = await storage.createAccountCategory({
      businessId,
      name: "Customer Advances",
      type: "liability",
      description: "Prepayments received from customers",
      isSystem: true
    });
    
    // EQUITY CATEGORIES (System-tagged, non-deletable)
    const ownersCapitalCategory = await storage.createAccountCategory({
      businessId,
      name: "Owner's Capital",
      type: "equity",
      description: "Owner's investment in the business",
      isSystem: true
    });
    
    const retainedEarningsCategory = await storage.createAccountCategory({
      businessId,
      name: "Retained Earnings",
      type: "equity",
      description: "Accumulated profits retained in business",
      isSystem: true
    });
    
    const drawingsCategory = await storage.createAccountCategory({
      businessId,
      name: "Drawings",
      type: "equity",
      description: "Owner withdrawals from business",
      isSystem: true
    });
    
    // INCOME CATEGORIES (System-tagged, non-deletable)
    const salesRevenueCategory = await storage.createAccountCategory({
      businessId,
      name: "Sales Revenue",
      type: "income",
      description: "Revenue from product sales",
      isSystem: true
    });
    
    const shippingIncomeCategory = await storage.createAccountCategory({
      businessId,
      name: "Shipping Income",
      type: "income",
      description: "Revenue from shipping charges",
      isSystem: true
    });
    
    const discountReceivedCategory = await storage.createAccountCategory({
      businessId,
      name: "Discount Received",
      type: "income",
      description: "Discounts received from suppliers",
      isSystem: true
    });
    
    const interestIncomeCategory = await storage.createAccountCategory({
      businessId,
      name: "Interest Income",
      type: "income",
      description: "Interest earned on bank deposits",
      isSystem: true
    });
    
    // EXPENSE CATEGORIES (System-tagged, non-deletable)
    const cogsCategory = await storage.createAccountCategory({
      businessId,
      name: "Cost of Goods Sold",
      type: "expense",
      description: "Direct costs of products sold",
      isSystem: true
    });
    
    const marketingCategory = await storage.createAccountCategory({
      businessId,
      name: "Advertising & Marketing",
      type: "expense",
      description: "Marketing and promotional expenses",
      isSystem: true
    });
    
    const paymentGatewayCategory = await storage.createAccountCategory({
      businessId,
      name: "Payment Gateway Charges",
      type: "expense",
      description: "Fees for payment processing",
      isSystem: true
    });
    
    const rentUtilitiesCategory = await storage.createAccountCategory({
      businessId,
      name: "Rent & Utilities",
      type: "expense",
      description: "Office rent and utility expenses",
      isSystem: true
    });
    
    const internetCommCategory = await storage.createAccountCategory({
      businessId,
      name: "Internet & Communication",
      type: "expense",
      description: "Internet, phone, and communication costs",
      isSystem: true
    });
    
    const salariesWagesCategory = await storage.createAccountCategory({
      businessId,
      name: "Salaries & Wages",
      type: "expense",
      description: "Employee compensation",
      isSystem: true
    });
    
    const packagingMaterialsCategory = await storage.createAccountCategory({
      businessId,
      name: "Packaging Materials",
      type: "expense",
      description: "Boxes, bubble wrap, and packaging supplies",
      isSystem: true
    });
    
    const softwareSubscriptionsCategory = await storage.createAccountCategory({
      businessId,
      name: "Software Subscriptions",
      type: "expense",
      description: "Monthly software and SaaS subscriptions",
      isSystem: true
    });
    
    const officeSuppliesCategory = await storage.createAccountCategory({
      businessId,
      name: "Office Supplies",
      type: "expense",
      description: "Stationery and office consumables",
      isSystem: true
    });
    
    console.log("Created comprehensive e-commerce account categories");
    
    // 3. Create comprehensive e-commerce accounts with system tagging
    
    // ASSET ACCOUNTS
    // Cash & Bank accounts
    await storage.createAccount({
      businessId,
      categoryId: cashBankCategory.id,
      name: "Cash",
      description: "Cash on hand",
      initialBalance: 5000_00, // $5,000.00
      currentBalance: 5000_00,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: cashBankCategory.id,
      name: "Bank Account",
      description: "Primary business checking account",
      initialBalance: 25000_00, // $25,000.00
      currentBalance: 25000_00,
      isActive: true
    });
    
    // Inventory accounts
    await storage.createAccount({
      businessId,
      categoryId: inventoryCategory.id,
      name: "Product Inventory",
      description: "Finished goods ready for sale",
      initialBalance: 15000_00, // $15,000.00
      currentBalance: 15000_00,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: inventoryCategory.id,
      name: "Raw Materials",
      description: "Materials used in production",
      initialBalance: 3000_00, // $3,000.00
      currentBalance: 3000_00,
      isActive: true
    });
    
    // Accounts Receivable
    await storage.createAccount({
      businessId,
      categoryId: receivablesCategory.id,
      name: "Customer Receivables",
      description: "Money owed by customers",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Advance to Supplier
    await storage.createAccount({
      businessId,
      categoryId: advanceSupplierCategory.id,
      name: "Supplier Advances",
      description: "Prepayments made to suppliers",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Office Equipment
    await storage.createAccount({
      businessId,
      categoryId: officeEquipmentCategory.id,
      name: "Computer Equipment",
      description: "Computers and IT equipment",
      initialBalance: 8000_00, // $8,000.00
      currentBalance: 8000_00,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: officeEquipmentCategory.id,
      name: "Office Furniture",
      description: "Desks, chairs, and office furniture",
      initialBalance: 2500_00, // $2,500.00
      currentBalance: 2500_00,
      isActive: true
    });
    
    // LIABILITY ACCOUNTS
    // Bank Loan
    await storage.createAccount({
      businessId,
      categoryId: bankLoanCategory.id,
      name: "Business Term Loan",
      description: "Long-term business loan",
      initialBalance: 20000_00, // $20,000.00
      currentBalance: 20000_00,
      isActive: true
    });
    
    // Accounts Payable
    await storage.createAccount({
      businessId,
      categoryId: payablesCategory.id,
      name: "Supplier Payables",
      description: "Money owed to suppliers",
      initialBalance: 5000_00, // $5,000.00
      currentBalance: 5000_00,
      isActive: true
    });
    
    // Taxes Payable
    await storage.createAccount({
      businessId,
      categoryId: taxesPayableCategory.id,
      name: "Sales Tax Payable",
      description: "Sales tax collected from customers",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: taxesPayableCategory.id,
      name: "Income Tax Payable",
      description: "Corporate income tax owed",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Customer Advances
    await storage.createAccount({
      businessId,
      categoryId: customerAdvancesCategory.id,
      name: "Customer Prepayments",
      description: "Advance payments from customers",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // EQUITY ACCOUNTS
    // Owner's Capital
    await storage.createAccount({
      businessId,
      categoryId: ownersCapitalCategory.id,
      name: "Initial Capital",
      description: "Owner's initial investment",
      initialBalance: 50000_00, // $50,000.00
      currentBalance: 50000_00,
      isActive: true
    });
    
    // Retained Earnings
    await storage.createAccount({
      businessId,
      categoryId: retainedEarningsCategory.id,
      name: "Accumulated Earnings",
      description: "Profits retained in business",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Drawings
    await storage.createAccount({
      businessId,
      categoryId: drawingsCategory.id,
      name: "Owner Withdrawals",
      description: "Money withdrawn by owner",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // INCOME ACCOUNTS
    // Sales Revenue
    await storage.createAccount({
      businessId,
      categoryId: salesRevenueCategory.id,
      name: "Online Sales",
      description: "Revenue from online store",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: salesRevenueCategory.id,
      name: "Retail Sales",
      description: "Revenue from physical store",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Shipping Income
    await storage.createAccount({
      businessId,
      categoryId: shippingIncomeCategory.id,
      name: "Shipping Charges",
      description: "Revenue from shipping fees",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Discount Received
    await storage.createAccount({
      businessId,
      categoryId: discountReceivedCategory.id,
      name: "Purchase Discounts",
      description: "Discounts received from suppliers",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Interest Income
    await storage.createAccount({
      businessId,
      categoryId: interestIncomeCategory.id,
      name: "Bank Interest",
      description: "Interest earned on deposits",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // EXPENSE ACCOUNTS
    // Cost of Goods Sold
    await storage.createAccount({
      businessId,
      categoryId: cogsCategory.id,
      name: "Product Costs",
      description: "Direct cost of products sold",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Advertising & Marketing
    await storage.createAccount({
      businessId,
      categoryId: marketingCategory.id,
      name: "Digital Marketing",
      description: "Online advertising expenses",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: marketingCategory.id,
      name: "Print Advertising",
      description: "Traditional advertising costs",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Payment Gateway Charges
    await storage.createAccount({
      businessId,
      categoryId: paymentGatewayCategory.id,
      name: "Credit Card Fees",
      description: "Credit card processing fees",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: paymentGatewayCategory.id,
      name: "PayPal Fees",
      description: "PayPal transaction fees",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Rent & Utilities
    await storage.createAccount({
      businessId,
      categoryId: rentUtilitiesCategory.id,
      name: "Office Rent",
      description: "Monthly office rent",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: rentUtilitiesCategory.id,
      name: "Utilities",
      description: "Electricity, water, gas",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Internet & Communication
    await storage.createAccount({
      businessId,
      categoryId: internetCommCategory.id,
      name: "Internet Service",
      description: "Monthly internet charges",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: internetCommCategory.id,
      name: "Phone Service",
      description: "Business phone expenses",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Salaries & Wages
    await storage.createAccount({
      businessId,
      categoryId: salariesWagesCategory.id,
      name: "Employee Salaries",
      description: "Full-time employee compensation",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: salariesWagesCategory.id,
      name: "Part-time Wages",
      description: "Hourly employee wages",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Packaging Materials
    await storage.createAccount({
      businessId,
      categoryId: packagingMaterialsCategory.id,
      name: "Shipping Boxes",
      description: "Cardboard boxes and containers",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: packagingMaterialsCategory.id,
      name: "Bubble Wrap & Padding",
      description: "Protective packaging materials",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Software Subscriptions
    await storage.createAccount({
      businessId,
      categoryId: softwareSubscriptionsCategory.id,
      name: "E-commerce Platform",
      description: "Monthly e-commerce software fees",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: softwareSubscriptionsCategory.id,
      name: "Accounting Software",
      description: "Monthly accounting software subscription",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Office Supplies
    await storage.createAccount({
      businessId,
      categoryId: officeSuppliesCategory.id,
      name: "Stationery",
      description: "Pens, paper, and office supplies",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    console.log("Created common e-commerce accounts");
  } else {
    console.log("Account categories already exist, skipping account creation");
  }
  
  // 4. Create sample products if they don't exist
  const existingProducts = await storage.getProductsByBusiness(businessId);
  
  if (existingProducts.length === 0) {
    // Product 1: Basic t-shirt with variants
    await storage.createProduct({
      businessId,
      name: "Premium Cotton T-Shirt",
      description: "Super soft, premium cotton t-shirt with custom logo printing. Available in multiple colors and sizes.",
      price: 2499, // $24.99
      sku: "TS-PREMIUM-001",
      category: "Apparel",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
      additionalImages: [
        "https://images.unsplash.com/photo-1503341960582-b45751874cf0?w=500",
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500"
      ],
      inventory: 250,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "ts-sm-black",
          name: "Small Black",
          sku: "TS-PREMIUM-SM-BLK",
          price: 0, // No price adjustment
          inventory: 50,
          attributes: { "Color": "Black", "Size": "Small" }
        },
        {
          id: "ts-md-black",
          name: "Medium Black",
          sku: "TS-PREMIUM-MD-BLK",
          price: 0,
          inventory: 70,
          attributes: { "Color": "Black", "Size": "Medium" }
        },
        {
          id: "ts-lg-black",
          name: "Large Black",
          sku: "TS-PREMIUM-LG-BLK",
          price: 0,
          inventory: 80,
          attributes: { "Color": "Black", "Size": "Large" }
        },
        {
          id: "ts-md-blue",
          name: "Medium Blue",
          sku: "TS-PREMIUM-MD-BLU",
          price: 200, // $2 more
          inventory: 50,
          attributes: { "Color": "Blue", "Size": "Medium" }
        }
      ],
      weight: "0.2",
      dimensions: { "length": 30, "width": 20, "height": 2 },
      tags: ["t-shirt", "apparel", "cotton", "premium"],
      isFeatured: true,
      isOnSale: false
    });
    
    // Product 2: Hoodie with variants
    await storage.createProduct({
      businessId,
      name: "Fleece Zip-Up Hoodie",
      description: "Cozy fleece hoodie with full-length zipper. Features kangaroo pockets and adjustable hood.",
      price: 4999, // $49.99
      sku: "HD-FLEECE-001",
      category: "Apparel",
      imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500",
      additionalImages: [
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500"
      ],
      inventory: 120,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "hd-sm-gray",
          name: "Small Gray",
          sku: "HD-FLEECE-SM-GRY",
          price: 0,
          inventory: 20,
          attributes: { "Color": "Gray", "Size": "Small" }
        },
        {
          id: "hd-md-gray",
          name: "Medium Gray",
          sku: "HD-FLEECE-MD-GRY",
          price: 0,
          inventory: 35,
          attributes: { "Color": "Gray", "Size": "Medium" }
        },
        {
          id: "hd-lg-gray",
          name: "Large Gray",
          sku: "HD-FLEECE-LG-GRY",
          price: 0,
          inventory: 40,
          attributes: { "Color": "Gray", "Size": "Large" }
        },
        {
          id: "hd-md-black",
          name: "Medium Black",
          sku: "HD-FLEECE-MD-BLK",
          price: 0,
          inventory: 25,
          attributes: { "Color": "Black", "Size": "Medium" }
        }
      ],
      weight: "0.5",
      dimensions: { "length": 60, "width": 45, "height": 5 },
      tags: ["hoodie", "apparel", "fleece", "winter"],
      isFeatured: true,
      isOnSale: true,
      salePrice: 3999 // $39.99
    });
    
    // Product 3: Water bottle
    await storage.createProduct({
      businessId,
      name: "Insulated Stainless Steel Water Bottle",
      description: "Double-walled vacuum insulated water bottle that keeps drinks cold for 24 hours or hot for 12 hours. BPA-free and leak-proof.",
      price: 2995, // $29.95
      sku: "WB-STEEL-001",
      category: "Accessories",
      imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500",
      additionalImages: [
        "https://images.unsplash.com/photo-1610964729232-9ba841da4363?w=500"
      ],
      inventory: 80,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "wb-500-silver",
          name: "500ml Silver",
          sku: "WB-STEEL-500-SLV",
          price: -500, // $5 less
          inventory: 30,
          attributes: { "Capacity": "500ml", "Color": "Silver" }
        },
        {
          id: "wb-750-silver",
          name: "750ml Silver",
          sku: "WB-STEEL-750-SLV",
          price: 0,
          inventory: 25,
          attributes: { "Capacity": "750ml", "Color": "Silver" }
        },
        {
          id: "wb-750-black",
          name: "750ml Black",
          sku: "WB-STEEL-750-BLK",
          price: 0,
          inventory: 25,
          attributes: { "Capacity": "750ml", "Color": "Black" }
        }
      ],
      weight: "0.3",
      dimensions: { "length": 25, "width": 8, "height": 8 },
      tags: ["water bottle", "hydration", "eco-friendly"],
      isFeatured: false,
      isOnSale: false
    });
    
    // Product 4: Laptop sleeve
    await storage.createProduct({
      businessId,
      name: "Neoprene Laptop Sleeve",
      description: "Protective sleeve for laptops with water-resistant neoprene exterior and soft lining to prevent scratches.",
      price: 1999, // $19.99
      sku: "LS-NEO-001",
      category: "Accessories",
      imageUrl: "https://images.unsplash.com/photo-1583330620425-d1756035799e?w=500",
      inventory: 60,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "ls-13-gray",
          name: "13 inch Gray",
          sku: "LS-NEO-13-GRY",
          price: 0,
          inventory: 20,
          attributes: { "Size": "13 inch", "Color": "Gray" }
        },
        {
          id: "ls-15-gray",
          name: "15 inch Gray",
          sku: "LS-NEO-15-GRY",
          price: 500, // $5 more
          inventory: 20,
          attributes: { "Size": "15 inch", "Color": "Gray" }
        },
        {
          id: "ls-13-black",
          name: "13 inch Black",
          sku: "LS-NEO-13-BLK",
          price: 0,
          inventory: 20,
          attributes: { "Size": "13 inch", "Color": "Black" }
        }
      ],
      weight: "0.2",
      dimensions: { "length": 35, "width": 25, "height": 2 },
      tags: ["laptop", "sleeve", "protection", "accessory"],
      isFeatured: false,
      isOnSale: false
    });
    
    // Product 5: Wireless earbuds
    await storage.createProduct({
      businessId,
      name: "True Wireless Earbuds",
      description: "Bluetooth 5.0 true wireless earbuds with touch controls, 30-hour battery life, and water resistance.",
      price: 7999, // $79.99
      sku: "TWE-001",
      category: "Electronics",
      imageUrl: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500",
      additionalImages: [
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500"
      ],
      inventory: 40,
      inStock: true,
      hasVariants: false,
      weight: "0.1",
      dimensions: { "length": 6, "width": 6, "height": 3 },
      tags: ["earbuds", "wireless", "audio", "electronics"],
      isFeatured: true,
      isOnSale: true,
      salePrice: 6499 // $64.99
    });
    
    // Product 6: Smart watch
    await storage.createProduct({
      businessId,
      name: "Fitness Smart Watch",
      description: "Fitness and health tracking smart watch with heart rate monitor, step counter, and sleep tracking. 5-day battery life.",
      price: 12999, // $129.99
      sku: "SW-FIT-001",
      category: "Electronics",
      imageUrl: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500",
      inventory: 25,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "sw-black",
          name: "Black",
          sku: "SW-FIT-BLK",
          price: 0,
          inventory: 15,
          attributes: { "Color": "Black" }
        },
        {
          id: "sw-silver",
          name: "Silver",
          sku: "SW-FIT-SLV",
          price: 1000, // $10 more
          inventory: 10,
          attributes: { "Color": "Silver" }
        }
      ],
      weight: "0.15",
      dimensions: { "length": 5, "width": 4, "height": 1.5 },
      tags: ["smart watch", "fitness", "wearable", "electronics"],
      isFeatured: true,
      isOnSale: false
    });
    
    // Product 7: Yoga mat
    await storage.createProduct({
      businessId,
      name: "Premium Non-Slip Yoga Mat",
      description: "Eco-friendly, non-slip yoga mat with alignment lines. 6mm thick for extra comfort and joint protection.",
      price: 3499, // $34.99
      sku: "YM-001",
      category: "Fitness",
      imageUrl: "https://images.unsplash.com/photo-1592432678016-e910b52f322b?w=500",
      inventory: 50,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "ym-blue",
          name: "Blue",
          sku: "YM-BLU",
          price: 0,
          inventory: 20,
          attributes: { "Color": "Blue" }
        },
        {
          id: "ym-purple",
          name: "Purple",
          sku: "YM-PRP",
          price: 0,
          inventory: 15,
          attributes: { "Color": "Purple" }
        },
        {
          id: "ym-green",
          name: "Green",
          sku: "YM-GRN",
          price: 0,
          inventory: 15,
          attributes: { "Color": "Green" }
        }
      ],
      weight: "1.2",
      dimensions: { "length": 183, "width": 61, "height": 0.6 },
      tags: ["yoga", "fitness", "exercise", "mat"],
      isFeatured: false,
      isOnSale: false
    });
    
    // Product 8: Coffee mug
    await storage.createProduct({
      businessId,
      name: "Ceramic Coffee Mug",
      description: "Handcrafted ceramic coffee mug. Microwave and dishwasher safe. 12oz capacity.",
      price: 1499, // $14.99
      sku: "MUG-001",
      category: "Home & Kitchen",
      imageUrl: "https://images.unsplash.com/photo-1577937927133-66353d779d2f?w=500",
      additionalImages: [
        "https://images.unsplash.com/photo-1572916118968-eb8e40cdb913?w=500"
      ],
      inventory: 75,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "mug-white",
          name: "White",
          sku: "MUG-WHT",
          price: 0,
          inventory: 25,
          attributes: { "Color": "White" }
        },
        {
          id: "mug-black",
          name: "Black",
          sku: "MUG-BLK",
          price: 0,
          inventory: 25,
          attributes: { "Color": "Black" }
        },
        {
          id: "mug-blue",
          name: "Blue",
          sku: "MUG-BLU",
          price: 0,
          inventory: 25,
          attributes: { "Color": "Blue" }
        }
      ],
      weight: "0.4",
      dimensions: { "length": 12, "width": 9, "height": 9 },
      tags: ["mug", "coffee", "ceramic", "kitchen"],
      isFeatured: false,
      isOnSale: true,
      salePrice: 1199 // $11.99
    });
    
    // Product 9: Bluetooth speaker
    await storage.createProduct({
      businessId,
      name: "Portable Bluetooth Speaker",
      description: "Compact waterproof Bluetooth speaker with 10 hours of playtime and built-in microphone for calls.",
      price: 4999, // $49.99
      sku: "SPKR-001",
      category: "Electronics",
      imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500",
      inventory: 30,
      inStock: true,
      hasVariants: false,
      weight: "0.5",
      dimensions: { "length": 18, "width": 8, "height": 8 },
      tags: ["speaker", "bluetooth", "audio", "electronics"],
      isFeatured: false,
      isOnSale: false
    });
    
    // Product 10: Phone case
    await storage.createProduct({
      businessId,
      name: "Clear TPU Phone Case",
      description: "Transparent, shock-absorbent phone case with precise cutouts for ports and buttons. Wireless charging compatible.",
      price: 1499, // $14.99
      sku: "PC-TPU-001",
      category: "Phone Accessories",
      imageUrl: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500",
      inventory: 100,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "pc-iphone12",
          name: "iPhone 12",
          sku: "PC-TPU-IP12",
          price: 0,
          inventory: 20,
          attributes: { "Model": "iPhone 12" }
        },
        {
          id: "pc-iphone13",
          name: "iPhone 13",
          sku: "PC-TPU-IP13",
          price: 200, // $2 more
          inventory: 30,
          attributes: { "Model": "iPhone 13" }
        },
        {
          id: "pc-pixel6",
          name: "Pixel 6",
          sku: "PC-TPU-PX6",
          price: 0,
          inventory: 20,
          attributes: { "Model": "Pixel 6" }
        },
        {
          id: "pc-s22",
          name: "Samsung S22",
          sku: "PC-TPU-SS22",
          price: 200, // $2 more
          inventory: 30,
          attributes: { "Model": "Samsung S22" }
        }
      ],
      weight: "0.05",
      dimensions: { "length": 15, "width": 7.5, "height": 1 },
      tags: ["phone case", "protection", "accessories"],
      isFeatured: false,
      isOnSale: false
    });
    
    // Product 11: Notebook
    await storage.createProduct({
      businessId,
      name: "Hardcover Lined Notebook",
      description: "Premium hardcover notebook with 192 lined pages of acid-free paper. Includes bookmark ribbon and elastic closure.",
      price: 1299, // $12.99
      sku: "NB-HARD-001",
      category: "Stationery",
      imageUrl: "https://images.unsplash.com/photo-1531346680769-a1d79b57de5c?w=500",
      inventory: 60,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "nb-black",
          name: "Black",
          sku: "NB-HARD-BLK",
          price: 0,
          inventory: 20,
          attributes: { "Color": "Black" }
        },
        {
          id: "nb-blue",
          name: "Blue",
          sku: "NB-HARD-BLU",
          price: 0,
          inventory: 20,
          attributes: { "Color": "Blue" }
        },
        {
          id: "nb-red",
          name: "Red",
          sku: "NB-HARD-RED",
          price: 0,
          inventory: 20,
          attributes: { "Color": "Red" }
        }
      ],
      weight: "0.35",
      dimensions: { "length": 21, "width": 14.8, "height": 1.5 },
      tags: ["notebook", "stationery", "writing"],
      isFeatured: false,
      isOnSale: false
    });
    
    // Product 12: Backpack
    await storage.createProduct({
      businessId,
      name: "Urban Laptop Backpack",
      description: "Water-resistant backpack with padded laptop compartment (fits up to 15.6\"), multiple pockets, and USB charging port.",
      price: 5999, // $59.99
      sku: "BP-URBAN-001",
      category: "Bags",
      imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500",
      additionalImages: [
        "https://images.unsplash.com/photo-1576430239369-9e5c88c9bc61?w=500"
      ],
      inventory: 35,
      inStock: true,
      hasVariants: true,
      variants: [
        {
          id: "bp-black",
          name: "Black",
          sku: "BP-URBAN-BLK",
          price: 0,
          inventory: 15,
          attributes: { "Color": "Black" }
        },
        {
          id: "bp-navy",
          name: "Navy",
          sku: "BP-URBAN-NVY",
          price: 0,
          inventory: 10,
          attributes: { "Color": "Navy" }
        },
        {
          id: "bp-gray",
          name: "Gray",
          sku: "BP-URBAN-GRY",
          price: 0,
          inventory: 10,
          attributes: { "Color": "Gray" }
        }
      ],
      weight: "0.8",
      dimensions: { "length": 45, "width": 30, "height": 15 },
      tags: ["backpack", "laptop", "bag", "travel"],
      isFeatured: true,
      isOnSale: false
    });
    
    console.log("Created 12 sample products with variants");
  } else {
    console.log(`${existingProducts.length} products already exist, skipping product creation`);
  }
  
  console.log("Database seeding completed successfully");
}

export default seedDatabase;