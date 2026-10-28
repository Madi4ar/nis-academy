import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Language } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let counter = 0
export function uid(prefix: string) {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

export const LANGUAGE_LABEL: Record<Language, string> = { ru: 'Русский', kz: 'Казахский' }

export function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₸'
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) {
  return new Date(iso).toLocaleDateString('ru-RU', opts)
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso, { day: 'numeric', month: 'short' })}, ${formatTime(iso)}`
}

export function addMinutes(iso: string, min: number) {
  return new Date(new Date(iso).getTime() + min * 60000).toISOString()
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Понедельник недели, в которую попадает дата. */
export function startOfWeek(d: Date) {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7
  return addDays(x, -day)
}

export function toLocalInputDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function toLocalInputTime(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fromLocalInputs(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function plural(n: number, forms: [string, string, string]) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return forms[0]
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1]
  return forms[2]
}

export function subjectsWord(n: number) {
  return `${n} ${plural(n, ['предмет', 'предмета', 'предметов'])}`
}

export function lessonsWord(n: number) {
  return `${n} ${plural(n, ['урок', 'урока', 'уроков'])}`
}

export function gradeRange([a, b]: [number, number]) {
  return a === b ? `${a} класс` : `${a}–${b} классы`
}

export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function delay(ms = 450) {
  return new Promise((r) => setTimeout(r, ms))
}
