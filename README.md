# 🌿 Ivy Wallet — Web Edition

<p align="center">
  <img src="frontend/public/icon.svg" alt="Ivy Wallet Logo" width="100" height="100" />
</p>

<p align="center">
  <b>Ultra-lightweight, blazing-fast personal money manager & expense tracker.</b><br>
  Built with <b>Go (Golang) + Multi-Database (SQLite / PostgreSQL / MariaDB)</b> backend & <b>Vite SPA (React + Tailwind)</b> frontend embedded into a single, zero-dependency static binary (~15MB RAM).
</p>

---

## ✨ Features

- ⚡ **Ultra Lightweight & Blazing Fast**: Single static Go binary (~14MB) with sub-3ms response times.
- 🗄️ **Multi-Database Support**: Out-of-the-box support for **SQLite** (default), **PostgreSQL**, and **MariaDB / MySQL**, configured via environment variables.
- 📱 **Mobile & Cloud Sync Ready**: Built-in delta synchronization endpoint (`/api/sync`) supporting multi-device and mobile app offline sync.
- 📊 **Rich Dashboard**: Net worth overview, monthly income/expense flow, spending breakdown donut charts, and multi-month cashflow trends.
- 💳 **Accounts & Wallets**: Manage cash, bank accounts, cards, and crypto wallets with customizable colors, icons, and currencies.
- 🏷️ **Custom Categories**: Vibrant category management with custom icons and color schemes.
- 🎯 **Budgets & Spending Limits**: Set monthly or weekly spending limits per category with visual real-time progress bars.
- 🤝 **Loans & Debts (Borrow/Lend)**: Track who owes you and who you owe with partial repayments and installment tracking.
- 🔄 **Planned & Recurring Payments**: Automate reminders for subscriptions (Netflix, Spotify), bills, and monthly salary.
- 🎨 **Adaptive Ivy Themes**:
  - **Light Theme**: Clean, high-contrast design.
  - **Dark Theme**: Modern dark aesthetic.
  - **OLED True Black**: Pitch-black theme optimized for OLED displays.
- 🔒 **100% Private & Self-Hosted**: All data stored locally or on your private database instance.
- 💾 **Data Portability**: Full JSON backup/restore and CSV export for spreadsheets.

---

## 🛠️ Architecture & Tech Stack

```
ivy-wallet/
├── backend/                   # Go REST API Server + Embedded SPA + Multi-DB Engine
│   ├── cmd/server/main.go     # Chi Router & //go:embed static SPA
│   └── internal/
│       ├── config/            # Environment variable configuration (DB_TYPE, DATABASE_URL)
│       ├── database/          # Multi-DB Engine (SQLite, PostgreSQL, MariaDB) & migrations
│       ├── handlers/          # REST Handlers (accounts, transactions, sync, reports, etc.)
│       └── models/            # Go domain models & JSON schemas
├── frontend/                  # Lightweight Vite SPA
│   ├── src/
│   │   ├── components/        # Ivy UI Design System (Cards, Modals, Charts, Nav)
│   │   ├── pages/             # Dashboard, Transactions, Budgets, Loans, Reports
│   │   └── lib/               # Types, utils, theme provider, API client
├── Dockerfile                 # Multi-stage container build (~15MB Alpine runtime)
├── docker-compose.yml         # One-command self-hosting setup (SQLite / Postgres / MariaDB)
└── .github/workflows/         # Automated GitHub Actions CI/CD to GHCR
```

---

## 🗄️ Database Configuration (Environment Variables)

Ivy Wallet supports **SQLite**, **PostgreSQL**, and **MariaDB / MySQL**. You can select your database engine by setting `DB_TYPE` and the corresponding connection variables:

### 1. SQLite (Default)
No external database server required.
```env
DB_TYPE=sqlite
DATA_DIR=/data
DB_PATH=/data/ivy-wallet.db
```

### 2. PostgreSQL
Connect using a full connection string or individual environment variables:
```env
DB_TYPE=postgres
DATABASE_URL=postgres://user:password@localhost:5432/ivy_wallet?sslmode=disable
```
*Or using separate variables:*
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=ivy_wallet
DB_SSLMODE=disable
```

### 3. MariaDB / MySQL
Connect using a DSN connection string or individual environment variables:
```env
DB_TYPE=mariadb
DATABASE_URL=user:password@tcp(localhost:3306)/ivy_wallet?parseTime=true&charset=utf8mb4
```
*Or using separate variables:*
```env
DB_TYPE=mariadb
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=ivy_wallet
```

---

## 🚀 Quick Start (Docker)

### Using Docker Compose

```bash
docker compose up -d
```
Open **`http://localhost:3000`** in your browser.

---

## 💻 Local Development

### Prerequisites
- **Go 1.24+**
- **Node.js 20+** & **npm**

### 1. Build Frontend
```bash
cd frontend
npm install
npm run build
```
*Assets are built directly into `backend/cmd/server/dist`.*

### 2. Run Backend
```bash
cd backend
go run ./cmd/server
```

Open **`http://localhost:3000`**.

---

## 📡 REST API & Cloud Sync Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/accounts` | `GET`, `POST`, `PUT`, `DELETE` | Manage accounts & calculate live balances |
| `/api/categories` | `GET`, `POST`, `PUT`, `DELETE` | Manage category tags & icons |
| `/api/transactions`| `GET`, `POST`, `PUT`, `DELETE` | Expense, Income, Transfer records |
| `/api/budgets` | `GET`, `POST`, `PUT`, `DELETE` | Category budget targets |
| `/api/loans` | `GET`, `POST`, `PUT`, `DELETE` | Borrow / Lend tracker |
| `/api/loans/:id/records` | `POST` | Add loan repayment record |
| `/api/planned` | `GET`, `POST`, `PUT`, `DELETE` | Recurring subscriptions |
| `/api/reports` | `GET` | Aggregated analytics & trends |
| `/api/settings` | `GET`, `PATCH` | Theme, currency, and preferences |
| `/api/backup` | `GET`, `POST` | JSON/CSV export & restore |
| `/api/sync` | `GET`, `POST` | Mobile / Multi-client delta synchronization |

---

## 📦 CI/CD & Automated Deployment

Every push to the **`web-app`** branch automatically triggers the GitHub Actions workflow [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) to build multi-arch (`linux/amd64`, `linux/arm64`) container images and publish them to GitHub Container Registry (`ghcr.io`).

---

## 📜 License

Licensed under the [GNU General Public License v3.0](LICENSE).
