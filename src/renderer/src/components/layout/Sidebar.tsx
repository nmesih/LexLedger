import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Scale,
  LayoutDashboard,
  Users,
  Briefcase,
  Coins,
  Building2,
  BarChart3,
  Calendar,
  Settings,
  Clock
} from 'lucide-react'

export const Sidebar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')
  const [officeName, setOfficeName] = useState<string>('Alan & Alan Hukuk Bürosu')

  useEffect(() => {
    const loadOfficeName = async () => {
      try {
        const saved = await window.api.settings.get('office_name')
        if (typeof saved === 'string' && saved.trim()) {
          setOfficeName(saved.trim())
        } else if (saved && typeof saved === 'object' && 'office_name' in saved) {
          const val = String((saved as Record<string, any>)['office_name'] || '').trim()
          if (val) setOfficeName(val)
        }
      } catch {}
    }
    loadOfficeName()

    const handleUpdate = (e: any) => {
      if (e.detail && typeof e.detail === 'string' && e.detail.trim()) {
        setOfficeName(e.detail.trim())
      }
    }
    window.addEventListener('office-name-updated', handleUpdate)
    return () => window.removeEventListener('office-name-updated', handleUpdate)
  }, [])

  useEffect(() => {
    const updateDateTime = (): void => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      )
      setCurrentDate(
        now.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      )
    }

    updateDateTime()
    const timer = setInterval(updateDateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clients', label: 'Müvekkiller', icon: Users },
    { to: '/cases', label: 'Davalar', icon: Briefcase },
    { to: '/fees', label: 'Ücretler & Ödemeler', icon: Coins },
    { to: '/office-expenses', label: 'Ofis Giderleri', icon: Building2 },
    { to: '/reports', label: 'Raporlar', icon: BarChart3 },
    { to: '/calendar', label: 'Takvim & Duruşmalar', icon: Calendar },
    { to: '/settings', label: 'Ayarlar', icon: Settings }
  ]

  const renderBrand = () => {
    const trimmed = officeName.trim()
    const lower = trimmed.toLowerCase()
    if (lower.endsWith('hukuk bürosu')) {
      const mainTitle = trimmed.substring(0, trimmed.length - 12).trim()
      return (
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-[#C9A84C] font-serif truncate" title={trimmed}>
            {mainTitle || trimmed}
          </h1>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-0.5">
            Hukuk Bürosu
          </p>
        </div>
      )
    }
    return (
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold tracking-tight text-[#C9A84C] font-serif truncate" title={trimmed}>
          {trimmed}
        </h1>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
          Yönetim Sistemi
        </p>
      </div>
    )
  }

  return (
    <aside className="w-64 bg-[#0F1B2D] text-slate-300 flex flex-col justify-between h-screen flex-shrink-0 border-r border-slate-800/80 select-none">
      {/* Brand & Logo */}
      <div>
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 shadow-md shadow-gold-500/10 flex-shrink-0">
            <Scale className="w-6 h-6 text-[#0F1B2D]" strokeWidth={2.2} />
          </div>
          {renderBrand()}
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#C9A84C] text-[#0F1B2D] font-semibold shadow-md shadow-[#C9A84C]/20'
                    : 'text-slate-400 hover:text-[#C9A84C] hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#0F1B2D]' : 'text-slate-400 group-hover:text-[#C9A84C]'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer / Time Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <Clock className="w-4 h-4 text-[#C9A84C]" />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-200">{currentTime}</span>
            <span className="text-[11px] text-slate-400">{currentDate}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
