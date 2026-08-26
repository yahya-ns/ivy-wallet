package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
	"github.com/yahya-ns/ivy-wallet/backend/internal/config"
)

type OIDCClient struct {
	cfg          config.AuthConfig
	provider     *oidc.Provider
	verifier     *oidc.IDTokenVerifier
	oauth2Config oauth2.Config
	initialized  bool
}

type OIDCUserInfo struct {
	Subject   string `json:"sub"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"picture"`
}

func NewOIDCClient(cfg config.AuthConfig) (*OIDCClient, error) {
	if !cfg.OIDCEnabled || cfg.OIDCIssuerURL == "" {
		return &OIDCClient{cfg: cfg, initialized: false}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	provider, err := oidc.NewProvider(ctx, cfg.OIDCIssuerURL)
	if err != nil {
		log.Printf("Warning: Failed to discover OIDC provider at %s: %v. OIDC will be retried on demand.", cfg.OIDCIssuerURL, err)
		return &OIDCClient{cfg: cfg, initialized: false}, nil
	}

	verifier := provider.Verifier(&oidc.Config{
		ClientID: cfg.OIDCClientID,
	})

	oauth2Config := oauth2.Config{
		ClientID:     cfg.OIDCClientID,
		ClientSecret: cfg.OIDCClientSecret,
		RedirectURL:  cfg.OIDCRedirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       cfg.OIDCScopes,
	}

	log.Printf("OIDC provider successfully initialized: %s", cfg.OIDCIssuerURL)

	return &OIDCClient{
		cfg:          cfg,
		provider:     provider,
		verifier:     verifier,
		oauth2Config: oauth2Config,
		initialized:  true,
	}, nil
}

func (c *OIDCClient) IsEnabled() bool {
	return c.cfg.OIDCEnabled && c.cfg.OIDCIssuerURL != ""
}

func (c *OIDCClient) EnsureProvider(ctx context.Context) error {
	if c.initialized {
		return nil
	}
	if !c.IsEnabled() {
		return errors.New("OIDC is not enabled or issuer URL is empty")
	}

	provider, err := oidc.NewProvider(ctx, c.cfg.OIDCIssuerURL)
	if err != nil {
		return fmt.Errorf("failed to discover OIDC provider: %w", err)
	}

	c.provider = provider
	c.verifier = provider.Verifier(&oidc.Config{
		ClientID: c.cfg.OIDCClientID,
	})
	c.oauth2Config = oauth2.Config{
		ClientID:     c.cfg.OIDCClientID,
		ClientSecret: c.cfg.OIDCClientSecret,
		RedirectURL:  c.cfg.OIDCRedirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       c.cfg.OIDCScopes,
	}
	c.initialized = true
	return nil
}

// GenerateAuthURL creates an authorization URL and state/nonce for CSRF protection
func (c *OIDCClient) GenerateAuthURL(w http.ResponseWriter, r *http.Request) (string, error) {
	if err := c.EnsureProvider(r.Context()); err != nil {
		return "", err
	}

	stateBytes := make([]byte, 24)
	if _, err := rand.Read(stateBytes); err != nil {
		return "", err
	}
	state := base64.RawURLEncoding.EncodeToString(stateBytes)

	nonceBytes := make([]byte, 24)
	if _, err := rand.Read(nonceBytes); err != nil {
		return "", err
	}
	nonce := base64.RawURLEncoding.EncodeToString(nonceBytes)

	// Store state and nonce in temporary HttpOnly cookies
	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	http.SetCookie(w, &http.Cookie{
		Name:     "oidc_state",
		Value:    state,
		Path:     "/api/auth",
		MaxAge:   600, // 10 minutes
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "oidc_nonce",
		Value:    nonce,
		Path:     "/api/auth",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})

	authURL := c.oauth2Config.AuthCodeURL(state, oidc.Nonce(nonce))
	return authURL, nil
}

// HandleCallback processes OIDC authorization code and returns user claims
func (c *OIDCClient) HandleCallback(r *http.Request) (*OIDCUserInfo, error) {
	if err := c.EnsureProvider(r.Context()); err != nil {
		return nil, err
	}

	stateCookie, err := r.Cookie("oidc_state")
	if err != nil || stateCookie.Value == "" {
		return nil, errors.New("missing or expired OIDC state cookie")
	}

	queryState := r.URL.Query().Get("state")
	if queryState == "" || queryState != stateCookie.Value {
		return nil, errors.New("invalid OIDC state parameter (CSRF detected)")
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		errMsg := r.URL.Query().Get("error_description")
		if errMsg == "" {
			errMsg = r.URL.Query().Get("error")
		}
		if errMsg == "" {
			errMsg = "missing authorization code from OIDC provider"
		}
		return nil, errors.New(errMsg)
	}

	oauth2Token, err := c.oauth2Config.Exchange(r.Context(), code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange authorization code: %w", err)
	}

	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("no id_token found in token response")
	}

	idToken, err := c.verifier.Verify(r.Context(), rawIDToken)
	if err != nil {
		return nil, fmt.Errorf("failed to verify ID token: %w", err)
	}

	// Verify nonce
	if nonceCookie, err := r.Cookie("oidc_nonce"); err == nil && nonceCookie.Value != "" {
		if idToken.Nonce != nonceCookie.Value {
			return nil, errors.New("invalid OIDC ID token nonce")
		}
	}

	var claims struct {
		Subject           string `json:"sub"`
		Email             string `json:"email"`
		EmailVerified     *bool  `json:"email_verified"`
		Name              string `json:"name"`
		PreferredUsername string `json:"preferred_username"`
		Picture           string `json:"picture"`
	}

	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("failed to parse ID token claims: %w", err)
	}

	displayName := claims.Name
	if displayName == "" {
		displayName = claims.PreferredUsername
	}
	if displayName == "" {
		displayName = claims.Email
	}

	return &OIDCUserInfo{
		Subject:   claims.Subject,
		Email:     claims.Email,
		Name:      displayName,
		AvatarURL: claims.Picture,
	}, nil
}
