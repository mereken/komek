# Бесплатный деплой Komek

Схема: **Neon** (PostgreSQL) ← **Render** (Spring Boot в Docker) ← **Vercel** (React-фронтенд, проксирует `/api` на Render).

```
Браузер → Vercel (статика + прокси /api) → Render (Spring Boot) → Neon (Postgres)
```

Порядок важен: база → бэкенд → фронтенд, потому что каждому следующему нужен адрес предыдущего.

---

## 0. Подготовка репозитория

1. Скопируйте файлы из этого набора в проект **с теми же путями**:
   - `backend/Dockerfile` (новый)
   - `backend/.dockerignore` (новый)
   - `backend/src/main/java/com/komek/web/HealthController.java` (новый)
   - `backend/src/main/java/com/komek/security/SecurityConfig.java` (**заменяет** существующий: добавлен `/api/health` в `permitAll`)
   - `frontend/vercel.json` (новый)
2. Закоммитьте и запушьте в `main` (репозиторий `github.com/mereken/komek`):
   ```bash
   git add .
   git commit -m "Add deploy config"
   git push
   ```

---

## 1. База данных — Neon

1. Зарегистрируйтесь на <https://neon.com> (через GitHub, карта не нужна).
2. **Create project**: имя `komek`, версия Postgres 16, регион **AWS Europe (Frankfurt)**. Регион Render потом выбираем такой же.
3. На странице проекта нажмите **Connect**. **Выключите** переключатель *Connection pooling*, чтобы получить прямой адрес (без `-pooler` в хосте).
4. Вы увидите строку вида:
   ```
   postgresql://neondb_owner:ПАРОЛЬ@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   Разберите её на три значения для Render:

   | Переменная | Значение |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require` |
   | `DB_USER` | `neondb_owner` |
   | `DB_PASSWORD` | пароль из строки |

   В `DB_URL` **не** добавляйте логин, пароль и `channel_binding=require`: только хост, база и `sslmode=require`.

Таблицы (`users`, `tasks`, `task_responses`) создадутся сами при первом запуске бэкенда (`ddl-auto=update`).

---

## 2. Бэкенд — Render

1. Зарегистрируйтесь на <https://render.com> через GitHub.
2. **New → Web Service** → выберите репозиторий `komek`.
3. Настройки:
   - **Name:** например `komek-api` (адрес будет `https://komek-api.onrender.com`; если имя занято, Render добавит суффикс. Используйте итоговый адрес)
   - **Region:** Frankfurt
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Language / Runtime:** `Docker` (Dockerfile подхватится автоматически)
   - **Instance Type:** `Free`
4. **Advanced → Health Check Path:** `/api/health`
5. **Environment Variables:**

   | Ключ | Значение |
   |---|---|
   | `DB_URL` | из шага 1 |
   | `DB_USER` | из шага 1 |
   | `DB_PASSWORD` | из шага 1 |
   | `JWT_SECRET` | длинная случайная строка, не короче 32 символов. Сгенерировать: `openssl rand -base64 48` |
   | `OTP_EXPOSE_CODE` | `true` (пока нет SMS/e-mail провайдера, код показывается на экране) |

6. **Create Web Service**. Первая сборка занимает несколько минут. В логах ищите строку `Started KomekApplication`.
7. Проверьте: откройте `https://ВАШ-СЕРВИС.onrender.com/api/health`. Должно вернуться `{"status":"ok"}`.

---

## 3. Фронтенд — Vercel

1. Откройте `frontend/vercel.json` и замените `YOUR-RENDER-SERVICE.onrender.com` на реальный адрес из шага 2. Закоммитьте и запушьте.
2. Зарегистрируйтесь на <https://vercel.com> через GitHub → **Add New → Project** → выберите `komek`.
3. Настройки:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (определится сам; Build `npm run build`, Output `dist`)
4. **Deploy**. Получите адрес вида `https://komek-xxx.vercel.app`.

Как это работает: фронтенд обращается к `/api/...` на своём же домене, а Vercel по правилу из `vercel.json` пересылает эти запросы на Render. Поэтому CORS настраивать не нужно, а код фронтенда остаётся прежним.

---

## 4. Чтобы бэкенд не засыпал (рекомендуется)

Бесплатный сервис Render засыпает после 15 минут без запросов, а просыпается около минуты. Первый запрос после сна может не дождаться ответа через прокси и дать ошибку, поэтому лучше не давать сервису уснуть:

1. Зарегистрируйтесь на <https://uptimerobot.com> (бесплатно).
2. **Add New Monitor** → тип `HTTP(s)`, URL `https://ВАШ-СЕРВИС.onrender.com/api/health`, интервал 5 минут (минимальный для бесплатного плана; главное, чтобы реже, чем раз в 15 минут).

`/api/health` не обращается к базе, поэтому Neon при этом не просыпается и не тратит бесплатные часы вычислений.

---

## 5. Проверка

1. Откройте адрес Vercel, нажмите регистрацию, введите данные. Код подтверждения появится на экране (`OTP_EXPOSE_CODE=true`).
2. Создайте заказ, зайдите вторым пользователем (другой браузер или режим инкогнито), откликнитесь.

---

## Частые проблемы

| Симптом | Причина и решение |
|---|---|
| «Нет связи с сервером» или ошибка при первом открытии | Бэкенд спал. Подождите минуту и повторите; настройте шаг 4. |
| Ошибка 404 на `/api/...` во фронтенде | В `vercel.json` остался `YOUR-RENDER-SERVICE`, или адрес указан с ошибкой. Исправьте, запушьте, Vercel передеплоит сам. |
| На Render в логах `Connection refused` или `password authentication failed` | Проверьте `DB_URL` (должен начинаться с `jdbc:postgresql://`), `DB_USER`, `DB_PASSWORD`. |
| В логах `SSL` или `sslmode` | В `DB_URL` должно быть `?sslmode=require`. |
| `JWT secret` слишком короткий | `JWT_SECRET` короче 32 символов. |
| Сборка на Render падает по памяти | Перезапустите деплой (Manual Deploy → Clear build cache & deploy). Если повторяется, напишите, упростим Dockerfile. |
| Белая страница при обновлении на вложенном маршруте | Нет правила `/(.*)` → `/index.html` в `vercel.json`: проверьте, что файл лежит в `frontend/`. |
| Регистрация «сбросилась» между вводом данных и кодом | Незавершённые регистрации хранятся в памяти бэкенда и теряются при перезапуске или сне. Начните регистрацию заново. |

---

## Важно про безопасность

- Пока `OTP_EXPOSE_CODE=true`, любой может зарегистрироваться на чужой номер или e-mail: код возвращается прямо в ответе API. Для демонстрации это нормально, для реальных пользователей нет. Нужен SMS- или e-mail-провайдер, после чего `OTP_EXPOSE_CODE=false`.
- Всегда задавайте свой `JWT_SECRET`. Значение по умолчанию из `application.properties` лежит в открытом репозитории.
- Не коммитьте пароль Neon в репозиторий: он только в переменных окружения Render.
- Бесплатные тарифы могут меняться. Перед запуском сверьтесь с актуальными условиями на сайтах Render, Neon и Vercel (в частности, бесплатный план Vercel предназначен для некоммерческого использования).

---

## Вариант: Netlify вместо Vercel

1. Создайте файл `frontend/public/_redirects`:
   ```
   /api/*  https://ВАШ-СЕРВИС.onrender.com/api/:splat  200
   /*      /index.html  200
   ```
2. В Netlify: **Add new site → Import from Git**, Base directory `frontend`, Build command `npm run build`, Publish directory `dist` (если интерфейс показывает путь от корня репозитория: `frontend/dist`).
3. Прокси Netlify, насколько мне известно, обрывает слишком долгие запросы (порядка 26 секунд), поэтому шаг 4 здесь особенно важен.

`frontend/vercel.json` при этом можно удалить.
