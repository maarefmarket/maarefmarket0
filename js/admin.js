/* ================================================
   منطق لوحة التحكم
   ================================================ */

const Admin = (function() {
  'use strict';

  const { $, $$, escapeHtml, toast } = UI;

  // ==== التحقق من الجلسة ====
  function requireAuth() {
    if (!DataStore.isAdminLoggedIn()) {
      location.href = 'index.html';
      return false;
    }
    return true;
  }

  // ==== قائمة جانبية مشتركة ====
  function markActiveNav() {
    const path = location.pathname.split('/').pop() || 'dashboard.html';
    $$('.admin-nav a').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (href === path) a.classList.add('active');
    });
  }

  // ==== قائمة الجوال ====
  function initMobileMenu() {
    const btn = $('#mobileMenuBtn');
    const sidebar = $('.admin-sidebar');
    const mask = $('#adminMask');
    if (btn && sidebar) {
      btn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (mask) mask.classList.toggle('open');
      });
    }
    if (mask) {
      mask.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mask.classList.remove('open');
      });
    }
  }

  // ==== زر تسجيل الخروج ====
  function initLogout() {
    const btn = $('#logoutBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('هل تريد تسجيل الخروج؟')) {
          DataStore.logoutAdmin();
          location.href = 'index.html';
        }
      });
    }
  }

  // ==== تنزيل JSON ====
  function downloadStoreJson() {
    const json = DataStore.exportJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('تم تنزيل store.json بنجاح', 'success');
  }

  // ==== نسخ JSON ====
  async function copyStoreJson() {
    const json = DataStore.exportJson();
    try {
      await navigator.clipboard.writeText(json);
      toast('تم نسخ JSON إلى الحافظة', 'success');
    } catch (e) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast('تم نسخ JSON إلى الحافظة', 'success');
      } catch (e2) {
        toast('تعذّر النسخ', 'error');
      }
      document.body.removeChild(ta);
    }
  }

  // ==== استيراد JSON ====
  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const ok = DataStore.importJson(e.target.result);
      if (ok) {
        toast('تم استيراد البيانات بنجاح', 'success');
        setTimeout(() => location.reload(), 800);
      } else {
        toast('ملف JSON غير صالح', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ==== تفعيل شريط "لديك تعديلات" — اختياري لصفحات معينة ====
  let hasChanges = false;
  function markChanged() {
    hasChanges = true;
    const b = $('#saveBanner');
    if (b) b.classList.add('show');
  }
  function markSaved() {
    hasChanges = false;
    const b = $('#saveBanner');
    if (b) b.classList.remove('show');
  }

  // ==== تهيئة عامة لكل صفحة أدمن ====
  async function init() {
    await DataStore.load();
    Cart.load();
    if (!requireAuth()) return false;
    UI.init();
    markActiveNav();
    initMobileMenu();
    initLogout();

    // زر تنزيل JSON عالمي
    $$('[data-download-json]').forEach(b => b.addEventListener('click', downloadStoreJson));
    $$('[data-copy-json]').forEach(b => b.addEventListener('click', copyStoreJson));
    return true;
  }

  return {
    init, requireAuth, downloadStoreJson, copyStoreJson, importJsonFile,
    markChanged, markSaved
  };
})();
