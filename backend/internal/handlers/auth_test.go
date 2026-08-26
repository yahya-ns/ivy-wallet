package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yahya-ns/ivy-wallet/backend/internal/auth"
	"github.com/yahya-ns/ivy-wallet/backend/internal/config"
	"github.com/yahya-ns/ivy-wallet/backend/internal/handlers"
	"github.com/yahya-ns/ivy-wallet/backend/internal/middleware"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

func TestAuthEndpoints(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cfg := config.AuthConfig{
		Enabled:              true,
		JWTSecret:            "test-secret-at-least-32-chars-long",
		SessionCookie:        "test_session",
		OIDCEnabled:          false,
		LocalAuthEnabled:     true,
		AllowRegistration:    true,
		InitialAdminPassword: "admin123",
		AdminEmail:           "admin@ivy.local",
		DevLoginEnabled:      true,
		OIDCProviderName:     "SSO (OIDC)",
	}

	tm := auth.NewTokenManager(cfg.JWTSecret, cfg.SessionCookie)
	oidcClient, _ := auth.NewOIDCClient(cfg)
	authHandler := handlers.NewAuthHandler(db, cfg, "http://localhost:3000", tm, oidcClient)

	// 1. Test GetConfig
	req := httptest.NewRequest(http.MethodGet, "/api/auth/config", nil)
	w := httptest.NewRecorder()
	authHandler.GetConfig(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var conf models.AuthConfigResponse
	if err := json.NewDecoder(w.Body).Decode(&conf); err != nil {
		t.Fatalf("Failed to decode auth config: %v", err)
	}

	if !conf.AuthEnabled || !conf.LocalAuthEnabled || !conf.AllowRegistration || !conf.DevLoginEnabled {
		t.Errorf("Unexpected auth config response: %+v", conf)
	}

	// 2. Test Default Admin Login with Password ("admin123")
	body, _ := json.Marshal(models.LoginRequest{
		Email:    "admin@ivy.local",
		Password: "admin123",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	w = httptest.NewRecorder()
	authHandler.Login(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 on admin login, got %d: %s", w.Code, w.Body.String())
	}

	var adminResp struct {
		User  models.User `json:"user"`
		Token string      `json:"token"`
	}
	if err := json.NewDecoder(w.Body).Decode(&adminResp); err != nil {
		t.Fatalf("Failed to decode admin login response: %v", err)
	}
	if adminResp.User.Role != "admin" {
		t.Errorf("Expected admin role, got %s", adminResp.User.Role)
	}

	// 3. Test Register New User
	body, _ = json.Marshal(models.RegisterRequest{
		Email:    "bob@example.com",
		Name:     "Bob Builder",
		Password: "password123",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	w = httptest.NewRecorder()
	authHandler.Register(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201 on register, got %d: %s", w.Code, w.Body.String())
	}

	var regResp struct {
		User  models.User `json:"user"`
		Token string      `json:"token"`
	}
	if err := json.NewDecoder(w.Body).Decode(&regResp); err != nil {
		t.Fatalf("Failed to decode register response: %v", err)
	}
	if regResp.User.Email != "bob@example.com" {
		t.Errorf("Expected email bob@example.com, got %s", regResp.User.Email)
	}

	// 4. Test Login with registered user with Wrong Password
	body, _ = json.Marshal(models.LoginRequest{
		Email:    "bob@example.com",
		Password: "wrongpassword",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	w = httptest.NewRecorder()
	authHandler.Login(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 on wrong password, got %d", w.Code)
	}

	// 5. Test Login with registered user with Correct Password
	body, _ = json.Marshal(models.LoginRequest{
		Email:    "bob@example.com",
		Password: "password123",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	w = httptest.NewRecorder()
	authHandler.Login(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 on login, got %d", w.Code)
	}

	// 6. Test ChangePassword
	body, _ = json.Marshal(models.ChangePasswordRequest{
		OldPassword: "password123",
		NewPassword: "newsecretpassword456",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/change-password", bytes.NewReader(body))
	ctx := context.WithValue(req.Context(), middleware.UserIDContextKey, regResp.User.ID)
	req = req.WithContext(ctx)
	w = httptest.NewRecorder()
	authHandler.ChangePassword(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 on change password, got %d: %s", w.Code, w.Body.String())
	}

	// 7. Verify login works with new password
	body, _ = json.Marshal(models.LoginRequest{
		Email:    "bob@example.com",
		Password: "newsecretpassword456",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	w = httptest.NewRecorder()
	authHandler.Login(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 on login with new password, got %d", w.Code)
	}
}
