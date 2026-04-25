/**
 * Mobitrend — страница товара
 */
(async () => {
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug') || params.get('id');
  if (!slug) {
    document.getElementById('productLayout').innerHTML = '<div style="padding:40px; text-align:center;">Товар не указан. <a href="catalog.html">Вернуться в каталог</a></div>';
    return;
  }

  let product;
  try {
    const r = await MTApi.getProduct(slug);
    product = r.item;
  } catch (e) {
    document.getElementById('productLayout').innerHTML = '<div style="padding:40px; text-align:center;">Товар не найден. <a href="catalog.html">Вернуться в каталог</a></div>';
    return;
  }

  renderProduct(product);
  loadRelated(product);

  function renderStars(rating) {
    const r = +rating || 0;
    const full = Math.floor(r);
    const half = r % 1 >= 0.5 ? 1 : 0;
    const empty = Math.max(0, 5 - full - half);
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  }

  function renderProduct(p) {
    document.getElementById('pageTitle').textContent = `${p.name} — оптом Mobitrend`;
    document.getElementById('pageDesc').content = `Купить оптом ${p.name} от ${p.prices?.largeWholesale || 0} ₽. Mobitrend — гарантия 1 год.`;
    document.getElementById('pageCanon').href = `${location.origin}/product.html?slug=${encodeURIComponent(p.slug)}`;
    document.getElementById('breadcrumbName').textContent = p.name;

    document.getElementById('productSchema').textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "sku": p.sku,
      "brand": { "@type": "Brand", "name": p.brand || 'Mobitrend' },
      "image": p.images && p.images.length ? p.images : (p.image ? [p.image] : []),
      "description": p.description,
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": p.prices?.largeWholesale || 0,
        "highPrice": p.prices?.retail || p.prices?.smallWholesale || 0,
        "priceCurrency": "RUB",
        "availability": (p.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "Mobitrend" }
      },
      "aggregateRating": p.reviews ? { "@type": "AggregateRating", "ratingValue": p.rating || 5, "reviewCount": p.reviews } : undefined
    });

    const images = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    const profitPerUnit = (p.prices?.retail || 0) - (p.prices?.largeWholesale || 0);
    const profitPct = p.prices?.largeWholesale > 0 ? Math.round((profitPerUnit / p.prices.largeWholesale) * 100) : 0;

    const galleryThumbs = images.map((img, idx) => `
      <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="window.__switchImage(${idx})" style="cursor:pointer;">
        <img src="${escHtml(img)}" alt="${escHtml(p.name)} фото ${idx + 1}">
      </div>
    `).join('');

    const specsRows = Object.entries(p.specs || {}).map(([k, v]) => `
      <tr><td>${escHtml(k)}</td><td>${escHtml(v)}</td></tr>
    `).join('') || '<tr><td colspan="2" style="text-align:center; color:var(--ink-muted);">Характеристики не заполнены</td></tr>';

    document.getElementById('productLayout').innerHTML = `
      <div>
        <div class="gallery-main" id="galleryMain">
          <img id="galleryMainImg" src="${escHtml(images[0] || '')}" alt="${escHtml(p.name)}" onerror="this.style.opacity='0.3'">
        </div>
        ${images.length > 1 ? `<div class="gallery-thumbs" id="galleryThumbs">${galleryThumbs}</div>` : ''}
      </div>

      <div>
        <div class="product-brand-line">${escHtml(p.brand || '')} · ${escHtml(p.categoryName || '')}</div>
        <h1 class="product-title">${escHtml(p.name)}</h1>
        <div class="product-rating">
          <span class="stars" aria-label="Рейтинг ${p.rating || 0}">${renderStars(p.rating)}</span>
          <span style="font-weight:700; color:var(--ink); font-size:0.9rem;">${(p.rating || 0).toFixed ? (p.rating || 0).toFixed(1) : p.rating}</span>
          <span class="rating-count">(${p.reviews || 0} отзывов)</span>
          ${(p.stock || 0) > 0
            ? `<span class="badge badge-green" style="margin-left:8px;">✓ В наличии ${p.stock} шт</span>`
            : `<span class="badge" style="margin-left:8px; background:#9CA3AF; color:#fff;">Под заказ</span>`}
        </div>

        ${p.sku ? `<div style="font-size:0.8rem; color:var(--ink-muted); margin-bottom:20px;">
          Артикул: <strong style="color:var(--ink);">${escHtml(p.sku)}</strong>
        </div>` : ''}

        <div class="price-block">
          <div class="price-block-title">Оптовые цены</div>
          <div class="price-block-rows">
            ${p.prices?.retail ? `
            <div class="price-block-row" style="opacity:0.7;">
              <div>
                <div class="tier-name">Розничная цена (РРЦ)</div>
                <div class="tier-qty">Для ориентира</div>
              </div>
              <div class="tier-price" style="color:var(--ink-muted); text-decoration:line-through;">${formatPrice(p.prices.retail)}</div>
            </div>` : ''}
            <div class="price-block-row">
              <div>
                <div class="tier-name">Мелкий опт</div>
                <div class="tier-qty">от ${p.minQty?.smallWholesale || 10} штук</div>
              </div>
              <div class="tier-price">${formatPrice(p.prices?.smallWholesale)}</div>
            </div>
            <div class="price-block-row featured">
              <div>
                <div class="tier-name">⚡ Крупный опт</div>
                <div class="tier-qty">от ${p.minQty?.largeWholesale || 50} штук</div>
              </div>
              <div class="tier-price">${formatPrice(p.prices?.largeWholesale)}</div>
            </div>
          </div>
        </div>

        ${profitPerUnit > 0 ? `
        <div class="product-calc">
          <div class="product-calc-title">📈 Ваша прибыль при продаже по РРЦ</div>
          <div style="margin-top:8px; display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <div>
              <div style="font-size:0.75rem; color:var(--green); opacity:0.7;">С единицы</div>
              <div class="product-calc-value">${profitPerUnit.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--green); opacity:0.7;">Маржинальность</div>
              <div class="product-calc-value">+${profitPct}%</div>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--green); opacity:0.7;">С партии ${p.minQty?.largeWholesale || 50} шт</div>
              <div class="product-calc-value">${(profitPerUnit * (p.minQty?.largeWholesale || 50)).toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:0.78rem; color:var(--green); opacity:0.7; display:block; margin-bottom:4px;">Рассчитать для своего объёма:</label>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <input type="number" id="qtyInput" class="price-input" value="${p.minQty?.largeWholesale || 50}" min="1" style="width:100px; border-color:rgba(22,163,74,0.4);">
              <span style="font-size:0.85rem; color:var(--green);">шт → прибыль:</span>
              <span id="qtyProfit" style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; color:var(--green);">${(profitPerUnit * (p.minQty?.largeWholesale || 50)).toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </div>` : ''}

        <div class="product-actions">
          <button onclick="window.__orderThis()" class="btn btn-primary btn-lg">📋 Заказать / узнать условия</button>
          <button onclick="openModal()" class="btn btn-secondary btn-lg">💬 Задать вопрос</button>
        </div>

        ${p.description ? `
        <div style="margin-bottom:24px;">
          <h3 style="font-family:var(--font-display); font-size:0.95rem; font-weight:700; color:var(--ink); margin-bottom:8px;">О товаре</h3>
          <p style="font-size:0.92rem; line-height:1.7; color:var(--ink-soft); white-space:pre-wrap;">${escHtml(p.description)}</p>
        </div>` : ''}

        <div>
          <h3 style="font-family:var(--font-display); font-size:0.95rem; font-weight:700; color:var(--ink); margin-bottom:12px;">Характеристики</h3>
          <table class="specs-table" aria-label="Технические характеристики">
            <tbody>${specsRows}</tbody>
          </table>
        </div>

        <div style="display:flex; gap:16px; margin-top:24px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--ink-muted);">🛡️ Гарантия 12 мес</div>
          <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--ink-muted);">🚚 Доставка 2–5 дней</div>
          <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--ink-muted);">↩️ Возврат брака</div>
          <div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:var(--ink-muted);">🏅 Официальная продукция</div>
        </div>
      </div>
    `;

    window.__switchImage = (idx) => {
      const main = document.getElementById('galleryMainImg');
      if (main) main.src = images[idx];
      document.querySelectorAll('.gallery-thumb').forEach((el, i) => el.classList.toggle('active', i === idx));
    };

    window.__orderThis = () => {
      window.__mtCart = [{ slug: p.slug, name: p.name, sku: p.sku }];
      const t = document.querySelector('.modal-title');
      if (t) t.textContent = `Заявка: ${p.name}`;
      openModal();
    };

    const qtyInput = document.getElementById('qtyInput');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        const qty = parseInt(qtyInput.value, 10) || 1;
        const profit = ((p.prices?.retail || 0) - (p.prices?.largeWholesale || 0)) * qty;
        document.getElementById('qtyProfit').textContent = profit.toLocaleString('ru-RU') + ' ₽';
      });
    }
  }

  async function loadRelated(p) {
    try {
      const r = await MTApi.listProducts({ category: p.category, limit: 5 });
      const items = (r.items || []).filter(x => x.id !== p.id).slice(0, 4);
      if (!items.length) return;

      document.getElementById('relatedSection').classList.remove('hidden');
      document.getElementById('relatedGrid').innerHTML = items.map(rp => `
        <div class="product-card">
          <a href="product.html?slug=${encodeURIComponent(rp.slug)}" class="product-card-img" style="display:block; position:relative;">
            <img src="${escHtml(rp.image || '')}" alt="${escHtml(rp.name)}" loading="lazy" onerror="this.style.opacity='0.3'">
            <div class="product-card-badges">
              ${rp.isHit ? '<span class="badge badge-orange">🔥 Хит</span>' : ''}
              ${rp.margin >= 200 ? `<span class="badge badge-green">+${rp.margin}% маржа</span>` : ''}
            </div>
          </a>
          <div class="product-card-body">
            <div class="product-brand">${escHtml(rp.brand || '')}</div>
            <a href="product.html?slug=${encodeURIComponent(rp.slug)}" class="product-name" style="text-decoration:none; color:inherit;">${escHtml(rp.name)}</a>
            <div class="price-table">
              <div class="price-row wholesale-lg">
                <span class="price-tier">Крупный опт</span>
                <span class="price-value">${formatPrice(rp.prices?.largeWholesale)}</span>
              </div>
            </div>
            <div class="product-card-footer">
              <a href="product.html?slug=${encodeURIComponent(rp.slug)}" class="btn btn-primary btn-sm">Подробнее</a>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) { /* silent */ }
  }
})();
