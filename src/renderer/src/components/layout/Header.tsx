import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

export interface HeaderProps {
  title: string
  subtitle?: string
  actionButton?: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton }) => {
  const [reminderCount, setReminderCount] = useState<number>(0)

  useEffect(() => {
    const handleCount = (e: any) => {
      if (e.detail && typeof e.detail.count === 'number') {
        setReminderCount(e.detail.count)
      }
    }
    window.addEventListener('calendar-reminder-count', handleCount)
    return () => window.removeEventListener('calendar-reminder-count', handleCount)
  }, [])

  const handleToggleReminder = () => {
    window.dispatchEvent(new CustomEvent('toggle-reminder-panel'))
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-normal">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Agenda Bell Icon */}
        <button
          type="button"
          onClick={handleToggleReminder}
          className="relative p-2 text-slate-500 hover:text-[#0F1B2D] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Bugün ve Yarının Hatırlatıcılarını Aç"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {reminderCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-[#0F1B2D] text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
              {reminderCount}
            </span>
          )}
        </button>

        {actionButton}
      </div>
    </header>
  )
}

export default Header
