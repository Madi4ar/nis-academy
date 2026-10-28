import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAction, useStore } from '@/services/store'
import { addSubject, setAbsencePolicy, toggleRole } from '@/services/mockApi'
import { ROLE_LABEL } from '@/services/selectors'
import { DataTable, DemoNotice, FilterBar, FormField, PageHeader, SearchInput } from '@/components/common'
import { DemoResetButton } from '@/components/shell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { Badge, Button, Card, Input, Select } from '@/components/ui/primitives'
import { cn, formatDateTime } from '@/lib/utils'
import type { Role } from '@/types'

const ALL_ROLES: Role[] = ['parent', 'student', 'teacher', 'moderator', 'admin']

export default function Admin() {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'dict'
  const [name, setName] = useState('')
  const [tier, setTier] = useState<'standard' | 'premium'>('standard')
  const [err, setErr] = useState<string>()
  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const actions = [...new Set(state.auditLog.map((a) => a.action.split('.')[0]))]
  const log = state.auditLog.filter((a) => (!actionFilter || a.action.startsWith(actionFilter)) && (!q || `${a.entity} ${a.details}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <PageHeader title="Админ-демо" description="Упрощённые справочники, роли и журнал событий." />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'dict' ? {} : { tab: v })}>
        <TabsList>
          <TabsTrigger value="dict">Справочники</TabsTrigger>
          <TabsTrigger value="roles">Роли</TabsTrigger>
          <TabsTrigger value="log">Журнал ({state.auditLog.length})</TabsTrigger>
          <TabsTrigger value="settings">Демо-настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="dict" className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="mb-3 font-semibold">Предметы</h2>
            <DataTable dense rows={state.subjects} rowKey={(s) => s.id} columns={[
              { key: 'n', header: 'Название', cell: (s) => <span className="font-medium">{s.name}</span>, sort: (s) => s.name },
              { key: 'id', header: 'Код', cell: (s) => <code className="text-xs">{s.id}</code> },
              { key: 't', header: 'Ценовая категория', cell: (s) => <Badge tone={s.tier === 'premium' ? 'warning' : 'neutral'}>{s.tier === 'premium' ? 'премиум' : 'стандарт'}</Badge> },
              { key: 'p', header: 'В пакетах', cell: (s) => <span className="tabular">{state.packages.filter((p) => p.subjectIds.includes(s.id)).length}</span>, className: 'text-right' },
            ]} />
            <h2 className="mb-3 mt-6 font-semibold">Языки обучения</h2>
            <div className="flex gap-2"><Badge tone="outline">ru — Русский</Badge><Badge tone="outline">kz — Казахский</Badge></div>
            <p className="mt-2 text-xs text-fg-muted">Интерфейс прототипа только на русском; язык обучения — атрибут данных.</p>
          </div>
          <Card className="h-fit p-5">
            <h3 className="mb-3 font-semibold">Добавить предмет</h3>
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setErr(undefined); const r = await exec((s) => addSubject(s, name, tier), { success: 'Предмет добавлен' }); if (r.ok) setName(''); else setErr(r.error) }} noValidate>
              <FormField label="Название" htmlFor="sub-name" error={err} required><Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} /></FormField>
              <FormField label="Категория" htmlFor="sub-tier"><Select id="sub-tier" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}><option value="standard">Стандарт</option><option value="premium">Премиум</option></Select></FormField>
              <Button type="submit" className="w-full" loading={pending}><Plus aria-hidden />Добавить</Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <DemoNotice className="mb-3">Переключение роли «Учитель» создаёт черновик анкеты. Нельзя снять роль, под которой вы сейчас работаете.</DemoNotice>
          <DataTable dense rows={state.users} rowKey={(u) => u.id} columns={[
            { key: 'n', header: 'Пользователь', cell: (u) => <div><p className="font-medium">{u.name}</p><p className="text-xs text-fg-muted">{u.email}</p></div>, sort: (u) => u.name },
            ...ALL_ROLES.map((r) => ({
              key: r, header: ROLE_LABEL[r], className: 'text-center',
              cell: (u: typeof state.users[0]) => (
                <button
                  role="switch"
                  aria-checked={u.roles.includes(r)}
                  aria-label={`${ROLE_LABEL[r]}: ${u.name}`}
                  onClick={() => exec((s) => toggleRole(s, u.id, r), { success: `${u.name}: роли обновлены`, ms: 200 })}
                  className={cn('relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors', u.roles.includes(r) ? 'bg-primary' : 'bg-slate-300')}
                >
                  <span className={cn('inline-block size-4 rounded-full bg-white shadow transition-transform', u.roles.includes(r) ? 'translate-x-4.5' : 'translate-x-0.5')} />
                </button>
              ),
            })),
          ]} />
        </TabsContent>

        <TabsContent value="log">
          <FilterBar onReset={() => { setQ(''); setActionFilter('') }}>
            <SearchInput value={q} onChange={setQ} placeholder="Поиск по объекту или деталям" className="sm:w-72" />
            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} aria-label="Тип действия" className="sm:w-48">
              <option value="">Все действия</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </FilterBar>
          <DataTable dense rows={log} rowKey={(a) => a.id} columns={[
            { key: 'd', header: 'Время', cell: (a) => <span className="tabular whitespace-nowrap">{formatDateTime(a.createdAt)}</span>, sort: (a) => a.createdAt },
            { key: 'u', header: 'Кто', cell: (a) => state.users.find((u) => u.id === a.actorId)?.name ?? 'Гость' },
            { key: 'a', header: 'Действие', cell: (a) => <code className="text-xs">{a.action}</code>, sort: (a) => a.action },
            { key: 'e', header: 'Объект', cell: (a) => a.entity },
            { key: 'x', header: 'Детали', cell: (a) => <span className="text-fg-muted">{a.details}</span> },
          ]} />
        </TabsContent>

        <TabsContent value="settings" className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold">Демо-правило пропусков</h2>
            <p className="mb-4 mt-1 text-sm text-fg-muted">Применяется при подтверждении отчёта к ученикам с отметкой «Пропуск». Политика в исходном ТЗ не утверждена — это переключатель для демонстрации.</p>
            <div className="space-y-2" role="radiogroup" aria-label="Правило пропусков">
              {([['release', 'Пропуск → вернуть резерв', 'Урок не списывается, квота снова свободна'], ['consume', 'Пропуск → списать', 'Урок списывается как проведённый']] as const).map(([v, t, d]) => (
                <button key={v} role="radio" aria-checked={state.settings.absencePolicy === v} onClick={() => exec((s) => setAbsencePolicy(s, v), { success: `Правило: ${t}`, ms: 200 })} className={cn('flex w-full cursor-pointer flex-col rounded-[var(--radius-md)] border p-3 text-left', state.settings.absencePolicy === v ? 'border-primary bg-primary-soft/50 ring-1 ring-primary' : 'border-border hover:bg-muted')}>
                  <span className="text-sm font-medium">{t}</span>
                  <span className="text-xs text-fg-muted">{d}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Данные демо</h2>
            <p className="mb-4 mt-1 text-sm text-fg-muted">Состояние хранится в localStorage (версия схемы {state.schemaVersion}, сгенерировано {formatDateTime(state.seededAt)}). Сброс восстанавливает исходные моковые данные.</p>
            <dl className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
              {[['Пользователи', state.users.length], ['Заказы', state.orders.length], ['Уроки', state.lessons.length], ['Операции квот', state.quotaTx.length], ['Уведомления', state.notifications.length], ['Отзывы', state.reviews.length]].map(([k, v]) => (
                <div key={k} className="rounded-[var(--radius-sm)] bg-muted p-2"><dt className="text-xs text-fg-muted">{k}</dt><dd className="tabular font-semibold">{v}</dd></div>
              ))}
            </dl>
            <DemoResetButton variant="danger" />
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
