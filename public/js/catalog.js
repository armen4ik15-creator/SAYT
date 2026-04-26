/**
 * Mobitrend — каталог
 * Загружает товары через /api/products, динамически строит фильтры брендов и категорий.
 */
(async () => {
  let ALL = [];

  // ── Helpers ──
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ── Load ──
  async function init() {
    try {
      const r = await MTApi.listProducts();
      ALL = r.items || [];
    } catch (e) {
      console.error('catalog load', e);
      ALL = [];
    }
    buildCategoryFilters();
    buildBrandFilters();
    initPriceRange();

    // pre-select category from URL
    const params = new URLSearchParams(location.search);
    const cat = params.get('cat');
    if (cat) {
      const cb = $(`#categoryFilters input[value="${cat}"]`);
      if (cb) cb.checked = true;
    }
    const q = params.get('q');
    if (q) {
      const search = $('#searchInput');
      if (search) search.value = q;
    }
    apply();
  }

  function buildCategoryFilters() {
    const box = $('#categoryFilters');
    if (!box) return;
    const counts = {};
    ALL.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    box.innerHTML = sorted.map(([cat, n]) => {
      const name = (ALL.find(p => p.category === cat) || {}).categoryName || cat;
      const icon = MTIcons.get(cat);
      return `
        <label class="filter-check filter-cat">
          <input type="checkbox" value="${cat}">
          <label><span class="cat-icon-wrap">${icon}</span>${escHtml(name)} <span class="cat-count-mini">${n}</span></label>
        </label>`;
    }).join('') || '<div class="login-hint">Пока нет товаров</div>';
  }

  function buildBrandFilters() {
    const box = $('#brandFilters');
    if (!box) return;
    const counts = {};
    ALL.forEach(p => {
      const b = (p.brand || '').trim();
      if (!b) return;
      counts[b] = (counts[b] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    box.innerHTML = sorted.length
      ? sorted.map(([b, n]) => `
          <label class="filter-check">
            <input type="checkbox" value="${escHtml(b)}">
            <label>${escHtml(b)} <span style="opacity:.5; font-weight:400;">(${n})</span></label>
          </label>`).join('')
      : '<div class="login-hint">Пока нет товаров</div>';
  }

  function initPriceRange() {
    const slider = $('#priceSlider');
    if (!slider) return;
    const max = Math.max(6000, ...ALL.map(p => p.prices?.smallWholesale || 0));
    slider.max = Math.ceil(max / 100) * 100;
    slider.value = slider.max;
    const out = $('#priceSliderVal');
    if (out) out.textContent = `до ${(+slider.value).toLocaleString('ru-RU')} ₽`;
    const maxInput = $('#priceMax');
    if (maxInput) { maxInput.value = slider.value; maxInput.max = slider.max; }
  }

  // ── Apply filters ──
  function apply() {
    const selCats = $$('#categoryFilters input:checked').map(i => i.value);
    const selBrands = $$('#brandFilters input:checked').map(i => i.value);
    const priceMax = parseInt($('#priceSlider')?.value || '999999', 10);
    const priceMin = parseInt($('#priceMin')?.value || '0', 10);
    const sliderVal = $('#priceSliderVal');
    if (sliderVal) sliderVal.textContent = `до ${priceMax.toLocaleString('ru-RU')} ₽`;
    const maxInput = $('#priceMax');
    if (maxInput) maxInput.value = priceMax;

    const minMargin = parseInt(document.querySelector('input[name="margin"]:checked')?.value || '0', 10);
    const inStock = $('#inStock')?.checked;
    const sort = $('#sortSelect')?.value || 'popular';
    const search = ($('#searchInput')?.value || '').toLowerCase();

    let r = ALL.slice();
    if (selCats.length) r = r.filter(p => selCats.includes(p.category));
    if (selBrands.length) r = r.filter(p => selBrands.includes(p.brand));
    r = r.filter(p => {
      const price = p.prices?.smallWholesale || p.prices?.largeWholesale || 0;
      return price <= priceMax && price >= priceMin;
    });
    if (minMargin > 0) r = r.filter(p => (p.margin || 0) >= minMargin);
    if (inStock) r = r.filter(p => (p.stock || 0) > 0);
    if (search) {
      r = r.filter(p =>
        (p.name || '').toLowerCase().includes(search) ||
        (p.description || '').toLowerCase().includes(search) ||
        (p.brand || '').toLowerCase().includes(search) ||
        (p.sku || '').toLowerCase().includes(search)
      );
    }

    if (sort === 'price-asc')   r.sort((a, b) => (a.prices?.smallWholesale || 0) - (b.prices?.smallWholesale || 0));
    else if (sort === 'price-desc') r.sort((a, b) => (b.prices?.smallWholesale || 0) - (a.prices?.smallWholesale || 0));
    else if (sort === 'margin-desc') r.sort((a, b) => (b.margin || 0) - (a.margin || 0));
    else if (sort === 'rating') r.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'new')    r.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else r.sort((a, b) => (b.isHit ? 1 : 0) - (a.isHit ? 1 : 0));

    render(r);
  }

  function render(items) {
    const grid = $('#catalogGrid');
    const empty = $('#emptyState');
    const count = $('#catalogCount');
    if (count) count.textContent = `Найдено: ${items.length}` + (items.length === 1 ? ' товар' : items.length < 5 ? ' товара' : ' товаров');
    if (!items.length) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (!grid) return;
    grid.innerHTML = items.map(p => `
      <div class="product-card">
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="product-card-img" style="display:block; position:relative;">
          <img src="${escHtml(p.image || '')}" alt="${escHtml(p.name)}" loading="lazy" onerror="this.style.opacity='0.3'">
          <div class="product-card-badges">
            ${p.isHit ? '<span class="badge badge-orange">🔥 Хит</span>' : ''}
            ${p.isNew ? '<span class="badge badge-green">✨ Новинка</span>' : ''}
            ${p.margin >= 200 ? `<span class="badge badge-green">+${p.margin}% маржа</span>` : ''}
            ${p.stock > 0 && p.stock < 50 ? '<span class="badge badge-orange">⚠ Мало</span>' : ''}
            ${p.stock <= 0 ? '<span class="badge" style="background:#9CA3AF; color:#fff">нет в наличии</span>' : ''}
          </div>
        </a>
        <div class="product-card-body">
          <div class="product-brand">${escHtml(p.brand || '')}</div>
          <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="product-name" style="text-decoration:none; color:inherit;">${escHtml(p.name)}</a>
          <div class="price-table">
            ${p.prices?.retail ? `
            <div class="price-row retail">
              <span class="price-tier">Розница</span>
              <span class="price-value">${formatPrice(p.prices.retail)}</span>
            </div>` : ''}
            <div class="price-row">
              <span class="price-tier">Мелкий опт${p.minQty?.smallWholesale ? ` (от ${p.minQty.smallWholesale} шт)` : ''}</span>
              <span class="price-value">${formatPrice(p.prices?.smallWholesale)}</span>
            </div>
            <div class="price-row wholesale-lg">
              <span class="price-tier">Крупный опт${p.minQty?.largeWholesale ? ` (от ${p.minQty.largeWholesale} шт)` : ''}</span>
              <span class="price-value">${formatPrice(p.prices?.largeWholesale)}</span>
            </div>
          </div>
          <div class="product-card-footer">
            <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="btn btn-primary btn-sm">Подробнее</a>
            <button class="btn btn-secondary btn-sm" onclick="orderProduct('${escHtml(p.slug)}', '${escHtml(p.name)}')">Заказать</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.applyFilters = apply;
  window.resetFilters = function () {
    $$('.filter-group input[type=checkbox]').forEach(i => (i.checked = false));
    const allRadio = document.querySelector('input[name="margin"][value="0"]');
    if (allRadio) allRadio.checked = true;
    initPriceRange();
    const search = $('#searchInput'); if (search) search.value = '';
    const inStock = $('#inStock'); if (inStock) inStock.checked = true;
    apply();
  };

  window.orderProduct = function (slug, name) {
    window.__mtCart = [{ slug, name }];
    openModal();
    const t = document.querySelector('.modal-title');
    if (t) t.textContent = `Заявка: ${name}`;
  };

  // Wire events
  document.addEventListener('change', (e) => {
    if (e.target.matches('#categoryFilters input, #brandFilters input, input[name="margin"], #inStock, #priceMin, #priceMax, #sortSelect')) {
      apply();
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches('#priceSlider')) {
      const out = $('#priceSliderVal');
      if (out) out.textContent = `до ${(+e.target.value).toLocaleString('ru-RU')} ₽`;
      const maxInput = $('#priceMax'); if (maxInput) maxInput.value = e.target.value;
      apply();
    }
    if (e.target.matches('#searchInput')) apply();
  });

  init();
})();
