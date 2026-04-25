# Mobitrend Store

Оптовый интернет-магазин цифровых аксессуаров на Node.js + Express с админ-панелью.

## Что внутри

- **Сайт** (`public/`) — главная, каталог, карточка товара, форма заявки.
- **Админка** (`/admin.html`) — вход по логину/паролю, добавление товаров с описаниями, ценами и фото, управление заявками.
- **API** — REST на Express: товары, заявки, авторизация, загрузка фото с автоматическим сжатием в WebP.
- **Хранение данных** — JSON-файлы в `data/`. Готов к подключению PostgreSQL/MySQL (Timeweb).
- **Деплой** — Dockerfile под Timeweb Cloud Apps.

## Быстрый запуск локально

```bash
cp .env.example .env
# отредактируйте .env — задайте JWT_SECRET и пароль администратора
npm install
npm start
```

Сайт: http://localhost:3000
Админка: http://localhost:3000/admin.html

## Деплой на Timeweb Cloud Apps

1. **Подключите репозиторий GitHub** (https://github.com/armen4ik15-creator/SAYT) к Timeweb Cloud → Apps → «Создать приложение из Git».
2. **Тип приложения**: Backend → Node.js (или Docker, если используете Dockerfile).
3. **Команда сборки**: `npm install --omit=dev`
4. **Команда запуска**: `npm start`
5. **Порт**: `3000`
6. **Переменные окружения** (вкладка Environment):
   - `JWT_SECRET` — длинная случайная строка (≥32 символа)
   - `ADMIN_LOGIN` — логин администратора
   - `ADMIN_PASSWORD` — пароль администратора
   - `NODE_ENV=production`
   - (опционально) `DATABASE_URL` — строка подключения к Timeweb БД
7. **Привяжите домен** в разделе «Домены».

## API

| Метод | URL | Описание | Авторизация |
|---|---|---|---|
| POST | `/api/auth/login` | Войти | – |
| GET  | `/api/auth/me` | Текущий пользователь | Bearer |
| GET  | `/api/products` | Список с фильтрами | – |
| GET  | `/api/products/admin` | Полный список | Bearer |
| GET  | `/api/products/categories` | Агрегаты по категориям | – |
| GET  | `/api/products/:slug` | Один товар | – |
| POST | `/api/products` | Создать | Bearer |
| PUT  | `/api/products/:id` | Обновить | Bearer |
| DELETE | `/api/products/:id` | Удалить | Bearer |
| POST | `/api/products/bulk` | Массовая замена | Bearer |
| POST | `/api/upload` | Загрузить фото | Bearer |
| POST | `/api/leads` | Новая заявка от клиента | – |
| GET  | `/api/leads` | Список заявок | Bearer |
| PATCH | `/api/leads/:id` | Изменить статус заявки | Bearer |
| DELETE | `/api/leads/:id` | Удалить заявку | Bearer |

## Структура

```
.
├── server.js              # Express-сервер
├── package.json
├── Dockerfile
├── .env.example
├── data/
│   ├── products.json      # Каталог
│   └── leads.json         # Заявки клиентов (создаётся автоматически)
├── public/                # Статические файлы (фронтенд)
│   ├── index.html
│   ├── catalog.html
│   ├── product.html
│   ├── admin.html
│   ├── css/
│   ├── js/
│   └── uploads/           # Фото товаров (загружаются через админку)
└── src/
    ├── routes/
    ├── middleware/
    └── db/
```

## Подключение к БД Timeweb (опционально)

По умолчанию данные хранятся в JSON-файлах. Чтобы подключить PostgreSQL/MySQL:

1. В Timeweb Cloud → Базы данных создайте БД и получите `DATABASE_URL`.
2. Установите драйвер: `npm install pg` (для PostgreSQL).
3. Создайте `src/db/pgStore.js` (по аналогии с `jsonStore.js`).
4. В `src/routes/products.js` и `src/routes/leads.js` переключите хранилище через `process.env.DB_TYPE`.

## Безопасность

- Пароли через bcrypt, JWT-токены с истечением 12 ч.
- Rate-limit: 120 запросов/мин на API, 10 попыток входа за 15 мин.
- Helmet для HTTP-заголовков.
- Загрузка только изображений ≤8 МБ, автоматическое сжатие в WebP.
