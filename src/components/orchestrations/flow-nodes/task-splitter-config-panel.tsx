'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface SplitterConfig {
    taskPattern: string
    confirmationMode: 'auto' | 'manual'
    contextMode: 'isolated' | 'accumulated'
    maxTasksPerRun?: number
}

interface TaskSplitterConfigPanelProps {
    visible: boolean
    config: SplitterConfig
    onSave: (config: SplitterConfig) => void
    onClose: () => void
}

const defaultPatterns = [
    { label: 'Task WF-XX (padrão)', value: '\\*\\*Task\\s+(WF-\\d+):\\*\\*\\s*(.+)' },
    { label: 'Markdown ### Task', value: '###\\s*Task\\s+(WF-\\d+):\\s*(.+)' },
    { label: 'Genérico **Task XX:**', value: '\\*\\*Task\\s+(\\S+):\\*\\*\\s*(.+)' },
    { label: 'Personalizado', value: 'custom' },
]

export function TaskSplitterConfigPanel({ visible, config, onSave, onClose }: TaskSplitterConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState<SplitterConfig>(config)
    const [selectedPreset, setSelectedPreset] = useState<string>('preset')
    const [customPattern, setCustomPattern] = useState('')

    useEffect(() => {
        setLocalConfig(config)
        const matchingPreset = defaultPatterns.find(p => p.value === config.taskPattern)
        if (matchingPreset) {
            setSelectedPreset(matchingPreset.value)
        } else {
            setSelectedPreset('custom')
            setCustomPattern(config.taskPattern)
        }
    }, [config])

    const handleSave = () => {
        const finalConfig = {
            ...localConfig,
            taskPattern: selectedPreset === 'custom' ? customPattern : selectedPreset,
            maxTasksPerRun: localConfig.maxTasksPerRun || undefined,
        }
        onSave(finalConfig)
        onClose()
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-4 right-4 z-50 w-[340px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                        <h3 className="text-sm font-semibold text-amber-300">⚡ Task Splitter Config</h3>
                        <button
                            onClick={onClose}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Task Pattern */}
                        <div>
                            <label className="block text-xs font-medium text-white/60 mb-1.5">
                                Padrão de Extração
                            </label>
                            <select
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-3 py-2 outline-none focus:border-amber-500 transition-colors"
                            >
                                {defaultPatterns.map(p => (
                                    <option key={p.value} value={p.value} className="bg-gray-900">
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                            {selectedPreset === 'custom' && (
                                <input
                                    type="text"
                                    value={customPattern}
                                    onChange={(e) => setCustomPattern(e.target.value)}
                                    placeholder="Regex pattern..."
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-3 py-2 outline-none focus:border-amber-500 font-mono"
                                />
                            )}
                        </div>

                        {/* Confirmation Mode */}
                        <div>
                            <label className="block text-xs font-medium text-white/60 mb-1.5">
                                Modo de Confirmação
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLocalConfig(c => ({ ...c, confirmationMode: 'auto' }))}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${localConfig.confirmationMode === 'auto'
                                            ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                                            : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    🤖 Automático
                                </button>
                                <button
                                    onClick={() => setLocalConfig(c => ({ ...c, confirmationMode: 'manual' }))}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${localConfig.confirmationMode === 'manual'
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                            : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    👤 Manual
                                </button>
                            </div>
                            <p className="text-[10px] text-white/30 mt-1">
                                {localConfig.confirmationMode === 'auto'
                                    ? 'Avança automaticamente se a task for concluída sem erros'
                                    : 'Pausa entre tasks e aguarda confirmação para prosseguir'
                                }
                            </p>
                        </div>

                        {/* Context Mode */}
                        <div>
                            <label className="block text-xs font-medium text-white/60 mb-1.5">
                                Contexto por Task
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLocalConfig(c => ({ ...c, contextMode: 'isolated' }))}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${localConfig.contextMode === 'isolated'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    📦 Isolado
                                </button>
                                <button
                                    onClick={() => setLocalConfig(c => ({ ...c, contextMode: 'accumulated' }))}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${localConfig.contextMode === 'accumulated'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                            : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    🔗 Acumulado
                                </button>
                            </div>
                            <p className="text-[10px] text-white/30 mt-1">
                                {localConfig.contextMode === 'isolated'
                                    ? 'Cada task recebe apenas sua própria descrição (recomendado)'
                                    : 'Cada task recebe a descrição + outputs de tasks anteriores'
                                }
                            </p>
                        </div>

                        {/* Max Tasks */}
                        <div>
                            <label className="block text-xs font-medium text-white/60 mb-1.5">
                                Máx. Tasks por Execução
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={localConfig.maxTasksPerRun || ''}
                                onChange={(e) => setLocalConfig(c => ({
                                    ...c,
                                    maxTasksPerRun: e.target.value ? parseInt(e.target.value) : undefined
                                }))}
                                placeholder="Todas (sem limite)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-3 py-2 outline-none focus:border-amber-500"
                            />
                            <p className="text-[10px] text-white/30 mt-1">
                                Deixe vazio para executar todas as tasks extraídas
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            className="text-xs text-white/50 hover:text-white hover:bg-white/10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            className="text-xs bg-amber-600 hover:bg-amber-500 text-white"
                        >
                            Salvar
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
