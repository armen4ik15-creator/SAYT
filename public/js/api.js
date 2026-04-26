window.MTApi = (() => {
  const TOKEN_KEY = 'mt_token';
  const JWT_RE = /^[A-Za-z0-9._-]+$/;

  function getToken() {
    const t = localStorage.getItem(TOKEN_KEY) || '';
    if (t && !JWT_RE.test(t)) {
      console.warn('[MTApi] token has invalid characters, clearing');
      localStorage.removeItem(TOKEN_KEY);
      return '';
    }
    return t;
  }
  function setToken(t) {
    if (!t || !JWT_RE.test(t)) {
      console.warn('[MTApi] refusing to save invalid token');
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(TOKEN_KEY, t);
  }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function request(method, url, body, opts) {
    opts = opts || {};
    const headers = Object.assign({}, opts.headers || {});
    if (!opts.formData) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const init = { method: method, headers: headers };
    if (body) init.body = opts.formData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      const msg = String(e && e.message || e);
      if (msg.includes('Invalid character') || msg.includes('header')) {
        clearToken();
        throw new Error('Сессия повреждена. Войдите в админку заново.');
      }
      throw e;
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const err = new Error(typeof data === 'string' ? data : (data.error || 'Ошибка запроса'));
      err.status = res.status;
      err.data = data;
      if (res.status === 401) clearToken();
      throw err;
    }
    return data;
  }

  return {
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    isAuthed: () => !!getToken(),

    login: (login, password) => request('POST', '/api/auth/login', { login: login, password: password }),
    me: () => request('GET', '/api/auth/me'),

    listProducts: (params) => {
      params = params || {};
      const qs = new URLSearchParams(params).toString();
      return request('GET', '/api/products' + (qs ? '?' + qs : ''));
    },
    listAdminProducts: () => request('GET', '/api/products/admin'),
    getProduct: (slug) => request('GET', '/api/products/' + encodeURIComponent(slug)),
    listCategories: () => request('GET', '/api/products/categories'),
    createProduct: (p) => request('POST', '/api/products', p),
    updateProduct: (id, p) => request('PUT', '/api/products/' + id, p),
    deleteProduct: (id) => request('DELETE', '/api/products/' + id),
    bulkProducts: (items) => request('POST', '/api/products/bulk', { items: items }),

    uploadImages: (files) => {
      const fd = new FormData();
      for (const f of files) fd.append('images', f);
      return request('POST', '/api/upload', fd, { formData: true });
    },

    submitLead: (lead) => request('POST', '/api/leads', lead),
    listLeads: () => request('GET', '/api/leads'),
    updateLead: (id, patch) => request('PATCH', '/api/leads/' + id, patch),
    deleteLead: (id) => request('DELETE', '/api/leads/' + id),
  };
})();
