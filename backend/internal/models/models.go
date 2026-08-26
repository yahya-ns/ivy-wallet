package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	AvatarURL    string    `json:"avatarUrl,omitempty"`
	Provider     string    `json:"provider"` // "oidc", "local", "dev"
	Subject      string    `json:"subject,omitempty"`  // OIDC 'sub'
	Role         string    `json:"role"`     // "admin", "user"
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type AuthConfigResponse struct {
	AuthEnabled       bool   `json:"authEnabled"`
	OIDCEnabled       bool   `json:"oidcEnabled"`
	OIDCProviderName  string `json:"oidcProviderName"`
	LocalAuthEnabled  bool   `json:"localAuthEnabled"`
	AllowRegistration bool   `json:"allowRegistration"`
	DevLoginEnabled   bool   `json:"devLoginEnabled"`
}

type AuthMeResponse struct {
	User *User `json:"user"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type DevLoginRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type Account struct {
	ID               string    `json:"id"`
	UserID           string    `json:"userId"`
	Name             string    `json:"name"`
	Currency         string    `json:"currency"`
	Color            string    `json:"color"`
	Icon             string    `json:"icon"`
	OrderNum         int       `json:"orderNum"`
	IncludeInBalance bool      `json:"includeInBalance"`
	IsDeleted        bool      `json:"isDeleted"`
	Balance          float64   `json:"balance"`
	TotalIncome      float64   `json:"totalIncome"`
	TotalExpense     float64   `json:"totalExpense"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Category struct {
	ID            string     `json:"id"`
	UserID        string     `json:"userId"`
	Name          string     `json:"name"`
	Color         string     `json:"color"`
	Icon          string     `json:"icon"`
	OrderNum      int        `json:"orderNum"`
	ParentId      *string    `json:"parentId,omitempty"`
	IsDeleted     bool       `json:"isDeleted"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	Subcategories []Category `json:"subcategories,omitempty"`
	Parent        *Category  `json:"parent,omitempty"`
}

type Tag struct {
	ID               string    `json:"id"`
	UserID           string    `json:"userId"`
	Name             string    `json:"name"`
	Color            string    `json:"color"`
	OrderNum         int       `json:"orderNum"`
	IsDeleted        bool      `json:"isDeleted"`
	TransactionCount int       `json:"transactionCount,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type TransactionTag struct {
	TransactionId string `json:"transactionId"`
	TagId         string `json:"tagId"`
}

type Transaction struct {
	ID              string     `json:"id"`
	UserID          string     `json:"userId"`
	AccountId       string     `json:"accountId"`
	Type            string     `json:"type"` // EXPENSE, INCOME, TRANSFER
	Amount          float64    `json:"amount"`
	ToAccountId     *string    `json:"toAccountId,omitempty"`
	ToAmount        *float64   `json:"toAmount,omitempty"`
	Title           *string    `json:"title,omitempty"`
	Description     *string    `json:"description,omitempty"`
	DateTime        time.Time  `json:"dateTime"`
	CategoryId      *string    `json:"categoryId,omitempty"`
	SubcategoryId   *string    `json:"subcategoryId,omitempty"`
	DueDate         *time.Time `json:"dueDate,omitempty"`
	RecurringRuleId *string    `json:"recurringRuleId,omitempty"`
	LoanId          *string    `json:"loanId,omitempty"`
	LoanRecordId    *string    `json:"loanRecordId,omitempty"`
	IsDeleted       bool       `json:"isDeleted"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`

	// Relational fields for client
	Account     *Account  `json:"account,omitempty"`
	ToAccount   *Account  `json:"toAccount,omitempty"`
	Category    *Category `json:"category,omitempty"`
	Subcategory *Category `json:"subcategory,omitempty"`
	Tags        []Tag     `json:"tags,omitempty"`
	TagIds      []string  `json:"tagIds,omitempty"`
}

type Budget struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	Name        string    `json:"name"`
	Amount      float64   `json:"amount"`
	CategoryIds *string   `json:"categoryIds,omitempty"` // JSON string array or comma separated
	AccountIds  *string   `json:"accountIds,omitempty"`
	Period      string    `json:"period"` // MONTHLY, WEEKLY, ONE_TIME
	OrderId     int       `json:"orderId"`
	Spent       float64   `json:"spent"`
	Remaining   float64   `json:"remaining"`
	Percentage  float64   `json:"percentage"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Loan struct {
	ID              string       `json:"id"`
	UserID          string       `json:"userId"`
	Name            string       `json:"name"`
	Amount          float64      `json:"amount"`
	Type            string       `json:"type"` // BORROW, LEND
	Color           string       `json:"color"`
	Icon            string       `json:"icon"`
	AccountId       *string      `json:"accountId,omitempty"`
	Note            *string      `json:"note,omitempty"`
	DateTime        time.Time    `json:"dateTime"`
	DueDate         *time.Time   `json:"dueDate,omitempty"`
	IsPaid          bool         `json:"isPaid"`
	IsDeleted       bool         `json:"isDeleted"`
	PaidAmount      float64      `json:"paidAmount"`
	RemainingAmount float64      `json:"remainingAmount"`
	Records         []LoanRecord `json:"records,omitempty"`
	CreatedAt       time.Time    `json:"createdAt"`
	UpdatedAt       time.Time    `json:"updatedAt"`
	Account         *Account     `json:"account,omitempty"`
}

type LoanRecord struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	LoanId        string    `json:"loanId"`
	Amount        float64   `json:"amount"`
	DateTime      time.Time `json:"dateTime"`
	Note          *string   `json:"note,omitempty"`
	AccountId     *string   `json:"accountId,omitempty"`
	TransactionId *string   `json:"transactionId,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	Account       *Account  `json:"account,omitempty"`
}

type PlannedPaymentRule struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	StartDate    time.Time `json:"startDate"`
	IntervalN    int       `json:"intervalN"`
	IntervalType string    `json:"intervalType"` // DAY, WEEK, MONTH, YEAR
	OneTime      bool      `json:"oneTime"`
	Type         string    `json:"type"` // EXPENSE, INCOME
	AccountId    string    `json:"accountId"`
	Amount       float64   `json:"amount"`
	CategoryId   *string   `json:"categoryId,omitempty"`
	Title        *string   `json:"title,omitempty"`
	Description  *string   `json:"description,omitempty"`
	IsActive     bool      `json:"isActive"`
	IsDeleted    bool      `json:"isDeleted"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	Account      *Account  `json:"account,omitempty"`
	Category     *Category `json:"category,omitempty"`
}

type Settings struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	Theme          string    `json:"theme"` // LIGHT, DARK, TRUE_BLACK
	Currency       string    `json:"currency"`
	BufferAmount   float64   `json:"bufferAmount"`
	Name           string    `json:"name"`
	FirstDayOfWeek int       `json:"firstDayOfWeek"`
	HideBalance    bool      `json:"hideBalance"`
	DateFormat     string    `json:"dateFormat"` // YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.
	TimeFormat     string    `json:"timeFormat"` // 12_HOUR, 24_HOUR
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type MonthlyTrend struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Net     float64 `json:"net"`
}

type CategoryBreakdown struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Color      string  `json:"color"`
	Icon       *string `json:"icon"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"`
}

type ReportResponse struct {
	TotalMonthIncome  float64             `json:"totalMonthIncome"`
	TotalMonthExpense float64             `json:"totalMonthExpense"`
	NetSavings        float64             `json:"netSavings"`
	SavingsRate       float64             `json:"savingsRate"`
	CategoryBreakdown []CategoryBreakdown `json:"categoryBreakdown"`
	MonthlyTrends     []MonthlyTrend      `json:"monthlyTrends"`
}

// Sync Models for multi-client / mobile app offline synchronization
type SyncPayload struct {
	LastSyncTime *time.Time           `json:"lastSyncTime"`
	Accounts     []Account            `json:"accounts"`
	Categories   []Category           `json:"categories"`
	Tags         []Tag                `json:"tags"`
	Transactions []Transaction        `json:"transactions"`
	Budgets      []Budget             `json:"budgets"`
	Loans        []Loan               `json:"loans"`
	LoanRecords  []LoanRecord         `json:"loanRecords"`
	Planned      []PlannedPaymentRule `json:"planned"`
}

type SyncResponse struct {
	SyncTime     time.Time            `json:"syncTime"`
	Accounts     []Account            `json:"accounts"`
	Categories   []Category           `json:"categories"`
	Tags         []Tag                `json:"tags"`
	Transactions []Transaction        `json:"transactions"`
	Budgets      []Budget             `json:"budgets"`
	Loans        []Loan               `json:"loans"`
	LoanRecords  []LoanRecord         `json:"loanRecords"`
	Planned      []PlannedPaymentRule `json:"planned"`
	Settings     *Settings            `json:"settings,omitempty"`
}
