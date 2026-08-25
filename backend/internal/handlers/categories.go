package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type CategoryHandler struct {
	DB *database.DB
}

func (h *CategoryHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT id, name, color, icon, order_num, is_deleted, created_at, updated_at
		FROM categories
		WHERE is_deleted = 0
		ORDER BY order_num ASC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	categories := []models.Category{}
	for rows.Next() {
		var c models.Category
		var isDel int
		if err := rows.Scan(&c.ID, &c.Name, &c.Color, &c.Icon, &c.OrderNum, &isDel, &c.CreatedAt, &c.UpdatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		c.IsDeleted = isDel == 1
		categories = append(categories, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name  string `json:"name"`
		Color string `json:"color"`
		Icon  string `json:"icon"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Name == "" {
		http.Error(w, "Category name is required", http.StatusBadRequest)
		return
	}

	if input.Color == "" {
		input.Color = "#12B880"
	}
	if input.Icon == "" {
		input.Icon = "tag"
	}

	var count int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM categories WHERE is_deleted = 0").Scan(&count)

	id := uuid.NewString()
	now := time.Now().UTC()

	_, err := h.DB.Exec(`
		INSERT INTO categories (id, name, color, icon, order_num, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, id, input.Name, input.Color, input.Icon, count+1, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	c := models.Category{
		ID:        id,
		Name:      input.Name,
		Color:     input.Color,
		Icon:      input.Icon,
		OrderNum:  count + 1,
		CreatedAt: now,
		UpdatedAt: now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input struct {
		Name     *string `json:"name"`
		Color    *string `json:"color"`
		Icon     *string `json:"icon"`
		OrderNum *int    `json:"orderNum"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	var name, color, icon string
	var orderNum int

	err := h.DB.QueryRow(`
		SELECT name, color, icon, order_num FROM categories WHERE id = ?
	`, id).Scan(&name, &color, &icon, &orderNum)

	if err != nil {
		http.Error(w, "Category not found", http.StatusNotFound)
		return
	}

	if input.Name != nil {
		name = *input.Name
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

	_, err = h.DB.Exec(`
		UPDATE categories
		SET name = ?, color = ?, icon = ?, order_num = ?, updated_at = ?
		WHERE id = ?
	`, name, color, icon, orderNum, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        id,
		"name":      name,
		"color":     color,
		"icon":      icon,
		"orderNum":  orderNum,
		"updatedAt": now,
	})
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now().UTC()

	_, err := h.DB.Exec(`
		UPDATE categories SET is_deleted = 1, updated_at = ? WHERE id = ?
	`, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
