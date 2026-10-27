require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./data/db');

const app = express();
const PORT = process.env.PORT || 5000;
const PAYLINK_BASE_URL = process.env.PAYLINK_BASE_URL || 'https://paylinkapi-bot.onrender.com';
const PAYLINK_API_KEY = process.env.PAYLINK_API_KEY;
const ADMIN_IDS = (process.env.ADMIN_IDS || '6805487598,7283817695').split(',').map(id => id.trim());

// Ensure public uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Prevent aggressive caching in Telegram WebApp & browsers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Lightweight ping/health endpoint for UptimeRobot 24/7 keep-alive
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.get('/ping', (req, res) => res.send('pong'));

function saveBase64Image(dataUrl, prefix = 'prod') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    let ext = 'jpg';
    let dataBuffer;
    if (matches && matches.length === 3) {
      ext = matches[1].replace('jpeg', 'jpg');
      dataBuffer = Buffer.from(matches[2], 'base64');
    } else {
      dataBuffer = Buffer.from(dataUrl, 'base64');
    }
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const savePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(savePath, dataBuffer);
    console.log(`[Upload Auto] Saved base64 image: /uploads/${filename}`);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to save base64 image:', err);
    return dataUrl;
  }
}

// Reference to telegram bot instance (attached when bot starts)
let telegramBot = null;
function setBotInstance(bot) {
  telegramBot = bot;
}

// -------------------------------------------------------------
// Public Endpoints
// -------------------------------------------------------------

// Get Products Catalog
app.get('/api/products', (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const products = db.getProducts().map(p => ({
      ...p,
      stockCount: Array.isArray(p.keys) ? p.keys.length : 0,
      inStock: Array.isArray(p.keys) && p.keys.length > 0
    }));
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Single Product
app.get('/api/products/:id', (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const product = db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({
      success: true,
      product: {
        ...product,
        stockCount: Array.isArray(product.keys) ? product.keys.length : 0,
        inStock: Array.isArray(product.keys) && product.keys.length > 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Purchase Product Directly Using Wallet Balance (No QR required)
app.post('/api/purchase-with-wallet', async (req, res) => {
  try {
    const { productId, telegramId, tierId, quantity } = req.body;
    if (!productId || !telegramId) {
      return res.status(400).json({ success: false, error: 'Product ID and Telegram ID are required' });
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const result = db.purchaseWithBalance(telegramId, productId, tierId, qty);
    if (!result.success) {
      return res.status(400).json(result);
    }

    console.log(`[Wallet Purchase] User ${telegramId} purchased ${result.productName} for $${result.amount}`);

    // Send instant telegram delivery to customer
    if (telegramBot && telegramId) {
      try {
        const keysListHtml = (Array.isArray(result.assignedKeys) && result.assignedKeys.length > 1)
          ? `🔑 <b>License Keys VIP (${result.assignedKeys.length} Keys)៖</b>\n${result.assignedKeys.map((k, i) => `Key #${i + 1}: <code>${k}</code>`).join('\n')}`
          : `🔑 <b>License Key VIP៖</b>\n<code>${result.assignedKey || 'N/A'}</code>`;

        const deliveryMessage = `
🎉 <b>ការទិញទំនិញជោគជ័យ! / PURCHASE COMPLETED!</b>
━━━━━━━━━━━━━━━━━━━━━
🌟 <b>ហាង៖</b> AstorrIOS STORE
💳 <b>ទូទាត់តាម៖</b> សមតុល្យកាបូប (Wallet Balance)
📦 <b>ទំនិញ៖</b> ${result.productName}
💵 <b>កាត់ប្រាក់៖</b> -$${result.amount.toFixed(2)} USD
💰 <b>សមតុល្យនៅសល់៖</b> $${result.remainingBalance.toFixed(2)} USD
${keysListHtml}

👥 <b>ចូលរួមគ្រុប VIP៖</b>
👉 <a href="${result.groupLink}">ចុចទីនេះដើម្បីចូលគ្រុប VIP</a>
━━━━━━━━━━━━━━━━━━━━━
💬 បើមានបញ្ហា សូមទាក់ទង Admin: @AstorrIOS
សូមអរគុណសម្រាប់ការគាំទ្រ <b>AstorrIOS</b>! ⚡
        `;
        const replyButtons = [
          [{ text: '👥 ចូលរួមគ្រុប VIP', url: result.groupLink }],
          [{ text: '💬 ទាក់ទង Admin', url: 'https://t.me/AstorrIOS' }]
        ];

        telegramBot.sendMessage(telegramId, deliveryMessage, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: replyButtons }
        }).catch(err => console.error('TG user notify error:', err.message));

        // Group Alert
        const GROUP_ID = process.env.GROUP_ID || '-1003942921012';
        if (GROUP_ID) {
          const keysAlertHtml = (Array.isArray(result.assignedKeys) && result.assignedKeys.length > 1)
            ? `🔑 <b>Keys បានចេញ (${result.assignedKeys.length} Keys)៖</b>\n${result.assignedKeys.map((k, i) => `Key #${i + 1}: <code>${k}</code>`).join('\n')}\n`
            : `🔑 <b>Key បានចេញ៖</b> <code>${result.assignedKey}</code>\n`;

          const groupAlert = `
🔔 <b>ការទិញជោគជ័យតាមកាបូប! / NEW WALLET PURCHASE</b>
━━━━━━━━━━━━━━━━━━━━━
📦 <b>ទំនិញ៖</b> ${result.productName}
💵 <b>តម្លៃ៖</b> $${result.amount.toFixed(2)} USD
${keysAlertHtml}👤 <b>អតិថិជន TG ID៖</b> <code>${telegramId}</code>
💰 <b>សមតុល្យនៅសល់៖</b> $${result.remainingBalance.toFixed(2)} USD
━━━━━━━━━━━━━━━━━━━━━
⚡ <b>AstorrIOS STORE — Wallet System</b>
          `;
          telegramBot.sendMessage(GROUP_ID, groupAlert, { parse_mode: 'HTML' }).catch(err => console.error('Group alert error:', err.message));
        }
      } catch (e) {
        console.error('Error dispatching telegram message for wallet purchase:', e);
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Purchase with wallet error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Payment (Generates live KHQR via PayLinkAPI)
app.post('/api/create-payment', async (req, res) => {
  try {
    const { productId, telegramId, tierId, customAmount, notes } = req.body;
    let amount = 0;
    let productName = 'AstorrIOS Store Credit';
    let groupLink = 'https://t.me/+AstorrIOS_VIP_Group';
    let selectedTierId = null;
    let selectedTierName = null;

    if (productId) {
      const product = db.getProductById(productId);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

      const user = telegramId ? db.getUser(telegramId) : null;
      const isReseller = !!(user && user.isReseller);
      const quantity = Math.max(1, parseInt(req.body.quantity) || 1);
      const isBuyingTier = tierId && tierId !== 'base' && tierId !== 'null' && Array.isArray(product.tiers) && product.tiers.length > 0;

      if (isBuyingTier) {
        const tier = product.tiers.find(t => t.id === tierId);
        if (!tier) return res.status(400).json({ success: false, error: 'រយៈពេល/Tier មិនត្រឹមត្រូវ' });
        const availableKeys = Array.isArray(tier.keys) ? tier.keys.length : 0;
        if (availableKeys < quantity) {
          return res.status(400).json({ success: false, error: `រយៈពេល "${tier.name}" នេះមានស្តុកមិនគ្រប់គ្រាន់ទេ` });
        }
        selectedTierId = tier.id;
        selectedTierName = tier.name;
        const hasTierResellerPrice = tier.resellerPrice !== undefined && parseFloat(tier.resellerPrice) > 0;
        const unitPrice = (isReseller && hasTierResellerPrice) ? parseFloat(tier.resellerPrice) : parseFloat(tier.price);
        amount = parseFloat((unitPrice * quantity).toFixed(2));
        productName = `${product.name} (${tier.name})` + (quantity > 1 ? ` x${quantity}` : '') + (isReseller && hasTierResellerPrice ? ' (VIP Reseller)' : '');
      } else {
        // Buying base product (e.g. $12.00 product)
        const availableKeys = Array.isArray(product.keys) ? product.keys.length : 0;
        if (availableKeys < quantity) {
          return res.status(400).json({ success: false, error: 'ទំនិញនេះមានស្តុកមិនគ្រប់គ្រាន់ទេ' });
        }
        const hasResellerPrice = product.resellerPrice !== undefined && parseFloat(product.resellerPrice) > 0;
        const unitPrice = (isReseller && hasResellerPrice) ? parseFloat(product.resellerPrice) : parseFloat(product.price);
        amount = parseFloat((unitPrice * quantity).toFixed(2));
        productName = `${product.name}` + (quantity > 1 ? ` x${quantity}` : '') + (isReseller && hasResellerPrice ? ' (VIP Reseller)' : '');
      }

      groupLink = product.groupLink || groupLink;
    } else if (customAmount) {
      amount = parseFloat(customAmount);
      productName = 'Top-Up Wallet $' + amount.toFixed(2);
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    console.log(`[PayLinkAPI] Requesting KHQR generation for: $${amount} (${productName})`);

    const settings = (db.getSettings ? db.getSettings() : {}) || {};
    const merchantName = process.env.MERCHANT_NAME || settings.merchantName || settings.storeName || 'AstorrIOS STORE';

    // Call PayLinkAPI generate-qr (with customized merchant name)
    const response = await fetch(`${PAYLINK_BASE_URL}/api/payment/generate-qr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYLINK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'USD',
        merchantName: merchantName
      })
    });

    const data = await response.json();
    console.log('[PayLinkAPI] Generation response:', data);

    if (!data.success && !data.qrString) {
      return res.status(500).json({ success: false, error: data.message || 'Payment generation failed' });
    }

    // Save pending order
    const order = db.createOrder({
      telegramId: telegramId || null,
      productId: productId || null,
      tierId: selectedTierId,
      tierName: selectedTierName,
      productName,
      quantity: Math.max(1, parseInt(req.body.quantity) || 1),
      amount,
      tranId: data.tranId || data.transactionId,
      md5: data.md5,
      qrString: data.qrString,
      groupLink
    });

    res.json({
      success: true,
      orderId: order.id,
      tranId: data.tranId || data.transactionId,
      md5: data.md5,
      qrString: data.qrString,
      amount: amount.toFixed(2),
      currency: data.currency || 'USD',
      deepLink: data.deepLink || data.deeplink,
      productName,
      productId: productId || null,
      tierId: selectedTierId || null,
      quantity: Math.max(1, parseInt(req.body.quantity) || 1),
      customAmount: customAmount ? parseFloat(customAmount) : null
    });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// In-memory atomic lock to guarantee 100% single notification dispatch
const completedOrdersLock = new Set();
const inFlightChecks = new Set();
const notifiedAlerts = new Set();

// Check Payment Status (Calls PayLinkAPI and auto-delivers key)
app.post('/api/check-payment', async (req, res) => {
  const { tranId, md5, orderId } = req.body;
  if (!tranId && !md5) {
    return res.status(400).json({ success: false, error: 'tranId or md5 is required' });
  }

  // Fast-path 1: Check memory lock or database status
  if (completedOrdersLock.has(tranId)) {
    const existingOrder = db.getOrderByTranId(tranId, md5);
    return res.json({
      success: true,
      paid: true,
      status: 'PAID',
      order: existingOrder,
      assignedKey: existingOrder ? existingOrder.assignedKey : null,
      assignedKeys: existingOrder ? (existingOrder.assignedKeys || (existingOrder.assignedKey ? [existingOrder.assignedKey] : [])) : [],
      groupLink: existingOrder ? existingOrder.groupLink : null,
      productName: existingOrder ? existingOrder.productName : null
    });
  }

  const existingOrder = db.getOrderByTranId(tranId, md5);
  if (existingOrder && existingOrder.status === 'PAID') {
    completedOrdersLock.add(tranId);
    return res.json({
      success: true,
      paid: true,
      status: 'PAID',
      order: existingOrder,
      assignedKey: existingOrder.assignedKey,
      assignedKeys: existingOrder.assignedKeys || (existingOrder.assignedKey ? [existingOrder.assignedKey] : []),
      groupLink: existingOrder.groupLink,
      productName: existingOrder.productName
    });
  }

  // Fast-path 2: Prevent overlapping concurrent in-flight checks for same transaction
  if (inFlightChecks.has(tranId)) {
    return res.json({
      success: true,
      paid: false,
      status: 'PENDING'
    });
  }

  inFlightChecks.add(tranId);

  try {
    // Call PayLinkAPI check with API Key authentication
    let result = null;
    let isPaid = false;

    try {
      const response = await fetch(`${PAYLINK_BASE_URL}/api/payment/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYLINK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tranId, md5 })
      });
      result = await response.json().catch(() => null);
      if (result) {
        isPaid = result.status === 'PAID' || result.paid === true || result.status === 'SUCCESS';
      }
    } catch (errCheck) {
      console.warn(`[PayLinkAPI] Primary check error (${tranId}):`, errCheck.message);
    }

    // Secondary Fallback Check: /api/bakong/check-payment if primary check is still pending
    if (!isPaid && (md5 || tranId)) {
      try {
        const bakongRes = await fetch(`${PAYLINK_BASE_URL}/api/bakong/check-payment`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PAYLINK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tranId, md5 })
        });
        const bakongData = await bakongRes.json().catch(() => null);
        if (bakongData && (bakongData.status === 'PAID' || bakongData.paid === true || bakongData.status === 'SUCCESS')) {
          result = bakongData;
          isPaid = true;
        }
      } catch (errBakong) {
        console.warn(`[PayLinkAPI] Bakong fallback check error:`, errBakong.message);
      }
    }

    console.log(`[PayLinkAPI] Check status (${tranId}):`, result, `isPaid: ${isPaid}`);

    if (isPaid) {
      // Re-check lock right before execution
      if (completedOrdersLock.has(tranId)) {
        const completedOrder = db.getOrderByTranId(tranId, md5);
        return res.json({
          success: true,
          paid: true,
          status: 'PAID',
          order: completedOrder,
          assignedKey: completedOrder ? completedOrder.assignedKey : null,
          assignedKeys: completedOrder ? (completedOrder.assignedKeys || (completedOrder.assignedKey ? [completedOrder.assignedKey] : [])) : [],
          groupLink: completedOrder ? completedOrder.groupLink : null,
          productName: completedOrder ? completedOrder.productName : null
        });
      }

      // ATOMIC LOCK: Immediately acquire lock so no other request can enter
      completedOrdersLock.add(tranId);

      const completedOrder = db.completeOrder(tranId, md5);
      console.log('Order completed successfully (Dispatched Once):', completedOrder?.id);

      // Send telegram notifications ONLY ONCE
      const orderTranId = (completedOrder && completedOrder.tranId) ? completedOrder.tranId : tranId;
      if (telegramBot && completedOrder && !completedOrder.notified && !notifiedAlerts.has(orderTranId)) {
        notifiedAlerts.add(orderTranId);
        completedOrder.notified = true;
        db.markOrderNotified(orderTranId, md5);

        const isProductPurchase = !!completedOrder.productId;

        // 1. Notify Customer
        if (completedOrder.telegramId) {
          try {
            let deliveryMessage = '';
            let replyButtons = [];

            if (isProductPurchase) {
              const keysListHtml = (Array.isArray(completedOrder.assignedKeys) && completedOrder.assignedKeys.length > 1)
                ? `🔑 <b>License Keys VIP (${completedOrder.assignedKeys.length} Keys)៖</b>\n${completedOrder.assignedKeys.map((k, i) => `Key #${i + 1}: <code>${k}</code>`).join('\n')}`
                : `🔑 <b>License Key VIP៖</b>\n<code>${completedOrder.assignedKey || 'N/A'}</code>`;

              deliveryMessage = `
🎉 <b>ការទូទាត់ទទួលបានជោគជ័យ! / PAYMENT RECEIVED!</b>
━━━━━━━━━━━━━━━━━━━━━
🌟 <b>ហាង៖</b> AstorrIOS STORE
📦 <b>ទំនិញ៖</b> ${completedOrder.productName}
💵 <b>តម្លៃ៖</b> $${completedOrder.amount.toFixed(2)} USD
${keysListHtml}

👥 <b>ចូលរួមគ្រុប VIP៖</b>
👉 <a href="${completedOrder.groupLink || 'https://t.me/rosangkornews'}">ចុចទីនេះដើម្បីចូលគ្រុប VIP</a>
━━━━━━━━━━━━━━━━━━━━━
💬 បើមានបញ្ហា សូមទាក់ទង Admin: @AstorrIOS
សូមអរគុណសម្រាប់ការគាំទ្រ <b>AstorrIOS</b>! ⚡
              `;
              replyButtons = [
                [{ text: '👥 ចូលរួមគ្រុប VIP', url: completedOrder.groupLink || 'https://t.me/rosangkornews' }],
                [{ text: '💬 ទាក់ទង Admin', url: 'https://t.me/AstorrIOS' }]
              ];
            } else {
              // Top-Up Wallet
              const currentUser = db.getUser(completedOrder.telegramId);
              const balanceText = currentUser ? `$${(currentUser.balance || 0).toFixed(2)} USD` : `$${completedOrder.amount.toFixed(2)} USD`;
              deliveryMessage = `
🎉 <b>បញ្ចូលទឹកប្រាក់ជោគជ័យ! / TOP-UP COMPLETED!</b>
━━━━━━━━━━━━━━━━━━━━━
🌟 <b>ហាង៖</b> AstorrIOS STORE
💳 <b>ប្រភេទ៖</b> បញ្ចូលសមតុល្យកាបូប (Wallet Deposit)
💵 <b>ទឹកប្រាក់បានបញ្ចូល៖</b> +$${completedOrder.amount.toFixed(2)} USD
💰 <b>សមតុល្យបច្ចុប្បន្ន៖</b> ${balanceText}
━━━━━━━━━━━━━━━━━━━━━
✨ ទឹកប្រាក់ត្រូវបានបញ្ចូលទៅក្នុងគណនីរបស់អ្នករួចរាល់ហើយ! អ្នកអាចប្រើប្រាស់ដើម្បីទិញទំនិញ VIP បានភ្លាមៗ។
              `;
              replyButtons = [
                [{ text: '🚀 🎮 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 ⚡️ ✨', web_app: { url: process.env.WEBAPP_URL || 'https://astorrios.bymebank.xyz' } }],
                [{ text: '💬 👑 ទាក់ទង Admin', url: 'https://t.me/AstorrIOS' }]
              ];
            }

            telegramBot.sendMessage(completedOrder.telegramId, deliveryMessage, {
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: replyButtons }
            }).catch(err => console.error('Failed to notify user on TG:', err.message));
          } catch (e) {
            console.error('Error dispatching telegram message:', e);
          }
        }

        // 2. Alert Admin Group (Sent ONLY ONCE)
        const GROUP_ID = process.env.GROUP_ID || '-1003942921012';
        if (GROUP_ID) {
          const keysAlertHtml = (Array.isArray(completedOrder.assignedKeys) && completedOrder.assignedKeys.length > 1)
            ? `🔑 <b>Keys បានចេញ (${completedOrder.assignedKeys.length} Keys)៖</b>\n${completedOrder.assignedKeys.map((k, i) => `Key #${i + 1}: <code>${k}</code>`).join('\n')}\n`
            : `🔑 <b>Key បានចេញ៖</b> <code>${completedOrder.assignedKey}</code>\n`;

          const groupAlert = `
🔔 <b>ការទូទាត់ជោគជ័យថ្មី! / NEW PAYMENT ALERT</b>
━━━━━━━━━━━━━━━━━━━━━
${isProductPurchase ? `📦 <b>ទំនិញ៖</b> ${completedOrder.productName}` : `💳 <b>ប្រតិបត្តិការ៖</b> បញ្ចូលទឹកប្រាក់កាបូប (Top-Up)`}
💵 <b>ចំនួនទឹកប្រាក់៖</b> $${completedOrder.amount.toFixed(2)} USD
${isProductPurchase ? keysAlertHtml : ''}👤 <b>អតិថិជន TG ID៖</b> <code>${completedOrder.telegramId || 'WebApp User'}</code>
🧾 <b>Transaction ID៖</b> <code>${completedOrder.tranId}</code>
━━━━━━━━━━━━━━━━━━━━━
⚡ <b>AstorrIOS STORE — Auto Clearing System</b>
          `;
          telegramBot.sendMessage(GROUP_ID, groupAlert, { parse_mode: 'HTML' }).catch(err => console.error('Group alert error:', err.message));
        }
      }

      return res.json({
        success: true,
        paid: true,
        status: 'PAID',
        order: completedOrder,
        assignedKey: completedOrder ? completedOrder.assignedKey : null,
        assignedKeys: completedOrder ? (completedOrder.assignedKeys || (completedOrder.assignedKey ? [completedOrder.assignedKey] : [])) : [],
        groupLink: completedOrder ? completedOrder.groupLink : null,
        productName: completedOrder ? completedOrder.productName : null
      });
    }

    res.json({
      success: true,
      paid: false,
      status: result.status || 'PENDING'
    });
  } catch (err) {
    console.error('Check payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    inFlightChecks.delete(tranId);
  }
});

// Get User Profile & Orders
app.get('/api/user/:telegramId', (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const user = db.getUser(req.params.telegramId) || { id: req.params.telegramId, balance: 0, isReseller: false, resellerStatus: 'none' };
    const orders = db.getUserOrders(req.params.telegramId);
    const isAdmin = ADMIN_IDS.includes(String(req.params.telegramId));
    res.json({
      success: true,
      user,
      orders,
      isAdmin,
      isReseller: !!user.isReseller,
      resellerStatus: user.resellerStatus || 'none'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Request Reseller Status (Mini App User -> Admin Group notification with Accept & Cancel buttons)
app.post('/api/request-reseller', async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) {
      return res.status(400).json({ success: false, error: 'Telegram ID is required' });
    }

    let user = db.getUser(telegramId);
    if (!user) {
      user = db.saveUser({ id: telegramId, firstName: 'Customer' });
    }

    if (user.isReseller) {
      return res.json({
        success: true,
        alreadyReseller: true,
        message: 'លោកអ្នកជា VIP Reseller រួចរាល់ហើយ! (You are already a VIP Reseller)'
      });
    }

    if (user.resellerStatus === 'pending') {
      return res.json({
        success: true,
        alreadyPending: true,
        message: 'សំណើរបស់អ្នកបានផ្ញើរួចហើយ សូមរង់ចាំ Admin ពិនិត្យអនុម័ត (Approval Pending)'
      });
    }

    // Set status to pending in DB
    db.setResellerStatus(telegramId, 'pending');

    // Send Alert to Admin Telegram Group with Accept and Cancel buttons
    const GROUP_ID = process.env.GROUP_ID || '-1003942921012';
    if (telegramBot && GROUP_ID) {
      const alertMsg = `
👑 <b>សំណើសុំធ្វើជា RESELLER ថ្មី! / NEW RESELLER REQUEST</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>ឈ្មោះ៖</b> ${user.firstName || 'Customer'} ${user.lastName || ''}
🆔 <b>Telegram ID៖</b> <code>${telegramId}</code>
🔗 <b>Username៖</b> ${user.username ? '@' + user.username : 'គ្មាន (No Username)'}
💰 <b>សមតុល្យកាបូប៖</b> $${(user.balance || 0).toFixed(2)} USD
📅 <b>កាលបរិច្ឆេទ៖</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })}
━━━━━━━━━━━━━━━━━━━━━
⚡ <b>Admin Action៖</b> សូមជ្រើសរើសដើម្បីអនុម័ត ឬបដិសេធសំណើនេះ៖
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ អនុម័ត (Accept)', callback_data: `reseller_accept_${telegramId}` },
            { text: '❌ Cancel Request', callback_data: `reseller_reject_${telegramId}` }
          ]
        ]
      };

      telegramBot.sendMessage(GROUP_ID, alertMsg, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      }).catch(err => console.error('Group alert for reseller request error:', err.message));
    }

    res.json({
      success: true,
      message: 'សំណើសុំធ្វើជា Reseller ត្រូវបានផ្ញើជូន Admin រួចរាល់ហើយ!'
    });
  } catch (err) {
    console.error('Reseller request error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Admin Endpoints
// -------------------------------------------------------------

// Admin Authentication Middleware
function checkAdmin(req, res, next) {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  const isAuth = req.headers['x-admin-auth'] === 'true' || req.query.admin === 'true';
  if (isAuth || (adminId && ADMIN_IDS.includes(String(adminId)))) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Unauthorized: Admin access only' });
}

// Upload Image (Base64 from Phone Gallery or PC Folder)
app.post('/api/upload-image', checkAdmin, (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    let ext = 'jpg';
    let dataBuffer;

    if (matches && matches.length === 3) {
      ext = matches[1].replace('jpeg', 'jpg');
      dataBuffer = Buffer.from(matches[2], 'base64');
    } else {
      dataBuffer = Buffer.from(imageBase64, 'base64');
    }

    const safeName = `astorr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const savePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(savePath, dataBuffer);

    const publicUrl = `/uploads/${safeName}`;
    console.log(`[Upload] Image saved: ${publicUrl}`);
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add New Product
app.post('/api/admin/products', checkAdmin, (req, res) => {
  try {
    const { name, category, platform, price, resellerPrice, description, image, groupLink, keys, badge, tag, tiers } = req.body;
    if (!name || (!tiers && !price)) {
      return res.status(400).json({ success: false, error: 'Name and price/tiers are required' });
    }

    const savedImage = saveBase64Image(image);

    const newProduct = db.addProduct({
      name,
      category: category || 'VIP MOD',
      platform: platform || 'iOS & Android',
      price: price ? parseFloat(price) : 0,
      resellerPrice: (resellerPrice !== undefined && resellerPrice !== '') ? parseFloat(resellerPrice) : 0,
      description: description || '',
      image: savedImage || '/assets/logo.jpg',
      groupLink: groupLink || 'https://t.me/+AstorrIOS_VIP_Group',
      keys: keys || [],
      badge: badge || 'រហ័ស (Instant)',
      tag: tag || 'VIP MOD',
      tiers: tiers || []
    });

    res.json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Product
app.put('/api/admin/products/:id', checkAdmin, (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.image) {
      updates.image = saveBase64Image(updates.image);
    }
    if (updates.price !== undefined) {
      updates.price = parseFloat(updates.price);
    }
    if (updates.resellerPrice !== undefined) {
      updates.resellerPrice = (updates.resellerPrice !== '' && !isNaN(parseFloat(updates.resellerPrice)))
        ? parseFloat(updates.resellerPrice)
        : 0;
    }
    const updated = db.updateProduct(req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Product
app.delete('/api/admin/products/:id', checkAdmin, (req, res) => {
  try {
    const ok = db.deleteProduct(req.params.id);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Category Management Endpoints
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/categories', checkAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Category name required' });
    const categories = db.addCategory(name);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/categories', checkAdmin, (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ success: false, error: 'Both old and new names required' });
    const categories = db.updateCategory(oldName, newName);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/categories', checkAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Category name required' });
    const categories = db.deleteCategory(name);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add Stock Keys to Product
app.post('/api/admin/products/:id/keys', checkAdmin, (req, res) => {
  try {
    const { keys, tierId } = req.body;
    if (tierId) {
      const result = db.addKeysToTier(req.params.id, tierId, keys);
      if (!result) return res.status(404).json({ success: false, error: 'Product or tier not found' });
      return res.json({ success: true, product: result.product, tier: result.tier });
    }
    const product = db.addKeysToProduct(req.params.id, keys);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add Stock Keys to Specific Tier
app.post('/api/admin/products/:id/tier-keys', checkAdmin, (req, res) => {
  try {
    const { tierId, keys } = req.body;
    if (!tierId || !keys) return res.status(400).json({ success: false, error: 'Tier ID and keys required' });
    const result = db.addKeysToTier(req.params.id, tierId, keys);
    if (!result) return res.status(404).json({ success: false, error: 'Product or tier not found' });
    res.json({ success: true, product: result.product, tier: result.tier });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Broadcast to All Users
app.post('/api/admin/broadcast', checkAdmin, async (req, res) => {
  try {
    const { message, photoUrl } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message cannot be empty' });

    const allUsers = db.getAllUsers();
    let sentCount = 0;
    let failedCount = 0;

    if (telegramBot) {
      for (const user of allUsers) {
        try {
          if (photoUrl) {
            await telegramBot.sendPhoto(user.id, photoUrl, {
              caption: message,
              parse_mode: 'HTML'
            });
          } else {
            await telegramBot.sendMessage(user.id, message, {
              parse_mode: 'HTML'
            });
          }
          sentCount++;
        } catch (e) {
          failedCount++;
        }
      }
    }

    res.json({
      success: true,
      totalUsers: allUsers.length,
      sentCount,
      failedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Stats
app.get('/api/admin/stats', checkAdmin, (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Reseller Management Endpoints
app.get('/api/admin/resellers', checkAdmin, (req, res) => {
  try {
    const resellers = db.getResellerUsers();
    res.json({ success: true, resellers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/remove-reseller', checkAdmin, async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ success: false, error: 'Telegram ID is required' });

    const updatedUser = db.removeReseller(telegramId);

    // Notify user via Telegram Bot
    if (telegramBot && telegramId) {
      try {
        const revokeMsg = `
⚠️ <b>សេចក្តីជូនដំណឹងអំពីគណនី Reseller</b>
━━━━━━━━━━━━━━━━━━━━━
សួស្តី! Admin បានដកសិទ្ធិ (Revoke) គណនី <b>VIP Reseller</b> របស់អ្នករួចរាល់ហើយ។
ចាប់ពីពេលនេះទៅ តម្លៃទំនិញក្នុងគណនីរបស់អ្នកនឹងត្រឡប់មកតម្លៃធម្មតាវិញ។
━━━━━━━━━━━━━━━━━━━━━
💬 ប្រសិនបើមានចម្ងល់ សូមទាក់ទង Admin: @AstorrIOS
        `;
        telegramBot.sendMessage(telegramId, revokeMsg, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 👑 ទាក់ទង Admin (@AstorrIOS)', url: 'https://t.me/AstorrIOS' }],
              [{ text: '🚀 🎮 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 ⚡️ ✨', web_app: { url: process.env.WEBAPP_URL || 'https://astorrios.bymebank.xyz' } }]
            ]
          }
        }).catch(err => console.error('Revoke notice TG error:', err.message));
      } catch (e) {}
    }

    res.json({ success: true, message: 'បានដកសិទ្ធិ Reseller ជោគជ័យ!', user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/approve-reseller', checkAdmin, async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ success: false, error: 'Telegram ID is required' });

    const updatedUser = db.setResellerStatus(telegramId, 'approved');

    // Notify user via Telegram Bot
    if (telegramBot && telegramId) {
      try {
        const userNotice = `
🎉 <b>អបអរសាទរ! សំណើ Reseller របស់អ្នកត្រូវបានអនុម័ត! (APPROVED)</b>
━━━━━━━━━━━━━━━━━━━━━
🌟 គណនីរបស់អ្នកត្រូវបានដំឡើងជា <b>VIP Reseller</b> ផ្លូវការហើយ!
💎 ចាប់ពីពេលនេះទៅ អ្នកនឹងទទួលបានតម្លៃពិសេស (Reseller Price) រាល់មុខទំនិញទាំងអស់ក្នុង AstorrIOS Store!
⚡ រីករាយជាមួយការកុម្ម៉ង់ទំនិញក្នុងតម្លៃទាបបំផុត និងការដឹកជញ្ជូនរហ័ស ២៤/៧!
        `;
        telegramBot.sendMessage(telegramId, userNotice, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 💎 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 (មើលតម្លៃ Reseller) ✨', web_app: { url: process.env.WEBAPP_URL || 'https://astorrios.bymebank.xyz' } }],
              [{ text: '💬 👑 ទាក់ទង Admin', url: 'https://t.me/AstorrIOS' }]
            ]
          }
        }).catch(err => console.error('Approve notice TG error:', err.message));
      } catch (e) {}
    }

    res.json({ success: true, message: 'បានអនុម័តជា Reseller ជោគជ័យ!', user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/reject-reseller', checkAdmin, async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId) return res.status(400).json({ success: false, error: 'Telegram ID is required' });

    const updatedUser = db.setResellerStatus(telegramId, 'rejected');

    // Notify user via Telegram Bot
    if (telegramBot && telegramId) {
      try {
        const userNotice = `
⚠️ <b>សេចក្តីជូនដំណឹងអំពីសំណើសុំធ្វើជា Reseller</b>
━━━━━━━━━━━━━━━━━━━━━
សួស្តី! Admin បាន Cancel/បដិសេធសំណើសុំធ្វើជា Reseller របស់អ្នកក្នុងពេលនេះ។
💬 ប្រសិនបើអ្នកមានចម្ងល់ ឬចង់សាកសួរលក្ខខណ្ឌបន្ថែម សូមទាក់ទង Admin ដោយផ្ទាល់៖
👉 <b>Admin Contact៖</b> @AstorrIOS
        `;
        telegramBot.sendMessage(telegramId, userNotice, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 👑 ទាក់ទង Admin (@AstorrIOS)', url: 'https://t.me/AstorrIOS' }],
              [{ text: '🚀 🎮 𝐎𝐏𝐄𝐍 𝐒𝐓𝐎𝐑𝐄 ⚡️ ✨', web_app: { url: process.env.WEBAPP_URL || 'https://astorrios.bymebank.xyz' } }]
            ]
          }
        }).catch(err => console.error('Reject notice TG error:', err.message));
      } catch (e) {}
    }

    res.json({ success: true, message: 'បានបដិសេធសំណើ Reseller រួចរាល់!', user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function startServer() {
  return app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AstorrIOS Server] Running on http://127.0.0.1:${PORT}`);
  });
}

module.exports = { app, startServer, setBotInstance };

if (require.main === module) {
  startServer();
}
