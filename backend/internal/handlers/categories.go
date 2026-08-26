package handlers

import (
	"database/sql"
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
		SELECT id, name, color, icon, order_num, parent_id, is_deleted, created_at, updated_at
		FROM categories
		WHERE is_deleted = 0
		ORDER BY order_num ASC, created_at ASC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	allCategories := []models.Category{}
	categoryMap := make(map[string]*models.Category)
	subcategoriesByParent := make(map[string][]models.Category)

	for rows.Next() {
		var c models.Category
		var parentID sql.NullString
		var isDel int
		if err := rows.Scan(&c.ID, &c.Name, &c.Color, &c.Icon, &c.OrderNum, &parentID, &isDel, &c.CreatedAt, &c.UpdatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if parentID.Valid && parentID.String != "" {
			c.ParentId = &parentID.String
			subcategoriesByParent[parentID.String] = append(subcategoriesByParent[parentID.String], c)
		}
		c.IsDeleted = isDel == 1
		allCategories = append(allCategories, c)
	}

	for i := range allCategories {
		categoryMap[allCategories[i].ID] = &allCategories[i]
	}

	// Attach Subcategories to parent categories
	for i := range allCategories {
		if subs, exists := subcategoriesByParent[allCategories[i].ID]; exists {
			allCategories[i].Subcategories = subs
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allCategories)
}

func (h *CategoryHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c models.Category
	var parentID sql.NullString
	var isDel int

	err := h.DB.QueryRow(`
		SELECT id, name, color, icon, order_num, parent_id, is_deleted, created_at, updated_at
		FROM categories
		WHERE id = ? AND is_deleted = 0
	`, id).Scan(&c.ID, &c.Name, &c.Color, &c.Icon, &c.OrderNum, &parentID, &isDel, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		http.Error(w, "Category not found", http.StatusNotFound)
		return
	}

	if parentID.Valid && parentID.String != "" {
		c.ParentId = &parentID.String
	}
	c.IsDeleted = isDel == 1

	// Fetch subcategories if this is a parent category
	rows, err := h.DB.Query(`
		SELECT id, name, color, icon, order_num, parent_id, is_deleted, created_at, updated_at
		FROM categories
		WHERE parent_id = ? AND is_deleted = 0
		ORDER BY order_num ASC, created_at ASC
	`, id)
	if err == nil {
		defer rows.Close()
		subs := []models.Category{}
		for rows.Next() {
			var sc models.Category
			var pID sql.NullString
			var sDel int
			if err := rows.Scan(&sc.ID, &sc.Name, &sc.Color, &sc.Icon, &sc.OrderNum, &pID, &sDel, &sc.CreatedAt, &sc.UpdatedAt); err == nil {
				if pID.Valid {
					sc.ParentId = &pID.String
				}
				sc.IsDeleted = sDel == 1
				subs = append(subs, sc)
			}
		}
		c.Subcategories = subs
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name     string  `json:"name"`
		Color    string  `json:"color"`
		Icon     string  `json:"icon"`
		ParentId *string `json:"parentId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Name == "" {
		http.Error(w, "Category name is required", http.StatusBadRequest)
		return
	}

	if input.ParentId != nil && *input.ParentId == "" {
		input.ParentId = nil
	}

	// If creating a sub-category, inherit parent's color and icon
	if input.ParentId != nil {
		var pColor, pIcon string
		err := h.DB.QueryRow("SELECT color, icon FROM categories WHERE id = ?", *input.ParentId).Scan(&pColor, &pIcon)
		if err == nil {
			input.Color = pColor
			input.Icon = pIcon
		}
	}

	if input.Color == "" {
		input.Color = "#12B880"
	}
	if input.Icon == "" {
		input.Icon = "tag"
	}

	var count int
	if input.ParentId != nil {
		_ = h.DB.QueryRow("SELECT COUNT(*) FROM categories WHERE is_deleted = 0 AND parent_id = ?", *input.ParentId).Scan(&count)
	} else {
		_ = h.DB.QueryRow("SELECT COUNT(*) FROM categories WHERE is_deleted = 0 AND parent_id IS NULL").Scan(&count)
	}

	id := uuid.NewString()
	now := time.Now().UTC()

	_, err := h.DB.Exec(`
		INSERT INTO categories (id, name, color, icon, order_num, parent_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, id, input.Name, input.Color, input.Icon, count+1, input.ParentId, now, now)

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
		ParentId:  input.ParentId,
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
		ParentId *string `json:"parentId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	now := time.Now().UTC()
	var name, color, icon string
	var orderNum int
	var existingParentID sql.NullString

	err := h.DB.QueryRow(`
		SELECT name, color, icon, order_num, parent_id FROM categories WHERE id = ?
	`, id).Scan(&name, &color, &icon, &orderNum, &existingParentID)

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

	var parentID *string
	if existingParentID.Valid && existingParentID.String != "" {
		parentID = &existingParentID.String
	}
	if input.ParentId != nil {
		if *input.ParentId == "" {
			parentID = nil
		} else {
			parentID = input.ParentId
		}
	}

	// If updating a sub-category, inherit parent color and icon
	if parentID != nil && *parentID != "" {
		var pColor, pIcon string
		err := h.DB.QueryRow("SELECT color, icon FROM categories WHERE id = ?", *parentID).Scan(&pColor, &pIcon)
		if err == nil {
			color = pColor
			icon = pIcon
		}
	}

	_, err = h.DB.Exec(`
		UPDATE categories
		SET name = ?, color = ?, icon = ?, order_num = ?, parent_id = ?, updated_at = ?
		WHERE id = ?
	`, name, color, icon, orderNum, parentID, now, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// If parent category updated its color/icon, cascade to subcategories
	if parentID == nil {
		_, _ = h.DB.Exec(`
			UPDATE categories
			SET color = ?, icon = ?, updated_at = ?
			WHERE parent_id = ?
		`, color, icon, now, id)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        id,
		"name":      name,
		"color":     color,
		"icon":      icon,
		"orderNum":  orderNum,
		"parentId":  parentID,
		"updatedAt": now,
	})
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now().UTC()

	// Soft delete category and child subcategories
	_, err := h.DB.Exec(`
		UPDATE categories SET is_deleted = 1, updated_at = ? WHERE id = ? OR parent_id = ?
	`, now, id, id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
