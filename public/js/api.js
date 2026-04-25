/**
 * Mobitrend — лёгкий API-клиент для фронтенда
 * Используется и в публичной части, и в админке.
 */
window.MTApi = (() => {
  const TOKEN_KEY = 'mt_token';

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t || ''); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function request(method, url, body, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (!opts.formData) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const init = { method, headers };
    if (body) init.body = opts.formData ? body : JSON.stringify(body);

    const res = await fetch(url, init);
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const err = new Error(typeof data === 'string' ? data : (data.error || 'Ошибка запроса'));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    getToken, setToken, clearToken,
    isAuthed: () => !!getToken(),

    login: (login, password) => request('POST', '/api/auth/login', { login, password }),
    me:    () => request('GET', '/api/auth/me'),

    listProducts:  (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', '/api/products' + (qs ? '?' + qs : ''));
    },
    listAdminProducts: () => request('GET', '/api/products/admin'),
    getProduct:    (slug) => request('GET', '/api/products/' + encodeURIComponent(slug)),
    listCategories:() => request('GET', '/api/products/categories'),
    createProduct: (p) => request('POST',   '/api/products', p),
    updateProduct: (id, p) => request('PUT', '/api/products/' + id, p),
    deleteProduct: (id) => request('DELETE','/api/products/' + id),
    bulkProducts:  (items) => request('POST', '/api/products/bulk', { items }),

    uploadImages: (files) => {
      const fd = new FormData();
      for (const f of files) fd.append('images', f);
      return request('POST', '/api/upload', fd, { formData: true });
    },

    submitLead:    (lead) => request('POST', '/api/leads', lead),
    listLeads:     () => request('GET', '/api/leads'),
    updateLead:    (id, patch) => request('PATCH', '/api/leads/' + id, patch),
    deleteLead:    (id) => request('DELETE', '/api/leads/' + id),
  };
})();
