import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { AppState } from '@/types'
import { buildSeed, SCHEMA_VERSION } from '@/mocks/seed'
import { delay } from '@/lib/utils'
import { OpError } from './mockApi'
import { parentByUser, studentByUser, teacherByUser, userById } from './selectors'

const STORAGE_KEY = 'nis-academy-demo'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
    }
  } catch {
    /* повреждённые данные — пересоздаём seed */
  }
  return buildSeed()
}

export type OpResult<T> = { ok: true; value: T } | { ok: false; error: string; field?: string }

interface StoreValue {
  state: AppState
  run: <T>(op: (draft: AppState) => T) => OpResult<T>
  reset: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* хранилище недоступно — демо продолжает работать в памяти */
    }
  }, [state])

  // Ссылка на актуальное состояние: операции выполняются синхронно над копией, при ошибке ничего не меняется.
  const ref = useRef(state)
  const run = useCallback(<T,>(op: (draft: AppState) => T): OpResult<T> => {
    const draft = structuredClone(ref.current)
    try {
      const value = op(draft)
      ref.current = draft
      setState(draft)
      return { ok: true, value }
    } catch (e) {
      return e instanceof OpError ? { ok: false, error: e.message, field: e.field } : { ok: false, error: String(e) }
    }
  }, [])

  const reset = useCallback(() => {
    const fresh = buildSeed()
    ref.current = fresh
    setState(fresh)
  }, [])

  const value = useMemo(() => ({ state, run, reset }), [state, run, reset])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}

/** Текущий пользователь и его профили по ролям. */
export function useSession() {
  const { state } = useStore()
  const { userId, role } = state.session
  return {
    role,
    user: userById(state, userId),
    parent: parentByUser(state, userId),
    teacher: teacherByUser(state, userId),
    student: studentByUser(state, userId),
  }
}

interface ExecOptions<T> {
  success?: string | ((v: T) => string)
  errorTitle?: string
  ms?: number
}

/** Действие с короткой имитацией загрузки, toast-успехом/ошибкой. */
export function useAction() {
  const { run } = useStore()
  const [pending, setPending] = useState(false)
  const exec = useCallback(
    async <T,>(op: (draft: AppState) => T, opts: ExecOptions<T> = {}): Promise<OpResult<T>> => {
      setPending(true)
      await delay(opts.ms ?? 450)
      const res = run(op)
      setPending(false)
      if (res.ok) {
        const msg = typeof opts.success === 'function' ? opts.success(res.value) : opts.success
        if (msg) toast.success(msg)
      } else {
        toast.error(opts.errorTitle ?? 'Действие не выполнено', { description: res.error })
      }
      return res
    },
    [run],
  )
  return { pending, exec }
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
