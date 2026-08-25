package handlers

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type AccountHandler struct {
	DB *database.DB
}

func (h *AccountHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT id, name, currency, color, icon, order_num, include_in_balance, is_deleted, created_at, updated_at
		FROM accounts
		WHERE is_deleted = 0
		ORDER BY order_num ASC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	accounts := []models.Account{}
	for rows.Next() {
		var a models.Account
		var incInBal, isDel int
		if err := rows.Scan(&a.ID, &a.Name, &a.Currency, &a.Color, &a.Icon, &a.OrderNum, &incInBal, &isDel, &a.CreatedAt, &a.UpdatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		a.IncludeInBalance = incInBal == 1
		a.IsDeleted = isDel == 1

		// Calculate live balances & stats
		// 1. Transactions directly from this account
		txRows, err := h.DB.Query(`
			SELECT type, amount FROM transactions WHERE account_id = ? AND is_deleted = 0
		`, a.ID)
		if err == nil {
			for txRows.Next() {
				var txType string
				var amount float64
				_ = txRows.Scan(&txType, &amount)
				if txType == "INCOME" {
					a.Balance += amount
					a.TotalIncome += amount
				} else if txType == "EXPENSE" {
					a.Balance -= amount
					a.TotalExpense += amount
				} else if txType == "TRANSFER" {
					a.Balance -= amount
				}
			}
			txRows.Close()
		}

		// 2. Incoming transfers to this account
		toRows, err := h.DB.Query(`
			SELECT amount, to_amount FROM transactions WHERE to_account_id = ? AND type = 'TRANSFER' AND is_deleted = 0
		`, a.ID)
		if err == nil {
			for toRows.Next() {
				var amount float64
				var toAmount sql.NullFloat64
				_ = toRows.Scan(&amount, &toAmount)
				if toAmount.Valid {
					a.Balance += toAmount.Float64
				} else {
					a.Balance += amount
				}
			}
			toRows.Close()
		}

		accounts = append(accounts, a)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(accounts)
}

func (h *AccountHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var a models.Account
	var incInBal, isDel int

	err := h.DB.QueryRow(`
		SELECT id, name, currency, color, icon, order_num, include_in_balance, is_deleted, created_at, updated_at
		FROM accounts
		WHERE id = ? AND is_deleted = 0
	`, id).Scan(&a.ID, &a.Name, &a.Currency, &a.Color, &a.Icon, &a.OrderNum, &incInBal, &isDel, &a.CreatedAt, &a.UpdatedAt)

	if err != nil {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}
	a.IncludeInBalance = incInBal == 1
	a.IsDeleted = isDel == 1

	// Calculate live balances & stats
	// 1. Transactions directly from this account
	txRows, err := h.DB.Query(`
		SELECT type, amount FROM transactions WHERE account_id = ? AND is_deleted = 0
	`, a.ID)
	if err == nil {
		for txRows.Next() {
			var txType string
			var amount float64
			_ = txRows.Scan(&txType, &amount)
			if txType == "INCOME" {
				a.Balance += amount
				a.TotalIncome += amount
			} else if txType == "EXPENSE" {
				a.Balance -= amount
				a.TotalExpense += amount
			} else if txType == "TRANSFER" {
				a.Balance -= amount
			}
		}
		txRows.Close()
	}

	// 2. Incoming transfers to this account
	toRows, err := h.DB.Query(`
		SELECT amount, to_amount FROM transactions WHERE to_account_id = ? AND type = 'TRANSFER' AND is_deleted = 0
	`, a.ID)
	if err == nil {
		for toRows.Next() {
			var amount float64
			var toAmount sql.NullFloat64
			_ = toRows.Scan(&amount, &toAmount)
			if toAmount.Valid {
				a.Balance += toAmount.Float64
			} else {
				a.Balance += amount
			}
		}
		toRows.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(a)
}

func (h *AccountHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name             string   `json:"name"`
		Currency         string   `json:"currency"`
		Color            string   `json:"color"`
		Icon             string   `json:"icon"`
		IncludeInBalance *bool    `json:"includeInBalance"`
		InitialBalance   *float64 `json:"initialBalance"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Name == "" {
		http.Error(w, "Invalid account payload or missing name", http.StatusBadRequest)
		return
	}

	if input.Currency == "" {
		input.Currency = "USD"
	}
	if input.Color == "" {
		input.Color = "#5C3DF5"
	}
	if input.Icon == "" {
		input.Icon = "wallet"
	}

	incInBal := 1
	if input.IncludeInBalance != nil && !*input.IncludeInBalance {
		incInBal = 0
	}

	var count int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM accounts WHERE is_deleted = 0").Scan(&count)

	id := uuid.NewString()
	now := time.Now().UTC()

	_, err := h.DB.Exec(`
		INSERT INTO accounts (id, name, currency, color, icon, order_num, include_in_balance, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, input.Name, input.Currency, input.Color, input.Icon, count+1, incInBal, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Add Initial balance transaction if provided
	if input.InitialBalance != nil && *input.InitialBalance != 0 {
		amt := *input.InitialBalance
		txType := "INCOME"
		if amt < 0 {
			txType = "EXPENSE"
			amt = -amt
		}

		_, _ = h.DB.Exec(`
			INSERT INTO transactions (id, account_id, type, amount, title, date_time, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'Initial Balance', ?, ?, ?)
		`, uuid.NewString(), id, txType, amt, now, now, now)
	}

	a := models.Account{
		ID:               id,
		Name:             input.Name,
		Currency:         input.Currency,
		Color:            input.Color,
		Icon:             input.Icon,
		OrderNum:         count + 1,
		IncludeInBalance: incInBal == 1,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(a)
}

func (h *AccountHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input struct {
		Name             *string  `json:"name"`
		Currency         *string  `json:"currency"`
		Color            *string  `json:"color"`
		Icon             *string  `json:"icon"`
		OrderNum         *int     `json:"orderNum"`
		IncludeInBalance *bool    `json:"includeInBalance"`
		Balance          *float64 `json:"balance"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	var name, curr, color, icon string
	var orderNum, incInBal int

	err := h.DB.QueryRow(`
		SELECT name, currency, color, icon, order_num, include_in_balance
		FROM accounts WHERE id = ?
	`, id).Scan(&name, &curr, &color, &icon, &orderNum, &incInBal)

	if err != nil {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}

	if input.Name != nil {
		name = *input.Name
	}
	if input.Currency != nil {
		curr = *input.Currency
	}
	if input.Color != nil {
		color = *input.Color
	}
	if input.Icon != nil {
		icon = *input.Icon
	}
	if input.OrderNum != nil {
		orderNum = *input.OrderNum
	}
	if input.IncludeInBalance != nil {
		if *input.IncludeInBalance {
			incInBal = 1
		} else {
			incInBal = 0
		}
	}

	_, err = h.DB.Exec(`
		UPDATE accounts
		SET name = ?, currency = ?, color = ?, icon = ?, order_num = ?, include_in_balance = ?, updated_at = ?
		WHERE id = ?
	`, name, curr, color, icon, orderNum, incInBal, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// If balance is provided, calculate current balance and create an adjustment transaction if there's a difference
	if input.Balance != nil {
		var currentBalance float64
		// 1. Transactions directly from this account
		txRows, err := h.DB.Query(`
			SELECT type, amount FROM transactions WHERE account_id = ? AND is_deleted = 0
		`, id)
		if err == nil {
			for txRows.Next() {
				var txType string
				var amount float64
				_ = txRows.Scan(&txType, &amount)
				if txType == "INCOME" {
					currentBalance += amount
				} else if txType == "EXPENSE" || txType == "TRANSFER" {
					currentBalance -= amount
				}
			}
			txRows.Close()
		}

		// 2. Incoming transfers to this account
		toRows, err := h.DB.Query(`
			SELECT amount, to_amount FROM transactions WHERE to_account_id = ? AND type = 'TRANSFER' AND is_deleted = 0
		`, id)
		if err == nil {
			for toRows.Next() {
				var amount float64
				var toAmount sql.NullFloat64
				_ = toRows.Scan(&amount, &toAmount)
				if toAmount.Valid {
					currentBalance += toAmount.Float64
				} else {
					currentBalance += amount
				}
			}
			toRows.Close()
		}

		diff := *input.Balance - currentBalance
		if math.Abs(diff) >= 0.005 {
			txType := "INCOME"
			amt := diff
			if diff < 0 {
				txType = "EXPENSE"
				amt = -diff
			}

			_, _ = h.DB.Exec(`
				INSERT INTO transactions (id, account_id, type, amount, title, date_time, created_at, updated_at)
				VALUES (?, ?, ?, ?, 'Balance Adjustment', ?, ?, ?)
			`, uuid.NewString(), id, txType, amt, now, now, now)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":               id,
		"name":             name,
		"currency":         curr,
		"color":            color,
		"icon":             icon,
		"orderNum":         orderNum,
		"includeInBalance": incInBal == 1,
		"updatedAt":        now,
	})
}

func (h *AccountHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now().UTC()

	_, err := h.DB.Exec(`
		UPDATE accounts SET is_deleted = 1, updated_at = ? WHERE id = ?
	`, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
