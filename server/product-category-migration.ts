import { db, pool } from "./db";
import { sql } from "drizzle-orm";

async function addProductCategoryTable() {
  console.log("Starting product category migration...");
  
  try {
    // Create the product_categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add category_id column to products table
    await db.execute(sql`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS category_id INTEGER
    `);
    
    // Create an index on business_id for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_product_categories_business_id 
      ON product_categories(business_id)
    `);
    
    // Create a default "Other" category for each business
    await db.execute(sql`
      INSERT INTO product_categories (business_id, name, is_default)
      SELECT DISTINCT business_id, 'Other', true
      FROM products
    `);

    // Update existing products to use the Other category
    await db.execute(sql`
      UPDATE products p
      SET category_id = pc.id
      FROM product_categories pc
      WHERE p.business_id = pc.business_id AND pc.is_default = true
    `);
    
    console.log("Product category migration completed successfully!");
  } catch (error) {
    console.error("Error during product category migration:", error);
    throw error;
  }
}

// Run the migration
addProductCategoryTable()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

export { addProductCategoryTable };