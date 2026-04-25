/**
 * Mobitrend — главная: загрузка хитов, калькулятор, всякое
 */
(async () => {
  // ── Категории на главной (грузим из API) ──
  const catGrid = document.getElementById('homeCategoriesGrid');
  if (catGrid) {
    try {
      const r = await MTApi.listCategories();
      const items = (r.items || []).slice(0, 8);
      if (items.length) {
        catGrid.innerHTML = items.map(c => `
          <a href="catalog.html?cat=${encodeURIComponent(c.category)}" class="category-card">
            <div class="cat-icon">${MTIcons.get(c.category)}</div>
            <div class="cat-name">${escHtml(c.name || c.category)}</div>
            <div class="cat-count">${c.count} ${c.count === 1 ? 'позиция' : c.count < 5 ? 'позиции' : 'позиций'}</div>
          </a>
        `).join('');
      } else {
        // Заглушка на случай пустого каталога — показываем стандартные категории
        const fallback = [
          ['cases', 'Чехлы'],
          ['chargers', 'Зарядки'],
          ['glass', 'Стёкла'],
          ['powerbanks', 'Power Bank'],
          ['cables', 'Кабели'],
          ['headphones', 'Наушники'],
        ];
        catGrid.innerHTML = fallback.map(([cat, name]) => `
          <a href="catalog.html?cat=${cat}" class="category-card">
            <div class="cat-icon">${MTIcons.get(cat)}</div>
            <div class="cat-name">${name}</div>
            <div class="cat-count">скоро в наличии</div>
          </a>
        `).join('');
      }
    } catch (e) { /* silent */ }
  }

  // ── Hits (товары с isHit) ──
  const grid = document.getElementById('hitsGrid');
  if (grid) {
    try {
      const r = await MTApi.listProducts({ hit: 'true', limit: 8 });
      const items = r.items || [];
      if (!items.length) {
        // Если нет помеченных, покажем первые 4
        const all = await MTApi.listProducts({ limit: 4 });
        renderHits(all.items || []);
      } else {
        renderHits(items.slice(0, 4));
      }
    } catch (e) {
      grid.innerHTML = '<div style="grid-column:1/-1; padding:32px; text-align:center; color:var(--ink-muted);">Загрузка не удалась. <a href="catalog.html">Открыть каталог →</a></div>';
    }
  }

  function renderHits(products) {
    if (!products.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; padding:48px 24px; text-align:center; color:var(--ink-muted); border:2px dashed var(--border); border-radius:16px;">
          <div style="font-size:2.5rem; margin-bottom:12px;">🛒</div>
          <h3 style="font-family:var(--font-display); color:var(--ink); margin-bottom:8px;">Каталог пока пуст</h3>
          <p>Зайдите в <a href="admin.html" style="color:var(--blue); font-weight:600;">админ-панель</a>, чтобы добавить товары.</p>
        </div>`;
      return;
    }
    grid.innerHTML = products.map(p => `
      <div class="product-card">
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="product-card-img" style="display:block; position:relative;">
          <img src="${escHtml(p.image || '')}" alt="${escHtml(p.name)}" loading="lazy" onerror="this.style.opacity='0.3'">
          <div class="product-card-badges">
            ${p.isHit ? '<span class="badge badge-orange">🔥 Хит</span>' : ''}
            ${p.isNew ? '<span class="badge badge-green">✨ Новинка</span>' : ''}
            ${p.margin >= 200 ? `<span class="badge badge-green">+${p.margin}% маржа</span>` : ''}
          </div>
        </a>
        <div class="product-card-body">
          <div class="product-brand">${escHtml(p.brand || '')}</div>
          <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="product-name" style="text-decoration:none; color:inherit;">${escHtml(p.name)}</a>
          <div class="price-table">
            ${p.prices?.retail ? `
            <div class="