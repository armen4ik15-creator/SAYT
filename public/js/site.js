/**
 * Mobitrend — общие функции для всех страниц сайта
 * - модалка заявки
 * - мобильное меню
 * - отправка лида
 */
(() => {
  // ── Modal ──
  window.openModal = function () {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };
  window.closeModal = function () {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  document.addEventListener('click', (e) => {
    const overlay = document.getElementById('modalOverlay');
    if (overlay && e.target === overlay) closeModal();
  });

  // ── Mobile menu ──
  window.toggleMobileMenu = function () {
    const m = document.getElementById('mobileMenu');
    if (m) m.classList.toggle('open');
  };

  // ── Унифицированная отправка лидов ──
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.matches('form[data-source]') && form.id !== 'leadForm') return;

    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

    const fd = new FormData(form);
    const payload = {
      name: (fd.get('name') || '').toString().trim(),
      phone: (fd.get('phone') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      company: (fd.get('company') || '').toString().trim(),
      message: (fd.get('message') || '').toString().trim(),
      source: form.dataset.source || form.id || 'site',
      items: window.__mtCart || [],
    };

    try {
      await window.MTApi.submitLead(payload);
      if (btn) {
        btn.textContent = '✓ Отправлено!';
        btn.style.background = '#10B981';
        btn.style.color = '#fff';
      }
      form.reset();
      setTimeout(() => {
        if (btn) { btn.disabled = false; btn.textContent = originalText; btn.style.background = ''; btn.style.color = ''; }
        closeModal();
      }, 2200);
    } catch (err) {
      console.error('lead submit', err);
      if (btn) {
        btn.textContent = 'Ошибка. Попробуйте ещё раз';
        btn.style.background = '#DC2626';
        btn.style.color = '#fff';
      }
      setTimeout(() => {
        if (btn) { btn.disabled = false; btn.textContent = originalText; btn.style.background = ''; btn.style.color = ''; }
      }, 2500);
    }
  });

  // ── Helper: format price ──
  window.formatPrice = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';

  // ── Helper: HTML escape ──
  window.escHtml = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
})();
