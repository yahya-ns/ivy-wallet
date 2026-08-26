package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/middleware"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type SyncHandler struct {
	DB *database.DB
}

// PullSync returns all changes modified since given timestamp for the authenticated user
func (h *SyncHandler) PullSync(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	sinceStr := r.URL.Query().Get("since")
	since := time.Time{}
	if sinceStr != "" {
		if t, err := time.Parse(time.RFC3339, sinceStr); err == nil {
			since = t
		}
	}

	resp := models.SyncResponse{
		SyncTime:     time.Now().UTC(),
		Accounts:     []models.Account{},
		Categories:   []models.Category{},
		Tags:         []models.Tag{},
		Transactions: []models.Transaction{},
		Budgets:      []models.Budget{},
		Loans:        []models.Loan{},
		LoanRecords:  []models.LoanRecord{},
		Planned:      []models.PlannedPaymentRule{},
	}

	// 1. Accounts
	accRows, err := h.DB.Query(`
		SELECT id, user_id, name, currency, color, icon, order_num, include_in_balance, is_deleted, created_at, updated_at
		FROM accounts WHERE user_id = ? AND updated_at > ?
	`, userID, since)
	if err == nil {
		for accRows.Next() {
			var a models.Account
			var incInBal, isDel int
			_ = accRows.Scan(&a.ID, &a.UserID, &a.Name, &a.Currency, &a.Color, &a.Icon, &a.OrderNum, &incInBal, &isDel, &a.CreatedAt, &a.UpdatedAt)
			a.IncludeInBalance = incInBal == 1
			a.IsDeleted = isDel == 1
			resp.Accounts = append(resp.Accounts, a)
		}
		accRows.Close()
	}

	// 2. Categories
	catRows, err := h.DB.Query(`
		SELECT id, user_id, name, color, icon, order_num, parent_id, is_deleted, created_at, updated_at
		FROM categories WHERE user_id = ? AND updated_at > ?
	`, userID, since)
	if err == nil {
		for catRows.Next() {
			var c models.Category
			var parentID sql.NullString
			var isDel int
			_ = catRows.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.Icon, &c.OrderNum, &parentID, &isDel, &c.CreatedAt, &c.UpdatedAt)
			if parentID.Valid && parentID.String != "" {
				c.ParentId = &parentID.String
			}
			c.IsDeleted = isDel == 1
			resp.Categories = append(resp.Categories, c)
		}
		catRows.Close()
	}

	// 2.5 Tags
	tagRows, err := h.DB.Query(`
		SELECT id, user_id, name, color, order_num, is_deleted, created_at, updated_at
		FROM tags WHERE user_id = ? AND updated_at > ?
	`, userID, since)
	if err == nil {
		for tagRows.Next() {
			var tg models.Tag
			var isDel int
			_ = tagRows.Scan(&tg.ID, &tg.UserID, &tg.Name, &tg.Color, &tg.OrderNum, &isDel, &tg.CreatedAt, &tg.UpdatedAt)
			tg.IsDeleted = isDel == 1
			resp.Tags = append(resp.Tags, tg)
		}
		tagRows.Close()
	}

	// 3. Transactions
	txRows, err := h.DB.Query(`
		SELECT id, user_id, account_id, type, amount, to_account_id, to_amount, title, description, date_time,
		       category_id, subcategory_id, due_date, recurring_rule_id, loan_id, loan_record_id, is_deleted, created_at, updated_at
		FROM transactions WHERE user_id = ? AND updated_at > ?
	`, userID, since)
	if err == nil {
		for txRows.Next() {
			var t models.Transaction
			var toAccID, title, desc, catID, subcatID, recRuleID, loanID, loanRecID sql.NullString
			var toAmt sql.NullFloat64
			var dueDate sql.NullTime
			var isDel int

			_ = txRows.Scan(
				&t.ID, &t.UserID, &t.AccountId, &t.Type, &t.Amount, &toAccID, &toAmt,
				&title, &desc, &t.DateTime, &catID, &subcatID, &dueDate,
				&recRuleID, &loanID, &loanRecID, &isDel, &t.CreatedAt, &t.UpdatedAt,
			)

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
			if dueDate.Valid {
				t.DueDate = &dueDate.Time
			}
			if recRuleID.Valid {
				t.RecurringRuleId = &recRuleID.String
			}
			if loanID.Valid {
				t.LoanId = &loanID.String
			}
			if loanRecID.Valid {
				t.LoanRecordId = &loanRecID.String
			}
			t.IsDeleted = isDel == 1

			resp.Transactions = append(resp.Transactions, t)
		}
		txRows.Close()
	}

	// 4. Budgets
	bRows, err := h.DB.Query(`
		SELECT id, user_id, name, amount, category_ids, account_ids, period, order_id, created_at, updated_at
		FROM budgets WHERE user_id = ? AND updated_at > ?
	`, userID, since)
	if err == nil {
		for bRows.Next() {
			var b models.Budget
			var catIDs, accIDs sql.NullString
			_ = bRows.Scan(&b.ID, &b.UserID, &b.Name, &b.Amount, &catIDs, &accIDs, &b.Period, &b.OrderId, &b.CreatedAt, &b.UpdatedAt)
			if catIDs.Valid {
				b.CategoryIds = &catIDs.String
			}
			if accIDs.Valid {
				b.AccountIds = &accIDs.String
			}
			resp.Budgets = append(resp.Budgets, b)
		}
		bRows.Close()
	}

	// 5. Loans
	lRows, err := h.DB.Query(`
		SELECT id, user_id, name, amount, type, color, icon, account_id, note, date_time, due_date, is_paid, is_deleted, created_at, updated_at
		FROM loans WHERE user_id = ? AND updated_at > ?
	`, userID, since)
	if err == nil {
		for lRows.Next() {
			var l models.Loan
			var accID, note sql.NullString
			var dueDate sql.NullTime
			var isPaid, isDel int
			_ = lRows.Scan(&l.ID, &l.UserID, &l.Name, &l.Amount, &l.Type, &l.Color, &l.Icon, &accID, &note, &l.DateTime, &dueDate, &isPaid, &isDel, &l.CreatedAt, &l.UpdatedAt)
			if accID.Valid {
				l.AccountId = &accID.String
			}
			if note.Valid {
				l.Note = &note.String
			}
			if dueDate.Valid {
				l.DueDate = &dueDate.Time
			}
			l.IsPaid = isPaid == 1
			l.IsDeleted = isDel == 1
			resp.Loans = append(resp.Loans, l)
		}
		lRows.Close()
	}

	// 6. Planned rules
	pRows, err := h.DB.Query(`
		SELECT id, user_id, start_date, interval_n, interval_type, one_time, type, account_id, amount, category_id, title, description, is_active, is_deleted, created_at, updated_at
		FROM planned_payment_rules WHERE user_id = ? AND updated_at > ?
	`, userID, since)
	if err == nil {
		for pRows.Next() {
			var p models.PlannedPaymentRule
			var oneTime, isActive, isDel int
			var catID, title, desc sql.NullString
			_ = pRows.Scan(
				&p.ID, &p.UserID, &p.StartDate, &p.IntervalN, &p.IntervalType, &oneTime, &p.Type,
				&p.AccountId, &p.Amount, &catID, &title, &desc, &isActive,
				&isDel, &p.CreatedAt, &p.UpdatedAt,
			)
			p.OneTime = oneTime == 1
			p.IsActive = isActive == 1
			p.IsDeleted = isDel == 1
			if catID.Valid {
				p.CategoryId = &catID.String
			}
			if title.Valid {
				p.Title = &title.String
			}
			if desc.Valid {
				p.Description = &desc.String
			}
			resp.Planned = append(resp.Planned, p)
		}
		pRows.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// PushSync receives client changes, performs upserts, and returns delta updates
func (h *SyncHandler) PushSync(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var payload models.SyncPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid sync payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()

	// 1. Process Accounts
	for _, a := range payload.Accounts {
		a.UserID = userID
		_ = h.DB.UpsertAccount(a, now)
	}

	// 2. Process Categories
	for _, c := range payload.Categories {
		c.UserID = userID
		_ = h.DB.UpsertCategory(c, now)
	}

	// 2.5 Process Tags
	for _, tg := range payload.Tags {
		tg.UserID = userID
		_ = h.DB.UpsertTag(tg, now)
	}

	// 3. Process Transactions
	for _, t := range payload.Transactions {
		t.UserID = userID
		_ = h.DB.UpsertTransaction(t, now)
	}

	// Return full pull sync since payload's lastSyncTime
	h.PullSync(w, r)
}
