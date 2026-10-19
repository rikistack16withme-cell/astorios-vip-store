/**
 * AstorrIOS Mini App Client Logic
 * Full KHQR Modal, Live PayLinkAPI Polling & Admin Management
 */

// -------------------------------------------------------------
// 1. Global State
// -------------------------------------------------------------
const state = {
  products: [],
  categories: ['VIP MOD', 'iOS ONLY', 'ANDROID', 'VPN FREE', 'E-SIGN', 'VIP BOOSTER', 'TOOLS'],
  selectedCategory: 'ALL',
  selectedFilter: 'all',
  searchQuery: '',
  user: {
    id: null,
    firstName: 'Customer',
    username: '',
    balance: 0.00,
    isReseller: false,
    resellerStatus: 'none'
  },
  isAdmin: false,
  activeOrder: null,
  pollTimer: null,
  countdownTimer: null,
  timeLeft: 60,
  isPaymentCompleted: false,
  isCheckInProgress: false,
  isPollingActive: false,
  lastPaymentRequest: null,
  isRenewing: false,
  adminNewProductImage: '',
  adminTierProductImage: '',
  adminEditProductImage: '',
  lang: 'km'
};

const ADMIN_IDS = ['6805487598', '7283817695'];

// Pure SVG Vector Icons for Categories & UI (NO emojis)
function getCategorySvgIcon(catName) {
  const name = (catName || '').toUpperCase();
  if (name === 'ALL' || name === 'ទាំងអស់') {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z"/></svg>`;
  }
  if (name.includes('VIP') || name.includes('MOD')) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
  }
  if (name.includes('IOS') || name.includes('APPLE')) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="3"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
  }
  if (name.includes('ANDROID')) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z"></path><path d="M7 6l-2-3"></path><path d="M17 6l2-3"></path></svg>`;
  }
  if (name.includes('VPN') || name.includes('NET')) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
  }
  if (name.includes('SIGN') || name.includes('CERT')) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="9 15 11 17 15 13"></polyline></svg>`;
  }
  if (name.includes('AIM') || name.includes('HACK')) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>`;
  }
  if (name.includes('TOOL')) {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
  }
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
}

async function fetchCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
      state.categories = data.categories;
    }
  } catch (e) {
    console.warn('Categories load error:', e);
  }
  renderCategoryChips();
  populateCategoryDropdowns();
  renderAdminCategoryList();
}

async function quickAddCategoryPrompt(targetSelectId) {
  const name = prompt('បញ្ចូលឈ្មោះ Category ថ្មី (New Category Name)៖');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ name: trimmed })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`បានបន្ថែម Category៖ "${trimmed}"`);
      await fetchCategories();
      if (targetSelectId) {
        const selectEl = document.getElementById(targetSelectId);
        if (selectEl) selectEl.value = trimmed;
      }
    } else {
      showToast(data.error || 'Failed to add category');
    }
  } catch (e) {
    showToast('Network error adding category');
  }
}

function renderCategoryChips() {
  const container = document.getElementById('categoryList');
  if (!container) return;

  const chips = ['ALL', ...state.categories];
  container.innerHTML = chips.map(cat => {
    const isActive = state.selectedCategory === cat;
    const label = cat === 'ALL' ? 'ទាំងអស់ (ALL)' : cat;
    return `
      <button type="button" class="cat-chip ${isActive ? 'active' : ''}" data-cat="${escapeHtml(cat)}" onclick="selectCategory('${escapeHtml(cat)}')">
        ${getCategorySvgIcon(cat)}
        <span>${escapeHtml(label)}</span>
      </button>
    `;
  }).join('');
}

function selectCategory(cat) {
  state.selectedCategory = cat;
  renderCategoryChips();
  renderProducts();
}

function populateCategoryDropdowns() {
  const newCatSelect = document.getElementById('newProdCategory');
  const tierCatSelect = document.getElementById('tierProdCategory');
  const editCatSelect = document.getElementById('editProdCategory');
  const optionsHtml = state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (newCatSelect) newCatSelect.innerHTML = optionsHtml;
  if (tierCatSelect) tierCatSelect.innerHTML = optionsHtml;
  if (editCatSelect) editCatSelect.innerHTML = optionsHtml;
}

// -------------------------------------------------------------
// 2. Telegram WebApp Initialization
// -------------------------------------------------------------
const tg = window.Telegram?.WebApp;

function initTelegram() {
  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor('#090514');
      tg.setBackgroundColor('#090514');
    } catch (e) { }

    const initData = tg.initDataUnsafe;
    if (initData?.user) {
      state.user.id = initData.user.id;
      state.user.firstName = initData.user.first_name || 'Customer';
      state.user.username = initData.user.username || '';
    }
  }

  // URL override or admin test
  const urlParams = new URLSearchParams(window.location.search);
  const paramAdmin = urlParams.get('admin');
  const paramUser = urlParams.get('userId');

  if (paramUser) {
    state.user.id = paramUser;
  }

  const paramTab = urlParams.get('tab');
  if (paramTab && ['store', 'wallet', 'orders', 'support', 'admin'].includes(paramTab)) {
    setTimeout(() => {
      switchNavTab(paramTab);
    }, 200);
  }

  // Check admin rights
  if (paramAdmin === 'true' || (state.user.id && ADMIN_IDS.includes(String(state.user.id)))) {
    state.isAdmin = true;
    const adminNav = document.getElementById('btnAdminNav');
    const navItemAdmin = document.getElementById('navItemAdmin');
    if (adminNav) adminNav.classList.remove('hidden');
    if (navItemAdmin) navItemAdmin.classList.remove('hidden');
  }

  // Update UI user labels
  document.getElementById('userNameLabel').textContent = state.user.firstName;
  document.getElementById('userBalanceLabel').textContent = `$${state.user.balance.toFixed(2)}`;
}

// -------------------------------------------------------------
// 3. API & Products Fetching
// -------------------------------------------------------------
async function fetchProducts() {
  try {
    const res = await fetch(`/api/products?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.products)) {
      state.products = data.products;
      renderProducts();
      renderInventoryList();
    }
  } catch (err) {
    console.error('Failed to load products:', err);
    showToast('Failed to load products');
  }
}

async function fetchUserProfile(forceUpdate = false) {
  const targetId = state.user.id || new URLSearchParams(window.location.search).get('userId');
  if (!targetId) return;
  try {
    const res = await fetch(`/api/user/${targetId}?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    const data = await res.json();
    if (data.success) {
      if (data.user) {
        state.user.balance = data.user.balance || 0;
        const balLabel = document.getElementById('userBalanceLabel');
        if (balLabel) balLabel.textContent = `$${state.user.balance.toFixed(2)}`;
        const walletNum = document.getElementById('walletBalanceNum');
        if (walletNum) walletNum.textContent = `$${state.user.balance.toFixed(2)}`;
      }

      const prevIsReseller = state.user.isReseller;
      const prevStatus = state.user.resellerStatus;
      state.user.isReseller = !!data.isReseller;
      state.user.resellerStatus = data.resellerStatus || 'none';

      if (prevIsReseller !== state.user.isReseller || prevStatus !== state.user.resellerStatus || forceUpdate) {
        updateResellerUI();
        if (prevIsReseller !== state.user.isReseller) {
          renderProducts();
        }
      }

      if (data.isAdmin) {
        state.isAdmin = true;
        document.getElementById('btnAdminNav')?.classList.remove('hidden');
        document.getElementById('navItemAdmin')?.classList.remove('hidden');
      }
      if (data.orders) {
        renderOrderHistory(data.orders);
      }
    }
  } catch (err) {
    console.error('Failed to fetch user:', err);
  }
}

// -------------------------------------------------------------
// 4. Products Rendering (Matches Screenshot 4)
// -------------------------------------------------------------
function renderProducts() {
  const container = document.getElementById('productGrid');
  if (!container) return;

  let filtered = state.products.filter(p => {
    // Category match
    if (state.selectedCategory !== 'ALL' && p.category !== state.selectedCategory) {
      return false;
    }
    // Search query match
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchCat = p.category && p.category.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }
    // Filter tabs
    if (state.selectedFilter === 'in_stock' && !p.inStock) return false;
    return true;
  });

  document.getElementById('productCountBadge').textContent = `${filtered.length} មុខទំនិញ`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1;" class="text-center py-12 text-gray-400">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2 text-gray-500"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <p class="text-sm">មិនមានទំនិញតាមការស្វែងរករបស់អ្នកទេ</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isTiered = !!(p.hasTiers && Array.isArray(p.tiers) && p.tiers.length > 0);
    const totalKeys = isTiered
      ? p.tiers.reduce((sum, t) => sum + (Array.isArray(t.keys) ? t.keys.length : 0), 0)
      : (Array.isArray(p.keys) ? p.keys.length : 0);
    const hasStock = isTiered ? (totalKeys > 0) : p.inStock;
    const stockClass = hasStock ? 'stock-in' : 'stock-out';
    const stockText = hasStock ? '● មានក្នុងស្តុក' : '● ដាច់ស្តុក (Out of Stock)';
    const imageSrc = p.image || '/assets/logo.jpg';

    const outOfStockOverlay = !hasStock ? `
      <div class="card-out-of-stock-overlay">
        <span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> ដាច់ស្តុក</span>
      </div>
    ` : '';

    const buyButtonHtml = hasStock ? (
      isTiered ? `
        <button class="btn-buy" onclick="event.stopPropagation(); openProductModal('${p.id}')">
          ជ្រើសរើស
        </button>
      ` : `
        <button class="btn-buy" onclick="event.stopPropagation(); openProductModal('${p.id}')">
          ទិញ
        </button>
      `
    ) : `
      <button class="btn-buy btn-out-of-stock" onclick="event.stopPropagation(); showToast('ទំនិញនេះដាច់ស្តុកហើយ (Out of Stock)!')">
        ដាច់ស្តុក
      </button>
    `;

    return `
      <div class="product-card" onclick="openProductModal('${p.id}')">
        <div class="card-media-stage">
          <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(p.name)}" class="card-media-img" onerror="this.onerror=null; this.src='/assets/logo.jpg'">
          <span class="badge-platform">${escapeHtml(p.platform || 'iOS & Android')}</span>
          <span class="badge-delivery">${escapeHtml(p.badge || 'រហ័ស (Instant)')}</span>
          ${outOfStockOverlay}
        </div>

        <div class="card-body">
          <div class="card-category-row">
            <span class="card-category-tag">${escapeHtml(p.category || 'VIP MOD')}</span>
            ${isTiered ? `<span class="text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold shrink-0">🕒 ${p.tiers.length} Tiers</span>` : ''}
            <span class="stock-indicator ${stockClass}">${stockText}</span>
          </div>

          <h3 class="card-title">${escapeHtml(p.name)}</h3>

          <div class="card-footer-row">
            ${(() => {
        const isResellerUser = !!state.user.isReseller;

        if (isTiered) {
          return `
              <div class="price-box">
                <span class="price-label">តម្លៃចាប់ពី</span>
                <span class="price-amount text-yellow-400 font-black text-sm">ចុចមើលតម្លៃ</span>
              </div>
            `;
        } else {
          // Single Product
          const hasResellerPrice = p.resellerPrice !== undefined && p.resellerPrice !== null && p.resellerPrice !== '' && parseFloat(p.resellerPrice) > 0;
          if (isResellerUser) {
            if (hasResellerPrice) {
              return `
                <div class="price-box">
                  <div class="flex items-center gap-1">
                    <span class="price-label text-amber-300 font-extrabold">តម្លៃ RESELLER</span>
                    <span class="badge-reseller-vip flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
                      <span>VIP</span>
                    </span>
                  </div>
                  <div class="mt-0.5">
                    <span class="price-amount text-emerald-400 font-black">$${parseFloat(p.resellerPrice).toFixed(2)}</span>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="price-box">
                  <span class="price-amount text-yellow-400 font-bold">$${parseFloat(p.price || 0).toFixed(2)}</span>
                  <span class="text-[9px] text-amber-300 font-medium block leading-tight">មិនទាន់មានតម្លៃ Reseller</span>
                </div>
              `;
            }
          } else {
            return `
              <div class="price-box">
                <span class="price-label">តម្លៃ • PRICE</span>
                <span class="price-amount">$${parseFloat(p.price || 0).toFixed(2)}</span>
              </div>
            `;
          }
        }
      })()}
            ${buyButtonHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// 5. Product Detail Modal
// -------------------------------------------------------------
let activeModalProduct = null;
let activeModalTierId = null;
let modalSelectedQty = 1;

function adjustModalQty(delta) {
  setModalQty(modalSelectedQty + delta);
}

function onModalQtyChange(val) {
  setModalQty(parseInt(val) || 1);
}

function setModalQty(qty) {
  modalSelectedQty = Math.max(1, Math.min(99, parseInt(qty) || 1));
  const inputEl = document.getElementById('modalQtyInput');
  if (inputEl) inputEl.value = modalSelectedQty;
  updateModalSelection();
}

function openProductModal(prodId) {
  const p = state.products.find(x => x.id === prodId);
  if (!p) return;
  activeModalProduct = p;
  modalSelectedQty = 1;
  const inputEl = document.getElementById('modalQtyInput');
  if (inputEl) inputEl.value = 1;

  document.getElementById('modalDetailImg').src = p.image || '/assets/logo.jpg';
  document.getElementById('modalDetailPlatform').textContent = p.platform || 'iOS & Android';
  document.getElementById('modalDetailCategory').textContent = p.category || 'VIP MOD';
  document.getElementById('modalDetailTitle').textContent = p.name;
  const descBox = document.getElementById('modalDetailDescBox');
  const descEl = document.getElementById('modalDetailDesc');
  const descText = (p.description || '').trim();
  if (descEl) descEl.textContent = descText;
  if (descBox) {
    if (descText) {
      descBox.classList.remove('hidden');
    } else {
      descBox.classList.add('hidden');
    }
  }

  const isResellerUser = !!state.user.isReseller;
  const tierSection = document.getElementById('modalTierSection');
  const tierList = document.getElementById('modalTierList');
  const isTiered = !!(p.hasTiers && Array.isArray(p.tiers) && p.tiers.length > 0);

  if (isTiered) {
    if (tierSection) tierSection.classList.remove('hidden');
    if (tierList) {
      const cards = p.tiers.map(t => {
        const hasTierReseller = t.resellerPrice !== undefined && t.resellerPrice !== null && t.resellerPrice !== '' && parseFloat(t.resellerPrice) > 0;
        const tierPrice = (isResellerUser && hasTierReseller) ? parseFloat(t.resellerPrice) : parseFloat(t.price);
        const tierKeysCount = Array.isArray(t.keys) ? t.keys.length : 0;
        const isAvailable = tierKeysCount > 0;

        return `
          <div class="tier-card-btn ${isAvailable ? '' : 'out-of-stock'}" id="tierCardBtn_${t.id}" onclick="selectModalTier('${t.id}')">
            <span class="tier-name font-bold">${escapeHtml(t.name)}</span>
            <span class="tier-price">$${tierPrice.toFixed(2)}</span>
            <span class="tier-stock-tag ${isAvailable ? 'text-emerald-400' : 'text-red-400'}">${isAvailable ? `មានស្តុក (${tierKeysCount})` : 'ដាច់ស្តុក'}</span>
          </div>
        `;
      });
      tierList.innerHTML = cards.join('');
    }

    // Default select first available tier with stock (or first tier)
    const firstTierWithStock = p.tiers.find(t => Array.isArray(t.keys) && t.keys.length > 0) || p.tiers[0];
    if (firstTierWithStock) {
      selectModalTier(firstTierWithStock.id);
    }
  } else {
    // Single Product
    if (tierSection) tierSection.classList.add('hidden');
    selectModalTier('base');
  }

  document.getElementById('productDetailModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productDetailModal').classList.add('hidden');
  activeModalTierId = null;
}

function selectModalTier(tierId) {
  if (!activeModalProduct) return;
  activeModalTierId = tierId;
  updateModalSelection();
}

function updateModalSelection() {
  if (!activeModalProduct) return;
  const p = activeModalProduct;
  const isResellerUser = !!state.user.isReseller;

  // Update active card styling
  const allCards = document.querySelectorAll('.tier-card-btn');
  allCards.forEach(c => c.classList.remove('active'));

  const activeCard = document.getElementById(`tierCardBtn_${activeModalTierId}`);
  if (activeCard) activeCard.classList.add('active');

  const baseBadge = document.getElementById('modalBaseSelectBadge');
  if (baseBadge) baseBadge.classList.add('hidden');

  let unitPrice = 0;
  let isAvailable = false;
  let selectedTier = null;

  if (activeModalTierId && activeModalTierId !== 'base') {
    selectedTier = (p.tiers || []).find(t => t.id === activeModalTierId);
    if (selectedTier) {
      const hasTierReseller = selectedTier.resellerPrice !== undefined && selectedTier.resellerPrice !== null && selectedTier.resellerPrice !== '' && parseFloat(selectedTier.resellerPrice) > 0;
      unitPrice = (isResellerUser && hasTierReseller) ? parseFloat(selectedTier.resellerPrice) : parseFloat(selectedTier.price);
      const tierKeysCount = Array.isArray(selectedTier.keys) ? selectedTier.keys.length : 0;
      isAvailable = tierKeysCount >= modalSelectedQty;

      const priceHeaderEl = document.getElementById('modalDetailPrice');
      if (priceHeaderEl) priceHeaderEl.textContent = `$${unitPrice.toFixed(2)}`;

      const resellerBadge = document.getElementById('modalDetailResellerBadge');
      if (resellerBadge) {
        if (isResellerUser && hasTierReseller) resellerBadge.classList.remove('hidden');
        else resellerBadge.classList.add('hidden');
      }

      const stockEl = document.getElementById('modalDetailStock');
      if (stockEl) {
        if (isAvailable) {
          stockEl.textContent = `● មានក្នុងស្តុក (${tierKeysCount})`;
          stockEl.className = 'text-xs font-bold text-emerald-400';
        } else {
          stockEl.textContent = '● ដាច់ស្តុក (Out of Stock)';
          stockEl.className = 'text-xs font-bold text-red-400';
        }
      }
    }
  } else {
    // Single Product
    activeModalTierId = 'base';
    const hasResellerPrice = p.resellerPrice !== undefined && p.resellerPrice !== null && p.resellerPrice !== '' && parseFloat(p.resellerPrice) > 0;
    unitPrice = (isResellerUser && hasResellerPrice) ? parseFloat(p.resellerPrice) : parseFloat(p.price || 0);
    const baseKeysCount = Array.isArray(p.keys) ? p.keys.length : 0;
    isAvailable = baseKeysCount >= modalSelectedQty;

    const priceHeaderEl = document.getElementById('modalDetailPrice');
    if (priceHeaderEl) priceHeaderEl.textContent = `$${unitPrice.toFixed(2)}`;

    const resellerBadge = document.getElementById('modalDetailResellerBadge');
    if (resellerBadge) {
      if (isResellerUser && hasResellerPrice) resellerBadge.classList.remove('hidden');
      else resellerBadge.classList.add('hidden');
    }

    const stockEl = document.getElementById('modalDetailStock');
    if (stockEl) {
      if (isAvailable) {
        stockEl.textContent = `● មានក្នុងស្តុក (${baseKeysCount})`;
        stockEl.className = 'text-xs font-bold text-emerald-400';
      } else {
        stockEl.textContent = '● ដាច់ស្តុក (Out of Stock)';
        stockEl.className = 'text-xs font-bold text-red-400';
      }
    }
  }

  const totalPrice = parseFloat((unitPrice * modalSelectedQty).toFixed(2));
  const totalEl = document.getElementById('modalTierSelectedTotal');
  if (totalEl) totalEl.textContent = `$${totalPrice.toFixed(2)}`;

  // Update Buy Button
  const buyBtn = document.getElementById('btnModalBuyNow');
  if (!buyBtn) return;

  if (isAvailable) {
    buyBtn.disabled = false;
    buyBtn.className = 'btn-proceed-pay flex items-center justify-center gap-1.5';
    const buyLabel = selectedTier
      ? `ទិញ ${escapeHtml(selectedTier.name)} - $${totalPrice.toFixed(2)}`
      : `ទិញឥឡូវនេះ (Buy Now) - $${totalPrice.toFixed(2)}`;

    buyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <span>${buyLabel}</span>
    `;
    buyBtn.onclick = () => {
      const selectedTierId = selectedTier ? selectedTier.id : null;
      closeProductModal();
      startDirectPurchase(p.id, selectedTierId, modalSelectedQty);
    };
  } else {
    buyBtn.disabled = true;
    buyBtn.className = 'btn-proceed-pay btn-modal-out-of-stock flex items-center justify-center gap-1.5';
    buyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
      <span>ដាច់ស្តុក (Out of Stock)</span>
    `;
    buyBtn.onclick = (e) => {
      e.preventDefault();
      showToast(selectedTier ? `រយៈពេល "${selectedTier.name}" នេះដាច់ស្តុកហើយ!` : 'ទំនិញនេះដាច់ស្តុកហើយ!');
    };
  }
}


// -------------------------------------------------------------
// 6. KHQR Payment Processing (PayLinkAPI) & 1-Min Expiry Flow
// -------------------------------------------------------------
function showKhqrLoading() {
  const loader = document.getElementById('khqrLoadingState');
  if (loader) loader.classList.remove('hidden');
  const expired = document.getElementById('khqrExpiredState');
  if (expired) expired.classList.add('hidden');
}

function hideKhqrLoading() {
  const loader = document.getElementById('khqrLoadingState');
  if (loader) loader.classList.add('hidden');
}

function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
    setTimeout(resolve, 2000);
  });
}

function startKhqrCountdown() {
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  state.timeLeft = 60;

  const countdownEl = document.getElementById('khqrCountdown');
  if (countdownEl) countdownEl.textContent = '01:00';

  const expiredEl = document.getElementById('khqrExpiredState');
  if (expiredEl) expiredEl.classList.add('hidden');

  const qrImg = document.getElementById('bakongQR');
  if (qrImg) qrImg.classList.remove('blur-sm', 'opacity-20');

  const usdBadge = document.getElementById('khqrUsdCenterBadge');
  if (usdBadge) usdBadge.classList.remove('hidden');

  state.countdownTimer = setInterval(() => {
    state.timeLeft--;
    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (countdownEl) countdownEl.textContent = formatted;

    if (state.timeLeft <= 0) {
      clearInterval(state.countdownTimer);
      expireKhqr();
    }
  }, 1000);
}

function expireKhqr() {
  stopPaymentPolling();
  const qrImg = document.getElementById('bakongQR');
  if (qrImg) qrImg.classList.add('blur-sm', 'opacity-20');

  const usdBadge = document.getElementById('khqrUsdCenterBadge');
  if (usdBadge) usdBadge.classList.add('hidden');

  const expiredEl = document.getElementById('khqrExpiredState');
  if (expiredEl) expiredEl.classList.remove('hidden');

  showToast('KHQR បានផុតកំណត់! សូមចុច "បង្កើត QR ថ្មី (Renew)" ដើម្បីបន្ត។');
}

async function regenerateCurrentKhqr() {
  if (state.isRenewing) return;

  const req = state.lastPaymentRequest || (state.activeOrder ? {
    type: state.activeOrder.productId ? 'product' : 'deposit',
    id: state.activeOrder.productId,
    productId: state.activeOrder.productId,
    tierId: state.activeOrder.tierId,
    quantity: state.activeOrder.quantity || 1,
    amount: parseFloat(state.activeOrder.amount || state.activeOrder.customAmount || 0)
  } : null);

  if (!req) {
    showToast('សូមជ្រើសរើសទំនិញ ឬបញ្ចូលទឹកប្រាក់ម្តងទៀត');
    closeKhqrModal();
    return;
  }

  state.isRenewing = true;
  stopPaymentPolling();
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }

  // Show loading indicator
  showKhqrLoading();
  showToast('កំពុងបង្កើត QR Code ថ្មី (Renewing)...');

  try {
    let payload = {
      telegramId: state.user.id || '6805487598'
    };

    if (req.type === 'product' && (req.productId || req.id)) {
      payload.productId = req.productId || req.id;
      payload.tierId = req.tierId || null;
      payload.quantity = req.quantity || 1;
    } else if (req.type === 'deposit' || req.amount) {
      payload.customAmount = req.amount || req.customAmount;
    } else {
      showToast('ទិន្នន័យមិនត្រឹមត្រូវ សូមព្យាយាមម្តងទៀត');
      hideKhqrLoading();
      const expiredEl = document.getElementById('khqrExpiredState');
      if (expiredEl) expiredEl.classList.remove('hidden');
      state.isRenewing = false;
      return;
    }

    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);
    if (!data || !data.success) {
      hideKhqrLoading();
      const expiredEl = document.getElementById('khqrExpiredState');
      if (expiredEl) expiredEl.classList.remove('hidden');
      showToast(data?.error || 'មិនអាចបង្កើត QR ថ្មីបានទេ! សូមព្យាយាមម្តងទៀត');
      state.isRenewing = false;
      return;
    }

    // Successfully generated new QR!
    state.activeOrder = data;
    setKhqrAmount(data.amount);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=${encodeURIComponent(data.qrString)}`;

    await preloadImage(qrUrl);
    setKhqrQR(qrUrl);
    hideKhqrLoading();

    // Start fresh countdown & polling for new tranId/md5
    startKhqrCountdown();
    startPaymentPolling(data.tranId, data.md5);

    showToast('✓ QR Code ថ្មីត្រូវបានបង្កើតរួចរាល់!');
  } catch (err) {
    console.error('Error renewing KHQR:', err);
    hideKhqrLoading();
    const expiredEl = document.getElementById('khqrExpiredState');
    if (expiredEl) expiredEl.classList.remove('hidden');
    showToast('បណ្តាញមានបញ្ហា ឬ Server មិនឆ្លើយតប');
  } finally {
    state.isRenewing = false;
  }
}

// Ensure global accessibility for inline onclick handlers
window.regenerateCurrentKhqr = regenerateCurrentKhqr;


async function startDirectPurchase(productId, tierId = null, quantity = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const qty = Math.max(1, parseInt(quantity) || 1);
  const isBuyingTier = tierId && tierId !== 'base' && Array.isArray(product.tiers) && product.tiers.length > 0;
  let selectedTier = null;

  if (isBuyingTier) {
    selectedTier = product.tiers.find(t => t.id === tierId);
    if (!selectedTier) {
      showToast('រកមិនឃើញរយៈពេលដែលបានជ្រើសរើស');
      return;
    }
    const avail = Array.isArray(selectedTier.keys) ? selectedTier.keys.length : 0;
    if (avail < qty) {
      showToast(`រយៈពេល "${selectedTier.name}" នេះមានស្តុកមិនគ្រប់គ្រាន់ទេ!`);
      return;
    }
  } else {
    // Buying base product - check keys array first, then fall back to inStock flag
    const hasKeysArray = Array.isArray(product.keys) && product.keys.length > 0;
    if (hasKeysArray) {
      if (product.keys.length < qty) {
        showToast('ទំនិញនេះមានស្តុកមិនគ្រប់គ្រាន់ទេ!');
        return;
      }
    } else if (!product.inStock) {
      showToast('ទំនិញនេះដាច់ស្តុកហើយ (Out of Stock)!');
      return;
    }
  }

  const isResellerUser = !!state.user.isReseller;
  let unitPrice = 0;
  let displayName = product.name;
  let hasResellerPrice = false;

  if (selectedTier) {
    hasResellerPrice = selectedTier.resellerPrice !== undefined && selectedTier.resellerPrice !== null && selectedTier.resellerPrice !== '' && parseFloat(selectedTier.resellerPrice) > 0;
    unitPrice = (isResellerUser && hasResellerPrice) ? parseFloat(selectedTier.resellerPrice) : parseFloat(selectedTier.price);
    displayName = `${product.name} (${selectedTier.name})` + (qty > 1 ? ` x${qty}` : '');
  } else {
    hasResellerPrice = product.resellerPrice !== undefined && product.resellerPrice !== null && product.resellerPrice !== '' && parseFloat(product.resellerPrice) > 0;
    unitPrice = (isResellerUser && hasResellerPrice) ? parseFloat(product.resellerPrice) : parseFloat(product.price || 0);
    displayName = `${product.name}` + (qty > 1 ? ` x${qty}` : '');
  }

  const totalPrice = parseFloat((unitPrice * qty).toFixed(2));
  const currentBalance = parseFloat(state.user.balance || 0);

  // 1. If user already has enough balance in their wallet, purchase directly with wallet!
  if (currentBalance >= totalPrice) {
    const pricePromptText = (isResellerUser && hasResellerPrice)
      ? `$${totalPrice.toFixed(2)} USD (VIP Reseller Price)`
      : `$${totalPrice.toFixed(2)} USD`;
    const confirmBuy = confirm(`អ្នកមានសមតុល្យ $${currentBalance.toFixed(2)} USD ក្នុងកាបូប!\nតើអ្នកចង់កាត់ប្រាក់ ${pricePromptText} ដើម្បីទិញ "${displayName}" ភ្លាមៗដោយមិនបាច់ស្កេន QR មែនទេ?`);
    if (confirmBuy) {
      showToast(`កំពុងដំណើរការកាត់ប្រាក់ $${totalPrice.toFixed(2)} ពីកាបូប...`);
      try {
        const res = await fetch('/api/purchase-with-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            tierId: selectedTier ? selectedTier.id : null,
            quantity: qty,
            telegramId: state.user.id || '6805487598'
          })
        });

        const data = await res.json();
        if (data.success && data.paid) {
          state.user.balance = data.remainingBalance !== undefined ? data.remainingBalance : (currentBalance - totalPrice);
          document.getElementById('userBalanceLabel').textContent = `$${state.user.balance.toFixed(2)}`;
          const walletNum = document.getElementById('walletBalanceNum');
          if (walletNum) walletNum.textContent = `$${state.user.balance.toFixed(2)}`;

          triggerCelebration();
          showCelebrationModal(data);
          showToast('ទិញបានជោគជ័យតាមសមតុល្យកាបូប!');

          fetchProducts();
          fetchUserProfile();
          return;
        } else {
          showToast(data.error || 'ការទិញមិនជោគជ័យ សូមព្យាយាមម្តងទៀត');
          return;
        }
      } catch (err) {
        console.error('Wallet purchase error:', err);
        showToast('Network error during wallet purchase');
        return;
      }
    }
  }

  // 2. If user does NOT have enough balance, proceed to generate KHQR code
  state.lastPaymentRequest = { type: 'product', id: productId, productId: productId, tierId: selectedTier ? selectedTier.id : null, quantity: qty };
  showToast(`កំពុងរៀបចំ KHQR សម្រាប់៖ ${displayName}...`);

  try {
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        tierId: selectedTier ? selectedTier.id : null,
        quantity: qty,
        telegramId: state.user.id || '6805487598'
      })
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to create payment');
      return;
    }

    state.activeOrder = data;
    setKhqrAmount(data.amount);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=${encodeURIComponent(data.qrString)}`;

    await preloadImage(qrUrl);
    setKhqrQR(qrUrl);
    hideKhqrLoading();
    openKhqrModal();

    startKhqrCountdown();
    startPaymentPolling(data.tranId, data.md5);

  } catch (err) {
    console.error('Payment initialization error:', err);
    showToast('បណ្តាញមានបញ្ហា ឬ Server មិនទាន់ Run! (Please run node start.js)');
  }
}

// Wallet deposit payment generator
async function handleWalletDeposit(forcedAmount) {
  let amount = forcedAmount;
  if (!amount) {
    const amountInput = document.getElementById('depositAmountInput');
    amount = parseFloat(amountInput?.value || 0);
  }
  if (!amount || amount < 0.10) {
    showToast('Please enter an amount of at least $0.10');
    return;
  }

  state.lastPaymentRequest = { type: 'deposit', amount: amount, customAmount: amount };
  showToast(`កំពុងបង្កើត KHQR ចំនួន $${amount.toFixed(2)}...`);

  try {
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customAmount: amount,
        telegramId: state.user.id || '6805487598'
      })
    });

    const data = await res.json().catch(() => null);
    if (!data || !data.success) {
      showToast(data?.error || 'មិនអាចបង្កើត KHQR បានទេ! សូមពិនិត្យមើល Server');
      return;
    }

    state.activeOrder = data;
    setKhqrAmount(data.amount);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=${encodeURIComponent(data.qrString)}`;

    // Preload image before opening modal
    await preloadImage(qrUrl);
    setKhqrQR(qrUrl);
    hideKhqrLoading();
    openKhqrModal();

    startKhqrCountdown();
    startPaymentPolling(data.tranId, data.md5);
  } catch (err) {
    console.error('Deposit error:', err);
    showToast('បណ្តាញមានបញ្ហា ឬ Server មិនទាន់ Run! (Please run node start.js)');
  }
}

function setDepositAmount(val) {
  const input = document.getElementById('depositAmountInput');
  if (input) input.value = val.toFixed(2);
}

// -------------------------------------------------------------
// 7. Sequential, Bulletproof Payment Polling (No Duplicates)
// -------------------------------------------------------------
function stopPaymentPolling() {
  state.isPollingActive = false;
  if (state.pollTimer) {
    clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }
}

function startPaymentPolling(tranId, md5) {
  stopPaymentPolling();
  state.isPaymentCompleted = false;
  state.isPollingActive = true;
  state.isCheckInProgress = false;

  async function check() {
    if (!state.isPollingActive || state.isPaymentCompleted) return;
    if (state.isCheckInProgress) {
      state.pollTimer = setTimeout(check, 2000);
      return;
    }

    state.isCheckInProgress = true;
    try {
      const res = await fetch('/api/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tranId, md5 })
      });
      const data = await res.json();

      if (data.paid || data.status === 'PAID') {
        if (state.isPaymentCompleted) return; // Guard against duplicate execution
        state.isPaymentCompleted = true;
        stopPaymentPolling();

        if (state.countdownTimer) {
          clearInterval(state.countdownTimer);
        }

        closeKhqrModal();

        // Trigger celebration & delivery modal
        triggerCelebration();
        showCelebrationModal(data);

        // Refresh user profile & products
        fetchUserProfile();
        fetchProducts();
        return;
      }
    } catch (e) {
      console.warn('Poll status error:', e.message);
    } finally {
      state.isCheckInProgress = false;
      if (state.isPollingActive && !state.isPaymentCompleted) {
        state.pollTimer = setTimeout(check, 2500);
      }
    }
  }

  // Initial check after 2s
  state.pollTimer = setTimeout(check, 2000);
}

// -------------------------------------------------------------
// 8. Compact KHQR Modal Controller
// -------------------------------------------------------------
function openKhqrModal() {
  const modal = document.getElementById('bakongModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeKhqrModal() {
  stopPaymentPolling();
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
  const expiredEl = document.getElementById('khqrExpiredState');
  if (expiredEl) expiredEl.classList.add('hidden');
  const qrImg = document.getElementById('bakongQR');
  if (qrImg) qrImg.classList.remove('blur-sm', 'opacity-20');
  const usdBadge = document.getElementById('khqrUsdCenterBadge');
  if (usdBadge) usdBadge.classList.remove('hidden');

  const modal = document.getElementById('bakongModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('bakongModal');
    if (modal && !modal.classList.contains('hidden')) {
      closeKhqrModal();
    }
  }
});

function setKhqrAmount(amount) {
  const formatted = parseFloat(amount || 0).toFixed(2);
  const amountEl = document.getElementById('khqr-amount');
  if (amountEl) amountEl.textContent = formatted;
}

function setKhqrQR(url) {
  const qrImg = document.getElementById('bakongQR');
  if (qrImg) {
    qrImg.onload = () => {
      hideKhqrLoading();
    };
    qrImg.onerror = () => {
      hideKhqrLoading();
    };
    qrImg.src = url;
  }
}

function downloadKhqrImage(e) {
  if (e) e.preventDefault();
  const qrImg = document.getElementById('bakongQR');
  if (!qrImg || !qrImg.src) return;
  const a = document.createElement('a');
  a.href = qrImg.src;
  a.download = `AstorrIOS-KHQR-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('✓ បានទាញយក KHQR ជោគជ័យ!');
}

// -------------------------------------------------------------
// 8. Celebration & Key Delivery
// -------------------------------------------------------------
function triggerCelebration() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  }
}

function showCelebrationModal(paymentResult) {
  const modalElem = document.getElementById('orderSuccessModal');
  const prodTitle = document.getElementById('successProdTitle');
  const prodAmount = document.getElementById('successProdAmount');
  const keyElem = document.getElementById('successLicenseKey');
  const groupBtn = document.getElementById('successGroupBtn');

  prodTitle.textContent = paymentResult.productName || state.activeOrder?.productName || 'AstorrIOS VIP Item';
  prodAmount.textContent = `$${parseFloat(state.activeOrder?.amount || 0).toFixed(2)} USD`;

  if (paymentResult.assignedKey) {
    keyElem.textContent = paymentResult.assignedKey;
    document.getElementById('successKeyBox').classList.remove('hidden');
  } else {
    document.getElementById('successKeyBox').classList.add('hidden');
  }

  if (paymentResult.groupLink) {
    groupBtn.href = paymentResult.groupLink;
  }

  modalElem.classList.remove('hidden');
}

function closeSuccessModal() {
  document.getElementById('orderSuccessModal').classList.add('hidden');
}

function copyLicenseKey() {
  const text = document.getElementById('successLicenseKey').textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('បានចម្លង Key ទៅ Clipboard!');
  }).catch(() => {
    showToast('Failed to copy key');
  });
}

// -------------------------------------------------------------
// 9. Navigation View Switching
// -------------------------------------------------------------
function switchNavTab(tabName) {
  const views = {
    store: document.getElementById('viewStore'),
    wallet: document.getElementById('viewWallet'),
    orders: document.getElementById('viewOrders'),
    support: document.getElementById('viewSupport'),
    admin: document.getElementById('viewAdmin')
  };

  Object.values(views).forEach(v => {
    if (v) v.classList.add('hidden');
  });

  if (views[tabName]) {
    views[tabName].classList.remove('hidden');
  }

  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (tabName === 'orders') {
    fetchUserProfile();
  } else if (tabName === 'admin') {
    loadAdminStats();
    renderInventoryList();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------
// 10. Admin Operations & Subtabs
// -------------------------------------------------------------
function switchAdminTab(subTab) {
  const tabs = {
    add: document.getElementById('adminTabAdd'),
    addTier: document.getElementById('adminTabAddTier'),
    inventory: document.getElementById('adminTabInventory'),
    categories: document.getElementById('adminTabCategories'),
    broadcast: document.getElementById('adminTabBroadcast'),
    stats: document.getElementById('adminTabStats'),
    resellers: document.getElementById('adminTabResellers')
  };

  const buttons = {
    add: document.getElementById('adminSubtabBtnAdd'),
    addTier: document.getElementById('adminSubtabBtnAddTier'),
    inventory: document.getElementById('adminSubtabBtnInventory'),
    categories: document.getElementById('adminSubtabBtnCategories'),
    broadcast: document.getElementById('adminSubtabBtnBroadcast'),
    stats: document.getElementById('adminSubtabBtnStats'),
    resellers: document.getElementById('adminSubtabBtnResellers')
  };

  Object.values(tabs).forEach(t => { if (t) t.classList.add('hidden'); });
  if (tabs[subTab]) tabs[subTab].classList.remove('hidden');

  Object.values(buttons).forEach(b => {
    if (b) {
      b.classList.remove('active', 'bg-purple-600', 'text-white');
      b.classList.add('bg-purple-900/40', 'text-gray-300');
    }
  });

  if (buttons[subTab]) {
    buttons[subTab].classList.add('active', 'bg-purple-600', 'text-white');
    buttons[subTab].classList.remove('bg-purple-900/40', 'text-gray-300');
  }

  if (subTab === 'stats') loadAdminStats();
  if (subTab === 'inventory') renderInventoryList();
  if (subTab === 'categories') {
    fetchCategories();
    renderAdminCategoryList();
  }
  if (subTab === 'resellers') fetchAdminResellers();
  if (subTab === 'add') populateCategoryDropdowns();
  if (subTab === 'addTier') {
    populateCategoryDropdowns();
    const container = document.getElementById('tierProdTiersContainer');
    if (container && container.children.length === 0) {
      addNewTierRow('tier', {});
    }
  }
}

// -------------------------------------------------------------
// Image Upload Helper (Phone Photo Gallery / PC Explorer)
// -------------------------------------------------------------
function compressAndConvertImage(file, maxDimension = 1000, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageToServer(base64Data, filename) {
  const adminId = state.user?.id || '6805487598';
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': adminId,
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        filename: filename || 'upload.jpg',
        adminId
      })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleProductImageFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const emptyWrap = document.getElementById('newProdUploadEmpty');
  const previewWrap = document.getElementById('newProdPreviewWrap');
  const previewImg = document.getElementById('newProdPreviewImg');
  const statusText = document.getElementById('newProdUploadStatusText');
  const hiddenInput = document.getElementById('newProdImage');

  try {
    if (emptyWrap) emptyWrap.classList.add('hidden');
    if (previewWrap) previewWrap.classList.remove('hidden');
    if (statusText) {
      statusText.textContent = '⏳ កំពុងដំណើរការ...';
      statusText.className = 'text-[10px] text-yellow-400 font-bold';
    }

    const compressedDataUrl = await compressAndConvertImage(file);
    if (previewImg) previewImg.src = compressedDataUrl;

    // Guaranteed local backup in state so image is never lost
    state.adminNewProductImage = compressedDataUrl;
    if (hiddenInput) hiddenInput.value = compressedDataUrl;

    const result = await uploadImageToServer(compressedDataUrl, file.name);
    if (result.success && result.url) {
      state.adminNewProductImage = result.url;
      if (hiddenInput) hiddenInput.value = result.url;
      if (statusText) {
        statusText.textContent = '✓ បាន Upload ជោគជ័យ!';
        statusText.className = 'text-[10px] text-emerald-400 font-bold';
      }
      showToast('បាន Upload រូបភាពទំនិញរួចរាល់!');
    } else {
      if (statusText) {
        statusText.textContent = '✓ រូបភាពរួចរាល់';
        statusText.className = 'text-[10px] text-purple-300 font-bold';
      }
    }
  } catch (err) {
    console.error('File read error:', err);
    if (statusText) {
      statusText.textContent = 'Upload បរាជ័យ';
      statusText.className = 'text-[10px] text-red-400 font-bold';
    }
    showToast('Failed to process image');
  }
}

function removeProductImageUpload() {
  state.adminNewProductImage = '';
  const fileInput = document.getElementById('newProdFileInput');
  if (fileInput) fileInput.value = '';
  const hiddenInput = document.getElementById('newProdImage');
  if (hiddenInput) hiddenInput.value = '';
  const emptyWrap = document.getElementById('newProdUploadEmpty');
  if (emptyWrap) emptyWrap.classList.remove('hidden');
  const previewWrap = document.getElementById('newProdPreviewWrap');
  if (previewWrap) previewWrap.classList.add('hidden');
  const previewImg = document.getElementById('newProdPreviewImg');
  if (previewImg) previewImg.src = '';
}

async function handleTierProductImageFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const emptyWrap = document.getElementById('tierProdUploadEmpty');
  const previewWrap = document.getElementById('tierProdPreviewWrap');
  const previewImg = document.getElementById('tierProdPreviewImg');
  const statusText = document.getElementById('tierProdUploadStatusText');
  const hiddenInput = document.getElementById('tierProdImage');

  try {
    if (emptyWrap) emptyWrap.classList.add('hidden');
    if (previewWrap) previewWrap.classList.remove('hidden');
    if (statusText) {
      statusText.textContent = '⏳ កំពុងដំណើរការ...';
      statusText.className = 'text-[10px] text-yellow-400 font-bold';
    }

    const compressedDataUrl = await compressAndConvertImage(file);
    if (previewImg) previewImg.src = compressedDataUrl;

    state.adminTierProductImage = compressedDataUrl;
    if (hiddenInput) hiddenInput.value = compressedDataUrl;

    const result = await uploadImageToServer(compressedDataUrl, file.name);
    if (result.success && result.url) {
      state.adminTierProductImage = result.url;
      if (hiddenInput) hiddenInput.value = result.url;
      if (statusText) {
        statusText.textContent = '✓ បាន Upload ជោគជ័យ!';
        statusText.className = 'text-[10px] text-emerald-400 font-bold';
      }
      showToast('បាន Upload រូបភាព Tier Product រួចរាល់!');
    } else {
      if (statusText) {
        statusText.textContent = '✓ រូបភាពរួចរាល់';
        statusText.className = 'text-[10px] text-purple-300 font-bold';
      }
    }
  } catch (err) {
    if (statusText) {
      statusText.textContent = 'Upload បរាជ័យ';
      statusText.className = 'text-[10px] text-red-400 font-bold';
    }
    showToast('Failed to process tier image');
  }
}

function removeTierProductImageUpload() {
  state.adminTierProductImage = '';
  const fileInput = document.getElementById('tierProdFileInput');
  if (fileInput) fileInput.value = '';
  const hiddenInput = document.getElementById('tierProdImage');
  if (hiddenInput) hiddenInput.value = '';
  const emptyWrap = document.getElementById('tierProdUploadEmpty');
  if (emptyWrap) emptyWrap.classList.remove('hidden');
  const previewWrap = document.getElementById('tierProdPreviewWrap');
  if (previewWrap) previewWrap.classList.add('hidden');
  const previewImg = document.getElementById('tierProdPreviewImg');
  if (previewImg) previewImg.src = '';
}

async function handleBroadcastFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const emptyWrap = document.getElementById('broadcastUploadEmpty');
  const previewWrap = document.getElementById('broadcastPreviewWrap');
  const previewImg = document.getElementById('broadcastPreviewImg');
  const urlInput = document.getElementById('broadcastPhotoInput');

  try {
    if (emptyWrap) emptyWrap.classList.add('hidden');
    if (previewWrap) previewWrap.classList.remove('hidden');

    const compressedDataUrl = await compressAndConvertImage(file, 1200, 0.85);
    if (previewImg) previewImg.src = compressedDataUrl;

    const result = await uploadImageToServer(compressedDataUrl, file.name);
    if (result.success && result.url) {
      if (urlInput) urlInput.value = result.url;
      showToast('បាន Upload Banner រួចរាល់!');
    } else {
      if (urlInput) urlInput.value = compressedDataUrl;
    }
  } catch (err) {
    showToast('Failed to upload banner');
  }
}

function removeBroadcastUpload() {
  const fileInput = document.getElementById('broadcastFileInput');
  if (fileInput) fileInput.value = '';
  const urlInput = document.getElementById('broadcastPhotoInput');
  if (urlInput) urlInput.value = '';
  const emptyWrap = document.getElementById('broadcastUploadEmpty');
  if (emptyWrap) emptyWrap.classList.remove('hidden');
  const previewWrap = document.getElementById('broadcastPreviewWrap');
  if (previewWrap) previewWrap.classList.add('hidden');
  const previewImg = document.getElementById('broadcastPreviewImg');
  if (previewImg) previewImg.src = '';
}

// -------------------------------------------------------------
// Admin Tier / Duration Builder Helpers
// -------------------------------------------------------------
function toggleTiersSection(prefix) {
  const checkbox = document.getElementById(`${prefix}ProdHasTiers`);
  const container = document.getElementById(`${prefix}ProdTiersContainer`);
  const addBtn = document.getElementById(`${prefix}ProdAddTierBtn`);
  const singleKeyGroup = document.getElementById(`${prefix}ProdSingleKeyGroup`);

  if (!checkbox || !container) return;

  if (checkbox.checked) {
    container.classList.remove('hidden');
    if (addBtn) addBtn.classList.remove('hidden');
    if (singleKeyGroup) singleKeyGroup.classList.add('hidden');

    // If empty, start with 1 empty tier - admin adds more with + button
    if (container.children.length === 0) {
      addNewTierRow(prefix, {});
    }
  } else {
    container.classList.add('hidden');
    if (addBtn) addBtn.classList.add('hidden');
    if (singleKeyGroup) singleKeyGroup.classList.remove('hidden');
  }
}

function addNewTierRow(prefix, tierData = {}) {
  const container = document.getElementById(`${prefix}ProdTiersContainer`);
  if (!container) return;

  const tierId = tierData.id || ('tier_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
  const name = tierData.name || '';
  const price = tierData.price !== undefined ? tierData.price : '';
  const resellerPrice = (tierData.resellerPrice !== undefined && tierData.resellerPrice !== null) ? tierData.resellerPrice : '';
  const existingKeys = Array.isArray(tierData.keys) ? tierData.keys : [];

  const row = document.createElement('div');
  row.className = 'admin-tier-row space-y-2';
  row.dataset.tierId = tierId;

  row.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-yellow-400 shrink-0"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span class="text-xs font-bold text-white truncate">Tier / រយៈពេល</span>
      </div>
      <button type="button" onclick="this.closest('.admin-tier-row').remove()" class="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 cursor-pointer">
        លុប Tier
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div>
        <label class="text-[10px] text-gray-300 block mb-0.5">ឈ្មោះរយៈពេល (Duration) *</label>
        <input type="text" class="tier-input-name admin-input text-xs" placeholder="e.g. 1 ថ្ងៃ (1 Day)" value="${escapeHtml(name)}" required>
      </div>
      <div>
        <label class="text-[10px] text-gray-300 block mb-0.5">តម្លៃធម្មតា ($) *</label>
        <input type="number" step="0.01" min="0.01" class="tier-input-price admin-input text-xs font-bold text-yellow-400" placeholder="0.99" value="${price}" required>
      </div>
      <div>
        <label class="text-[10px] text-gray-300 block mb-0.5">តម្លៃ Reseller ($)</label>
        <input type="number" step="0.01" min="0.01" class="tier-input-reseller admin-input text-xs font-bold text-emerald-400" placeholder="0.50 (Optional)" value="${resellerPrice}">
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="text-[10px] text-gray-300">License Keys សម្រាប់រយៈពេលនេះ (១ បន្ទាត់ = ១ Key) :</label>
        <span class="text-[10px] font-mono font-bold text-emerald-400 tier-stock-counter">ស្តុក: ${existingKeys.length} Keys</span>
      </div>
      <textarea class="tier-input-keys admin-textarea font-mono text-xs" rows="2" placeholder="${existingKeys.length > 0 ? 'បន្ថែម Keys ថ្មី ឬកែប្រែ...' : 'ASTORR-KEY-1111&#10;ASTORR-KEY-2222'}" oninput="const c = this.closest('.admin-tier-row').querySelector('.tier-stock-counter'); if (c) { const count = this.value.split('\\n').map(k=>k.trim()).filter(Boolean).length; c.textContent = 'ស្តុក: ' + count + ' Keys'; }">${escapeHtml(existingKeys.join('\n'))}</textarea>
    </div>
  `;

  container.appendChild(row);
}

function collectTiersData(prefix) {
  const container = document.getElementById(`${prefix}ProdTiersContainer`);
  if (!container) return [];

  const rows = container.querySelectorAll('.admin-tier-row');
  const tiers = [];

  rows.forEach(row => {
    const tierId = row.dataset.tierId || ('tier_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const nameInput = row.querySelector('.tier-input-name');
    const priceInput = row.querySelector('.tier-input-price');
    const resellerInput = row.querySelector('.tier-input-reseller');
    const keysTextarea = row.querySelector('.tier-input-keys');

    const name = nameInput ? nameInput.value.trim() : '';
    const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;
    const resellerPrice = resellerInput && resellerInput.value !== '' ? parseFloat(resellerInput.value) || 0 : 0;
    const rawKeys = keysTextarea ? keysTextarea.value : '';
    const keys = rawKeys.split('\n').map(k => k.trim()).filter(Boolean);

    if (name) {
      tiers.push({
        id: tierId,
        name,
        price,
        resellerPrice,
        keys
      });
    }
  });

  return tiers;
}

// Handler for Tab 1: Single Product Form
async function handleAdminAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('newProdName').value;
  const price = document.getElementById('newProdPrice').value;
  const resellerPrice = document.getElementById('newProdResellerPrice')?.value || '';
  const category = document.getElementById('newProdCategory').value;
  const platform = document.getElementById('newProdPlatform').value;
  const badge = document.getElementById('newProdBadge').value;
  const image = state.adminNewProductImage || document.getElementById('newProdImage')?.value || '/assets/logo.jpg';
  const groupLink = document.getElementById('newProdGroupLink').value;
  const description = document.getElementById('newProdDesc').value;
  const rawKeys = document.getElementById('newProdKeys').value;

  const keys = rawKeys.split('\n').map(k => k.trim()).filter(Boolean);

  showToast('⏳ កំពុងបញ្ចូលទំនិញធម្មតាថ្មី...');

  try {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({
        name,
        price: price ? parseFloat(price) : 0,
        resellerPrice: (resellerPrice !== '' && !isNaN(parseFloat(resellerPrice))) ? parseFloat(resellerPrice) : 0,
        category,
        platform,
        badge,
        image,
        groupLink,
        description,
        keys,
        tiers: []
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('បញ្ចូលទំនិញធម្មតាជោគជ័យ!');
      document.getElementById('adminProductForm').reset();
      const resellerInput = document.getElementById('newProdResellerPrice');
      if (resellerInput) resellerInput.value = '';
      removeProductImageUpload();
      await fetchProducts();
      switchAdminTab('inventory');
    } else {
      showToast(data.error || 'Failed to add product');
    }
  } catch (err) {
    showToast('Network error adding product');
  }
}

// Handler for Tab 2: Tier / Duration Product Form
async function handleAdminAddTierProduct(e) {
  e.preventDefault();
  const name = document.getElementById('tierProdName').value;
  const category = document.getElementById('tierProdCategory').value;
  const platform = document.getElementById('tierProdPlatform').value;
  const badge = document.getElementById('tierProdBadge').value;
  const image = state.adminTierProductImage || document.getElementById('tierProdImage')?.value || '/assets/logo.jpg';
  const groupLink = document.getElementById('tierProdGroupLink').value;
  const description = document.getElementById('tierProdDesc').value;

  const tiers = collectTiersData('tier');
  if (tiers.length === 0) {
    showToast('សូមបញ្ចូលយ៉ាងហោចណាស់ 1 Tier / រយៈពេល (ឧ. 1 ថ្ងៃ, 7 ថ្ងៃ...)!');
    return;
  }

  showToast('⏳ កំពុងបញ្ចូល Tier Product ថ្មី...');

  try {
    const minPrice = Math.min(...tiers.map(t => parseFloat(t.price) || 0));
    const tierResellerPrices = tiers.map(t => parseFloat(t.resellerPrice) || 0).filter(p => p > 0);
    const minResellerPrice = tierResellerPrices.length > 0 ? Math.min(...tierResellerPrices) : 0;

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({
        name,
        price: minPrice,
        resellerPrice: minResellerPrice,
        category,
        platform,
        badge,
        image,
        groupLink,
        description,
        keys: [],
        tiers
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('បញ្ចូល Tier Product ជោគជ័យ!');
      document.getElementById('adminTierProductForm').reset();
      removeTierProductImageUpload();
      const tiersContainer = document.getElementById('tierProdTiersContainer');
      if (tiersContainer) tiersContainer.innerHTML = '';
      await fetchProducts();
      switchAdminTab('inventory');
    } else {
      showToast(data.error || 'Failed to add tier product');
    }
  } catch (err) {
    showToast('Network error adding tier product');
  }
}

// -------------------------------------------------------------
// Inventory Management (Edit, Add Keys, Delete Product)
// -------------------------------------------------------------
function renderInventoryList() {
  const container = document.getElementById('adminInventoryList');
  if (!container) return;

  const countBadge = document.getElementById('adminInventoryCount');
  if (countBadge) countBadge.textContent = `ទំនិញទាំងអស់ (${state.products.length})`;

  if (state.products.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">គ្មានទំនិញក្នុងស្តុកនៅឡើយ</p>';
    return;
  }

  container.innerHTML = state.products.map(p => {
    const isTiered = !!(p.hasTiers && Array.isArray(p.tiers) && p.tiers.length > 0);
    const totalKeys = isTiered
      ? p.tiers.reduce((sum, t) => sum + (Array.isArray(t.keys) ? t.keys.length : 0), 0)
      : (Array.isArray(p.keys) ? p.keys.length : 0);

    const tierPills = isTiered ? `
      <div class="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-purple-500/20">
        ${p.tiers.map(t => {
      const tStock = Array.isArray(t.keys) ? t.keys.length : 0;
      return `
            <span class="text-[10px] bg-purple-950/70 border border-purple-500/30 px-2 py-0.5 rounded-md text-gray-200 flex items-center gap-1.5">
              <span class="text-white font-bold">${escapeHtml(t.name)}:</span>
              <span class="font-mono font-bold ${tStock > 0 ? 'text-emerald-400' : 'text-red-400'}">${tStock} Keys</span>
              <span class="text-yellow-400 font-semibold">($${parseFloat(t.price).toFixed(2)})</span>
            </span>
          `;
    }).join('')}
      </div>
    ` : '';

    return `
      <div class="bg-black/60 p-3 rounded-xl border border-purple-500/30 transition hover:border-purple-400/50 space-y-2.5">
        <!-- Top: Image + Info -->
        <div class="flex items-start gap-2.5">
          <img src="${escapeHtml(p.image || '/assets/logo.jpg')}" alt="Item" class="w-12 h-12 rounded-lg object-cover border border-purple-500/40 shrink-0" onerror="this.src='/assets/logo.jpg'">
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1.5 min-w-0">
                ${isTiered ? '<span class="text-[9px] bg-yellow-500/20 text-yellow-300 px-1 rounded border border-yellow-500/40 font-bold shrink-0">TIER</span>' : '<span class="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded border border-purple-500/40 font-bold shrink-0">SINGLE</span>'}
                <strong class="text-xs text-white truncate font-bold">${escapeHtml(p.name)}</strong>
              </div>
              <span class="text-[10px] text-emerald-400 font-mono font-bold shrink-0 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">ស្តុក: ${totalKeys}</span>
            </div>
            <!-- Badges row -->
            <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
              ${isTiered ? `
                <span class="text-xs text-yellow-400 font-black">ទំនិញ: $${parseFloat(p.price || 0).toFixed(2)}</span>
                <span class="text-[10px] text-amber-300 font-bold bg-purple-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">Tier ចាប់ពី $${Math.min(...p.tiers.map(t => parseFloat(t.price) || 0)).toFixed(2)}</span>
                <span class="text-[9px] bg-purple-900/60 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold">${p.tiers.length} Tiers</span>
              ` : `
                <span class="text-xs text-yellow-400 font-black">$${parseFloat(p.price).toFixed(2)}</span>
                ${p.resellerPrice && parseFloat(p.resellerPrice) > 0 ? `
                  <span class="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40 inline-flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
                    <span>$${parseFloat(p.resellerPrice).toFixed(2)}</span>
                  </span>
                ` : `
                  <span class="text-[9px] text-gray-400 bg-gray-900/50 px-1.5 py-0.5 rounded border border-gray-700/50">គ្មានតម្លៃ Reseller</span>
                `}
              `}
              <span class="text-[9px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 font-medium">${escapeHtml(p.category || 'VIP MOD')}</span>
            </div>
          </div>
        </div>

        ${tierPills}

        <!-- Bottom: Actions row (Full width, responsive) -->
        <div class="flex items-center gap-1.5 pt-1 border-t border-purple-500/20">
          <button type="button" class="flex-1 bg-purple-600/70 hover:bg-purple-600 text-white text-[11px] font-bold py-1.5 rounded-lg border border-purple-400/40 flex items-center justify-center gap-1.5 transition active:scale-95" onclick="openEditProductModal('${p.id}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <span>កែប្រែ</span>
          </button>
          <button type="button" class="flex-1 bg-indigo-600/60 hover:bg-indigo-600 text-indigo-100 text-[11px] font-bold py-1.5 rounded-lg border border-indigo-400/40 flex items-center justify-center gap-1 transition active:scale-95" onclick="promptAddKeys('${p.id}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Keys</span>
          </button>
          <button type="button" class="bg-red-600/40 hover:bg-red-600 text-red-200 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-red-500/40 flex items-center justify-center transition active:scale-95" onclick="deleteProduct('${p.id}')" title="លុបទំនិញ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Edit Product Modal Logic
// -------------------------------------------------------------
function openEditProductModal(prodId) {
  const p = state.products.find(x => x.id === prodId);
  if (!p) return;

  populateCategoryDropdowns();

  document.getElementById('editProdId').value = p.id;
  document.getElementById('editProdName').value = p.name || '';
  document.getElementById('editProdPrice').value = p.price || '';
  const resellerInput = document.getElementById('editProdResellerPrice');
  if (resellerInput) resellerInput.value = (p.resellerPrice !== undefined && p.resellerPrice !== 0) ? p.resellerPrice : '';
  document.getElementById('editProdCategory').value = p.category || 'VIP MOD';
  document.getElementById('editProdPlatform').value = p.platform || 'iOS & Android';
  document.getElementById('editProdBadge').value = p.badge || 'រហ័ស (Instant)';
  document.getElementById('editProdGroupLink').value = p.groupLink || '';
  document.getElementById('editProdDesc').value = p.description || '';

  const hasTiers = !!(p.hasTiers && Array.isArray(p.tiers) && p.tiers.length > 0);
  const editCheckbox = document.getElementById('editProdHasTiers');
  const editContainer = document.getElementById('editProdTiersContainer');
  const editAddBtn = document.getElementById('editProdAddTierBtn');
  const editSingleKeyGroup = document.getElementById('editProdSingleKeyGroup');

  if (editContainer) editContainer.innerHTML = '';

  if (editCheckbox) editCheckbox.checked = hasTiers;
  if (hasTiers) {
    if (editContainer) editContainer.classList.remove('hidden');
    if (editAddBtn) editAddBtn.classList.remove('hidden');
    if (editSingleKeyGroup) editSingleKeyGroup.classList.add('hidden');
    p.tiers.forEach(t => addNewTierRow('edit', t));
  } else {
    if (editContainer) editContainer.classList.add('hidden');
    if (editAddBtn) editAddBtn.classList.add('hidden');
    if (editSingleKeyGroup) editSingleKeyGroup.classList.remove('hidden');
  }

  const existingKeys = Array.isArray(p.keys) ? p.keys.join('\n') : '';
  document.getElementById('editProdKeys').value = existingKeys;

  state.adminEditProductImage = p.image || '/assets/logo.jpg';
  document.getElementById('editProdImage').value = p.image || '';
  document.getElementById('editProdPreviewImg').src = p.image || '/assets/logo.jpg';
  document.getElementById('editProdUploadStatus').textContent = 'JPG, PNG, WEBP';

  document.getElementById('adminEditProductModal').classList.remove('hidden');
}

function closeEditProductModal() {
  document.getElementById('adminEditProductModal').classList.add('hidden');
  state.adminEditProductImage = '';
}

async function handleEditProductImageFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const previewImg = document.getElementById('editProdPreviewImg');
  const statusText = document.getElementById('editProdUploadStatus');
  const hiddenInput = document.getElementById('editProdImage');

  try {
    statusText.textContent = '⏳ កំពុងដំណើរការ...';
    const compressedDataUrl = await compressAndConvertImage(file);
    if (previewImg) previewImg.src = compressedDataUrl;

    state.adminEditProductImage = compressedDataUrl;
    if (hiddenInput) hiddenInput.value = compressedDataUrl;

    const result = await uploadImageToServer(compressedDataUrl, file.name);
    if (result.success && result.url) {
      state.adminEditProductImage = result.url;
      if (hiddenInput) hiddenInput.value = result.url;
      statusText.textContent = '✓ បាន Upload រួចរាល់!';
    } else {
      statusText.textContent = '✓ រូបភាពរួចរាល់';
    }
  } catch (err) {
    statusText.textContent = 'Upload បរាជ័យ';
  }
}

async function handleAdminSaveEditProduct(e) {
  e.preventDefault();
  const prodId = document.getElementById('editProdId').value;
  if (!prodId) return;

  const name = document.getElementById('editProdName').value;
  const price = document.getElementById('editProdPrice').value;
  const resellerPrice = document.getElementById('editProdResellerPrice')?.value || '';
  const category = document.getElementById('editProdCategory').value;
  const platform = document.getElementById('editProdPlatform').value;
  const badge = document.getElementById('editProdBadge').value;
  const groupLink = document.getElementById('editProdGroupLink').value;
  const description = document.getElementById('editProdDesc').value;
  const rawKeys = document.getElementById('editProdKeys').value;
  const image = state.adminNewProductImage || state.adminEditProductImage || document.getElementById('editProdImage')?.value;

  const hasTiers = document.getElementById('editProdHasTiers')?.checked || false;
  let tiers = [];
  if (hasTiers) {
    tiers = collectTiersData('edit');
    if (tiers.length === 0) {
      showToast('សូមបញ្ចូលយ៉ាងហោចណាស់ 1 Tier!');
      return;
    }
  }

  const keys = rawKeys.split('\n').map(k => k.trim()).filter(Boolean);

  showToast('កំពុងរក្សាទុក...');

  try {
    const res = await fetch(`/api/admin/products/${prodId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({
        name,
        price: price ? parseFloat(price) : 0,
        resellerPrice: resellerPrice ? parseFloat(resellerPrice) : 0,
        category,
        platform,
        badge,
        image,
        groupLink,
        description,
        keys,
        tiers
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('បានកែប្រែទំនិញជោគជ័យ!');
      closeEditProductModal();
      await fetchProducts();
      renderInventoryList();
    } else {
      showToast(data.error || 'Failed to update product');
    }
  } catch (err) {
    showToast('Network error updating product');
  }
}

async function promptAddKeys(prodId) {
  const p = state.products.find(x => x.id === prodId);
  if (!p) return;

  const isTiered = !!(p.hasTiers && Array.isArray(p.tiers) && p.tiers.length > 0);

  if (isTiered) {
    const tierChoices = p.tiers.map((t, idx) => `${idx + 1}. ${t.name} (ស្តុកបច្ចុប្បន្ន: ${Array.isArray(t.keys) ? t.keys.length : 0} Keys)`).join('\n');
    const selectedNum = prompt(`ជ្រើសរើសលេខ Tier ដើម្បីបញ្ចូល License Keys:\n${tierChoices}\n\nបញ្ចូលលេខ (1-${p.tiers.length})៖`);
    if (!selectedNum) return;
    const tierIdx = parseInt(selectedNum) - 1;
    const targetTier = p.tiers[tierIdx];
    if (!targetTier) {
      showToast('លេខ Tier មិនត្រឹមត្រូវ!');
      return;
    }

    const keysStr = prompt(`បញ្ចូល License Keys សម្រាប់ "${targetTier.name}" (មួយ Key មួយបន្ទាត់)៖`);
    if (!keysStr) return;

    try {
      const res = await fetch(`/api/admin/products/${prodId}/tier-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': state.user.id || '6805487598',
          'x-admin-auth': 'true'
        },
        body: JSON.stringify({ tierId: targetTier.id, keys: keysStr })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`បានបន្ថែម Keys ទៅកាន់ "${targetTier.name}" ជោគជ័យ!`);
        await fetchProducts();
        renderInventoryList();
      } else {
        showToast(data.error || 'បរាជ័យក្នុងការបន្ថែម Keys');
      }
    } catch (err) {
      showToast('Network error adding tier keys');
    }
    return;
  }

  // Non-tiered product
  const keysStr = prompt('បញ្ចូល License Keys (មួយ Key មួយបន្ទាត់)៖');
  if (!keysStr) return;

  try {
    const res = await fetch(`/api/admin/products/${prodId}/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ keys: keysStr })
    });
    const data = await res.json();
    if (data.success) {
      showToast('បានបន្ថែម Keys ជោគជ័យ!');
      await fetchProducts();
      renderInventoryList();
    } else {
      showToast(data.error || 'Failed to add keys');
    }
  } catch (err) {
    showToast('Failed to add keys');
  }
}

async function deleteProduct(prodId) {
  if (!confirm('តើអ្នកពិតជាចង់លុបទំនិញនេះមែនទេ?')) return;
  try {
    const res = await fetch(`/api/admin/products/${prodId}`, {
      method: 'DELETE',
      headers: {
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      }
    });
    const data = await res.json();
    if (data.success) {
      showToast('បានលុបទំនិញរួចរាល់!');
      fetchProducts();
    }
  } catch (err) {
    showToast('Failed to delete product');
  }
}

// -------------------------------------------------------------
// Category Management (Admin CRUD)
// -------------------------------------------------------------
function renderAdminCategoryList() {
  const container = document.getElementById('adminCategoryList');
  if (!container) return;

  if (state.categories.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 py-3 text-center">មិនទាន់មាន Category នៅឡើយទេ</p>';
    return;
  }

  container.innerHTML = state.categories.map(cat => {
    const count = state.products.filter(p => p.category === cat).length;
    return `
      <div class="bg-black/50 p-2.5 rounded-xl border border-purple-500/25 flex items-center justify-between transition hover:border-purple-400/40">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
            ${getCategorySvgIcon(cat)}
          </span>
          <div>
            <strong class="text-xs text-white block">${escapeHtml(cat)}</strong>
            <span class="text-[9px] text-gray-400">${count} មុខទំនិញ</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="editCategoryPrompt('${escapeHtml(cat)}')" class="bg-purple-900/60 hover:bg-purple-700 text-purple-200 text-[10px] font-bold px-2 py-1 rounded-lg border border-purple-500/30 flex items-center gap-1 transition">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <span>កែឈ្មោះ</span>
          </button>
          <button type="button" onclick="deleteCategoryConfirm('${escapeHtml(cat)}')" class="bg-red-600/30 hover:bg-red-600 text-red-200 text-[10px] font-bold p-1 rounded-lg border border-red-500/40 transition" title="លុប Category">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function handleAdminAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById('newCategoryName');
  const name = input?.value?.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`បានបន្ថែម Category៖ "${name}"`);
      input.value = '';
      await fetchCategories();
    } else {
      showToast(data.error || 'Failed to add category');
    }
  } catch (err) {
    showToast('Network error adding category');
  }
}

async function editCategoryPrompt(oldName) {
  const newName = prompt(`កែប្រែឈ្មោះ Category ថ្មីសម្រាប់ "${oldName}"៖`, oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;

  try {
    const res = await fetch('/api/admin/categories', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ oldName, newName: newName.trim() })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`បានប្តូរឈ្មោះ Category ទៅ៖ "${newName.trim()}"`);
      if (state.selectedCategory === oldName) {
        state.selectedCategory = newName.trim();
      }
      await fetchCategories();
      await fetchProducts();
    } else {
      showToast(data.error || 'Failed to update category');
    }
  } catch (err) {
    showToast('Network error updating category');
  }
}

async function deleteCategoryConfirm(catName) {
  if (!confirm(`តើអ្នកពិតជាចង់លុប Category "${catName}" មែនទេ?`)) return;

  try {
    const res = await fetch('/api/admin/categories', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ name: catName })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`បានលុប Category៖ "${catName}"`);
      if (state.selectedCategory === catName) {
        state.selectedCategory = 'ALL';
      }
      await fetchCategories();
      await fetchProducts();
    } else {
      showToast(data.error || 'Failed to delete category');
    }
  } catch (err) {
    showToast('Network error deleting category');
  }
}

// -------------------------------------------------------------
// Broadcast & Stats
// -------------------------------------------------------------
async function handleAdminBroadcast(e) {
  e.preventDefault();
  const text = document.getElementById('broadcastTextInput').value;
  const photoUrl = document.getElementById('broadcastPhotoInput').value;
  const statusElem = document.getElementById('broadcastStatus');

  statusElem.innerHTML = '<span class="text-yellow-400">កំពុងផ្សាយដំណឹង...</span>';

  try {
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ message: text, photoUrl })
    });

    const data = await res.json();
    if (data.success) {
      statusElem.innerHTML = `<span class="text-emerald-400 font-bold">បានផ្ញើជោគជ័យ៖ ${data.sentCount} នាក់ (បរាជ័យ: ${data.failedCount})</span>`;
      showToast('បានផ្សាយដំណឹងរួចរាល់!');
    } else {
      statusElem.innerHTML = `<span class="text-red-400">${data.error || 'Failed'}</span>`;
    }
  } catch (err) {
    statusElem.innerHTML = '<span class="text-red-400">Network error</span>';
  }
}

async function loadAdminStats() {
  const container = document.getElementById('adminStatsContent');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/stats', {
      headers: {
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      }
    });
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      container.innerHTML = `
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-black/60 p-3 rounded-xl border border-purple-500/30 text-center">
            <span class="text-[10px] text-gray-400 block mb-1">អតិថិជនសរុប</span>
            <span class="text-2xl font-black text-white">${s.totalUsers}</span>
          </div>
          <div class="bg-black/60 p-3 rounded-xl border border-purple-500/30 text-center">
            <span class="text-[10px] text-gray-400 block mb-1">មុខទំនិញ</span>
            <span class="text-2xl font-black text-purple-400">${s.totalProducts}</span>
          </div>
          <div class="bg-black/60 p-3 rounded-xl border border-purple-500/30 text-center">
            <span class="text-[10px] text-gray-400 block mb-1">ការទិញជោគជ័យ</span>
            <span class="text-2xl font-black text-emerald-400">${s.paidOrders} / ${s.totalOrders}</span>
          </div>
          <div class="bg-black/60 p-3 rounded-xl border border-purple-500/30 text-center">
            <span class="text-[10px] text-gray-400 block mb-1">ចំណូលសរុប</span>
            <span class="text-2xl font-black text-yellow-400">$${s.totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      `;
    }
  } catch (e) {
    container.innerHTML = '<p class="text-xs text-red-400">Failed to load statistics</p>';
  }
}

// -------------------------------------------------------------
// 11. User Orders History
// -------------------------------------------------------------
function renderOrderHistory(orders) {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">មិនទាន់មានប្រវត្តិទិញទំនិញនៅឡើយទេ</p>';
    return;
  }

  container.innerHTML = orders.map(o => {
    const isPaid = o.status === 'PAID';
    const statusPill = isPaid
      ? '<span class="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">PAID</span>'
      : '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold">PENDING</span>';

    return `
      <div class="bg-black/50 p-3 rounded-xl border border-purple-500/25">
        <div class="flex items-center justify-between mb-2">
          <strong class="text-xs text-white">${escapeHtml(o.productName)}</strong>
          ${statusPill}
        </div>
        <div class="text-[11px] text-gray-400 mb-2">
          <span>តម្លៃ៖ $${parseFloat(o.amount).toFixed(2)} USD</span>
          <span class="float-right text-[10px]">${new Date(o.createdAt).toLocaleDateString()}</span>
        </div>
        ${o.assignedKey ? `
          <div class="bg-purple-950/60 p-2 rounded-lg border border-dashed border-purple-500/40 text-[11px] font-mono text-purple-300 flex items-center justify-between">
            <span class="select-all" style="white-space: pre-wrap; word-break: break-all;">${escapeHtml(o.assignedKey)}</span>
            <button class="text-[10px] bg-purple-700/60 text-white px-2 py-0.5 rounded shrink-0 ml-2" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent.trim()); showToast('Copied!');">Copy</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// 12. PC Mouse Horizontal Wheel & Drag Scroll Helper
// -------------------------------------------------------------
function initCategoryScroll() {
  const catScroll = document.getElementById('categoryList');
  if (!catScroll) return;

  // Mouse wheel horizontal scrolling on PC
  catScroll.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      catScroll.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Mouse drag-to-scroll on PC
  let isDown = false;
  let startX;
  let scrollLeft;

  catScroll.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - catScroll.offsetLeft;
    scrollLeft = catScroll.scrollLeft;
  });

  catScroll.addEventListener('mouseleave', () => {
    isDown = false;
  });

  catScroll.addEventListener('mouseup', () => {
    isDown = false;
  });

  catScroll.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - catScroll.offsetLeft;
    const walk = (x - startX) * 1.5;
    catScroll.scrollLeft = scrollLeft - walk;
  });
}

// -------------------------------------------------------------
// Welcome Modal
function closeWelcomeModal() {
  const modal = document.getElementById('welcomeModal');
  if (modal) modal.classList.add('hidden');
}

function showWelcomeModal() {
  const modal = document.getElementById('welcomeModal');
  if (modal) modal.classList.remove('hidden');
}

// 13. UI Event Listeners & Bootstrapping
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  fetchCategories();
  fetchProducts();
  fetchUserProfile();
  initCategoryScroll();

  // Live background sync for Reseller status & balance (every 4s)
  setInterval(() => {
    fetchUserProfile();
  }, 4000);

  // Sync on tab/app re-entry or visibility change
  window.addEventListener('focus', () => fetchUserProfile(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchUserProfile(true);
    }
  });

  if (window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.onEvent?.('viewportChanged', () => fetchUserProfile(true));
    } catch (e) {}
  }

  // Show welcome popup on app start
  showWelcomeModal();

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderProducts();
    });
  }

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedFilter = btn.getAttribute('data-filter') || 'all';
      renderProducts();
    });
  });

  // Header & Navigation buttons
  document.getElementById('btnOpenDeposit')?.addEventListener('click', () => switchNavTab('wallet'));
  document.getElementById('btnAdminNav')?.addEventListener('click', () => switchNavTab('admin'));
  document.getElementById('btnDepositPay')?.addEventListener('click', () => handleWalletDeposit());

  // Language switch toggle
  const langBtn = document.getElementById('btnToggleLang');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      state.lang = state.lang === 'km' ? 'en' : 'km';
      langBtn.textContent = state.lang === 'km' ? 'KH' : 'EN';
      showToast(`Language: ${state.lang.toUpperCase()}`);
    });
  }
});

// Toast Helper
let toastTimeout = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    t.classList.add('hidden');
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// 14. Reseller Application & UI System
// -------------------------------------------------------------
async function handleResellerRequestClick() {
  // Always fetch real-time state from server before deciding
  await fetchUserProfile(true);

  if (state.user.isReseller) {
    showToast('លោកអ្នកជា VIP Reseller រួចរាល់ហើយ!');
    return;
  }

  if (state.user.resellerStatus === 'pending') {
    openResellerModal(
      'ស្នើសុំធ្វើជា VIP Reseller',
      'សំណើរបស់អ្នកកំពុងស្ថិតក្នុងការពិនិត្យពី Admin'
    );
    return;
  }

  let confirmText = 'តើអ្នកពិតជាចង់ស្នើសុំធ្វើជា VIP Reseller ដើម្បីទទួលបានតម្លៃពិសេសបោះដុំមែនទេ?';
  if (state.user.resellerStatus === 'rejected') {
    confirmText = 'សំណើមុនត្រូវបាន Cancel ដោយ Admin។ តើអ្នកចង់ស្នើសុំធ្វើជា VIP Reseller ម្តងទៀតមែនទេ?';
  } else if (state.user.resellerStatus === 'revoked') {
    confirmText = 'គណនីធ្លាប់ត្រូវបានដកសិទ្ធិ។ តើអ្នកចង់ដាក់សំណើសុំ VIP Reseller ម្តងទៀតមែនទេ?';
  }

  const confirmReq = confirm(confirmText);
  if (!confirmReq) return;

  showToast('កំពុងផ្ញើសំណើ Reseller ជូន Admin...');

  try {
    const res = await fetch('/api/request-reseller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: state.user.id || '6805487598'
      })
    });

    const data = await res.json();
    if (data.success) {
      state.user.resellerStatus = 'pending';
      updateResellerUI();
      openResellerModal(
        'ស្នើសុំធ្វើជា VIP Reseller',
        'សំណើត្រូវបានផ្ញើជូន Admin រួចរាល់ហើយ!'
      );
    } else {
      showToast(data.message || data.error || 'Failed to submit reseller request');
      await fetchUserProfile(true);
    }
  } catch (e) {
    console.error('Reseller request error:', e);
    showToast('Network error submitting request');
  }
}

function openResellerModal(title, subtitle) {
  const modal = document.getElementById('resellerRequestModal');
  if (!modal) return;
  if (title) {
    const titleEl = document.getElementById('resellerModalTitle');
    if (titleEl) titleEl.textContent = title;
  }
  if (subtitle) {
    const subEl = document.getElementById('resellerModalSubtitle');
    if (subEl) subEl.textContent = subtitle;
  }
  modal.classList.remove('hidden');
}

function closeResellerModal() {
  const modal = document.getElementById('resellerRequestModal');
  if (modal) modal.classList.add('hidden');
}

function updateResellerUI() {
  const tag = document.getElementById('userResellerTag');
  const headerBtn = document.getElementById('txtHeaderReseller');
  const heroBtn = document.getElementById('btnRequestResellerHeroText');
  const statusChip = document.getElementById('resellerStatusChip');
  const statusDesc = document.getElementById('resellerStatusDesc');
  const supportTag = document.getElementById('supportResellerTag');
  const supportSub = document.getElementById('supportResellerSub');

  if (state.user.isReseller) {
    if (tag) tag.classList.remove('hidden');
    if (headerBtn) headerBtn.innerHTML = '<span class="inline-flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg> VIP Reseller</span>';
    if (heroBtn) heroBtn.innerHTML = '<span class="inline-flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg> VIP</span>';
    if (statusChip) {
      statusChip.innerHTML = '<span class="inline-flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg> សមាជិក VIP</span>';
      statusChip.className = 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
    if (statusDesc) statusDesc.textContent = 'អ្នកកំពុងទទួលបានតម្លៃពិសេស VIP Reseller លើគ្រប់ទំនិញ!';
    if (supportTag) supportTag.textContent = 'VIP Reseller';
    if (supportSub) supportSub.textContent = 'អ្នកទទួលបានតម្លៃពិសេស VIP Reseller រួចហើយ!';
  } else if (state.user.resellerStatus === 'pending') {
    if (tag) tag.classList.add('hidden');
    if (headerBtn) headerBtn.innerHTML = '<span class="inline-flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Pending</span>';
    if (heroBtn) heroBtn.innerHTML = '<span class="inline-flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> រង់ចាំ</span>';
    if (statusChip) {
      statusChip.innerHTML = '<span class="inline-flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> កំពុងរង់ចាំ Admin</span>';
      statusChip.className = 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
    if (statusDesc) statusDesc.textContent = 'សំណើរបស់អ្នកបានផ្ញើជូន Admin រួចហើយ សូមរង់ចាំការអនុម័ត!';
    if (supportTag) supportTag.textContent = 'Pending';
    if (supportSub) supportSub.textContent = 'សំណើរបស់អ្នកកំពុងរង់ចាំ Admin ពិនិត្យអនុម័ត';
  } else if (state.user.resellerStatus === 'rejected') {
    if (tag) tag.classList.add('hidden');
    if (headerBtn) headerBtn.textContent = 'Reseller';
    if (heroBtn) heroBtn.textContent = 'ស្នើសុំឡើងវិញ';
    if (statusChip) {
      statusChip.textContent = 'សំណើត្រូវបាន Cancel';
      statusChip.className = 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-300 border border-red-500/30';
    }
    if (statusDesc) statusDesc.textContent = 'សំណើ Reseller ត្រូវបាន Cancel ដោយ Admin (ចុចដើម្បីស្នើសុំឡើងវិញ)';
    if (supportTag) supportTag.textContent = 'Cancelled';
    if (supportSub) supportSub.textContent = 'សំណើត្រូវបាន Cancel — ចុចស្នើសុំដើម្បីដាក់ពាក្យម្តងទៀត';
  } else {
    if (tag) tag.classList.add('hidden');
    if (headerBtn) headerBtn.textContent = 'Reseller';
    if (heroBtn) heroBtn.textContent = 'ស្នើសុំ';
    if (statusChip) {
      statusChip.textContent = 'តម្លៃបោះដុំ';
      statusChip.className = 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30';
    }
    if (statusDesc) statusDesc.textContent = 'ចុចស្នើសុំដើម្បីទទួលបានតម្លៃពិសេស Reseller លើគ្រប់ទំនិញ!';
    if (supportTag) supportTag.textContent = 'VIP Rate';
    if (supportSub) supportSub.textContent = 'ទទួលបានតម្លៃបោះដុំពិសេសសម្រាប់អ្នកលក់បន្ត';
  }
}

// -------------------------------------------------------------
// 15. Admin Reseller Management System (In Mini App)
// -------------------------------------------------------------
async function fetchAdminResellers() {
  const container = document.getElementById('adminResellersList');
  if (!container) return;
  container.innerHTML = `
    <div class="text-center py-6 text-gray-400">
      <div class="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <span class="text-xs">កំពុងទាញយកបញ្ជី Resellers...</span>
    </div>
  `;

  try {
    const res = await fetch('/api/admin/resellers', {
      headers: {
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      }
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.resellers)) {
      container.innerHTML = `<p class="text-xs text-red-400 text-center py-4">${data.error || 'Failed to load resellers'}</p>`;
      return;
    }

    if (data.resellers.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-400 bg-black/40 rounded-xl border border-purple-500/20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-2 text-gray-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <p class="text-xs font-semibold">មិនទាន់មានសំណើ ឬសមាជិក Reseller នៅឡើយទេ</p>
          <span class="text-[10px] text-gray-500">នៅពេលមានអ្នកស្នើសុំ វានឹងបង្ហាញនៅទីនេះ</span>
        </div>
      `;
      return;
    }

    container.innerHTML = data.resellers.map(u => {
      const isApproved = !!u.isReseller;
      const isPending = u.resellerStatus === 'pending';
      let statusBadge = '';
      let actionButtons = '';

      if (isApproved) {
        statusBadge = `
          <span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
            <span>VIP Reseller</span>
          </span>
        `;
        actionButtons = `
          <button type="button" onclick="handleAdminRemoveReseller('${u.id}', '${escapeHtml(u.name || 'User')}')" class="bg-red-600/70 hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-red-500/40 flex items-center justify-center gap-1.5 transition active:scale-95">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>
            <span>ដកសិទ្ធិ Reseller (Remove)</span>
          </button>
        `;
      } else if (isPending) {
        statusBadge = `
          <span class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>រង់ចាំអនុម័ត (Pending)</span>
          </span>
        `;
        actionButtons = `
          <div class="flex items-center gap-2 w-full">
            <button type="button" onclick="handleAdminApproveReseller('${u.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-1.5 rounded-lg border border-emerald-400/40 flex items-center justify-center gap-1 transition active:scale-95">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>អនុម័ត (Approve)</span>
            </button>
            <button type="button" onclick="handleAdminRejectReseller('${u.id}')" class="flex-1 bg-red-600/70 hover:bg-red-600 text-white text-[11px] font-bold py-1.5 rounded-lg border border-red-500/40 flex items-center justify-center gap-1 transition active:scale-95">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              <span>បដិសេធ (Reject)</span>
            </button>
          </div>
        `;
      } else {
        statusBadge = `
          <span class="text-[10px] bg-gray-700/50 text-gray-300 border border-gray-600/40 px-2 py-0.5 rounded-full font-bold">
            បានដកសិទ្ធិ (Revoked)
          </span>
        `;
        actionButtons = `
          <button type="button" onclick="handleAdminApproveReseller('${u.id}')" class="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-purple-400/40 flex items-center justify-center gap-1.5 transition active:scale-95">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
            <span>អនុម័តឡើងវិញ (Re-Approve)</span>
          </button>
        `;
      }

      return `
        <div class="bg-black/60 p-3 rounded-xl border border-purple-500/30 transition hover:border-purple-400/50 space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 border border-purple-400/30">
                ${escapeHtml((u.name || 'U').charAt(0).toUpperCase())}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <strong class="text-xs text-white truncate">${escapeHtml(u.name || 'User')}</strong>
                  ${u.username ? `<span class="text-[10px] text-purple-300">@${escapeHtml(u.username)}</span>` : ''}
                </div>
                <div class="text-[10px] text-gray-400 font-mono mt-0.5">
                  ID: <span class="text-gray-300">${escapeHtml(String(u.id))}</span> • Balance: <span class="text-yellow-400 font-bold">$${parseFloat(u.balance || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div class="shrink-0">
              ${statusBadge}
            </div>
          </div>
          <div class="pt-1.5 border-t border-purple-500/20 flex justify-end">
            ${actionButtons}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = '<p class="text-xs text-red-400 text-center py-4">Network error loading resellers</p>';
  }
}

async function handleAdminRemoveReseller(telegramId, name) {
  if (!confirm(`តើអ្នកពិតជាចង់ដកសិទ្ធិ VIP Reseller ពី "${name}" (ID: ${telegramId}) មែនទេ?`)) return;

  try {
    const res = await fetch('/api/admin/remove-reseller', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ telegramId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('បានដកសិទ្ធិ Reseller រួចរាល់!');
      fetchAdminResellers();
      if (String(state.user.id) === String(telegramId)) {
        state.user.isReseller = false;
        state.user.resellerStatus = 'revoked';
        updateResellerUI();
        renderProducts();
      }
    } else {
      showToast(data.error || 'Failed to remove reseller');
    }
  } catch (e) {
    showToast('Network error removing reseller');
  }
}

async function handleAdminApproveReseller(telegramId) {
  try {
    const res = await fetch('/api/admin/approve-reseller', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ telegramId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('បានអនុម័ត VIP Reseller ជោគជ័យ!');
      fetchAdminResellers();
      if (String(state.user.id) === String(telegramId)) {
        state.user.isReseller = true;
        state.user.resellerStatus = 'approved';
        updateResellerUI();
        renderProducts();
      }
    } else {
      showToast(data.error || 'Failed to approve reseller');
    }
  } catch (e) {
    showToast('Network error approving reseller');
  }
}

async function handleAdminRejectReseller(telegramId) {
  try {
    const res = await fetch('/api/admin/reject-reseller', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': state.user.id || '6805487598',
        'x-admin-auth': 'true'
      },
      body: JSON.stringify({ telegramId })
    });
    const data = await res.json();
    if (data.success) {
      showToast('បានបដិសេធសំណើ Reseller រួចរាល់!');
      fetchAdminResellers();
    } else {
      showToast(data.error || 'Failed to reject reseller');
    }
  } catch (e) {
    showToast('Network error rejecting reseller');
  }
}

