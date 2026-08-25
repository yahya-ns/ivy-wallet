package handlers

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type BackupHandler struct {
	DB *database.DB
}

func (h *BackupHandler) Export(w http.ResponseWriter, r *http.Request) {
	format := r.URL.Query().Get("format")

	if format == "csv" {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"ivy_wallet_transactions_%d.csv\"", time.Now().Unix()))

		writer := csv.NewWriter(w)
		defer writer.Flush()

		_ = writer.Write([]string{"ID", "Date", "Type", "Amount", "Account", "Category", "Title", "Description"})

		rows, err := h.DB.Query(`
			SELECT t.id, t.date_time, t.type, t.amount, COALESCE(a.name, t.account_id), COALESCE(c.name, ''), COALESCE(t.title, ''), COALESCE(t.description, '')
			FROM transactions t
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			WHERE t.is_deleted = 0
			ORDER BY t.date_time DESC
		`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id, txType, accName, catName, title, desc string
				var dt time.Time
				var amount float64
				_ = rows.Scan(&id, &dt, &txType, &amount, &accName, &catName, &title, &desc)
				_ = writer.Write([]string{
					id, dt.Format(time.RFC3339), txType, strconv.FormatFloat(amount, 'f', 2, 64),
					accName, catName, title, desc,
				})
			}
		}
		return
	}

	// JSON Export
	// 1. Accounts
	accRows, _ := h.DB.Query("SELECT id, name, currency, color, icon, order_num, include_in_balance, created_at, updated_at FROM accounts WHERE is_deleted = 0")
	accounts := []models.Account{}
	if accRows != nil {
		for accRows.Next() {
			var a models.Account
			var incInBal int
			_ = accRows.Scan(&a.ID, &a.Name, &a.Currency, &a.Color, &a.Icon, &a.OrderNum, &incInBal, &a.CreatedAt, &a.UpdatedAt)
			a.IncludeInBalance = incInBal == 1
			accounts = append(accounts, a)
		}
		accRows.Close()
	}

	// 2. Categories
	catRows, _ := h.DB.Query("SELECT id, name, color, icon, order_num, created_at, updated_at FROM categories WHERE is_deleted = 0")
	categories := []models.Category{}
	if catRows != nil {
		for catRows.Next() {
			var c models.Category
			_ = catRows.Scan(&c.ID, &c.Name, &c.Color, &c.Icon, &c.OrderNum, &c.CreatedAt, &c.UpdatedAt)
			categories = append(categories, c)
		}
		catRows.Close()
	}

	// 3. Transactions
	txRows, _ := h.DB.Query("SELECT id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, created_at, updated_at FROM transactions WHERE is_deleted = 0 ORDER BY date_time DESC")
	transactions := []models.Transaction{}
	if txRows != nil {
		for txRows.Next() {
			var t models.Transaction
			var toAccID, title, desc, catID sql.NullString
			var toAmt sql.NullFloat64
			_ = txRows.Scan(&t.ID, &t.AccountId, &t.Type, &t.Amount, &toAccID, &toAmt, &title, &desc, &t.DateTime, &catID, &t.CreatedAt, &t.UpdatedAt)
			if toAccID.Valid {
				t.ToAccountId = &toAccID.String
			}
			if toAmt.Valid {
				t.ToAmount = &toAmt.Float64
			}
			if title.Valid {
				t.Title = &title.String
			}
			if desc.Valid {
				t.Description = &desc.String
			}
			if catID.Valid {
				t.CategoryId = &catID.String
			}
			transactions = append(transactions, t)
		}
		txRows.Close()
	}

	// 4. Budgets
	bRows, _ := h.DB.Query("SELECT id, name, amount, category_ids, period, order_id, created_at, updated_at FROM budgets")
	budgets := []models.Budget{}
	if bRows != nil {
		for bRows.Next() {
			var b models.Budget
			var catIDs sql.NullString
			_ = bRows.Scan(&b.ID, &b.Name, &b.Amount, &catIDs, &b.Period, &b.OrderId, &b.CreatedAt, &b.UpdatedAt)
			if catIDs.Valid {
				b.CategoryIds = &catIDs.String
			}
			budgets = append(budgets, b)
		}
		bRows.Close()
	}

	// 5. Settings
	var s models.Settings
	var hideBal int
	_ = h.DB.QueryRow("SELECT id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, created_at, updated_at FROM settings LIMIT 1").
		Scan(&s.ID, &s.Theme, &s.Currency, &s.BufferAmount, &s.Name, &s.FirstDayOfWeek, &hideBal, &s.CreatedAt, &s.UpdatedAt)
	s.HideBalance = hideBal == 1

	backup := map[string]interface{}{
		"version":      "1.0",
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"accounts":     accounts,
		"categories":   categories,
		"transactions": transactions,
		"budgets":      budgets,
		"settings":     s,
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"ivy_wallet_backup_%d.json\"", time.Now().Unix()))
	json.NewEncoder(w).Encode(backup)
}

func (h *BackupHandler) Import(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Categories   []models.Category    `json:"categories"`
		Accounts     []models.Account     `json:"accounts"`
		Transactions []models.Transaction `json:"transactions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid backup data", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	importedCat := 0
	importedAcc := 0
	importedTx := 0

	// 1. Categories
	for _, c := range data.Categories {
		if c.Name != "" {
			var exists int
			_ = h.DB.QueryRow("SELECT COUNT(*) FROM categories WHERE name = ?", c.Name).Scan(&exists)
			if exists == 0 {
				id := c.ID
				if id == "" {
					id = uuid.NewString()
				}
				_, _ = h.DB.Exec(`
					INSERT INTO categories (id, name, color, icon, order_num, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`, id, c.Name, c.Color, c.Icon, c.OrderNum, now, now)
				importedCat++
			}
		}
	}

	// 2. Accounts
	for _, a := range data.Accounts {
		if a.Name != "" {
			var exists int
			_ = h.DB.QueryRow("SELECT COUNT(*) FROM accounts WHERE name = ?", a.Name).Scan(&exists)
			if exists == 0 {
				id := a.ID
				if id == "" {
					id = uuid.NewString()
				}
				incInBal := 1
				if !a.IncludeInBalance {
					incInBal = 0
				}
				_, _ = h.DB.Exec(`
					INSERT INTO accounts (id, name, currency, color, icon, order_num, include_in_balance, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`, id, a.Name, a.Currency, a.Color, a.Icon, a.OrderNum, incInBal, now, now)
				importedAcc++
			}
		}
	}

	// 3. Transactions
	for _, t := range data.Transactions {
		if t.Amount > 0 && t.Type != "" {
			id := t.ID
			if id == "" {
				id = uuid.NewString()
			}
			dt := t.DateTime
			if dt.IsZero() {
				dt = now
			}
			_, err := h.DB.Exec(`
				INSERT OR IGNORE INTO transactions (id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, id, t.AccountId, t.Type, t.Amount, t.ToAccountId, t.ToAmount, t.Title, t.Description, dt, t.CategoryId, now, now)
			if err == nil {
				importedTx++
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Imported %d categories, %d accounts, and %d transactions.", importedCat, importedAcc, importedTx),
	})
}
