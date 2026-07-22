# Instagram MCP — Полный гайд по получению токена

Пройди все 6 шагов по порядку. Займёт ~15–20 минут.

---

## Шаг 1 — Подключи Instagram к Facebook Page

Instagram Business/Creator аккаунт **обязательно** должен быть привязан к Facebook Page.
Без этого Graph API вернёт пустой массив на любой запрос.

1. Instagram app → **Настройки** → **Аккаунт** → **Sharing to other apps** → Facebook
2. Выбери существующую Facebook Page или создай новую на [facebook.com/pages/creation](https://www.facebook.com/pages/creation/)
3. Убедись, что ты **администратор** этой Page (не редактор и не модератор)

> ⚠️ Личные (Personal) Instagram аккаунты не поддерживаются Graph API. Нужен Business или Creator.

---

## Шаг 2 — Создай Meta Developer App

1. Открой [developers.facebook.com](https://developers.facebook.com) → войди тем же аккаунтом Facebook
2. Нажми **Create App**
3. Use case: **"Manage Instagram content and messaging"** (раздел Content Management)
4. Название приложения: любое, НО **не может содержать** слова «Instagram», «Facebook», «IG», «Meta», «Insta» — Meta блокирует. Используй что-то нейтральное, например «EPICGRAM Publisher»
5. Business portfolio: пропусти, нажми **"No business"** если спросит
6. Нажми **Create App** → подтверди почту если попросит

---

## Шаг 3 — Добавь разрешения

1. В дашборде приложения → **Use Cases** → **Customize**
2. В разделе **API setup with Facebook login** нажми **"Add required content permissions"**
   - Это добавит: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `business_management`, `pages_show_list`
3. Нажми **"Add required messaging permissions"**
   - Это добавит: `instagram_manage_messages`, `instagram_manage_comments`
4. Нажми **"Add required insights permissions"** (если есть)
   - Это добавит: `instagram_manage_insights`

---

## Шаг 4 — Сгенерируй Access Token

1. Открой [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. В дропдауне **"Meta App"** выбери своё только что созданное приложение
3. Нажми **"Get Token"** → **"Get User Access Token"**
4. Поставь галочки на этих permissions:
   ```
   ✅ instagram_basic
   ✅ instagram_content_publish
   ✅ instagram_manage_comments
   ✅ instagram_manage_insights
   ✅ pages_show_list
   ✅ pages_read_engagement
   ```
5. Нажми **"Generate Access Token"** → в попапе войди и разреши доступ
6. Скопируй сгенерированный токен (он короткоживущий — 1 час, следующий шаг его продлит)

---

## Шаг 5 — Получи INSTAGRAM_ACCOUNT_ID

В Graph API Explorer выполни запрос:
```
GET /me/accounts?fields=id,name,instagram_business_account
```

В ответе найди свою страницу:
```json
{
  "data": [
    {
      "id": "PAGE_ID",
      "name": "Название страницы",
      "instagram_business_account": {
        "id": "17841400000000000"  ← ЭТО и есть INSTAGRAM_ACCOUNT_ID
      }
    }
  ]
}
```

Если `instagram_business_account` отсутствует → вернись к Шагу 1 и убедись что Instagram привязан к странице.

---

## Шаг 6 — Получи долгосрочный токен (60 дней)

Токен из Шага 4 живёт 1 час. Обменяй его на 60-дневный:

Найди **App ID** и **App Secret**: App Dashboard → Settings → Basic

```bash
curl "https://graph.facebook.com/v21.0/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=ВАШ_APP_ID\
&client_secret=ВАШ_APP_SECRET\
&fb_exchange_token=ТОКЕН_ИЗ_ШАГА_4"
```

В ответе получишь:
```json
{
  "access_token": "EAAxxxxx...",   ← ЭТО INSTAGRAM_ACCESS_TOKEN
  "token_type": "bearer",
  "expires_in": 5183944
}
```

**Это твои два значения:**
- `INSTAGRAM_ACCESS_TOKEN` = `EAAxxxxx...` из этого ответа
- `INSTAGRAM_ACCOUNT_ID` = число из Шага 5

---

## Шаг 7 — Добавь секреты в EPICGRAM

После получения токена скажи «готово» или вставь значения — я добавлю их в env и запущу Instagram MCP.

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| `/me/accounts` возвращает `[]` | Instagram не привязан к Page, или ты не администратор | Шаг 1 |
| «No configuration available» в Explorer | Permissions не добавлены | Шаг 3 |
| «Generate Access Token» неактивна | Сначала нажми «Get Token» → «Get User Access Token» | Шаг 4 |
| Название приложения отклонено | Содержит запрещённые слова | Используй нейтральное название |
| `instagram_business_account` отсутствует | Личный аккаунт, или не привязан к Page | Шаг 1 |
| Токен не работает сразу | Иногда нужно 1–2 минуты на активацию | Подожди и повтори |
| `(#200) Permissions error` | Не хватает разрешений | Проверь все галочки в Шаге 4 |
