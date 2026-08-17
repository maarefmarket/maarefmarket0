/* ================================================
   إدارة بيانات المتجر
   يقرأ store.json ويخزّن التعديلات في localStorage
   ================================================ */

const DataStore = (function() {
  'use strict';

  const API_URL = '/api/data';
const ADMIN_TOKEN_KEY = 'ck_admin_password';
  let data = null;

  const DEFAULT_HERO = {
    enabled: true,
    title: "كل ما تحتاجه",
    titleAccent: "في مكان واحد",
    subtitle: "من مستلزمات الدراسة إلى الوجبات والمشروبات — تسوّق واستلم داخل الحرم الجامعي.",
    buttonText: "تسوّق الآن",
    buttonLink: "products.html",
    buttonVisible: true,
    image: "",
    imageVisible: true,
    titleVisible: true,
    subtitleVisible: true
  };

  const DEFAULT_DATA = {
    settings: {
      storeName: "CampusKart",
      storeSubtitle: "متجر الجامعة",
      slogan: "كل ما تحتاجه في مكان واحد",
      description: "من مستلزمات الدراسة إلى الوجبات — كل شيء يصلك.",
      whatsappNumber: "905000000000",
      adminPassword: "admin",
      rates: { USD: 1, TRY: 33, SYP: 14000 },
      currencyLabels: { USD: "دولار أمريكي", TRY: "ليرة تركية", SYP: "ليرة سورية" },
      currencySymbols: { USD: "$", TRY: "₺", SYP: "ل.س" },
      messageTemplate: {
        greeting: "السلام عليكم ورحمة الله وبركاته",
        intro: "أريد شراء هذه الأشياء:",
        totalsLabel: "السعر النهائي الإجمالي:",
        noteLabel: "ملاحظة:"
      },
      features: [
        { icon: "star", text: "منتجات مختارة بعناية" },
        { icon: "shield", text: "جودة عالية وسعر مناسب" },
        { icon: "truck", text: "توصيل داخل الحرم الجامعي" },
        { icon: "headset", text: "خدمة عملاء سريعة" }
      ],
      hero: JSON.parse(JSON.stringify(DEFAULT_HERO))
    },
    categories: [],
    products: []
  };

  // ==== تطبيع القسم ====
  function normalizeCategory(c, index) {
    return {
      id: c.id || 'c_' + Date.now(),
      name: c.name || '',
      icon: c.icon || '',
      image: c.image || '',
      visible: c.visible !== false,
      order: typeof c.order === 'number' ? c.order : (index != null ? index + 1 : 999)
    };
  }

  // ==== تطبيع المنتج ====
  function normalizeProduct(p, index) {
    const validStatuses = ['available', 'unavailable', 'limited'];
    let status = p.status;
    if (!validStatuses.includes(status)) status = 'available';
    return {
      id: p.id || 'p_' + Date.now(),
      category: p.category || '',
      name: p.name || '',
      priceUSD: Number(p.priceUSD) || 0,
      image: p.image || '',
      description: p.description || '',
      status: status,
      stock: Number(p.stock) || 0,
      visible: p.visible !== false,
      order: typeof p.order === 'number' ? p.order : (index != null ? index + 1 : 999)
    };
  }

  // ==== دمج البيانات مع الافتراضي ====
  function mergeDefaults(loaded) {
    if (!loaded || typeof loaded !== 'object') return JSON.parse(JSON.stringify(DEFAULT_DATA));
    const merged = JSON.parse(JSON.stringify(DEFAULT_DATA));
    if (loaded.settings) {
      Object.assign(merged.settings, loaded.settings);
      if (loaded.settings.rates) merged.settings.rates = Object.assign({}, merged.settings.rates, loaded.settings.rates);
      if (loaded.settings.currencyLabels) merged.settings.currencyLabels = Object.assign({}, merged.settings.currencyLabels, loaded.settings.currencyLabels);
      if (loaded.settings.currencySymbols) merged.settings.currencySymbols = Object.assign({}, merged.settings.currencySymbols, loaded.settings.currencySymbols);
      if (loaded.settings.messageTemplate) merged.settings.messageTemplate = Object.assign({}, merged.settings.messageTemplate, loaded.settings.messageTemplate);
      if (Array.isArray(loaded.settings.features)) merged.settings.features = loaded.settings.features;
      // hero: merge with defaults
      merged.settings.hero = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_HERO)), loaded.settings.hero || {});
    }
    if (Array.isArray(loaded.categories)) {
      merged.categories = loaded.categories.map((c, i) => normalizeCategory(c, i));
    }
    if (Array.isArray(loaded.products)) {
      merged.products = loaded.products.map((p, i) => normalizeProduct(p, i));
    }
    return merged;
  }

  // ==== تحميل البيانات ====
 async function load() {
  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error('فشل تحميل البيانات: ' + res.status);
    }

    const json = await res.json();
    data = mergeDefaults(json);
    return data;

  } catch (e) {
    console.error('فشل تحميل بيانات المتجر:', e);

    try {
      const res = await fetch('../data/store.json', {
        cache: 'no-store'
      });

      if (res.ok) {
        data = mergeDefaults(await res.json());
        return data;
      }
    } catch (_) {}

    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    return data;
  }
}

  async function save() {
  if (!data) return false;

  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);

  // الزائر العادي لا يملك صلاحية الحفظ
  if (!token) {
    window.dispatchEvent(new CustomEvent('ck-data-changed'));
    return false;
  }

  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'تعذر حفظ البيانات');
    }

    window.dispatchEvent(new CustomEvent('ck-data-changed'));

    return true;

  } catch (e) {
    console.error('فشل حفظ بيانات المتجر:', e);
    return false;
  }
}

  function get() { return data; }
  function getSettings() { return data ? data.settings : null; }
  function getHero() { return data && data.settings ? data.settings.hero : JSON.parse(JSON.stringify(DEFAULT_HERO)); }

  // ==== الأقسام ====
  function getCategories(includeHidden) {
    if (!data) return [];
    const cats = data.categories.slice();
    // فرز حسب order
    cats.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (includeHidden) return cats;
    return cats.filter(c => c.visible !== false);
  }
  function getCategory(id) {
    if (!data) return null;
    return data.categories.find(c => c.id === id) || null;
  }

  // ==== المنتجات ====
  function getProducts(includeHidden) {
    if (!data) return [];
    const prods = data.products.slice();
    prods.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (includeHidden) return prods;
    return prods.filter(p => p.visible !== false);
  }
  function getProduct(id) {
    if (!data) return null;
    return data.products.find(p => p.id === id) || null;
  }
  function getProductsByCategory(catId, includeHidden) {
    const all = getProducts(includeHidden);
    if (catId === 'all' || !catId) return all;
    return all.filter(p => p.category === catId);
  }

  // ==== الإعدادات ====
  function updateSettings(patch) {
    if (!data) return;
    Object.assign(data.settings, patch);
    save();
  }
  function updateRates(rates) {
    if (!data) return;
    data.settings.rates = Object.assign({}, data.settings.rates, rates);
    save();
  }
  function updateMessageTemplate(patch) {
    if (!data) return;
    data.settings.messageTemplate = Object.assign({}, data.settings.messageTemplate, patch);
    save();
  }
  function updateHero(patch) {
    if (!data) return;
    if (!data.settings.hero) data.settings.hero = JSON.parse(JSON.stringify(DEFAULT_HERO));
    Object.assign(data.settings.hero, patch);
    save();
  }

  // ==== إدارة الأقسام ====
  function addCategory(cat) {
    if (!data) return false;
    if (data.categories.find(c => c.id === cat.id)) return false;
    const maxOrder = data.categories.reduce((m, c) => Math.max(m, c.order || 0), 0);
    data.categories.push(normalizeCategory({ ...cat, order: cat.order || (maxOrder + 1) }));
    save();
    return true;
  }
  function updateCategory(oldId, newData) {
    if (!data) return false;
    const idx = data.categories.findIndex(c => c.id === oldId);
    if (idx === -1) return false;
    if (newData.id && newData.id !== oldId) {
      if (data.categories.find((c, i) => c.id === newData.id && i !== idx)) return false;
      data.products.forEach(p => {
        if (p.category === oldId) p.category = newData.id;
      });
    }
    data.categories[idx] = normalizeCategory(Object.assign({}, data.categories[idx], newData));
    save();
    return true;
  }
  function deleteCategory(id, deleteProducts) {
    if (!data) return;
    data.categories = data.categories.filter(c => c.id !== id);
    if (deleteProducts) {
      data.products = data.products.filter(p => p.category !== id);
    }
    save();
  }
  function moveCategoryUp(id) {
    if (!data) return;
    const sorted = getCategories(true);
    const idx = sorted.findIndex(c => c.id === id);
    if (idx <= 0) return;
    const cur = sorted[idx];
    const prev = sorted[idx - 1];
    const t = cur.order; cur.order = prev.order; prev.order = t;
    // sync back
    data.categories.forEach(c => {
      if (c.id === cur.id) c.order = cur.order;
      if (c.id === prev.id) c.order = prev.order;
    });
    save();
  }
  function moveCategoryDown(id) {
    if (!data) return;
    const sorted = getCategories(true);
    const idx = sorted.findIndex(c => c.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const cur = sorted[idx];
    const next = sorted[idx + 1];
    const t = cur.order; cur.order = next.order; next.order = t;
    data.categories.forEach(c => {
      if (c.id === cur.id) c.order = cur.order;
      if (c.id === next.id) c.order = next.order;
    });
    save();
  }

  // ==== إدارة المنتجات ====
  function addProduct(product) {
    if (!data) return false;
    if (!product.id) product.id = 'p_' + Date.now();
    if (data.products.find(p => p.id === product.id)) return false;
    const maxOrder = data.products.reduce((m, p) => Math.max(m, p.order || 0), 0);
    data.products.push(normalizeProduct({ ...product, order: product.order || (maxOrder + 1) }));
    save();
    return true;
  }
  function updateProduct(id, newData) {
    if (!data) return false;
    const idx = data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    data.products[idx] = normalizeProduct(Object.assign({}, data.products[idx], newData));
    save();
    return true;
  }
  function deleteProduct(id) {
    if (!data) return;
    data.products = data.products.filter(p => p.id !== id);
    save();
  }
  function moveProductUp(id) {
    if (!data) return;
    const sorted = getProducts(true);
    const idx = sorted.findIndex(p => p.id === id);
    if (idx <= 0) return;
    const cur = sorted[idx];
    const prev = sorted[idx - 1];
    const t = cur.order; cur.order = prev.order; prev.order = t;
    data.products.forEach(p => {
      if (p.id === cur.id) p.order = cur.order;
      if (p.id === prev.id) p.order = prev.order;
    });
    save();
  }
  function moveProductDown(id) {
    if (!data) return;
    const sorted = getProducts(true);
    const idx = sorted.findIndex(p => p.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const cur = sorted[idx];
    const next = sorted[idx + 1];
    const t = cur.order; cur.order = next.order; next.order = t;
    data.products.forEach(p => {
      if (p.id === cur.id) p.order = cur.order;
      if (p.id === next.id) p.order = next.order;
    });
    save();
  }

  // ==== الحد الأقصى للكمية ====
  function getMaxQtyForProduct(productId) {
    const p = getProduct(productId);
    if (!p) return 0;
    if (p.status === 'unavailable') return 0;
    if (p.status === 'limited') return Math.max(0, Number(p.stock) || 0);
    return Infinity; // available = بلا حد
  }

  function isProductAvailable(productId) {
    const p = getProduct(productId);
    if (!p) return false;
    if (p.visible === false) return false;
    if (p.status === 'unavailable') return false;
    if (p.status === 'limited' && (Number(p.stock) || 0) <= 0) return false;
    return true;
  }

  // ==== تصدير/استيراد ====
  function exportJson() { return JSON.stringify(data, null, 2); }
  function importJson(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.settings || !Array.isArray(parsed.categories) || !Array.isArray(parsed.products)) {
        throw new Error('البنية غير صحيحة');
      }
      data = mergeDefaults(parsed);
      save();
      return true;
    } catch (e) {
      console.error('فشل استيراد JSON:', e);
      return false;
    }
  }
  function resetToDefault() {
  data = null;
}

  // ==== كلمة المرور ====
  function checkPassword(pw) {
    return String(pw) === String(data.settings.adminPassword || 'admin');
  }
  function updatePassword(newPw) {
    if (!newPw) return false;
    data.settings.adminPassword = newPw;
    save();
    return true;
  }

  // ==== جلسة الأدمن ====
  function isAdminLoggedIn() { return localStorage.getItem('ck_admin_session') === '1'; }
  function loginAdmin() { localStorage.setItem('ck_admin_session', '1'); }
  function logoutAdmin() {
  localStorage.removeItem('ck_admin_session');
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

  return {
    load, save, get,
    getSettings, getHero, getCategories, getProducts, getProduct, getCategory, getProductsByCategory,
    updateSettings, updateRates, updateMessageTemplate, updateHero,
    addCategory, updateCategory, deleteCategory, moveCategoryUp, moveCategoryDown,
    addProduct, updateProduct, deleteProduct, moveProductUp, moveProductDown,
    getMaxQtyForProduct, isProductAvailable,
    exportJson, importJson, resetToDefault,
    checkPassword, updatePassword,
    isAdminLoggedIn, loginAdmin, logoutAdmin
  };
})();
