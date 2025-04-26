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
        created_at TIMESTAMP DEFAULT NOW()
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
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Update transactions table to match schema
    await db.execute(sql`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS account_id INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Uncategorized',
      ADD COLUMN IF NOT EXISTS date TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS reference TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    
    // Create default account categories for each business
    await db.execute(sql`
      INSERT INTO account_categories (business_id, name, type, description, is_system)
      VALUES 
        -- Asset categories
        (1, 'Cash & Bank', 'asset', 'Cash and bank accounts', TRUE),
        (1, 'Accounts Receivable', 'asset', 'Money owed to you', TRUE),
        (1, 'Fixed Assets', 'asset', 'Long-term assets like equipment', TRUE),
        (1, 'Inventory', 'asset', 'Product inventory held for sale', TRUE),
        (1, 'Other Assets', 'asset', 'Other company assets', TRUE),
        
        -- Liability categories
        (1, 'Accounts Payable', 'liability', 'Money you owe to others', TRUE),
        (1, 'Credit Cards', 'liability', 'Credit card accounts', TRUE),
        (1, 'Loans', 'liability', 'Long-term debt', TRUE),
        (1, 'Tax Liabilities', 'liability', 'Sales tax and other tax obligations', TRUE),
        (1, 'Other Liabilities', 'liability', 'Other obligations', TRUE),
        
        -- Equity categories
        (1, 'Owner Equity', 'equity', 'Owner investment and retained earnings', TRUE),
        (1, 'Draws', 'equity', 'Owner withdrawals from business', TRUE),
        
        -- Income categories
        (1, 'Product Sales', 'income', 'Revenue from product sales', TRUE),
        (1, 'Shipping Income', 'income', 'Revenue from shipping charges', TRUE),
        (1, 'Subscription Income', 'income', 'Revenue from recurring subscriptions', TRUE),
        (1, 'Other Income', 'income', 'Revenue from secondary sources', TRUE),
        
        -- Expense categories
        (1, 'Cost of Goods Sold', 'expense', 'Direct costs of products sold', TRUE),
        (1, 'Shipping & Fulfillment', 'expense', 'Costs for shipping and order fulfillment', TRUE),
        (1, 'Marketing & Advertising', 'expense', 'Costs to promote business', TRUE),
        (1, 'Website & Technology', 'expense', 'Technology and online platform costs', TRUE),
        (1, 'Operating Expenses', 'expense', 'Day-to-day business expenses', TRUE),
        (1, 'Payroll', 'expense', 'Employee salaries and benefits', TRUE),
        (1, 'Professional Services', 'expense', 'Accounting, legal, and consulting fees', TRUE)
      ON CONFLICT DO NOTHING;
    `);
    
    // Create default accounts
    await db.execute(sql`
      INSERT INTO accounts (business_id, category_id, name, description, initial_balance)
      VALUES 
        -- Asset accounts
        (1, 1, 'Main Checking Account', 'Primary business checking account', 100000),
        (1, 1, 'Savings Account', 'Business savings account', 50000),
        (1, 1, 'Petty Cash', 'Small cash fund for minor expenses', 5000),
        (1, 2, 'Customer Receivables', 'Money owed by customers', 0),
        (1, 3, 'Inventory Asset', 'Value of inventory on hand', 75000),
        (1, 3, 'Computer Equipment', 'Computers and technology', 20000),
        (1, 3, 'Office Furniture', 'Desks, chairs, and other furniture', 15000),
        
        -- Liability accounts
        (1, 4, 'Vendor Payables', 'Bills to be paid to suppliers', 25000),
        (1, 5, 'Business Credit Card', 'Primary business credit card', 10000),
        (1, 6, 'Business Loan', 'Long-term business loan', 50000),
        (1, 6, 'Sales Tax Payable', 'Collected sales tax to be remitted', 0),
        (1, 6, 'Payroll Liabilities', 'Employee payroll taxes and withholdings', 0),
        
        -- Equity accounts
        (1, 7, 'Owner Investment', 'Capital invested by owner', 150000),
        (1, 7, 'Retained Earnings', 'Accumulated earnings reinvested', 0),
        
        -- Income accounts
        (1, 8, 'Product Sales', 'Revenue from product sales', 0),
        (1, 8, 'Shipping Income', 'Revenue from charging shipping fees', 0),
        (1, 9, 'Interest Income', 'Interest earned on bank accounts', 0),
        (1, 9, 'Discount Income', 'Income from vendor discounts', 0),
        
        -- Expense accounts
        (1, 10, 'Inventory Purchases', 'Cost of products purchased for resale', 0),
        (1, 10, 'Packaging Materials', 'Boxes, tape, and packaging materials', 0),
        (1, 10, 'Shipping Expenses', 'Costs for shipping products to customers', 0),
        (1, 10, 'Product Returns', 'Costs associated with returned merchandise', 0),
        (1, 11, 'Advertising', 'Marketing and advertising expenses', 0),
        (1, 11, 'Website Expenses', 'Hosting, maintenance, and development', 0),
        (1, 11, 'Payment Processing Fees', 'Credit card and payment gateway fees', 0),
        (1, 11, 'Office Supplies', 'Expenses for office supplies', 0),
        (1, 11, 'Rent', 'Monthly rent payments', 0),
        (1, 11, 'Utilities', 'Electricity, water, internet', 0),
        (1, 11, 'Software Subscriptions', 'SaaS and software tools', 0),
        (1, 11, 'Professional Services', 'Accounting, legal, and consulting', 0),
        (1, 11, 'Insurance', 'Business insurance policies', 0),
        (1, 12, 'Salaries & Wages', 'Employee base pay', 0),
        (1, 12, 'Employee Benefits', 'Health insurance and other benefits', 0),
        (1, 12, 'Payroll Taxes', 'Employer portion of payroll taxes', 0)
      ON CONFLICT DO NOTHING;
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrate();