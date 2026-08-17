/* ================================================
   منطق السلة
   يحترم حالات المنتجات وحدود الكميات
   ================================================ */

const Cart = (function() {
  'use strict';

  const KEY = 'ck_cart';
  let items = [];
  const listeners = [];

  function load() {
    try {
      items = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      items = [];
    }
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(items));
    listeners.forEach(fn => { try { fn(); } catch(e){} });
    window.dispatchEvent(new CustomEvent('ck-cart-changed'));
  }

  function getItems() { return items.slice(); }
  function countTotal() { return items.reduce((s, i) => s + (i.qty || 0), 0); }
  function findLine(productId) { return items.find(i => i.id === productId); }

  function getQty(productId) {
    const line = findLine(productId);
    return line ? line.qty : 0;
  }

  // إرجاع الكمية الفعلية بعد التحقق من الحدود
  function _clampQty(productId, wantedQty) {
    const max = DataStore.getMaxQtyForProduct(productId);
    if (max === 0) return 0;
    if (wantedQty > max) return max;
    return Math.max(0, wantedQty);
  }

  // إضافة (إذا كان 0 → 1)
  function add(productId) {
    if (!DataStore.isProductAvailable(productId)) {
      return { success: false, reason: 'unavailable' };
    }
    const line = findLine(productId);
    const currentQty = line ? line.qty : 0;
    const max = DataStore.getMaxQtyForProduct(productId);
    if (currentQty >= max) {
      return { success: false, reason: 'max_reached', max: max };
    }
    if (line) {
      line.qty += 1;
    } else {
      items.push({ id: productId, qty: 1 });
    }
    save();
    return { success: true, qty: getQty(productId) };
  }

  // زيادة الكمية
  function increment(productId) {
    return add(productId);
  }

  // نقص الكمية (لا تنزل تحت 0)
  function decrement(productId) {
    const line = findLine(productId);
    if (!line) return { success: true, qty: 0 };
    line.qty -= 1;
    if (line.qty <= 0) {
      items = items.filter(i => i.id !== productId);
      save();
      return { success: true, qty: 0 };
    }
    save();
    return { success: true, qty: line.qty };
  }

  // تعيين كمية محددة (مع احترام الحدود)
  function setQty(productId, qty) {
    qty = Math.max(0, Number(qty) || 0);
    if (!DataStore.isProductAvailable(productId) && qty > 0) {
      return { success: false, reason: 'unavailable' };
    }
    const clamped = _clampQty(productId, qty);
    if (clamped === 0) {
      items = items.filter(i => i.id !== productId);
      save();
      return { success: true, qty: 0, clamped: qty > 0 };
    }
    const line = findLine(productId);
    if (line) {
      line.qty = clamped;
    } else {
      items.push({ id: productId, qty: clamped });
    }
    save();
    return { success: true, qty: clamped, clamped: clamped !== qty };
  }

  function remove(productId) {
    items = items.filter(i => i.id !== productId);
    save();
  }

  function clear() { items = []; save(); }

  function isInCart(productId) { return !!findLine(productId); }

  function total(currency) {
    return items.reduce((sum, line) => {
      const p = DataStore.getProduct(line.id);
      if (!p) return sum;
      return sum + Currency.convert(p.priceUSD, currency) * line.qty;
    }, 0);
  }

  // إزالة العناصر التي لم تعد متاحة (يُستدعى عند بدء تشغيل الصفحة أو بعد تحديث البيانات)
  function purgeInvalidLines() {
    let changed = false;
    const cleaned = [];
    for (const line of items) {
      const p = DataStore.getProduct(line.id);
      if (!p) { changed = true; continue; }
      if (p.status === 'unavailable' || p.visible === false) { changed = true; continue; }
      if (p.status === 'limited') {
        const max = Number(p.stock) || 0;
        if (max <= 0) { changed = true; continue; }
        if (line.qty > max) { line.qty = max; changed = true; }
      }
      cleaned.push(line);
    }
    if (changed) {
      items = cleaned;
      save();
    }
    return changed;
  }

  function onChange(fn) { listeners.push(fn); }

  return {
    load, getItems, countTotal, getQty,
    add, increment, decrement, setQty, remove, clear, isInCart,
    total, purgeInvalidLines, onChange
  };
})();
