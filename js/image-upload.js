/* ================================================
   أداة رفع الصور من الجهاز
   - تحويل إلى base64 مع تصغير الحجم
   - معاينة فورية قبل الحفظ
   ================================================ */

const ImageUpload = (function() {
  'use strict';

  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 800;
  const QUALITY = 0.85;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // تحويل ملف صورة إلى Data URL مضغوط
async function readFileAsDataURL(file) {
  if (!file) {
    throw new Error('لا يوجد ملف');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('الملف ليس صورة');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الصورة كبير جدًا (الحد الأقصى 5MB)');
  }

  // أولاً: تصغير وضغط الصورة
  const blob = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(
      new Error('فشل قراءة الملف')
    );

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(
        new Error('فشل تحميل الصورة')
      );

      img.onload = () => {
        try {
          let { width, height } = img;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(
              MAX_WIDTH / width,
              MAX_HEIGHT / height
            );

            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let mime = 'image/jpeg';

          if (
            file.type === 'image/png' ||
            file.type === 'image/webp'
          ) {
            mime = file.type;
          }

          canvas.toBlob(
            (result) => {
              if (result) resolve(result);
              else reject(new Error('فشل تجهيز الصورة'));
            },
            mime,
            QUALITY
          );

        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });

  // توكن الأدمن الذي حفظناه عند تسجيل الدخول
  const token = sessionStorage.getItem(
    'ck_admin_password'
  );

  if (!token) {
    throw new Error(
      'انتهت جلسة الإدارة. سجّل الدخول من جديد.'
    );
  }

  // رفع الصورة إلى Netlify Blobs
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'image/jpeg',
      'Authorization': 'Bearer ' + token,
      'X-Filename': file.name || 'image'
    },
    body: blob
  });

  let result;

  try {
    result = await response.json();
  } catch (_) {
    throw new Error('استجابة غير صالحة من الخادم');
  }

  if (!response.ok || !result.ok) {
    throw new Error(
      result.error || 'تعذر رفع الصورة'
    );
  }

  // بدل Base64 نرجع رابط الصورة العام
  return result.url;
}

  /**
   * تركيب مكوّن رفع صورة كامل في عنصر معين
   * @param {HTMLElement|string} container العنصر أو selector
   * @param {Object} opts
   *   - initialValue: قيمة أولية (URL أو Data URL)
   *   - onChange: يُستدعى عند تغير القيمة (يمرر URL/DataURL أو '')
   *   - accept: MIME types (default: 'image/*')
   */
  function mount(container, opts = {}) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return null;

    let value = opts.initialValue || '';
    const onChange = opts.onChange || function() {};

    function render() {
      const preview = value
        ? `<img src="${value}" alt="معاينة" style="max-width:120px;max-height:120px;border-radius:12px;border:1px solid var(--border);object-fit:cover">`
        : `<div style="width:120px;height:120px;border-radius:12px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:36px">🖼️</div>`;

      el.innerHTML = `
        <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <div class="img-preview">${preview}</div>
          <div style="flex:1;min-width:220px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              <button type="button" class="btn btn-primary btn-sm" data-act="upload">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                رفع صورة من الجهاز
              </button>
              ${value ? `<button type="button" class="btn btn-danger btn-sm" data-act="clear">إزالة الصورة</button>` : ''}
            </div>
            <input type="file" class="img-file" accept="${opts.accept || 'image/*'}" style="display:none">
            <div style="font-size:12px;color:var(--muted);margin-top:6px">
              أو الصق رابط الصورة مباشرة:
            </div>
            <input type="url" class="img-url" placeholder="https://..." value="${value && !value.startsWith('data:') ? value : ''}" style="width:100%;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--ink);font-size:13px;font-family:inherit;margin-top:4px">
            <div style="font-size:11px;color:var(--muted);margin-top:4px">الحد الأقصى: 5MB — يُصغَّر تلقائيًا إلى 800×800</div>
          </div>
        </div>
      `;

      // ربط الأحداث
      const btnUpload = el.querySelector('[data-act="upload"]');
      const btnClear = el.querySelector('[data-act="clear"]');
      const fileInput = el.querySelector('.img-file');
      const urlInput = el.querySelector('.img-url');

      if (btnUpload) {
        btnUpload.addEventListener('click', () => fileInput.click());
      }
      if (btnClear) {
        btnClear.addEventListener('click', () => {
          setValue('');
        });
      }
      if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          try {
            const dataUrl = await readFileAsDataURL(file);
            setValue(dataUrl);
          } catch (err) {
            if (window.UI && UI.toast) UI.toast('فشل رفع الصورة: ' + err.message, 'error');
            else alert('فشل رفع الصورة: ' + err.message);
          }
          fileInput.value = '';
        });
      }
      if (urlInput) {
        let urlTimer;
        urlInput.addEventListener('input', (e) => {
          clearTimeout(urlTimer);
          urlTimer = setTimeout(() => {
            const v = e.target.value.trim();
            if (v !== value) setValue(v);
          }, 400);
        });
      }
    }

    function setValue(newValue) {
      value = newValue || '';
      render();
      try { onChange(value); } catch (e) {}
    }

    render();

    return {
      getValue: () => value,
      setValue: setValue
    };
  }

  return { mount, readFileAsDataURL };
})();
