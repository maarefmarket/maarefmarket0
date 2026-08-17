/* ================================================
   توليد رسالة WhatsApp من السلة
   الرسالة تُجهَّز فقط ولا تُرسل تلقائيًا.
   ================================================ */

const WhatsAppOrder = (function() {
  'use strict';

  function buildMessage(note) {
    const settings = DataStore.getSettings();
    const template = (settings && settings.messageTemplate) || {};

    const greeting = template.greeting || 'السلام عليكم ورحمة الله وبركاته';
    const intro = template.intro || 'أريد شراء هذه الأشياء:';
    const totalsLabel = template.totalsLabel || 'السعر النهائي الإجمالي:';
    const noteLabel = template.noteLabel || 'ملاحظة:';

    // ==== قائمة المنتجات — الأسماء بخط عريض (*name*) ====
    const items = Cart.getItems();
    const itemLines = items.map(line => {
      const p = DataStore.getProduct(line.id);
      if (!p) return '';
      const priceUSD = p.priceUSD * line.qty;
      const priceStr = Currency.format(priceUSD, 'USD') + ' ' + Currency.getSymbol('USD');
      // النجوم في واتساب تعني نص عريض
      return `• *${p.name}* × ${line.qty}  —  ${priceStr}`;
    }).filter(Boolean).join('\n');

    // ==== الإجماليات بالعملات الثلاث ====
    // الترتيب المطلوب في البرومت: التركي، السوري، الدولار
    const totals = [
      { key: 'TRY', label: 'التركي' },
      { key: 'SYP', label: 'السوري' },
      { key: 'USD', label: 'الدولار' }
    ].map(({ key, label }) => {
      const val = Cart.total(key);
      const formatted = Currency.format(val, key) + ' ' + Currency.getSymbol(key);
      return `• ${label}: *${formatted}*`;
    }).join('\n');

    // ==== الملاحظة (اختيارية) ====
    let noteBlock = '';
    if (note && String(note).trim()) {
      noteBlock = `\n\n📝 ${noteLabel} ${String(note).trim()}`;
    }

    // ==== الرسالة النهائية ====
    return `${greeting}\n\n${intro}\n\n${itemLines}\n\n${totalsLabel}\n\n${totals}${noteBlock}`;
  }

  function buildUrl(note) {
    const settings = DataStore.getSettings();
    const num = String((settings && settings.whatsappNumber) || '').replace(/\D/g, '');
    if (!num) return null;
    const text = buildMessage(note);
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  }

  function checkout(note) {
    if (Cart.countTotal() === 0) {
      return { success: false, reason: 'empty' };
    }
    const url = buildUrl(note);
    if (!url) {
      return { success: false, reason: 'no_number' };
    }
    // فتح واتساب في تبويب جديد — لا يتم الإرسال تلقائيًا
    window.open(url, '_blank');
    return { success: true };
  }

  return { buildMessage, buildUrl, checkout };
})();
