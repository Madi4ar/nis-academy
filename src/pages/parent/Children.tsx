import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useAction, useSession, useStore } from '@/services/store'
import { saveChild } from '@/services/mockApi'
import { childrenOf, quotaBalance } from '@/services/selectors'
import { Avatar, DemoNotice, EmptyState, FormField, PageHeader, QuotaBalanceView } from '@/components/common'
import { Dialog } from '@/components/ui/overlays'
import { Button, Card, Input, Select } from '@/components/ui/primitives'
import { LANGUAGE_LABEL } from '@/lib/utils'
import type { Language, StudentProfile } from '@/types'

type Draft = { id?: string; name: string; grade: number; language: Language; birthYear: number }

export default function Children() {
  const { state } = useStore()
  const { parent } = useSession()
  const { exec, pending } = useAction()
  const kids = childrenOf(state, parent?.id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const open = (k?: StudentProfile) => {
    setErrors({})
    setDraft(k ? { id: k.id, name: k.name, grade: k.grade, language: k.language, birthYear: k.birthYear } : { name: '', grade: 5, language: 'ru', birthYear: 2015 })
  }
  const save = async () => {
    if (!draft || !parent) return
    const existing = kids.find((k) => k.id === draft.id)
    const r = await exec((s) => saveChild(s, { ...draft, parentId: parent.id, userId: existing?.userId }), { success: draft.id ? 'Данные ребёнка сохранены' : 'Ребёнок добавлен' })
    if (r.ok) setDraft(null)
    else setErrors(r.field ? { [r.field]: r.error } : {})
  }

  return (
    <>
      <PageHeader title="Дети" description="Профили детей используются при покупке пакетов и подборе групп." crumbs={[{ label: 'Кабинет', to: '/parent' }, { label: 'Дети' }]} actions={<Button onClick={() => open()}><Plus aria-hidden />Добавить ребёнка</Button>} />
      <DemoNotice className="mb-6">Используйте только вымышленные данные — реальные персональные данные детей в прототипе не нужны.</DemoNotice>
      {kids.length === 0 ? (
        <EmptyState title="Детей пока нет" description="Добавьте ребёнка, чтобы купить пакет." action={<Button onClick={() => open()}>Добавить</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kids.map((k) => {
            const b = quotaBalance(state, { studentId: k.id })
            const orders = state.orders.filter((o) => o.studentId === k.id)
            return (
              <Card key={k.id} className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar name={k.name} hue={k.grade * 30} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{k.name}</p>
                    <p className="text-xs text-fg-muted">{k.grade} класс · {LANGUAGE_LABEL[k.language]} · {k.birthYear} г.р.</p>
                    <p className="text-xs text-fg-muted">{k.userId ? 'Есть аккаунт ученика' : 'Без аккаунта ученика'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => open(k)} aria-label={`Редактировать: ${k.name}`}><Pencil /></Button>
                </div>
                {b.purchased > 0 ? <QuotaBalanceView b={b} title="Все оплаченные заказы" /> : <p className="text-sm text-fg-muted">Нет оплаченных уроков</p>}
                <p className="mt-3 text-xs text-fg-muted">Заказов: {orders.length} ({orders.filter((o) => o.status === 'paid').length} оплачено)</p>
              </Card>
            )
          })}
        </div>
      )}
      <Dialog
        open={!!draft}
        onOpenChange={(o) => !o && setDraft(null)}
        title={draft?.id ? 'Редактировать ребёнка' : 'Новый ребёнок'}
        footer={<><Button variant="outline" onClick={() => setDraft(null)}>Отмена</Button><Button onClick={save} loading={pending}>Сохранить</Button></>}
      >
        {draft && (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save() }} noValidate>
            <FormField label="Имя и фамилия" htmlFor="c-name" error={errors.name} required className="sm:col-span-2">
              <Input id="c-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={!!errors.name} autoFocus autoComplete="off" />
            </FormField>
            <FormField label="Класс" htmlFor="c-grade" error={errors.grade}>
              <Select id="c-grade" value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: +e.target.value })}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1} класс</option>)}
              </Select>
            </FormField>
            <FormField label="Год рождения" htmlFor="c-year" error={errors.birthYear}>
              <Input id="c-year" type="number" value={draft.birthYear} onChange={(e) => setDraft({ ...draft, birthYear: +e.target.value })} aria-invalid={!!errors.birthYear} />
            </FormField>
            <FormField label="Язык обучения" htmlFor="c-lang" className="sm:col-span-2">
              <Select id="c-lang" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}>
                <option value="ru">Русский</option>
                <option value="kz">Казахский</option>
              </Select>
            </FormField>
            <button type="submit" hidden />
          </form>
        )}
      </Dialog>
    </>
  )
}
