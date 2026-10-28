// Шапка, переключатель ролей, центр уведомлений, сброс демо.
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, Check, ChevronDown, GraduationCap, LogOut, Menu, RefreshCw, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/primitives'
import { Sheet } from './ui/overlays'
import { Avatar, ConfirmDialog, DemoBadge } from './common'
import { useSession, useStore } from '@/services/store'
import { login, markNotificationsRead } from '@/services/mockApi'
import { ROLE_HOME, ROLE_LABEL } from '@/services/selectors'
import { cn, formatDateTime } from '@/lib/utils'
import type { Role } from '@/types'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold tracking-tight" aria-label="NIS Academy — на главную">
      <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-primary to-secondary text-white">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className="text-lg">NIS <span className="text-primary">Academy</span></span>
    </Link>
  )
}

const menuItem = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-[highlighted]:bg-muted'

export function RoleSwitcher() {
  const { user, role } = useSession()
  const { run } = useStore()
  const navigate = useNavigate()
  const switchTo = (r: Role) => {
    run((s) => login(s, user?.id ?? null, r))
    toast.success(`Роль: ${ROLE_LABEL[r]}`)
    navigate(ROLE_HOME[r])
  }
  if (!user) {
    return (
      <Link to="/demo" className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover">
        <UserCog className="size-4" aria-hidden /> Демо-вход
      </Link>
    )
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 text-left hover:bg-muted" aria-label="Переключить роль">
        <Avatar name={user.name} size={28} hue={210} />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-sm font-medium leading-tight">{user.name}</span>
          <span className="block text-xs leading-tight text-fg-muted">{ROLE_LABEL[role]}</span>
        </span>
        <ChevronDown className="size-4 text-fg-muted" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="animate-in z-50 w-64 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-lg">
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-fg-muted">Мои роли</DropdownMenu.Label>
          {user.roles.length === 0 && <p className="px-2 py-1 text-xs text-fg-muted">Ролей нет — модератор может назначить роль учителя.</p>}
          {user.roles.map((r) => (
            <DropdownMenu.Item key={r} className={menuItem} onSelect={() => switchTo(r)}>
              <span className="flex-1">{ROLE_LABEL[r]}</span>
              {r === role && <Check className="size-4 text-primary" aria-label="текущая" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={menuItem} onSelect={() => navigate('/demo')}>
            <UserCog className="size-4" aria-hidden /> Сменить пользователя
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} onSelect={() => { run((s) => login(s, null, 'guest')); navigate('/') }}>
            <LogOut className="size-4" aria-hidden /> Выйти в гостевой режим
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function NotificationCenter() {
  const { state, run } = useStore()
  const { user } = useSession()
  const navigate = useNavigate()
  if (!user) return null
  const items = state.notifications.filter((n) => n.userId === user.id).slice(0, 15)
  const unread = items.filter((n) => !n.read).length
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="relative flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface hover:bg-muted" aria-label={`Уведомления: ${unread} непрочитанных`}>
        <Bell className="size-4" aria-hidden />
        {unread > 0 && <span className="tabular absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread}</span>}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="animate-in z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-[var(--radius-md)] border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Уведомления</span>
              <DemoBadge>Демо-уведомления</DemoBadge>
            </div>
            {unread > 0 && (
              <button className="cursor-pointer text-xs text-primary hover:underline" onClick={() => run((s) => markNotificationsRead(s, user.id))}>
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto p-1">
            {items.length === 0 && <p className="p-4 text-center text-sm text-fg-muted">Уведомлений пока нет</p>}
            {items.map((n) => (
              <DropdownMenu.Item
                key={n.id}
                className={cn(menuItem, 'items-start')}
                onSelect={() => { run((s) => markNotificationsRead(s, user.id, n.id)); if (n.link) navigate(n.link) }}
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} aria-label={n.read ? undefined : 'не прочитано'} />
                <span className="min-w-0">
                  <span className="block font-medium">{n.title}</span>
                  <span className="block text-xs text-fg-muted">{n.text}</span>
                  <span className="mt-0.5 block text-[11px] text-fg-muted/80">{formatDateTime(n.createdAt)}</span>
                </span>
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function DemoResetButton({ variant = 'outline', full }: { variant?: 'outline' | 'ghost' | 'danger'; full?: boolean }) {
  const { reset } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)} className={full ? 'w-full justify-start' : undefined}>
        <RefreshCw aria-hidden /> Сбросить демо-данные
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Сбросить демо-данные?"
        description="Все заказы, уроки, отчёты и изменения вернутся к исходному состоянию. Сессия будет завершена."
        confirmLabel="Сбросить"
        danger
        onConfirm={() => { reset(); setOpen(false); toast.success('Демо-данные восстановлены'); navigate('/demo') }}
      />
    </>
  )
}

const publicLinks = [
  { to: '/packages', label: 'Пакеты' },
  { to: '/teachers', label: 'Преподаватели' },
  { to: '/#how', label: 'Как это работает' },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const { role, user } = useSession()
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Открыть меню"><Menu /></Button>
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {publicLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-muted hover:text-fg', isActive && !l.to.includes('#') && 'text-primary')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user && role !== 'guest' && (
            <Link to={ROLE_HOME[role]} className="hidden h-9 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium text-primary hover:bg-primary-soft sm:inline-flex">
              Мой кабинет
            </Link>
          )}
          {!user && <Link to="/register" className="hidden h-9 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium hover:bg-muted sm:inline-flex">Регистрация</Link>}
          <NotificationCenter />
          <RoleSwitcher />
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Меню">
        <nav className="flex flex-col gap-1" aria-label="Мобильная навигация">
          {[{ to: '/', label: 'Главная' }, ...publicLinks, { to: '/register', label: 'Регистрация' }, { to: '/demo', label: 'Демо-вход' }].map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted">{l.label}</Link>
          ))}
          {user && role !== 'guest' && <Link to={ROLE_HOME[role]} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary-soft">Мой кабинет</Link>}
        </nav>
      </Sheet>
    </header>
  )
}
