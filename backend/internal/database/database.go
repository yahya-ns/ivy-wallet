package database

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"

	"github.com/yahya-ns/ivy-wallet/backend/internal/config"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type DB struct {
	*sql.DB
	Driver string // "sqlite", "postgres", "mariadb"
}

func Connect(cfg config.DatabaseConfig) (*DB, error) {
	var driverName string
	switch cfg.Type {
	case "postgres":
		driverName = "postgres"
	case "mariadb":
		driverName = "mysql"
	default:
		driverName = "sqlite"
	}

	sqlDB, err := sql.Open(driverName, cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("failed to open database (%s): %w", cfg.Type, err)
	}

	// Verify connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to connect to database (%s): %w", cfg.Type, err)
	}

	// Performance tuning based on database engine
	if cfg.Type == "sqlite" {
		pragmas := []string{
			"PRAGMA journal_mode=WAL;",
			"PRAGMA busy_timeout=5000;",
			"PRAGMA synchronous=NORMAL;",
			"PRAGMA foreign_keys=ON;",
		}
		for _, p := range pragmas {
			if _, err := sqlDB.Exec(p); err != nil {
				log.Printf("Warning: failed to execute pragma '%s': %v", p, err)
			}
		}
	} else {
		sqlDB.SetMaxOpenConns(25)
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetConnMaxLifetime(5 * time.Minute)
	}

	dbWrapper := &DB{
		DB:     sqlDB,
		Driver: cfg.Type,
	}

	if err := dbWrapper.migrate(); err != nil {
		return nil, fmt.Errorf("migration failed for %s: %w", cfg.Type, err)
	}

	if err := dbWrapper.seed(); err != nil {
		log.Printf("Warning: seed failed: %v", err)
	}

	log.Printf("Successfully connected and initialized database engine: [%s]", cfg.Type)
	return dbWrapper, nil
}

// Rebind converts standard '?' placeholders to '$1, $2, ...' for PostgreSQL
func (db *DB) Rebind(query string) string {
	if db.Driver != "postgres" {
		return query
	}

	var sb strings.Builder
	paramIdx := 1
	inQuote := false

	for i := 0; i < len(query); i++ {
		char := query[i]
		if char == '\'' {
			inQuote = !inQuote
			sb.WriteByte(char)
		} else if char == '?' && !inQuote {
			sb.WriteByte('$')
			sb.WriteString(strconv.Itoa(paramIdx))
			paramIdx++
		} else {
			sb.WriteByte(char)
		}
	}

	return sb.String()
}

// Query wraps standard sql.DB.Query with automatic parameter rebinding
func (db *DB) Query(query string, args ...any) (*sql.Rows, error) {
	return db.DB.Query(db.Rebind(query), args...)
}

// QueryRow wraps standard sql.DB.QueryRow with automatic parameter rebinding
func (db *DB) QueryRow(query string, args ...any) *sql.Row {
	return db.DB.QueryRow(db.Rebind(query), args...)
}

// Exec wraps standard sql.DB.Exec with automatic parameter rebinding
func (db *DB) Exec(query string, args ...any) (sql.Result, error) {
	return db.DB.Exec(db.Rebind(query), args...)
}

func (db *DB) migrate() error {
	switch db.Driver {
	case "postgres":
		return db.migratePostgres()
	case "mariadb":
		return db.migrateMariaDB()
	default:
		return db.migrateSQLite()
	}
}

func (db *DB) migrateSQLite() error {
	schema := `
	CREATE TABLE IF NOT EXISTS settings (
		id TEXT PRIMARY KEY,
		theme TEXT NOT NULL DEFAULT 'DARK',
		currency TEXT NOT NULL DEFAULT 'USD',
		buffer_amount REAL NOT NULL DEFAULT 0.0,
		name TEXT NOT NULL DEFAULT 'My Ivy Wallet',
		first_day_of_week INTEGER NOT NULL DEFAULT 1,
		hide_balance INTEGER NOT NULL DEFAULT 0,
		date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
		time_format TEXT NOT NULL DEFAULT '24_HOUR',
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
		type TEXT NOT NULL,
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
		type TEXT NOT NULL,
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

	_, err := db.DB.Exec(schema)
	if err != nil {
		return err
	}

	// Safely add columns if upgrading existing database
	_, _ = db.DB.Exec("ALTER TABLE settings ADD COLUMN date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD'")
	_, _ = db.DB.Exec("ALTER TABLE settings ADD COLUMN time_format TEXT NOT NULL DEFAULT '24_HOUR'")
	return nil
}

func (db *DB) migratePostgres() error {
	schema := `
	CREATE TABLE IF NOT EXISTS settings (
		id VARCHAR(64) PRIMARY KEY,
		theme VARCHAR(32) NOT NULL DEFAULT 'DARK',
		currency VARCHAR(16) NOT NULL DEFAULT 'USD',
		buffer_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
		name VARCHAR(255) NOT NULL DEFAULT 'My Ivy Wallet',
		first_day_of_week INTEGER NOT NULL DEFAULT 1,
		hide_balance INTEGER NOT NULL DEFAULT 0,
		date_format VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD',
		time_format VARCHAR(32) NOT NULL DEFAULT '24_HOUR',
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS accounts (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		currency VARCHAR(16) NOT NULL DEFAULT 'USD',
		color VARCHAR(32) NOT NULL DEFAULT '#5C3DF5',
		icon VARCHAR(64) NOT NULL DEFAULT 'wallet',
		order_num INTEGER NOT NULL DEFAULT 0,
		include_in_balance INTEGER NOT NULL DEFAULT 1,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS categories (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		color VARCHAR(32) NOT NULL DEFAULT '#12B880',
		icon VARCHAR(64) NOT NULL DEFAULT 'tag',
		order_num INTEGER NOT NULL DEFAULT 0,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS transactions (
		id VARCHAR(64) PRIMARY KEY,
		account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
		type VARCHAR(32) NOT NULL,
		amount DOUBLE PRECISION NOT NULL,
		to_account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE SET NULL,
		to_amount DOUBLE PRECISION,
		title VARCHAR(255),
		description TEXT,
		date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
		due_date TIMESTAMP WITH TIME ZONE,
		recurring_rule_id VARCHAR(64),
		loan_id VARCHAR(64),
		loan_record_id VARCHAR(64),
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS budgets (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		amount DOUBLE PRECISION NOT NULL,
		category_ids TEXT,
		account_ids TEXT,
		period VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
		order_id INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS loans (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		amount DOUBLE PRECISION NOT NULL,
		type VARCHAR(32) NOT NULL,
		color VARCHAR(32) NOT NULL DEFAULT '#F53D3D',
		icon VARCHAR(64) NOT NULL DEFAULT 'hand-coins',
		account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE SET NULL,
		note TEXT,
		date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		due_date TIMESTAMP WITH TIME ZONE,
		is_paid INTEGER NOT NULL DEFAULT 0,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS loan_records (
		id VARCHAR(64) PRIMARY KEY,
		loan_id VARCHAR(64) NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
		amount DOUBLE PRECISION NOT NULL,
		date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		note TEXT,
		account_id VARCHAR(64) REFERENCES accounts(id) ON DELETE SET NULL,
		transaction_id VARCHAR(64) REFERENCES transactions(id) ON DELETE SET NULL,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS planned_payment_rules (
		id VARCHAR(64) PRIMARY KEY,
		start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		interval_n INTEGER NOT NULL DEFAULT 1,
		interval_type VARCHAR(32) NOT NULL DEFAULT 'MONTH',
		one_time INTEGER NOT NULL DEFAULT 0,
		type VARCHAR(32) NOT NULL DEFAULT 'EXPENSE',
		account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
		amount DOUBLE PRECISION NOT NULL,
		category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
		title VARCHAR(255),
		description TEXT,
		is_active INTEGER NOT NULL DEFAULT 1,
		is_deleted INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_pg_transactions_datetime ON transactions(date_time);
	CREATE INDEX IF NOT EXISTS idx_pg_transactions_account ON transactions(account_id);
	CREATE INDEX IF NOT EXISTS idx_pg_transactions_category ON transactions(category_id);
	`

	_, err := db.DB.Exec(schema)
	if err != nil {
		return err
	}

	// Safely add columns if upgrading existing database
	_, _ = db.DB.Exec("ALTER TABLE settings ADD COLUMN IF NOT EXISTS date_format VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD'")
	_, _ = db.DB.Exec("ALTER TABLE settings ADD COLUMN IF NOT EXISTS time_format VARCHAR(32) NOT NULL DEFAULT '24_HOUR'")
	return nil
}

func (db *DB) migrateMariaDB() error {
	schema := `
	CREATE TABLE IF NOT EXISTS settings (
		id VARCHAR(64) PRIMARY KEY,
		theme VARCHAR(32) NOT NULL DEFAULT 'DARK',
		currency VARCHAR(16) NOT NULL DEFAULT 'USD',
		buffer_amount DOUBLE NOT NULL DEFAULT 0.0,
		name VARCHAR(255) NOT NULL DEFAULT 'My Ivy Wallet',
		first_day_of_week INT NOT NULL DEFAULT 1,
		hide_balance INT NOT NULL DEFAULT 0,
		date_format VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD',
		time_format VARCHAR(32) NOT NULL DEFAULT '24_HOUR',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS accounts (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		currency VARCHAR(16) NOT NULL DEFAULT 'USD',
		color VARCHAR(32) NOT NULL DEFAULT '#5C3DF5',
		icon VARCHAR(64) NOT NULL DEFAULT 'wallet',
		order_num INT NOT NULL DEFAULT 0,
		include_in_balance INT NOT NULL DEFAULT 1,
		is_deleted INT NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS categories (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		color VARCHAR(32) NOT NULL DEFAULT '#12B880',
		icon VARCHAR(64) NOT NULL DEFAULT 'tag',
		order_num INT NOT NULL DEFAULT 0,
		is_deleted INT NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS transactions (
		id VARCHAR(64) PRIMARY KEY,
		account_id VARCHAR(64) NOT NULL,
		type VARCHAR(32) NOT NULL,
		amount DOUBLE NOT NULL,
		to_account_id VARCHAR(64),
		to_amount DOUBLE,
		title VARCHAR(255),
		description TEXT,
		date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		category_id VARCHAR(64),
		due_date DATETIME,
		recurring_rule_id VARCHAR(64),
		loan_id VARCHAR(64),
		loan_record_id VARCHAR(64),
		is_deleted INT NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
		FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS budgets (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		amount DOUBLE NOT NULL,
		category_ids TEXT,
		account_ids TEXT,
		period VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
		order_id INT NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS loans (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		amount DOUBLE NOT NULL,
		type VARCHAR(32) NOT NULL,
		color VARCHAR(32) NOT NULL DEFAULT '#F53D3D',
		icon VARCHAR(64) NOT NULL DEFAULT 'hand-coins',
		account_id VARCHAR(64),
		note TEXT,
		date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		due_date DATETIME,
		is_paid INT NOT NULL DEFAULT 0,
		is_deleted INT NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS loan_records (
		id VARCHAR(64) PRIMARY KEY,
		loan_id VARCHAR(64) NOT NULL,
		amount DOUBLE NOT NULL,
		date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		note TEXT,
		account_id VARCHAR(64),
		transaction_id VARCHAR(64),
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
		FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

	CREATE TABLE IF NOT EXISTS planned_payment_rules (
		id VARCHAR(64) PRIMARY KEY,
		start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		interval_n INT NOT NULL DEFAULT 1,
		interval_type VARCHAR(32) NOT NULL DEFAULT 'MONTH',
		one_time INT NOT NULL DEFAULT 0,
		type VARCHAR(32) NOT NULL DEFAULT 'EXPENSE',
		account_id VARCHAR(64) NOT NULL,
		amount DOUBLE NOT NULL,
		category_id VARCHAR(64),
		title VARCHAR(255),
		description TEXT,
		is_active INT NOT NULL DEFAULT 1,
		is_deleted INT NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
	`

	statements := strings.Split(schema, ";")
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt != "" {
			if _, err := db.DB.Exec(stmt); err != nil {
				return err
			}
		}
	}
	return nil
}

func (db *DB) seed() error {
	// 1. Seed Settings if not exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM settings").Scan(&count)
	if err != nil || count == 0 {
		_, _ = db.Exec(`
			INSERT INTO settings (id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, date_format, time_format)
			VALUES (?, 'DARK', 'USD', 0.0, 'My Ivy Wallet', 1, 0, 'YYYY-MM-DD', '24_HOUR')
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

		now := time.Now().UTC()
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

// Sync Upsert Helpers supporting SQLite, PostgreSQL, and MariaDB
func (db *DB) UpsertAccount(a models.Account, now time.Time) error {
	incInBal := 0
	if a.IncludeInBalance {
		incInBal = 1
	}
	isDel := 0
	if a.IsDeleted {
		isDel = 1
	}

	if db.Driver == "mariadb" {
		_, err := db.Exec(`
			INSERT INTO accounts (id, name, currency, color, icon, order_num, include_in_balance, is_deleted, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				name = VALUES(name),
				currency = VALUES(currency),
				color = VALUES(color),
				icon = VALUES(icon),
				order_num = VALUES(order_num),
				include_in_balance = VALUES(include_in_balance),
				is_deleted = VALUES(is_deleted),
				updated_at = VALUES(updated_at)
		`, a.ID, a.Name, a.Currency, a.Color, a.Icon, a.OrderNum, incInBal, isDel, a.CreatedAt, now)
		return err
	}

	// SQLite and PostgreSQL use ON CONFLICT(id)
	_, err := db.Exec(`
		INSERT INTO accounts (id, name, currency, color, icon, order_num, include_in_balance, is_deleted, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			currency = excluded.currency,
			color = excluded.color,
			icon = excluded.icon,
			order_num = excluded.order_num,
			include_in_balance = excluded.include_in_balance,
			is_deleted = excluded.is_deleted,
			updated_at = excluded.updated_at
	`, a.ID, a.Name, a.Currency, a.Color, a.Icon, a.OrderNum, incInBal, isDel, a.CreatedAt, now)
	return err
}

func (db *DB) UpsertCategory(c models.Category, now time.Time) error {
	isDel := 0
	if c.IsDeleted {
		isDel = 1
	}

	if db.Driver == "mariadb" {
		_, err := db.Exec(`
			INSERT INTO categories (id, name, color, icon, order_num, is_deleted, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				name = VALUES(name),
				color = VALUES(color),
				icon = VALUES(icon),
				order_num = VALUES(order_num),
				is_deleted = VALUES(is_deleted),
				updated_at = VALUES(updated_at)
		`, c.ID, c.Name, c.Color, c.Icon, c.OrderNum, isDel, c.CreatedAt, now)
		return err
	}

	_, err := db.Exec(`
		INSERT INTO categories (id, name, color, icon, order_num, is_deleted, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			color = excluded.color,
			icon = excluded.icon,
			order_num = excluded.order_num,
			is_deleted = excluded.is_deleted,
			updated_at = excluded.updated_at
	`, c.ID, c.Name, c.Color, c.Icon, c.OrderNum, isDel, c.CreatedAt, now)
	return err
}

func (db *DB) UpsertTransaction(t models.Transaction, now time.Time) error {
	isDel := 0
	if t.IsDeleted {
		isDel = 1
	}

	if db.Driver == "mariadb" {
		_, err := db.Exec(`
			INSERT INTO transactions (id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, due_date, recurring_rule_id, loan_id, loan_record_id, is_deleted, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				account_id = VALUES(account_id),
				type = VALUES(type),
				amount = VALUES(amount),
				to_account_id = VALUES(to_account_id),
				to_amount = VALUES(to_amount),
				title = VALUES(title),
				description = VALUES(description),
				date_time = VALUES(date_time),
				category_id = VALUES(category_id),
				due_date = VALUES(due_date),
				is_deleted = VALUES(is_deleted),
				updated_at = VALUES(updated_at)
		`, t.ID, t.AccountId, t.Type, t.Amount, t.ToAccountId, t.ToAmount, t.Title, t.Description, t.DateTime, t.CategoryId, t.DueDate, t.RecurringRuleId, t.LoanId, t.LoanRecordId, isDel, t.CreatedAt, now)
		return err
	}

	_, err := db.Exec(`
		INSERT INTO transactions (id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, due_date, recurring_rule_id, loan_id, loan_record_id, is_deleted, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			account_id = excluded.account_id,
			type = excluded.type,
			amount = excluded.amount,
			to_account_id = excluded.to_account_id,
			to_amount = excluded.to_amount,
			title = excluded.title,
			description = excluded.description,
			date_time = excluded.date_time,
			category_id = excluded.category_id,
			due_date = excluded.due_date,
			is_deleted = excluded.is_deleted,
			updated_at = excluded.updated_at
	`, t.ID, t.AccountId, t.Type, t.Amount, t.ToAccountId, t.ToAmount, t.Title, t.Description, t.DateTime, t.CategoryId, t.DueDate, t.RecurringRuleId, t.LoanId, t.LoanRecordId, isDel, t.CreatedAt, now)
	return err
}
