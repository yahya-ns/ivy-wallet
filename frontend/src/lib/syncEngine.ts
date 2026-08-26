import {
  getDB,
  getOutboxItems,
  removeOutboxItems,
  getSyncMeta,
  setSyncMeta,
  getOutboxCount,
} from './db';
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

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  error: string | null;
}

interface SyncResponse {
  syncTime: string;
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
  budgets: Budget[];
  loans: Loan[];
  loanRecords: LoanRecord[];
  planned: PlannedPaymentRule[];
  settings?: Settings;
}

let isSyncingInProgress = false;
const listeners = new Set<(status: SyncStatus) => void>();

let currentStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  error: null,
};

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...currentStatus }));
  window.dispatchEvent(new CustomEvent('ivy-sync-status', { detail: { ...currentStatus } }));
}

export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

export function subscribeSyncStatus(fn: (status: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn({ ...currentStatus });
  return () => listeners.delete(fn);
}

// -------------------------------------------------------------
// Push Local Mutations to Server (/api/sync POST)
// -------------------------------------------------------------
async function pushLocalChanges(): Promise<boolean> {
  const outboxItems = await getOutboxItems();
  if (outboxItems.length === 0) return true;

  const accounts: Account[] = [];
  const categories: Category[] = [];
  const tags: Tag[] = [];
  const transactions: Transaction[] = [];
  const budgets: Budget[] = [];
  const loans: Loan[] = [];
  const loanRecords: LoanRecord[] = [];
  const planned: PlannedPaymentRule[] = [];

  outboxItems.forEach((item) => {
    switch (item.entityType) {
      case 'account':
        accounts.push(item.payload);
        break;
      case 'category':
        categories.push(item.payload);
        break;
      case 'tag':
        tags.push(item.payload);
        break;
      case 'transaction':
        transactions.push(item.payload);
        break;
      case 'budget':
        budgets.push(item.payload);
        break;
      case 'loan':
        loans.push(item.payload);
        break;
      case 'loanRecord':
        loanRecords.push(item.payload);
        break;
      case 'planned':
        planned.push(item.payload);
        break;
    }
  });

  const lastSyncTime = await getSyncMeta<string>('lastSyncTime');

  const payload = {
    lastSyncTime: lastSyncTime || null,
    accounts,
    categories,
    tags,
    transactions,
    budgets,
    loans,
    loanRecords,
    planned,
  };

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Sync Push failed with status: ${res.status}`);
  }

  // Remove processed items from outbox
  const ids = outboxItems.map((item) => item.id);
  await removeOutboxItems(ids);
  return true;
}

// -------------------------------------------------------------
// Pull Server Deltas (/api/sync GET)
// -------------------------------------------------------------
async function pullServerDeltas(): Promise<void> {
  const lastSyncTime = await getSyncMeta<string>('lastSyncTime');
  const url = lastSyncTime ? `/api/sync?since=${encodeURIComponent(lastSyncTime)}` : '/api/sync';

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sync Pull failed with status: ${res.status}`);
  }

  const data: SyncResponse = await res.json();
  const db = await getDB();

  // 1. Reconcile Accounts
  if (data.accounts && data.accounts.length > 0) {
    const tx = db.transaction('accounts', 'readwrite');
    for (const acc of data.accounts) {
      await tx.store.put(acc);
    }
    await tx.done;
  }

  // 2. Reconcile Categories
  if (data.categories && data.categories.length > 0) {
    const tx = db.transaction('categories', 'readwrite');
    for (const cat of data.categories) {
      await tx.store.put(cat);
    }
    await tx.done;
  }

  // 3. Reconcile Tags
  if (data.tags && data.tags.length > 0) {
    const tx = db.transaction('tags', 'readwrite');
    for (const tag of data.tags) {
      await tx.store.put(tag);
    }
    await tx.done;
  }

  // 4. Reconcile Transactions
  if (data.transactions && data.transactions.length > 0) {
    const tx = db.transaction('transactions', 'readwrite');
    for (const t of data.transactions) {
      await tx.store.put(t);
    }
    await tx.done;
  }

  // 5. Reconcile Budgets
  if (data.budgets && data.budgets.length > 0) {
    const tx = db.transaction('budgets', 'readwrite');
    for (const b of data.budgets) {
      await tx.store.put(b);
    }
    await tx.done;
  }

  // 6. Reconcile Loans
  if (data.loans && data.loans.length > 0) {
    const tx = db.transaction('loans', 'readwrite');
    for (const l of data.loans) {
      await tx.store.put(l);
    }
    await tx.done;
  }

  // 7. Reconcile Loan Records
  if (data.loanRecords && data.loanRecords.length > 0) {
    const tx = db.transaction('loan_records', 'readwrite');
    for (const r of data.loanRecords) {
      await tx.store.put(r);
    }
    await tx.done;
  }

  // 8. Reconcile Planned
  if (data.planned && data.planned.length > 0) {
    const tx = db.transaction('planned', 'readwrite');
    for (const p of data.planned) {
      await tx.store.put(p);
    }
    await tx.done;
  }

  // 9. Reconcile Settings
  if (data.settings) {
    const tx = db.transaction('settings', 'readwrite');
    await tx.store.put(data.settings);
    await tx.done;
  }

  // Save latest sync timestamp
  if (data.syncTime) {
    await setSyncMeta('lastSyncTime', data.syncTime);
    currentStatus.lastSyncTime = data.syncTime;
  }
}

// -------------------------------------------------------------
// Orchestrated Sync Runner
// -------------------------------------------------------------
export async function syncAll(): Promise<boolean> {
  if (isSyncingInProgress) return false;
  if (!navigator.onLine) {
    currentStatus.isOnline = false;
    currentStatus.pendingCount = await getOutboxCount();
    notifyListeners();
    return false;
  }

  isSyncingInProgress = true;
  currentStatus.isSyncing = true;
  currentStatus.error = null;
  notifyListeners();

  try {
    // Step 1: Push outbox mutations
    await pushLocalChanges();

    // Step 2: Pull deltas from server
    await pullServerDeltas();

    currentStatus.pendingCount = await getOutboxCount();
    currentStatus.error = null;
    window.dispatchEvent(new CustomEvent('ivy-data-updated'));
    return true;
  } catch (err: any) {
    console.warn('Sync failed:', err);
    currentStatus.error = err?.message || 'Sync error';
    return false;
  } finally {
    isSyncingInProgress = false;
    currentStatus.isSyncing = false;
    currentStatus.pendingCount = await getOutboxCount();
    notifyListeners();
  }
}

// -------------------------------------------------------------
// Initialize Auto-Sync Service & Listeners
// -------------------------------------------------------------
export async function initSyncEngine(): Promise<void> {
  if (typeof window === 'undefined') return;

  currentStatus.lastSyncTime = await getSyncMeta<string>('lastSyncTime');
  currentStatus.pendingCount = await getOutboxCount();
  notifyListeners();

  // Network state listeners
  window.addEventListener('online', () => {
    currentStatus.isOnline = true;
    notifyListeners();
    syncAll();
  });

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false;
    notifyListeners();
  });

  // Background Periodic Sync (every 2 minutes when tab is active)
  setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') {
      syncAll();
    }
  }, 2 * 60 * 1000);

  // Trigger initial sync if online
  if (navigator.onLine) {
    syncAll();
  }
}
