# Design — визуальный источник прототипа

Функциональные требования — в `PRD.md` (приоритет при противоречиях). Здесь — визуальные правила.

## Токены (`src/styles/index.css`)

| Токен | Значение | Tailwind-класс |
|---|---|---|
| `--brand-primary` | #4f46e5 | `bg-primary`, `text-primary` |
| `--brand-secondary` | #0ea5e9 | `bg-secondary` |
| `--app-background` | #f8fafc | `bg-background` |
| `--surface` / `--surface-muted` | #fff / #f1f5f9 | `bg-surface` / `bg-muted` |
| `--text-primary` / `--text-secondary` | #0f172a / #64748b | `text-fg` / `text-fg-muted` |
| `--border-default` | #e2e8f0 | `border-border` |
| success / warning / danger / info (+ `-soft`) | семантические статусы | `bg-success-soft text-success` … |
| `--radius-sm/md/lg` | 8 / 12 / 16 px | `rounded-[var(--radius-md)]` |

HEX-цвета в компонентах не используются — только токены. Цвета демонстрационные.

## Типографика и сетка

- Inter (fallback system-ui). H1 28px/700 (лендинг 48px/800), заголовки секций 18px/600, текст 14–16px, подписи 12px. Числа — `tabular-nums`.
- Отступы по шкале 4/8 px; карточки `p-4` / `p-5` / `p-6`.
- Контейнеры: публичные страницы `max-w-7xl`; кабинеты родителя, ученика, учителя `max-w-6xl`; модератор и админ `max-w-[1400px]` (плотнее).
- Ориентиры 1440 / 768 / 390 px. Desktop — сайдбар 248px (lg+), mobile — Sheet-меню. Таблицы скроллятся внутри себя, страница не переполняется.

## Компоненты (переиспользуются всеми экранами)

- Примитивы: `Button` (default, secondary, outline, ghost, danger, success, link; loading), `Card`, `Badge`, `Input`, `Select`, `Textarea`, `Checkbox`, `Dialog`, `Sheet`, `Tabs`.
- Общие: `PageHeader` + `Breadcrumbs`, `StatCard`, `StatusBadge`, `DataTable` (сортировка, клик по строке, empty), `FilterBar`, `SearchInput`, `EmptyState`, `ConfirmDialog`, `DemoNotice` / `DemoBadge`, `FormField`, `QuotaBalanceView`, `StarRating`, `Avatar` (заглушка вместо фото).
- Предметные: `PackageCard`, `TeacherCard`, `LessonCard`, `LessonDetailDialog`, `CalendarView` (день / неделя / месяц / список), `ZoomButton`, `AllocationEditor`, `FeedbackPanel`, `StudentAttendanceRow`.
- Оболочка: `PublicHeader`, `DashboardLayout`, `RoleSwitcher`, `NotificationCenter`, `DemoResetButton`.

## Статусы

`StatusBadge` = цвет + иконка + текст (не только цвет): черновик, на проверке, на доработке, опубликован, снят, запланирован, идёт сейчас, ждёт отчёта, отчёт на проверке, закрыт, отменён, оплачен, не оплачен, списано, резерв возвращён.

## Состояния и обратная связь

- Каждое действие идёт через `useAction`: короткая имитация загрузки (кнопка `loading`), toast успеха или ошибки.
- Опасные действия (отмена урока, архив, исключение из группы, сброс) — через `ConfirmDialog`.
- Ошибки валидации — текст под полем (`role="alert"`, иконка), поле получает `aria-invalid`.
- Пустые состояния — `EmptyState` с подсказкой следующего шага.
- Внешние действия помечены: «Демо-оплата», «Демо-уведомления», «Тестовая Zoom-ссылка».

## Дифференциация ролей

Общий визуальный язык, различается плотность: лендинг — маркетинговый; родитель — обзорные карточки; ученик — крупная карточка ближайшего урока и кнопка Zoom; учитель — вкладки с очередью отчётов; модератор — KPI, плотные таблицы, очереди, календарь.

## Доступность

Видимый `:focus-visible`, клавиатурная навигация (Radix), `aria-label` у кнопок-иконок, подписи полей, `role="radiogroup"` у переключателей, контрастные тексты.
