import { pool, db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Starting database migration...");
  
  try {
    // Create account_categories table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS account_categories (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (business_id, name, type)
      );
    `);
    
    // Create accounts table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        initial_balance INTEGER DEFAULT 0,
        current_balance INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (business_id, category_id, name)
      );
    `);
    
    // Update transactions table to match schema
    await db.execute(sql`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS account_id INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Uncategorized',
      ADD COLUMN IF NOT EXISTS date TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS reference TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS document_type TEXT,
      ADD COLUMN IF NOT EXISTS document_number TEXT,
      ADD COLUMN IF NOT EXISTS document_url TEXT,
      ADD COLUMN IF NOT EXISTS contact_name TEXT,
      ADD COLUMN IF NOT EXISTS contact_email TEXT,
      ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
    `);
    
    // Create default account categories for each business
    await db.execute(sql`
      INSERT INTO account_categories (business_id, name, type, description, is_system)
      VALUES 
        -- Asset categories (system - not editable)
        (1, 'Cash & Bank', 'asset', 'Cash and bank accounts', TRUE),
        (1, 'Accounts Receivable', 'asset', 'Money owed to you', TRUE),
        (1, 'Fixed Assets', 'asset', 'Long-term assets like equipment', TRUE),
        (1, 'Inventory', 'asset', 'Product inventory held for sale', TRUE),
        
        -- Liability categories (system - not editable)
        (1, 'Accounts Payable', 'liability', 'Money you owe to others', TRUE),
        (1, 'Credit Cards', 'liability', 'Credit card accounts', TRUE),
        (1, 'Loans', 'liability', 'Long-term debt', TRUE),
        (1, 'Tax Liabilities', 'liability', 'Sales tax and other tax obligations', TRUE),
        
        -- Equity categories (system - not editable)
        (1, 'Owner Equity', 'equity', 'Owner investment and retained earnings', TRUE),
        
        -- Income categories (system - not editable)
        (1, 'Product Sales', 'income', 'Revenue from product sales', TRUE),
        (1, 'Other Income', 'income', 'Revenue from secondary sources', TRUE),
        
        -- Expense categories (system - not editable)
        (1, 'Cost of Goods Sold', 'expense', 'Direct costs of products sold', TRUE),
        (1, 'Operating Expenses', 'expense', 'Day-to-day business expenses', TRUE),
        (1, 'Payroll', 'expense', 'Employee salaries and benefits', TRUE),
        
        -- Additional useful categories (editable)
        (1, 'Digital Assets', 'asset', 'Digital properties and virtual assets', FALSE),
        (1, 'Prepaid Expenses', 'asset', 'Expenses paid in advance', FALSE),
        
        (1, 'Customer Deposits', 'liability', 'Advance payments from customers', FALSE),
        (1, 'Deferred Revenue', 'liability', 'Revenue received but not yet earned', FALSE),
        
        (1, 'Shipping Income', 'income', 'Revenue from shipping charges', FALSE),
        (1, 'Subscription Income', 'income', 'Revenue from recurring subscriptions', FALSE),
        (1, 'Returns & Refunds', 'income', 'Adjustment for returned products', FALSE),
        
        (1, 'Shipping & Fulfillment', 'expense', 'Costs for shipping and order fulfillment', FALSE),
        (1, 'Marketing & Advertising', 'expense', 'Costs to promote business', FALSE),
        (1, 'Website & Technology', 'expense', 'Technology and online platform costs', FALSE),
        (1, 'Bank Charges', 'expense', 'Banking fees and service charges', FALSE),
        (1, 'Professional Services', 'expense', 'Accounting, legal, and consulting fees', FALSE),
        (1, 'Office Expenses', 'expense', 'Office supplies and maintenance', FALSE),
        (1, 'Travel & Entertainment', 'expense', 'Business travel and client entertainment', FALSE)
      ON CONFLICT (business_id, name, type) DO NOTHING;
    `);
    
    // We need to get the category IDs dynamically since they might have changed
    const categories = await db.execute(sql`
      SELECT id, name, type FROM account_categories WHERE business_id = 1 ORDER BY id
    `);
    
    // Map to store category IDs by name for easier reference
    const categoryMap = {};
    for (const category of categories.rows) {
      categoryMap[category.name] = category.id;
    }
    
    // Create default accounts using the dynamic category IDs
    await db.execute(sql`
      INSERT INTO accounts (business_id, category_id, name, description, initial_balance)
      VALUES 
        -- Asset accounts (Cash & Bank)
        (1, ${categoryMap['Cash & Bank']}, 'Main Checking Account', 'Primary business checking account', 100000),
        (1, ${categoryMap['Cash & Bank']}, 'Savings Account', 'Business savings account', 50000),
        (1, ${categoryMap['Cash & Bank']}, 'Petty Cash', 'Small cash fund for minor expenses', 5000),
        
        -- Asset accounts (Accounts Receivable)
        (1, ${categoryMap['Accounts Receivable']}, 'Customer Receivables', 'Money owed by customers', 0),
        
        -- Asset accounts (Inventory)
        (1, ${categoryMap['Inventory']}, 'Inventory Asset', 'Value of inventory on hand', 75000),
        
        -- Asset accounts (Fixed Assets)
        (1, ${categoryMap['Fixed Assets']}, 'Computer Equipment', 'Computers and technology', 20000),
        (1, ${categoryMap['Fixed Assets']}, 'Office Furniture', 'Desks, chairs, and other furniture', 15000),
        
        -- Liability accounts (Accounts Payable)
        (1, ${categoryMap['Accounts Payable']}, 'Vendor Payables', 'Bills to be paid to suppliers', 25000),
        
        -- Liability accounts (Credit Cards)
        (1, ${categoryMap['Credit Cards']}, 'Business Credit Card', 'Primary business credit card', 10000),
        
        -- Liability accounts (Loans)
        (1, ${categoryMap['Loans']}, 'Business Loan', 'Long-term business loan', 50000),
        
        -- Liability accounts (Tax Liabilities)
        (1, ${categoryMap['Tax Liabilities']}, 'Sales Tax Payable', 'Collected sales tax to be remitted', 0),
        (1, ${categoryMap['Tax Liabilities']}, 'Payroll Liabilities', 'Employee payroll taxes and withholdings', 0),
        
        -- Equity accounts (Owner Equity)
        (1, ${categoryMap['Owner Equity']}, 'Owner Investment', 'Capital invested by owner', 150000),
        (1, ${categoryMap['Owner Equity']}, 'Retained Earnings', 'Accumulated earnings reinvested', 0),
        
        -- Income accounts (Product Sales)
        (1, ${categoryMap['Product Sales']}, 'Product Sales', 'Revenue from product sales', 0),
        
        -- Income accounts (Other Income)
        (1, ${categoryMap['Other Income']}, 'Interest Income', 'Interest earned on bank accounts', 0),
        (1, ${categoryMap['Other Income']}, 'Discount Income', 'Income from vendor discounts', 0),
        
        -- Income accounts (Shipping Income - editable category)
        (1, ${categoryMap['Shipping Income']}, 'Shipping Income', 'Revenue from charging shipping fees', 0),
        
        -- Expense accounts (Cost of Goods Sold)
        (1, ${categoryMap['Cost of Goods Sold']}, 'Inventory Purchases', 'Cost of products purchased for resale', 0),
        (1, ${categoryMap['Cost of Goods Sold']}, 'Packaging Materials', 'Boxes, tape, and packaging materials', 0),
        
        -- Expense accounts (Operating Expenses)
        (1, ${categoryMap['Operating Expenses']}, 'Rent', 'Monthly rent payments', 0),
        (1, ${categoryMap['Operating Expenses']}, 'Utilities', 'Electricity, water, internet', 0),
        (1, ${categoryMap['Operating Expenses']}, 'Insurance', 'Business insurance policies', 0),
        (1, ${categoryMap['Operating Expenses']}, 'Office Supplies', 'Expenses for office supplies', 0),
        
        -- Expense accounts (Payroll)
        (1, ${categoryMap['Payroll']}, 'Salaries & Wages', 'Employee base pay', 0),
        (1, ${categoryMap['Payroll']}, 'Employee Benefits', 'Health insurance and other benefits', 0),
        (1, ${categoryMap['Payroll']}, 'Payroll Taxes', 'Employer portion of payroll taxes', 0),
        
        -- Expense accounts (Shipping & Fulfillment - editable category)
        (1, ${categoryMap['Shipping & Fulfillment']}, 'Shipping Expenses', 'Costs for shipping products to customers', 0),
        (1, ${categoryMap['Shipping & Fulfillment']}, 'Product Returns', 'Costs associated with returned merchandise', 0),
        
        -- Expense accounts (Marketing & Advertising - editable category)
        (1, ${categoryMap['Marketing & Advertising']}, 'Advertising', 'Marketing and advertising expenses', 0),
        
        -- Expense accounts (Website & Technology - editable category)
        (1, ${categoryMap['Website & Technology']}, 'Website Expenses', 'Hosting, maintenance, and development', 0),
        (1, ${categoryMap['Website & Technology']}, 'Software Subscriptions', 'SaaS and software tools', 0),
        
        -- Expense accounts (Bank Charges - editable category)
        (1, ${categoryMap['Bank Charges']}, 'Payment Processing Fees', 'Credit card and payment gateway fees', 0),
        (1, ${categoryMap['Bank Charges']}, 'Bank Fees', 'Monthly account fees and service charges', 0),
        
        -- Expense accounts (Professional Services - editable category)
        (1, ${categoryMap['Professional Services']}, 'Accounting Services', 'Bookkeeping and accounting fees', 0),
        (1, ${categoryMap['Professional Services']}, 'Legal Services', 'Legal consultation and services', 0)
      ON CONFLICT (business_id, category_id, name) DO NOTHING;
    `);
    
    // Drop transaction_versions table if it exists and recreate it
    await db.execute(sql`
      DROP TABLE IF EXISTS transaction_versions;
      
      CREATE TABLE transaction_versions (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL,
        version INTEGER NOT NULL,
        business_id INTEGER NOT NULL,
        user_id INTEGER,
        timestamp TIMESTAMP DEFAULT NOW(),
        change_description TEXT,
        change_type TEXT NOT NULL,
        data JSONB NOT NULL,
        important BOOLEAN DEFAULT FALSE
      );
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrate();