# AstorrIOS STORE — Telegram Mini App & VIP Key Bot

A high-performance, automated Telegram Mini App and Bot ecosystem for selling digital license keys (VIP Game Mods, E-Sign Certificates, VPNs, and Digital Tools) with live Bakong KHQR integration, an internal wallet system, multi-duration product tiers, and a VIP Reseller management system.

---

## 🌟 Key Features & Systems Overview

### 1. Telegram Mini App Frontend (`public/`)
* **Modern Cyberpunk / Glassmorphic UI**: High-end dark theme with vibrant purple/gold accents and smooth micro-animations.
* **Strict Icon Standard (Zero Emojis)**: The entire Mini App interface uses pure **SVG Vector Icons** for an ultra-clean, professional aesthetic.
* **Responsive & Mobile-First**: Optimized for Telegram iOS, Android, and Desktop (with horizontal wheel and mouse-drag scrolling for categories).
* **Instant Dynamic Search & Filtering**: Filter by category chips, stock availability, or text search.

---

### 2. Product Duration / Tiers System (Game Hack Durations)
Products can be sold either as standard single products or divided into **Duration Tiers** (e.g. `6 ម៉ោង (6 Hours)`, `12 ម៉ោង (12 Hours)`, `1 ថ្ងៃ (1 Day)`, `7 ថ្ងៃ`, `30 ថ្ងៃ`):
* **Independent Pricing**: Each Tier defines its own Normal Price ($) and optional VIP Reseller Price ($).
* **Dedicated Stock Pools**: Each Tier manages its own pool of license keys.
* **Interactive Duration Selector**: In the Product Detail Modal, users select their duration with gold active-glow pill cards. The total price and stock indicator update dynamically in real time.
* **Admin Tier Builder**: Admin can create, modify, add keys, or delete tiers directly within both "Add Product" and "Edit Product" forms in the Mini App.

---

### 3. VIP Reseller System
* **Request Flow in Mini App**: Users can click "ស្នើសុំធ្វើជា Reseller" (Request Reseller) in their profile or wallet tab.
* **Instant Group Notification**: A formatted alert is dispatched to the Admin Telegram Group with inline action buttons (`✅ អនុម័ត (Accept)` / `❌ Cancel Request`).
* **Instant Approval & DM**:
  * If accepted, the user's role is set to `isReseller: true` in `data/database.json`, and the bot sends a congratulatory Telegram DM.
  * If rejected, a notification DM is sent to the user advising them to contact `@Yur1Uchiha`.
* **VIP Reseller Pricing**: Resellers automatically see discounted prices highlighted in green with a gold `VIP RESELLER` badge across all product cards and duration tiers.
* **Admin Reseller Management Tab**: Admin can view all approved resellers in the Mini App and revoke/remove reseller status at any time with a single click.

---

### 4. Dual Payment & Checkout Pipeline
1. **In-App Wallet Balance**:
   * Users can top up their wallet balance via KHQR (Custom amount or preset buttons $1, $5, $10, $20).
   * If a user has sufficient wallet balance, clicking **"ទិញ (Buy Now)"** displays a confirmation dialog and completes the purchase **instantly without requiring any QR code scan**.
2. **PayLinkAPI Bakong KHQR Integration**:
   * Dynamic KHQR string generated via PayLinkAPI (`https://api.paylinkapi.online`).
   * Ultra-fast QR rendering using a preloaded image mechanism (0-second wait modal opening).
   * **1-Minute Countdown & Expiry**: Visual timer expires after 60 seconds and blurs QR to protect against stale payments.
   * **Atomic Concurrency Locks**: Uses `completedOrdersLock` and `inFlightChecks` to prevent double-crediting or duplicate key deliveries.

---

### 5. Automated License Key Delivery & Notifications
* **Celebration Modal**: Confetti animation, sound-effect visual, copyable license key box, and direct button to join the VIP Telegram Group.
* **Telegram Bot DM**: The bot automatically delivers the assigned license key, VIP group invite link, and receipt breakdown directly to the buyer's Telegram private chat.
* **Admin Group Broadcast**: Payment and wallet purchase summaries are logged to the Admin Group for real-time order auditing.

---

### 6. Full Admin Control Suite (Mini App & Telegram Bot)
* **Access Control**: Restricted to authorized Admin IDs (`6805487598`, `7283817695`).
* **Product Management**: Add, edit, delete products with local image upload & client-side compression (JPG, PNG, WEBP).
* **Category Management**: Full CRUD for categories with real-time UI synchronization.
* **Inventory & Key Stocking**: View total stock and per-tier keys; restock keys for specific tiers via simple interactive prompt.
* **Broadcast Announcements**: Send text or photo broadcasts to all users who have started the Telegram bot.
* **Live Statistics Dashboard**: Total members, products, successful orders, and gross revenue.

---

## 📁 Repository Structure

```
.
├── start.js               # Unified runner: starts Express, Bot, Cloudflare Tunnel & updates Menu Button
├── server.js              # Express REST API, PayLinkAPI webhooks, payment verification, image uploads
├── bot.js                 # Telegram Bot polling, commands (/start, /admin), reseller callbacks
├── tunnel-config.yml      # Cloudflare named tunnel configuration for production domain
├── package.json           # Dependencies and startup scripts
├── .env                   # Environment variables and API credentials
│
├── data/
│   ├── db.js              # Persistence layer abstraction (atomic reads/writes, products, orders, users)
│   └── database.json      # File-based JSON database (stores products, tiers, keys, orders, users)
│
├── public/
│   ├── index.html         # Mini App single-page application structure & modals
│   ├── css/
│   │   └── style.css      # Core styles, glassmorphism, tier duration pills, animations
│   ├── js/
│   │   └── app.js         # Client state management, Telegram WebApp SDK, payment polling, admin logic
│   ├── assets/            # Static images (logo.jpg, placeholders)
│   └── uploads/           # Uploaded product and broadcast images
```

---

## ⚙️ Environment Configuration (`.env`)

| Variable | Description |
| :--- | :--- |
| `PORT` | Local web server port (default: `5000`) |
| `BOT_TOKEN` | Telegram Bot API token from `@BotFather` |
| `ADMIN_IDS` | Comma-separated list of Telegram Admin IDs (`6805487598,7283817695`) |
| `GROUP_ID` | Telegram Group ID for order alerts and reseller approvals (`-1003942921012`) |
| `WEBAPP_URL` | Production or tunnel URL of the Mini App (`https://astorrios.bymebank.xyz`) |
| `PAYLINK_API_KEY`| Bearer token for PayLinkAPI KHQR generation and payment checking |
| `PAYLINK_BASE_URL`| PayLinkAPI base endpoint (`https://api.paylinkapi.online`) |

---

## 🚀 Running the Project

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **cloudflared**: Windows binary (`cloudflared.exe`) present in root for named tunnel routing.

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Start the unified server (Express + Bot + Tunnel)
node start.js
```

> **Note for AI Assistants**: The user prefers to start `node start.js` manually in their terminal. Do not run `node start.js` automatically unless explicitly instructed.

---

## 📡 REST API Summary

### Public / User Endpoints
* `GET /api/products` — Retrieve all active products with stock counts and tiers.
* `GET /api/categories` — List available categories.
* `GET /api/user-profile?telegramId=...` — Retrieve user balance, order history, and reseller status.
* `POST /api/create-payment` — Generate dynamic KHQR payment with PayLinkAPI (`productId`, `tierId`, or `customAmount`).
* `POST /api/check-payment` — Check payment status via PayLinkAPI with atomic order fulfillment.
* `POST /api/purchase-with-wallet` — Instant checkout using user's wallet balance (`productId`, `tierId`).
* `POST /api/request-reseller` — Submit request for VIP Reseller status.

### Admin Endpoints (Requires `x-admin-id` & `x-admin-auth: true`)
* `POST /api/admin/products` — Create a new product (supports single price or `tiers` array).
* `PUT /api/admin/products/:id` — Update product details, prices, or duration tiers.
* `DELETE /api/admin/products/:id` — Remove product.
* `POST /api/admin/products/:id/keys` — Append license keys to single product.
* `POST /api/admin/products/:id/tier-keys` — Append license keys to a specific tier (`tierId`, `keys`).
* `GET /api/admin/categories` — View categories.
* `POST /api/admin/categories` — Add category.
* `PUT /api/admin/categories` — Rename category.
* `DELETE /api/admin/categories` — Delete category.
* `GET /api/admin/resellers` — List all approved resellers.
* `POST /api/admin/resellers/:id/revoke` — Revoke reseller status.
* `POST /api/admin/broadcast` — Broadcast message or photo to all bot users.
* `GET /api/admin/stats` — Retrieve overall store revenue and transaction statistics.
* `POST /api/upload` — Upload product images directly from PC or mobile gallery.

---

## 📌 Critical Design & Architecture Guidelines

1. **Strict Zero-Emoji Rule**: Never insert unicode emojis into the Mini App frontend HTML or client JS. Use clean inline SVG vector icons exclusively.
2. **Contact & Social Links**:
   * Admin Telegram Contact: `https://t.me/Yur1Uchiha` (`@Yur1Uchiha`)
   * Official News Channel: `http://t.me/rosangkornews`
3. **Independence of Base Price & Tier Prices**: A product's base price (`product.price`) and individual duration tier prices (`tier.price`) are completely independent. Base price is never overridden by tier prices. In the product detail modal, the top price shows the product's base price (e.g. $0.00), while selecting duration tiers dynamically updates the duration total bar and Buy button.
4. **Double-Fulfillment Safety**: When making modifications to order completion, always preserve the atomic locks `completedOrdersLock` and `inFlightChecks` in `server.js` to prevent duplicate license key delivery.
5. **Data Integrity**: Database reads and writes must pass through `data/db.js` helper methods to ensure atomic persistence to `data/database.json`.
