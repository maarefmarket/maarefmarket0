/* ================================================
   عناصر واجهة مشتركة
   ================================================ */

const UI = (function() {
  'use strict';

  // ==== أدوات ====
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // ==== Toast ====
  let toastEl, toastTimer;
  function toast(msg, type) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.className = 'toast ' + (type || '') + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  // ==== أيقونات المميزات ====
  const featureIcons = {
    star: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    shield: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    truck: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    headset: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>'
  };
  function getFeatureIcon(name) { return featureIcons[name] || featureIcons.star; }

  // ==== أزرار الهيدر ====
  function updateCartBadge() {
    const count = Cart.countTotal();
    $$('[data-cart-badge]').forEach(el => {
      el.textContent = count;
      el.classList.toggle('hidden', count === 0);
    });
  }

  // ==== قائمة الجوال ====
  function initMobileMenu() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-menu-toggle]');
      if (btn) {
        const nav = $('#navLinks') || $('.nav-links');
        if (nav) nav.classList.toggle('open');
      }
      // إغلاق عند الضغط على رابط
      const link = e.target.closest('.nav-links a');
      if (link) {
        const nav = $('#navLinks') || $('.nav-links');
        if (nav) nav.classList.remove('open');
      }
    });
  }

  // ==== تعليم الرابط النشط في الهيدر ====
  function markActiveLink() {
    const path = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const target = href.split('/').pop().split('?')[0].split('#')[0];
      if (target === path) a.classList.add('active');
    });
  }

  // ==== تحديث اسم المتجر في الهيدر ====
  function updateBrand() {
    const s = DataStore.getSettings();
    if (!s) return;
    $$('[data-brand-name]').forEach(el => el.textContent = s.storeName);
    $$('[data-brand-sub]').forEach(el => el.textContent = s.storeSubtitle);
    if (document.title.includes('CampusKart') || document.title === '') {
      const pageTitle = document.title.replace(/CampusKart.*/, '').trim();
      document.title = pageTitle
        ? `${pageTitle} · ${s.storeName}`
        : `${s.storeName} — ${s.storeSubtitle}`;
    }
  }

  // ==== تهيئة المشتركات ====
  function init() {
    Theme.init();
    initMobileMenu();
    markActiveLink();
    updateBrand();
    updateCartBadge();
    Cart.onChange(updateCartBadge);
  }

  return {
    $, $$, escapeHtml, toast, getFeatureIcon,
    updateCartBadge, updateBrand, markActiveLink, init
  };
})();
