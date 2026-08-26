export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";
export type LoanType = "BORROW" | "LEND";
export type ThemeMode = "LIGHT" | "DARK" | "TRUE_BLACK";
export type BudgetPeriod = "MONTHLY" | "WEEKLY" | "ONE_TIME";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: "oidc" | "local" | "dev" | string;
  role: "admin" | "user" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthConfig {
  authEnabled: boolean;
  oidcEnabled: boolean;
  oidcProviderName: string;
  localAuthEnabled: boolean;
  allowRegistration: boolean;
  devLoginEnabled: boolean;
}

export interface Account {
  id: string;
  userId?: string;
  name: string;
  currency: string;
  color: string;
  icon: string;
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
  userId?: string;
  name: string;
  color: string;
  icon: string;
  orderNum: number;
  parentId?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  subcategories?: Category[];
  parent?: Category;
}

export interface Tag {
  id: string;
  userId?: string;
  name: string;
  color: string;
  orderNum: number;
  isDeleted: boolean;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId?: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  toAccountId?: string | null;
  toAmount?: number | null;
  title?: string | null;
  description?: string | null;
  dateTime: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  dueDate?: string | null;
  recurringRuleId?: string | null;
  loanId?: string | null;
  loanRecordId?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  subcategory?: Category;
  tags?: Tag[];
  tagIds?: string[];
}

export interface Budget {
  id: string;
  userId?: string;
  name: string;
  amount: number;
  categoryIds?: string | null;
  accountIds?: string | null;
  period: BudgetPeriod;
  orderId: number;
  spent?: number;
  remaining?: number;
  percentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoanRecord {
  id: string;
  userId?: string;
  loanId: string;
  amount: number;
  dateTime: string;
  note?: string | null;
  accountId?: string | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  account?: Account;
}

export interface Loan {
  id: string;
  userId?: string;
  name: string;
  amount: number;
  type: LoanType;
  color: string;
  icon: string;
  accountId?: string | null;
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
  account?: Account;
}

export interface PlannedPaymentRule {
  id: string;
  userId?: string;
  startDate: string;
  intervalN: number;
  intervalType: string;
  oneTime: boolean;
  type: TransactionType;
  accountId: string;
  amount: number;
  categoryId?: string | null;
  title?: string | null;
  description?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  account?: Account;
  category?: Category;
}

export type DateFormatOption =
  | "YYYY-MM-DD"
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "DD-MM-YYYY"
  | "DD.MM.YYYY"
  | "d MMM yyyy"
  | "MMM d, yyyy"
  | "EEEE, d MMMM yyyy";

export type TimeFormatOption = "12_HOUR" | "24_HOUR";

export interface Settings {
  id: string;
  userId?: string;
  theme: ThemeMode;
  currency: string;
  bufferAmount: number;
  name: string;
  firstDayOfWeek: number;
  hideBalance: boolean;
  dateFormat?: string;
  timeFormat?: string;
  createdAt: string;
  updatedAt: string;
}
