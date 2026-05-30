import { useState } from 'react'
import type { RefObject } from 'react'

export interface PendingRoute {
  x: number
  y: number
  origin: string
  destination: string
  totalCost: number
}

export function RouteConfirmCard({ pending, cardRef, canAfford, onBuy, onCancel }: {
  pending: PendingRoute
  cardRef: RefObject<HTMLDivElement | null>
  canAfford: boolean
  onBuy: () => void
  onCancel: () => void
}) {
  const [cancelHovered, setCancelHovered] = useState(false)
  const [buyHovered, setBuyHovered] = useState(false)

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left: pending.x + 10,
        top: pending.y - 10,
        transform: 'translateY(-100%)',
        backgroundColor: 'rgba(242, 234, 210, 0.97)',
        border: '1px solid rgba(80, 45, 10, 0.35)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        borderRadius: 2,
        padding: '9px 13px',
        fontFamily: '"Courier Prime", monospace',
        fontSize: 14,
        color: 'hsl(20, 65%, 18%)',
        zIndex: 10,
        minWidth: 164,
        userSelect: 'none',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 5, letterSpacing: '0.03em' }}>
        {pending.origin} — {pending.destination}
      </div>
      <div style={{
        marginBottom: 10,
        fontSize: 13,
        color: canAfford ? 'hsl(20, 50%, 35%)' : 'hsl(355, 70%, 42%)',
      }}>
        ¢{pending.totalCost.toString().padStart(2, '0')}
        {!canAfford && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.85 }}>insufficient funds</span>}
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        <button
          onClick={onCancel}
          onMouseEnter={() => setCancelHovered(true)}
          onMouseLeave={() => setCancelHovered(false)}
          style={{
            flex: 1, padding: '4px 0',
            border: '1px solid rgba(80, 45, 10, 0.3)',
            borderRadius: 2,
            backgroundColor: cancelHovered ? 'rgba(80, 45, 10, 0.07)' : 'transparent',
            color: 'hsl(20, 40%, 35%)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
          }}
        >
          cancel
        </button>
        <button
          onClick={onBuy}
          disabled={!canAfford}
          onMouseEnter={() => canAfford && setBuyHovered(true)}
          onMouseLeave={() => setBuyHovered(false)}
          style={{
            flex: 1, padding: '4px 0',
            border: `1px solid rgba(80, 45, 10, ${canAfford ? '0.55' : '0.2'})`,
            borderRadius: 2,
            backgroundColor: canAfford
              ? buyHovered ? 'rgba(80, 45, 10, 0.2)' : 'rgba(80, 45, 10, 0.1)'
              : 'transparent',
            color: canAfford ? 'hsl(20, 65%, 18%)' : 'hsl(20, 20%, 55%)',
            fontFamily: 'inherit', fontSize: 13,
            cursor: canAfford ? 'pointer' : 'not-allowed',
          }}
        >
          buy
        </button>
      </div>
    </div>
  )
}
