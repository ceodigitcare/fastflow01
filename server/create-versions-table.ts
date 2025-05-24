import { pool, db } from "./db";
import { sql } from "drizzle-orm";

async function createVersionsTable() {
  console.log("Creating transaction_versions table...");
  
  try {
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
    
    console.log("Transaction versions table created successfully!");
  } catch (error) {
    console.error("Failed to create transaction_versions table:", error);
  } finally {
    await pool.end();
  }
}

createVersionsTable();