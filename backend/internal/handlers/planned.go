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

type PlannedHandler struct {
	DB *database.DB
}

func (h *PlannedHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	rows, err := h.DB.Query(`
		SELECT p.id, p.user_id, p.start_date, p.interval_n, p.interval_type, p.one_time, p.type,
		       p.account_id, p.amount, p.category_id, p.title, p.description, p.is_active,
		       p.is_deleted, p.created_at, p.updated_at,
		       a.name, a.currency, a.color, a.icon,
		       c.name, c.color, c.icon
		FROM planned_payment_rules p
		LEFT JOIN accounts a ON p.account_id = a.id
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.user_id = ? AND p.is_deleted = 0
		ORDER BY p.created_at DESC
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	rules := []models.PlannedPaymentRule{}
	for rows.Next() {
		var p models.PlannedPaymentRule
		var oneTime, isActive, isDel int
		var catID, title, desc sql.NullString
		var aName, aCurr, aColor, aIcon sql.NullString
		var cName, cColor, cIcon sql.NullString

		if err := rows.Scan(
			&p.ID, &p.UserID, &p.StartDate, &p.IntervalN, &p.IntervalType, &oneTime, &p.Type,
			&p.AccountId, &p.Amount, &catID, &title, &desc, &isActive,
			&isDel, &p.CreatedAt, &p.UpdatedAt,
			&aName, &aCurr, &aColor, &aIcon,
			&cName, &cColor, &cIcon,
		); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

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

		if aName.Valid {
			p.Account = &models.Account{
				ID:       p.AccountId,
				UserID:   p.UserID,
				Name:     aName.String,
				Currency: aCurr.String,
				Color:    aColor.String,
				Icon:     aIcon.String,
			}
		}

		if catID.Valid && cName.Valid {
			p.Category = &models.Category{
				ID:     catID.String,
				UserID: p.UserID,
				Name:   cName.String,
				Color:  cColor.String,
				Icon:   cIcon.String,
			}
		}

		rules = append(rules, p)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(rules)
}

func (h *PlannedHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input struct {
		StartDate    *string  `json:"startDate"`
		IntervalN    *int     `json:"intervalN"`
		IntervalType *string  `json:"intervalType"`
		OneTime      *bool    `json:"oneTime"`
		Type         string   `json:"type"`
		AccountId    string   `json:"accountId"`
		Amount       float64  `json:"amount"`
		CategoryId   *string  `json:"categoryId"`
		Title        *string  `json:"title"`
		Description  *string  `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.AccountId == "" || input.Amount <= 0 {
		http.Error(w, "AccountId and positive amount required", http.StatusBadRequest)
		return
	}

	pType := strings.ToUpper(input.Type)
	if pType != "EXPENSE" && pType != "INCOME" {
		pType = "EXPENSE"
	}

	intervalN := 1
	if input.IntervalN != nil && *input.IntervalN > 0 {
		intervalN = *input.IntervalN
	}

	intervalType := "MONTH"
	if input.IntervalType != nil && *input.IntervalType != "" {
		intervalType = strings.ToUpper(*input.IntervalType)
	}

	oneTime := 0
	if input.OneTime != nil && *input.OneTime {
		oneTime = 1
	}

	id := uuid.NewString()
	now := time.Now().UTC()
	startDate := now
	if input.StartDate != nil && *input.StartDate != "" {
		if parsed, err := time.Parse(time.RFC3339, *input.StartDate); err == nil {
			startDate = parsed
		}
	}

	amount := math.Abs(input.Amount)

	_, err := h.DB.Exec(`
		INSERT INTO planned_payment_rules (id, user_id, start_date, interval_n, interval_type, one_time, type, account_id, amount, category_id, title, description, is_active, is_deleted, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
	`, id, userID, startDate, intervalN, intervalType, oneTime, pType, input.AccountId, amount, input.CategoryId, input.Title, input.Description, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rule := models.PlannedPaymentRule{
		ID:           id,
		UserID:       userID,
		StartDate:    startDate,
		IntervalN:    intervalN,
		IntervalType: intervalType,
		OneTime:      oneTime == 1,
		Type:         pType,
		AccountId:    input.AccountId,
		Amount:       amount,
		CategoryId:   input.CategoryId,
		Title:        input.Title,
		Description:  input.Description,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(rule)
}

func (h *PlannedHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")
	var input struct {
		StartDate    *string  `json:"startDate"`
		IntervalN    *int     `json:"intervalN"`
		IntervalType *string  `json:"intervalType"`
		OneTime      *bool    `json:"oneTime"`
		Type         *string  `json:"type"`
		AccountId    *string  `json:"accountId"`
		Amount       *float64 `json:"amount"`
		CategoryId   *string  `json:"categoryId"`
		Title        *string  `json:"title"`
		Description  *string  `json:"description"`
		IsActive     *bool    `json:"isActive"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	var startDate time.Time
	var intervalN, oneTime, isActive int
	var intervalType, pType, accountId string
	var amount float64
	var categoryId, title, description sql.NullString

	err := h.DB.QueryRow(`
		SELECT start_date, interval_n, interval_type, one_time, type, account_id, amount, category_id, title, description, is_active
		FROM planned_payment_rules WHERE id = ? AND user_id = ?
	`, id, userID).Scan(
		&startDate, &intervalN, &intervalType, &oneTime, &pType, &accountId, &amount,
		&categoryId, &title, &description, &isActive,
	)

	if err != nil {
		http.Error(w, "Planned rule not found", http.StatusNotFound)
		return
	}

	if input.StartDate != nil && *input.StartDate != "" {
		if parsed, err := time.Parse(time.RFC3339, *input.StartDate); err == nil {
			startDate = parsed
		}
	}
	if input.IntervalN != nil && *input.IntervalN > 0 {
		intervalN = *input.IntervalN
	}
	if input.IntervalType != nil {
		intervalType = strings.ToUpper(*input.IntervalType)
	}
	if input.OneTime != nil {
		if *input.OneTime {
			oneTime = 1
		} else {
			oneTime = 0
		}
	}
	if input.Type != nil {
		pType = strings.ToUpper(*input.Type)
	}
	if input.AccountId != nil {
		accountId = *input.AccountId
	}
	if input.Amount != nil {
		amount = math.Abs(*input.Amount)
	}
	if input.CategoryId != nil {
		categoryId.String = *input.CategoryId
		categoryId.Valid = true
	}
	if input.Title != nil {
		title.String = *input.Title
		title.Valid = true
	}
	if input.Description != nil {
		description.String = *input.Description
		description.Valid = true
	}
	if input.IsActive != nil {
		if *input.IsActive {
			isActive = 1
		} else {
			isActive = 0
		}
	}

	_, err = h.DB.Exec(`
		UPDATE planned_payment_rules
		SET start_date = ?, interval_n = ?, interval_type = ?, one_time = ?, type = ?,
		    account_id = ?, amount = ?, category_id = ?, title = ?, description = ?, is_active = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, startDate, intervalN, intervalType, oneTime, pType, accountId, amount, categoryId, title, description, isActive, now, id, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        id,
		"userId":    userID,
		"startDate": startDate,
		"amount":    amount,
		"updatedAt": now,
	})
}

func (h *PlannedHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")
	now := time.Now().UTC()

	_, err := h.DB.Exec(`UPDATE planned_payment_rules SET is_deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?`, now, id, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
