package config

import (
	"os"
	"path/filepath"
)

type Config struct {
	Port     string
	DataDir  string
	DBPath   string
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

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = filepath.Join(dataDir, "ivy-wallet.db")
	}

	corsOrig := os.Getenv("CORS_ORIGIN")
	if corsOrig == "" {
		corsOrig = "*"
	}

	// Ensure data directory exists
	_ = os.MkdirAll(filepath.Dir(dbPath), 0755)

	return &Config{
		Port:     port,
		DataDir:  dataDir,
		DBPath:   dbPath,
		CORSOrig: corsOrig,
	}
}
