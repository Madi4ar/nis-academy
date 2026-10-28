import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, CreditCard, RefreshCcw, RotateCcw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAction, useSession, useStore } from '@/services/store'
import { createOrder, payOrder, registerParent, saveChild, validateAllocation } from '@/services/mockApi'
import { childrenOf, publishedTeachers, quotaBalance, subjectName, teacherTeaches } from '@/services/selectors'
import { AllocationEditor } from '@/components/AllocationEditor'
import { DemoBadge, DemoNotice, EmptyState, FormField, PageHeader, QuotaBalanceView, StatusBadge } from '@/components/common'
import { Badge, Button, Card, Checkbox, Input, Select } from '@/components/ui/primitives'
import { cn, formatMoney, LANGUAGE_LABEL, lessonsWord } from '@/lib/utils'
import type { Language } from '@/types'

const STEPS = ['Конфигурация', 'Семья', 'Оферта и оплата', 'Результат']

export default function Checkout() {
  const { packageId } = useParams()
  const [params] = useSearchParams()
  const renewId = params.get('renew') ?? undefined
  const { state } = useStore()
  const { parent, role } = useSession()
  const navigate = useNavigate()
  const { exec, pending } = useAction()
  const pkg = state.packages.find((p) => p.id === packageId)
  const renewFrom = state.orders.find((o) => o.id === renewId)

  const isParent = role === 'parent' && !!parent
  const kids = isParent ? childrenOf(state, parent!.id) : []

  const [step, setStep] = useState(0)
  const [grade, setGrade] = useState(() => renewFrom?.grade ?? pkg?.grades[0] ?? 1)
  const [language, setLanguage] = useState<Language>(() => renewFrom?.language ?? pkg?.languages[0] ?? 'ru')
  const [alloc, setAlloc] = useState<Record<string, number>>(() => {
    if (renewFrom && pkg && renewFrom.packageVersion.packageId === pkg.id) {
      const v = Object.fromEntries(renewFrom.items.map((i) => [i.subjectId, i.lessons]))
      if (Object.values(v).reduce((a, b) => a + b, 0) === pkg.lessonsCount) return v
    }
    return {}
  })
  const [desiredTeacherId, setDesiredTeacherId] = useState(renewFrom?.desiredTeacherId ?? '')
  const [studentId, setStudentId] = useState(renewFrom?.studentId ?? '')
  const [newChild, setNewChild] = useState({ name: '', grade: grade, language: language as Language, birthYear: 2014 })
  const [addingChild, setAddingChild] = useState(false)
  const [guest, setGuest] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [offer, setOffer] = useState(false)
  const [sim, setSim] = useState<'success' | 'fail'>('success')
  const [orderId, setOrderId] = useState<string>()
  const [lastResult, setLastResult] = useState<'success' | 'fail'>()

  const teachers = useMemo(
    () => (pkg ? publishedTeachers(state).filter((t) => pkg.subjectIds.some((s) => teacherTeaches(t, s, grade, language))) : []),
    [state, pkg, grade, language],
  )

  if (!pkg || pkg.status !== 'published') {
    return <div className="mx-auto max-w-lg px-4 py-20"><EmptyState title="Пакет недоступен для покупки" action={<Link to="/packages" className="text-primary hover:underline">В каталог</Link>} /></div>
  }

  const items = pkg.subjectIds.map((s) => ({ subjectId: s, lessons: alloc[s] ?? 0 }))
  const allocError = validateAllocation(pkg, items)
  const order = state.orders.find((o) => o.id === orderId)

  const next0 = () => {
    if (allocError) { setErrors({ items: allocError }); return }
    setErrors({})
    setStep(1)
  }

  const next1 = async () => {
    setErrors({})
    if (isParent && !addingChild) {
      if (!studentId) { setErrors({ studentId: 'Выберите ребёнка или добавьте нового' }); return }
      const kid = kids.find((k) => k.id === studentId)
      if (kid && (kid.grade !== grade || kid.language !== language)) {
        toast.warning('Класс или язык ребёнка отличается от выбранного в конфигурации', { description: 'Заказ будет оформлен с параметрами из шага 1.' })
      }
      setStep(2)
      return
    }
    const r = await exec((s) => {
      let parentId = parent?.id
      if (!isParent) {
        registerParent(s, guest)
        parentId = s.parents[s.parents.length - 1].id
      }
      return saveChild(s, { ...newChild, parentId: parentId! })
    }, { success: isParent ? 'Ребёнок добавлен' : 'Демо-аккаунт родителя создан, ребёнок добавлен', ms: 300 })
    if (r.ok) {
      setStudentId(r.value)
      setAddingChild(false)
      setStep(2)
    } else setErrors(r.field ? { [r.field]: r.error } : { form: r.error })
  }

  const pay = async () => {
    let id = orderId
    if (!id) {
      const created = await exec((s) => createOrder(s, { parentId: s.parents.find((p) => p.userId === s.session.userId)!.id, studentId, packageId: pkg.id, items, grade, language, desiredTeacherId: desiredTeacherId || undefined, renewedFromId: renewId, offerAccepted: offer }), { ms: 200 })
      if (!created.ok) return
      id = created.value
      setOrderId(id)
    }
    const r = await exec((s) => payOrder(s, id!, sim), { ms: 900 })
    if (r.ok) {
      setLastResult(sim)
      setStep(3)
      if (sim === 'success') toast.success('Демо-оплата прошла успешно')
      else toast.error('Демо-оплата отклонена', { description: 'Квоты не начислены' })
    }
  }

  const replayWebhook = async () => {
    const r = await exec((s) => payOrder(s, orderId!, 'success'), { ms: 400 })
    if (r.ok && r.value.duplicate) toast.info('Повторный webhook получен и проигнорирован', { description: 'Квоты не удвоились — проверьте цифры ниже.' })
  }

  const student = state.students.find((s) => s.id === studentId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={renewFrom ? 'Продление пакета' : 'Оформление покупки'}
        description={pkg.title}
        crumbs={[{ label: 'Пакеты', to: '/packages' }, { label: pkg.title, to: `/packages/${pkg.id}` }, { label: 'Оформление' }]}
      />
      {renewFrom && (
        <DemoNotice className="mb-6">
          Продление заказа <b>{renewFrom.number}</b>: будет создан <b>новый отдельный заказ</b> с собственными квотами. Прошлый заказ и его остатки не изменятся.
        </DemoNotice>
      )}

      {/* Степпер */}
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Шаги оформления">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className="flex flex-col gap-1.5">
            <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
            <span className={cn('text-xs font-medium sm:text-sm', i === step ? 'text-primary' : 'text-fg-muted')}>
              <span className="tabular">{i + 1}.</span> <span className="hidden sm:inline">{s}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {step === 0 && (
            <Card className="animate-in space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Класс" htmlFor="co-grade" hint={`Пакет: ${pkg.grades[0]}–${pkg.grades[1]} классы`}>
                  <Select id="co-grade" value={grade} onChange={(e) => setGrade(+e.target.value)}>
                    {Array.from({ length: pkg.grades[1] - pkg.grades[0] + 1 }, (_, i) => pkg.grades[0] + i).map((g) => <option key={g} value={g}>{g} класс</option>)}
                  </Select>
                </FormField>
                <FormField label="Язык обучения" htmlFor="co-lang">
                  <Select id="co-lang" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                    {pkg.languages.map((l) => <option key={l} value={l}>{LANGUAGE_LABEL[l]}</option>)}
                  </Select>
                </FormField>
              </div>
              <AllocationEditor
                rows={pkg.subjectIds.map((s) => ({ id: s, name: subjectName(state, s), note: state.subjects.find((x) => x.id === s)?.tier === 'premium' ? 'Премиум-предмет' : undefined }))}
                value={alloc}
                total={pkg.lessonsCount}
                onChange={(v) => { setAlloc(v); setErrors({}) }}
                label={`Распределите ровно ${lessonsWord(pkg.lessonsCount)}`}
              />
              {errors.items && <p className="text-sm text-danger" role="alert">{errors.items}</p>}
              <FormField label="Желаемый преподаватель (необязательно)" htmlFor="co-teacher" hint="Пожелание учитывается модератором при подборе группы; замена возможна (правило требует согласования).">
                <Select id="co-teacher" value={desiredTeacherId} onChange={(e) => setDesiredTeacherId(e.target.value)}>
                  <option value="">Без предпочтений</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.competencies.map((c) => subjectName(state, c.subjectId)).join(', ')}</option>)}
                </Select>
              </FormField>
              <div className="flex justify-end">
                <Button onClick={next0} disabled={!!allocError}>Далее</Button>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card className="animate-in space-y-5 p-6">
              {isParent ? (
                <>
                  <div>
                    <p className="mb-3 text-sm font-medium">Для кого покупаем?</p>
                    {kids.length === 0 && !addingChild && <p className="mb-3 text-sm text-fg-muted">У вас пока нет добавленных детей.</p>}
                    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Ребёнок">
                      {kids.map((k) => (
                        <button
                          key={k.id}
                          role="radio"
                          aria-checked={studentId === k.id && !addingChild}
                          onClick={() => { setStudentId(k.id); setAddingChild(false) }}
                          className={cn('cursor-pointer rounded-[var(--radius-md)] border border-border p-3 text-left hover:border-primary/50', studentId === k.id && !addingChild && 'border-primary bg-primary-soft/50 ring-1 ring-primary')}
                        >
                          <p className="font-medium">{k.name}</p>
                          <p className="text-xs text-fg-muted">{k.grade} класс · {LANGUAGE_LABEL[k.language]}</p>
                        </button>
                      ))}
                      <button onClick={() => setAddingChild(true)} className={cn('cursor-pointer rounded-[var(--radius-md)] border border-dashed border-border p-3 text-left text-sm text-primary hover:bg-primary-soft/40', addingChild && 'border-primary bg-primary-soft/40')}>
                        + Добавить ребёнка
                      </button>
                    </div>
                    {errors.studentId && <p className="mt-2 text-sm text-danger" role="alert">{errors.studentId}</p>}
                  </div>
                  {addingChild && <ChildForm value={newChild} onChange={setNewChild} errors={errors} />}
                </>
              ) : (
                <>
                  <DemoNotice>
                    Вы оформляете покупку как гость: будет создан демо-аккаунт родителя. Уже есть профиль? <Link to="/demo" className="underline">Войдите через демо-вход</Link>.
                  </DemoNotice>
                  <p className="font-medium">Данные родителя (демо)</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="Имя и фамилия" htmlFor="g-name" error={errors.name} required><Input id="g-name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} aria-invalid={!!errors.name} autoComplete="off" /></FormField>
                    <FormField label="E-mail" htmlFor="g-email" error={errors.email} required><Input id="g-email" type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} aria-invalid={!!errors.email} autoComplete="off" /></FormField>
                    <FormField label="Телефон" htmlFor="g-phone" error={errors.phone} required><Input id="g-phone" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="+7 700 000 00 00" aria-invalid={!!errors.phone} autoComplete="off" /></FormField>
                  </div>
                  <p className="font-medium">Ребёнок</p>
                  <ChildForm value={newChild} onChange={setNewChild} errors={errors} />
                </>
              )}
              {errors.form && <p className="text-sm text-danger" role="alert">{errors.form}</p>}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>Назад</Button>
                <Button onClick={next1} loading={pending}>Далее</Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="animate-in space-y-5 p-6">
              <div>
                <p className="mb-2 font-medium">Публичная оферта (демо-текст)</p>
                <div className="max-h-40 overflow-y-auto rounded-[var(--radius-sm)] border border-border bg-muted/50 p-3 text-xs leading-relaxed text-fg-muted" tabIndex={0}>
                  <p>Версия оферты: 2026-10-20 (демонстрационная). Это не юридически значимый документ.</p>
                  <p className="mt-2">1. Исполнитель проводит групповые онлайн-занятия в объёме купленного пакета. 2. Урок списывается только после подтверждения отчёта преподавателя модератором. 3. Уроки действуют {pkg.validityDays} дней с даты оплаты. 4. Свободные уроки можно перераспределить между предметами пакета равной стоимости. 5. Политики пропусков, переносов и отмен требуют отдельного согласования и в прототипе показаны как демо-варианты.</p>
                </div>
                <Checkbox className="mt-3" checked={offer} onChange={(e) => setOffer(e.target.checked)} label={<>Я принимаю условия публичной оферты <span className="text-fg-muted">(демо)</span></>} />
              </div>
              <fieldset className="rounded-[var(--radius-md)] border border-amber-200 bg-warning-soft/40 p-4">
                <legend className="px-1"><DemoBadge>Демо-оплата</DemoBadge></legend>
                <p className="mb-3 text-sm text-fg-muted">Реального списания нет. Выберите исход симуляции платёжного шлюза:</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Исход демо-оплаты">
                  {(['success', 'fail'] as const).map((v) => (
                    <button key={v} role="radio" aria-checked={sim === v} onClick={() => setSim(v)} className={cn('flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border bg-surface px-4 py-2 text-sm font-medium', sim === v ? (v === 'success' ? 'border-success text-success ring-1 ring-success' : 'border-danger text-danger ring-1 ring-danger') : 'border-border')}>
                      {v === 'success' ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
                      {v === 'success' ? 'Успешно' : 'Отклонено'}
                    </button>
                  ))}
                </div>
              </fieldset>
              {order && order.status === 'unpaid' && <p className="text-sm text-fg-muted">Заказ {order.number} уже создан и ожидает оплаты — повторная попытка оплатит тот же заказ.</p>}
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={!!orderId}>Назад</Button>
                <Button size="lg" onClick={pay} disabled={!offer} loading={pending} title={!offer ? 'Сначала примите оферту' : undefined}>
                  <CreditCard aria-hidden /> Оплатить {formatMoney(pkg.price)} (демо)
                </Button>
              </div>
              {!offer && <p className="text-right text-xs text-fg-muted">Кнопка оплаты станет доступна после принятия оферты.</p>}
            </Card>
          )}

          {step === 3 && order && (
            <Card className="animate-in p-6">
              {lastResult === 'success' && order.status === 'paid' ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-success-soft p-2 text-success"><CheckCircle2 className="size-6" aria-hidden /></span>
                    <div>
                      <h2 className="text-xl font-semibold">Оплата прошла (демо)</h2>
                      <p className="text-sm text-fg-muted">Заказ <b>{order.number}</b> оплачен. Уроки начислены на {student?.name}.</p>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-4">
                    <div className="flex items-center justify-between"><p className="font-medium">Начисленные квоты</p><StatusBadge status="paid" /></div>
                    {order.items.map((it) => <QuotaBalanceView key={it.subjectId} title={subjectName(state, it.subjectId)} b={quotaBalance(state, { orderId: order.id, subjectId: it.subjectId })} compact />)}
                    <p className="tabular text-sm text-fg-muted">Всего свободно по заказу: <b className="text-fg">{quotaBalance(state, { orderId: order.id }).free}</b> из {order.packageVersion.lessonsCount}</p>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-dashed border-border p-4">
                    <p className="text-sm font-medium">Проверка идемпотентности</p>
                    <p className="mb-3 text-sm text-fg-muted">Симулируйте повторный webhook от платёжного шлюза — квоты не должны удвоиться. Получено webhook: <b className="tabular">{state.payments.find((p) => p.orderId === order.id && p.status === 'succeeded')?.webhookCount}</b></p>
                    <Button variant="outline" size="sm" onClick={replayWebhook} loading={pending}><RefreshCcw aria-hidden /> Повторный демо-webhook</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate('/parent/orders')}>Мои пакеты и квоты</Button>
                    <Button variant="outline" onClick={() => navigate('/parent')}>В кабинет</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-danger-soft p-2 text-danger"><XCircle className="size-6" aria-hidden /></span>
                    <div>
                      <h2 className="text-xl font-semibold">Демо-оплата отклонена</h2>
                      <p className="text-sm text-fg-muted">Заказ <b>{order.number}</b> сохранён со статусом «Не оплачен». Квоты не начислены.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm"><StatusBadge status="unpaid" /> Начислено уроков: <b className="tabular">{quotaBalance(state, { orderId: order.id }).purchased}</b></div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { setSim('success'); setStep(2) }}><RotateCcw aria-hidden /> Повторить оплату</Button>
                    <Button variant="outline" onClick={() => navigate('/parent/orders')}>К заказам</Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Сводка заказа */}
        <aside>
          <Card className="sticky top-20 p-5">
            <p className="text-sm font-semibold">Ваш заказ</p>
            <p className="mt-1 font-medium">{pkg.title}</p>
            <p className="text-xs text-fg-muted">v{pkg.version} · {pkg.lessonDuration} мин · до {pkg.groupLimit} в группе</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {pkg.subjectIds.map((s) => (
                <li key={s} className="flex justify-between"><span className="text-fg-muted">{subjectName(state, s)}</span><span className="tabular font-medium">{alloc[s] ?? 0}</span></li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span className="text-fg-muted">Класс / язык</span><span>{grade} · {LANGUAGE_LABEL[language]}</span></div>
              {student && <div className="flex justify-between"><span className="text-fg-muted">Ученик</span><span>{student.name}</span></div>}
              {order && <div className="flex justify-between"><span className="text-fg-muted">Заказ</span><Badge tone={order.status === 'paid' ? 'success' : 'danger'}>{order.number}</Badge></div>}
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
              <span className="text-sm text-fg-muted">Итого</span>
              <span className="tabular text-2xl font-bold">{formatMoney(pkg.price)}</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function ChildForm({ value, onChange, errors }: { value: { name: string; grade: number; language: Language; birthYear: number }; onChange: (v: { name: string; grade: number; language: Language; birthYear: number }) => void; errors: Record<string, string> }) {
  return (
    <div className="grid gap-4 rounded-[var(--radius-md)] border border-border p-4 sm:grid-cols-4">
      <FormField label="Имя ребёнка" htmlFor="ch-name" error={errors.name} required className="sm:col-span-2">
        <Input id="ch-name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Только вымышленные данные" aria-invalid={!!errors.name} autoComplete="off" />
      </FormField>
      <FormField label="Класс" htmlFor="ch-grade" error={errors.grade}>
        <Select id="ch-grade" value={value.grade} onChange={(e) => onChange({ ...value, grade: +e.target.value })}>
          {Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </Select>
      </FormField>
      <FormField label="Год рождения" htmlFor="ch-year" error={errors.birthYear}>
        <Input id="ch-year" type="number" value={value.birthYear} onChange={(e) => onChange({ ...value, birthYear: +e.target.value })} aria-invalid={!!errors.birthYear} />
      </FormField>
      <FormField label="Язык обучения" htmlFor="ch-lang" className="sm:col-span-2">
        <Select id="ch-lang" value={value.language} onChange={(e) => onChange({ ...value, language: e.target.value as Language })}>
          <option value="ru">Русский</option>
          <option value="kz">Казахский</option>
        </Select>
      </FormField>
    </div>
  )
}
