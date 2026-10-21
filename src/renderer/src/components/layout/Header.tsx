import React from 'react'

export interface HeaderProps {
  title: string
  subtitle?: string
  actionButton?: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-normal">{subtitle}</p>}
      </div>
      {actionButton && <div className="flex items-center gap-3">{actionButton}</div>}
    </header>
  )
}

export default Header
