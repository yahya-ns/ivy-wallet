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

type BudgetHandler struct {
	DB *database.DB
}

func (h *BudgetHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	rows, err := h.DB.Query(`
		SELECT id, user_id, name, amount, category_ids, account_ids, period, order_id, created_at, updated_at
		FROM budgets
		WHERE user_id = ?
		ORDER BY order_id ASC
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

	budgets := []models.Budget{}
	for rows.Next() {
		var b models.Budget
		var catIDs, accIDs sql.NullString
		if err := rows.Scan(&b.ID, &b.UserID, &b.Name, &b.Amount, &catIDs, &accIDs, &b.Period, &b.OrderId, &b.CreatedAt, &b.UpdatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if catIDs.Valid {
			b.CategoryIds = &catIDs.String
		}
		if accIDs.Valid {
			b.AccountIds = &accIDs.String
		}

		// Calculate spent amount for current month for this user
		var categoryList []string
		if b.CategoryIds != nil && *b.CategoryIds != "" {
			_ = json.Unmarshal([]byte(*b.CategoryIds), &categoryList)
			if len(categoryList) == 0 {
				categoryList = strings.Split(*b.CategoryIds, ",")
			}
		}

		query := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'EXPENSE' AND is_deleted = 0 AND date_time >= ? AND date_time <= ?`
		args := []interface{}{userID, startOfMonth, endOfMonth}

		if len(categoryList) > 0 {
			placeholders := make([]string, len(categoryList))
			for i, c := range categoryList {
				placeholders[i] = "?"
				args = append(args, strings.TrimSpace(c))
			}
			query += " AND category_id IN (" + strings.Join(placeholders, ",") + ")"
		}

		_ = h.DB.QueryRow(query, args...).Scan(&b.Spent)
		b.Remaining = math.Max(0, b.Amount-b.Spent)
		if b.Amount > 0 {
			b.Percentage = math.Round((b.Spent/b.Amount)*1000) / 10
		}

		budgets = append(budgets, b)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(budgets)
}

func (h *BudgetHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input struct {
		Name        string      `json:"name"`
		Amount      float64     `json:"amount"`
		CategoryIds interface{} `json:"categoryIds"` // array or string
		AccountIds  interface{} `json:"accountIds"`
		Period      string      `json:"period"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Name == "" || input.Amount <= 0 {
		http.Error(w, "Budget name and positive amount are required", http.StatusBadRequest)
		return
	}

	if input.Period == "" {
		input.Period = "MONTHLY"
	}

	var catJSON *string
	if input.CategoryIds != nil {
		if bytes, err := json.Marshal(input.CategoryIds); err == nil {
			str := string(bytes)
			catJSON = &str
		}
	}

	var count int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM budgets WHERE user_id = ?", userID).Scan(&count)

	id := uuid.NewString()
	now := time.Now().UTC()

	_, err := h.DB.Exec(`
		INSERT INTO budgets (id, user_id, name, amount, category_ids, period, order_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, userID, input.Name, input.Amount, catJSON, input.Period, count+1, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	b := models.Budget{
		ID:          id,
		UserID:      userID,
		Name:        input.Name,
		Amount:      input.Amount,
		CategoryIds: catJSON,
		Period:      input.Period,
		OrderId:     count + 1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(b)
}

func (h *BudgetHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")
	var input struct {
		Name        *string     `json:"name"`
		Amount      *float64    `json:"amount"`
		CategoryIds interface{} `json:"categoryIds"`
		Period      *string     `json:"period"`
		OrderId     *int        `json:"orderId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	var name, period string
	var amount float64
	var orderId int
	var catIDs sql.NullString

	err := h.DB.QueryRow(`
		SELECT name, amount, category_ids, period, order_id FROM budgets WHERE id = ? AND user_id = ?
	`, id, userID).Scan(&name, &amount, &catIDs, &period, &orderId)

	if err != nil {
		http.Error(w, "Budget not found", http.StatusNotFound)
		return
	}

	if input.Name != nil {
		name = *input.Name
	}
	if input.Amount != nil {
		amount = math.Abs(*input.Amount)
	}
	if input.Period != nil {
		period = *input.Period
	}
	if input.OrderId != nil {
		orderId = *input.OrderId
	}

	var catJSON *string
	if input.CategoryIds != nil {
		if bytes, err := json.Marshal(input.CategoryIds); err == nil {
			str := string(bytes)
			catJSON = &str
		}
	} else if catIDs.Valid {
		catJSON = &catIDs.String
	}

	_, err = h.DB.Exec(`
		UPDATE budgets
		SET name = ?, amount = ?, category_ids = ?, period = ?, order_id = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, name, amount, catJSON, period, orderId, now, id, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id":          id,
		"userId":      userID,
		"name":        name,
		"amount":      amount,
		"categoryIds": catJSON,
		"period":      period,
		"orderId":     orderId,
		"updatedAt":   now,
	})
}

func (h *BudgetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")
	_, err := h.DB.Exec("DELETE FROM budgets WHERE id = ? AND user_id = ?", id, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
