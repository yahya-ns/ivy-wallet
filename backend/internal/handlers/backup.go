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
	"github.com/yahya-ns/ivy-wallet/backend/internal/middleware"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type BackupHandler struct {
	DB *database.DB
}

func (h *BackupHandler) Export(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	format := r.URL.Query().Get("format")

	if format == "csv" {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"ivy_wallet_transactions_%d.csv\"", time.Now().Unix()))

		writer := csv.NewWriter(w)
		defer writer.Flush()

		_ = writer.Write([]string{"ID", "Date", "Type", "Amount", "Account", "Category", "Subcategory", "Title", "Description", "Tags"})

		rows, err := h.DB.Query(`
			SELECT t.id, t.date_time, t.type, t.amount, COALESCE(a.name, t.account_id), COALESCE(c.name, ''), COALESCE(sc.name, ''), COALESCE(t.title, ''), COALESCE(t.description, '')
			FROM transactions t
			LEFT JOIN accounts a ON t.account_id = a.id
			LEFT JOIN categories c ON t.category_id = c.id
			LEFT JOIN categories sc ON t.subcategory_id = sc.id
			WHERE t.user_id = ? AND t.is_deleted = 0
			ORDER BY t.date_time DESC
		`, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id, txType, accName, catName, subcatName, title, desc string
				var dt time.Time
				var amount float64
				_ = rows.Scan(&id, &dt, &txType, &amount, &accName, &catName, &subcatName, &title, &desc)
				_ = writer.Write([]string{
					id, dt.Format(time.RFC3339), txType, strconv.FormatFloat(amount, 'f', 2, 64),
					accName, catName, subcatName, title, desc, "",
				})
			}
		}
		return
	}

	// JSON Export
	// 1. Accounts
	accRows, _ := h.DB.Query("SELECT id, user_id, name, currency, color, icon, order_num, include_in_balance, created_at, updated_at FROM accounts WHERE user_id = ? AND is_deleted = 0", userID)
	accounts := []models.Account{}
	if accRows != nil {
		for accRows.Next() {
			var a models.Account
			var incInBal int
			_ = accRows.Scan(&a.ID, &a.UserID, &a.Name, &a.Currency, &a.Color, &a.Icon, &a.OrderNum, &incInBal, &a.CreatedAt, &a.UpdatedAt)
			a.IncludeInBalance = incInBal == 1
			accounts = append(accounts, a)
		}
		accRows.Close()
	}

	// 2. Categories
	catRows, _ := h.DB.Query("SELECT id, user_id, name, color, icon, order_num, parent_id, created_at, updated_at FROM categories WHERE user_id = ? AND is_deleted = 0", userID)
	categories := []models.Category{}
	if catRows != nil {
		for catRows.Next() {
			var c models.Category
			var parentID sql.NullString
			_ = catRows.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.Icon, &c.OrderNum, &parentID, &c.CreatedAt, &c.UpdatedAt)
			if parentID.Valid && parentID.String != "" {
				c.ParentId = &parentID.String
			}
			categories = append(categories, c)
		}
		catRows.Close()
	}

	// 2.5 Tags
	tagRows, _ := h.DB.Query("SELECT id, user_id, name, color, order_num, created_at, updated_at FROM tags WHERE user_id = ? AND is_deleted = 0", userID)
	tags := []models.Tag{}
	if tagRows != nil {
		for tagRows.Next() {
			var tg models.Tag
			_ = tagRows.Scan(&tg.ID, &tg.UserID, &tg.Name, &tg.Color, &tg.OrderNum, &tg.CreatedAt, &tg.UpdatedAt)
			tags = append(tags, tg)
		}
		tagRows.Close()
	}

	// 3. Transactions
	txRows, _ := h.DB.Query("SELECT id, user_id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, subcategory_id, created_at, updated_at FROM transactions WHERE user_id = ? AND is_deleted = 0 ORDER BY date_time DESC", userID)
	transactions := []models.Transaction{}
	if txRows != nil {
		for txRows.Next() {
			var t models.Transaction
			var toAccID, title, desc, catID, subcatID sql.NullString
			var toAmt sql.NullFloat64
			_ = txRows.Scan(&t.ID, &t.UserID, &t.AccountId, &t.Type, &t.Amount, &toAccID, &toAmt, &title, &desc, &t.DateTime, &catID, &subcatID, &t.CreatedAt, &t.UpdatedAt)
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
			if subcatID.Valid {
				t.SubcategoryId = &subcatID.String
			}
			transactions = append(transactions, t)
		}
		txRows.Close()
	}

	// 4. Budgets
	bRows, _ := h.DB.Query("SELECT id, user_id, name, amount, category_ids, period, order_id, created_at, updated_at FROM budgets WHERE user_id = ?", userID)
	budgets := []models.Budget{}
	if bRows != nil {
		for bRows.Next() {
			var b models.Budget
			var catIDs sql.NullString
			_ = bRows.Scan(&b.ID, &b.UserID, &b.Name, &b.Amount, &catIDs, &b.Period, &b.OrderId, &b.CreatedAt, &b.UpdatedAt)
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
	var dateFormat, timeFormat sql.NullString
	_ = h.DB.QueryRow("SELECT id, user_id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, date_format, time_format, created_at, updated_at FROM settings WHERE user_id = ? LIMIT 1", userID).
		Scan(&s.ID, &s.UserID, &s.Theme, &s.Currency, &s.BufferAmount, &s.Name, &s.FirstDayOfWeek, &hideBal, &dateFormat, &timeFormat, &s.CreatedAt, &s.UpdatedAt)
	s.HideBalance = hideBal == 1
	if dateFormat.Valid && dateFormat.String != "" {
		s.DateFormat = dateFormat.String
	} else {
		s.DateFormat = "YYYY-MM-DD"
	}
	if timeFormat.Valid && timeFormat.String != "" {
		s.TimeFormat = timeFormat.String
	} else {
		s.TimeFormat = "24_HOUR"
	}

	backup := map[string]interface{}{
		"version":      "1.0",
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"accounts":     accounts,
		"categories":   categories,
		"tags":         tags,
		"transactions": transactions,
		"budgets":      budgets,
		"settings":     s,
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"ivy_wallet_backup_%d.json\"", time.Now().Unix()))
	_ = json.NewEncoder(w).Encode(backup)
}

func (h *BackupHandler) Import(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var data struct {
		Categories   []models.Category    `json:"categories"`
		Tags         []models.Tag         `json:"tags"`
		Accounts     []models.Account     `json:"accounts"`
		Transactions []models.Transaction `json:"transactions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid backup data", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	importedCat := 0
	importedTag := 0
	importedAcc := 0
	importedTx := 0

	// 1. Categories
	for _, c := range data.Categories {
		if c.Name != "" {
			var exists int
			_ = h.DB.QueryRow("SELECT COUNT(*) FROM categories WHERE name = ? AND user_id = ?", c.Name, userID).Scan(&exists)
			if exists == 0 {
				id := c.ID
				if id == "" {
					id = uuid.NewString()
				}
				_, _ = h.DB.Exec(`
					INSERT INTO categories (id, user_id, name, color, icon, order_num, parent_id, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`, id, userID, c.Name, c.Color, c.Icon, c.OrderNum, c.ParentId, now, now)
				importedCat++
			}
		}
	}

	// 1.5 Tags
	for _, tg := range data.Tags {
		if tg.Name != "" {
			var exists int
			_ = h.DB.QueryRow("SELECT COUNT(*) FROM tags WHERE LOWER(name) = LOWER(?) AND user_id = ?", tg.Name, userID).Scan(&exists)
			if exists == 0 {
				id := tg.ID
				if id == "" {
					id = uuid.NewString()
				}
				_, _ = h.DB.Exec(`
					INSERT INTO tags (id, user_id, name, color, order_num, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`, id, userID, tg.Name, tg.Color, tg.OrderNum, now, now)
				importedTag++
			}
		}
	}

	// 2. Accounts
	for _, a := range data.Accounts {
		if a.Name != "" {
			var exists int
			_ = h.DB.QueryRow("SELECT COUNT(*) FROM accounts WHERE name = ? AND user_id = ?", a.Name, userID).Scan(&exists)
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
					INSERT INTO accounts (id, user_id, name, currency, color, icon, order_num, include_in_balance, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`, id, userID, a.Name, a.Currency, a.Color, a.Icon, a.OrderNum, incInBal, now, now)
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
			var err error
			if h.DB.Driver == "mariadb" {
				_, err = h.DB.Exec(`
					INSERT IGNORE INTO transactions (id, user_id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, subcategory_id, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`, id, userID, t.AccountId, t.Type, t.Amount, t.ToAccountId, t.ToAmount, t.Title, t.Description, dt, t.CategoryId, t.SubcategoryId, now, now)
			} else {
				_, err = h.DB.Exec(`
					INSERT OR IGNORE INTO transactions (id, user_id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, subcategory_id, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`, id, userID, t.AccountId, t.Type, t.Amount, t.ToAccountId, t.ToAmount, t.Title, t.Description, dt, t.CategoryId, t.SubcategoryId, now, now)
			}
			if err == nil {
				importedTx++
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Imported %d categories, %d tags, %d accounts, and %d transactions.", importedCat, importedTag, importedAcc, importedTx),
	})
}
