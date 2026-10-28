// Dialog, Sheet и Tabs на базе Radix UI (как в shadcn/ui).
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md' }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            'animate-in fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-lg)] border border-border bg-surface shadow-xl',
            sizes[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-fg-muted">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">Диалоговое окно</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-fg-muted hover:bg-muted hover:text-fg" aria-label="Закрыть">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function Sheet({ open, onOpenChange, title, children, side = 'left' }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; side?: 'left' | 'right' }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
        <DialogPrimitive.Content className={cn('fixed top-0 z-50 flex h-full w-[86%] max-w-xs flex-col bg-surface shadow-xl', side === 'left' ? 'left-0' : 'right-0')}>
          <div className="flex items-center justify-between border-b border-border p-4">
            <DialogPrimitive.Title className="font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Меню навигации</DialogPrimitive.Description>
            <DialogPrimitive.Close className="rounded-md p-1 hover:bg-muted" aria-label="Закрыть меню">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-3">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...p }: TabsPrimitive.TabsListProps) {
  return <TabsPrimitive.List className={cn('inline-flex flex-wrap gap-1 rounded-[var(--radius-sm)] bg-muted p-1', className)} {...p} />
}

export function TabsTrigger({ className, ...p }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-sm',
        className,
      )}
      {...p}
    />
  )
}

export function TabsContent({ className, ...p }: TabsPrimitive.TabsContentProps) {
  return <TabsPrimitive.Content className={cn('mt-4 focus-visible:outline-none', className)} {...p} />
}
