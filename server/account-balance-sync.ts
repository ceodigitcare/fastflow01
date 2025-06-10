import { db } from "./db";
import { eq, and, sum, sql } from "drizzle-orm";
import { accounts, transactions } from "@shared/schema";

/**
 * Real-time Account Balance Synchronization System
 * 
 * This module provides centralized functions to calculate and update
 * account balances based on transactions and initial balances.
 */

/**
 * Calculate the current balance of an account based on:
 * - Initial balance
 * - All incoming transactions (credits)
 * - All outgoing transactions (debits)
 */
export async function calculateAccountBalance(accountId: number, businessId: number): Promise<number> {
  try {
    // Get account's initial balance
    const [account] = await db
      .select({ initialBalance: accounts.initialBalance })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.businessId, businessId)));

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const initialBalance = account.initialBalance || 0;

    // Calculate total incoming (credits) - money received into this account
    const incomingResult = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` 
      })
      .from(transactions)
      .where(and(
        eq(transactions.businessId, businessId),
        eq(transactions.accountId, accountId),
        sql`${transactions.type} IN ('income', 'transfer_in')`
      ));

    // Calculate total outgoing (debits) - money paid from this account
    const outgoingResult = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` 
      })
      .from(transactions)
      .where(and(
        eq(transactions.businessId, businessId),
        eq(transactions.accountId, accountId),
        sql`${transactions.type} IN ('expense', 'transfer_out')`
      ));

    const totalIncoming = incomingResult[0]?.total || 0;
    const totalOutgoing = outgoingResult[0]?.total || 0;

    // Calculate current balance: Initial + Incoming - Outgoing
    // All values are in cents, so no decimal conversion needed
    const currentBalance = initialBalance + totalIncoming - totalOutgoing;
    
    console.log(`Updated account ${accountId} balance to ${currentBalance}`);

    return currentBalance;
  } catch (error) {
    console.error(`Error calculating balance for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Update the current balance field for a specific account
 * This should be called after any transaction that affects the account
 */
export async function updateAccountBalance(accountId: number, businessId: number): Promise<void> {
  try {
    const currentBalance = await calculateAccountBalance(accountId, businessId);
    
    await db
      .update(accounts)
      .set({ currentBalance })
      .where(and(eq(accounts.id, accountId), eq(accounts.businessId, businessId)));

    console.log(`Updated account ${accountId} balance to ${currentBalance}`);
  } catch (error) {
    console.error(`Error updating balance for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Sync balances for all accounts in a business
 * Useful for bulk updates or initial synchronization
 */
export async function syncAllAccountBalances(businessId: number): Promise<void> {
  try {
    const businessAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.businessId, businessId));

    for (const account of businessAccounts) {
      await updateAccountBalance(account.id, businessId);
    }

    console.log(`Synced balances for ${businessAccounts.length} accounts in business ${businessId}`);
  } catch (error) {
    console.error(`Error syncing all account balances for business ${businessId}:`, error);
    throw error;
  }
}

/**
 * Get accounts with their current calculated balances
 * This provides real-time balance data without relying on stored balance fields
 */
export async function getAccountsWithBalances(businessId: number) {
  try {
    const businessAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.businessId, businessId));

    const accountsWithBalances = await Promise.all(
      businessAccounts.map(async (account) => {
        const currentBalance = await calculateAccountBalance(account.id, businessId);
        return {
          ...account,
          currentBalance
        };
      })
    );

    return accountsWithBalances;
  } catch (error) {
    console.error(`Error getting accounts with balances for business ${businessId}:`, error);
    throw error;
  }
}