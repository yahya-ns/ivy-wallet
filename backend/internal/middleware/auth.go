package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/yahya-ns/ivy-wallet/backend/internal/auth"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
)

type contextKey string

const (
	UserIDContextKey contextKey = "userId"
	ClaimsContextKey contextKey = "claims"
)

func AuthMiddleware(tm *auth.TokenManager, authEnabled bool, db *database.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path

			// Allow public auth endpoints and static routes
			if strings.HasPrefix(path, "/api/auth/") {
				next.ServeHTTP(w, r)
				return
			}

			// If authentication is disabled globally, inject default user
			if !authEnabled {
				ctx := context.WithValue(r.Context(), UserIDContextKey, database.DefaultUserID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			tokenStr := tm.GetTokenFromRequest(r)
			if tokenStr == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "Authentication required. Please sign in.",
				})
				return
			}

			claims, err := tm.ValidateToken(tokenStr)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "Invalid or expired session token.",
				})
				return
			}

			// Attach claims and UserID to request context
			ctx := context.WithValue(r.Context(), UserIDContextKey, claims.UserID)
			ctx = context.WithValue(ctx, ClaimsContextKey, claims)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID retrieves the current authenticated user's ID from request context
func GetUserID(ctx context.Context) string {
	if val := ctx.Value(UserIDContextKey); val != nil {
		if uid, ok := val.(string); ok && uid != "" {
			return uid
		}
	}
	return database.DefaultUserID
}

// GetUserClaims retrieves the token claims from request context
func GetUserClaims(ctx context.Context) *auth.Claims {
	if val := ctx.Value(ClaimsContextKey); val != nil {
		if claims, ok := val.(*auth.Claims); ok {
			return claims
		}
	}
	return nil
}
