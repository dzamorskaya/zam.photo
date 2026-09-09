# Daria Zamorskaia Photography

Многостраничный сайт для **https://dariazamorskaia.com**, GitHub Pages, репозиторий `dzamorskaya/zam.photo`. Форм и автоматических заявок нет: только email и Instagram.

## Редактирование без кода

1. Дважды нажмите `Start Editor.command` в этой папке. Нужны Node.js 24+ и Python 3 с Pillow (на этом компьютере уже установлены).
2. В открывшемся Terminal скопируйте ссылку **Private local editor** целиком и откройте её в браузере. Ссылка содержит временный ключ; не отправляйте её другим.
3. Выберите раздел: фотографии, проекты, услуги и цены, публикации, отзывы, журнал или настройки.
4. **Сохранить локально** обновляет только предпросмотр. Нажмите «Открыть предпросмотр».
5. **Опубликовать на сайте** собирает страницы, создаёт коммит и отправляет его в `origin/main`. Требуется настроенный вход в GitHub для Git. GitHub Pages затем публикует изменения.
6. Не закрывайте Terminal, пока работаете. Для остановки нажмите Control+C. При следующем запуске ключ будет новым.

Если порт 3000 занят, в Terminal из этой папки выполните `PORT=3002 npm start`. Локальный редактор не размещается на публичном сайте, не является облачным CMS и недоступен с другого устройства. Это позволяет сохранить бесплатный статический хостинг.

Фотографии загружаются в JPEG/PNG/WebP до 16 МБ. Редактор делает WebP-версии до 1600px, удаляет EXIF при конвертации. Выберите категорию и заполните понятное описание фотографии. В проекте выберите обложку, добавьте фотографии кнопкой и меняйте их порядок кнопками ↑ и ↓. Пустые даты и команды не отображаются. Снимите «Опубликовано», чтобы скрыть проект или статью.

Локальные резервные копии текста сохраняются в `.runtime/backups/` и не отправляются на GitHub. Опубликованные версии дополнительно сохраняются в истории Git.

## Технические команды

- `npm start` — локальный сервер и редактор.
- `npm run build` — предпросмотр в `.preview`.
- `node scripts/build.mjs --publish` — статические страницы в корне репозитория для GitHub Pages.
- `npm test` — ссылки, метаданные, структура, отсутствие форм и безопасный вывод контента.
- `python3 scripts/optimize.py` — повторная оптимизация девяти исходных фотографий. Не требуется для загрузок через редактор.

Источник текста: `content/site.json`. Манифест изображений: `content/images.json`. Разметка: `src/render.mjs`, стили: `src/site.css`. Публичный сайт не требует Node.js, базы данных или платного сервера. `CNAME` не меняется. `.nojekyll` отключает ненужную обработку Jekyll. CDN — GitHub Pages.

## Содержание и ограничения

В исходном репозитории девять уникальных фотографий. Сайт не подменяет их стоками и не выдаёт разные съёмки за одну серию. В проектах пока по одному доступному кадру; полноценные серии, headshots и branding нужно загрузить. Портрет самой Дарьи не предоставлен: на About явно подписана работа фотографа, не фотография автора. Даты выпусков и команды не выдуманы. Неподтверждённые отзывы, суммы, сроки, даты и локации съёмок удалены. Цены появляются только после заполнения суммы и включения «Цена утверждена владельцем». Commercial всегда использует Request a Quote. Отзывы появятся только после добавления реального текста и подтверждения владельцем; без отзывов блок полностью скрыт.

Аналитика по умолчанию отключена. В настройках можно добавить собственный GA4 Measurement ID (`G-...`); скрипт загрузится только после согласия посетителя. События: `book_click`, `service_view`, `project_view`, `instagram_click`. Не вводите API-ключи или другие секреты в контент: данные сайта публичны.

Закрытые клиентские галереи не реализованы: приватные изображения нельзя надёжно защитить статической страницей GitHub Pages. Для этой будущей функции нужен отдельный сервис с проверкой доступа и закрытым хранилищем; ссылки на него можно добавить после подключения. Онлайн-заявки и автоматические письма исключены по пожеланию владельца.

## Первый экран

В разделе «Контакты и настройки» доступны «Фото на первом экране» и «Проект первого экрана». Пустые значения используют первый опубликованный проект и его обложку. Если выбранное фото относится к другой серии, ссылка автоматически ведёт к серии, содержащей этот снимок. Фото без проекта ведёт в портфолио. Journal сохранён по прежним URL, но скрыт из меню. Для возврата нужны минимум три опубликованные статьи и включённая настройка «Показывать Journal в меню».

Основной шрифт Instrument Sans размещается локально в `src/fonts/` и копируется в `assets/fonts/`. Лицензия OFL включена. Horizon из Canva пока не подключён: ожидается файл шрифта или SVG логотипа ZAM. Временный wordmark использует Instrument Sans. Внешние запросы к Google Fonts при посещении сайта не нужны.

## September 2026 website brief

Approved package terms are in `content/site.json`: Portrait $350 / 10 images,
Headshots $300 / 3 images, Personal Branding $500 / 15 images, creative
Fashion & Editorial $600 / 20 images. All four are starting prices. Commercial
work is quoted separately. Studio rental is separate; professional retouching
is included in final selected images. The violet series remains unpublished.

### Inquiry form activation

The FormSubmit form is prepared in `src/render.mjs`; its recipient is
`settings.email`. Activation and owner iCloud receipt were previously confirmed.
On September 9, 2026 the owner chose AJAX submission with inline confirmation
and error handling instead of the client auto-response. `src/site.js` posts JSON
to FormSubmit's AJAX endpoint, checks both HTTP status and the success flag,
and shows confirmation only after acceptance. There is a 25-second timeout and
duplicate submission protection. The native form remains a no-JavaScript fallback.
No client auto-response is configured. Do not send tests to unrelated addresses.

The browser validates required fields and email, conditionally disables
commercial fields, and retains a per-tab draft for up to two hours. Provider
errors preserve all entered values and the draft on the same page. The external provider handles
spam protection; custom server-side validation of every business field is not
implemented on this static GitHub Pages site. This portion of the brief remains
open if stricter server-side validation is required. Never claim an email was
delivered based only on a local success screen or a mocked test.

Analytics events are wired but no GA measurement ID is configured. Two owner-provided photographs now appear on About. Real client
reviews and verified publication issue dates are still awaiting owner-provided material. Publications must remain non-clickable, without external links. Do not fill these
with invented content or portfolio models.

Verification: `npm test` covers routes, approved pricing, unpublished work,
service FAQs, activation gating and metadata. Browser checks additionally cover
mobile layouts, AJAX form payloads, offline / service failure recovery,
service prefill and non-clickable publications. Test interceptions do not establish
real email delivery.
