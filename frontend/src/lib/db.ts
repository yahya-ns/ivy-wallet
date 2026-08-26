import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Account,
  Category,
  Tag,
  Transaction,
  Budget,
  Loan,
  LoanRecord,
  PlannedPaymentRule,
  Settings,
} from './types';

export interface OutboxItem {
  id: string; // unique UUID for outbox record
  entityType: 'account' | 'category' | 'tag' | 'transaction' | 'budget' | 'loan' | 'loanRecord' | 'planned' | 'settings';
  action: 'UPSERT' | 'DELETE';
  payload: any;
  createdAt: string;
}

export interface SyncMetaItem {
  key: string;
  value: any;
}

interface IvyWalletDB extends DBSchema {
  accounts: {
    key: string;
    value: Account;
  };
  categories: {
    key: string;
    value: Category;
  };
  tags: {
    key: string;
    value: Tag;
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-dateTime': string;
      'by-account': string;
      'by-category': string;
      'by-isDeleted': number;
    };
  };
  budgets: {
    key: string;
    value: Budget;
  };
  loans: {
    key: string;
    value: Loan;
  };
  loan_records: {
    key: string;
    value: LoanRecord;
    indexes: {
      'by-loanId': string;
    };
  };
  planned: {
    key: string;
    value: PlannedPaymentRule;
  };
  settings: {
    key: string;
    value: Settings;
  };
  sync_outbox: {
    key: string;
    value: OutboxItem;
  };
  sync_meta: {
    key: string;
    value: SyncMetaItem;
  };
}

const DB_NAME = 'ivy_wallet_pwa_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<IvyWalletDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<IvyWalletDB>> {
  if (!dbPromise) {
    dbPromise = openDB<IvyWalletDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }
        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        // Tags store
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' });
        }
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by-dateTime', 'dateTime');
          txStore.createIndex('by-account', 'accountId');
          txStore.createIndex('by-category', 'categoryId');
          txStore.createIndex('by-isDeleted', 'isDeleted');
        }
        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'id' });
        }
        // Loans store
        if (!db.objectStoreNames.contains('loans')) {
          db.createObjectStore('loans', { keyPath: 'id' });
        }
        // Loan records store
        if (!db.objectStoreNames.contains('loan_records')) {
          const lrStore = db.createObjectStore('loan_records', { keyPath: 'id' });
          lrStore.createIndex('by-loanId', 'loanId');
        }
        // Planned payment rules store
        if (!db.objectStoreNames.contains('planned')) {
          db.createObjectStore('planned', { keyPath: 'id' });
        }
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        // Sync Outbox store
        if (!db.objectStoreNames.contains('sync_outbox')) {
          db.createObjectStore('sync_outbox', { keyPath: 'id' });
        }
        // Sync Meta store
        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// -------------------------------------------------------------
// Meta Storage Helpers
// -------------------------------------------------------------
export async function getSyncMeta<T = any>(key: string): Promise<T | null> {
  const db = await getDB();
  const item = await db.get('sync_meta', key);
  return item ? (item.value as T) : null;
}

export async function setSyncMeta(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('sync_meta', { key, value });
}

// -------------------------------------------------------------
// Outbox Helpers (Queue for Offline Mutations)
// -------------------------------------------------------------
export async function addToOutbox(item: Omit<OutboxItem, 'id' | 'createdAt'>): Promise<OutboxItem> {
  const db = await getDB();
  const outboxItem: OutboxItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await db.put('sync_outbox', outboxItem);
  return outboxItem;
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  const db = await getDB();
  return db.getAll('sync_outbox');
}

export async function removeOutboxItems(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sync_outbox', 'readwrite');
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function getOutboxCount(): Promise<number> {
  const db = await getDB();
  return db.count('sync_outbox');
}

// -------------------------------------------------------------
// Accounts Local CRUD
// -------------------------------------------------------------
export async function getLocalAccounts(): Promise<Account[]> {
  const db = await getDB();
  const accounts = await db.getAll('accounts');
  return accounts.filter((a) => !a.isDeleted).sort((a, b) => a.orderNum - b.orderNum);
}

export async function putLocalAccount(account: Account): Promise<void> {
  const db = await getDB();
  await db.put('accounts', account);
}

// -------------------------------------------------------------
// Categories Local CRUD
// -------------------------------------------------------------
export async function getLocalCategories(): Promise<Category[]> {
  const db = await getDB();
  const categories = await db.getAll('categories');
  return categories.filter((c) => !c.isDeleted).sort((a, b) => a.orderNum - b.orderNum);
}

export async function putLocalCategory(category: Category): Promise<void> {
  const db = await getDB();
  await db.put('categories', category);
}

// -------------------------------------------------------------
// Tags Local CRUD
// -------------------------------------------------------------
export async function getLocalTags(): Promise<Tag[]> {
  const db = await getDB();
  const tags = await db.getAll('tags');
  return tags.filter((t) => !t.isDeleted).sort((a, b) => a.orderNum - b.orderNum);
}

export async function putLocalTag(tag: Tag): Promise<void> {
  const db = await getDB();
  await db.put('tags', tag);
}

// -------------------------------------------------------------
// Transactions Local CRUD
// -------------------------------------------------------------
export async function getLocalTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const txs = await db.getAll('transactions');
  return txs
    .filter((t) => !t.isDeleted)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export async function putLocalTransaction(tx: Transaction): Promise<void> {
  const db = await getDB();
  await db.put('transactions', tx);
}

// -------------------------------------------------------------
// Budgets Local CRUD
// -------------------------------------------------------------
export async function getLocalBudgets(): Promise<Budget[]> {
  const db = await getDB();
  const budgets = await db.getAll('budgets');
  return budgets.sort((a, b) => a.orderId - b.orderId);
}

export async function putLocalBudget(budget: Budget): Promise<void> {
  const db = await getDB();
  await db.put('budgets', budget);
}

// -------------------------------------------------------------
// Loans & Loan Records Local CRUD
// -------------------------------------------------------------
export async function getLocalLoans(): Promise<Loan[]> {
  const db = await getDB();
  const loans = await db.getAll('loans');
  const records = await db.getAll('loan_records');

  return loans
    .filter((l) => !l.isDeleted)
    .map((l) => ({
      ...l,
      records: records.filter((r) => r.loanId === l.id),
    }))
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export async function putLocalLoan(loan: Loan): Promise<void> {
  const db = await getDB();
  await db.put('loans', loan);
}

export async function putLocalLoanRecord(record: LoanRecord): Promise<void> {
  const db = await getDB();
  await db.put('loan_records', record);
}

// -------------------------------------------------------------
// Planned Payment Rules Local CRUD
// -------------------------------------------------------------
export async function getLocalPlanned(): Promise<PlannedPaymentRule[]> {
  const db = await getDB();
  const planned = await db.getAll('planned');
  return planned.filter((p) => !p.isDeleted);
}

export async function putLocalPlanned(rule: PlannedPaymentRule): Promise<void> {
  const db = await getDB();
  await db.put('planned', rule);
}

// -------------------------------------------------------------
// Settings Local CRUD
// -------------------------------------------------------------
export async function getLocalSettings(): Promise<Settings | null> {
  const db = await getDB();
  const all = await db.getAll('settings');
  return all.length > 0 ? all[0] : null;
}

export async function putLocalSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}
