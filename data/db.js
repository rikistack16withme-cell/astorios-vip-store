const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

const INITIAL_DATA = {
  products: [
    {
      id: "prod_1",
      name: "DRIP WIRE for iOS & Android",
      category: "VIP MOD",
      platform: "iOS & Android",
      price: 0.99,
      badge: "រហ័ស (Instant)",
      tag: "100% Anti-Ban",
      description: "កញ្ចប់ VIP Drip Wire ជំនួយការលេងហ្គេមលំដាប់ខ្ពស់ សុវត្ថិភាព 100% មិនជាប់ Ban ប្រើប្រាស់បានទាំង iOS និង Android។\n• ESP Box & Skeleton\n• Bullet Track\n• Ultra Smooth Performance",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
      groupLink: "https://t.me/+AstorrIOS_VIP_Group",
      keys: [
        "ASTORR-DRIP-9821-XKQW",
        "ASTORR-DRIP-7734-MLPO",
        "ASTORR-DRIP-1102-ZZWQ"
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: "prod_2",
      name: "VPN INTERNET FREE HIGH SPEED",
      category: "VPN FREE",
      platform: "Free Net",
      price: 3.00,
      badge: "រហ័ស (Instant)",
      tag: "High Speed",
      description: "សេវា VPN Free Internet ល្បឿនលឿន កម្រិត VIP ប្រើអ៊ីនធឺណិតគ្មានដែនកំណត់ Ping ទាបសម្រាប់លេងហ្គេម និងទស្សនា 4K។",
      image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80",
      groupLink: "https://t.me/+AstorrIOS_VIP_Group",
      keys: [
        "ASTORR-VPN-3829-FREE-NET",
        "ASTORR-VPN-5541-ULTRA"
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: "prod_3",
      name: "E-Sign IOS Certificate VIP",
      category: "E-SIGN",
      platform: "iOS Only",
      price: 4.00,
      badge: "រហ័ស (Instant)",
      tag: "Anti-Revoke",
      description: "Certificate E-Sign VIP សម្រាប់តម្លើង IPA នៅលើទូរស័ព្ទ iOS គ្មាន Revoke ប្រើបានពេញមួយឆ្នាំ ធានាសុវត្ថិភាពខ្ពស់បំផុត។",
      image: "https://images.unsplash.com/photo-1616469829941-c7200edec809?auto=format&fit=crop&w=600&q=80",
      groupLink: "https://t.me/+AstorrIOS_VIP_Group",
      keys: [
        "ASTORR-ESIGN-CERT-2026-VIP",
        "ASTORR-ESIGN-CERT-9981-LIFETIME"
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: "prod_4",
      name: "VPN VIP GAMING PRO iOS & Android",
      category: "VIP BOOSTER",
      platform: "iOS & Android",
      price: 0.49,
      badge: "រហ័ស (Instant)",
      tag: "Ultra Performance",
      description: "VIP Gaming Network Tool ភ្ជាប់ជាមួយបច្ចេកវិទ្យា VPN ដកដង្ហើមស្រួល កម្រិត VIP Pro Master។",
      image: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=600&q=80",
      groupLink: "https://t.me/+AstorrIOS_VIP_Group",
      keys: [
        "ASTORR-AIM-0019-HEADSHOT",
        "ASTORR-AIM-7721-AUTO"
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: "prod_5",
      name: "XREG VIP SYSTEM OPTIMIZER",
      category: "VIP MOD",
      platform: "iOS & Android",
      price: 1.99,
      badge: "រហ័ស (Instant)",
      tag: "FPS Boost",
      description: "ម៉ូឌូល Regedit XREG កែសម្រួលប្រព័ន្ធទូរស័ព្ទឱ្យរលូន 120 FPS និងឆ្លើយតបរហ័សទាន់ចិត្តពេលបាញ់។",
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
      groupLink: "https://t.me/+AstorrIOS_VIP_Group",
      keys: [
        "ASTORR-XREG-8820-ULTRA"
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: "prod_6",
      name: "AstorrIOS VIP LIFETIME PASS",
      category: "TOOLS",
      platform: "All Devices",
      price: 9.99,
      badge: "Premium VIP",
      tag: "All Access",
      description: "ចូលរួមជាសមាជិក VIP ពេញមួយជីវិត ទទួលបានរាល់ Mod & IPA និងការ Support ផ្ទាល់ជាមួយ Admin 24/7។",
      image: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
      groupLink: "https://t.me/+AstorrIOS_VIP_Group",
      keys: [
        "ASTORR-VIP-PASS-LIFETIME-001"
      ],
      createdAt: new Date().toISOString()
    }
  ],
  categories: ['VIP MOD', 'iOS ONLY', 'ANDROID', 'VPN FREE', 'E-SIGN', 'VIP BOOSTER', 'TOOLS'],
  users: {},
  orders: [],
  settings: {
    storeName: "AstorrIOS STORE",
    adminContact: "https://t.me/AstorrIOS",
    vipGroup: "https://t.me/rosangkornews",
    supportKhmer: "016972470"
  }
};

function readDb() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB:', err);
    return INITIAL_DATA;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

const db = {
  // Products
  getProducts() {
    const data = readDb();
    return data.products || [];
  },

  getProductById(id) {
    const data = readDb();
    return (data.products || []).find(p => p.id === id);
  },

  addProduct(product) {
    const data = readDb();
    if (!data.products) data.products = [];

    let cleanTiers = [];
    if (Array.isArray(product.tiers) && product.tiers.length > 0) {
      cleanTiers = product.tiers.map((t, idx) => ({
        id: t.id || 'tier_' + Date.now() + '_' + idx,
        name: t.name || `Tier ${idx + 1}`,
        price: parseFloat(t.price) || 0.99,
        resellerPrice: (t.resellerPrice !== undefined && t.resellerPrice !== '' && !isNaN(parseFloat(t.resellerPrice)))
          ? parseFloat(t.resellerPrice)
          : 0,
        keys: Array.isArray(t.keys) ? t.keys : (t.keys ? t.keys.split('\n').map(k => k.trim()).filter(Boolean) : [])
      }));
    }

    const hasTiers = cleanTiers.length > 0;
    let basePrice = (product.price !== undefined && product.price !== '' && !isNaN(parseFloat(product.price)))
      ? parseFloat(product.price)
      : 0;
    let baseResellerPrice = (product.resellerPrice !== undefined && product.resellerPrice !== '' && !isNaN(parseFloat(product.resellerPrice)))
      ? parseFloat(product.resellerPrice)
      : 0;

    if (hasTiers && (basePrice === 0 || isNaN(basePrice)) && cleanTiers.length > 0) {
      basePrice = Math.min(...cleanTiers.map(t => t.price));
      const tierResellerPrices = cleanTiers.map(t => t.resellerPrice).filter(rp => rp > 0);
      if (tierResellerPrices.length > 0 && baseResellerPrice === 0) {
        baseResellerPrice = Math.min(...tierResellerPrices);
      }
    }

    const newProduct = {
      id: 'prod_' + Date.now(),
      name: product.name || 'Untitled VIP Mod',
      category: product.category || 'VIP MOD',
      platform: product.platform || 'iOS & Android',
      price: basePrice,
      resellerPrice: baseResellerPrice,
      hasTiers: hasTiers,
      tiers: cleanTiers,
      badge: product.badge || 'រហ័ស (Instant)',
      tag: product.tag || 'VIP MOD',
      description: product.description || '',
      image: product.image || '/assets/logo.jpg',
      groupLink: product.groupLink || data.settings?.vipGroup || 'https://t.me/+AstorrIOS_VIP_Group',
      keys: Array.isArray(product.keys) ? product.keys : (product.keys ? product.keys.split('\n').map(k => k.trim()).filter(Boolean) : []),
      createdAt: new Date().toISOString()
    };
    data.products.unshift(newProduct);
    writeDb(data);
    return newProduct;
  },

  updateProduct(id, updates) {
    const data = readDb();
    const idx = (data.products || []).findIndex(p => p.id === id);
    if (idx === -1) return null;
    const cleanUpdates = { ...updates };

    if (cleanUpdates.tiers !== undefined && Array.isArray(cleanUpdates.tiers)) {
      cleanUpdates.tiers = cleanUpdates.tiers.map((t, idx) => ({
        id: t.id || 'tier_' + Date.now() + '_' + idx,
        name: t.name || `Tier ${idx + 1}`,
        price: parseFloat(t.price) || 0,
        resellerPrice: (t.resellerPrice !== undefined && t.resellerPrice !== '' && !isNaN(parseFloat(t.resellerPrice)))
          ? parseFloat(t.resellerPrice)
          : 0,
        keys: Array.isArray(t.keys) ? t.keys : (t.keys ? t.keys.split('\n').map(k => k.trim()).filter(Boolean) : [])
      }));
      cleanUpdates.hasTiers = cleanUpdates.tiers.length > 0;
      if (cleanUpdates.hasTiers && (!cleanUpdates.price || cleanUpdates.price === 0)) {
        cleanUpdates.price = Math.min(...cleanUpdates.tiers.map(t => t.price));
        const tierResellers = cleanUpdates.tiers.map(t => t.resellerPrice).filter(rp => rp > 0);
        if (tierResellers.length > 0 && (!cleanUpdates.resellerPrice || cleanUpdates.resellerPrice === 0)) {
          cleanUpdates.resellerPrice = Math.min(...tierResellers);
        }
      }
    }

    if (cleanUpdates.price !== undefined) {
      cleanUpdates.price = parseFloat(cleanUpdates.price) || 0;
    }
    if (cleanUpdates.resellerPrice !== undefined) {
      cleanUpdates.resellerPrice = (cleanUpdates.resellerPrice !== '' && !isNaN(parseFloat(cleanUpdates.resellerPrice)))
        ? parseFloat(cleanUpdates.resellerPrice)
        : 0;
    }
    data.products[idx] = { ...data.products[idx], ...cleanUpdates };
    writeDb(data);
    return data.products[idx];
  },

  deleteProduct(id) {
    const data = readDb();
    data.products = (data.products || []).filter(p => p.id !== id);
    writeDb(data);
    return true;
  },

  addKeysToProduct(id, newKeys) {
    const data = readDb();
    const product = (data.products || []).find(p => p.id === id);
    if (!product) return null;
    if (!Array.isArray(product.keys)) product.keys = [];
    const cleanKeys = Array.isArray(newKeys) ? newKeys : newKeys.split('\n').map(k => k.trim()).filter(Boolean);
    product.keys.push(...cleanKeys);
    writeDb(data);
    return product;
  },

  addKeysToTier(productId, tierId, newKeys) {
    const data = readDb();
    const product = (data.products || []).find(p => p.id === productId);
    if (!product || !Array.isArray(product.tiers)) return null;
    const tier = product.tiers.find(t => t.id === tierId);
    if (!tier) return null;
    if (!Array.isArray(tier.keys)) tier.keys = [];
    const cleanKeys = Array.isArray(newKeys) ? newKeys : newKeys.split('\n').map(k => k.trim()).filter(Boolean);
    tier.keys.push(...cleanKeys);
    writeDb(data);
    return { product, tier };
  },

  // Categories
  getCategories() {
    const data = readDb();
    if (!Array.isArray(data.categories) || data.categories.length === 0) {
      data.categories = ['VIP MOD', 'iOS ONLY', 'ANDROID', 'VPN FREE', 'E-SIGN', 'VIP BOOSTER', 'TOOLS'];
      writeDb(data);
    }
    return data.categories;
  },

  addCategory(name) {
    const data = readDb();
    if (!Array.isArray(data.categories)) data.categories = [];
    const trimmed = (name || '').trim();
    if (!trimmed || data.categories.includes(trimmed)) return data.categories;
    data.categories.push(trimmed);
    writeDb(data);
    return data.categories;
  },

  updateCategory(oldName, newName) {
    const data = readDb();
    if (!Array.isArray(data.categories)) data.categories = [];
    const idx = data.categories.indexOf(oldName);
    const trimmed = (newName || '').trim();
    if (idx !== -1 && trimmed) {
      data.categories[idx] = trimmed;
      (data.products || []).forEach(p => {
        if (p.category === oldName) p.category = trimmed;
      });
      writeDb(data);
    }
    return data.categories;
  },

  deleteCategory(name) {
    const data = readDb();
    if (!Array.isArray(data.categories)) return [];
    data.categories = data.categories.filter(c => c !== name);
    writeDb(data);
    return data.categories;
  },

  // Users
  saveUser(userData) {
    const data = readDb();
    if (!data.users) data.users = {};
    const existing = data.users[userData.id] || {};
    data.users[userData.id] = {
      ...existing,
      ...userData,
      balance: existing.balance !== undefined ? existing.balance : 0,
      startedAt: existing.startedAt || new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    writeDb(data);
    return data.users[userData.id];
  },

  getUser(id) {
    const data = readDb();
    return data.users ? data.users[id] : null;
  },

  getAllUsers() {
    const data = readDb();
    return Object.values(data.users || {});
  },

  updateUserBalance(id, delta) {
    const data = readDb();
    if (!data.users || !data.users[id]) return 0;
    data.users[id].balance = Math.max(0, parseFloat(((data.users[id].balance || 0) + delta).toFixed(2)));
    writeDb(data);
    return data.users[id].balance;
  },

  setResellerStatus(telegramId, status) {
    const data = readDb();
    if (!data.users) data.users = {};
    const uid = String(telegramId);
    let user = data.users[uid];
    if (!user) {
      const matchKey = Object.keys(data.users).find(k => String(k) === uid);
      if (matchKey) user = data.users[matchKey];
    }
    if (!user) {
      user = { id: telegramId, balance: 0, firstName: 'User' };
      data.users[uid] = user;
    }

    user.resellerStatus = status; // 'pending' | 'approved' | 'rejected' | 'none' | 'revoked'
    user.isReseller = (status === 'approved');
    user.resellerUpdatedAt = new Date().toISOString();

    writeDb(data);
    return user;
  },

  removeReseller(telegramId) {
    return this.setResellerStatus(telegramId, 'revoked');
  },

  getResellerUsers() {
    const data = readDb();
    const users = Object.values(data.users || {});
    return users.filter(u => u.isReseller === true || u.resellerStatus === 'pending' || u.resellerStatus === 'approved');
  },

  // Orders
  createOrder(order) {
    const data = readDb();
    if (!data.orders) data.orders = [];
    const newOrder = {
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      telegramId: order.telegramId || null,
      productId: order.productId || null,
      tierId: order.tierId || null,
      tierName: order.tierName || null,
      productName: order.productName || 'VIP Item',
      quantity: Math.max(1, parseInt(order.quantity) || 1),
      amount: parseFloat(order.amount) || 0,
      status: 'PENDING',
      tranId: order.tranId || '',
      md5: order.md5 || '',
      qrString: order.qrString || '',
      assignedKey: null,
      assignedKeys: [],
      groupLink: order.groupLink || '',
      createdAt: new Date().toISOString(),
      paidAt: null
    };
    data.orders.unshift(newOrder);
    writeDb(data);
    return newOrder;
  },

  getOrderByTranId(tranId, md5) {
    const data = readDb();
    return (data.orders || []).find(o => o.tranId === tranId || (md5 && o.md5 === md5));
  },

  getOrderById(id) {
    const data = readDb();
    return (data.orders || []).find(o => o.id === id);
  },

  getUserOrders(telegramId) {
    const data = readDb();
    return (data.orders || []).filter(o => String(o.telegramId) === String(telegramId));
  },

  completeOrder(tranId, md5) {
    const data = readDb();
    const order = (data.orders || []).find(o => o.tranId === tranId || (md5 && o.md5 === md5));
    if (!order) return null;
    if (order.status === 'PAID') return order; // already completed

    order.status = 'PAID';
    order.paidAt = new Date().toISOString();

    // Consume key(s) from product / tier if available
    if (order.productId) {
      const product = (data.products || []).find(p => p.id === order.productId);
      let qty = Math.max(1, parseInt(order.quantity) || 1);
      // Fallback: if quantity was not set or 1, check productName for ' x[number]'
      if (qty === 1 && order.productName) {
        const match = order.productName.match(/x\s*(\d+)/i);
        if (match && parseInt(match[1])) {
          qty = parseInt(match[1]);
        }
      }
      order.quantity = qty;
      const assignedKeys = [];

      if (product) {
        if (order.tierId && order.tierId !== 'base' && Array.isArray(product.tiers)) {
          const tier = product.tiers.find(t => t.id === order.tierId);
          if (tier && Array.isArray(tier.keys)) {
            for (let i = 0; i < qty && tier.keys.length > 0; i++) {
              assignedKeys.push(tier.keys.shift());
            }
          }
        } else if (Array.isArray(product.keys)) {
          for (let i = 0; i < qty && product.keys.length > 0; i++) {
            assignedKeys.push(product.keys.shift());
          }
        }
        order.groupLink = product.groupLink || order.groupLink;
      }

      while (assignedKeys.length < qty) {
        assignedKeys.push(`ASTORR-VIP-GEN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
      }

      order.assignedKeys = assignedKeys;
      order.assignedKey = assignedKeys.join('\n');
    } else {
      // Wallet deposit
      if (order.telegramId) {
        if (!data.users) data.users = {};
        const uid = String(order.telegramId);
        if (!data.users[uid]) {
          data.users[uid] = { id: order.telegramId, balance: 0, firstName: 'Customer' };
        }
        data.users[uid].balance = parseFloat(((data.users[uid].balance || 0) + order.amount).toFixed(2));
      }
    }

    writeDb(data);
    return order;
  },

  purchaseWithBalance(telegramId, productId, tierId = null, quantity = 1) {
    const data = readDb();
    if (!data.users) data.users = {};
    const uid = String(telegramId);
    let user = data.users[uid];
    if (!user) {
      // Find case-insensitive or numeric
      const matchKey = Object.keys(data.users).find(k => String(k) === uid);
      if (matchKey) user = data.users[matchKey];
    }

    if (!user) {
      return { success: false, error: 'User account not found' };
    }

    const product = (data.products || []).find(p => p.id === productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const isReseller = !!user.isReseller;
    let unitPrice = 0;
    let selectedTier = null;
    let orderProductName = product.name;

    // Check if buying tier
    const isBuyingTier = tierId && tierId !== 'base' && tierId !== 'null' && Array.isArray(product.tiers) && product.tiers.length > 0;

    if (isBuyingTier) {
      selectedTier = product.tiers.find(t => t.id === tierId);
      if (!selectedTier) {
        return { success: false, error: 'រយៈពេល/Tier មិនត្រឹមត្រូវ' };
      }

      const availableKeys = Array.isArray(selectedTier.keys) ? selectedTier.keys.length : 0;
      if (availableKeys < qty) {
        return { success: false, error: `រយៈពេល "${selectedTier.name}" នេះមានស្តុកមិនគ្រប់គ្រាន់ទេ!` };
      }

      const hasTierResellerPrice = selectedTier.resellerPrice !== undefined && parseFloat(selectedTier.resellerPrice) > 0;
      unitPrice = (isReseller && hasTierResellerPrice) ? parseFloat(selectedTier.resellerPrice) : parseFloat(selectedTier.price);
      orderProductName = `${product.name} (${selectedTier.name})` + (qty > 1 ? ` x${qty}` : '');
    } else {
      // Buying base product!
      const availableKeys = Array.isArray(product.keys) ? product.keys.length : 0;
      if (availableKeys < qty) {
        return { success: false, error: 'ទំនិញនេះមានស្តុកមិនគ្រប់គ្រាន់ទេ!' };
      }

      const hasResellerPrice = product.resellerPrice !== undefined && parseFloat(product.resellerPrice) > 0;
      unitPrice = (isReseller && hasResellerPrice) ? parseFloat(product.resellerPrice) : parseFloat(product.price);
      orderProductName = `${product.name}` + (qty > 1 ? ` x${qty}` : '');
    }

    const price = parseFloat((unitPrice * qty).toFixed(2));
    const balance = parseFloat(user.balance || 0);
    if (balance < price) {
      return { success: false, error: 'Insufficient wallet balance', balance, price };
    }

    // Deduct balance
    user.balance = parseFloat((balance - price).toFixed(2));

    // Assign keys
    const assignedKeys = [];
    if (selectedTier) {
      for (let i = 0; i < qty && selectedTier.keys.length > 0; i++) {
        assignedKeys.push(selectedTier.keys.shift());
      }
    } else if (Array.isArray(product.keys)) {
      for (let i = 0; i < qty && product.keys.length > 0; i++) {
        assignedKeys.push(product.keys.shift());
      }
    }

    while (assignedKeys.length < qty) {
      assignedKeys.push(`ASTORR-VIP-GEN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
    }

    const assignedKey = assignedKeys.join('\n');

    // Create completed order
    if (!data.orders) data.orders = [];
    const order = {
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      telegramId: telegramId,
      productId: product.id,
      tierId: selectedTier ? selectedTier.id : null,
      tierName: selectedTier ? selectedTier.name : null,
      productName: orderProductName,
      quantity: qty,
      amount: price,
      status: 'PAID',
      paymentMethod: 'WALLET',
      tranId: 'WAL_' + Date.now(),
      md5: '',
      qrString: '',
      assignedKey: assignedKey,
      assignedKeys: assignedKeys,
      groupLink: product.groupLink || 'https://t.me/rosangkornews',
      isResellerPurchase: isReseller,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      notified: true
    };

    data.orders.unshift(order);
    writeDb(data);

    return {
      success: true,
      paid: true,
      order,
      assignedKey,
      assignedKeys,
      quantity: qty,
      groupLink: order.groupLink,
      productName: orderProductName,
      tierName: selectedTier ? selectedTier.name : null,
      amount: price,
      remainingBalance: user.balance
    };
  },

  markOrderNotified(tranId, md5) {
    const data = readDb();
    const order = (data.orders || []).find(o => o.tranId === tranId || (md5 && o.md5 === md5));
    if (order) {
      order.notified = true;
      writeDb(data);
    }
    return order;
  },

  // Stats
  getStats() {
    const data = readDb();
    const products = data.products || [];
    const users = Object.values(data.users || {});
    const orders = data.orders || [];
    const paidOrders = orders.filter(o => o.status === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    return {
      totalUsers: users.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2))
    };
  },

  getSettings() {
    const data = readDb();
    return data.settings || {};
  },

  updateSettings(updates) {
    const data = readDb();
    data.settings = { ...(data.settings || {}), ...updates };
    writeDb(data);
    return data.settings;
  }
};

module.exports = db;
