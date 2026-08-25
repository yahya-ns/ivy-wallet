package handlers

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/yahya-ns/ivy-wallet/backend/internal/database"
	"github.com/yahya-ns/ivy-wallet/backend/internal/models"
)

type ReportHandler struct {
	DB *database.DB
}

func (h *ReportHandler) GetReports(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	monthsStr := q.Get("months")
	monthsBack := 6
	if m, err := strconv.Atoi(monthsStr); err == nil && m > 0 {
		monthsBack = m
	}
	accountID := q.Get("accountId")

	now := time.Now()
	startOfCurrentMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfCurrentMonth := startOfCurrentMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

	// 1. Current Month Totals (Income vs Expense)
	var totalMonthIncome, totalMonthExpense float64

	incomeQuery := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'INCOME' AND is_deleted = 0 AND date_time >= ? AND date_time <= ?`
	expenseQuery := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'EXPENSE' AND is_deleted = 0 AND date_time >= ? AND date_time <= ?`
	args := []interface{}{startOfCurrentMonth, endOfCurrentMonth}

	if accountID != "" {
		incomeQuery += " AND account_id = ?"
		expenseQuery += " AND account_id = ?"
		args = append(args, accountID)
	}

	_ = h.DB.QueryRow(incomeQuery, args...).Scan(&totalMonthIncome)
	_ = h.DB.QueryRow(expenseQuery, args...).Scan(&totalMonthExpense)

	netSavings := totalMonthIncome - totalMonthExpense
	var savingsRate float64
	if totalMonthIncome > 0 {
		savingsRate = math.Round((netSavings/totalMonthIncome)*1000) / 10
	}

	// 2. Category Breakdown for current month
	catQuery := `
		SELECT COALESCE(c.id, 'uncategorized'),
		       COALESCE(c.name, 'Uncategorized'),
		       COALESCE(c.color, '#74747A'),
		       c.icon,
		       SUM(t.amount) as total_amount
		FROM transactions t
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.type = 'EXPENSE' AND t.is_deleted = 0 AND t.date_time >= ? AND t.date_time <= ?
	`
	catArgs := []interface{}{startOfCurrentMonth, endOfCurrentMonth}
	if accountID != "" {
		catQuery += " AND t.account_id = ?"
		catArgs = append(catArgs, accountID)
	}
	catQuery += " GROUP BY c.id, c.name, c.color, c.icon ORDER BY total_amount DESC"

	catRows, err := h.DB.Query(catQuery, catArgs...)
	categoryBreakdown := []models.CategoryBreakdown{}
	if err == nil {
		for catRows.Next() {
			var cb models.CategoryBreakdown
			var icon sql.NullString
			if err := catRows.Scan(&cb.ID, &cb.Name, &cb.Color, &icon, &cb.Amount); err == nil {
				if icon.Valid {
					cb.Icon = &icon.String
				}
				if totalMonthExpense > 0 {
					cb.Percentage = math.Round((cb.Amount/totalMonthExpense)*1000) / 10
				}
				categoryBreakdown = append(categoryBreakdown, cb)
			}
		}
		catRows.Close()
	}

	// 3. Multi-Month Trend
	monthlyTrends := []models.MonthlyTrend{}
	for i := monthsBack - 1; i >= 0; i-- {
		targetMonth := now.AddDate(0, -i, 0)
		mStart := time.Date(targetMonth.Year(), targetMonth.Month(), 1, 0, 0, 0, 0, time.UTC)
		mEnd := mStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
		label := mStart.Format("Jan 2006")

		var inc, exp float64
		mArgs := []interface{}{mStart, mEnd}
		mIncQ := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'INCOME' AND is_deleted = 0 AND date_time >= ? AND date_time <= ?`
		mExpQ := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'EXPENSE' AND is_deleted = 0 AND date_time >= ? AND date_time <= ?`

		if accountID != "" {
			mIncQ += " AND account_id = ?"
			mExpQ += " AND account_id = ?"
			mArgs = append(mArgs, accountID)
		}

		_ = h.DB.QueryRow(mIncQ, mArgs...).Scan(&inc)
		_ = h.DB.QueryRow(mExpQ, mArgs...).Scan(&exp)

		monthlyTrends = append(monthlyTrends, models.MonthlyTrend{
			Month:   label,
			Income:  inc,
			Expense: exp,
			Net:     inc - exp,
		})
	}

	resp := models.ReportResponse{
		TotalMonthIncome:  totalMonthIncome,
		TotalMonthExpense: totalMonthExpense,
		NetSavings:        netSavings,
		SavingsRate:       savingsRate,
		CategoryBreakdown: categoryBreakdown,
		MonthlyTrends:     monthlyTrends,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
