package handlers

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type TransactionHandler struct {
	DB *database.DB
}

func (h *TransactionHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	accountID := q.Get("accountId")
	categoryID := q.Get("categoryId")
	txType := q.Get("type")
	search := q.Get("search")
	startDate := q.Get("startDate")
	endDate := q.Get("endDate")
	limitStr := q.Get("limit")
	offsetStr := q.Get("offset")

	query := `
		SELECT t.id, t.account_id, t.type, t.amount, t.to_account_id, t.to_amount,
		       t.title, t.description, t.date_time, t.category_id, t.due_date,
		       t.recurring_rule_id, t.loan_id, t.loan_record_id, t.is_deleted, t.created_at, t.updated_at,
		       a.name, a.currency, a.color, a.icon,
		       ta.name, ta.currency, ta.color, ta.icon,
		       c.name, c.color, c.icon
		FROM transactions t
		LEFT JOIN accounts a ON t.account_id = a.id
		LEFT JOIN accounts ta ON t.to_account_id = ta.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.is_deleted = 0
	`

	args := []interface{}{}

	if accountID != "" && accountID != "ALL" {
		query += " AND (t.account_id = ? OR t.to_account_id = ?)"
		args = append(args, accountID, accountID)
	}

	if categoryID != "" && categoryID != "ALL" {
		query += " AND t.category_id = ?"
		args = append(args, categoryID)
	}

	if txType != "" && txType != "ALL" {
		query += " AND t.type = ?"
		args = append(args, txType)
	}

	if search != "" {
		query += " AND (t.title LIKE ? OR t.description LIKE ?)"
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	if startDate != "" {
		if st, err := time.Parse(time.RFC3339, startDate); err == nil {
			query += " AND t.date_time >= ?"
			args = append(args, st)
		}
	}

	if endDate != "" {
		if et, err := time.Parse(time.RFC3339, endDate); err == nil {
			query += " AND t.date_time <= ?"
			args = append(args, et)
		}
	}

	query += " ORDER BY t.date_time DESC"

	if limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			query += " LIMIT ?"
			args = append(args, limit)

			if offsetStr != "" {
				if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
					query += " OFFSET ?"
					args = append(args, offset)
				}
			}
		}
	}

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	transactions := []models.Transaction{}
	for rows.Next() {
		var t models.Transaction
		var toAccID, title, desc, catID, recRuleID, loanID, loanRecID sql.NullString
		var toAmt sql.NullFloat64
		var dueDate sql.NullTime
		var isDel int

		var aName, aCurr, aColor, aIcon sql.NullString
		var taName, taCurr, taColor, taIcon sql.NullString
		var cName, cColor, cIcon sql.NullString

		err := rows.Scan(
			&t.ID, &t.AccountId, &t.Type, &t.Amount, &toAccID, &toAmt,
			&title, &desc, &t.DateTime, &catID, &dueDate,
			&recRuleID, &loanID, &loanRecID, &isDel, &t.CreatedAt, &t.UpdatedAt,
			&aName, &aCurr, &aColor, &aIcon,
			&taName, &taCurr, &taColor, &taIcon,
			&cName, &cColor, &cIcon,
		)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

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

		if aName.Valid {
			t.Account = &models.Account{
				ID:       t.AccountId,
				Name:     aName.String,
				Currency: aCurr.String,
				Color:    aColor.String,
				Icon:     aIcon.String,
			}
		}

		if toAccID.Valid && taName.Valid {
			t.ToAccount = &models.Account{
				ID:       toAccID.String,
				Name:     taName.String,
				Currency: taCurr.String,
				Color:    taColor.String,
				Icon:     taIcon.String,
			}
		}

		if catID.Valid && cName.Valid {
			t.Category = &models.Category{
				ID:    catID.String,
				Name:  cName.String,
				Color: cColor.String,
				Icon:  cIcon.String,
			}
		}

		transactions = append(transactions, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

func (h *TransactionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input struct {
		AccountId       string   `json:"accountId"`
		Type            string   `json:"type"`
		Amount          float64  `json:"amount"`
		ToAccountId     *string  `json:"toAccountId"`
		ToAmount        *float64 `json:"toAmount"`
		Title           *string  `json:"title"`
		Description     *string  `json:"description"`
		DateTime        *string  `json:"dateTime"`
		CategoryId      *string  `json:"categoryId"`
		DueDate         *string  `json:"dueDate"`
		RecurringRuleId *string  `json:"recurringRuleId"`
		LoanId          *string  `json:"loanId"`
		LoanRecordId    *string  `json:"loanRecordId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.AccountId == "" || input.Type == "" || input.Amount <= 0 {
		http.Error(w, "Invalid transaction payload: accountId, type, and positive amount required", http.StatusBadRequest)
		return
	}

	if input.Type == "TRANSFER" && (input.ToAccountId == nil || *input.ToAccountId == "") {
		http.Error(w, "toAccountId is required for TRANSFER type", http.StatusBadRequest)
		return
	}

	id := uuid.NewString()
	now := time.Now().UTC()
	dt := now
	if input.DateTime != nil && *input.DateTime != "" {
		if parsed, err := time.Parse(time.RFC3339, *input.DateTime); err == nil {
			dt = parsed
		}
	}

	var parsedDueDate *time.Time
	if input.DueDate != nil && *input.DueDate != "" {
		if parsed, err := time.Parse(time.RFC3339, *input.DueDate); err == nil {
			parsedDueDate = &parsed
		}
	}

	amount := math.Abs(input.Amount)

	_, err := h.DB.Exec(`
		INSERT INTO transactions (id, account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, due_date, recurring_rule_id, loan_id, loan_record_id, is_deleted, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
	`, id, input.AccountId, strings.ToUpper(input.Type), amount, input.ToAccountId, input.ToAmount, input.Title, input.Description, dt, input.CategoryId, parsedDueDate, input.RecurringRuleId, input.LoanId, input.LoanRecordId, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	res := models.Transaction{
		ID:              id,
		AccountId:       input.AccountId,
		Type:            strings.ToUpper(input.Type),
		Amount:          amount,
		ToAccountId:     input.ToAccountId,
		ToAmount:        input.ToAmount,
		Title:           input.Title,
		Description:     input.Description,
		DateTime:        dt,
		CategoryId:      input.CategoryId,
		DueDate:         parsedDueDate,
		RecurringRuleId: input.RecurringRuleId,
		LoanId:          input.LoanId,
		LoanRecordId:    input.LoanRecordId,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

func (h *TransactionHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input struct {
		AccountId   *string  `json:"accountId"`
		Type        *string  `json:"type"`
		Amount      *float64 `json:"amount"`
		ToAccountId *string  `json:"toAccountId"`
		ToAmount    *float64 `json:"toAmount"`
		Title       *string  `json:"title"`
		Description *string  `json:"description"`
		DateTime    *string  `json:"dateTime"`
		CategoryId  *string  `json:"categoryId"`
		DueDate     *string  `json:"dueDate"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()

	var existing models.Transaction
	var toAccID, title, desc, catID sql.NullString
	var toAmt sql.NullFloat64
	var dueDate sql.NullTime

	err := h.DB.QueryRow(`
		SELECT account_id, type, amount, to_account_id, to_amount, title, description, date_time, category_id, due_date
		FROM transactions WHERE id = ?
	`, id).Scan(
		&existing.AccountId, &existing.Type, &existing.Amount, &toAccID, &toAmt,
		&title, &desc, &existing.DateTime, &catID, &dueDate,
	)
	if err != nil {
		http.Error(w, "Transaction not found", http.StatusNotFound)
		return
	}

	if input.AccountId != nil {
		existing.AccountId = *input.AccountId
	}
	if input.Type != nil {
		existing.Type = strings.ToUpper(*input.Type)
	}
	if input.Amount != nil {
		existing.Amount = math.Abs(*input.Amount)
	}
	if input.ToAccountId != nil {
		existing.ToAccountId = input.ToAccountId
	}
	if input.ToAmount != nil {
		existing.ToAmount = input.ToAmount
	}
	if input.Title != nil {
		existing.Title = input.Title
	}
	if input.Description != nil {
		existing.Description = input.Description
	}
	if input.DateTime != nil && *input.DateTime != "" {
		if parsed, err := time.Parse(time.RFC3339, *input.DateTime); err == nil {
			existing.DateTime = parsed
		}
	}
	if input.CategoryId != nil {
		existing.CategoryId = input.CategoryId
	}
	if input.DueDate != nil && *input.DueDate != "" {
		if parsed, err := time.Parse(time.RFC3339, *input.DueDate); err == nil {
			existing.DueDate = &parsed
		}
	}

	_, err = h.DB.Exec(`
		UPDATE transactions
		SET account_id = ?, type = ?, amount = ?, to_account_id = ?, to_amount = ?,
		    title = ?, description = ?, date_time = ?, category_id = ?, due_date = ?, updated_at = ?
		WHERE id = ?
	`, existing.AccountId, existing.Type, existing.Amount, existing.ToAccountId, existing.ToAmount,
		existing.Title, existing.Description, existing.DateTime, existing.CategoryId, existing.DueDate, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	existing.ID = id
	existing.UpdatedAt = now

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existing)
}

func (h *TransactionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now().UTC()

	_, err := h.DB.Exec(`
		UPDATE transactions SET is_deleted = 1, updated_at = ? WHERE id = ?
	`, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
