import { pool, db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Starting database migration...");
  
  try {
    // Update transactions table to match schema
    await db.execute(sql`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS account_id INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Uncategorized',
      ADD COLUMN IF NOT EXISTS date TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS reference TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrate();