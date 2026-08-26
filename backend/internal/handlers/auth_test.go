package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yahya-ns/ivy-wallet/backend/internal/auth"
	"github.com/yahya-ns/ivy-wallet/backend/internal/config"
	"github.com/yahya-ns/ivy-wallet/backend/internal/handlers"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

func TestAuthEndpoints(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	cfg := config.AuthConfig{
		Enabled:          true,
		JWTSecret:        "test-secret",
		SessionCookie:    "test_session",
		OIDCEnabled:      false,
		LocalAuthEnabled: true,
		DevLoginEnabled:  true,
		OIDCProviderName: "SSO (OIDC)",
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

	if !conf.AuthEnabled || !conf.LocalAuthEnabled || !conf.DevLoginEnabled {
		t.Errorf("Unexpected auth config response: %+v", conf)
	}

	// 2. Test LocalLogin
	body, _ := json.Marshal(models.LocalLoginRequest{
		Email: "alice@example.com",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login/local", bytes.NewReader(body))
	w = httptest.NewRecorder()
	authHandler.LocalLogin(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 on local login, got %d: %s", w.Code, w.Body.String())
	}

	var loginResp struct {
		User  models.User `json:"user"`
		Token string      `json:"token"`
	}
	if err := json.NewDecoder(w.Body).Decode(&loginResp); err != nil {
		t.Fatalf("Failed to decode login response: %v", err)
	}

	if loginResp.User.Email != "alice@example.com" {
		t.Errorf("Expected email alice@example.com, got %s", loginResp.User.Email)
	}
	if loginResp.Token == "" {
		t.Errorf("Expected valid token, got empty")
	}

	// 3. Test Me with valid token
	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+loginResp.Token)
	w = httptest.NewRecorder()
	authHandler.Me(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 on /me, got %d: %s", w.Code, w.Body.String())
	}

	var meResp models.AuthMeResponse
	if err := json.NewDecoder(w.Body).Decode(&meResp); err != nil {
		t.Fatalf("Failed to decode me response: %v", err)
	}

	if meResp.User.ID != loginResp.User.ID {
		t.Errorf("Expected user ID %s, got %s", loginResp.User.ID, meResp.User.ID)
	}
}
