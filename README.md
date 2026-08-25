# Ivy Wallet — Web Edition 🌿💰

> **A modern, private, and full-stack money manager web application.**  
> Faithfully reworked from the original Ivy Wallet mobile app into a full-featured web experience with backend, frontend, database persistence, and automated container deployment.

---

## 🌟 Overview & Philosophy

**Ivy Wallet Web Edition** brings the beloved design, ease of use, and privacy of the Android Ivy Wallet app to the browser. It allows you to track expenses, incomes, multi-account net worth, monthly budgets, debt/loan repayments, and recurring subscription bills with zero cloud dependency.

- **Offline-First & Self-Hostable**: All financial records are stored securely in your private SQLite database (`ivy-wallet.db`).
- **Faithful Ivy UI/UX**: Distinctive curved card aesthetics (`24px` radius), Ivy color tokens, responsive mobile bottom bar, and desktop sidebar navigation.
- **3-Mode Theme System**: **Light**, **Dark** (Ivy Signature Dark), and **True Black** (Pure OLED mode).
- **One-Tap Privacy**: Hide or reveal account balances and amounts (`••••••`) across the entire app with a single click.

---

## 🚀 Key Features

### 1. 📊 Financial Dashboard
- **Hero Balance Card**: Total net worth calculation across all active wallets, plus current month's income and expense summary.
- **Interactive Accounts Slider**: Scrollable carousel showing cards with individual balances, currencies, and color-coded badges.
- **Category Spending Donut Chart**: Visual distribution of monthly expenses ranked by amount and percentage.
- **Recent Activity Feed**: Quick glance at the latest financial transactions with instant edit/delete controls.

### 2. 💳 Multi-Account & Net Worth Management
- Manage multiple accounts: Cash, Bank Accounts, Debit/Credit Cards, Savings, and Crypto.
- Support for multi-currency tracking (USD, EUR, IDR, GBP, JPY, CAD, AUD, etc.).
- Option to toggle **"Include in Total Balance"** per account.
- Live balance aggregation calculated dynamically from transactions and transfers.

### 3. 💸 Advanced Transaction Ledger
- Record **Expenses**, **Incomes**, and **Transfers** between accounts.
- Filter transactions by type, account, category, and date range.
- Real-time text search through titles, descriptions, and notes.
- Grouped activity feed by relative dates (*Today*, *Yesterday*, *Last week*, etc.).

### 4. 🏷 Categories Customization
- Pre-populated with standard default categories (Food & Dining, Groceries, Shopping, Transport, Bills, Salary, Entertainment, Health, etc.).
- Create, edit, and delete custom categories.
- Personalized color palettes and dynamic Lucide icon picker.

### 5. 🎯 Monthly Budgets & Spending Limits
- Set monthly or custom period spending limits per category or across all expenses.
- Visual progress bars with dynamic status indicators:
  - 🟢 **Safe** (<80% spent)
  - 🟠 **Warning** (80% - 100% spent)
  - 🔴 **Over Budget** (>100% spent with overage amount)

### 6. 🤝 Loans & Debt Tracker (I Owe / Owed to Me)
- Track money you **borrowed** (debts to pay back) and money you **lent** (receivables to collect).
- Record partial repayments with automatic calculation of remaining debt.
- Optional synchronization: automatic transaction creation when loan or repayment is recorded.

### 7. ⏰ Planned Payments & Subscriptions
- Automate recurring bills, salaries, rent, and subscription services (e.g. Netflix, Spotify, Gym).
- Configurable recurrence intervals (Daily, Weekly, Monthly, Yearly).
- **"Pay Now"** instant execution to record the scheduled payment with one click.

### 8. 📈 Analytics & Cash Flow Reports
- Key metrics: Monthly Income, Monthly Expense, Net Savings, and Savings Rate (%).
- Multi-month interactive cash flow bar charts (3, 6, or 12 months) comparing income vs expense.
- Category breakdown with expense percentage contribution.

### 9. 💾 Backup, Export & Import
- **JSON Full Backup**: Export complete database records and restore anytime.
- **CSV Transaction Export**: Export transactions for spreadsheet analysis (Excel, Google Sheets).

---

## 🛠 Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 15 Web App                   │
│  (React 19, TypeScript, Tailwind CSS, App Router)     │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
        ┌───────▼────────┐      ┌────────▼────────┐
        │   UI Components│      │  REST API Route │
        │  (Client Side) │      │ (Server Engine) │
        └────────────────┘      └────────┬────────┘
                                         │
                                ┌────────▼────────┐
                                │   Prisma ORM    │
                                └────────┬────────┘
                                         │
                                ┌────────▼────────┐
                                │  SQLite Engine  │
                                │ (ivy-wallet.db) │
                                └─────────────────┘
```

- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS, Lucide React, Recharts, Date-fns.
- **Backend & API**: Next.js API Route Handlers with RESTful endpoints.
- **Database & ORM**: SQLite (`dev.db` locally / `/app/data/ivy-wallet.db` in Docker) managed via **Prisma ORM**.
- **Deployment**: Standalone Docker image (Alpine Linux Node 22) + GitHub Actions CI/CD to GitHub Container Registry (GHCR).

---

## 📁 Project Structure

```
.
├── src/
│   ├── app/                      # Next.js App Router Pages & API Routes
│   │   ├── accounts/             # Accounts management page
│   │   ├── api/                  # RESTful API endpoints
│   │   │   ├── accounts/         # Account CRUD & balance engine
│   │   │   ├── backup/           # JSON/CSV export and import
│   │   │   ├── budgets/          # Budget limit calculations
│   │   │   ├── categories/       # Category management
│   │   │   ├── loans/            # Loan & repayment tracking
│   │   │   ├── planned/          # Recurring subscriptions
│   │   │   ├── reports/          # Cashflow trends & breakdown
│   │   │   ├── settings/         # Theme & preference settings
│   │   │   └── transactions/     # Transaction ledger & filters
│   │   ├── budgets/              # Budget progress page
│   │   ├── categories/           # Category customization page
│   │   ├── loans/                # Debts & lending tracker page
│   │   ├── planned/              # Planned payments page
│   │   ├── reports/              # Analytics & chart reports
│   │   ├── settings/             # Theme switcher & backup tools
│   │   ├── transactions/         # Filterable activity feed
│   │   ├── globals.css           # Ivy CSS design tokens & themes
│   │   ├── layout.tsx            # Global layout with ThemeProvider
│   │   └── page.tsx              # Main Dashboard overview
│   ├── components/               # Modular UI Components
│   │   ├── account/              # Account creation/edit modal
│   │   ├── dashboard/            # Balance card, accounts carousel, pie chart
│   │   ├── navigation/           # Sidebar, bottom nav, header, app shell
│   │   ├── theme/                # ThemeProvider context
│   │   ├── transaction/          # Transaction item row & create modal
│   │   └── ui/                   # IvyCard, IvyButton, IvyIcon, IvyModal, ThemeSwitch
│   └── lib/                      # Utilities, constants, types, Prisma client
├── prisma/
│   ├── schema.prisma             # SQLite schema definition
│   └── seed.ts                   # Initial categories, accounts & sample data
├── public/                       # PWA manifest & vector assets
├── android-legacy/               # Archived Android Kotlin codebase (ignored)
├── Dockerfile                    # Multi-stage standalone Alpine container
├── docker-compose.yml            # Container orchestration with volume persistence
├── docker-entrypoint.sh          # Auto migration & database initializer
└── .github/workflows/
    └── docker-publish.yml        # GitHub Actions CI/CD pipeline
```

---

## 🏃 Getting Started Locally

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **npm** or **pnpm** / **yarn**

### Step-by-Step Setup

1. **Clone & Switch to `web-app` Branch**:
   ```bash
   git clone https://github.com/yahya-ns/ivy-wallet.git
   cd ivy-wallet
   git checkout web-app
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Initialize Database & Seed Default Data**:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Access the App**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

Run the entire application in a self-contained environment with persistent storage:

```bash
# Build and start container in background
docker compose up -d --build
```

The app will be accessible at `http://localhost:3000`. Database data is persisted inside the `ivy_data` named volume (`/app/data/ivy-wallet.db`).

To stop the container:
```bash
docker compose down
```

---

## 🔄 GitHub Actions CI/CD

This repository includes an automated GitHub Actions workflow (`.github/workflows/docker-publish.yml`) configured specifically for the `web-app` branch:

- **Trigger**: Every push to branch `web-app` or tag release (`v*.*.*`).
- **Registry**: [GitHub Container Registry (GHCR)](https://ghcr.io).
- **Image**: `ghcr.io/yahya-ns/ivy-wallet:web-app`
- **Multi-Arch**: Supports `linux/amd64` and `linux/arm64`.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)** — see the [LICENSE](LICENSE) file for details.
