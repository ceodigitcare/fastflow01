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
        (1, 'Cash & Bank', 'asset', 'Cash and bank accounts', TRUE),
        (1, 'Accounts Receivable', 'asset', 'Money owed to you', TRUE),
        (1, 'Fixed Assets', 'asset', 'Long-term assets like equipment', TRUE),
        (1, 'Accounts Payable', 'liability', 'Money you owe to others', TRUE),
        (1, 'Credit Cards', 'liability', 'Credit card accounts', TRUE),
        (1, 'Loans', 'liability', 'Long-term debt', TRUE),
        (1, 'Owner Equity', 'equity', 'Owner investment and retained earnings', TRUE),
        (1, 'Sales', 'income', 'Revenue from core business activities', TRUE),
        (1, 'Other Income', 'income', 'Revenue from secondary sources', TRUE),
        (1, 'Cost of Goods Sold', 'expense', 'Direct costs of products sold', TRUE),
        (1, 'Operating Expenses', 'expense', 'Day-to-day business expenses', TRUE),
        (1, 'Payroll', 'expense', 'Employee salaries and benefits', TRUE)
      ON CONFLICT DO NOTHING;
    `);
    
    // Create default accounts
    await db.execute(sql`
      INSERT INTO accounts (business_id, category_id, name, description, initial_balance)
      VALUES 
        (1, 1, 'Main Checking Account', 'Primary business checking account', 100000),
        (1, 1, 'Savings Account', 'Business savings account', 50000),
        (1, 8, 'Product Sales', 'Revenue from product sales', 0),
        (1, 11, 'Office Supplies', 'Expenses for office supplies', 0),
        (1, 11, 'Rent', 'Monthly rent payments', 0),
        (1, 11, 'Utilities', 'Electricity, water, internet', 0)
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