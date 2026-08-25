package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/yahya-ns/ivy-wallet/backend/internal/config"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/handlers"
	"github.com/yahya-ns/ivy-wallet/backend/internal/middleware"
)

// Embed frontend build if available
//
//go:embed all:dist
var embeddedFS embed.FS

func main() {
	cfg := config.Load()
	log.Printf("Starting Ivy Wallet Web Edition...")
	log.Printf("Database engine: %s", cfg.DB.Type)

	db, err := database.Connect(cfg.DB)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	r := chi.NewRouter()

	// Middlewares
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	// CORS configuration for mobile and local development
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Handlers
	accountHandler := &handlers.AccountHandler{DB: db}
	categoryHandler := &handlers.CategoryHandler{DB: db}
	txHandler := &handlers.TransactionHandler{DB: db}
	budgetHandler := &handlers.BudgetHandler{DB: db}
	loanHandler := &handlers.LoanHandler{DB: db}
	plannedHandler := &handlers.PlannedHandler{DB: db}
	reportHandler := &handlers.ReportHandler{DB: db}
	settingsHandler := &handlers.SettingsHandler{DB: db}
	backupHandler := &handlers.BackupHandler{DB: db}
	syncHandler := &handlers.SyncHandler{DB: db}

	// API Routes
	r.Route("/api", func(api chi.Router) {
		// Accounts
		api.Get("/accounts", accountHandler.GetAll)
		api.Post("/accounts", accountHandler.Create)
		api.Put("/accounts/{id}", accountHandler.Update)
		api.Delete("/accounts/{id}", accountHandler.Delete)

		// Categories
		api.Get("/categories", categoryHandler.GetAll)
		api.Post("/categories", categoryHandler.Create)
		api.Put("/categories/{id}", categoryHandler.Update)
		api.Delete("/categories/{id}", categoryHandler.Delete)

		// Transactions
		api.Get("/transactions", txHandler.GetAll)
		api.Post("/transactions", txHandler.Create)
		api.Put("/transactions/{id}", txHandler.Update)
		api.Delete("/transactions/{id}", txHandler.Delete)

		// Budgets
		api.Get("/budgets", budgetHandler.GetAll)
		api.Post("/budgets", budgetHandler.Create)
		api.Put("/budgets/{id}", budgetHandler.Update)
		api.Delete("/budgets/{id}", budgetHandler.Delete)

		// Loans & Debts
		api.Get("/loans", loanHandler.GetAll)
		api.Post("/loans", loanHandler.Create)
		api.Put("/loans/{id}", loanHandler.Update)
		api.Delete("/loans/{id}", loanHandler.Delete)
		api.Post("/loans/{id}/records", loanHandler.AddRepayment)

		// Planned & Subscriptions
		api.Get("/planned", plannedHandler.GetAll)
		api.Post("/planned", plannedHandler.Create)
		api.Put("/planned/{id}", plannedHandler.Update)
		api.Delete("/planned/{id}", plannedHandler.Delete)

		// Reports & Trends
		api.Get("/reports", reportHandler.GetReports)

		// Settings & Preferences
		api.Get("/settings", settingsHandler.Get)
		api.Patch("/settings", settingsHandler.Update)

		// Backup & Restore
		api.Get("/backup", backupHandler.Export)
		api.Post("/backup", backupHandler.Import)

		// Cloud Sync for Multi-Device & Mobile Apps
		api.Get("/sync", syncHandler.PullSync)
		api.Post("/sync", syncHandler.PushSync)
	})

	// Static SPA Files
	distFS, err := fs.Sub(embeddedFS, "dist")
	if err == nil {
		r.NotFound(middleware.SPAHandler(distFS))
	} else {
		// Fallback to local ./dist or ./frontend/dist directory if running unbundled
		localDir := "./frontend/dist"
		if _, err := os.Stat(localDir); os.IsNotExist(err) {
			localDir = "./dist"
		}
		r.NotFound(middleware.SPAHandler(os.DirFS(localDir)))
	}

	addr := ":" + cfg.Port
	log.Printf("Server listening on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
