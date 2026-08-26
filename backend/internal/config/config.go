package config

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type DatabaseConfig struct {
	Type string // "sqlite", "postgres", "mariadb" / "mysql"
	DSN  string // Connection string / Data Source Name
	Path string // For SQLite only
}

type AuthConfig struct {
	Enabled              bool
	JWTSecret            string
	SessionCookie        string
	OIDCEnabled          bool
	OIDCIssuerURL        string
	OIDCClientID         string
	OIDCClientSecret     string
	OIDCRedirectURL      string
	OIDCScopes           []string
	OIDCProviderName     string
	LocalAuthEnabled     bool
	AllowRegistration    bool
	InitialAdminPassword string
	AdminEmail           string
	DevLoginEnabled      bool
}

type Config struct {
	Port     string
	DataDir  string
	DB       DatabaseConfig
	Auth     AuthConfig
	CORSOrig string
	AppURL   string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}

	corsOrig := os.Getenv("CORS_ORIGIN")
	if corsOrig == "" {
		corsOrig = "*"
	}

	appURL := strings.TrimRight(getEnvOrDefault("APP_URL", fmt.Sprintf("http://localhost:%s", port)), "/")

	dbType := strings.ToLower(strings.TrimSpace(os.Getenv("DB_TYPE")))
	if dbType == "" {
		dbType = "sqlite"
	}
	if dbType == "postgresql" {
		dbType = "postgres"
	}
	if dbType == "mysql" {
		dbType = "mariadb"
	}

	dbConfig := DatabaseConfig{
		Type: dbType,
	}

	rawURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))

	switch dbType {
	case "postgres":
		if rawURL != "" {
			dbConfig.DSN = rawURL
		} else {
			host := getEnvOrDefault("DB_HOST", "localhost")
			port := getEnvOrDefault("DB_PORT", "5432")
			user := getEnvOrDefault("DB_USER", "postgres")
			pass := os.Getenv("DB_PASSWORD")
			name := getEnvOrDefault("DB_NAME", "ivy_wallet")
			ssl := getEnvOrDefault("DB_SSLMODE", "disable")

			dbConfig.DSN = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
				host, port, user, pass, name, ssl)
		}

	case "mariadb":
		if rawURL != "" {
			dbConfig.DSN = rawURL
		} else {
			host := getEnvOrDefault("DB_HOST", "localhost")
			port := getEnvOrDefault("DB_PORT", "3306")
			user := getEnvOrDefault("DB_USER", "root")
			pass := os.Getenv("DB_PASSWORD")
			name := getEnvOrDefault("DB_NAME", "ivy_wallet")

			// DSN format: user:password@tcp(host:port)/dbname?parseTime=true&charset=utf8mb4
			dbConfig.DSN = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4",
				user, pass, host, port, name)
		}

	default: // sqlite
		dbConfig.Type = "sqlite"
		dbPath := os.Getenv("DB_PATH")
		if dbPath == "" {
			dbPath = filepath.Join(dataDir, "ivy-wallet.db")
		}
		_ = os.MkdirAll(filepath.Dir(dbPath), 0755)
		dbConfig.Path = dbPath
		dbConfig.DSN = dbPath
	}

	// Auth Configuration
	authEnabled := getEnvBool("AUTH_ENABLED", true)
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// Generate random secret if not provided
		bytes := make([]byte, 32)
		_, _ = rand.Read(bytes)
		jwtSecret = hex.EncodeToString(bytes)
	}

	oidcIssuer := os.Getenv("OIDC_ISSUER_URL")
	oidcClientID := os.Getenv("OIDC_CLIENT_ID")
	oidcClientSecret := os.Getenv("OIDC_CLIENT_SECRET")
	oidcRedirectURL := getEnvOrDefault("OIDC_REDIRECT_URL", fmt.Sprintf("%s/api/auth/oidc/callback", appURL))
	oidcProviderName := getEnvOrDefault("OIDC_PROVIDER_NAME", "Single Sign-On (OIDC)")

	oidcScopesStr := getEnvOrDefault("OIDC_SCOPES", "openid profile email")
	oidcScopes := strings.Fields(oidcScopesStr)

	// OIDC is enabled if explicitly true or if OIDC_ISSUER_URL is configured
	oidcEnabled := getEnvBool("OIDC_ENABLED", oidcIssuer != "")
	localAuthEnabled := getEnvBool("LOCAL_AUTH_ENABLED", true)
	allowRegistration := getEnvBool("ALLOW_REGISTRATION", true)
	initialAdminPassword := getEnvOrDefault("INITIAL_ADMIN_PASSWORD", "admin123")
	adminEmail := strings.ToLower(strings.TrimSpace(getEnvOrDefault("ADMIN_EMAIL", "admin@ivy.local")))
	devLoginEnabled := getEnvBool("DEV_LOGIN_ENABLED", true)

	authConfig := AuthConfig{
		Enabled:              authEnabled,
		JWTSecret:            jwtSecret,
		SessionCookie:        getEnvOrDefault("SESSION_COOKIE_NAME", "ivy_session"),
		OIDCEnabled:          oidcEnabled,
		OIDCIssuerURL:        oidcIssuer,
		OIDCClientID:         oidcClientID,
		OIDCClientSecret:     oidcClientSecret,
		OIDCRedirectURL:      oidcRedirectURL,
		OIDCScopes:           oidcScopes,
		OIDCProviderName:     oidcProviderName,
		LocalAuthEnabled:     localAuthEnabled,
		AllowRegistration:    allowRegistration,
		InitialAdminPassword: initialAdminPassword,
		AdminEmail:           adminEmail,
		DevLoginEnabled:      devLoginEnabled,
	}

	return &Config{
		Port:     port,
		DataDir:  dataDir,
		DB:       dbConfig,
		Auth:     authConfig,
		CORSOrig: corsOrig,
		AppURL:   appURL,
	}
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	val := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if val == "" {
		return fallback
	}
	return val == "true" || val == "1" || val == "yes" || val == "on"
}
