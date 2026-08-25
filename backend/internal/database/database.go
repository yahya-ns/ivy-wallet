package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
}

func Connect(dbPath string) (*DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Recommended SQLite production PRAGMAs
	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA busy_timeout=5000;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA foreign_keys=ON;",
	}

	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			log.Printf("Warning: failed to execute pragma '%s': %v", p, err)
		}
	}

	dbWrapper := &DB{db}
	if err := dbWrapper.migrate(); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	if err := dbWrapper.seed(); err != nil {
		log.Printf("Warning: seed failed: %v", err)
	}

	return dbWrapper, nil
}

func (db *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS settings (
		id TEXT PRIMARY KEY,
		theme TEXT NOT NULL DEFAULT 'DARK',
		currency TEXT NOT NULL DEFAULT 'USD',
		buffer_amount REAL NOT NULL DEFAULT 0.0,
		name TEXT NOT NULL DEFAULT 'My Ivy Wallet',
		first_day_of_week INTEGER NOT NULL DEFAULT 1,
		hide_balance INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS accounts (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		currency TEXT NOT NULL DEFAULT 'USD',
		color TEXT NOT NULL DEFAULT '#5C3DF5',
		icon TEXT NOT NULL DEFAULT 'wallet',
		order_num INTEGER NOT NULL DEFAULT 0,
		include_in_balance INTEGER NOT NULL DEFAULT 1,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS categories (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		color TEXT NOT NULL DEFAULT '#12B880',
		icon TEXT NOT NULL DEFAULT 'tag',
		order_num INTEGER NOT NULL DEFAULT 0,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS transactions (
		id TEXT PRIMARY KEY,
		account_id TEXT NOT NULL,
		type TEXT NOT NULL, -- EXPENSE, INCOME, TRANSFER
		amount REAL NOT NULL,
		to_account_id TEXT,
		to_amount REAL,
		title TEXT,
		description TEXT,
		date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		category_id TEXT,
		due_date DATETIME,
		recurring_rule_id TEXT,
		loan_id TEXT,
		loan_record_id TEXT,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
		FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS budgets (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		amount REAL NOT NULL,
		category_ids TEXT,
		account_ids TEXT,
		period TEXT NOT NULL DEFAULT 'MONTHLY',
		order_id INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS loans (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		amount REAL NOT NULL,
		type TEXT NOT NULL, -- BORROW, LEND
		color TEXT NOT NULL DEFAULT '#F53D3D',
		icon TEXT NOT NULL DEFAULT 'hand-coins',
		account_id TEXT,
		note TEXT,
		date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		due_date DATETIME,
		is_paid INTEGER NOT NULL DEFAULT 0,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS loan_records (
		id TEXT PRIMARY KEY,
		loan_id TEXT NOT NULL,
		amount REAL NOT NULL,
		date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		note TEXT,
		account_id TEXT,
		transaction_id TEXT,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
		FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS planned_payment_rules (
		id TEXT PRIMARY KEY,
		start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		interval_n INTEGER NOT NULL DEFAULT 1,
		interval_type TEXT NOT NULL DEFAULT 'MONTH',
		one_time INTEGER NOT NULL DEFAULT 0,
		type TEXT NOT NULL DEFAULT 'EXPENSE',
		account_id TEXT NOT NULL,
		amount REAL NOT NULL,
		category_id TEXT,
		title TEXT,
		description TEXT,
		is_active INTEGER NOT NULL DEFAULT 1,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
	);

	CREATE INDEX IF NOT EXISTS idx_transactions_datetime ON transactions(date_time);
	CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
	CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
	`

	_, err := db.Exec(schema)
	return err
}

func (db *DB) seed() error {
	// 1. Seed Settings if not exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM settings").Scan(&count)
	if err != nil || count == 0 {
		_, _ = db.Exec(`
			INSERT OR IGNORE INTO settings (id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance)
			VALUES (?, 'DARK', 'USD', 0.0, 'My Ivy Wallet', 1, 0)
		`, uuid.NewString())
	}

	// 2. Seed Categories if empty
	err = db.QueryRow("SELECT COUNT(*) FROM categories WHERE is_deleted = 0").Scan(&count)
	if err == nil && count == 0 {
		defaultCategories := []struct {
			name  string
			color string
			icon  string
			order int
		}{
			{"Food & Dining", "#F57A3D", "utensils", 1},
			{"Groceries", "#12B880", "shopping-cart", 2},
			{"Shopping", "#5C3DF5", "shopping-bag", 3},
			{"Transportation", "#3193F5", "car", 4},
			{"Housing & Rent", "#F5D018", "home", 5},
			{"Entertainment", "#F53D7A", "gamepad-2", 6},
			{"Health & Medical", "#F53D3D", "heart-pulse", 7},
			{"Education", "#3DF5CA", "graduation-cap", 8},
			{"Salary & Income", "#12B880", "wallet", 9},
			{"Investments", "#5C3DF5", "trending-up", 10},
			{"Bills & Utilities", "#F5D018", "zap", 11},
			{"Personal Care", "#933DF5", "smile", 12},
		}

		for _, cat := range defaultCategories {
			id := uuid.NewString()
			_, _ = db.Exec(`
				INSERT INTO categories (id, name, color, icon, order_num)
				VALUES (?, ?, ?, ?, ?)
			`, id, cat.name, cat.color, cat.icon, cat.order)
		}
	}

	// 3. Seed Sample Accounts if empty
	err = db.QueryRow("SELECT COUNT(*) FROM accounts WHERE is_deleted = 0").Scan(&count)
	if err == nil && count == 0 {
		defaultAccounts := []struct {
			name     string
			currency string
			color    string
			icon     string
			order    int
		}{
			{"Cash Wallet", "USD", "#12B880", "wallet", 1},
			{"Main Bank Card", "USD", "#5C3DF5", "credit-card", 2},
			{"Savings Vault", "USD", "#3193F5", "piggy-bank", 3},
		}

		for _, acc := range defaultAccounts {
			id := uuid.NewString()
			_, _ = db.Exec(`
				INSERT INTO accounts (id, name, currency, color, icon, order_num, include_in_balance)
				VALUES (?, ?, ?, ?, ?, ?, 1)
			`, id, acc.name, acc.currency, acc.color, acc.icon, acc.order)
		}

		// Add sample initial transactions
		var bankId, cashId string
		_ = db.QueryRow("SELECT id FROM accounts WHERE name = 'Main Bank Card'").Scan(&bankId)
		_ = db.QueryRow("SELECT id FROM accounts WHERE name = 'Cash Wallet'").Scan(&cashId)

		var salaryCatId, foodCatId, grocCatId string
		_ = db.QueryRow("SELECT id FROM categories WHERE name = 'Salary & Income'").Scan(&salaryCatId)
		_ = db.QueryRow("SELECT id FROM categories WHERE name = 'Food & Dining'").Scan(&foodCatId)
		_ = db.QueryRow("SELECT id FROM categories WHERE name = 'Groceries'").Scan(&grocCatId)

		now := time.Now()
		if bankId != "" && salaryCatId != "" {
			_, _ = db.Exec(`
				INSERT INTO transactions (id, account_id, type, amount, title, date_time, category_id)
				VALUES (?, ?, 'INCOME', 3500.0, 'Monthly Salary', ?, ?)
			`, uuid.NewString(), bankId, now.AddDate(0, 0, -5), salaryCatId)
		}

		if bankId != "" && foodCatId != "" {
			_, _ = db.Exec(`
				INSERT INTO transactions (id, account_id, type, amount, title, date_time, category_id)
				VALUES (?, ?, 'EXPENSE', 45.50, 'Dinner with friends', ?, ?)
			`, uuid.NewString(), bankId, now.AddDate(0, 0, -2), foodCatId)
		}

		if cashId != "" && grocCatId != "" {
			_, _ = db.Exec(`
				INSERT INTO transactions (id, account_id, type, amount, title, date_time, category_id)
				VALUES (?, ?, 'EXPENSE', 82.20, 'Weekly Groceries', ?, ?)
			`, uuid.NewString(), cashId, now.AddDate(0, 0, -1), grocCatId)
		}

		// Sample Budget
		if foodCatId != "" {
			_, _ = db.Exec(`
				INSERT INTO budgets (id, name, amount, category_ids, period, order_id)
				VALUES (?, 'Dining Out Budget', 300.0, ?, 'MONTHLY', 1)
			`, uuid.NewString(), `["`+foodCatId+`"]`)
		}
	}

	return nil
}
