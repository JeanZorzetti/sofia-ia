'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ContextMenuItem {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    danger?: boolean
    divider?: boolean
}

interface ContextMenuProps {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
    visible: boolean
}

export function ContextMenu({ x, y, items, onClose, visible }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        if (!visible) return

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Element)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        // Small delay to avoid immediately closing from the context menu event
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }, 10)

        return () => {
            clearTimeout(timer)
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [visible, onClose])

    // Adjust position to keep menu in viewport
    useEffect(() => {
        if (!visible || !menuRef.current) return
        const rect = menuRef.current.getBoundingClientRect()
        const parent = menuRef.current.parentElement
        if (!parent) return

        const parentRect = parent.getBoundingClientRect()
        const overflowX = rect.right - parentRect.right
        const overflowY = rect.bottom - parentRect.bottom

        if (overflowX > 0) {
            menuRef.current.style.left = `${x - overflowX - 8}px`
        }
        if (overflowY > 0) {
            menuRef.current.style.top = `${y - overflowY - 8}px`
        }
    }, [visible, x, y])

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.1 }}
                    className="absolute z-50 min-w-[180px] bg-gray-800/95 backdrop-blur-md border border-white/15 rounded-lg shadow-2xl py-1.5 overflow-hidden"
                    style={{ left: x, top: y }}
                >
                    {items.map((item, index) => (
                        <div key={index}>
                            {item.divider && index > 0 && (
                                <div className="h-px bg-white/10 my-1 mx-2" />
                            )}
                            <button
                                onClick={() => {
                                    item.onClick()
                                    onClose()
                                }}
                                className={`
                                    w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left
                                    transition-colors duration-100 cursor-pointer
                                    ${item.danger
                                        ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }
                                `}
                            >
                                {item.icon && (
                                    <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center opacity-70">
                                        {item.icon}
                                    </span>
                                )}
                                <span>{item.label}</span>
                            </button>
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
