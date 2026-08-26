package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

var (
	ErrInvalidToken = errors.New("invalid or expired token")
)

type Claims struct {
	UserID   string `json:"userId"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	Provider string `json:"provider"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	secret     []byte
	cookieName string
}

func NewTokenManager(secret string, cookieName string) *TokenManager {
	if cookieName == "" {
		cookieName = "ivy_session"
	}
	return &TokenManager{
		secret:     []byte(secret),
		cookieName: cookieName,
	}
}

// GenerateToken generates a signed JWT token valid for 30 days
func (tm *TokenManager) GenerateToken(user *models.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   user.ID,
		Email:    user.Email,
		Name:     user.Name,
		Role:     user.Role,
		Provider: user.Provider,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)), // 30 days
			Issuer:    "ivy-wallet",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(tm.secret)
}

// ValidateToken verifies and parses the JWT token string
func (tm *TokenManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return tm.secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// SetSessionCookie sets a secure HTTP-Only cookie containing the JWT session token
func (tm *TokenManager) SetSessionCookie(w http.ResponseWriter, token string, isSecure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     tm.cookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int((30 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

// ClearSessionCookie clears the session cookie on logout
func (tm *TokenManager) ClearSessionCookie(w http.ResponseWriter, isSecure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     tm.cookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

// GetTokenFromRequest extracts the token from the cookie or Authorization: Bearer header
func (tm *TokenManager) GetTokenFromRequest(r *http.Request) string {
	// 1. Check Authorization Bearer header first (useful for Mobile/PWA API clients)
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}

	// 2. Check HTTP-Only Cookie
	if cookie, err := r.Cookie(tm.cookieName); err == nil && cookie.Value != "" {
		return cookie.Value
	}

	return ""
}
