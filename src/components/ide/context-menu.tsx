'use client'

// ─────────────────────────────────────────────────────────
// Context Menu — Right-click menu for IDE (file tree + editor)
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'

interface MenuItem {
    label: string
    icon?: React.ReactNode
    shortcut?: string
    onClick: () => void
    danger?: boolean
    separator?: boolean
    disabled?: boolean
}

interface ContextMenuProps {
    x: number
    y: number
    items: MenuItem[]
    onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Auto-position: prevent going off screen
    useEffect(() => {
        if (!menuRef.current) return
        const rect = menuRef.current.getBoundingClientRect()
        const vw = window.innerWidth
        const vh = window.innerHeight

        if (rect.right > vw) {
            menuRef.current.style.left = `${x - rect.width}px`
        }
        if (rect.bottom > vh) {
            menuRef.current.style.top = `${y - rect.height}px`
        }
    }, [x, y])

    // Close on outside click or Escape
    useEffect(() => {
        const handleClick = () => onClose()
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('click', handleClick)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('click', handleClick)
            document.removeEventListener('keydown', handleKey)
        }
    }, [onClose])

    return (
        <div
            ref={menuRef}
            onClick={e => e.stopPropagation()}
            style={{
                position: 'fixed', left: x, top: y, zIndex: 200,
                background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '4px 0', minWidth: '180px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                animation: 'fadeIn 0.1s ease-out',
            }}
        >
            {items.map((item, idx) => {
                if (item.separator) {
                    return <div key={idx} style={{
                        height: '1px', background: 'rgba(255,255,255,0.06)',
                        margin: '4px 8px',
                    }} />
                }

                return (
                    <button
                        key={idx}
                        onClick={() => { item.onClick(); onClose() }}
                        disabled={item.disabled}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            width: '100%', padding: '6px 12px', border: 'none',
                            background: 'none', cursor: item.disabled ? 'default' : 'pointer',
                            color: item.disabled ? '#333' : item.danger ? '#f87171' : '#ccc',
                            fontSize: '12px', textAlign: 'left',
                            transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => {
                            if (!item.disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'none'
                        }}
                    >
                        {item.icon && <span style={{ width: '16px', display: 'flex', justifyContent: 'center', opacity: 0.7 }}>{item.icon}</span>}
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.shortcut && (
                            <span style={{
                                fontSize: '10px', color: '#444',
                                background: 'rgba(255,255,255,0.04)', padding: '1px 5px',
                                borderRadius: '3px',
                            }}>
                                {item.shortcut}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

// ── Helper hook for context menus ──────────────────────────
export function useContextMenu() {
    const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)

    const showMenu = useCallback((e: React.MouseEvent, items: MenuItem[]) => {
        e.preventDefault()
        e.stopPropagation()
        setMenu({ x: e.clientX, y: e.clientY, items })
    }, [])

    const closeMenu = useCallback(() => setMenu(null), [])

    return { menu, showMenu, closeMenu }
}
