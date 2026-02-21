'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

interface AgentStep {
  agentId: string
  role: string
  agentName?: string
}

interface StepResult {
  agentId: string
  agentName: string
  role: string
  input: any
  output: string
  timestamp: string
  model?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  tokensUsed?: number
}

interface AnimatedStepTimelineProps {
  steps: AgentStep[]
  results: StepResult[]
  isRunning: boolean
  currentStepIndex?: number
}

export function AnimatedStepTimeline({
  steps,
  results,
  isRunning,
  currentStepIndex
}: AnimatedStepTimelineProps) {
  const getStepStatus = (index: number): 'pending' | 'running' | 'completed' | 'error' => {
    const result = results[index]
    if (result) return 'completed'
    if (isRunning && index === currentStepIndex) return 'running'
    return 'pending'
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="relative border-l-2 border-white/10 ml-4 space-y-8 pb-4">
      <AnimatePresence mode="popLayout">
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          const result = results[index]

          return (
            <motion.div
              key={`${step.role}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative pl-8"
            >
              {/* Status Indicator */}
              <motion.div
                className="absolute -left-[9px] top-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                {status === 'completed' && (
                  <motion.div
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-500" />
                  </motion.div>
                )}
                {status === 'running' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="h-4 w-4 text-blue-500" />
                  </motion.div>
                )}
                {status === 'pending' && (
                  <Circle className="h-4 w-4 text-white/20" />
                )}
                {status === 'error' && (
                  <XCircle className="h-4 w-4 text-red-500 fill-red-500" />
                )}
              </motion.div>

              {/* Step Header */}
              <div className="flex flex-col gap-1 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.span
                    className={`text-sm font-medium ${
                      status === 'running' ? 'text-blue-400' : 'text-white'
                    }`}
                    animate={status === 'running' ? { opacity: [1, 0.7, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {step.role}
                  </motion.span>

                  {step.agentName && (
                    <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-white/40">
                      {step.agentName}
                    </Badge>
                  )}

                  {result?.durationMs !== undefined && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-white/10 text-white/60">
                      {formatDuration(result.durationMs)}
                    </Badge>
                  )}

                  {result?.tokensUsed !== undefined && result.tokensUsed > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-purple-500/20 text-purple-300">
                      {result.tokensUsed.toLocaleString()} tokens
                    </Badge>
                  )}
                </div>

                {/* Running indicator */}
                {status === 'running' && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-blue-300/80"
                  >
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Processando...
                    </motion.span>
                  </motion.p>
                )}
              </div>

              {/* Step Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 text-sm bg-white/5 rounded-md p-3 border border-white/10">
                      {/* Input */}
                      <div className="mb-3">
                        <p className="text-xs text-white/40 mb-1 font-mono">Input:</p>
                        <div className="text-white/80 text-xs font-mono bg-black/20 p-2 rounded max-h-20 overflow-y-auto">
                          {typeof result.input === 'string'
                            ? result.input
                            : JSON.stringify(result.input, null, 2)}
                        </div>
                      </div>

                      {/* Output */}
                      <div>
                        <p className="text-xs text-white/40 mb-1 font-mono">Output:</p>
                        <div className="text-white/90 whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
                          {result.output}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {result.model && (
                          <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/60">
                            {result.model}
                          </Badge>
                        )}
                        {result.completedAt && (
                          <span className="text-[10px] text-white/40">
                            {new Date(result.completedAt).toLocaleTimeString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
