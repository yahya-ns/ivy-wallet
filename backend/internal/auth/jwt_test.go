package auth_test

import (
	"testing"

	"github.com/yahya-ns/ivy-wallet/backend/internal/auth"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

func TestJWTTokenGenerationAndValidation(t *testing.T) {
	secret := "test-secret-key-32-bytes-long-super-safe"
	tm := auth.NewTokenManager(secret, "test_session")

	user := &models.User{
		ID:       "user-123",
		Email:    "test@example.com",
		Name:     "Test User",
		Role:     "user",
		Provider: "oidc",
	}

	token, err := tm.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Fatalf("Generated token is empty")
	}

	claims, err := tm.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected UserID %s, got %s", user.ID, claims.UserID)
	}
	if claims.Email != user.Email {
		t.Errorf("Expected Email %s, got %s", user.Email, claims.Email)
	}
}
