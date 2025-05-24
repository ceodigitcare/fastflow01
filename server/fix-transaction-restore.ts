import { pool, db } from "./db";
import { sql } from "drizzle-orm";
import { transactions, transactionVersions } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * This script provides a more direct approach to restoring transaction versions
 * by using SQL directly rather than the ORM layer, which can have issues with
 * complex object serialization/deserialization.
 */
async function fixTransactionRestore() {
  try {
    // First add a more robust restore method using SQL directly
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION restore_transaction_version(
        p_transaction_id INTEGER,
        p_version_id INTEGER,
        p_user_id INTEGER
      ) RETURNS JSONB AS $$
      DECLARE
        v_version_data JSONB;
        v_transaction_data JSONB;
        v_latest_version INTEGER;
        v_business_id INTEGER;
        v_result JSONB;
      BEGIN
        -- Get the version data to restore
        SELECT data, business_id INTO v_version_data, v_business_id
        FROM transaction_versions
        WHERE id = p_version_id AND transaction_id = p_transaction_id;
        
        IF v_version_data IS NULL THEN
          RETURN jsonb_build_object('error', 'Version not found');
        END IF;
        
        -- Get current transaction data for backup
        SELECT row_to_json(t)::jsonb INTO v_transaction_data 
        FROM transactions t
        WHERE id = p_transaction_id;
        
        -- Get latest version number
        SELECT COALESCE(MAX(version), 0) INTO v_latest_version
        FROM transaction_versions
        WHERE transaction_id = p_transaction_id;
        
        -- Create a backup version of the current state
        INSERT INTO transaction_versions (
          transaction_id, 
          business_id, 
          user_id, 
          version, 
          change_type, 
          change_description, 
          data, 
          important
        ) VALUES (
          p_transaction_id,
          v_business_id,
          p_user_id,
          v_latest_version + 1,
          'pre-restore',
          'Automatic backup before restoring version',
          v_transaction_data,
          false
        );
        
        -- Update the transaction with restored data
        -- Ensure id and business_id remain the same
        v_version_data = jsonb_set(v_version_data, '{id}', to_jsonb(p_transaction_id));
        v_version_data = jsonb_set(v_version_data, '{businessId}', to_jsonb(v_business_id));
        v_version_data = jsonb_set(v_version_data, '{updatedBy}', to_jsonb(p_user_id));
        v_version_data = jsonb_set(v_version_data, '{updatedAt}', to_jsonb(NOW()));
        
        -- Strip out any problematic fields
        v_version_data = v_version_data - '_select';
        
        -- Update transaction directly with JSON data
        -- This bypasses the ORM type conversion issues
        UPDATE transactions
        SET 
          amount = (v_version_data->>'amount')::INTEGER,
          type = v_version_data->>'type',
          category = v_version_data->>'category',
          description = v_version_data->>'description',
          date = (v_version_data->>'date')::TIMESTAMP,
          notes = v_version_data->>'notes',
          document_type = v_version_data->>'documentType',
          document_number = v_version_data->>'documentNumber',
          contact_name = v_version_data->>'contactName',
          contact_email = v_version_data->>'contactEmail',
          contact_phone = v_version_data->>'contactPhone',
          contact_address = v_version_data->>'contactAddress',
          items = v_version_data->'items',
          status = v_version_data->>'status',
          payment_received = (v_version_data->>'paymentReceived')::INTEGER,
          metadata = v_version_data->'metadata',
          updated_by = p_user_id,
          updated_at = NOW()
        WHERE id = p_transaction_id
        RETURNING row_to_json(transactions.*)::jsonb INTO v_result;
        
        -- Create a record of the restore action
        INSERT INTO transaction_versions (
          transaction_id, 
          business_id, 
          user_id, 
          version, 
          change_type, 
          change_description, 
          data, 
          important
        ) VALUES (
          p_transaction_id,
          v_business_id,
          p_user_id,
          v_latest_version + 2,
          'restore',
          'Restored version using direct SQL',
          v_result,
          true
        );
        
        RETURN v_result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log("Created restore_transaction_version SQL function successfully");
  } catch (error) {
    console.error("Error fixing transaction restore:", error);
  } finally {
    await pool.end();
  }
}

fixTransactionRestore();