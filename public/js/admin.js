/**
 * Mobitrend — админ-панель
 */
const CATEGORY_NAMES = {
  cases: 'Чехлы',
  chargers: 'Зарядки',
  glass: 'Защитные стёкла',
  powerbanks: 'Power Bank',
  cables: 'Кабели',
  headphones: 'Наушники',
  memory: 'Карты памяти / флешки',
  holders: 'Держатели',
  other: 'Другое',
};

let products = [];
let leads = [];
let currentId = null;
let currentImages = [];

const $ = (sel) => document.querySelector(sel);

/* ── INIT ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  $('#loginForm').addEventListener('submit', onLogin);
  $('#searchBox').addEventListener('input', renderList);
  $('#photoInput').addEventListener('change', onUploadPhotos);
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  if (MTApi.isAuthed()) {
    try {
      const me = await MTApi.me();
      enterApp(me.user);
    } catch (e) {
      MTApi.clearToken();
      showLogin();
    }
  } else {
    showLogin();
  }
});

function showLogin() {
  $('#loginScreen').style.display = 'flex';
  $('#adminApp').style.display = 'none';
}

async function enterApp(user) {
  $('#loginScreen').style.display = 'none';
  $('#adminApp').style.display = 'block';
  $('#adminUser').textContent = user?.login ? `👤 ${user.login}` : '';
  await loadProducts();
  await loadLeads();
  newProduct();
}

async function onLogin(e) {
  e.preventDefault();
  $('#loginError').textContent = '';
  const login = e.target.login.value.trim();
  const password = e.target.password.value;
  try {
    const r = await MTApi.login(login, password);
    MTApi.setToken(r.token);
    enterApp({ login: r.login });
  } catch (err) {
    $('#loginError').textContent = err.message || 'Ошибка входа';
  }
}

function logout() {
  MTApi.clearToken();
  location.reload();
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
  if (name === 'leads') renderLeads();
}

/* ── PRODUCTS LIST ──────────────────────────────── */
async function loadProducts() {
  try {
    const r = await MTApi.listAdminProducts();
    products = r.items || [];
    renderList();
    updateStats();
  } catch (e) {
    toast('Не удалось загрузить товары: ' + e.message, 'error');
  }
}

function renderList() {
  const list = $('#productList');
  const filter = $('#searchBox').value.toLowerCase();
  const filtered = products.filter(p =>
    !filter || p.name.toLowerCase().includes(filter) ||
    (p.sku || '').toLowerCase().includes(filter) ||
    (p.brand || '').toLowerCase().includes(filter)
  );

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">Товары не найдены.<br>Нажмите <b>+ Новый</b>, чтобы добавить.</div>';
    return;
  }

  list.innerHTML = filtered.map(p => `
    <div class="product-row ${p.id === currentId ? 'active' : ''}" onclick="editProduct(${p.id})">
      <img class="product-thumb" src="${esc(p.image || '')}" alt="" onerror="this.style.background='var(--wood)';this.src='';">
      <div class="product-info">
        <div class="product-info-name">
          ${esc(p.name)}
          ${p.isHit ? '<span class="badge">HIT</span>' : ''}
          ${p.isNew ? '<span class="badge badge-wood">NEW</span>' : ''}
          ${p.isActive === false ? '<span class="badge" style="background:#9CA3AF">скрыт</span>' : ''}
        </div>
        <div class="product-info-meta">${esc(p.brand || '—')} · ${esc(p.sku || '—')} · маржа ${p.margin || 0}%</div>
      </div>
      <div class="product-price-small">${(p.prices?.smallWholesale || 0).toLocaleString('ru')} ₽</div>
    </div>
  `).join('');
}

function updateStats() {
  $('#statTotal').textContent = products.length;
  $('#statHits').textContent = products.filter(p => p.isHit).length;
  $('#statActive').textContent = products.filter(p => p.isActive !== false).length;
  const margins = products.filter(p => p.margin > 0);
  const avg = margins.length ? Math.round(margins.reduce((s, p) => s + p.margin, 0) / margins.length) : 0;
  $('#statAvgMargin').textContent = avg + '%';
}

/* ── FORM ───────────────────────────────────────── */
function newProduct() {
  currentId = null;
  currentImages = [];
  $('#formTitle').textContent = 'Добавить товар';
  $('#deleteBtn').style.display = 'none';
  $('#productForm').reset();
  $('#imagesText').value = '';
  $('#specsList').innerHTML = '';
  addSpec(); addSpec();
  renderPhotos();
  renderList();
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentId = id;
  currentImages = (p.images && p.images.length ? p.images : (p.image ? [p.image] : [])).slice();
  $('#formTitle').textContent = 'Редактировать: ' + p.name;
  $('#deleteBtn').style.display = 'inline-block';

  const f = $('#productForm');
  f.name.value = p.name || '';
  f.sku.value = p.sku || '';
  f.brand.value = p.brand || '';
  f.category.value = p.category || 'other';
  f.retail.value = p.prices?.retail || '';
  f.smallWholesale.value = p.prices?.smallWholesale || '';
  f.largeWholesale.value = p.prices?.largeWholesale || '';
  f.minQtySmall.value = p.minQty?.smallWholesale || 10;
  f.minQtyLarge.value = p.minQty?.largeWholesale || 50;
  f.stock.value = p.stock || 0;
  f.margin.value = p.margin || 0;
  f.rating.value = p.rating || 4.8;
  f.reviews.value = p.reviews || 0;
  f.description.value = p.description || '';
  f.isHit.checked = !!p.isHit;
  f.isNew.checked = !!p.isNew;
  f.isActive.checked = p.isActive !== false;
  $('#imagesText').value = '';

  $('#specsList').innerHTML = '';
  Object.entries(p.specs || {}).forEach(([k, v]) => addSpec(k, v));
  if (!Object.keys(p.specs || {}).length) addSpec();

  renderPhotos();
  renderList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() { newProduct(); }

async function saveProduct(e) {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData(f);

  // Specs
  const specs = {};
  document.querySelectorAll('.spec-item').forEach(row => {
    const k = row.querySelector('[name=specKey]').value.trim();
    const v = row.querySelector('[name=specVal]').value.trim();
    if (k && v) specs[k] = v;
  });

  // Сливаем изображения: загруженные + добавленные текстом
  const extra = ($('#imagesText').value || '')
    .split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  const images = [...currentImages, ...extra].filter(Boolean);

  const product = {
    name: fd.get('name').trim(),
    brand: (fd.get('brand') || '').trim(),
    category: fd.get('category'),
    categoryName: CATEGORY_NAMES[fd.get('category')] || 'Другое',
    sku: (fd.get('sku') || '').trim(),
    image: images[0] || '',
    images,
    prices: {
      retail: +fd.get('retail') || 0,
      smallWholesale: +fd.get('smallWholesale') || 0,
      largeWholesale: +fd.get('largeWholesale') || 0,
    },
    minQty: {
      smallWholesale: +fd.get('minQtySmall') || 10,
      largeWholesale: +fd.get('minQtyLarge') || 50,
    },
    margin: +fd.get('margin') || 0,
    stock: +fd.get('stock') || 0,
    rating: +fd.get('rating') || 4.8,
    reviews: +fd.get('reviews') || 0,
    isHit: !!fd.get('isHit'),
    isNew: !!fd.get('isNew'),
    isActive: !!fd.get('isActive'),
    description: fd.get('description').trim(),
    specs,
  };

  try {
    let saved;
    if (currentId) {
      saved = await MTApi.updateProduct(currentId, product);
      toast('Товар обновлён', 'success');
    } else {
      saved = await MTApi.createProduct(product);
      toast('Товар добавлен', 'success');
    }
    currentId = saved.item.id;
    currentImages = saved.item.images || [];
    $('#imagesText').value = '';
    await loadProducts();
    editProduct(currentId);
  } catch (e) {
    toast('Ошибка сохранения: ' + e.message, 'error');
  }
}

async function deleteCurrentProduct() {
  if (!currentId) return;
  const p = products.find(x => x.id === currentId);
  if (!confirm('Удалить «' + (p?.name || '') + '»? Действие необратимо.')) return;
  try {
    await MTApi.deleteProduct(currentId);
    toast('Удалено', 'success');
    await loadProducts();
    newProduct();
  } catch (e) {
    toast('Ошибка удаления: ' + e.message, 'error');
  }
}

/* ── PHOTOS ─────────────────────────────────────── */
async function onUploadPhotos(e) {
  const files = e.target.files;
  if (!files || !files.length) return;
  toast('Загружаю фото…');
  try {
    const r = await MTApi.uploadImages(files);
    currentImages = currentImages.concat((r.items || []).map(i => i.url));
    renderPhotos();
    toast('Фото загружены', 'success');
  } catch (err) {
    toast('Ошибка загрузки: ' + err.message, 'error');
  } finally {
    e.target.value = '';
  }
}

function renderPhotos() {
  const box = $('#photosPreview');
  if (!currentImages.length) {
    box.innerHTML = '<div class="login-hint">Фото пока нет</div>';
    return;
  }
  box.innerHTML = currentImages.map((url, i) => `
    <div class="photo-item">
      <img src="${esc(url)}" alt="">
      <button type="button" class="photo-del" onclick="removePhoto(${i})" title="Удалить">×</button>
      ${i === 0 ? '<span class="photo-main">главное</span>' : ''}
    </div>
  `).join('');
}

function removePhoto(idx) {
  currentImages.splice(idx, 1);
  renderPhotos();
}

/* ── SPECS ──────────────────────────────────────── */
function addSpec(key = '', val = '') {
  const row = document.createElement('div');
  row.className = 'spec-item';
  row.innerHTML = `
    <input type="text" name="specKey" placeholder="Ключ (напр. Ёмкость)" value="${esc(key)}">
    <input type="text" name="specVal" placeholder="Значение (напр. 10000 мАч)" value="${esc(val)}">
    <button type="button" class="spec-del" onclick="this.parentElement.remove()">×</button>
  `;
  $('#specsList').appendChild(row);
}

/* ── LEADS ──────────────────────────────────────── */
async function loadLeads() {
  try {
    const r = await MTApi.listLeads();
    leads = r.items || [];
    renderLeads();
  } catch (e) {
    leads = [];
  }
}

function renderLeads() {
  const list = $('#leadsList');
  if (!leads.length) {
    list.innerHTML = '<div class="empty-state">Заявок пока нет</div>';
    return;
  }
  list.innerHTML = leads.map(l => `
    <div class="lead-card lead-${esc(l.status || 'new')}">
      <div class="lead-head">
        <div>
          <strong>${esc(l.name || 'Без имени')}</strong>
          <span class="badge">${esc(l.status || 'new')}</span>
          ${l.company ? `<span class="login-hint">· ${esc(l.company)}</span>` : ''}
        </div>
        <span class="login-hint">${new Date(l.createdAt).toLocaleString('ru')}</span>
      </div>
      <div class="lead-body">
        ${l.phone ? `<div>📞 <a href="tel:${esc(l.phone)}">${esc(l.phone)}</a></div>` : ''}
        ${l.email ? `<div>✉️ <a href="mailto:${esc(l.email)}">${esc(l.email)}</a></div>` : ''}
        ${l.message ? `<div class="lead-msg">${esc(l.message)}</div>` : ''}
        ${l.items?.length ? `<div class="login-hint">Товары в заявке: ${l.items.length}</div>` : ''}
        <div class="login-hint">Источник: ${esc(l.source || 'site')}</div>
      </div>
      <div class="lead-actions">
        <button class="btn-admin btn-outline" onclick="setLeadStatus(${l.id}, 'in_work')">В работе</button>
        <button class="btn-admin btn-green" onclick="setLeadStatus(${l.id}, 'done')">Завершить</button>
        <button class="btn-admin btn-danger" onclick="deleteLead(${l.id})">Удалить</button>
      </div>
    </div>
  `).join('');
}

async function setLeadStatus(id, status) {
  try { await MTApi.updateLead(id, { status }); await loadLeads(); }
  catch (e) { toast(e.message, 'error'); }
}

async function deleteLead(id) {
  if (!confirm('Удалить заявку?')) return;
  try { await MTApi.deleteLead(id); await loadLeads(); }
  catch (e) { toast(e.message, 'error'); }
}

/* ── IMPORT / EXPORT ────────────────────────────── */
function exportProducts() {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'products.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importProducts(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!confirm('Импорт ЗАМЕНИТ ВСЕ товары на содержимое файла. Продолжить?')) {
    e.target.value = ''; return;
  }
  try {
    const text = await file.text();
    const items = JSON.parse(text);
    if (!Array.isArray(items)) throw new Error('Ожидается массив товаров');
    await MTApi.bulkProducts(items);
    toast(`Импортировано ${items.length} товаров`, 'success');
    await loadProducts();
  } catch (err) {
    toast('Ошибка импорта: ' + err.message, 'error');
  } finally {
    e.target.value = '';
  }
}

/* ── UTILS ──────────────────────────────────────── */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove('show'), 2500);
}
