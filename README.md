# MoneyMate Backend API Service 💰

RESTful backend service built with **Node.js**, **Express**, **TypeScript**, and **Prisma ORM**, specifically designed to power the [MoneyMate Finance App](https://github.com/urshita20/MoneyMateFinanceApp).

---

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env` (preconfigured for local dev):
```env
PORT=5001
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="moneymate_super_secret_jwt_key_2026_finance_app"
CORS_ORIGIN="http://localhost:5173,http://localhost:8443,http://127.0.0.1:5173"
```

### 3. Initialize & Seed Database
Generate Prisma client and run seed script to create demo user (`demo@moneymate.com` / `password123`) and sample data:
```bash
npm run prisma:push
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run dev
```
The API server will run at `http://localhost:5001`.

---

## 🛰️ Key API Endpoints

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `/health` | `GET` | Health check endpoint |
| **Auth** | `/api/auth/register` | `POST` | Register a new user |
| **Auth** | `/api/auth/login` | `POST` | Login user & receive JWT token |
| **Auth** | `/api/auth/me` | `GET` | Get logged in user profile |
| **Transactions**| `/api/transactions` | `GET`, `POST` | List & log income/expense transactions |
| **OCR Scan** | `/api/transactions/ocr-scan` | `POST` | Extract merchant & amount from receipt image |
| **Budgets** | `/api/budgets` | `GET`, `POST` | Category spending budget limits & status |
| **Goals** | `/api/goals` | `GET`, `POST` | Financial savings target tracking |
| **Bills** | `/api/bills` | `GET`, `POST` | Upcoming & recurring bill reminders |
| **Analytics** | `/api/analytics/summary` | `GET` | Overall Net Worth, Income, Expense, Health Score |
| **Analytics** | `/api/analytics/spending-by-category` | `GET` | Category spending breakdown |
| **Analytics** | `/api/analytics/monthly-trends` | `GET` | Monthly Income vs Expense trends |
| **AI Assistant**| `/api/ai/chat` | `POST` | AI Financial Assistant response |
| **AI Insights** | `/api/ai/insights` | `GET` | Smart financial insights & warnings |
| **Investments** | `/api/investments` | `GET` | Mutual funds, stocks, portfolio performance |
| **Knowledge** | `/api/knowledge/articles` | `GET` | Financial literacy articles |
| **Junior Mode** | `/api/junior/quests` | `GET` | Kids savings quests and rewards |

---

## 🔒 Demo Credentials
- **Email**: `demo@moneymate.com`
- **Password**: `password123`
