package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/yahya-ns/ivy-wallet/backend/internal/config"
	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/handlers"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

func setupTestDB(t *testing.T) *database.DB {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := database.Connect(config.DatabaseConfig{
		Type: "sqlite",
		DSN:  dbPath,
	})
	if err != nil {
		t.Fatalf("failed to connect to test db: %v", err)
	}
	return db
}

func findAccountByID(accounts []models.Account, id string) *models.Account {
	for _, a := range accounts {
		if a.ID == id {
			return &a
		}
	}
	return nil
}

func TestAccountHandler_CreateAndAdjustBalance(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	accountHandler := &handlers.AccountHandler{DB: db}
	txHandler := &handlers.TransactionHandler{DB: db}

	// 1. Create Account with Initial Balance 1,000,000
	initBal := 1000000.0
	incInBal := true
	createBody, _ := json.Marshal(map[string]interface{}{
		"name":             "BCA Account",
		"currency":         "IDR",
		"color":            "#5C3DF5",
		"icon":             "wallet",
		"includeInBalance": &incInBal,
		"initialBalance":   &initBal,
	})

	req := httptest.NewRequest("POST", "/api/accounts", bytes.NewReader(createBody))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	accountHandler.Create(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", rr.Code, rr.Body.String())
	}

	var created models.Account
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	if created.ID == "" {
		t.Fatalf("expected valid account id, got empty")
	}

	// Verify GetAll returns 1,000,000 balance for our created account
	getReq := httptest.NewRequest("GET", "/api/accounts", nil)
	getRR := httptest.NewRecorder()
	accountHandler.GetAll(getRR, getReq)
	var accounts []models.Account
	_ = json.Unmarshal(getRR.Body.Bytes(), &accounts)
	acc := findAccountByID(accounts, created.ID)
	if acc == nil || acc.Balance != 1000000.0 {
		t.Fatalf("expected account balance 1,000,000, got %v", acc)
	}

	// 2. Edit Account balance: increase to 1,500,000 (+500,000 Income adjustment)
	newBal := 1500000.0
	updateBody, _ := json.Marshal(map[string]interface{}{
		"name":    "BCA Account",
		"balance": &newBal,
	})

	updateReq := httptest.NewRequest("PUT", "/api/accounts/"+created.ID, bytes.NewReader(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", created.ID)
	updateReq = updateReq.WithContext(context.WithValue(updateReq.Context(), chi.RouteCtxKey, rctx))
	updateRR := httptest.NewRecorder()
	accountHandler.Update(updateRR, updateReq)

	if updateRR.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", updateRR.Code, updateRR.Body.String())
	}

	// Verify balance is now 1,500,000
	getRR2 := httptest.NewRecorder()
	accountHandler.GetAll(getRR2, httptest.NewRequest("GET", "/api/accounts", nil))
	var accounts2 []models.Account
	_ = json.Unmarshal(getRR2.Body.Bytes(), &accounts2)
	acc2 := findAccountByID(accounts2, created.ID)
	if acc2 == nil || acc2.Balance != 1500000.0 {
		t.Fatalf("expected account balance 1,500,000, got %v", acc2)
	}

	// Verify transactions contains Initial Balance and Balance Adjustment (INCOME of 500,000)
	txReq := httptest.NewRequest("GET", "/api/transactions?accountId="+created.ID, nil)
	txRR := httptest.NewRecorder()
	txHandler.GetAll(txRR, txReq)
	var txList []models.Transaction
	_ = json.Unmarshal(txRR.Body.Bytes(), &txList)
	if len(txList) != 2 {
		t.Fatalf("expected 2 transactions for this account, got %d", len(txList))
	}
	if txList[0].Type != "INCOME" || txList[0].Amount != 500000.0 || *txList[0].Title != "Balance Adjustment" {
		t.Fatalf("expected adjustment tx to be INCOME 500000, got %v %v title=%v", txList[0].Type, txList[0].Amount, *txList[0].Title)
	}

	// 3. Edit Account balance: decrease to 1,200,000 (-300,000 Expense adjustment)
	lowerBal := 1200000.0
	updateBody2, _ := json.Marshal(map[string]interface{}{
		"balance": &lowerBal,
	})
	updateReq2 := httptest.NewRequest("PUT", "/api/accounts/"+created.ID, bytes.NewReader(updateBody2))
	updateReq2.Header.Set("Content-Type", "application/json")
	rctx2 := chi.NewRouteContext()
	rctx2.URLParams.Add("id", created.ID)
	updateReq2 = updateReq2.WithContext(context.WithValue(updateReq2.Context(), chi.RouteCtxKey, rctx2))
	updateRR2 := httptest.NewRecorder()
	accountHandler.Update(updateRR2, updateReq2)

	if updateRR2.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", updateRR2.Code, updateRR2.Body.String())
	}

	// Verify balance is now 1,200,000
	getRR3 := httptest.NewRecorder()
	accountHandler.GetAll(getRR3, httptest.NewRequest("GET", "/api/accounts", nil))
	var accounts3 []models.Account
	_ = json.Unmarshal(getRR3.Body.Bytes(), &accounts3)
	acc3 := findAccountByID(accounts3, created.ID)
	if acc3 == nil || acc3.Balance != 1200000.0 {
		t.Fatalf("expected account balance 1,200,000, got %v", acc3)
	}

	// Verify 3 transactions now, latest is EXPENSE 300,000
	txReq2 := httptest.NewRequest("GET", "/api/transactions?accountId="+created.ID, nil)
	txRR2 := httptest.NewRecorder()
	txHandler.GetAll(txRR2, txReq2)
	var txList2 []models.Transaction
	_ = json.Unmarshal(txRR2.Body.Bytes(), &txList2)
	if len(txList2) != 3 {
		t.Fatalf("expected 3 transactions, got %d", len(txList2))
	}
	if txList2[0].Type != "EXPENSE" || txList2[0].Amount != 300000.0 || *txList2[0].Title != "Balance Adjustment" {
		t.Fatalf("expected adjustment tx to be EXPENSE 300000, got %v %v title=%v", txList2[0].Type, txList2[0].Amount, *txList2[0].Title)
	}

	// 4. Update without balance change (only rename): should NOT create any new transaction
	newName := "BCA Main Account"
	updateBody3, _ := json.Marshal(map[string]interface{}{
		"name": &newName,
	})
	updateReq3 := httptest.NewRequest("PUT", "/api/accounts/"+created.ID, bytes.NewReader(updateBody3))
	updateReq3.Header.Set("Content-Type", "application/json")
	rctx3 := chi.NewRouteContext()
	rctx3.URLParams.Add("id", created.ID)
	updateReq3 = updateReq3.WithContext(context.WithValue(updateReq3.Context(), chi.RouteCtxKey, rctx3))
	updateRR3 := httptest.NewRecorder()
	accountHandler.Update(updateRR3, updateReq3)

	if updateRR3.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", updateRR3.Code, updateRR3.Body.String())
	}

	txReq3 := httptest.NewRequest("GET", "/api/transactions?accountId="+created.ID, nil)
	txRR3 := httptest.NewRecorder()
	txHandler.GetAll(txRR3, txReq3)
	var txList3 []models.Transaction
	_ = json.Unmarshal(txRR3.Body.Bytes(), &txList3)
	if len(txList3) != 3 {
		t.Fatalf("expected transaction count to remain 3, got %d", len(txList3))
	}
}
