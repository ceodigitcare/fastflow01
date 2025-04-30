import { storage } from "./storage";
import { db } from "./db";
import { businesses, accountCategories, accounts, products } from "@shared/schema";
import { hashPassword } from "./auth";
import { sql } from "drizzle-orm";

async function seedDatabase() {
  console.log("Starting database seeding...");
  
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
    demoBusiness = existingBusiness;
    console.log(`Using existing demo business: ${demoBusiness.name} (ID: ${demoBusiness.id})`);
  }
  
  const businessId = demoBusiness.id;
  
  // 2. Create standard e-commerce account categories if they don't exist
  const existingCategories = await storage.getAccountCategoriesByBusiness(businessId);
  
  if (existingCategories.length === 0) {
    // Assets
    const assetsCategory = await storage.createAccountCategory({
      businessId,
      name: "Assets",
      type: "asset",
      description: "Resources owned by the business",
      isSystem: true
    });
    
    // Liabilities
    const liabilitiesCategory = await storage.createAccountCategory({
      businessId,
      name: "Liabilities",
      type: "liability",
      description: "Debts and obligations owed by the business",
      isSystem: true
    });
    
    // Equity
    const equityCategory = await storage.createAccountCategory({
      businessId,
      name: "Equity",
      type: "equity",
      description: "Owner's interest in the business",
      isSystem: true
    });
    
    // Income
    const incomeCategory = await storage.createAccountCategory({
      businessId,
      name: "Sales Revenue",
      type: "income",
      description: "Revenue from sales and operations",
      isSystem: true
    });
    
    // Expenses
    const expensesCategory = await storage.createAccountCategory({
      businessId,
      name: "Expenses",
      type: "expense",
      description: "Costs incurred in business operations",
      isSystem: true
    });
    
    console.log("Created standard account categories");
    
    // 3. Create common e-commerce accounts
    
    // Asset accounts
    await storage.createAccount({
      businessId,
      categoryId: assetsCategory.id,
      name: "Cash",
      description: "Cash on hand",
      initialBalance: 5000_00, // $5,000.00
      currentBalance: 5000_00,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: assetsCategory.id,
      name: "Bank Account",
      description: "Primary business checking account",
      initialBalance: 25000_00, // $25,000.00
      currentBalance: 25000_00,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: assetsCategory.id,
      name: "Accounts Receivable",
      description: "Money owed by customers",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: assetsCategory.id,
      name: "Inventory",
      description: "Products held for sale",
      initialBalance: 15000_00, // $15,000.00
      currentBalance: 15000_00,
      isActive: true
    });
    
    // Liability accounts
    await storage.createAccount({
      businessId,
      categoryId: liabilitiesCategory.id,
      name: "Accounts Payable",
      description: "Money owed to suppliers",
      initialBalance: 5000_00, // $5,000.00
      currentBalance: 5000_00,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: liabilitiesCategory.id,
      name: "Credit Card",
      description: "Business credit card",
      initialBalance: 2500_00, // $2,500.00
      currentBalance: 2500_00,
      isActive: true
    });
    
    // Equity accounts
    await storage.createAccount({
      businessId,
      categoryId: equityCategory.id,
      name: "Owner's Capital",
      description: "Owner's investment in the business",
      initialBalance: 37500_00, // $37,500.00
      currentBalance: 37500_00,
      isActive: true
    });
    
    // Income accounts
    await storage.createAccount({
      businessId,
      categoryId: incomeCategory.id,
      name: "Online Sales",
      description: "Revenue from online sales",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: incomeCategory.id,
      name: "In-Store Sales",
      description: "Revenue from physical store",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    // Expense accounts
    await storage.createAccount({
      businessId,
      categoryId: expensesCategory.id,
      name: "Cost of Goods Sold",
      description: "Direct costs of products sold",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: expensesCategory.id,
      name: "Advertising",
      description: "Marketing and advertising expenses",
      initialBalance: 0,
      currentBalance: 0,
      isActive: true
    });
    
    await storage.createAccount({
      businessId,
      categoryId: expensesCategory.id,
      name: "Shipping & Fulfillment",
      description: "Costs of shipping and order fulfillment",
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