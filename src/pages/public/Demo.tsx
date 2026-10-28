import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpenCheck, GraduationCap, Presentation, ShieldCheck, UserCog, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAction, useStore } from '@/services/store'
import { login, registerParent, registerStudent } from '@/services/mockApi'
import { childrenOf, ROLE_HOME, ROLE_LABEL } from '@/services/selectors'
import { Avatar, DemoNotice, FormField, PageHeader } from '@/components/common'
import { DemoResetButton } from '@/components/shell'
import { Button, Card, Input, Select } from '@/components/ui/primitives'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import type { Language, Role } from '@/types'
import { cn } from '@/lib/utils'

const ROLES: { role: Exclude<Role, 'guest'>; icon: typeof Users; text: string; scenarios: string }[] = [
  { role: 'parent', icon: Users, text: 'Дети, пакеты и квоты, расписание, отзывы', scenarios: 'P-01, P-05, P-06' },
  { role: 'student', icon: GraduationCap, text: 'Ближайший урок, Zoom-ссылка, оценка учителю после урока', scenarios: 'P-04 (отзыв)' },
  { role: 'teacher', icon: Presentation, text: 'Анкета, занятия, посещаемость и отчёты', scenarios: 'P-02, P-04' },
  { role: 'moderator', icon: ShieldCheck, text: 'Проверка учителей, расписание, отчёты, аналитика', scenarios: 'P-02, P-03, P-04' },
  { role: 'admin', icon: UserCog, text: 'Справочники, роли, журнал действий', scenarios: 'демо-настройки' },
]

export function Demo() {
  const { state, run } = useStore()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Exclude<Role, 'guest'>>('parent')
  const users = state.users.filter((u) => u.roles.includes(selected))

  const enter = (userId: string) => {
    run((s) => login(s, userId, selected))
    const u = state.users.find((x) => x.id === userId)
    toast.success(`Вы вошли как ${u?.name}`, { description: `Роль: ${ROLE_LABEL[selected]}` })
    navigate(ROLE_HOME[selected])
  }

  const describe = (userId: string) => {
    if (selected === 'parent') {
      const par = state.parents.find((p) => p.userId === userId)
      const kids = childrenOf(state, par?.id)
      return kids.length ? `Дети: ${kids.map((k) => `${k.name.split(' ')[0]} (${k.grade} кл)`).join(', ')}` : 'Детей пока нет'
    }
    if (selected === 'student') {
      const st = state.students.find((s) => s.userId === userId)
      return st ? `${st.grade} класс · ${st.language === 'ru' ? 'русский' : 'казахский'} язык обучения` : ''
    }
    if (selected === 'teacher') {
      const t = state.teachers.find((x) => x.userId === userId)
      const map: Record<string, string> = { draft: 'черновик анкеты', pending_review: 'анкета на проверке', needs_revision: 'анкета на доработке', published: 'опубликован', unpublished: 'снят с публикации' }
      return t ? map[t.status] : 'анкета не создана'
    }
    return state.users.find((u) => u.id === userId)?.roles.map((r) => ROLE_LABEL[r]).join(' + ') ?? ''
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Демо-вход"
        description="Выберите роль и подготовленный профиль. Пароли не нужны и не собираются."
        crumbs={[{ label: 'Главная', to: '/' }, { label: 'Демо-вход' }]}
        actions={<DemoResetButton />}
      />
      <DemoNotice className="mb-6">
        Это прототип без сервера: данные хранятся в localStorage вашего браузера и переживают перезагрузку. Один пользователь может иметь несколько ролей (например, <b>Мария Ковалёва</b> — родитель и учитель, <b>Айгерим Касымова</b> — модератор и администратор).
      </DemoNotice>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2" role="radiogroup" aria-label="Роль">
          {ROLES.map(({ role, icon: Icon, text, scenarios }) => (
            <button
              key={role}
              role="radio"
              aria-checked={selected === role}
              onClick={() => setSelected(role)}
              className={cn('flex w-full cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 text-left transition hover:border-primary/40', selected === role && 'border-primary bg-primary-soft/50 ring-1 ring-primary')}
            >
              <span className={cn('rounded-[var(--radius-sm)] p-2', selected === role ? 'bg-primary text-white' : 'bg-muted text-fg-muted')}><Icon className="size-5" aria-hidden /></span>
              <span>
                <span className="block font-semibold">{ROLE_LABEL[role]}</span>
                <span className="block text-sm text-fg-muted">{text}</span>
                <span className="mt-1 block text-xs text-primary">Сценарии: {scenarios}</span>
              </span>
            </button>
          ))}
        </div>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Профили с ролью «{ROLE_LABEL[selected]}»</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {users.map((u) => (
              <button key={u.id} onClick={() => enter(u.id)} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-border p-3 text-left transition hover:border-primary hover:bg-primary-soft/40">
                <Avatar name={u.name} hue={(u.name.charCodeAt(0) * 7) % 360} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className="block truncate text-xs text-fg-muted">{describe(u.id)}</span>
                </span>
              </button>
            ))}
          </div>
          {(selected === 'parent' || selected === 'student') && (
            <p className="mt-4 text-sm text-fg-muted">
              Нужен новый профиль? <Link to="/register" className="text-primary hover:underline">Демо-регистрация</Link>
            </p>
          )}
          {selected === 'teacher' && (
            <p className="mt-4 text-sm text-fg-muted">
              Сценарий P-02 с нуля: войдите модератором → «Преподаватели» → «Назначить роль учителя» пользователю <b>Сабина Алиева</b>.
            </p>
          )}
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><BookOpenCheck className="size-5 text-primary" aria-hidden /> Подсказки по сценариям</h2>
        <ol className="grid gap-3 text-sm text-fg-muted md:grid-cols-2">
          <li><b className="text-fg">P-01 Покупка:</b> гость или родитель → Пакеты → Купить → распределить уроки → оферта → «Оплатить (демо)».</li>
          <li><b className="text-fg">P-02 Проверка учителя:</b> модератор → Преподаватели → анкета Олжаса Нуриева на проверке.</li>
          <li><b className="text-fg">P-03 Планирование:</b> модератор → Календарь → «Создать урок». Завтра 16:00 — конфликт для Тимура; у Даны нет свободной квоты по математике.</li>
          <li><b className="text-fg">P-04 Отчёт:</b> учитель Ирина Петрова → урок «ждёт отчёта» → отчёт → модератор подтверждает.</li>
          <li><b className="text-fg">P-05 Перераспределение:</b> Асель Нурланова → Пакеты и квоты → ЗК-1002 → «Перераспределить».</li>
          <li><b className="text-fg">P-06 Продление:</b> родитель → Пакеты и квоты → «Продлить» → новый отдельный заказ.</li>
        </ol>
      </Card>
    </div>
  )
}

export function Register() {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const navigate = useNavigate()
  const [p, setP] = useState({ name: '', email: '', phone: '' })
  const [st, setSt] = useState({ name: '', email: '', grade: 6, language: 'ru' as Language, parentId: '', birthYear: 2014 })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submitParent = async () => {
    const r = await exec((s) => registerParent(s, p), { success: 'Аккаунт родителя создан (демо)' })
    if (r.ok) navigate('/parent/children')
    else setErrors(r.field ? { [r.field]: r.error } : {})
  }
  const submitStudent = async () => {
    const r = await exec((s) => registerStudent(s, st), { success: 'Аккаунт ученика создан (демо)' })
    if (r.ok) navigate('/student')
    else setErrors(r.field ? { [r.field]: r.error } : {})
  }
  const parentOptions = state.parents.map((x) => ({ id: x.id, name: state.users.find((u) => u.id === x.userId)?.name }))

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <PageHeader title="Демо-регистрация" description="Создаёт локальную запись в браузере. Пароли не запрашиваются." crumbs={[{ label: 'Главная', to: '/' }, { label: 'Регистрация' }]} />
      <Card className="p-6">
        <Tabs defaultValue="parent" onValueChange={() => setErrors({})}>
          <TabsList className="w-full">
            <TabsTrigger value="parent" className="flex-1">Я родитель</TabsTrigger>
            <TabsTrigger value="student" className="flex-1">Я ученик</TabsTrigger>
          </TabsList>
          <TabsContent value="parent">
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submitParent() }} noValidate>
              <FormField label="Имя и фамилия" htmlFor="rp-name" error={errors.name} required>
                <Input id="rp-name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} aria-invalid={!!errors.name} autoComplete="off" />
              </FormField>
              <FormField label="E-mail" htmlFor="rp-email" error={errors.email} required hint="Письма не отправляются">
                <Input id="rp-email" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} aria-invalid={!!errors.email} autoComplete="off" />
              </FormField>
              <FormField label="Телефон" htmlFor="rp-phone" error={errors.phone} required hint="SMS не отправляются">
                <Input id="rp-phone" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} placeholder="+7 700 000 00 00" aria-invalid={!!errors.phone} autoComplete="off" />
              </FormField>
              <Button type="submit" className="w-full" loading={pending}>Создать демо-аккаунт</Button>
            </form>
          </TabsContent>
          <TabsContent value="student">
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submitStudent() }} noValidate>
              <FormField label="Имя и фамилия" htmlFor="rs-name" error={errors.name} required>
                <Input id="rs-name" value={st.name} onChange={(e) => setSt({ ...st, name: e.target.value })} aria-invalid={!!errors.name} autoComplete="off" />
              </FormField>
              <FormField label="E-mail" htmlFor="rs-email" error={errors.email} required>
                <Input id="rs-email" type="email" value={st.email} onChange={(e) => setSt({ ...st, email: e.target.value })} aria-invalid={!!errors.email} autoComplete="off" />
              </FormField>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Класс" htmlFor="rs-grade">
                  <Select id="rs-grade" value={st.grade} onChange={(e) => setSt({ ...st, grade: +e.target.value })}>
                    {Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                  </Select>
                </FormField>
                <FormField label="Язык обучения" htmlFor="rs-lang">
                  <Select id="rs-lang" value={st.language} onChange={(e) => setSt({ ...st, language: e.target.value as Language })}>
                    <option value="ru">Русский</option>
                    <option value="kz">Казахский</option>
                  </Select>
                </FormField>
                <FormField label="Год рождения" htmlFor="rs-year">
                  <Input id="rs-year" type="number" value={st.birthYear} onChange={(e) => setSt({ ...st, birthYear: +e.target.value })} />
                </FormField>
              </div>
              <FormField label="Родитель (семья)" htmlFor="rs-parent" error={errors.parentId} required hint="В демо выбирается из существующих родителей">
                <Select id="rs-parent" value={st.parentId} onChange={(e) => setSt({ ...st, parentId: e.target.value })} aria-invalid={!!errors.parentId}>
                  <option value="">— выберите —</option>
                  {parentOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </FormField>
              <Button type="submit" className="w-full" loading={pending}>Создать демо-аккаунт</Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
      <p className="mt-4 text-center text-sm text-fg-muted">Уже есть профиль? <Link to="/demo" className="text-primary hover:underline">Демо-вход</Link></p>
    </div>
  )
}
