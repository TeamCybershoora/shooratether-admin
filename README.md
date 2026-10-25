# 🛡️ SHOORA TETHER Admin Portal

Enterprise Control and User Management Dashboard for SHOORA TETHER.

---

## 🚀 Quick Start

1. Ensure the Central Backend is running:
   ```bash
   cd ../shooratetherbackend
   node server.js
   ```

2. Start the Admin Portal:
   ```bash
   cd shooratether-admin
   npm start
   ```

3. Open your browser:
   ```
   http://localhost:3001
   ```

---

## 🔑 Default Superadmin Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@cybershoora.com` |
| **Password** | `ShooraAdmin@2026!` |

*(Can also be customized via `ADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_PASSWORD` in `shooratetherbackend/.env`)*

---

## ✨ Features

- **Live Registered Users Directory:** Inspect all Google, GitHub, and Email users registered via Desktop IDE or Web.
- **Real-Time KPI Metrics:** Total users, active users, active sessions, and StackCP MySQL database health.
- **Subscription Tier Manager:** One-click upgrade/downgrade of user plans (`FREE`, `PRO`, `TEAM`, `ENTERPRISE`).
- **Account Moderation:** Suspend or activate user accounts in real time.
- **Live Search & Pagination:** Instant search by name or email.
