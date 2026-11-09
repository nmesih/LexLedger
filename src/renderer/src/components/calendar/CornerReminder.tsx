import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellRing,
  Scale,
  Clock,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  Calendar,
  ArrowRight,
  MapPin,
  Users,
  ChevronRight,
  ExternalLink,
  Minimize2
} from 'lucide-react'
import { CalendarEvent, CalendarEventType } from '../../types'

const formatYmd = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const CornerReminder: React.FC = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today')

  const now = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => formatYmd(now), [now])
  const tomorrowStr = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return formatYmd(d)
  }, [now])

  const todayFormatted = useMemo(() => {
    return now.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'long'
    })
  }, [now])

  const tomorrowFormatted = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'long'
    })
  }, [now])

  // Load calendar events for today & tomorrow
  const loadEvents = useCallback(async () => {
    try {
      if (!window.api?.calendar?.getByRange) return
      const list = await window.api.calendar.getByRange(todayStr, tomorrowStr)
      if (Array.isArray(list)) {
        // Filter out cancelled events
        const valid = list.filter((e) => e.status !== 'IPTAL')
        setEvents(valid)

        // Send reminder count to Header if needed
        const pendingCount = valid.filter((e) => e.status !== 'TAMAMLANDI').length
        window.dispatchEvent(
          new CustomEvent('calendar-reminder-count', { detail: { count: pendingCount, total: valid.length } })
        )
      }
    } catch (err) {
      console.error('CornerReminder loadEvents error:', err)
    } finally {
      setLoading(false)
    }
  }, [todayStr, tomorrowStr])

  // Initial load, periodic refresh & event listeners
  useEffect(() => {
    loadEvents()

    // Pop open automatically on initial boot if there are pending events and not dismissed yet
    const hasDismissed = sessionStorage.getItem(`lexledger_reminder_closed_${todayStr}`)
    if (!hasDismissed) {
      // Delay opening slightly so initial page load feels smooth
      const openTimer = setTimeout(() => {
        window.api?.calendar?.getByRange(todayStr, tomorrowStr).then((list) => {
          if (Array.isArray(list)) {
            const pending = list.filter((e) => e.status !== 'IPTAL' && e.status !== 'TAMAMLANDI')
            if (pending.length > 0) {
              setIsExpanded(true)
            }
          }
        }).catch(() => {})
      }, 1000)
      return () => clearTimeout(openTimer)
    }

    // Refresh every 60 seconds
    const interval = setInterval(loadEvents, 60000)

    const handleUpdated = () => loadEvents()
    const handleToggle = () => setIsExpanded((prev) => !prev)

    window.addEventListener('calendar-events-updated', handleUpdated)
    window.addEventListener('toggle-reminder-panel', handleToggle)
    window.addEventListener('focus', loadEvents)

    return () => {
      clearInterval(interval)
      window.removeEventListener('calendar-events-updated', handleUpdated)
      window.removeEventListener('toggle-reminder-panel', handleToggle)
      window.removeEventListener('focus', loadEvents)
    }
  }, [loadEvents, todayStr, tomorrowStr])

  // Desktop Notification Trigger (shown once per day per session)
  useEffect(() => {
    if (events.length === 0) return
    const notifKey = `lexledger_desktop_notif_${todayStr}`
    if (sessionStorage.getItem(notifKey)) return

    const pendingToday = events.filter((e) => e.start_date === todayStr && e.status !== 'TAMAMLANDI')
    const pendingTomorrow = events.filter((e) => e.start_date === tomorrowStr && e.status !== 'TAMAMLANDI')

    if (pendingToday.length === 0 && pendingTomorrow.length === 0) return

    const fireNotification = () => {
      try {
        const title =
          pendingToday.length > 0
            ? `⚖️ Bugün ${pendingToday.length} Duruşma / İşiniz Var!`
            : `⚖️ Yarın ${pendingTomorrow.length} Duruşma / İşiniz Var!`

        const first = pendingToday[0] || pendingTomorrow[0]
        const bodyText = `${first.start_time ? first.start_time + ' - ' : ''}${first.title}${
          first.court ? ' (' + first.court + ')' : ''
        }`

        const notif = new Notification(title, {
          body: bodyText,
          silent: false
        })

        notif.onclick = () => {
          window.focus()
          setIsExpanded(true)
        }

        sessionStorage.setItem(notifKey, 'true')
      } catch {}
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        fireNotification()
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') fireNotification()
        })
      }
    }
  }, [events, todayStr, tomorrowStr])

  const todayEvents = useMemo(() => {
    return events.filter((e) => e.start_date === todayStr)
  }, [events, todayStr])

  const tomorrowEvents = useMemo(() => {
    return events.filter((e) => e.start_date === tomorrowStr)
  }, [events, tomorrowStr])

  const activeEvents = activeTab === 'today' ? todayEvents : tomorrowEvents

  const pendingTodayCount = useMemo(() => {
    return todayEvents.filter((e) => e.status !== 'TAMAMLANDI').length
  }, [todayEvents])

  const pendingTomorrowCount = useMemo(() => {
    return tomorrowEvents.filter((e) => e.status !== 'TAMAMLANDI').length
  }, [tomorrowEvents])

  const totalPending = pendingTodayCount + pendingTomorrowCount

  // Toggle status between BEKLIYOR and TAMAMLANDI
  const handleToggleStatus = async (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation()
    const nextStatus = event.status === 'TAMAMLANDI' ? 'BEKLIYOR' : 'TAMAMLANDI'
    try {
      await window.api.calendar.update(event.id, { status: nextStatus })
      setEvents((prev) =>
        prev.map((item) => (item.id === event.id ? { ...item, status: nextStatus } : item))
      )
      window.dispatchEvent(new CustomEvent('calendar-events-updated'))
    } catch (err) {
      console.error('Failed to update event status:', err)
    }
  }

  const handleDismiss = () => {
    setIsExpanded(false)
    sessionStorage.setItem(`lexledger_reminder_closed_${todayStr}`, 'true')
  }

  const handleOpenCalendar = () => {
    setIsExpanded(false)
    navigate('/calendar')
  }

  // Helper for event type badges
  const renderEventTypeBadge = (type: CalendarEventType) => {
    switch (type) {
      case 'DURUSMA':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Scale className="w-3 h-3 text-[#C9A84C]" />
            Duruşma
          </span>
        )
      case 'SURELI_IS':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Süreli İş / İtiraz
          </span>
        )
      case 'KESIF':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <MapPin className="w-3 h-3 text-emerald-600" />
            Keşif
          </span>
        )
      case 'TOPLANTI':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            <Users className="w-3 h-3 text-sky-600" />
            Toplantı
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <Calendar className="w-3 h-3 text-slate-500" />
            Diğer
          </span>
        )
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {/* Minimized Floating Pill Badge */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-3 px-4 py-2.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-full shadow-2xl border border-[#C9A84C]/50 transition-all duration-200 hover:scale-105 cursor-pointer group"
          title="Bugün ve Yarının Hatırlatıcılarını Aç"
        >
          <div className="relative flex items-center justify-center">
            {totalPending > 0 ? (
              <BellRing className="w-4 h-4 text-[#C9A84C] animate-bounce" />
            ) : (
              <Bell className="w-4 h-4 text-[#C9A84C]" />
            )}
            {totalPending > 0 && (
              <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0F1B2D]">
                {totalPending}
              </span>
            )}
          </div>

          <div className="text-xs flex items-center gap-2">
            <span className="font-semibold text-[#C9A84C] tracking-wide">Ajanda:</span>
            <span className="text-slate-200">
              Bugün <span className="font-bold text-white">({todayEvents.length})</span> • Yarın{' '}
              <span className="font-bold text-white">({tomorrowEvents.length})</span>
            </span>
          </div>
        </button>
      )}

      {/* Expanded Popup Card */}
      {isExpanded && (
        <div className="w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 bg-[#0F1B2D] text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#C9A84C]/20 border border-[#C9A84C]/30 text-[#C9A84C]">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-[#C9A84C] font-serif">
                  Ajanda &amp; Hatırlatıcı
                </h3>
                <p className="text-[11px] text-slate-400">Duruşma ve Süreli İşler</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Küçült"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segment / Tabs: Bugün vs Yarın */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Bugün</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  pendingTodayCount > 0
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {todayEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tomorrow')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'tomorrow'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Yarın</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  pendingTomorrowCount > 0
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tomorrowEvents.length}
              </span>
            </button>
          </div>

          {/* Date Label Banner */}
          <div className="px-5 py-2 bg-slate-100/60 border-b border-slate-100 text-[11px] font-medium text-slate-500 flex items-center justify-between">
            <span>{activeTab === 'today' ? todayFormatted : tomorrowFormatted}</span>
            <span className="text-[10px] text-slate-400">
              {activeEvents.filter((e) => e.status === 'TAMAMLANDI').length} / {activeEvents.length}{' '}
              Tamamlandı
            </span>
          </div>

          {/* Event Items List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-2">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Yükleniyor...</div>
            ) : activeEvents.length === 0 ? (
              <div className="py-8 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {activeTab === 'today' ? 'Bugün için bekleyen iş yok' : 'Yarın için bekleyen iş yok'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Planlanmış bir duruşma veya süreli iş bulunmuyor.
                </p>
              </div>
            ) : (
              activeEvents.map((ev) => {
                const isDone = ev.status === 'TAMAMLANDI'
                return (
                  <div
                    key={ev.id}
                    onClick={handleOpenCalendar}
                    className={`p-3 rounded-xl transition-all hover:bg-slate-50 cursor-pointer group flex items-start gap-3 ${
                      isDone ? 'opacity-60 bg-slate-50/50' : 'bg-white'
                    }`}
                  >
                    {/* Complete / Checkbox Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStatus(e, ev)}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer flex-shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-[#C9A84C] text-transparent hover:text-slate-300 bg-white'
                      }`}
                      title={isDone ? 'Bekliyor olarak işaretle' : 'Tamamlandı olarak işaretle'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {renderEventTypeBadge(ev.event_type)}
                        {ev.start_time ? (
                          <span className="text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {ev.start_time}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Tüm Gün</span>
                        )}
                      </div>

                      <h4
                        className={`text-xs font-bold leading-snug truncate ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                        title={ev.title}
                      >
                        {ev.title}
                      </h4>

                      {(ev.court || ev.file_no) && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
                          {ev.court} {ev.file_no && `• ${ev.file_no}`}
                        </p>
                      )}

                      {ev.client_name && (
                        <p className="text-[10px] text-[#C9A84C] font-semibold mt-0.5 truncate">
                          Müvekkil: {ev.client_name}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 flex-shrink-0 mt-1 transition-colors" />
                  </div>
                )
              })
            )}
          </div>

          {/* Footer with Quick Navigation to Calendar */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-medium">
              Toplam {todayEvents.length + tomorrowEvents.length} yaklaşan iş
            </span>

            <button
              type="button"
              onClick={handleOpenCalendar}
              className="flex items-center gap-1.5 font-bold text-[#0F1B2D] hover:text-[#C9A84C] transition-colors cursor-pointer"
            >
              <span>Takvimde Gör</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CornerReminder
