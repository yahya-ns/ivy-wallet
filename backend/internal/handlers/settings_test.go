package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yahya-ns/ivy-wallet/backend/internal/handlers"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

func TestSettingsHandler_GetAndUpdateDateTimeFormat(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	settingsHandler := &handlers.SettingsHandler{DB: db}

	// 1. Get initial settings
	req := httptest.NewRequest("GET", "/api/settings", nil)
	rec := httptest.NewRecorder()
	settingsHandler.Get(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var initialSettings models.Settings
	if err := json.NewDecoder(rec.Body).Decode(&initialSettings); err != nil {
		t.Fatalf("failed to decode settings: %v", err)
	}

	if initialSettings.DateFormat != "YYYY-MM-DD" {
		t.Errorf("expected default DateFormat 'YYYY-MM-DD', got '%s'", initialSettings.DateFormat)
	}
	if initialSettings.TimeFormat != "24_HOUR" {
		t.Errorf("expected default TimeFormat '24_HOUR', got '%s'", initialSettings.TimeFormat)
	}

	// 2. Update date and time format
	newDateFormat := "DD/MM/YYYY"
	newTimeFormat := "12_HOUR"
	updateBody, _ := json.Marshal(map[string]interface{}{
		"dateFormat": newDateFormat,
		"timeFormat": newTimeFormat,
	})

	reqUpdate := httptest.NewRequest("PATCH", "/api/settings", bytes.NewReader(updateBody))
	reqUpdate.Header.Set("Content-Type", "application/json")
	recUpdate := httptest.NewRecorder()
	settingsHandler.Update(recUpdate, reqUpdate)

	if recUpdate.Code != http.StatusOK {
		t.Fatalf("expected status 200 on update, got %d: %s", recUpdate.Code, recUpdate.Body.String())
	}

	var updatedSettings models.Settings
	if err := json.NewDecoder(recUpdate.Body).Decode(&updatedSettings); err != nil {
		t.Fatalf("failed to decode updated settings: %v", err)
	}

	if updatedSettings.DateFormat != newDateFormat {
		t.Errorf("expected updated DateFormat '%s', got '%s'", newDateFormat, updatedSettings.DateFormat)
	}
	if updatedSettings.TimeFormat != newTimeFormat {
		t.Errorf("expected updated TimeFormat '%s', got '%s'", newTimeFormat, updatedSettings.TimeFormat)
	}

	// 3. Get settings again and verify persistence
	reqGet2 := httptest.NewRequest("GET", "/api/settings", nil)
	recGet2 := httptest.NewRecorder()
	settingsHandler.Get(recGet2, reqGet2)

	if recGet2.Code != http.StatusOK {
		t.Fatalf("expected status 200 on second get, got %d", recGet2.Code)
	}

	var persistedSettings models.Settings
	if err := json.NewDecoder(recGet2.Body).Decode(&persistedSettings); err != nil {
		t.Fatalf("failed to decode persisted settings: %v", err)
	}

	if persistedSettings.DateFormat != newDateFormat {
		t.Errorf("expected persisted DateFormat '%s', got '%s'", newDateFormat, persistedSettings.DateFormat)
	}
	if persistedSettings.TimeFormat != newTimeFormat {
		t.Errorf("expected persisted TimeFormat '%s', got '%s'", newTimeFormat, persistedSettings.TimeFormat)
	}
}
