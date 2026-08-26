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
	"github.com/yahya-ns/ivy-wallet/backend/internal/auth"
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
	log.Printf("Authentication enabled: %v (OIDC: %v)", cfg.Auth.Enabled, cfg.Auth.OIDCEnabled)

	db, err := database.Connect(cfg.DB)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize Token Manager & OIDC Client
	tokenMgr := auth.NewTokenManager(cfg.Auth.JWTSecret, cfg.Auth.SessionCookie)
	oidcClient, err := auth.NewOIDCClient(cfg.Auth)
	if err != nil {
		log.Printf("Notice: OIDC client setup message: %v", err)
	}

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
	authHandler := handlers.NewAuthHandler(db, cfg.Auth, cfg.AppURL, tokenMgr, oidcClient)
	accountHandler := &handlers.AccountHandler{DB: db}
	categoryHandler := &handlers.CategoryHandler{DB: db}
	tagHandler := &handlers.TagHandler{DB: db}
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
		// Public Auth Routes
		api.Route("/auth", func(authRoute chi.Router) {
			authRoute.Get("/config", authHandler.GetConfig)
			authRoute.Get("/oidc/login", authHandler.OIDCLogin)
			authRoute.Get("/oidc/callback", authHandler.OIDCCallback)
			authRoute.Post("/register", authHandler.Register)
			authRoute.Post("/login", authHandler.Login)
			authRoute.Post("/login/local", authHandler.LocalLogin)
			authRoute.Post("/dev-login", authHandler.DevLogin)
			authRoute.Get("/me", authHandler.Me)
			authRoute.Post("/logout", authHandler.Logout)
		})

		// Protected Routes Group
		api.Group(func(protected chi.Router) {
			protected.Use(middleware.AuthMiddleware(tokenMgr, cfg.Auth.Enabled, db))

			// Auth User Profile & Password
			protected.Patch("/auth/me", authHandler.UpdateMe)
			protected.Post("/auth/change-password", authHandler.ChangePassword)

			// Accounts
			protected.Get("/accounts", accountHandler.GetAll)
			protected.Get("/accounts/{id}", accountHandler.GetByID)
			protected.Post("/accounts", accountHandler.Create)
			protected.Put("/accounts/{id}", accountHandler.Update)
			protected.Delete("/accounts/{id}", accountHandler.Delete)

			// Categories
			protected.Get("/categories", categoryHandler.GetAll)
			protected.Get("/categories/{id}", categoryHandler.GetByID)
			protected.Post("/categories", categoryHandler.Create)
			protected.Put("/categories/{id}", categoryHandler.Update)
			protected.Delete("/categories/{id}", categoryHandler.Delete)

			// Tags
			protected.Get("/tags", tagHandler.GetAll)
			protected.Get("/tags/{id}", tagHandler.GetByID)
			protected.Post("/tags", tagHandler.Create)
			protected.Put("/tags/{id}", tagHandler.Update)
			protected.Delete("/tags/{id}", tagHandler.Delete)

			// Transactions
			protected.Get("/transactions", txHandler.GetAll)
			protected.Post("/transactions", txHandler.Create)
			protected.Put("/transactions/{id}", txHandler.Update)
			protected.Delete("/transactions/{id}", txHandler.Delete)

			// Budgets
			protected.Get("/budgets", budgetHandler.GetAll)
			protected.Post("/budgets", budgetHandler.Create)
			protected.Put("/budgets/{id}", budgetHandler.Update)
			protected.Delete("/budgets/{id}", budgetHandler.Delete)

			// Loans & Debts
			protected.Get("/loans", loanHandler.GetAll)
			protected.Post("/loans", loanHandler.Create)
			protected.Put("/loans/{id}", loanHandler.Update)
			protected.Delete("/loans/{id}", loanHandler.Delete)
			protected.Post("/loans/{id}/records", loanHandler.AddRepayment)

			// Planned & Subscriptions
			protected.Get("/planned", plannedHandler.GetAll)
			protected.Post("/planned", plannedHandler.Create)
			protected.Put("/planned/{id}", plannedHandler.Update)
			protected.Delete("/planned/{id}", plannedHandler.Delete)

			// Reports & Trends
			protected.Get("/reports", reportHandler.GetReports)

			// Settings & Preferences
			protected.Get("/settings", settingsHandler.Get)
			protected.Patch("/settings", settingsHandler.Update)

			// Backup & Restore
			protected.Get("/backup", backupHandler.Export)
			protected.Post("/backup", backupHandler.Import)

			// Cloud Sync for Multi-Device & Mobile Apps
			protected.Get("/sync", syncHandler.PullSync)
			protected.Post("/sync", syncHandler.PushSync)
		})
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
