package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/yahya-ns/ivy-wallet/backend/internal/auth"
	"github.com/yahya-ns/ivy-wallet/backend/internal/config"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/middleware"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type AuthHandler struct {
	DB         *database.DB
	Config     config.AuthConfig
	AppURL     string
	TokenMgr   *auth.TokenManager
	OIDCClient *auth.OIDCClient
}

func NewAuthHandler(db *database.DB, cfg config.AuthConfig, appURL string, tm *auth.TokenManager, oidcClient *auth.OIDCClient) *AuthHandler {
	return &AuthHandler{
		DB:         db,
		Config:     cfg,
		AppURL:     appURL,
		TokenMgr:   tm,
		OIDCClient: oidcClient,
	}
}

// GetConfig returns auth features enabled on the server
func (h *AuthHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(models.AuthConfigResponse{
		AuthEnabled:      h.Config.Enabled,
		OIDCEnabled:      h.OIDCClient.IsEnabled(),
		OIDCProviderName: h.Config.OIDCProviderName,
		LocalAuthEnabled: h.Config.LocalAuthEnabled,
		DevLoginEnabled:  h.Config.DevLoginEnabled,
	})
}

// OIDCLogin initiates the OpenID Connect authorization code flow
func (h *AuthHandler) OIDCLogin(w http.ResponseWriter, r *http.Request) {
	if !h.OIDCClient.IsEnabled() {
		http.Error(w, "OIDC authentication is not configured", http.StatusBadRequest)
		return
	}

	authURL, err := h.OIDCClient.GenerateAuthURL(w, r)
	if err != nil {
		http.Error(w, "Failed to initialize OIDC login: "+err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, authURL, http.StatusFound)
}

// OIDCCallback processes the IdP callback, provisions/updates user, and sets session cookie
func (h *AuthHandler) OIDCCallback(w http.ResponseWriter, r *http.Request) {
	info, err := h.OIDCClient.HandleCallback(r)
	if err != nil {
		errMsg := url.QueryEscape(err.Error())
		http.Redirect(w, r, "/login?error="+errMsg, http.StatusFound)
		return
	}

	user, err := h.DB.UpsertOIDCUser(info.Email, info.Name, info.AvatarURL, info.Subject)
	if err != nil {
		errMsg := url.QueryEscape("Failed to create or update user profile: " + err.Error())
		http.Redirect(w, r, "/login?error="+errMsg, http.StatusFound)
		return
	}

	token, err := h.TokenMgr.GenerateToken(user)
	if err != nil {
		errMsg := url.QueryEscape("Failed to generate session token: " + err.Error())
		http.Redirect(w, r, "/login?error="+errMsg, http.StatusFound)
		return
	}

	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	h.TokenMgr.SetSessionCookie(w, token, isSecure)

	// Redirect to frontend root or target
	http.Redirect(w, r, "/", http.StatusFound)
}

// LocalLogin authenticates or provisions a user using email credentials
func (h *AuthHandler) LocalLogin(w http.ResponseWriter, r *http.Request) {
	if !h.Config.LocalAuthEnabled {
		http.Error(w, "Local authentication is disabled", http.StatusForbidden)
		return
	}

	var req models.LocalLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	name := strings.Split(req.Email, "@")[0]
	if len(name) > 0 {
		name = strings.ToUpper(name[:1]) + name[1:]
	}

	user, err := h.DB.UpsertLocalOrDevUser(req.Email, name, "local")
	if err != nil {
		http.Error(w, "Failed to login: "+err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := h.TokenMgr.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to create session token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	h.TokenMgr.SetSessionCookie(w, token, isSecure)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"user":  user,
		"token": token,
	})
}

// DevLogin allows quick 1-click test user switcher in development mode
func (h *AuthHandler) DevLogin(w http.ResponseWriter, r *http.Request) {
	if !h.Config.DevLoginEnabled {
		http.Error(w, "Dev login is disabled", http.StatusForbidden)
		return
	}

	var req models.DevLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" {
		req.Email = "demo@ivy.local"
	}
	if req.Name == "" {
		req.Name = "Demo User"
	}

	user, err := h.DB.UpsertLocalOrDevUser(req.Email, req.Name, "dev")
	if err != nil {
		http.Error(w, "Failed to login dev user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := h.TokenMgr.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	h.TokenMgr.SetSessionCookie(w, token, isSecure)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"user":  user,
		"token": token,
	})
}

// Me returns the currently authenticated user
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	if !h.Config.Enabled {
		// Return default user if auth is globally disabled
		user, _ := h.DB.GetUserByID(database.DefaultUserID)
		if user == nil {
			user = &models.User{
				ID:       database.DefaultUserID,
				Email:    "admin@ivy.local",
				Name:     "Default Admin",
				Role:     "admin",
				Provider: "local",
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(models.AuthMeResponse{User: user})
		return
	}

	tokenStr := h.TokenMgr.GetTokenFromRequest(r)
	if tokenStr == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	claims, err := h.TokenMgr.ValidateToken(tokenStr)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	user, err := h.DB.GetUserByID(claims.UserID)
	if err != nil || user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(models.AuthMeResponse{User: user})
}

// Logout clears the session cookie
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	h.TokenMgr.ClearSessionCookie(w, isSecure)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// UpdateMe updates user profile name or settings
func (h *AuthHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name != "" {
		_, _ = h.DB.Exec("UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", req.Name, userID)
	}

	user, err := h.DB.GetUserByID(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(models.AuthMeResponse{User: user})
}
