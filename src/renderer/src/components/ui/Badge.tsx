import React from 'react'

export type BadgeType =
  | 'DAVA'
  | 'İCRA'
  | 'DANIŞMA'
  | 'DİĞER'
  | 'DEVAM_EDIYOR'
  | 'SONUCLANDI'
  | 'ASKIYA_ALINDI'
  | 'NAKİT'
  | 'HAVALE'
  | 'KREDİ_KARTI'
  | 'ÇEK'
  | 'OFİS'
  | 'MÜVEKKİL'
  | 'KİRA'
  | 'VERGİ'
  | 'KIRTASİYE'
  | 'MAAŞ'
  | 'ELEKTRİK_SU'
  | 'İNTERNET'
  | string

interface BadgeProps {
  type: BadgeType
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({ type, label, className = '', size = 'md' }) => {
  const getBadgeStyle = (val: string): { bg: string; text: string; border: string; defaultLabel: string } => {
    switch (val) {
      // Case Types
      case 'DAVA':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          defaultLabel: 'Dava'
        }
      case 'İCRA':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
          defaultLabel: 'İcra'
        }
      case 'DANIŞMA':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          defaultLabel: 'Danışma'
        }
      case 'DİĞER':
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          defaultLabel: 'Diğer'
        }

      // Case Statuses
      case 'DEVAM_EDIYOR':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          defaultLabel: 'Devam Ediyor'
        }
      case 'SONUCLANDI':
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-600',
          border: 'border-slate-300',
          defaultLabel: 'Sonuçlandı'
        }
      case 'ASKIYA_ALINDI':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          defaultLabel: 'Askıya Alındı'
        }

      // Payment Methods
      case 'NAKİT':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          defaultLabel: 'Nakit'
        }
      case 'HAVALE':
        return {
          bg: 'bg-sky-50',
          text: 'text-sky-800',
          border: 'border-sky-200',
          defaultLabel: 'Havale / EFT'
        }
      case 'KREDİ_KARTI':
        return {
          bg: 'bg-indigo-50',
          text: 'text-indigo-800',
          border: 'border-indigo-200',
          defaultLabel: 'Kredi Kartı'
        }
      case 'ÇEK':
        return {
          bg: 'bg-violet-50',
          text: 'text-violet-800',
          border: 'border-violet-200',
          defaultLabel: 'Çek'
        }

      // Paid By
      case 'OFİS':
        return {
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          defaultLabel: 'Ofis'
        }
      case 'MÜVEKKİL':
        return {
          bg: 'bg-teal-50',
          text: 'text-teal-700',
          border: 'border-teal-200',
          defaultLabel: 'Müvekkil'
        }

      // Office Expense Categories
      case 'KİRA':
        return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', defaultLabel: 'Kira' }
      case 'VERGİ':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', defaultLabel: 'Vergi' }
      case 'KIRTASİYE':
        return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', defaultLabel: 'Kırtasiye' }
      case 'MAAŞ':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', defaultLabel: 'Maaş' }
      case 'ELEKTRİK_SU':
        return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', defaultLabel: 'Elektrik/Su' }
      case 'İNTERNET':
        return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', defaultLabel: 'İnternet' }

      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          defaultLabel: val
        }
    }
  }

  const { bg, text, border, defaultLabel } = getBadgeStyle(type)
  const displayText = label ?? defaultLabel
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${bg} ${text} ${border} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {displayText}
    </span>
  )
}

export default Badge
