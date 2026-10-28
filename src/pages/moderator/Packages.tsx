import { useState } from 'react'
import { Archive, Pencil, Plus, Upload } from 'lucide-react'
import { useAction, useStore } from '@/services/store'
import { savePackage, setPackageStatus } from '@/services/mockApi'
import { subjectName } from '@/services/selectors'
import { ConfirmDialog, DataTable, FilterBar, FormField, PageHeader, StatusBadge } from '@/components/common'
import { Dialog } from '@/components/ui/overlays'
import { Badge, Button, Checkbox, Input, Textarea } from '@/components/ui/primitives'
import { formatMoney, LANGUAGE_LABEL } from '@/lib/utils'
import type { Language, Package } from '@/types'

const empty = (): Package => ({ id: '', title: '', description: '', lessonsCount: 8, lessonDuration: 60, groupLimit: 6, subjectIds: [], grades: [5, 9], languages: ['ru'], price: 30000, validityDays: 60, status: 'draft', version: 1 })

export default function ModeratorPackages() {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const [draft, setDraft] = useState<Package | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [archive, setArchive] = useState<Package | null>(null)
  const [filter, setFilter] = useState<'all' | Package['status']>('all')

  const save = async () => {
    if (!draft) return
    setErrors({})
    const r = await exec((s) => savePackage(s, draft), { success: draft.id ? 'Пакет сохранён' : 'Черновик пакета создан' })
    if (r.ok) setDraft(null)
    else setErrors(r.field ? { [r.field]: r.error } : { form: r.error })
  }
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const rows = state.packages.filter((p) => filter === 'all' || p.status === filter)
  const soldCount = (id: string) => state.orders.filter((o) => o.packageVersion.packageId === id && o.status === 'paid').length

  return (
    <>
      <PageHeader title="Управление пакетами" description="Изменение цены, количества уроков или предметов у опубликованного пакета создаёт новую версию — купленные заказы сохраняют свои условия." crumbs={[{ label: 'Панель', to: '/moderator' }, { label: 'Пакеты' }]} actions={<Button onClick={() => { setErrors({}); setDraft(empty()) }}><Plus aria-hidden />Новый пакет</Button>} />
      <FilterBar>
        {(['all', 'published', 'draft', 'archived'] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'ghost'} onClick={() => setFilter(f)}>{{ all: 'Все', published: 'Опубликованы', draft: 'Черновики', archived: 'Архив' }[f]}</Button>
        ))}
      </FilterBar>
      <DataTable
        rows={rows}
        rowKey={(p) => p.id}
        columns={[
          { key: 't', header: 'Пакет', sort: (p) => p.title, cell: (p) => <div><p className="font-medium">{p.title}</p><p className="text-xs text-fg-muted">v{p.version} · {p.grades[0]}–{p.grades[1]} кл · {p.languages.map((l) => LANGUAGE_LABEL[l].slice(0, 3)).join('/')}</p></div> },
          { key: 's', header: 'Предметы', cell: (p) => <div className="flex flex-wrap gap-1">{p.subjectIds.map((s) => <Badge key={s} tone="outline">{subjectName(state, s)}</Badge>)}</div> },
          { key: 'l', header: 'Уроков', sort: (p) => p.lessonsCount, cell: (p) => <span className="tabular">{p.lessonsCount} × {p.lessonDuration}′</span> },
          { key: 'g', header: 'Лимит', sort: (p) => p.groupLimit, cell: (p) => <span className="tabular">{p.groupLimit}</span>, className: 'text-right' },
          { key: 'p', header: 'Цена', sort: (p) => p.price, cell: (p) => <span className="tabular whitespace-nowrap">{formatMoney(p.price)}</span>, className: 'text-right' },
          { key: 'o', header: 'Продано', sort: (p) => soldCount(p.id), cell: (p) => <span className="tabular">{soldCount(p.id)}</span>, className: 'text-right' },
          { key: 'st', header: 'Статус', cell: (p) => <StatusBadge status={p.status} /> },
          {
            key: 'a', header: <span className="sr-only">Действия</span>, cell: (p) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setErrors({}); setDraft(structuredClone(p)) }} aria-label={`Редактировать ${p.title}`}><Pencil /></Button>
                {p.status !== 'published' && <Button size="sm" variant="outline" loading={pending} onClick={() => exec((s) => setPackageStatus(s, p.id, 'published'), { success: `«${p.title}» опубликован в каталоге` })}><Upload aria-hidden />Опубликовать</Button>}
                {p.status === 'published' && <Button size="sm" variant="ghost" onClick={() => setArchive(p)}><Archive aria-hidden />В архив</Button>}
              </div>
            ),
          },
        ]}
      />
      <Dialog
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        title={draft?.id ? `Редактирование: ${draft.title}` : 'Новый пакет'}
        size="lg"
        footer={<><Button variant="outline" onClick={() => setDraft(null)}>Отмена</Button><Button onClick={save} loading={pending}>Сохранить</Button></>}
      >
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Название" htmlFor="pk-title" error={errors.title} required className="sm:col-span-2"><Input id="pk-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-invalid={!!errors.title} /></FormField>
            <FormField label="Описание" htmlFor="pk-desc" className="sm:col-span-2"><Textarea id="pk-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></FormField>
            <FormField label="Количество уроков" htmlFor="pk-l" error={errors.lessonsCount}><Input id="pk-l" type="number" value={draft.lessonsCount} onChange={(e) => setDraft({ ...draft, lessonsCount: +e.target.value })} /></FormField>
            <FormField label="Длительность урока, мин" htmlFor="pk-d"><Input id="pk-d" type="number" step={15} value={draft.lessonDuration} onChange={(e) => setDraft({ ...draft, lessonDuration: +e.target.value })} /></FormField>
            <FormField label="Лимит группы" htmlFor="pk-g" error={errors.groupLimit}><Input id="pk-g" type="number" value={draft.groupLimit} onChange={(e) => setDraft({ ...draft, groupLimit: +e.target.value })} /></FormField>
            <FormField label="Цена, ₸" htmlFor="pk-p" error={errors.price}><Input id="pk-p" type="number" step={1000} value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} /></FormField>
            <FormField label="Классы с – по" error={errors.grades}>
              <div className="flex items-center gap-2">
                <Input type="number" min={1} max={11} value={draft.grades[0]} onChange={(e) => setDraft({ ...draft, grades: [+e.target.value, draft.grades[1]] })} aria-label="С класса" />
                <span aria-hidden>–</span>
                <Input type="number" min={1} max={11} value={draft.grades[1]} onChange={(e) => setDraft({ ...draft, grades: [draft.grades[0], +e.target.value] })} aria-label="По класс" />
              </div>
            </FormField>
            <FormField label="Срок действия, дней" htmlFor="pk-v"><Input id="pk-v" type="number" value={draft.validityDays} onChange={(e) => setDraft({ ...draft, validityDays: +e.target.value })} /></FormField>
            <FormField label="Предметы" error={errors.subjectIds} required className="sm:col-span-2">
              <div className="flex flex-wrap gap-x-4 gap-y-2">{state.subjects.map((s) => <Checkbox key={s.id} checked={draft.subjectIds.includes(s.id)} onChange={() => setDraft({ ...draft, subjectIds: toggle(draft.subjectIds, s.id) })} label={`${s.name}${s.tier === 'premium' ? ' (премиум)' : ''}`} />)}</div>
            </FormField>
            <FormField label="Предметов на выбор" htmlFor="pk-pick" error={errors.pickSubjects} hint="0 — все предметы пакета входят в заказ; иначе покупатель выбирает столько предметов." className="sm:col-span-2">
              <Input id="pk-pick" type="number" min={0} max={draft.subjectIds.length} value={draft.pickSubjects ?? 0} onChange={(e) => setDraft({ ...draft, pickSubjects: +e.target.value || undefined })} aria-invalid={!!errors.pickSubjects} />
            </FormField>
            <FormField label="Языки обучения" error={errors.languages} required className="sm:col-span-2">
              <div className="flex gap-4">{(['ru', 'kz'] as Language[]).map((l) => <Checkbox key={l} checked={draft.languages.includes(l)} onChange={() => setDraft({ ...draft, languages: toggle(draft.languages, l) })} label={LANGUAGE_LABEL[l]} />)}</div>
            </FormField>
            <Checkbox checked={!!draft.popular} onChange={(e) => setDraft({ ...draft, popular: e.target.checked })} label="Показывать на главной как популярный" className="sm:col-span-2" />
            {errors.form && <p className="text-sm text-danger sm:col-span-2" role="alert">{errors.form}</p>}
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!archive}
        onOpenChange={(o) => !o && setArchive(null)}
        title={`Архивировать «${archive?.title}»?`}
        description="Пакет исчезнет из каталога, новые покупки и продления станут недоступны. Купленные заказы продолжат действовать."
        confirmLabel="В архив"
        danger
        loading={pending}
        onConfirm={async () => { if (archive) await exec((s) => setPackageStatus(s, archive.id, 'archived'), { success: 'Пакет архивирован' }); setArchive(null) }}
      />
    </>
  )
}
