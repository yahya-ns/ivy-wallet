package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/middleware"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type SettingsHandler struct {
	DB *database.DB
}

func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var s models.Settings
	var hideBal int
	var dateFormat, timeFormat sql.NullString

	err := h.DB.QueryRow(`
		SELECT id, user_id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, date_format, time_format, created_at, updated_at
		FROM settings WHERE user_id = ? LIMIT 1
	`, userID).Scan(&s.ID, &s.UserID, &s.Theme, &s.Currency, &s.BufferAmount, &s.Name, &s.FirstDayOfWeek, &hideBal, &dateFormat, &timeFormat, &s.CreatedAt, &s.UpdatedAt)

	if err != nil {
		// Initialize for this user if missing
		id := uuid.NewString()
		now := time.Now().UTC()
		_, _ = h.DB.Exec(`
			INSERT INTO settings (id, user_id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, date_format, time_format, created_at, updated_at)
			VALUES (?, ?, 'DARK', 'USD', 0.0, 'My Ivy Wallet', 1, 0, 'YYYY-MM-DD', '24_HOUR', ?, ?)
		`, id, userID, now, now)

		s = models.Settings{
			ID:             id,
			UserID:         userID,
			Theme:          "DARK",
			Currency:       "USD",
			BufferAmount:   0.0,
			Name:           "My Ivy Wallet",
			FirstDayOfWeek: 1,
			HideBalance:    false,
			DateFormat:     "YYYY-MM-DD",
			TimeFormat:     "24_HOUR",
			CreatedAt:      now,
			UpdatedAt:      now,
		}
	} else {
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
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(s)
}

func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input struct {
		Theme          *string  `json:"theme"`
		Currency       *string  `json:"currency"`
		BufferAmount   *float64 `json:"bufferAmount"`
		Name           *string  `json:"name"`
		FirstDayOfWeek *int     `json:"firstDayOfWeek"`
		HideBalance    *bool    `json:"hideBalance"`
		DateFormat     *string  `json:"dateFormat"`
		TimeFormat     *string  `json:"timeFormat"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	var s models.Settings
	var hideBal int
	var dateFormat, timeFormat sql.NullString

	err := h.DB.QueryRow(`
		SELECT id, user_id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, date_format, time_format
		FROM settings WHERE user_id = ? LIMIT 1
	`, userID).Scan(&s.ID, &s.UserID, &s.Theme, &s.Currency, &s.BufferAmount, &s.Name, &s.FirstDayOfWeek, &hideBal, &dateFormat, &timeFormat)

	now := time.Now().UTC()

	if err != nil {
		s.ID = uuid.NewString()
		s.UserID = userID
		s.Theme = "DARK"
		s.Currency = "USD"
		s.BufferAmount = 0.0
		s.Name = "My Ivy Wallet"
		s.FirstDayOfWeek = 1
		s.DateFormat = "YYYY-MM-DD"
		s.TimeFormat = "24_HOUR"
		hideBal = 0

		_, _ = h.DB.Exec(`
			INSERT INTO settings (id, user_id, theme, currency, buffer_amount, name, first_day_of_week, hide_balance, date_format, time_format, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, s.ID, userID, s.Theme, s.Currency, s.BufferAmount, s.Name, s.FirstDayOfWeek, hideBal, s.DateFormat, s.TimeFormat, now, now)
	} else {
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
	if input.DateFormat != nil {
		s.DateFormat = *input.DateFormat
	}
	if input.TimeFormat != nil {
		s.TimeFormat = *input.TimeFormat
	}

	_, err = h.DB.Exec(`
		UPDATE settings
		SET theme = ?, currency = ?, buffer_amount = ?, name = ?, first_day_of_week = ?, hide_balance = ?, date_format = ?, time_format = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, s.Theme, s.Currency, s.BufferAmount, s.Name, s.FirstDayOfWeek, hideBal, s.DateFormat, s.TimeFormat, now, s.ID, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.HideBalance = hideBal == 1
	s.UpdatedAt = now

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(s)
}
