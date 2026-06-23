import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const AED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 2
});

const CATEGORIES = [
  "Grocery", "Ford", "Rent", "Shopping", "Dewa", "Dining Out", "Papa", "Ammi",
  "Maid", "Patrol", "Salik", "Etisalat", "Other", "Corolla", "Dining In",
  "Samaa", "Noon Grocery", "Amazon", "Netflix", "Parlour", "Saloon", "NBD",
  "Car Clean And Parking", "HSC", "DL", "Laundry", "Water", "Charity", "Urban",
  "Just Life", "Noon Food", "Keeta Food", "Talabat", "Medical", "Education",
  "Travel", "Entertainment", "Gifts"
];

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Other"];
const INCOME_TYPES = ["Salary", "Bonus", "Other Income"];
const ACCOUNT_TYPES = ["Cash Wallet", "Bank Account", "Credit Card"];
const BILL_TYPES = ["Rent", "DEWA", "Etisalat", "Credit Card"];
const GOAL_TYPES = ["Emergency Fund", "Car", "Travel"];
const RECURRING_CATEGORIES = ["Rent", "Dewa", "Etisalat", "Netflix", "Maid"];
const STORAGE_KEY = "expense-tracker-pwa-v1";
const COLORS = ["#0f766e", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#16a34a", "#db2777", "#475569", "#ea580c"];

const emptyExpense = () => ({
  id: "",
  date: todayISO(),
  amount: "",
  category: CATEGORIES[0],
  note: "",
  paymentMethod: PAYMENT_METHODS[0],
  recurring: false
});

const emptyIncome = () => ({
  id: "",
  date: todayISO(),
  amount: "",
  type: INCOME_TYPES[0],
  note: ""
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(date) {
  return (date || todayISO()).slice(0, 7);
}

function parseAmount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric"
  });
}

function loadState() {
  const fallback = {
    expenses: seedExpenses(),
    incomes: seedIncomes(),
    accounts: defaultAccounts(),
    bills: defaultBills(),
    goals: defaultGoals(),
    budgets: Object.fromEntries(CATEGORIES.map((category) => [category, category === "Rent" ? 5000 : 0])),
    theme: "light"
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : fallback.expenses,
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : fallback.incomes,
      accounts: mergeByName(defaultAccounts(), parsed.accounts, "name"),
      bills: mergeByName(defaultBills(), parsed.bills, "name"),
      goals: mergeByName(defaultGoals(), parsed.goals, "name"),
      budgets: { ...fallback.budgets, ...(parsed.budgets || {}) },
      theme: parsed.theme === "dark" ? "dark" : "light"
    };
  } catch {
    return fallback;
  }
}

function defaultAccounts() {
  return ACCOUNT_TYPES.map((name) => ({
    name,
    balance: name === "Credit Card" ? -1500 : name === "Bank Account" ? 10000 : 750
  }));
}

function defaultBills() {
  return [
    { name: "Rent", dueDay: 1, amount: 5000 },
    { name: "DEWA", dueDay: 10, amount: 450 },
    { name: "Etisalat", dueDay: 15, amount: 260 },
    { name: "Credit Card", dueDay: 25, amount: 1500 }
  ];
}

function defaultGoals() {
  return [
    { name: "Emergency Fund", target: 30000, saved: 9000 },
    { name: "Car", target: 50000, saved: 12000 },
    { name: "Travel", target: 15000, saved: 3500 }
  ];
}

function mergeByName(defaults, incoming, key) {
  if (!Array.isArray(incoming)) return defaults;
  return defaults.map((item) => ({ ...item, ...(incoming.find((entry) => entry?.[key] === item[key]) || {}) }));
}

function seedExpenses() {
  const now = new Date();
  const samples = [
    ["Rent", 5000, "Monthly rent", "Bank Transfer"],
    ["Dewa", 450, "Utilities", "Card"],
    ["Grocery", 320, "Weekly groceries", "Card"],
    ["Etisalat", 260, "Internet and phone", "Card"],
    ["Dining Out", 185, "Dinner", "Card"],
    ["Netflix", 39, "Subscription", "Card"]
  ];
  return samples.map(([category, amount, note, paymentMethod], index) => ({
    id: crypto.randomUUID(),
    date: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - index)).toISOString().slice(0, 10),
    amount,
    category,
    note,
    paymentMethod,
    recurring: RECURRING_CATEGORIES.includes(category),
    createdAt: new Date().toISOString()
  }));
}

function seedIncomes() {
  const now = new Date();
  return [
    {
      id: crypto.randomUUID(),
      date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      amount: 12000,
      type: "Salary",
      note: "Monthly salary",
      createdAt: new Date().toISOString()
    }
  ];
}

function App() {
  const initial = useMemo(loadState, []);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [incomes, setIncomes] = useState(initial.incomes);
  const [accounts, setAccounts] = useState(initial.accounts);
  const [bills, setBills] = useState(initial.bills);
  const [goals, setGoals] = useState(initial.goals);
  const [budgets, setBudgets] = useState(initial.budgets);
  const [theme, setTheme] = useState(initial.theme);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [incomeForm, setIncomeForm] = useState(emptyIncome);
  const [filters, setFilters] = useState({
    month: monthKey(todayISO()).split("-")[1],
    year: monthKey(todayISO()).split("-")[0],
    category: "All",
    search: ""
  });
  const importCsvRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses, incomes, accounts, bills, goals, budgets, theme, currency: "AED", version: 3 }));
  }, [expenses, incomes, accounts, bills, goals, budgets, theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const years = useMemo(() => {
    const allYears = [
      new Date().getFullYear().toString(),
      ...expenses.map((item) => item.date.slice(0, 4)),
      ...incomes.map((item) => item.date.slice(0, 4))
    ];
    return Array.from(new Set(allYears)).sort((a, b) => Number(b) - Number(a));
  }, [expenses, incomes]);

  const currentMonthKey = `${filters.year === "All" ? new Date().getFullYear() : filters.year}-${filters.month === "All" ? String(new Date().getMonth() + 1).padStart(2, "0") : filters.month}`;

  const filteredExpenses = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return expenses
      .filter((expense) => filters.year === "All" || expense.date.slice(0, 4) === filters.year)
      .filter((expense) => filters.month === "All" || expense.date.slice(5, 7) === filters.month)
      .filter((expense) => filters.category === "All" || expense.category === filters.category)
      .filter((expense) => {
        if (!query) return true;
        return [expense.date, expense.category, expense.note].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filters]);

  const monthlyExpenses = useMemo(
    () => expenses.filter((expense) => monthKey(expense.date) === currentMonthKey),
    [expenses, currentMonthKey]
  );

  const monthlyIncomes = useMemo(
    () => incomes.filter((income) => monthKey(income.date) === currentMonthKey),
    [incomes, currentMonthKey]
  );

  const budgetRows = useMemo(() => {
    const spentByCategory = groupExpenseSum(monthlyExpenses, "category");
    return CATEGORIES.map((category) => {
      const budget = parseAmount(budgets[category]);
      const spent = spentByCategory[category] || 0;
      const percent = budget ? Math.min(100, (spent / budget) * 100) : 0;
      return {
        category,
        budget,
        spent,
        percent,
        remaining: Math.max(0, budget - spent),
        overspent: Math.max(0, spent - budget),
        isOverspent: budget > 0 && spent > budget,
        isUnderBudget: budget > 0 && spent <= budget
      };
    });
  }, [budgets, monthlyExpenses]);

  const finance = useMemo(() => {
    const totalBudget = budgetRows.reduce((sum, row) => sum + row.budget, 0);
    const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = monthlyIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalSavings = Math.max(0, totalIncome - totalExpenses);
    const remainingBalance = totalIncome - totalExpenses;
    return {
      totalBudget,
      totalIncome,
      totalExpenses,
      totalSavings,
      savingsRate: totalIncome ? (totalSavings / totalIncome) * 100 : 0,
      remainingBalance,
      budgetRemaining: Math.max(0, totalBudget - totalExpenses),
      overspent: budgetRows.reduce((sum, row) => sum + row.overspent, 0)
    };
  }, [budgetRows, monthlyExpenses, monthlyIncomes]);

  const categoryData = useMemo(() => {
    return Object.entries(groupExpenseSum(monthlyExpenses, "category"))
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyExpenses]);

  const monthlyTrend = useMemo(() => buildMonthlyTrend(expenses, incomes), [expenses, incomes]);
  const largestExpense = useMemo(
    () => [...monthlyExpenses].sort((a, b) => b.amount - a.amount)[0],
    [monthlyExpenses]
  );
  const upcomingBills = useMemo(() => buildUpcomingBills(bills), [bills]);

  const recentTransactions = useMemo(() => {
    const incomeRows = monthlyIncomes.map((income) => ({ ...income, kind: "income", category: income.type }));
    const expenseRows = monthlyExpenses.map((expense) => ({ ...expense, kind: "expense" }));
    return [...incomeRows, ...expenseRows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [monthlyExpenses, monthlyIncomes]);

  function saveExpense(event) {
    event.preventDefault();
    const amount = parseAmount(expenseForm.amount);
    if (!amount) return;
    const record = {
      id: expenseForm.id || crypto.randomUUID(),
      date: expenseForm.date,
      amount,
      category: expenseForm.category,
      note: expenseForm.note.trim(),
      paymentMethod: expenseForm.paymentMethod,
      recurring: expenseForm.recurring,
      createdAt: expenseForm.createdAt || new Date().toISOString()
    };
    setExpenses((current) => expenseForm.id ? current.map((item) => item.id === expenseForm.id ? record : item) : [record, ...current]);
    setExpenseForm(emptyExpense());
    setActiveTab("expenses");
  }

  function saveIncome(event) {
    event.preventDefault();
    const amount = parseAmount(incomeForm.amount);
    if (!amount) return;
    const record = {
      id: incomeForm.id || crypto.randomUUID(),
      date: incomeForm.date,
      amount,
      type: incomeForm.type,
      note: incomeForm.note.trim(),
      createdAt: incomeForm.createdAt || new Date().toISOString()
    };
    setIncomes((current) => incomeForm.id ? current.map((item) => item.id === incomeForm.id ? record : item) : [record, ...current]);
    setIncomeForm(emptyIncome());
    setActiveTab("income");
  }

  function editExpense(expense) {
    setExpenseForm({ ...expense, amount: String(expense.amount) });
    setActiveTab("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editIncome(income) {
    setIncomeForm({ ...income, amount: String(income.amount) });
    setActiveTab("income");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteExpense(id) {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
  }

  function deleteIncome(id) {
    setIncomes((current) => current.filter((income) => income.id !== id));
  }

  function updateBudget(category, value) {
    setBudgets((current) => ({ ...current, [category]: parseAmount(value) }));
  }

  function updateAccount(name, value) {
    setAccounts((current) => current.map((account) => account.name === name ? { ...account, balance: Number.parseFloat(value) || 0 } : account));
  }

  function updateBill(name, field, value) {
    setBills((current) => current.map((bill) => bill.name === name ? { ...bill, [field]: field === "dueDay" ? Math.min(31, Math.max(1, Number.parseInt(value, 10) || 1)) : parseAmount(value) } : bill));
  }

  function updateGoal(name, field, value) {
    setGoals((current) => current.map((goal) => goal.name === name ? { ...goal, [field]: parseAmount(value) } : goal));
  }

  function exportCsv() {
    const rows = filteredExpenses.map((expense) => ({
      Date: expense.date,
      Amount: expense.amount,
      Category: expense.category,
      Note: expense.note,
      "Payment Method": expense.paymentMethod,
      Recurring: expense.recurring ? "Yes" : "No"
    }));
    downloadFile(`expenses-${todayISO()}.csv`, toCsv(rows), "text/csv");
  }

  function exportExcel() {
    const sheets = {
      Expenses: expenses.map((expense) => ({
        Date: expense.date,
        Amount: expense.amount,
        Category: expense.category,
        Note: expense.note,
        "Payment Method": expense.paymentMethod,
        Recurring: expense.recurring ? "Yes" : "No"
      })),
      Income: incomes.map((income) => ({
        Date: income.date,
        Amount: income.amount,
        Type: income.type,
        Note: income.note
      })),
      Budgets: CATEGORIES.map((category) => ({
        Category: category,
        Budget: budgets[category] || 0
      })),
      Accounts: accounts.map((account) => ({
        Account: account.name,
        Balance: account.balance
      })),
      Bills: bills.map((bill) => ({
        Bill: bill.name,
        "Due Day": bill.dueDay,
        Amount: bill.amount
      })),
      Goals: goals.map((goal) => ({
        Goal: goal.name,
        Target: goal.target,
        Saved: goal.saved
      }))
    };
    downloadXlsx(`expense-tracker-${todayISO()}.xlsx`, sheets);
  }

  function backupData() {
    const backup = {
      version: 3,
      currency: "AED",
      exportedAt: new Date().toISOString(),
      expenses,
      incomes,
      accounts,
      bills,
      goals,
      budgets,
      theme
    };
    downloadFile(`expense-tracker-backup-${todayISO()}.json`, JSON.stringify(backup, null, 2), "application/json");
  }

  async function importCsv(file) {
    if (!file) return;
    const text = await file.text();
    const imported = parseCsv(text).map((row) => ({
      id: crypto.randomUUID(),
      date: row.Date || row.date || todayISO(),
      amount: parseAmount(row.Amount || row.amount),
      category: CATEGORIES.includes(row.Category || row.category) ? (row.Category || row.category) : "Other",
      note: row.Note || row.note || "",
      paymentMethod: PAYMENT_METHODS.includes(row["Payment Method"] || row.paymentMethod) ? (row["Payment Method"] || row.paymentMethod) : "Other",
      recurring: /yes|true/i.test(row.Recurring || row.recurring || ""),
      createdAt: new Date().toISOString()
    })).filter((expense) => expense.amount > 0);
    setExpenses((current) => [...imported, ...current]);
    importCsvRef.current.value = "";
  }

  async function restoreData(file) {
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    setExpenses(Array.isArray(parsed.expenses) ? parsed.expenses : []);
    setIncomes(Array.isArray(parsed.incomes) ? parsed.incomes : []);
    setAccounts(mergeByName(defaultAccounts(), parsed.accounts, "name"));
    setBills(mergeByName(defaultBills(), parsed.bills, "name"));
    setGoals(mergeByName(defaultGoals(), parsed.goals, "name"));
    setBudgets({ ...Object.fromEntries(CATEGORIES.map((category) => [category, 0])), ...(parsed.budgets || {}) });
    setTheme(parsed.theme === "dark" ? "dark" : "light");
    restoreRef.current.value = "";
  }

  function resetData() {
    const confirmed = window.confirm("Reset all expenses, income, budgets, and settings?");
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    setExpenses([]);
    setIncomes([]);
    setAccounts(defaultAccounts());
    setBills(defaultBills());
    setGoals(defaultGoals());
    setBudgets(Object.fromEntries(CATEGORIES.map((category) => [category, 0])));
    setTheme("light");
    setExpenseForm(emptyExpense());
    setIncomeForm(emptyIncome());
    setActiveTab("dashboard");
  }

  async function installApp() {
    if (isInstalled) return;
    if (!installPrompt) {
      window.alert("Use your browser menu and choose Install App or Add to Home Screen.");
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AED Personal Finance</p>
          <h1>Expense Tracker</h1>
        </div>
        <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle dark mode">
          {theme === "dark" ? "Sun" : "Moon"}
        </button>
      </header>

      <nav className="tabs" aria-label="Primary">
        {[
          ["dashboard", "Home"],
          ["add", expenseForm.id ? "Edit" : "Add"],
          ["income", "Income"],
          ["budgets", "Budgets"],
          ["reports", "Reports"],
          ["expenses", "Expenses"],
          ["settings", "Settings"]
        ].map(([id, label]) => (
          <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </nav>

      <section className="filters">
        <Select label="Month" value={filters.month} onChange={(value) => setFilters({ ...filters, month: value })} options={[["All", "All"], ...Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, "0"), new Date(2026, i, 1).toLocaleString("en", { month: "short" })])]} />
        <Select label="Year" value={filters.year} onChange={(value) => setFilters({ ...filters, year: value })} options={[["All", "All"], ...years.map((year) => [year, year])]} />
        <Select label="Category" value={filters.category} onChange={(value) => setFilters({ ...filters, category: value })} options={[["All", "All"], ...CATEGORIES.map((category) => [category, category])]} />
        <label className="field search-field">
          <span>Search</span>
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Date, category, note" />
        </label>
      </section>

      {activeTab === "dashboard" && (
        <Dashboard
          finance={finance}
          currentMonthKey={currentMonthKey}
          expenses={monthlyExpenses}
          categoryData={categoryData}
          largestExpense={largestExpense}
          transactions={recentTransactions}
          accounts={accounts}
          upcomingBills={upcomingBills}
          goals={goals}
          budgetRows={budgetRows}
          onInstall={installApp}
          canInstall={Boolean(installPrompt)}
          isInstalled={isInstalled}
        />
      )}

      {activeTab === "add" && (
        <ExpenseForm form={expenseForm} setForm={setExpenseForm} onSubmit={saveExpense} onCancel={() => setExpenseForm(emptyExpense())} />
      )}

      {activeTab === "income" && (
        <IncomeSection
          form={incomeForm}
          setForm={setIncomeForm}
          incomes={monthlyIncomes}
          onSubmit={saveIncome}
          onCancel={() => setIncomeForm(emptyIncome())}
          onEdit={editIncome}
          onDelete={deleteIncome}
        />
      )}

      {activeTab === "budgets" && (
        <Budgets rows={budgetRows} onBudgetChange={updateBudget} finance={finance} />
      )}

      {activeTab === "reports" && (
        <Reports categoryData={categoryData} rows={budgetRows} monthlyTrend={monthlyTrend} />
      )}

      {activeTab === "expenses" && (
        <Expenses
          expenses={filteredExpenses}
          onEdit={editExpense}
          onDelete={deleteExpense}
          onExportCsv={exportCsv}
          onExportExcel={exportExcel}
          onBackup={backupData}
          importCsvRef={importCsvRef}
          restoreRef={restoreRef}
          onImportCsv={importCsv}
          onRestore={restoreData}
        />
      )}

      {activeTab === "settings" && (
        <Settings
          theme={theme}
          setTheme={setTheme}
          onBackup={backupData}
          onExportExcel={exportExcel}
          onRestore={() => restoreRef.current.click()}
          onReset={resetData}
          restoreRef={restoreRef}
          onRestoreFile={restoreData}
          accounts={accounts}
          bills={bills}
          goals={goals}
          onAccountChange={updateAccount}
          onBillChange={updateBill}
          onGoalChange={updateGoal}
        />
      )}
    </main>
  );
}

function Dashboard({ finance, currentMonthKey, expenses, categoryData, largestExpense, transactions, accounts, upcomingBills, goals, budgetRows, onInstall, canInstall, isInstalled }) {
  const activeBudgetRows = budgetRows.filter((row) => row.budget || row.spent).slice(0, 6);
  return (
    <div className="stack">
      <section className="summary-grid finance-grid">
        <Metric icon="IN" label="Total Income" value={AED.format(finance.totalIncome)} tone="good" />
        <Metric icon="EX" label="Total Expenses" value={AED.format(finance.totalExpenses)} />
        <Metric icon="SV" label="Total Savings" value={AED.format(finance.totalSavings)} tone="good" />
        <Metric icon="BA" label="Remaining Balance" value={AED.format(finance.remainingBalance)} tone={finance.remainingBalance < 0 ? "danger" : "good"} />
        <Metric icon="%" label="Savings Rate" value={`${finance.savingsRate.toFixed(1)}%`} />
      </section>

      <section className="panel hero-panel">
        <div>
          <p className="eyebrow">Current Month Summary</p>
          <h2>{formatMonth(currentMonthKey)}</h2>
          <p className="muted">{expenses.length} expenses recorded. Largest expense: {largestExpense ? `${largestExpense.category} at ${AED.format(largestExpense.amount)}` : "none yet"}.</p>
        </div>
        <div className="hero-actions">
          <button className="primary install-button" onClick={onInstall} disabled={isInstalled}>
            {isInstalled ? "App Installed" : canInstall ? "Install App" : "Install App"}
          </button>
          <div className="progress-wrap">
            <div className="progress-label">
              <span>Budget used</span>
              <strong>{finance.totalBudget ? Math.round((finance.totalExpenses / finance.totalBudget) * 100) : 0}%</strong>
            </div>
            <div className="progress"><span style={{ width: `${Math.min(100, finance.totalBudget ? (finance.totalExpenses / finance.totalBudget) * 100 : 0)}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="three-column">
        <div className="panel">
          <h2>Financial Accounts</h2>
          <AccountBalanceList accounts={accounts} />
        </div>
        <div className="panel">
          <h2>Upcoming Bills</h2>
          <UpcomingBills bills={upcomingBills} />
        </div>
        <div className="panel">
          <h2>Goals</h2>
          <GoalsProgress goals={goals} />
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <h2>Top 5 Expense Categories</h2>
          <RankedList data={categoryData.slice(0, 5)} />
        </div>
        <div className="panel">
          <h2>Largest Expense This Month</h2>
          {largestExpense ? <ExpenseList expenses={[largestExpense]} compact /> : <p className="empty">No expenses found.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="two-column inner">
          <div>
            <h2>Recent Transactions</h2>
            <TransactionList transactions={transactions} />
          </div>
          <div>
            <h2>Monthly Budget Status</h2>
            <BudgetStatus rows={activeBudgetRows} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ExpenseForm({ form, setForm, onSubmit, onCancel }) {
  return (
    <form className="panel form-grid" onSubmit={onSubmit}>
      <h2>{form.id ? "Edit Expense" : "Add Expense"}</h2>
      <label className="field">
        <span>Date</span>
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
      </label>
      <label className="field">
        <span>Amount</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="AED 0.00" required />
      </label>
      <Select label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value, recurring: RECURRING_CATEGORIES.includes(value) })} options={CATEGORIES.map((category) => [category, category])} />
      <Select label="Payment Method" value={form.paymentMethod} onChange={(value) => setForm({ ...form, paymentMethod: value })} options={PAYMENT_METHODS.map((method) => [method, method])} />
      <label className="field full">
        <span>Note</span>
        <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Optional note" />
      </label>
      <label className="check full">
        <input type="checkbox" checked={form.recurring} onChange={(event) => setForm({ ...form, recurring: event.target.checked })} />
        <span>Recurring expense</span>
      </label>
      <div className="actions full">
        <button className="primary" type="submit">{form.id ? "Save Changes" : "Add Expense"}</button>
        {form.id && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function IncomeSection({ form, setForm, incomes, onSubmit, onCancel, onEdit, onDelete }) {
  const total = incomes.reduce((sum, income) => sum + income.amount, 0);
  return (
    <div className="stack">
      <section className="summary-grid income-cards">
        {INCOME_TYPES.map((type) => (
          <Metric key={type} icon={type.slice(0, 2).toUpperCase()} label={type} value={AED.format(incomes.filter((income) => income.type === type).reduce((sum, income) => sum + income.amount, 0))} />
        ))}
        <Metric icon="TT" label="Monthly Income" value={AED.format(total)} tone="good" />
      </section>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <h2>{form.id ? "Edit Income" : "Monthly Income"}</h2>
        <label className="field">
          <span>Date</span>
          <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        </label>
        <label className="field">
          <span>Amount</span>
          <input type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="AED 0.00" required />
        </label>
        <Select label="Income Type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={INCOME_TYPES.map((type) => [type, type])} />
        <label className="field">
          <span>Note</span>
          <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Optional note" />
        </label>
        <div className="actions full">
          <button className="primary" type="submit">{form.id ? "Save Income" : "Add Income"}</button>
          {form.id && <button type="button" onClick={onCancel}>Cancel</button>}
        </div>
      </form>

      <section className="panel">
        <h2>Income Records</h2>
        <IncomeList incomes={incomes} onEdit={onEdit} onDelete={onDelete} />
      </section>
    </div>
  );
}

function Budgets({ rows, onBudgetChange, finance }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Budget Dashboard</h2>
          <p className="muted">Green categories are under budget. Red categories are over budget.</p>
        </div>
        <strong className={finance.overspent ? "danger" : "good"}>{finance.overspent ? `${AED.format(finance.overspent)} over` : `${AED.format(finance.budgetRemaining)} left`}</strong>
      </div>
      <div className="budget-grid">
        {rows.map((row) => (
          <article key={row.category} className={`budget-card ${row.isOverspent ? "over" : "under"}`}>
            <div className="budget-card-head">
              <strong>{row.category}</strong>
              <span>{row.budget ? `${Math.round((row.spent / row.budget) * 100)}%` : "No budget"}</span>
            </div>
            <div className="budget-card-meta">
              <span>Budget {AED.format(row.budget)}</span>
              <span>Spent {AED.format(row.spent)}</span>
            </div>
            <div className="progress"><span style={{ width: `${row.percent}%` }} /></div>
            <div className="budget-card-foot">
              <span className="good">Remaining {AED.format(row.remaining)}</span>
              <span className={row.overspent ? "danger" : ""}>Overspent {AED.format(row.overspent)}</span>
            </div>
            <input className="budget-input" type="number" min="0" step="0.01" value={row.budget} onChange={(event) => onBudgetChange(row.category, event.target.value)} aria-label={`${row.category} budget`} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Reports({ categoryData, rows, monthlyTrend }) {
  const topRows = rows.filter((row) => row.budget || row.spent).slice(0, 12);
  return (
    <section className="reports-grid">
      <div className="panel"><h2>Monthly Comparison</h2><ComparisonChart data={monthlyTrend} firstKey="income" secondKey="expenses" firstLabel="Income" secondLabel="Expenses" /></div>
      <div className="panel"><h2>Category Comparison</h2><BarChart data={topRows} /></div>
      <div className="panel"><h2>Income vs Expense</h2><ComparisonChart data={monthlyTrend.slice(-6)} firstKey="income" secondKey="expenses" firstLabel="Income" secondLabel="Expense" /></div>
      <div className="panel"><h2>Savings Trend</h2><TrendChart data={monthlyTrend.map((item) => ({ label: item.label, value: item.savings }))} /></div>
      <div className="panel wide"><h2>Pie Chart by Category</h2><PieChart data={categoryData} /></div>
    </section>
  );
}

function Expenses({ expenses, onEdit, onDelete, onExportCsv, onExportExcel, onBackup, importCsvRef, restoreRef, onImportCsv, onRestore }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Expense Management</h2>
          <p className="muted">{expenses.length} matching records</p>
        </div>
        <div className="actions wrap">
          <button onClick={onExportExcel}>Export Excel</button>
          <button onClick={onExportCsv}>Export CSV</button>
          <button onClick={() => importCsvRef.current.click()}>Import CSV</button>
          <button onClick={onBackup}>Backup</button>
          <button onClick={() => restoreRef.current.click()}>Restore</button>
          <input ref={importCsvRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => onImportCsv(event.target.files[0])} />
          <input ref={restoreRef} hidden type="file" accept=".json,application/json" onChange={(event) => onRestore(event.target.files[0])} />
        </div>
      </div>
      <ExpenseList expenses={expenses} onEdit={onEdit} onDelete={onDelete} />
    </section>
  );
}

function Settings({ theme, setTheme, onBackup, onExportExcel, onRestore, onReset, restoreRef, onRestoreFile, accounts, bills, goals, onAccountChange, onBillChange, onGoalChange }) {
  return (
    <section className="settings-grid">
      <div className="panel">
        <h2>Currency</h2>
        <p className="muted">All amounts are formatted in AED using the United Arab Emirates locale.</p>
        <Metric icon="AED" label="Currency Format" value={AED.format(12345.67)} />
      </div>
      <div className="panel">
        <h2>Appearance</h2>
        <div className="segmented">
          <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>Light</button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>Dark</button>
        </div>
      </div>
      <div className="panel">
        <h2>Backup and Restore</h2>
        <p className="muted">Backup includes expenses, income, budgets, theme, currency, and export timestamp.</p>
        <div className="actions wrap">
          <button onClick={onExportExcel}>Export Excel</button>
          <button onClick={onBackup}>Download Backup</button>
          <button onClick={onRestore}>Restore Backup</button>
          <input ref={restoreRef} hidden type="file" accept=".json,application/json" onChange={(event) => onRestoreFile(event.target.files[0])} />
        </div>
      </div>
      <div className="panel">
        <h2>Financial Accounts</h2>
        <div className="settings-list">
          {accounts.map((account) => (
            <label className="field" key={account.name}>
              <span>{account.name}</span>
              <input type="number" step="0.01" value={account.balance} onChange={(event) => onAccountChange(account.name, event.target.value)} />
            </label>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Bills and Reminders</h2>
        <div className="settings-list">
          {bills.map((bill) => (
            <div className="settings-row" key={bill.name}>
              <label className="field">
                <span>{bill.name} Due Day</span>
                <input type="number" min="1" max="31" value={bill.dueDay} onChange={(event) => onBillChange(bill.name, "dueDay", event.target.value)} />
              </label>
              <label className="field">
                <span>Amount</span>
                <input type="number" min="0" step="0.01" value={bill.amount} onChange={(event) => onBillChange(bill.name, "amount", event.target.value)} />
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Goals</h2>
        <div className="settings-list">
          {goals.map((goal) => (
            <div className="settings-row" key={goal.name}>
              <label className="field">
                <span>{goal.name} Saved</span>
                <input type="number" min="0" step="0.01" value={goal.saved} onChange={(event) => onGoalChange(goal.name, "saved", event.target.value)} />
              </label>
              <label className="field">
                <span>Target</span>
                <input type="number" min="0" step="0.01" value={goal.target} onChange={(event) => onGoalChange(goal.name, "target", event.target.value)} />
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="panel danger-zone">
        <h2>Data Reset</h2>
        <p className="muted">Reset clears local browser data for this tracker.</p>
        <button className="danger-button solid" onClick={onReset}>Reset All Data</button>
      </div>
    </section>
  );
}

function AccountBalanceList({ accounts }) {
  return (
    <div className="mini-list">
      {accounts.map((account) => (
        <div className="mini-row" key={account.name}>
          <span>{account.name}</span>
          <strong className={account.balance < 0 ? "danger" : ""}>{AED.format(account.balance)}</strong>
        </div>
      ))}
    </div>
  );
}

function UpcomingBills({ bills }) {
  if (!bills.length) return <p className="empty">No upcoming bills.</p>;
  return (
    <div className="mini-list">
      {bills.map((bill) => (
        <div className="mini-row" key={bill.name}>
          <span>{bill.name}</span>
          <strong>{bill.dueLabel}</strong>
          <small>{AED.format(bill.amount)}</small>
        </div>
      ))}
    </div>
  );
}

function GoalsProgress({ goals }) {
  return (
    <div className="mini-list">
      {goals.map((goal) => {
        const percent = goal.target ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
        return (
          <div className="goal-row" key={goal.name}>
            <div className="mini-row">
              <span>{goal.name}</span>
              <strong>{Math.round(percent)}%</strong>
            </div>
            <div className="progress"><span style={{ width: `${percent}%` }} /></div>
            <small>{AED.format(goal.saved)} of {AED.format(goal.target)}</small>
          </div>
        );
      })}
    </div>
  );
}

function BudgetStatus({ rows }) {
  if (!rows.length) return <p className="empty">No active budget rows yet.</p>;
  return (
    <div className="mini-list">
      {rows.map((row) => (
        <div className="goal-row" key={row.category}>
          <div className="mini-row">
            <span>{row.category}</span>
            <strong className={row.isOverspent ? "danger" : "good"}>{row.isOverspent ? "Over" : "Under"}</strong>
          </div>
          <div className={`progress ${row.isOverspent ? "danger-progress" : ""}`}><span style={{ width: `${row.percent}%` }} /></div>
          <small>{AED.format(row.spent)} spent of {AED.format(row.budget)}</small>
        </div>
      ))}
    </div>
  );
}

function TransactionList({ transactions }) {
  if (!transactions.length) return <p className="empty">No transactions this month.</p>;
  return (
    <div className="expense-list">
      {transactions.map((transaction) => (
        <article className={`expense-item transaction ${transaction.kind}`} key={`${transaction.kind}-${transaction.id}`}>
          <div>
            <strong>{transaction.category}</strong>
            <span>{transaction.date} | {transaction.kind === "income" ? "Income" : transaction.paymentMethod}</span>
            {transaction.note && <p>{transaction.note}</p>}
          </div>
          <div className="expense-side">
            <strong>{transaction.kind === "income" ? "+" : "-"} {AED.format(transaction.amount)}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function ExpenseList({ expenses, onEdit, onDelete, compact = false }) {
  if (!expenses.length) return <p className="empty">No expenses found.</p>;
  return (
    <div className="expense-list">
      {expenses.map((expense) => (
        <article className="expense-item" key={expense.id}>
          <div>
            <strong>{expense.category}</strong>
            <span>{expense.date} | {expense.paymentMethod}{expense.recurring ? " | Recurring" : ""}</span>
            {expense.note && <p>{expense.note}</p>}
          </div>
          <div className="expense-side">
            <strong>{AED.format(expense.amount)}</strong>
            {!compact && (
              <div className="mini-actions">
                <button onClick={() => onEdit(expense)}>Edit</button>
                <button className="danger-button" onClick={() => onDelete(expense.id)}>Delete</button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function IncomeList({ incomes, onEdit, onDelete }) {
  if (!incomes.length) return <p className="empty">No income records found.</p>;
  return (
    <div className="expense-list">
      {incomes.map((income) => (
        <article className="expense-item transaction income" key={income.id}>
          <div>
            <strong>{income.type}</strong>
            <span>{income.date}</span>
            {income.note && <p>{income.note}</p>}
          </div>
          <div className="expense-side">
            <strong>{AED.format(income.amount)}</strong>
            <div className="mini-actions">
              <button onClick={() => onEdit(income)}>Edit</button>
              <button className="danger-button" onClick={() => onDelete(income.id)}>Delete</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Metric({ label, value, tone = "neutral", icon = "" }) {
  return (
    <article className={`metric ${tone}`}>
      {icon && <span className="metric-icon">{icon}</span>}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function RankedList({ data }) {
  if (!data.length) return <p className="empty">No spending yet.</p>;
  const max = Math.max(...data.map((item) => item.value));
  return (
    <div className="ranked">
      {data.map((item) => (
        <div className="rank-row" key={item.label}>
          <div><strong>{item.label}</strong><span>{AED.format(item.value)}</span></div>
          <div className="bar"><span style={{ width: `${max ? (item.value / max) * 100 : 0}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function PieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <p className="empty">No chart data yet.</p>;
  let offset = 0;
  const segments = data.slice(0, 10).map((item, index) => {
    const percent = item.value / total;
    const dash = `${percent * 100} ${100 - percent * 100}`;
    const segment = <circle key={item.label} r="16" cx="20" cy="20" fill="transparent" stroke={COLORS[index % COLORS.length]} strokeWidth="8" strokeDasharray={dash} strokeDashoffset={-offset} />;
    offset += percent * 100;
    return segment;
  });
  return (
    <div className="chart-with-legend">
      <svg viewBox="0 0 40 40" className="pie" role="img" aria-label="Pie chart by category">{segments}</svg>
      <Legend data={data.slice(0, 10)} />
    </div>
  );
}

function BarChart({ data }) {
  if (!data.length) return <p className="empty">No budget data yet.</p>;
  const max = Math.max(...data.map((row) => Math.max(row.budget, row.spent)), 1);
  return (
    <div className="bar-chart">
      {data.map((row) => (
        <div className="bar-row" key={row.category}>
          <span>{row.category}</span>
          <div>
            <i className="budget-bar" style={{ width: `${(row.budget / max) * 100}%` }} />
            <i className={row.isOverspent ? "spent-bar over" : "spent-bar"} style={{ width: `${(row.spent / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="legend-inline"><span className="budget-dot" /> Budget <span className="spent-dot" /> Spent</div>
    </div>
  );
}

function ComparisonChart({ data, firstKey, secondKey, firstLabel, secondLabel }) {
  if (!data.length) return <p className="empty">No comparison data yet.</p>;
  const max = Math.max(...data.flatMap((item) => [item[firstKey], item[secondKey]]), 1);
  return (
    <div className="comparison-chart">
      {data.map((item) => (
        <div className="compare-row" key={`${item.label}-${firstKey}`}>
          <span>{item.label}</span>
          <div>
            <i className="income-bar" style={{ height: `${Math.max(4, (item[firstKey] / max) * 100)}%` }} title={`${firstLabel}: ${AED.format(item[firstKey])}`} />
            <i className="expense-bar" style={{ height: `${Math.max(4, (item[secondKey] / max) * 100)}%` }} title={`${secondLabel}: ${AED.format(item[secondKey])}`} />
          </div>
        </div>
      ))}
      <div className="legend-inline"><span className="income-dot" /> {firstLabel} <span className="expense-dot" /> {secondLabel}</div>
    </div>
  );
}

function TrendChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const min = Math.min(...data.map((item) => item.value), 0);
  const range = Math.max(1, max - min);
  const points = data.map((item, index) => {
    const x = 8 + index * (84 / Math.max(1, data.length - 1));
    const y = 88 - ((item.value - min) / range) * 72;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="trend-wrap">
      <svg viewBox="0 0 100 100" className="trend" preserveAspectRatio="none" role="img" aria-label="Monthly trend">
        <polyline points={points} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((item, index) => {
          const x = 8 + index * (84 / Math.max(1, data.length - 1));
          const y = 88 - ((item.value - min) / range) * 72;
          return <circle key={item.label} cx={x} cy={y} r="1.8" fill="#f59e0b" />;
        })}
      </svg>
      <div className="trend-labels">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div>
    </div>
  );
}

function Legend({ data }) {
  return (
    <div className="legend">
      {data.map((item, index) => (
        <span key={item.label}><i style={{ background: COLORS[index % COLORS.length] }} />{item.label} | {AED.format(item.value)}</span>
      ))}
    </div>
  );
}

function buildUpcomingBills(bills) {
  const now = new Date();
  return bills
    .map((bill) => {
      const due = nextDueDate(now, bill.dueDay);
      const daysLeft = Math.ceil((due - startOfDay(now)) / 86400000);
      return {
        ...bill,
        dueDate: due.toISOString().slice(0, 10),
        daysLeft,
        dueLabel: daysLeft === 0 ? "Today" : `${daysLeft}d`
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function nextDueDate(now, dueDay) {
  const safeDay = Math.min(31, Math.max(1, Number(dueDay) || 1));
  const candidate = new Date(now.getFullYear(), now.getMonth(), safeDay);
  if (candidate < startOfDay(now)) {
    return new Date(now.getFullYear(), now.getMonth() + 1, safeDay);
  }
  return candidate;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function groupExpenseSum(records, key) {
  return records.reduce((acc, record) => {
    acc[record[key]] = (acc[record[key]] || 0) + Number(record.amount || 0);
    return acc;
  }, {});
}

function buildMonthlyTrend(expenses, incomes) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const key = date.toISOString().slice(0, 7);
    const expenseTotal = expenses.filter((expense) => monthKey(expense.date) === key).reduce((sum, expense) => sum + expense.amount, 0);
    const incomeTotal = incomes.filter((income) => monthKey(income.date) === key).reduce((sum, income) => sum + income.amount, 0);
    return {
      label: date.toLocaleDateString("en", { month: "short" }),
      expenses: expenseTotal,
      income: incomeTotal,
      savings: incomeTotal - expenseTotal,
      value: expenseTotal
    };
  });
}

function toCsv(rows) {
  const headers = Object.keys(rows[0] || { Date: "", Amount: "", Category: "", Note: "", "Payment Method": "", Recurring: "" });
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines.shift() || []);
  return lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadXlsx(filename, sheets) {
  const sheetNames = Object.keys(sheets);
  const files = {
    "[Content_Types].xml": contentTypesXml(sheetNames),
    "_rels/.rels": rootRelsXml(),
    "xl/workbook.xml": workbookXml(sheetNames),
    "xl/_rels/workbook.xml.rels": workbookRelsXml(sheetNames),
    "xl/styles.xml": stylesXml(),
    ...Object.fromEntries(sheetNames.map((name, index) => [`xl/worksheets/sheet${index + 1}.xml`, worksheetXml(sheets[name])]))
  };
  const zipped = zipFiles(files);
  downloadBlob(filename, new Blob([zipped], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

function worksheetXml(rows) {
  const headers = Object.keys(rows[0] || { Empty: "" });
  const bodyRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${bodyRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cellXml(columnIndex, rowIndex, value)).join("")}</row>`).join("")}</sheetData></worksheet>`;
}

function cellXml(columnIndex, rowIndex, value) {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value ?? "")}</t></is></c>`;
}

function columnName(index) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - mod) / 26);
  }
  return name;
}

function contentTypesXml(sheetNames) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetNames.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function workbookXml(sheetNames) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames.map((name, index) => `<sheet name="${escapeXml(name).slice(0, 31)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`;
}

function workbookRelsXml(sheetNames) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>`;
}

function zipFiles(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = concatBytes([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc),
      u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data
    ]);
    localParts.push(local);
    centralParts.push(concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc),
      u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes
    ]));
    offset += local.length;
  });
  const central = concatBytes(centralParts);
  const end = concatBytes([u32(0x06054b50), u16(0), u16(0), u16(centralParts.length), u16(centralParts.length), u32(central.length), u32(offset), u16(0)]);
  return concatBytes([...localParts, central, end]);
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function u16(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255);
}

function u32(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

createRoot(document.getElementById("root")).render(<App />);
