import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, BookOpen, CalendarDays, ClipboardCheck, FileText, Home, LayoutDashboard, ListChecks, Menu, MessageSquareText, Package, Settings, ShieldCheck, UserRound, Users, UsersRound, Wallet,
} from 'lucide-react'
import { DemoResetButton, Logo, NotificationCenter, PublicHeader, RoleSwitcher } from '@/components/shell'
import { Sheet } from '@/components/ui/overlays'
import { Button } from '@/components/ui/primitives'
import { DemoBadge, EmptyState } from '@/components/common'
import { useSession, useStore } from '@/services/store'
import { login } from '@/services/mockApi'
import { ROLE_LABEL } from '@/services/selectors'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <DemoBadge>Прототип</DemoBadge>
          </div>
          <p>Интерактивный прототип без бэкенда. Все данные вымышленные и хранятся в вашем браузере.</p>
          <div className="flex gap-4">
            <Link to="/packages" className="hover:text-fg">Пакеты</Link>
            <Link to="/teachers" className="hover:text-fg">Преподаватели</Link>
            <Link to="/demo" className="hover:text-fg">Демо-вход</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

const NAV: Record<Exclude<Role, 'guest'>, NavItem[]> = {
  parent: [
    { to: '/parent', label: 'Обзор', icon: LayoutDashboard, end: true },
    { to: '/parent/children', label: 'Дети', icon: Users },
    { to: '/parent/orders', label: 'Пакеты и квоты', icon: Wallet },
    { to: '/parent/calendar', label: 'Расписание', icon: CalendarDays },
    { to: '/parent/feedback', label: 'Обратная связь', icon: MessageSquareText },
    { to: '/packages', label: 'Купить пакет', icon: Package },
  ],
  student: [
    { to: '/student', label: 'Главная', icon: Home, end: true },
    { to: '/student/calendar', label: 'Мои уроки', icon: CalendarDays },
  ],
  teacher: [
    { to: '/teacher', label: 'Мои занятия', icon: LayoutDashboard, end: true },
    { to: '/teacher/profile', label: 'Анкета', icon: UserRound },
  ],
  moderator: [
    { to: '/moderator', label: 'Панель', icon: LayoutDashboard, end: true },
    { to: '/moderator/teachers', label: 'Преподаватели', icon: ShieldCheck },
    { to: '/moderator/packages', label: 'Пакеты', icon: Package },
    { to: '/moderator/groups', label: 'Ученики и группы', icon: UsersRound },
    { to: '/moderator/calendar', label: 'Календарь', icon: CalendarDays },
    { to: '/moderator/reports', label: 'Отчёты', icon: ClipboardCheck },
    { to: '/moderator/analytics', label: 'Аналитика', icon: BarChart3 },
  ],
  admin: [
    { to: '/admin', label: 'Справочники', icon: BookOpen, end: true },
    { to: '/admin?tab=roles', label: 'Роли', icon: Users },
    { to: '/admin?tab=log', label: 'Журнал', icon: ListChecks },
    { to: '/admin?tab=settings', label: 'Демо-настройки', icon: Settings },
  ],
}

function SideNav({ role, onNavigate }: { role: Exclude<Role, 'guest'>; onNavigate?: () => void }) {
  const { state } = useStore()
  const location = useLocation()
  const badges: Record<string, number> = {
    '/moderator/teachers': state.teachers.filter((t) => t.status === 'pending_review').length,
    '/moderator/reports': state.lessons.filter((l) => l.status === 'pending_approval').length,
  }
  return (
    <nav className="flex flex-col gap-0.5" aria-label={`Меню: ${ROLE_LABEL[role]}`}>
      {NAV[role].map((item) => {
        const Icon = item.icon
        const hasQuery = item.to.includes('?')
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => {
              const active = hasQuery ? location.pathname + location.search === item.to : isActive && (role !== 'admin' || !location.search)
              return cn('flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-muted hover:text-fg', active && 'bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary')
            }}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {badges[item.to] ? <span className="tabular rounded-full bg-warning-soft px-1.5 text-xs font-semibold text-warning">{badges[item.to]}</span> : null}
          </NavLink>
        )
      })}
    </nav>
  )
}

/** Кабинет роли: проверяет, что текущая роль совпадает с разделом. */
export function DashboardLayout({ role }: { role: Exclude<Role, 'guest'> }) {
  const { role: current, user } = useSession()
  const { state, run } = useStore()
  const [open, setOpen] = useState(false)
  const allowed = current === role

  let content: ReactNode = <Outlet />
  if (!allowed) {
    const canSwitch = user?.roles.includes(role)
    const demoUser = state.users.find((u) => u.roles.includes(role))
    content = (
      <div className="mx-auto max-w-lg py-16">
        <EmptyState
          icon={<ShieldCheck />}
          title={`Раздел «${ROLE_LABEL[role]}»`}
          description={canSwitch ? `Вы сейчас в роли «${ROLE_LABEL[current]}». Переключитесь, чтобы открыть этот кабинет.` : 'Этот кабинет доступен другой роли. В демо можно войти под подготовленным профилем.'}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {canSwitch ? (
                <Button onClick={() => run((s) => login(s, user!.id, role))}>Переключиться на «{ROLE_LABEL[role]}»</Button>
              ) : (
                demoUser && <Button onClick={() => run((s) => login(s, demoUser.id, role))}>Войти как {demoUser.name}</Button>
              )}
              <Link to="/demo" className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-border px-4 text-sm font-medium hover:bg-muted">Выбрать профиль</Link>
            </div>
          }
        />
      </div>
    )
  }

  const dense = role === 'moderator' || role === 'admin'
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5"><Logo /></div>
        <div className="px-3 pt-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">{ROLE_LABEL[role]}</p>
          <SideNav role={role} />
        </div>
        <div className="mt-auto space-y-2 border-t border-border p-3">
          <Link to="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-muted hover:text-fg"><FileText className="size-4" aria-hidden /> Публичный сайт</Link>
          <DemoResetButton variant="ghost" full />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Открыть меню"><Menu /></Button>
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden items-center gap-2 lg:flex">
            <DemoBadge>Демо-режим</DemoBadge>
            <span className="text-xs text-fg-muted">данные хранятся локально в браузере</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationCenter />
            <RoleSwitcher />
          </div>
        </header>
        <main className={cn('mx-auto w-full flex-1 px-4 py-6 sm:px-6', dense ? 'max-w-[1400px]' : 'max-w-6xl')}>{content}</main>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title={ROLE_LABEL[role]}>
        <SideNav role={role} onNavigate={() => setOpen(false)} />
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <Link to="/" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">Публичный сайт</Link>
          <DemoResetButton variant="ghost" full />
        </div>
      </Sheet>
    </div>
  )
}
