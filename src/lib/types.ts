export type ThemeMode = "LIGHT" | "DARK" | "TRUE_BLACK";

export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export type LoanType = "BORROW" | "LEND";

export type IntervalType = "DAY" | "WEEK" | "MONTH" | "YEAR";

export interface Account {
  id: string;
  name: string;
  currency: string;
  color: string;
  icon?: string | null;
  orderNum: number;
  includeInBalance: boolean;
  isDeleted: boolean;
  balance?: number;
  totalIncome?: number;
  totalExpense?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  orderNum: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  toAccountId?: string | null;
  toAmount?: number | null;
  title?: string | null;
  description?: string | null;
  dateTime: string;
  categoryId?: string | null;
  dueDate?: string | null;
  recurringRuleId?: string | null;
  loanId?: string | null;
  loanRecordId?: string | null;
  isDeleted: boolean;
  account?: Account | null;
  toAccount?: Account | null;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  categoryIds?: string | null; // JSON array or null
  accountIds?: string | null;
  orderId: number;
  period: string;
  spent?: number;
  remaining?: number;
  percentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoanRecord {
  id: string;
  loanId: string;
  amount: number;
  dateTime: string;
  note?: string | null;
  accountId?: string | null;
  account?: Account | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  name: string;
  amount: number;
  type: LoanType;
  color: string;
  icon?: string | null;
  orderNum: number;
  accountId?: string | null;
  account?: Account | null;
  note?: string | null;
  dateTime: string;
  dueDate?: string | null;
  isPaid: boolean;
  isDeleted: boolean;
  paidAmount?: number;
  remainingAmount?: number;
  records?: LoanRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PlannedPaymentRule {
  id: string;
  startDate: string;
  intervalN?: number | null;
  intervalType?: IntervalType | null;
  oneTime: boolean;
  type: TransactionType;
  accountId: string;
  account?: Account | null;
  amount: number;
  categoryId?: string | null;
  category?: Category | null;
  title?: string | null;
  description?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  theme: ThemeMode;
  currency: string;
  bufferAmount: number;
  name: string;
  firstDayOfWeek: number;
  hideBalance: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  currency: string;
  rate: number;
  updatedAt: string;
}
