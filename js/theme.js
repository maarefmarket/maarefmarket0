/* ================================================
   الوضع الليلي / النهاري
   ================================================ */

const Theme = (function() {
  'use strict';

  const KEY = 'ck_theme';

  const SUN_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  const MOON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function get() {
    return localStorage.getItem(KEY) || 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    // تحديث أيقونة الزر إن وُجد
    const buttons = document.querySelectorAll('[data-theme-toggle]');
    buttons.forEach(btn => {
      btn.innerHTML = theme === 'dark' ? SUN_SVG : MOON_SVG;
      btn.setAttribute('aria-label', theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي');
    });
  }

  function toggle() {
    const cur = get();
    apply(cur === 'dark' ? 'light' : 'dark');
  }

  function init() {
    apply(get());
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-toggle]');
      if (btn) {
        e.preventDefault();
        toggle();
      }
    });
  }

  return { get, apply, toggle, init };
})();
