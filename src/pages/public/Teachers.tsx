import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Briefcase, GraduationCap, Languages, School } from 'lucide-react'
import { useStore } from '@/services/store'
import { publishedTeachers, subjectName, teacherRating, teacherTeaches } from '@/services/selectors'
import { TeacherCard, TeacherStatsInline } from '@/components/domain'
import { Avatar, EmptyState, FilterBar, PageHeader, SearchInput, StarRating } from '@/components/common'
import { Badge, Card, Select } from '@/components/ui/primitives'
import { formatDate, LANGUAGE_LABEL } from '@/lib/utils'

export function Teachers() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [lang, setLang] = useState('')
  const list = useMemo(
    () =>
      publishedTeachers(state).filter(
        (t) =>
          (!q || t.name.toLowerCase().includes(q.toLowerCase())) &&
          (!subject || teacherTeaches(t, subject, grade ? +grade : undefined)) &&
          (!grade || t.competencies.some((c) => +grade >= c.grades[0] && +grade <= c.grades[1])) &&
          (!lang || t.languages.includes(lang as never)),
      ),
    [state, q, subject, grade, lang],
  )
  const reset = () => { setQ(''); setSubject(''); setGrade(''); setLang('') }
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Преподаватели" description="В каталоге — только анкеты, одобренные модератором." crumbs={[{ label: 'Главная', to: '/' }, { label: 'Преподаватели' }]} />
      <FilterBar onReset={reset}>
        <SearchInput value={q} onChange={setQ} placeholder="Поиск по имени" className="sm:w-56" />
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Предмет" className="sm:w-48">
          <option value="">Все предметы</option>
          {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Класс" className="sm:w-32">
          <option value="">Любой класс</option>
          {Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1} класс</option>)}
        </Select>
        <Select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Язык" className="sm:w-40">
          <option value="">Любой язык</option>
          <option value="ru">Русский</option>
          <option value="kz">Казахский</option>
        </Select>
      </FilterBar>
      <p className="mb-4 text-sm text-fg-muted" aria-live="polite">Найдено: {list.length}</p>
      {list.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((t) => <TeacherCard key={t.id} t={t} />)}</div>
      ) : (
        <EmptyState title="Преподаватели не найдены" description="Измените фильтры." />
      )}
    </div>
  )
}

export function TeacherDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const t = state.teachers.find((x) => x.id === id)
  if (!t || t.status !== 'published') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState title="Профиль недоступен" description="Преподаватель не найден, ещё не прошёл проверку или снят с публикации." action={<Link to="/teachers" className="text-primary hover:underline">К каталогу</Link>} />
      </div>
    )
  }
  const r = teacherRating(state, t.id)
  const reviews = state.reviews.filter((x) => x.teacherId === t.id)
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title={t.name} crumbs={[{ label: 'Главная', to: '/' }, { label: 'Преподаватели', to: '/teachers' }, { label: t.name }]} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-6 text-center">
          <Avatar name={t.name} hue={t.photoHue} size={112} className="mx-auto" />
          <p className="mt-2 text-xs text-fg-muted">Фото-заглушка</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            {r.count ? <><StarRating value={r.avg} /><span className="tabular text-sm text-fg-muted">{r.avg.toFixed(1)} · {r.count} отзывов</span></> : <span className="text-sm text-fg-muted">Пока нет отзывов</span>}
          </div>
          <div className="mt-5"><TeacherStatsInline teacherId={t.id} /></div>
          <Link to="/packages" className="mt-5 flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-sm font-medium text-white hover:bg-primary-hover">Выбрать пакет</Link>
          <p className="mt-2 text-xs text-fg-muted">Желаемого преподавателя можно указать при покупке.</p>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">О преподавателе</h2>
            <p className="text-fg-muted">{t.bio}</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3"><Briefcase className="size-5 text-primary" aria-hidden /><div><dt className="text-xs text-fg-muted">Стаж</dt><dd className="font-medium">{t.experienceYears} лет</dd></div></div>
              <div className="flex gap-3"><GraduationCap className="size-5 text-primary" aria-hidden /><div><dt className="text-xs text-fg-muted">Категория</dt><dd className="font-medium">{t.category}</dd></div></div>
              <div className="flex gap-3"><School className="size-5 text-primary" aria-hidden /><div><dt className="text-xs text-fg-muted">Школа</dt><dd className="font-medium">{t.school}</dd></div></div>
              <div className="flex gap-3"><Languages className="size-5 text-primary" aria-hidden /><div><dt className="text-xs text-fg-muted">Языки</dt><dd className="font-medium">{t.languages.map((l) => LANGUAGE_LABEL[l]).join(', ')}</dd></div></div>
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">Компетенции</h2>
            <div className="flex flex-wrap gap-2">
              {t.competencies.map((c) => <Badge key={c.subjectId} tone="primary" className="px-3 py-1 text-sm">{subjectName(state, c.subjectId)} · {c.grades[0]}–{c.grades[1]} классы</Badge>)}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Отзывы</h2>
            {reviews.length ? (
              <ul className="space-y-4">
                {reviews.map((rv) => (
                  <li key={rv.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={rv.rating} size={14} />
                      <span className="text-sm font-medium">{state.users.find((u) => u.id === rv.authorUserId)?.name.split(' ')[0]}</span>
                      <span className="text-xs text-fg-muted">ученик · {formatDate(rv.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm">{rv.text}</p>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Отзывов пока нет" description="Отзыв оставляет ученик после окончания урока." />}
          </Card>
        </div>
      </div>
    </div>
  )
}
