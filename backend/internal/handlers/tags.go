package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type TagHandler struct {
	DB *database.DB
}

func (h *TagHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT t.id, t.name, t.color, t.order_num, t.is_deleted, t.created_at, t.updated_at,
		       COUNT(DISTINCT tx.id) as tx_count
		FROM tags t
		LEFT JOIN transaction_tags tt ON t.id = tt.tag_id
		LEFT JOIN transactions tx ON tt.transaction_id = tx.id AND tx.is_deleted = 0
		WHERE t.is_deleted = 0
		GROUP BY t.id, t.name, t.color, t.order_num, t.is_deleted, t.created_at, t.updated_at
		ORDER BY t.order_num ASC, t.name ASC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tags := []models.Tag{}
	for rows.Next() {
		var t models.Tag
		var isDel int
		var txCount int
		if err := rows.Scan(&t.ID, &t.Name, &t.Color, &t.OrderNum, &isDel, &t.CreatedAt, &t.UpdatedAt, &txCount); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		t.IsDeleted = isDel == 1
		t.TransactionCount = txCount
		tags = append(tags, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
}

func (h *TagHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var t models.Tag
	var isDel int
	var txCount int

	err := h.DB.QueryRow(`
		SELECT t.id, t.name, t.color, t.order_num, t.is_deleted, t.created_at, t.updated_at,
		       COUNT(DISTINCT tx.id) as tx_count
		FROM tags t
		LEFT JOIN transaction_tags tt ON t.id = tt.tag_id
		LEFT JOIN transactions tx ON tt.transaction_id = tx.id AND tx.is_deleted = 0
		WHERE t.id = ? AND t.is_deleted = 0
		GROUP BY t.id, t.name, t.color, t.order_num, t.is_deleted, t.created_at, t.updated_at
	`, id).Scan(&t.ID, &t.Name, &t.Color, &t.OrderNum, &isDel, &t.CreatedAt, &t.UpdatedAt, &txCount)

	if err != nil {
		http.Error(w, "Tag not found", http.StatusNotFound)
		return
	}

	t.IsDeleted = isDel == 1
	t.TransactionCount = txCount

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *TagHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || strings.TrimSpace(input.Name) == "" {
		http.Error(w, "Tag name is required", http.StatusBadRequest)
		return
	}

	tagName := strings.TrimSpace(input.Name)
	// Remove leading # if user typed it
	tagName = strings.TrimPrefix(tagName, "#")

	if input.Color == "" {
		input.Color = "#5C3DF5"
	}

	now := time.Now().UTC()

	// Check if tag already exists (case-insensitive)
	var existing models.Tag
	var isDel int
	err := h.DB.QueryRow("SELECT id, name, color, order_num, is_deleted, created_at, updated_at FROM tags WHERE LOWER(name) = LOWER(?)", tagName).
		Scan(&existing.ID, &existing.Name, &existing.Color, &existing.OrderNum, &isDel, &existing.CreatedAt, &existing.UpdatedAt)

	if err == nil {
		// If existed but was deleted, reactivate it
		if isDel == 1 {
			_, _ = h.DB.Exec("UPDATE tags SET is_deleted = 0, color = ?, updated_at = ? WHERE id = ?", input.Color, now, existing.ID)
			existing.IsDeleted = false
			existing.Color = input.Color
			existing.UpdatedAt = now
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(existing)
			return
		}
		// Return existing tag
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(existing)
		return
	}

	var count int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM tags WHERE is_deleted = 0").Scan(&count)

	id := uuid.NewString()
	_, err = h.DB.Exec(`
		INSERT INTO tags (id, name, color, order_num, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, id, tagName, input.Color, count+1, now, now)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	t := models.Tag{
		ID:        id,
		Name:      tagName,
		Color:     input.Color,
		OrderNum:  count + 1,
		CreatedAt: now,
		UpdatedAt: now,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

func (h *TagHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input struct {
		Name     *string `json:"name"`
		Color    *string `json:"color"`
		OrderNum *int    `json:"orderNum"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	var name, color string
	var orderNum int

	err := h.DB.QueryRow("SELECT name, color, order_num FROM tags WHERE id = ?", id).Scan(&name, &color, &orderNum)
	if err != nil {
		http.Error(w, "Tag not found", http.StatusNotFound)
		return
	}

	if input.Name != nil {
		name = strings.TrimPrefix(strings.TrimSpace(*input.Name), "#")
	}
	if input.Color != nil {
		color = *input.Color
	}
	if input.OrderNum != nil {
		orderNum = *input.OrderNum
	}

	_, err = h.DB.Exec(`
		UPDATE tags
		SET name = ?, color = ?, order_num = ?, updated_at = ?
		WHERE id = ?
	`, name, color, orderNum, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        id,
		"name":      name,
		"color":     color,
		"orderNum":  orderNum,
		"updatedAt": now,
	})
}

func (h *TagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now().UTC()

	// Soft delete tag
	_, err := h.DB.Exec("UPDATE tags SET is_deleted = 1, updated_at = ? WHERE id = ?", now, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Remove transaction associations
	_, _ = h.DB.Exec("DELETE FROM transaction_tags WHERE tag_id = ?", id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
