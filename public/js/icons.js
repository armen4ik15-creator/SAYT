/**
 * Mobitrend — иконки категорий (минималистичные SVG в стиле Lucide).
 * Используется в catalog.js, home.js и где угодно ещё.
 */
window.MTIcons = (() => {
  const wrap = (path) =>
    `<svg class="cat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

  const ICONS = {
    // Чехлы — смартфон
    cases: wrap('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10 18h4"/>'),
    // Зарядки — молния
    chargers: wrap('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
    // Защитные стёкла — щит
    glass: wrap('<path d="M12 2.5l8 3v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10v-6l8-3z"/>'),
    // Power Bank — батарея
    powerbanks: wrap('<rect x="2.5" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="9" y1="10" x2="9" y2="14"/><line x1="12" y1="10" x2="12" y2="14"/>'),
    // Кабели — два разъёма
    cables: wrap('<path d="M5 12h4M15 12h4"/><circle cx="9.5" cy="12" r="2.5"/><circle cx="14.5" cy="12" r="2.5"/><path d="M3 12c0-3 2-5 5-5M21 12c0 3-2 5-5 5"/>'),
    // Наушники
    headphones: wrap('<path d="M3 14v-2a9 9 0 0118 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>'),
    // Карты памяти / флешки — чип
    memory: wrap('<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/>'),
    // Держатели — рука
    holders: wrap('<rect x="7" y="2.5" width="10" height="14" rx="2"/><path d="M12 19v3M9 22h6"/>'),
    // Ремешки — часы
    bands: wrap('<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9 6V3h6v3M9 18v3h6v-3M12 9v3l2 2"/>'),
    // Аксессуары — звезда
    accessories: wrap('<polygon points="12,2.5 14.7,9 21.5,9.6 16.5,14 18,21 12,17.5 6,21 7.5,14 2.5,9.6 9.3,9"/>'),
    // По умолчанию — коробка
    other: wrap('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>'),
  };

  function get(category) {
    return ICONS[category] || ICONS.other;
  }

  return { get, ICONS };
})();
