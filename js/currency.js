/* ================================================
   تحويل العملات وتنسيق الأسعار
   السعر الأساسي دائمًا بالدولار (USD)
   ================================================ */

const Currency = (function() {
  'use strict';

  // ==== تحويل من USD إلى عملة أخرى ====
  function convert(usd, targetCurrency) {
    const settings = DataStore.getSettings();
    if (!settings || !settings.rates) return Number(usd) || 0;
    const rate = settings.rates[targetCurrency];
    if (typeof rate !== 'number' || rate <= 0) return Number(usd) || 0;
    return (Number(usd) || 0) * rate;
  }

  // ==== تنسيق رقم للعرض ====
  function format(value, currency) {
    const v = Number(value) || 0;
    // العملة السورية تحذف الكسور
    if (currency === 'SYP') {
      return Math.round(v).toLocaleString('en-US');
    }
    // الليرة التركية والدولار برقمين عشريين
    if (v >= 1000) {
      return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return v.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ==== احصل على رمز العملة ====
  function getSymbol(currency) {
    const settings = DataStore.getSettings();
    if (!settings || !settings.currencySymbols) {
      const fallback = { USD: '$', TRY: '₺', SYP: 'ل.س' };
      return fallback[currency] || currency;
    }
    return settings.currencySymbols[currency] || currency;
  }

  // ==== احصل على اسم العملة ====
  function getLabel(currency) {
    const settings = DataStore.getSettings();
    if (!settings || !settings.currencyLabels) {
      const fallback = { USD: 'دولار', TRY: 'ليرة تركية', SYP: 'ليرة سورية' };
      return fallback[currency] || currency;
    }
    return settings.currencyLabels[currency] || currency;
  }

  // ==== احصل على سعر مُنسّق مع الرمز ====
  function priceWith(usd, currency) {
    const converted = convert(usd, currency);
    return `${format(converted, currency)} ${getSymbol(currency)}`;
  }

  // ==== احصل على الأسعار الثلاثة كسلسلة ====
  function allThreePrices(usd) {
    return {
      USD: priceWith(usd, 'USD'),
      TRY: priceWith(usd, 'TRY'),
      SYP: priceWith(usd, 'SYP')
    };
  }

  return {
    convert, format, getSymbol, getLabel, priceWith, allThreePrices
  };
})();
