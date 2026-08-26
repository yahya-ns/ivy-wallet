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
	"golang.org/x/crypto/bcrypt"
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
		AuthEnabled:       h.Config.Enabled,
		OIDCEnabled:       h.OIDCClient.IsEnabled(),
		OIDCProviderName:  h.Config.OIDCProviderName,
		LocalAuthEnabled:  h.Config.LocalAuthEnabled,
		AllowRegistration: h.Config.AllowRegistration,
		DevLoginEnabled:   h.Config.DevLoginEnabled,
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

// Register registers a new user with email, name, and password
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if !h.Config.LocalAuthEnabled || !h.Config.AllowRegistration {
		http.Error(w, "Account registration is disabled", http.StatusForbidden)
		return
	}

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || !strings.Contains(req.Email, "@") {
		http.Error(w, "A valid email address is required", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		req.Name = strings.Split(req.Email, "@")[0]
		if len(req.Name) > 0 {
			req.Name = strings.ToUpper(req.Name[:1]) + req.Name[1:]
		}
	}
	if len(req.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters long", http.StatusBadRequest)
		return
	}

	// Check if user with this email already exists
	existing, _ := h.DB.GetUserByEmail(req.Email)
	if existing != nil {
		http.Error(w, "An account with this email address already exists", http.StatusConflict)
		return
	}

	// Generate bcrypt password hash
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	// Determine role
	role := "user"
	if h.Config.AdminEmail != "" && req.Email == h.Config.AdminEmail {
		role = "admin"
	}

	user, err := h.DB.CreateLocalUser(req.Email, req.Name, string(hashed), role)
	if err != nil {
		http.Error(w, "Failed to create user account: "+err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := h.TokenMgr.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate session token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	h.TokenMgr.SetSessionCookie(w, token, isSecure)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"user":  user,
		"token": token,
	})
}

// Login authenticates a user with email and password
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if !h.Config.LocalAuthEnabled {
		http.Error(w, "Local authentication is disabled", http.StatusForbidden)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	user, passwordHash, err := h.DB.GetUserByEmailWithPassword(req.Email)
	if err != nil || user == nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if passwordHash == "" {
		http.Error(w, "This account is configured for SSO/OIDC login only", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	token, err := h.TokenMgr.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate session token: "+err.Error(), http.StatusInternalServerError)
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

// LocalLogin is an alias for Login for backward compatibility
func (h *AuthHandler) LocalLogin(w http.ResponseWriter, r *http.Request) {
	h.Login(w, r)
}

// ChangePassword allows authenticated users to update their local password
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	req.OldPassword = strings.TrimSpace(req.OldPassword)
	req.NewPassword = strings.TrimSpace(req.NewPassword)

	if len(req.NewPassword) < 6 {
		http.Error(w, "New password must be at least 6 characters long", http.StatusBadRequest)
		return
	}

	user, err := h.DB.GetUserByID(userID)
	if err != nil || user == nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	_, currentHash, err := h.DB.GetUserByEmailWithPassword(user.Email)
	if err != nil {
		http.Error(w, "Failed to retrieve user credentials", http.StatusInternalServerError)
		return
	}

	// Verify old password if current password hash exists
	if currentHash != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.OldPassword)); err != nil {
			http.Error(w, "Current password does not match", http.StatusBadRequest)
			return
		}
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash new password", http.StatusInternalServerError)
		return
	}

	if err := h.DB.UpdateUserPassword(userID, string(newHash)); err != nil {
		http.Error(w, "Failed to update password: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"message": "Password updated successfully",
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
