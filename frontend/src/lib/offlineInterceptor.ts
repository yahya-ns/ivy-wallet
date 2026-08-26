import {
  getDB,
  getLocalAccounts,
  putLocalAccount,
  getLocalCategories,
  putLocalCategory,
  getLocalTags,
  putLocalTag,
  getLocalTransactions,
  putLocalTransaction,
  getLocalBudgets,
  putLocalBudget,
  getLocalLoans,
  putLocalLoan,
  putLocalLoanRecord,
  getLocalPlanned,
  putLocalPlanned,
  getLocalSettings,
  putLocalSettings,
  addToOutbox,
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
import { syncAll } from './syncEngine';

// Helper to create synthetic Response
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline-Response': 'true',
    },
  });
}

// Compute balance for accounts from local transactions
async function enrichAccounts(accounts: Account[]): Promise<Account[]> {
  const transactions = await getLocalTransactions();
  return accounts.map((acc) => {
    let income = 0;
    let expense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME' && tx.accountId === acc.id) {
        income += tx.amount;
      } else if (tx.type === 'EXPENSE' && tx.accountId === acc.id) {
        expense += tx.amount;
      } else if (tx.type === 'TRANSFER') {
        if (tx.accountId === acc.id) expense += tx.amount;
        if (tx.toAccountId === acc.id) income += tx.toAmount || tx.amount;
      }
    });

    return {
      ...acc,
      balance: income - expense,
      totalIncome: income,
      totalExpense: expense,
    };
  });
}

// Compute reports from local transactions
async function generateLocalReports(months = 6): Promise<any> {
  const transactions = await getLocalTransactions();
  const categories = await getLocalCategories();
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalMonthIncome = 0;
  let totalMonthExpense = 0;
  const catExpenses: { [id: string]: number } = {};

  const monthlyData: { [m: string]: { income: number; expense: number } } = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = { income: 0, expense: 0 };
  }

  transactions.forEach((tx) => {
    const txDate = new Date(tx.dateTime);
    const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

    if (tx.type === 'INCOME') {
      if (txMonth === currentMonthPrefix) totalMonthIncome += tx.amount;
      if (monthlyData[txMonth]) monthlyData[txMonth].income += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      if (txMonth === currentMonthPrefix) {
        totalMonthExpense += tx.amount;
        if (tx.categoryId) {
          catExpenses[tx.categoryId] = (catExpenses[tx.categoryId] || 0) + tx.amount;
        }
      }
      if (monthlyData[txMonth]) monthlyData[txMonth].expense += tx.amount;
    }
  });

  const netSavings = totalMonthIncome - totalMonthExpense;
  const savingsRate = totalMonthIncome > 0 ? ((totalMonthIncome - totalMonthExpense) / totalMonthIncome) * 100 : 0;

  const categoryBreakdown = Object.entries(catExpenses).map(([id, amount]) => {
    const cat = catMap.get(id);
    return {
      id,
      name: cat ? cat.name : 'Unknown',
      color: cat ? cat.color : '#888',
      icon: cat ? cat.icon : 'HelpCircle',
      amount,
      percentage: totalMonthExpense > 0 ? (amount / totalMonthExpense) * 100 : 0,
    };
  }).sort((a, b) => b.amount - a.amount);

  const monthlyTrends = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
    net: data.income - data.expense,
  }));

  return {
    totalMonthIncome,
    totalMonthExpense,
    netSavings,
    savingsRate,
    categoryBreakdown,
    monthlyTrends,
  };
}

// Compute spent / remaining for budgets
async function enrichBudgets(budgets: Budget[]): Promise<Budget[]> {
  const transactions = await getLocalTransactions();
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return budgets.map((b) => {
    const catIds = b.categoryIds ? b.categoryIds.split(',').map((s) => s.trim()) : [];
    let spent = 0;

    transactions.forEach((tx) => {
      if (tx.type !== 'EXPENSE') return;
      const txMonth = tx.dateTime.substring(0, 7);
      if (b.period === 'MONTHLY' && txMonth !== currentMonthPrefix) return;

      if (catIds.length === 0 || (tx.categoryId && catIds.includes(tx.categoryId))) {
        spent += tx.amount;
      }
    });

    const remaining = Math.max(0, b.amount - spent);
    const percentage = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;

    return {
      ...b,
      spent,
      remaining,
      percentage,
    };
  });
}

// Compute remaining amount for loans
async function enrichLoans(loans: Loan[]): Promise<Loan[]> {
  return loans.map((l) => {
    const paidAmount = (l.records || []).reduce((sum, r) => sum + r.amount, 0);
    const remainingAmount = Math.max(0, l.amount - paidAmount);
    return {
      ...l,
      paidAmount,
      remainingAmount,
      isPaid: remainingAmount <= 0,
    };
  });
}

// Offline Request Handler
export async function handleOfflineRequest(url: string, init?: RequestInit): Promise<Response> {
  const parsedUrl = new URL(url, window.location.origin);
  const path = parsedUrl.pathname;
  const method = (init?.method || 'GET').toUpperCase();
  const query = parsedUrl.searchParams;

  const nowIso = new Date().toISOString();

  // 1. ACCOUNTS
  if (path === '/api/accounts' && method === 'GET') {
    const accounts = await getLocalAccounts();
    const enriched = await enrichAccounts(accounts);
    return jsonResponse(enriched);
  }

  if (path.startsWith('/api/accounts/') && method === 'GET') {
    const id = path.replace('/api/accounts/', '');
    const accounts = await getLocalAccounts();
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return jsonResponse({ error: 'Account not found' }, 404);
    const [enriched] = await enrichAccounts([acc]);
    return jsonResponse(enriched);
  }

  if (path === '/api/accounts' && method === 'POST') {
    const body = JSON.parse((init?.body as string) || '{}');
    const newAcc: Account = {
      id: crypto.randomUUID(),
      name: body.name || 'New Account',
      currency: body.currency || 'USD',
      color: body.color || '#5C3DF5',
      icon: body.icon || 'Wallet',
      orderNum: body.orderNum || 0,
      includeInBalance: body.includeInBalance !== false,
      isDeleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalAccount(newAcc);
    await addToOutbox({ entityType: 'account', action: 'UPSERT', payload: newAcc });
    return jsonResponse(newAcc, 201);
  }

  if (path.startsWith('/api/accounts/') && (method === 'PUT' || method === 'PATCH')) {
    const id = path.replace('/api/accounts/', '');
    const body = JSON.parse((init?.body as string) || '{}');
    const accounts = await getLocalAccounts();
    const existing = accounts.find((a) => a.id === id) || ({} as Account);
    const updated: Account = {
      ...existing,
      ...body,
      id,
      updatedAt: nowIso,
    };
    await putLocalAccount(updated);
    await addToOutbox({ entityType: 'account', action: 'UPSERT', payload: updated });
    return jsonResponse(updated);
  }

  if (path.startsWith('/api/accounts/') && method === 'DELETE') {
    const id = path.replace('/api/accounts/', '');
    const db = await getDB();
    const existing = await db.get('accounts', id);
    if (existing) {
      existing.isDeleted = true;
      existing.updatedAt = nowIso;
      await db.put('accounts', existing);
      await addToOutbox({ entityType: 'account', action: 'DELETE', payload: existing });
    }
    return jsonResponse({ success: true });
  }

  // 2. CATEGORIES
  if (path === '/api/categories' && method === 'GET') {
    const categories = await getLocalCategories();
    // Build nested subcategories
    const rootCats = categories.filter((c) => !c.parentId);
    const result = rootCats.map((root) => ({
      ...root,
      subcategories: categories.filter((c) => c.parentId === root.id),
    }));
    return jsonResponse(result);
  }

  if (path.startsWith('/api/categories/') && method === 'GET') {
    const id = path.replace('/api/categories/', '');
    const categories = await getLocalCategories();
    const cat = categories.find((c) => c.id === id);
    if (!cat) return jsonResponse({ error: 'Category not found' }, 404);
    cat.subcategories = categories.filter((c) => c.parentId === cat.id);
    return jsonResponse(cat);
  }

  if (path === '/api/categories' && method === 'POST') {
    const body = JSON.parse((init?.body as string) || '{}');
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: body.name || 'New Category',
      color: body.color || '#5C3DF5',
      icon: body.icon || 'Tag',
      orderNum: body.orderNum || 0,
      parentId: body.parentId || null,
      isDeleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalCategory(newCat);
    await addToOutbox({ entityType: 'category', action: 'UPSERT', payload: newCat });
    return jsonResponse(newCat, 201);
  }

  if (path.startsWith('/api/categories/') && (method === 'PUT' || method === 'PATCH')) {
    const id = path.replace('/api/categories/', '');
    const body = JSON.parse((init?.body as string) || '{}');
    const categories = await getLocalCategories();
    const existing = categories.find((c) => c.id === id) || ({} as Category);
    const updated: Category = {
      ...existing,
      ...body,
      id,
      updatedAt: nowIso,
    };
    await putLocalCategory(updated);
    await addToOutbox({ entityType: 'category', action: 'UPSERT', payload: updated });
    return jsonResponse(updated);
  }

  if (path.startsWith('/api/categories/') && method === 'DELETE') {
    const id = path.replace('/api/categories/', '');
    const db = await getDB();
    const existing = await db.get('categories', id);
    if (existing) {
      existing.isDeleted = true;
      existing.updatedAt = nowIso;
      await db.put('categories', existing);
      await addToOutbox({ entityType: 'category', action: 'DELETE', payload: existing });
    }
    return jsonResponse({ success: true });
  }

  // 3. TAGS
  if (path === '/api/tags' && method === 'GET') {
    const tags = await getLocalTags();
    const transactions = await getLocalTransactions();
    const enrichedTags = tags.map((tg) => {
      const count = transactions.filter((tx) =>
        tx.tagIds?.includes(tg.id) || tx.tags?.some((t) => t.id === tg.id)
      ).length;
      return { ...tg, transactionCount: count };
    });
    return jsonResponse(enrichedTags);
  }

  if (path.startsWith('/api/tags/') && method === 'GET') {
    const id = path.replace('/api/tags/', '');
    const tags = await getLocalTags();
    const tg = tags.find((t) => t.id === id);
    if (!tg) return jsonResponse({ error: 'Tag not found' }, 404);
    return jsonResponse(tg);
  }

  if (path === '/api/tags' && method === 'POST') {
    const body = JSON.parse((init?.body as string) || '{}');
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: body.name || 'New Tag',
      color: body.color || '#5C3DF5',
      orderNum: body.orderNum || 0,
      isDeleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalTag(newTag);
    await addToOutbox({ entityType: 'tag', action: 'UPSERT', payload: newTag });
    return jsonResponse(newTag, 201);
  }

  if (path.startsWith('/api/tags/') && (method === 'PUT' || method === 'PATCH')) {
    const id = path.replace('/api/tags/', '');
    const body = JSON.parse((init?.body as string) || '{}');
    const tags = await getLocalTags();
    const existing = tags.find((t) => t.id === id) || ({} as Tag);
    const updated: Tag = {
      ...existing,
      ...body,
      id,
      updatedAt: nowIso,
    };
    await putLocalTag(updated);
    await addToOutbox({ entityType: 'tag', action: 'UPSERT', payload: updated });
    return jsonResponse(updated);
  }

  if (path.startsWith('/api/tags/') && method === 'DELETE') {
    const id = path.replace('/api/tags/', '');
    const db = await getDB();
    const existing = await db.get('tags', id);
    if (existing) {
      existing.isDeleted = true;
      existing.updatedAt = nowIso;
      await db.put('tags', existing);
      await addToOutbox({ entityType: 'tag', action: 'DELETE', payload: existing });
    }
    return jsonResponse({ success: true });
  }

  // 4. TRANSACTIONS
  if (path === '/api/transactions' && method === 'GET') {
    let txs = await getLocalTransactions();
    const accounts = await getLocalAccounts();
    const categories = await getLocalCategories();
    const tags = await getLocalTags();

    const accMap = new Map(accounts.map((a) => [a.id, a]));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const tagMap = new Map(tags.map((t) => [t.id, t]));

    const search = query.get('search')?.toLowerCase();
    const type = query.get('type');
    const accountId = query.get('accountId');
    const categoryId = query.get('categoryId');
    const subcategoryId = query.get('subcategoryId');
    const tagId = query.get('tagId');
    const limit = query.get('limit') ? parseInt(query.get('limit')!, 10) : undefined;

    if (type && type !== 'ALL') txs = txs.filter((t) => t.type === type);
    if (accountId && accountId !== 'ALL') {
      txs = txs.filter((t) => t.accountId === accountId || t.toAccountId === accountId);
    }
    if (categoryId && categoryId !== 'ALL') txs = txs.filter((t) => t.categoryId === categoryId);
    if (subcategoryId && subcategoryId !== 'ALL') txs = txs.filter((t) => t.subcategoryId === subcategoryId);
    if (tagId && tagId !== 'ALL') {
      txs = txs.filter((t) => t.tagIds?.includes(tagId) || t.tags?.some((tg) => tg.id === tagId));
    }
    if (search) {
      txs = txs.filter(
        (t) =>
          t.title?.toLowerCase().includes(search) ||
          t.description?.toLowerCase().includes(search) ||
          catMap.get(t.categoryId || '')?.name.toLowerCase().includes(search)
      );
    }

    if (limit && limit > 0) {
      txs = txs.slice(0, limit);
    }

    // Attach relations
    const enriched = txs.map((t) => ({
      ...t,
      account: accMap.get(t.accountId),
      toAccount: t.toAccountId ? accMap.get(t.toAccountId) : undefined,
      category: t.categoryId ? catMap.get(t.categoryId) : undefined,
      subcategory: t.subcategoryId ? catMap.get(t.subcategoryId) : undefined,
      tags: t.tagIds ? t.tagIds.map((id) => tagMap.get(id)).filter(Boolean) as Tag[] : t.tags || [],
    }));

    return jsonResponse(enriched);
  }

  if (path === '/api/transactions' && method === 'POST') {
    const body = JSON.parse((init?.body as string) || '{}');
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      accountId: body.accountId,
      type: body.type || 'EXPENSE',
      amount: body.amount || 0,
      toAccountId: body.toAccountId || null,
      toAmount: body.toAmount || null,
      title: body.title || null,
      description: body.description || null,
      dateTime: body.dateTime || nowIso,
      categoryId: body.categoryId || null,
      subcategoryId: body.subcategoryId || null,
      tagIds: body.tagIds || [],
      isDeleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalTransaction(newTx);
    await addToOutbox({ entityType: 'transaction', action: 'UPSERT', payload: newTx });
    return jsonResponse(newTx, 201);
  }

  if (path.startsWith('/api/transactions/') && (method === 'PUT' || method === 'PATCH')) {
    const id = path.replace('/api/transactions/', '');
    const body = JSON.parse((init?.body as string) || '{}');
    const txs = await getLocalTransactions();
    const existing = txs.find((t) => t.id === id) || ({} as Transaction);
    const updated: Transaction = {
      ...existing,
      ...body,
      id,
      updatedAt: nowIso,
    };
    await putLocalTransaction(updated);
    await addToOutbox({ entityType: 'transaction', action: 'UPSERT', payload: updated });
    return jsonResponse(updated);
  }

  if (path.startsWith('/api/transactions/') && method === 'DELETE') {
    const id = path.replace('/api/transactions/', '');
    const db = await getDB();
    const existing = await db.get('transactions', id);
    if (existing) {
      existing.isDeleted = true;
      existing.updatedAt = nowIso;
      await db.put('transactions', existing);
      await addToOutbox({ entityType: 'transaction', action: 'DELETE', payload: existing });
    }
    return jsonResponse({ success: true });
  }

  // 5. BUDGETS
  if (path === '/api/budgets' && method === 'GET') {
    const budgets = await getLocalBudgets();
    const enriched = await enrichBudgets(budgets);
    return jsonResponse(enriched);
  }

  if (path === '/api/budgets' && method === 'POST') {
    const body = JSON.parse((init?.body as string) || '{}');
    const newBudget: Budget = {
      id: crypto.randomUUID(),
      name: body.name || 'New Budget',
      amount: body.amount || 0,
      categoryIds: body.categoryIds || null,
      accountIds: body.accountIds || null,
      period: body.period || 'MONTHLY',
      orderId: body.orderId || 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalBudget(newBudget);
    await addToOutbox({ entityType: 'budget', action: 'UPSERT', payload: newBudget });
    return jsonResponse(newBudget, 201);
  }

  if (path.startsWith('/api/budgets/') && (method === 'PUT' || method === 'PATCH')) {
    const id = path.replace('/api/budgets/', '');
    const body = JSON.parse((init?.body as string) || '{}');
    const budgets = await getLocalBudgets();
    const existing = budgets.find((b) => b.id === id) || ({} as Budget);
    const updated: Budget = {
      ...existing,
      ...body,
      id,
      updatedAt: nowIso,
    };
    await putLocalBudget(updated);
    await addToOutbox({ entityType: 'budget', action: 'UPSERT', payload: updated });
    return jsonResponse(updated);
  }

  if (path.startsWith('/api/budgets/') && method === 'DELETE') {
    const id = path.replace('/api/budgets/', '');
    const db = await getDB();
    await db.delete('budgets', id);
    await addToOutbox({ entityType: 'budget', action: 'DELETE', payload: { id } });
    return jsonResponse({ success: true });
  }

  // 6. LOANS
  if (path === '/api/loans' && method === 'GET') {
    const loans = await getLocalLoans();
    const enriched = await enrichLoans(loans);
    return jsonResponse(enriched);
  }

  if (path === '/api/loans' && method === 'POST') {
    const body = JSON.parse((init?.body as string) || '{}');
    const newLoan: Loan = {
      id: crypto.randomUUID(),
      name: body.name || 'New Loan',
      amount: body.amount || 0,
      type: body.type || 'LEND',
      color: body.color || '#5C3DF5',
      icon: body.icon || 'Coins',
      accountId: body.accountId || null,
      note: body.note || null,
      dateTime: body.dateTime || nowIso,
      dueDate: body.dueDate || null,
      isPaid: false,
      isDeleted: false,
      records: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalLoan(newLoan);
    await addToOutbox({ entityType: 'loan', action: 'UPSERT', payload: newLoan });
    return jsonResponse(newLoan, 201);
  }

  if (path.includes('/records') && method === 'POST') {
    // /api/loans/:id/records
    const loanId = path.split('/')[3];
    const body = JSON.parse((init?.body as string) || '{}');
    const newRecord: LoanRecord = {
      id: crypto.randomUUID(),
      loanId,
      amount: body.amount || 0,
      dateTime: body.dateTime || nowIso,
      note: body.note || null,
      accountId: body.accountId || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalLoanRecord(newRecord);
    await addToOutbox({ entityType: 'loanRecord', action: 'UPSERT', payload: newRecord });
    return jsonResponse(newRecord, 201);
  }

  if (path.startsWith('/api/loans/') && method === 'DELETE') {
    const id = path.replace('/api/loans/', '');
    const db = await getDB();
    const existing = await db.get('loans', id);
    if (existing) {
      existing.isDeleted = true;
      existing.updatedAt = nowIso;
      await db.put('loans', existing);
      await addToOutbox({ entityType: 'loan', action: 'DELETE', payload: existing });
    }
    return jsonResponse({ success: true });
  }

  // 7. PLANNED RULES
  if (path === '/api/planned' && method === 'GET') {
    const planned = await getLocalPlanned();
    return jsonResponse(planned);
  }

  if (path === '/api/planned' && method === 'POST') {
    const body = JSON.parse((init?.body as string) || '{}');
    const newPlanned: PlannedPaymentRule = {
      id: crypto.randomUUID(),
      startDate: body.startDate || nowIso,
      intervalN: body.intervalN || 1,
      intervalType: body.intervalType || 'MONTH',
      oneTime: body.oneTime || false,
      type: body.type || 'EXPENSE',
      accountId: body.accountId,
      amount: body.amount || 0,
      categoryId: body.categoryId || null,
      title: body.title || null,
      description: body.description || null,
      isActive: body.isActive !== false,
      isDeleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await putLocalPlanned(newPlanned);
    await addToOutbox({ entityType: 'planned', action: 'UPSERT', payload: newPlanned });
    return jsonResponse(newPlanned, 201);
  }

  if (path.startsWith('/api/planned/') && method === 'DELETE') {
    const id = path.replace('/api/planned/', '');
    const db = await getDB();
    const existing = await db.get('planned', id);
    if (existing) {
      existing.isDeleted = true;
      existing.updatedAt = nowIso;
      await db.put('planned', existing);
      await addToOutbox({ entityType: 'planned', action: 'DELETE', payload: existing });
    }
    return jsonResponse({ success: true });
  }

  // 8. REPORTS
  if (path === '/api/reports' && method === 'GET') {
    const months = query.get('months') ? parseInt(query.get('months')!, 10) : 6;
    const reports = await generateLocalReports(months);
    return jsonResponse(reports);
  }

  // 9. SETTINGS
  if (path === '/api/settings' && method === 'GET') {
    const settings = await getLocalSettings();
    if (settings) return jsonResponse(settings);
    // Default fallback
    return jsonResponse({
      id: 'default',
      theme: 'DARK',
      currency: 'USD',
      bufferAmount: 0,
      name: 'Ivy User',
      firstDayOfWeek: 1,
      hideBalance: false,
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24_HOUR',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  if (path === '/api/settings' && (method === 'PUT' || method === 'PATCH')) {
    const body = JSON.parse((init?.body as string) || '{}');
    const existing = (await getLocalSettings()) || ({} as Settings);
    const updated: Settings = {
      ...existing,
      ...body,
      id: existing.id || 'default',
      updatedAt: nowIso,
    };
    await putLocalSettings(updated);
    return jsonResponse(updated);
  }

  // Fallback 404 for unknown API paths
  return jsonResponse({ error: 'Endpoint not found in offline handler' }, 404);
}

// -------------------------------------------------------------
// Global Window Fetch Interceptor Setup
// -------------------------------------------------------------
let isInterceptorInstalled = false;

export function installOfflineFetchInterceptor(): void {
  if (typeof window === 'undefined' || isInterceptorInstalled) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Only intercept /api/* calls (excluding /api/sync which handles syncing directly)
    if (urlString.startsWith('/api') || urlString.includes('/api/')) {
      if (urlString.includes('/api/sync')) {
        return originalFetch(input, init);
      }

      // If offline: fulfill immediately from IndexedDB
      if (!navigator.onLine) {
        return handleOfflineRequest(urlString, init);
      }

      // If online: attempt normal network request
      try {
        const response = await originalFetch(input, init);
        // If server returns error 502/503/504 (server temporarily unreachable), fall back to offline DB
        if (!response.ok && [502, 503, 504].includes(response.status)) {
          return handleOfflineRequest(urlString, init);
        }
        return response;
      } catch (networkError) {
        // Network failure (e.g. connection dropped or timeout) -> fulfill from offline DB
        console.warn('Network fetch failed, serving from local IndexedDB:', urlString);
        return handleOfflineRequest(urlString, init);
      }
    }

    return originalFetch(input, init);
  };

  isInterceptorInstalled = true;
}
