# Personal Expense Tracker PWA

A professional mobile-friendly expense tracker built with React + Vite. It stores data locally in the browser with `localStorage`, supports AED currency, monthly income, category budgets, reporting charts, CSV import/export, JSON backup/restore, settings, and PWA installation on iPhone and Android.

## Features

- Monthly income tracking for Salary, Bonus, and Other Income.
- Dashboard cards for Total Income, Total Expenses, Total Savings, Savings Rate, and Remaining Balance.
- Home dashboard with current month summary, account balances, upcoming bills, goals, top 5 categories, largest expense, monthly budget status, and recent transactions.
- Budget dashboard with category progress bars and green/red status.
- Reports for monthly comparison, category comparison, income vs expense, savings trend, and category pie chart.
- Financial accounts for Cash Wallet, Bank Account, and Credit Card.
- Bills and reminders for Rent, DEWA, Etisalat, and Credit Card.
- Goals for Emergency Fund, Car, and Travel with progress bars.
- Expanded categories including Medical, Education, Travel, Entertainment, and Gifts.
- Settings for AED formatting preview, dark/light mode, data reset, account balances, bill due dates, goals, backup, and restore.

## Run Locally

1. Install Node.js 20 or newer from https://nodejs.org if it is not already installed.
2. Open a terminal in this folder:

   ```bash
   cd "C:\Users\saifu\OneDrive\Documents\Expense Traker"
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL shown in the terminal, usually:

   ```text
   http://127.0.0.1:5173
   ```

## Production Build

```bash
npm run build
npm run preview
```

## Install as a PWA

- iPhone: open the app in Safari, tap Share, then Add to Home Screen.
- Android: open the app in Chrome, tap the menu, then Install app or Add to Home screen.

## Data Tools

- Export CSV downloads filtered expense records.
- Export Excel downloads a multi-sheet `.xlsx` workbook with expenses, income, budgets, accounts, bills, and goals.
- Import CSV adds expense records from a CSV file.
- Backup downloads all app data as JSON.
- Restore replaces local app data from a backup JSON file.

All data stays on your device unless you export or back it up manually.
