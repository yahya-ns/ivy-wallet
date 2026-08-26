package handlers

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/middleware"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type LoanHandler struct {
	DB *database.DB
}

func (h *LoanHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	rows, err := h.DB.Query(`
		SELECT l.id, l.user_id, l.name, l.amount, l.type, l.color, l.icon, l.account_id, l.note,
		       l.date_time, l.due_date, l.is_paid, l.is_deleted, l.created_at, l.updated_at,
		       a.name, a.currency, a.color, a.icon
		FROM loans l
		LEFT JOIN accounts a ON l.account_id = a.id
		WHERE l.user_id = ? AND l.is_deleted = 0
		ORDER BY l.date_time DESC
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	loans := []models.Loan{}
	for rows.Next() {
		var l models.Loan
		var accID, note sql.NullString
		var dueDate sql.NullTime
		var isPaid, isDel int
		var aName, aCurr, aColor, aIcon sql.NullString

		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Name, &l.Amount, &l.Type, &l.Color, &l.Icon, &accID, &note,
			&l.DateTime, &dueDate, &isPaid, &isDel, &l.CreatedAt, &l.UpdatedAt,
			&aName, &aCurr, &aColor, &aIcon,
		); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

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

		if accID.Valid && aName.Valid {
			l.Account = &models.Account{
				ID:       accID.String,
				UserID:   l.UserID,
				Name:     aName.String,
				Currency: aCurr.String,
				Color:    aColor.String,
				Icon:     aIcon.String,
			}
		}

		// Fetch loan repayment records for this user
		recRows, err := h.DB.Query(`
			SELECT lr.id, lr.user_id, lr.loan_id, lr.amount, lr.date_time, lr.note, lr.account_id, lr.transaction_id, lr.created_at, lr.updated_at,
			       a.name, a.currency, a.color, a.icon
			FROM loan_records lr
			LEFT JOIN accounts a ON lr.account_id = a.id
			WHERE lr.loan_id = ? AND lr.user_id = ?
			ORDER BY lr.date_time DESC
		`, l.ID, userID)

		var totalPaid float64 = 0
		if err == nil {
			for recRows.Next() {
				var lr models.LoanRecord
				var lrNote, lrAccID, lrTxID sql.NullString
				var lrAName, lrACurr, lrAColor, lrAIcon sql.NullString

				_ = recRows.Scan(
					&lr.ID, &lr.UserID, &lr.LoanId, &lr.Amount, &lr.DateTime, &lrNote, &lrAccID, &lrTxID, &lr.CreatedAt, &lr.UpdatedAt,
					&lrAName, &lrACurr, &lrAColor, &lrAIcon,
				)

				if lrNote.Valid {
					lr.Note = &lrNote.String
				}
				if lrAccID.Valid {
					lr.AccountId = &lrAccID.String
				}
				if lrTxID.Valid {
					lr.TransactionId = &lrTxID.String
				}
				if lrAccID.Valid && lrAName.Valid {
					lr.Account = &models.Account{
						ID:       lrAccID.String,
						UserID:   lr.UserID,
						Name:     lrAName.String,
						Currency: lrACurr.String,
						Color:    lrAColor.String,
						Icon:     lrAIcon.String,
					}
				}

				totalPaid += lr.Amount
				l.Records = append(l.Records, lr)
			}
			recRows.Close()
		}

		l.PaidAmount = totalPaid
		l.RemainingAmount = math.Max(0, l.Amount-totalPaid)
		if l.RemainingAmount <= 0.001 {
			l.IsPaid = true
		}

		loans = append(loans, l)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(loans)
}

func (h *LoanHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input struct {
		Name              string   `json:"name"`
		Amount            float64  `json:"amount"`
		Type              string   `json:"type"` // BORROW, LEND
		Color             string   `json:"color"`
		Icon              string   `json:"icon"`
		AccountId         *string  `json:"accountId"`
		Note              *string  `json:"note"`
		DateTime          *string  `json:"dateTime"`
		DueDate           *string  `json:"dueDate"`
		CreateTransaction bool     `json:"createTransaction"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Name == "" || input.Amount <= 0 {
		http.Error(w, "Invalid loan payload: name and positive amount required", http.StatusBadRequest)
		return
	}

	loanType := strings.ToUpper(input.Type)
	if loanType != "BORROW" && loanType != "LEND" {
		loanType = "BORROW"
	}

	if input.Color == "" {
		if loanType == "BORROW" {
			input.Color = "#F53D3D"
		} else {
			input.Color = "#12B880"
		}
	}
	if input.Icon == "" {
		input.Icon = "hand-coins"
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
		INSERT INTO loans (id, user_id, name, amount, type, color, icon, account_id, note, date_time, due_date, is_paid, is_deleted, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
	`, id, userID, input.Name, amount, loanType, input.Color, input.Icon, input.AccountId, input.Note, dt, parsedDueDate, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create associated transaction if requested
	if input.CreateTransaction && input.AccountId != nil && *input.AccountId != "" {
		txType := "INCOME"
		title := "Borrowed from " + input.Name
		if loanType == "LEND" {
			txType = "EXPENSE"
			title = "Lent to " + input.Name
		}

		_, _ = h.DB.Exec(`
			INSERT INTO transactions (id, user_id, account_id, type, amount, title, description, date_time, loan_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, uuid.NewString(), userID, *input.AccountId, txType, amount, title, input.Note, dt, id, now, now)
	}

	l := models.Loan{
		ID:              id,
		UserID:          userID,
		Name:            input.Name,
		Amount:          amount,
		Type:            loanType,
		Color:           input.Color,
		Icon:            input.Icon,
		AccountId:       input.AccountId,
		Note:            input.Note,
		DateTime:        dt,
		DueDate:         parsedDueDate,
		IsPaid:          false,
		RemainingAmount: amount,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(l)
}

func (h *LoanHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")
	var input struct {
		Name      *string  `json:"name"`
		Amount    *float64 `json:"amount"`
		Type      *string  `json:"type"`
		Color     *string  `json:"color"`
		Icon      *string  `json:"icon"`
		AccountId *string  `json:"accountId"`
		Note      *string  `json:"note"`
		DueDate   *string  `json:"dueDate"`
		IsPaid    *bool    `json:"isPaid"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	var name, loanType, color, icon string
	var amount float64
	var accID, note sql.NullString
	var dueDate sql.NullTime
	var isPaid int

	err := h.DB.QueryRow(`
		SELECT name, amount, type, color, icon, account_id, note, due_date, is_paid
		FROM loans WHERE id = ? AND user_id = ?
	`, id, userID).Scan(&name, &amount, &loanType, &color, &icon, &accID, &note, &dueDate, &isPaid)

	if err != nil {
		http.Error(w, "Loan record not found", http.StatusNotFound)
		return
	}

	if input.Name != nil {
		name = *input.Name
	}
	if input.Amount != nil {
		amount = math.Abs(*input.Amount)
	}
	if input.Type != nil {
		loanType = strings.ToUpper(*input.Type)
	}
	if input.Color != nil {
		color = *input.Color
	}
	if input.Icon != nil {
		icon = *input.Icon
	}
	if input.AccountId != nil {
		accID.String = *input.AccountId
		accID.Valid = true
	}
	if input.Note != nil {
		note.String = *input.Note
		note.Valid = true
	}
	if input.DueDate != nil && *input.DueDate != "" {
		if parsed, err := time.Parse(time.RFC3339, *input.DueDate); err == nil {
			dueDate.Time = parsed
			dueDate.Valid = true
		}
	}
	if input.IsPaid != nil {
		if *input.IsPaid {
			isPaid = 1
		} else {
			isPaid = 0
		}
	}

	_, err = h.DB.Exec(`
		UPDATE loans
		SET name = ?, amount = ?, type = ?, color = ?, icon = ?, account_id = ?, note = ?, due_date = ?, is_paid = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, name, amount, loanType, color, icon, accID, note, dueDate, isPaid, now, id, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        id,
		"userId":    userID,
		"name":      name,
		"amount":    amount,
		"type":      loanType,
		"color":     color,
		"icon":      icon,
		"isPaid":    isPaid == 1,
		"updatedAt": now,
	})
}

func (h *LoanHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")
	now := time.Now().UTC()

	_, err := h.DB.Exec(`UPDATE loans SET is_deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?`, now, id, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (h *LoanHandler) AddRepayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	loanId := chi.URLParam(r, "id")
	var input struct {
		Amount            float64 `json:"amount"`
		DateTime          *string `json:"dateTime"`
		Note              *string `json:"note"`
		AccountId         *string `json:"accountId"`
		CreateTransaction bool    `json:"createTransaction"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Amount <= 0 {
		http.Error(w, "Valid positive repayment amount required", http.StatusBadRequest)
		return
	}

	var loanName, loanType string
	var loanAmount float64
	err := h.DB.QueryRow(`SELECT name, type, amount FROM loans WHERE id = ? AND user_id = ?`, loanId, userID).Scan(&loanName, &loanType, &loanAmount)
	if err != nil {
		http.Error(w, "Loan not found", http.StatusNotFound)
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

	var createdTxID *string
	if input.CreateTransaction && input.AccountId != nil && *input.AccountId != "" {
		txType := "EXPENSE"
		title := "Repayment to " + loanName
		if loanType == "LEND" {
			txType = "INCOME"
			title = "Repayment from " + loanName
		}

		txID := uuid.NewString()
		_, _ = h.DB.Exec(`
			INSERT INTO transactions (id, user_id, account_id, type, amount, title, description, date_time, loan_id, loan_record_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, txID, userID, *input.AccountId, txType, input.Amount, title, input.Note, dt, loanId, id, now, now)
		createdTxID = &txID
	}

	_, err = h.DB.Exec(`
		INSERT INTO loan_records (id, user_id, loan_id, amount, date_time, note, account_id, transaction_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, userID, loanId, input.Amount, dt, input.Note, input.AccountId, createdTxID, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Recalculate total paid
	var totalPaid float64
	_ = h.DB.QueryRow(`SELECT COALESCE(SUM(amount), 0) FROM loan_records WHERE loan_id = ? AND user_id = ?`, loanId, userID).Scan(&totalPaid)
	if totalPaid >= loanAmount {
		_, _ = h.DB.Exec(`UPDATE loans SET is_paid = 1, updated_at = ? WHERE id = ? AND user_id = ?`, now, loanId, userID)
	}

	rec := models.LoanRecord{
		ID:            id,
		UserID:        userID,
		LoanId:        loanId,
		Amount:        input.Amount,
		DateTime:      dt,
		Note:          input.Note,
		AccountId:     input.AccountId,
		TransactionId: createdTxID,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(rec)
}
