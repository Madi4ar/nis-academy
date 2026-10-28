import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Clock, GraduationCap, Languages, ShieldCheck, Timer, Users } from 'lucide-react'
import { useStore } from '@/services/store'
import { publishedTeachers, subjectName } from '@/services/selectors'
import { PackageCard, TeacherCard } from '@/components/domain'
import { EmptyState, FilterBar, PageHeader, SearchInput } from '@/components/common'
import { Badge, Card, Select } from '@/components/ui/primitives'
import { formatMoney, gradeRange, LANGUAGE_LABEL, lessonsWord } from '@/lib/utils'

export function Packages() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [lang, setLang] = useState('')
  const [price, setPrice] = useState('')
  const [sort, setSort] = useState('popular')

  const list = useMemo(() => {
    let r = state.packages.filter((p) => p.status === 'published')
    if (q) r = r.filter((p) => (p.title + p.description).toLowerCase().includes(q.toLowerCase()))
    if (subject) r = r.filter((p) => p.subjectIds.includes(subject))
    if (grade) r = r.filter((p) => +grade >= p.grades[0] && +grade <= p.grades[1])
    if (lang) r = r.filter((p) => p.languages.includes(lang as never))
    if (price) r = r.filter((p) => p.price <= +price)
    const sorters: Record<string, (a: typeof r[0], b: typeof r[0]) => number> = {
      popular: (a, b) => Number(!!b.popular) - Number(!!a.popular),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      lessons: (a, b) => b.lessonsCount - a.lessonsCount,
    }
    return [...r].sort(sorters[sort])
  }, [state.packages, q, subject, grade, lang, price, sort])

  const reset = () => { setQ(''); setSubject(''); setGrade(''); setLang(''); setPrice(''); setSort('popular') }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Каталог пакетов" description="Групповые занятия по пакетам. Распределение уроков между предметами — при покупке." crumbs={[{ label: 'Главная', to: '/' }, { label: 'Пакеты' }]} />
      <FilterBar onReset={reset}>
        <SearchInput value={q} onChange={setQ} placeholder="Поиск по названию" className="sm:w-56" />
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Предмет" className="sm:w-44">
          <option value="">Все предметы</option>
          {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Класс" className="sm:w-32">
          <option value="">Любой класс</option>
          {Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1} класс</option>)}
        </Select>
        <Select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Язык обучения" className="sm:w-36">
          <option value="">Любой язык</option>
          <option value="ru">Русский</option>
          <option value="kz">Казахский</option>
        </Select>
        <Select value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Цена" className="sm:w-40">
          <option value="">Любая цена</option>
          <option value="20000">до 20 000 ₸</option>
          <option value="50000">до 50 000 ₸</option>
          <option value="80000">до 80 000 ₸</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка" className="sm:w-48">
          <option value="popular">Сначала популярные</option>
          <option value="priceAsc">Цена: по возрастанию</option>
          <option value="priceDesc">Цена: по убыванию</option>
          <option value="lessons">Больше уроков</option>
        </Select>
      </FilterBar>
      <p className="mb-4 text-sm text-fg-muted" aria-live="polite">Найдено: {list.length}</p>
      {list.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PackageCard key={p.id} pkg={p} />)}</div>
      ) : (
        <EmptyState title="Пакеты не найдены" description="Попробуйте изменить фильтры." action={<button className="cursor-pointer text-sm text-primary hover:underline" onClick={reset}>Сбросить фильтры</button>} />
      )}
    </div>
  )
}

export function PackageDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const pkg = state.packages.find((p) => p.id === id)
  if (!pkg || pkg.status === 'draft') {
    return <div className="mx-auto max-w-lg px-4 py-20"><EmptyState title="Пакет не найден" description="Он мог быть снят с публикации." action={<Link to="/packages" className="text-primary hover:underline">В каталог</Link>} /></div>
  }
  const teachers = publishedTeachers(state).filter((t) => pkg.subjectIds.some((s) => t.competencies.some((c) => c.subjectId === s)) && pkg.languages.some((l) => t.languages.includes(l)))
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title={pkg.title} crumbs={[{ label: 'Главная', to: '/' }, { label: 'Пакеты', to: '/packages' }, { label: pkg.title }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-fg-muted">{pkg.description}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { icon: CalendarDays, k: 'Уроков', v: lessonsWord(pkg.lessonsCount) },
                { icon: Clock, k: 'Длительность урока', v: `${pkg.lessonDuration} минут` },
                { icon: Users, k: 'Размер группы', v: `до ${pkg.groupLimit} учеников` },
                { icon: GraduationCap, k: 'Классы', v: gradeRange(pkg.grades) },
                { icon: Languages, k: 'Языки обучения', v: pkg.languages.map((l) => LANGUAGE_LABEL[l]).join(', ') },
                { icon: Timer, k: 'Срок действия', v: `${pkg.validityDays} дней с оплаты` },
              ].map(({ icon: Icon, k, v }) => (
                <div key={k} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 text-primary" aria-hidden />
                  <div><dt className="text-xs text-fg-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">Предметы пакета</h2>
            <p className="mb-4 text-sm text-fg-muted">При покупке вы сами распределяете {lessonsWord(pkg.lessonsCount)} между этими предметами. Позже свободные уроки можно перераспределить.</p>
            <div className="flex flex-wrap gap-2">
              {pkg.subjectIds.map((s) => (
                <Badge key={s} tone="primary" className="px-3 py-1 text-sm">
                  {subjectName(state, s)}
                  {state.subjects.find((x) => x.id === s)?.tier === 'premium' && <span className="text-[10px] opacity-70">· премиум</span>}
                </Badge>
              ))}
            </div>
          </Card>
          <div>
            <h2 className="mb-4 text-lg font-semibold">Преподаватели по предметам пакета</h2>
            {teachers.length ? (
              <div className="grid gap-4 sm:grid-cols-2">{teachers.slice(0, 4).map((t) => <TeacherCard key={t.id} t={t} />)}</div>
            ) : <EmptyState title="Пока нет опубликованных преподавателей" />}
          </div>
        </div>
        <aside>
          <Card className="sticky top-20 p-6">
            <p className="text-sm text-fg-muted">Стоимость пакета</p>
            <p className="tabular text-3xl font-bold">{formatMoney(pkg.price)}</p>
            <p className="tabular text-sm text-fg-muted">{formatMoney(Math.round(pkg.price / pkg.lessonsCount))} за урок · версия условий v{pkg.version}</p>
            {pkg.status === 'archived' ? (
              <p className="mt-6 rounded-md bg-muted p-3 text-sm">Пакет в архиве — новые покупки недоступны.</p>
            ) : (
              <Link to={`/checkout/${pkg.id}`} className="mt-6 flex h-12 items-center justify-center rounded-[var(--radius-sm)] bg-primary font-medium text-white hover:bg-primary-hover">Купить</Link>
            )}
            <ul className="mt-6 space-y-2 text-sm text-fg-muted">
              <li className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />Только проверенные преподаватели</li>
              <li className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />Списание урока — только после подтверждения отчёта</li>
              <li className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />Оплата в прототипе — демонстрационная</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}

