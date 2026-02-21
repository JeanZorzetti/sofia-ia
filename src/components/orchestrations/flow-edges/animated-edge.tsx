'use client'

import { memo } from 'react'
import { getBezierPath, EdgeProps } from '@xyflow/react'

export type AnimatedEdgeData = {
  isActive?: boolean
  isCompleted?: boolean
}

function AnimatedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  const isActive = data?.isActive || false
  const isCompleted = data?.isCompleted || false

  return (
    <>
      {/* Base path */}
      <path
        id={id}
        style={style}
        className={`react-flow__edge-path ${
          isCompleted
            ? 'stroke-green-500'
            : isActive
            ? 'stroke-blue-500'
            : 'stroke-white/20'
        }`}
        d={edgePath}
        strokeWidth={2}
        fill="none"
      />

      {/* Animated flow */}
      {isActive && (
        <>
          <path
            d={edgePath}
            stroke="url(#flowGradient)"
            strokeWidth={3}
            fill="none"
            strokeDasharray="10 5"
            className="animate-flow"
            style={{
              animation: 'flow 1s linear infinite'
            }}
          />
          <defs>
            <linearGradient id="flowGradient" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
              <stop offset="50%" stopColor="rgba(59, 130, 246, 1)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>
          <style>
            {`
              @keyframes flow {
                0% {
                  stroke-dashoffset: 0;
                }
                100% {
                  stroke-dashoffset: -15;
                }
              }
            `}
          </style>
        </>
      )}

      {/* Completed glow */}
      {isCompleted && (
        <path
          d={edgePath}
          stroke="rgba(34, 197, 94, 0.3)"
          strokeWidth={6}
          fill="none"
          className="blur-sm"
        />
      )}
    </>
  )
}

export const AnimatedEdge = memo(AnimatedEdgeComponent)
