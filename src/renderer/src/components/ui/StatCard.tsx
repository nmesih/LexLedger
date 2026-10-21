import React from 'react'
import { LucideIcon, Eye, EyeOff } from 'lucide-react'

export interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  color?: 'green' | 'gold' | 'red' | 'blue'
  isCurrency?: boolean
  isMasked?: boolean
  onToggleMask?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'gold',
  isCurrency = true,
  isMasked = false,
  onToggleMask
}) => {
  const colorStyles = {
    gold: {
      bg: 'bg-gold-50',
      text: 'text-gold-600',
      border: 'border-gold-200/80',
      indicator: 'bg-gold-400',
      iconBg: 'bg-gold-100/70 text-gold-700'
    },
    green: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200/80',
      indicator: 'bg-emerald-500',
      iconBg: 'bg-emerald-100 text-emerald-700'
    },
    red: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-200/80',
      indicator: 'bg-rose-500',
      iconBg: 'bg-rose-100 text-rose-700'
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200/80',
      indicator: 'bg-blue-500',
      iconBg: 'bg-blue-100 text-blue-700'
    }
  }[color]

  const displayValue =
    typeof value === 'number' && isCurrency
      ? value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
      : typeof value === 'number'
      ? value.toLocaleString('tr-TR')
      : value

  return (
    <div className="relative bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colorStyles.indicator}`} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{title}</p>
            {onToggleMask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleMask()
                }}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title={isMasked ? 'Miktarı göster' : 'Miktarı gizle'}
                aria-label={isMasked ? 'Miktarı göster' : 'Miktarı gizle'}
              >
                {isMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <h4
            onClick={onToggleMask}
            className={`text-2xl font-bold text-slate-900 mt-2 tracking-tight ${
              isMasked ? 'tracking-wider font-mono text-slate-400 cursor-pointer select-none' : ''
            }`}
            title={isMasked ? 'Görmek için tıklayın' : undefined}
          >
            {isMasked ? (isCurrency ? '•••••• ₺' : '••••••') : displayValue}
          </h4>
        </div>
        <div className={`p-3 rounded-xl ${colorStyles.iconBg} shadow-sm flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {subtitle && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`w-1.5 h-1.5 rounded-full ${colorStyles.indicator}`}></span>
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  )
}

export default StatCard
