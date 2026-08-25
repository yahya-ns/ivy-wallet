package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type SettingsHandler struct {
	DB *database.DB
}

func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	var s models.Settings
	var hideBal int

	err := h.DB.QueryRow(`
		SELECT id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, created_at, updated_at
		FROM settings LIMIT 1
	`).Scan(&s.ID, &s.Theme, &s.Currency, &s.BufferAmount, &s.Name, &s.FirstDayOfWeek, &hideBal, &s.CreatedAt, &s.UpdatedAt)

	if err != nil {
		// Initialize if missing
		id := uuid.NewString()
		now := time.Now().UTC()
		_, _ = h.DB.Exec(`
			INSERT INTO settings (id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, created_at, updated_at)
			VALUES (?, 'DARK', 'USD', 0.0, 'My Ivy Wallet', 1, 0, ?, ?)
		`, id, now, now)

		s = models.Settings{
			ID:             id,
			Theme:          "DARK",
			Currency:       "USD",
			BufferAmount:   0.0,
			Name:           "My Ivy Wallet",
			FirstDayOfWeek: 1,
			HideBalance:    false,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
	} else {
		s.HideBalance = hideBal == 1
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Theme          *string  `json:"theme"`
		Currency       *string  `json:"currency"`
		BufferAmount   *float64 `json:"bufferAmount"`
		Name           *string  `json:"name"`
		FirstDayOfWeek *int     `json:"firstDayOfWeek"`
		HideBalance    *bool    `json:"hideBalance"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	var s models.Settings
	var hideBal int

	err := h.DB.QueryRow(`
		SELECT id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance
		FROM settings LIMIT 1
	`).Scan(&s.ID, &s.Theme, &s.Currency, &s.BufferAmount, &s.Name, &s.FirstDayOfWeek, &hideBal)

	now := time.Now().UTC()

	if err != nil {
		s.ID = uuid.NewString()
		s.Theme = "DARK"
		s.Currency = "USD"
		s.BufferAmount = 0.0
		s.Name = "My Ivy Wallet"
		s.FirstDayOfWeek = 1
		hideBal = 0

		_, _ = h.DB.Exec(`
			INSERT INTO settings (id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, s.ID, s.Theme, s.Currency, s.BufferAmount, s.Name, s.FirstDayOfWeek, hideBal, now, now)
	}

	if input.Theme != nil {
		s.Theme = *input.Theme
	}
	if input.Currency != nil {
		s.Currency = *input.Currency
	}
	if input.BufferAmount != nil {
		s.BufferAmount = *input.BufferAmount
	}
	if input.Name != nil {
		s.Name = *input.Name
	}
	if input.FirstDayOfWeek != nil {
		s.FirstDayOfWeek = *input.FirstDayOfWeek
	}
	if input.HideBalance != nil {
		if *input.HideBalance {
			hideBal = 1
		} else {
			hideBal = 0
		}
	}

	_, err = h.DB.Exec(`
		UPDATE settings
		SET theme = ?, currency = ?, buffer_amount = ?, name = ?, first_day_of_week = ?, hide_balance = ?, updated_at = ?
		WHERE id = ?
	`, s.Theme, s.Currency, s.BufferAmount, s.Name, s.FirstDayOfWeek, hideBal, now, s.ID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.HideBalance = hideBal == 1
	s.UpdatedAt = now

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}
