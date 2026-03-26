# 💳 Budget Tracker

A lightweight, client-side budget tracker hosted on **GitHub Pages**.  
All data is stored in your browser's **localStorage** — no server, no sign-up.

## ✨ Features

- **Add / edit / delete** income and expense transactions
- **15 categories** with Font Awesome icons (Food, Transport, Salary, etc.)
- **Monthly budget** with progress bar + colour-coded alerts
- **Live currency exchange** — convert your balance, income & expenses into any of 20 currencies using real-time rates (powered by [frankfurter.app](https://www.frankfurter.app/))
- **Charts** — donut (spending by category) and bar (6-month income vs expenses)
- **Search, filter, and sort** transactions
- **CSV export** of all transactions
- **Currency setting** — any ISO 4217 code (USD, EUR, GBP, …)
- Fully **responsive** — works on mobile and desktop
- **Dark theme** UI with [Font Awesome](https://fontawesome.com/) icons

## 🚀 Live Demo

https://iamnoob2s.github.io/Bank/

## 🛠️ Local Development

No build step required. Just open `index.html` in any modern browser:

```bash
# Clone the repo
git clone https://github.com/iamnoob2s/Bank.git
cd Bank

# Open in browser (macOS)
open index.html

# Open in browser (Linux)
xdg-open index.html
```

## 📦 GitHub Pages Deployment

1. Go to **Settings → Pages** in the repository.
2. Under **Source**, select the branch (e.g. `main`) and folder `/` (root).
3. Click **Save** — your site will be published at `https://<username>.github.io/Bank/`.

## 📁 Files

| File | Description |
|------|-------------|
| `index.html` | Application markup |
| `style.css` | Dark-theme stylesheet |
| `app.js` | All application logic + localStorage |
