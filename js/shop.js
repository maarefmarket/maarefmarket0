/* ================================================
   منطق صفحات المتجر
   ================================================ */

const Shop = (function() {
  'use strict';

  const { $, $$, escapeHtml, toast } = UI;

  // ==== نصوص الحالات ====
  const STATUS_LABELS = {
    unavailable: 'غير متوفر',
    limited: 'كمية محدودة'
  };

  // ==== بطاقة منتج ====
  function renderProductCard(p) {
    const cat = DataStore.getCategory(p.category);
    const catIcon = (cat && cat.icon) || '📦';
    const catName = (cat && cat.name) || '';
    const inCart = Cart.isInCart(p.id);
    const cartQty = Cart.getQty(p.id);
    const prices = Currency.allThreePrices(p.priceUSD);

    const isUnavailable = p.status === 'unavailable';
    const isLimited = p.status === 'limited';
    const maxQty = DataStore.getMaxQtyForProduct(p.id);
    const stockOut = isLimited && (Number(p.stock) || 0) <= 0;
    const disabled = isUnavailable || stockOut;

    // شارة الحالة
    let statusBadge = '';
    if (isUnavailable) {
      statusBadge = `<div class="p-status-badge unavailable">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        غير متوفر
      </div>`;
    } else if (isLimited) {
      statusBadge = `<div class="p-status-badge limited">⚡ متبقي ${Number(p.stock) || 0}</div>`;
    }

    // زر السلة
    const cartBtnDisabled = disabled ? 'disabled' : '';
    const cartBtnClass = inCart ? 'in-cart' : '';
    const cartBtnIcon = inCart
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;

    // منع + إن وصلنا الحد
    const canInc = !disabled && cartQty < maxQty;
    const canDec = cartQty > 0;

    // ملاحظة الحالة أسفل البطاقة
    let notice = '';
    if (isUnavailable) {
      notice = `<div class="p-unavailable-notice">هذا المنتج غير متوفر حاليًا</div>`;
    } else if (isLimited && cartQty >= maxQty && maxQty > 0) {
      notice = `<div class="p-stock-warn">⚠️ وصلت إلى الحد الأقصى (${maxQty})</div>`;
    }

    const description = p.description ? `<p class="p-desc">${escapeHtml(p.description)}</p>` : '';

    return `
      <article class="product-card ${isUnavailable ? 'unavailable' : ''}" data-product-id="${escapeHtml(p.id)}">
        <div class="p-img">
          ${statusBadge}
          ${p.image
            ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null;this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend', '<span>${escapeHtml(catIcon)}</span>')">`
            : `<span>${escapeHtml(catIcon)}</span>`
          }
        </div>
        <div class="p-body">
          <div class="p-cat">${escapeHtml(catIcon)} ${escapeHtml(catName)}</div>
          <h3 class="p-name">${escapeHtml(p.name)}</h3>
          ${description}
          <div class="p-prices">
            <div class="p-price-usd">${prices.USD}</div>
            <div class="p-price-other">
              <span>${prices.TRY}</span>
              <span>•</span>
              <span>${prices.SYP}</span>
            </div>
          </div>
          <div class="p-controls">
            <div class="p-qty">
              <button type="button" data-dec="${escapeHtml(p.id)}" ${canDec ? '' : 'disabled'} aria-label="نقص">−</button>
              <span class="qty-val" data-qty-of="${escapeHtml(p.id)}">${cartQty}</span>
              <button type="button" data-inc="${escapeHtml(p.id)}" ${canInc ? '' : 'disabled'} aria-label="زيادة">+</button>
            </div>
            <button type="button" class="p-cart-btn ${cartBtnClass}" data-add="${escapeHtml(p.id)}" ${cartBtnDisabled} aria-label="أضف للسلة">
              ${cartBtnIcon}
            </button>
          </div>
          ${notice}
        </div>
      </article>
    `;
  }

  // ==== حاوية المنتجات مع مستمعات الأحداث ====
  let currentContainer = null;

  function attachHandlers(el) {
    // زر السلة (يضيف 1 إذا كان 0، أو يعرض تنبيه)
    $$('[data-add]', el).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-add');
        const p = DataStore.getProduct(id);
        if (!p) return;
        if (!DataStore.isProductAvailable(id)) {
          toast('هذا المنتج غير متوفر', 'error');
          return;
        }
        const result = Cart.add(id);
        if (!result.success) {
          if (result.reason === 'max_reached') {
            toast(`وصلت إلى الحد الأقصى (${result.max} قطع)`, 'warn');
          } else if (result.reason === 'unavailable') {
            toast('هذا المنتج غير متوفر', 'error');
          }
          return;
        }
        toast(`تمت الإضافة: ${p.name}`, 'success');
      });
    });

    // زر + في البطاقة
    $$('[data-inc]', el).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-inc');
        if (!DataStore.isProductAvailable(id)) {
          toast('هذا المنتج غير متوفر', 'error');
          return;
        }
        const result = Cart.increment(id);
        if (!result.success && result.reason === 'max_reached') {
          toast(`وصلت إلى الحد الأقصى (${result.max} قطع)`, 'warn');
        }
      });
    });

    // زر - في البطاقة
    $$('[data-dec]', el).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-dec');
        Cart.decrement(id);
      });
    });
  }

  // ==== تحديث كمية بطاقة واحدة (دون إعادة رسم كامل) ====
  function updateCardQty(productId) {
    const cards = document.querySelectorAll(`[data-product-id="${productId}"]`);
    if (!cards.length) return;
    const p = DataStore.getProduct(productId);
    if (!p) return;
    const cartQty = Cart.getQty(productId);
    const maxQty = DataStore.getMaxQtyForProduct(productId);
    const inCart = cartQty > 0;
    const isUnavailable = p.status === 'unavailable';
    const isLimited = p.status === 'limited';
    const stockOut = isLimited && (Number(p.stock) || 0) <= 0;
    const disabled = isUnavailable || stockOut;

    cards.forEach(card => {
      // القيمة
      const qtyEl = card.querySelector(`[data-qty-of="${productId}"]`);
      if (qtyEl) qtyEl.textContent = cartQty;

      // زر +
      const incBtn = card.querySelector(`[data-inc="${productId}"]`);
      if (incBtn) {
        const canInc = !disabled && cartQty < maxQty;
        incBtn.disabled = !canInc;
      }

      // زر -
      const decBtn = card.querySelector(`[data-dec="${productId}"]`);
      if (decBtn) decBtn.disabled = cartQty <= 0;

      // زر السلة (تحديث حالة "في السلة")
      const cartBtn = card.querySelector(`[data-add="${productId}"]`);
      if (cartBtn) {
        cartBtn.disabled = disabled;
        if (inCart) {
          cartBtn.classList.add('in-cart');
          cartBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else {
          cartBtn.classList.remove('in-cart');
          cartBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
        }
      }

      // تنبيه الحد الأقصى
      const body = card.querySelector('.p-body');
      if (body) {
        const existingWarn = body.querySelector('.p-stock-warn');
        if (existingWarn) existingWarn.remove();
        if (isLimited && cartQty >= maxQty && maxQty > 0 && !isUnavailable) {
          body.insertAdjacentHTML('beforeend', `<div class="p-stock-warn">⚠️ وصلت إلى الحد الأقصى (${maxQty})</div>`);
        }
      }
    });
  }

  // ==== شبكة منتجات ====
  function renderProducts(targetSelector, list) {
    const el = typeof targetSelector === 'string' ? $(targetSelector) : targetSelector;
    if (!el) return;
    currentContainer = el;

    if (!list.length) {
      el.innerHTML = `
        <div class="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <div>لا توجد منتجات مطابقة.</div>
        </div>`;
      return;
    }
    el.innerHTML = list.map(renderProductCard).join('');
    attachHandlers(el);
  }

  // ==== بطاقة قسم ====
  function renderCategoryCard(cat) {
    const count = DataStore.getProductsByCategory(cat.id).length;
    const href = `category.html?id=${encodeURIComponent(cat.id)}`;
    const iconContent = cat.image
      ? `<img src="${escapeHtml(cat.image)}" alt="${escapeHtml(cat.name)}" onerror="this.onerror=null;this.parentNode.textContent='${escapeHtml(cat.icon || '📦')}'">`
      : escapeHtml(cat.icon || '📦');
    return `
      <a class="cat-card" href="${href}">
        <div class="cat-icon">${iconContent}</div>
        <div class="cat-name">${escapeHtml(cat.name)}</div>
        <div class="cat-count">${count} منتج</div>
      </a>
    `;
  }

  function renderCategories(targetSelector) {
    const el = $(targetSelector);
    if (!el) return;
    const cats = DataStore.getCategories(); // مفلترة على visible + مرتبة
    el.innerHTML = cats.map(renderCategoryCard).join('');
  }

  // ==== شريط المميزات ====
  function renderFeatures(targetSelector) {
    const el = $(targetSelector);
    if (!el) return;
    const s = DataStore.getSettings();
    const features = (s && s.features) || [];
    el.innerHTML = features.map(f => `
      <div class="feature">
        <div class="feature-ic">${UI.getFeatureIcon(f.icon)}</div>
        <div class="feature-txt">${escapeHtml(f.text)}</div>
      </div>
    `).join('');
  }

  // ==== الهيرو (اللوحة العلوية) ====
  function renderHero() {
    const wrap = $('#heroSection');
    if (!wrap) return;
    const hero = DataStore.getHero();

    if (!hero || hero.enabled === false) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = '';

    const showTitle = hero.titleVisible !== false;
    const showSub = hero.subtitleVisible !== false;
    const showBtn = hero.buttonVisible !== false;
    const showImg = hero.imageVisible !== false;

    const titleHTML = showTitle
      ? `<h1 class="hero-title">${escapeHtml(hero.title || '')}${hero.titleAccent ? '<br><span class="accent">' + escapeHtml(hero.titleAccent) + '</span>' : ''}</h1>`
      : '';
    const subHTML = showSub && hero.subtitle
      ? `<p class="hero-sub">${escapeHtml(hero.subtitle)}</p>`
      : '';
    const btnHTML = showBtn && hero.buttonText
      ? `<a href="${escapeHtml(hero.buttonLink || 'products.html')}" class="btn btn-primary btn-lg">${escapeHtml(hero.buttonText)}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </a>`
      : '';

    const visualHTML = showImg
      ? `<div class="hero-visual">
          <div class="hero-decor"></div>
          ${hero.image
            ? `<img src="${escapeHtml(hero.image)}" alt="" onerror="this.onerror=null;this.outerHTML=window.__DEFAULT_HERO_SVG||''">`
            : (window.__DEFAULT_HERO_SVG || '')
          }
        </div>`
      : '';

    const noImgClass = !showImg ? 'no-image' : '';

    wrap.innerHTML = `
      <div class="hero-inner ${noImgClass}">
        <div>
          ${titleHTML}
          ${subHTML}
          ${btnHTML}
        </div>
        ${visualHTML}
      </div>
    `;
  }

  // ==== الاستماع لتغييرات السلة لتحديث الكميات ====
  function initSync() {
    window.addEventListener('ck-cart-changed', () => {
      if (!currentContainer) return;
      // تحديث كل البطاقات المرئية
      const ids = new Set();
      currentContainer.querySelectorAll('[data-product-id]').forEach(el => {
        ids.add(el.getAttribute('data-product-id'));
      });
      ids.forEach(id => updateCardQty(id));
    });
  }

  // ==== قراءة معلمة URL ====
  function getQueryParam(name) {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  return {
    renderProductCard, renderProducts,
    renderCategoryCard, renderCategories,
    renderFeatures, renderHero,
    getQueryParam, updateCardQty, initSync
  };
})();

// SVG افتراضي للهيرو (شعار CampusKart)
window.__DEFAULT_HERO_SVG = `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 44 L36 44 L36 34 C36 20 48 12 64 12 C80 12 92 20 92 34 L92 44 L106 44 C110 44 113 47 113 51 L110 112 C109.6 116 106 119 102 119 L26 119 C22 119 18.4 116 18 112 L15 51 C15 47 18 44 22 44 Z" fill="#0F3D2E"/>
  <path d="M44 44 L44 34 C44 24 52 20 64 20 C76 20 84 24 84 34 L84 44" stroke="#0F3D2E" stroke-width="6" fill="none" stroke-linecap="round"/>
  <g transform="translate(64 78)">
    <path d="M-22 -14 L-2 -18 L-2 18 L-22 14 Z" fill="#C9A46A"/>
    <path d="M22 -14 L2 -18 L2 18 L22 14 Z" fill="#C9A46A"/>
    <rect x="-2" y="-18" width="4" height="36" fill="#F5F7F6"/>
  </g>
</svg>`;
