import { useCallback, useState } from 'react'

export type DrawerView = 'history' | 'settings'

export function useDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<DrawerView>('history')

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  return { isOpen, view, open, close, toggle, setView }
}

export type UseDrawerReturn = ReturnType<typeof useDrawer>
