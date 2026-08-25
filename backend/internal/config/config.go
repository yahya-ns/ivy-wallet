package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type DatabaseConfig struct {
	Type     string // "sqlite", "postgres", "mariadb" / "mysql"
	DSN      string // Connection string / Data Source Name
	Path     string // For SQLite only
}

type Config struct {
	Port     string
	DataDir  string
	DB       DatabaseConfig
	CORSOrig string
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

	return &Config{
		Port:     port,
		DataDir:  dataDir,
		DB:       dbConfig,
		CORSOrig: corsOrig,
	}
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
