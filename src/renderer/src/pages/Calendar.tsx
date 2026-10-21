import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  UploadCloud,
  Clock,
  MapPin,
  Scale,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  CalendarDays,
  FileText,
  Filter,
  Check,
  X,
  FileUp,
  Clipboard,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import { CalendarEvent, CalendarEventType, CalendarImportResult, Client, Case } from '../types'

// Safe local date formatting helper (prevents timezone offset bugs)
export const formatYmd = (y: number, m: number, d: number): string => {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

export const getTodayYmd = (): string => {
  const now = new Date()
  return formatYmd(now.getFullYear(), now.getMonth(), now.getDate())
}

// Detect duplicates by business key (date + file_no OR date + time + court/title)
// Always prioritizes keeping manual office entries (is_ics_import === 0)
export const findDuplicateEventIds = (list: CalendarEvent[]): number[] => {
  const idsToDelete: number[] = []
  const seen = new Map<string, number>()

  // Sort: manual events (is_ics_import === 0) first, then earlier IDs
  const sorted = [...list].sort((a, b) => {
    const aImport = a.is_ics_import ? 1 : 0
    const bImport = b.is_ics_import ? 1 : 0
    if (aImport !== bImport) {
      return aImport - bImport // 0 comes before 1
    }
    return a.id - b.id
  })

  for (const ev of sorted) {
    const keys: string[] = []
    if (ev.file_no && ev.start_date) {
      keys.push(`file:${ev.start_date}:${ev.file_no.trim().toLowerCase()}`)
    }
    if (ev.start_date && ev.start_time && ev.court) {
      keys.push(`court:${ev.start_date}:${ev.start_time.trim()}:${ev.court.trim().toLowerCase()}`)
    }
    if (ev.start_date && ev.start_time && ev.title) {
      keys.push(`title:${ev.start_date}:${ev.start_time.trim()}:${ev.title.trim().toLowerCase()}`)
    }

    if (keys.length === 0) continue

    let isDuplicate = false
    for (const k of keys) {
      if (seen.has(k)) {
        isDuplicate = true
        break
      }
    }

    if (isDuplicate) {
      idsToDelete.push(ev.id)
    } else {
      for (const k of keys) {
        seen.set(k, ev.id)
      }
    }
  }
  return idsToDelete
}

export const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Current calendar view date
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar')

  // Status / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  // Import Modal & Drag/Drop states
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false)
  const [importTab, setImportTab] = useState<'file' | 'paste' | 'guide'>('file')
  const [pastedText, setPastedText] = useState<string>('')
  const [importLoading, setImportLoading] = useState<boolean>(false)
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Event Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Selected Day Detail Modal
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: CalendarEvent[] } | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'DURUSMA' as CalendarEventType,
    start_date: getTodayYmd(),
    start_time: '09:30',
    end_date: '',
    end_time: '',
    court: '',
    file_no: '',
    location: '',
    client_id: '',
    case_id: '',
    description: '',
    status: 'BEKLIYOR' as 'BEKLIYOR' | 'TAMAMLANDI' | 'IPTAL'
  })

  // Manual Deduplication Trigger
  const handleManualDeduplicate = async (): Promise<void> => {
    try {
      setToastMessage(null)
      let cleanedCount = 0

      // 1. Try backend deduplicate IPC if available
      try {
        if (window.api.calendar.deduplicate) {
          cleanedCount = await window.api.calendar.deduplicate()
        }
      } catch (ipcErr) {
        console.warn('Backend deduplicate not ready in running process, using direct fallback:', ipcErr)
      }

      // 2. Direct client-side deduplication fallback (works 100% in running process)
      const allEvents = await window.api.calendar.getAll()
      const dupIds = findDuplicateEventIds(allEvents || [])
      if (dupIds.length > 0) {
        for (const id of dupIds) {
          await window.api.calendar.delete(id)
        }
        cleanedCount += dupIds.length
      }

      if (cleanedCount > 0) {
        setToastMessage(`✓ ${cleanedCount} adet mükerrer duruşma kaydı başarıyla temizlendi!`)
        setToastType('success')
        await loadData()
      } else {
        setToastMessage('Takviminizde mükerrer (çift) duruşma kaydı bulunmuyor. Takviminiz tamamen temiz!')
        setToastType('success')
      }
    } catch (err: any) {
      console.error('Deduplicate error:', err)
      setToastMessage('Mükerrer kontrolü sırasında hata: ' + (err?.message || ''))
      setToastType('error')
    }
  }

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      let rawEvents = await window.api.calendar.getAll()

      // Automatically clean up any existing duplicate entries on load
      const dupIds = findDuplicateEventIds(rawEvents || [])
      if (dupIds.length > 0) {
        for (const id of dupIds) {
          try {
            await window.api.calendar.delete(id)
          } catch {}
        }
        rawEvents = (rawEvents || []).filter((e) => !dupIds.includes(e.id))
      }

      const [allClients, allCases] = await Promise.all([
        window.api.clients.getAll(),
        window.api.cases.getAll()
      ])
      setEvents(rawEvents || [])
      setClients(allClients || [])
      setCases(allCases || [])
    } catch (err: any) {
      console.error('Error loading calendar events:', err)
      setToastMessage('Takvim verileri yüklenirken hata oluştu: ' + (err?.message || ''))
      setToastType('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Navigation handlers
  const handlePrevMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleToday = (): void => {
    setCurrentDate(new Date())
  }

  // Process import result and give clear feedback
  const handleImportResult = (res: CalendarImportResult, sourceName: string): void => {
    if (res && res.success && (res.importedCount || 0) > 0) {
      const created = res.createdCount || 0
      const updated = res.updatedCount || 0
      const detailStr = created > 0 && updated > 0
        ? ` (${created} yeni eklendi, ${updated} güncellendi)`
        : created > 0
        ? ` (${created} yeni duruşma/etkinlik)`
        : ` (${updated} duruşma/etkinlik güncellendi)`

      setToastMessage(
        `✓ ${sourceName} dosyasından ${res.importedCount} duruşma ve takvim kaydı başarıyla aktarıldı!${detailStr}`
      )
      setToastType('success')
      setIsImportModalOpen(false)
      setPastedText('')

      // If earliest imported date exists, automatically jump to its month!
      if (res.earliestDate) {
        const [ey, em] = res.earliestDate.split('-').map(Number)
        if (ey && em) {
          setCurrentDate(new Date(ey, em - 1, 1))
        }
      }

      loadData()
    } else if (res && res.canceled) {
      // User cancelled file selection dialog, do not show error
    } else if (res?.errors && res.errors.length > 0) {
      setToastMessage(`Takvim aktarılamadı: ${res.errors.join(', ')}`)
      setToastType('error')
    } else {
      setToastMessage('Dosyada veya metinde geçerli bir duruşma/takvim kaydı bulunamadı. Lütfen .ics formatında veya UYAP duruşma listesi olduğundan emin olun.')
      setToastType('error')
    }
  }

  // Native File Picker or Fallback to HTML input
  const handleNativeSelectIcs = async (): Promise<void> => {
    try {
      setImportLoading(true)
      const res = await window.api.calendar.selectAndImportIcs()
      if (res && res.success) {
        const fileName = res.filePath?.split(/[\\/]/).pop() || 'UYAP/Mac Takvim'
        handleImportResult(res, fileName)
        return
      }
      if (res && res.canceled) {
        return
      }
      // If native dialog returned an error, trigger the browser input fallback
      if (res?.errors && res.errors.length > 0) {
        fileInputRef.current?.click()
      }
    } catch (err: any) {
      console.warn('Native dialog failed, trying file input:', err)
      fileInputRef.current?.click()
    } finally {
      setImportLoading(false)
    }
  }

  // Handle standard HTML file input change (fallback & alternative)
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImportLoading(true)
      const text = await file.text()
      const res = await window.api.calendar.importIcsContent(text)
      handleImportResult(res, file.name)
    } catch (err: any) {
      console.error('File read error:', err)
      setToastMessage('Dosya okunurken hata oluştu: ' + (err?.message || ''))
      setToastType('error')
    } finally {
      setImportLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  // Handle Pasted Text Import
  const handlePasteImport = async (): Promise<void> => {
    if (!pastedText.trim()) {
      alert('Lütfen UYAP veya .ics takvim metnini yapıştırın.')
      return
    }

    try {
      setImportLoading(true)
      const res = await window.api.calendar.importIcsContent(pastedText)
      handleImportResult(res, 'Yapıştırılan Metin')
    } catch (err: any) {
      console.error('Paste import error:', err)
      setToastMessage('Metin işlenirken hata oluştu: ' + (err?.message || ''))
      setToastType('error')
    } finally {
      setImportLoading(false)
    }
  }

  // Drag and Drop handlers for entire page and dropzone
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDraggingFile) {
      setIsDraggingFile(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    // Only turn off if leaving window bounds
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDraggingFile(false)
  }

  const handleDrop = async (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      try {
        setImportLoading(true)
        const text = await file.text()
        const res = await window.api.calendar.importIcsContent(text)
        handleImportResult(res, file.name)
      } catch (err: any) {
        console.error('Drop import error:', err)
        setToastMessage('Sürüklenen dosya işlenirken hata oluştu: ' + (err?.message || ''))
        setToastType('error')
      } finally {
        setImportLoading(false)
      }
    }
  }

  // Open Modal for Add
  const handleOpenAdd = (defaultDate?: string): void => {
    setEditingEvent(null)
    setFormData({
      title: '',
      event_type: 'DURUSMA',
      start_date: defaultDate || new Date().toISOString().split('T')[0],
      start_time: '09:30',
      end_date: '',
      end_time: '',
      court: '',
      file_no: '',
      location: '',
      client_id: '',
      case_id: '',
      description: '',
      status: 'BEKLIYOR'
    })
    setModalError(null)
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEdit = (ev: CalendarEvent): void => {
    setEditingEvent(ev)
    setFormData({
      title: ev.title,
      event_type: ev.event_type,
      start_date: ev.start_date,
      start_time: ev.start_time || '',
      end_date: ev.end_date || '',
      end_time: ev.end_time || '',
      court: ev.court || '',
      file_no: ev.file_no || '',
      location: ev.location || '',
      client_id: ev.client_id ? String(ev.client_id) : '',
      case_id: ev.case_id ? String(ev.case_id) : '',
      description: ev.description || '',
      status: ev.status
    })
    setModalError(null)
    setIsModalOpen(true)
  }

  // Save Event
  const handleSaveEvent = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.start_date) {
      setModalError('Lütfen başlık ve başlangıç tarihini girin.')
      return
    }

    try {
      setSubmitting(true)
      setModalError(null)

      const payload = {
        title: formData.title.trim(),
        event_type: formData.event_type,
        start_date: formData.start_date,
        start_time: formData.start_time || null,
        end_date: formData.end_date || null,
        end_time: formData.end_time || null,
        court: formData.court.trim() || null,
        file_no: formData.file_no.trim() || null,
        location: formData.location.trim() || null,
        client_id: formData.client_id ? Number(formData.client_id) : null,
        case_id: formData.case_id ? Number(formData.case_id) : null,
        description: formData.description.trim() || null,
        status: formData.status,
        is_ics_import: editingEvent ? editingEvent.is_ics_import : 0
      }

      if (editingEvent) {
        await window.api.calendar.update(editingEvent.id, payload)
        setToastMessage('Duruşma / Etkinlik başarıyla güncellendi.')
      } else {
        await window.api.calendar.create(payload)
        setToastMessage('Yeni duruşma / etkinlik takvime eklendi.')
      }
      setToastType('success')
      setIsModalOpen(false)
      if (selectedDayEvents) {
        setSelectedDayEvents(null)
      }
      await loadData()
    } catch (err: any) {
      console.error('Save event error:', err)
      setModalError(err?.message || 'Kayıt sırasında hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Event
  const handleDeleteEvent = async (id: number): Promise<void> => {
    if (!confirm('Bu duruşma / takvim kaydını silmek istediğinize emin misiniz?')) return
    try {
      await window.api.calendar.delete(id)
      setToastMessage('Kayıt silindi.')
      setToastType('success')
      if (selectedDayEvents) {
        setSelectedDayEvents((prev) =>
          prev ? { ...prev, events: prev.events.filter((e) => e.id !== id) } : null
        )
      }
      await loadData()
    } catch (err: any) {
      console.error('Delete event error:', err)
      alert(err?.message || 'Silinemedi.')
    }
  }

  // Toggle Complete Status
  const handleToggleStatus = async (ev: CalendarEvent): Promise<void> => {
    try {
      const nextStatus = ev.status === 'TAMAMLANDI' ? 'BEKLIYOR' : 'TAMAMLANDI'
      await window.api.calendar.update(ev.id, { status: nextStatus })
      await loadData()
    } catch (err: any) {
      console.error('Toggle status error:', err)
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'ALL') return events
    return events.filter((e) => e.event_type === selectedFilter)
  }, [events, selectedFilter])

  // Calendar Grid Calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthName = currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  // Days calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    let startDayOfWeek = firstDayOfMonth.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const totalDays = lastDayOfMonth.getDate()

    const days: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isToday: boolean
      events: CalendarEvent[]
    }> = []

    const todayStr = getTodayYmd()

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    const prevMonthYear = month === 0 ? year - 1 : year
    const prevMonthIdx = month === 0 ? 11 : month - 1
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i
      const dateStr = formatYmd(prevMonthYear, prevMonthIdx, d)
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        events: filteredEvents.filter((e) => e.start_date === dateStr)
      })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatYmd(year, month, d)
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: filteredEvents.filter((e) => e.start_date === dateStr)
      })
    }

    // Next month padding to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7
    const nextMonthYear = month === 11 ? year + 1 : year
    const nextMonthIdx = month === 11 ? 0 : month + 1
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatYmd(nextMonthYear, nextMonthIdx, d)
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        events: filteredEvents.filter((e) => e.start_date === dateStr)
      })
    }

    return days
  }, [year, month, filteredEvents])

  // Upcoming Events (Today and Future, sorted)
  const upcomingEvents = useMemo(() => {
    const todayStr = getTodayYmd()
    return [...filteredEvents]
      .filter((e) => e.start_date >= todayStr && e.status !== 'IPTAL')
      .sort((a, b) => {
        if (a.start_date === b.start_date) {
          return (a.start_time || '').localeCompare(b.start_time || '')
        }
        return a.start_date.localeCompare(b.start_date)
      })
      .slice(0, 10)
  }, [filteredEvents])

  const getEventTypeStyle = (type: CalendarEventType): { bg: string; text: string; border: string; label: string } => {
    switch (type) {
      case 'DURUSMA':
        return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: 'Duruşma' }
      case 'SURELI_IS':
        return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Süreli İş' }
      case 'KESIF':
        return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', label: 'Keşif' }
      case 'TOPLANTI':
        return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'Toplantı' }
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Diğer' }
    }
  }

  return (
    <div
      className="space-y-6 max-w-7xl relative min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden fallback file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,.ical,text/calendar,*/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Full Window Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 bg-[#0F1B2D]/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center border-4 border-dashed border-[#C9A84C] m-4 rounded-3xl pointer-events-none animate-in fade-in duration-200">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#C9A84C] to-amber-600 flex items-center justify-center mb-6 shadow-2xl">
            <UploadCloud className="w-12 h-12 text-[#0F1B2D]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">UYAP / Mac Takvim Dosyasını Buraya Bırakın</h2>
          <p className="text-slate-300 text-sm max-w-md">
            İndirdiğiniz <strong>.ics</strong> dosyasını bıraktığınızda duruşmalarınız ve takvim etkinlikleriniz anında LexLedger'a aktarılacaktır.
          </p>
        </div>
      )}

      {/* Header with UYAP Import and Add Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Header
          title="Takvim &amp; Duruşma Ajandası"
          subtitle="Duruşmalar, yasal süreler ve UYAP / Mac takvim entegrasyonu"
        />

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualDeduplicate}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            title="Aynı gün ve saatteki mükerrer duruşma kayıtlarını birleştirir ve temizler"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mükerrerleri Temizle</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-amber-600/15 hover:from-amber-500/20 hover:to-amber-600/25 text-amber-950 border border-amber-300/80 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="UYAP veya Mac Takviminden duruşmaları aktarın"
          >
            <UploadCloud className="w-4 h-4 text-[#C9A84C]" />
            <span>Takvimi İçe Aktar (.ics / UYAP)</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9A84C]" />
            <span>Yeni Duruşma / İş Ekle</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all shadow-sm ${
            toastType === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty State Banner if no events exist yet */}
      {events.length === 0 && !loading && (
        <div className="p-6 bg-gradient-to-r from-[#0F1B2D] via-slate-900 to-[#162740] rounded-2xl border border-slate-800 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A84C] to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <CalendarIcon className="w-6 h-6 text-[#0F1B2D]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Duruşmalarınızı ve Süreli İşlerinizi Hemen Yükleyin</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                UYAP Avukat Portalından veya Mac Takvim uygulamanızdan indirdiğiniz <strong>.ics</strong> dosyasını tek tıkla aktarabilirsiniz.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 bg-[#C9A84C] hover:bg-amber-500 text-[#0F1B2D] font-bold rounded-xl text-xs transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer shadow-md hover:shadow-lg"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Takvimi İçe Aktar</span>
          </button>
        </div>
      )}

      {/* Controls Bar: Navigation, Filter & View Mode */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-md text-slate-700 transition-colors"
              title="Önceki Ay"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold hover:bg-white rounded-md text-slate-700 transition-colors"
            >
              Bugün
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-md text-slate-700 transition-colors"
              title="Sonraki Ay"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-slate-900 capitalize tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#C9A84C]" />
            {monthName}
          </h3>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({events.length})
            </button>
            <button
              onClick={() => setSelectedFilter('DURUSMA')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedFilter === 'DURUSMA'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Duruşmalar
            </button>
            <button
              onClick={() => setSelectedFilter('SURELI_IS')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedFilter === 'SURELI_IS'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Süreli İşler
            </button>
            <button
              onClick={() => setSelectedFilter('KESIF')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedFilter === 'KESIF'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Keşifler
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#0F1B2D] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ay Görünümü
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-white text-[#0F1B2D] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ajanda / Liste
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar View vs Agenda View */}
      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 7-Days Calendar Grid (3 Columns) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center py-2.5 text-xs font-bold text-slate-600">
              <div>Pzt</div>
              <div>Sal</div>
              <div>Çar</div>
              <div>Per</div>
              <div>Cum</div>
              <div className="text-amber-800">Cmt</div>
              <div className="text-rose-800">Paz</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100">
              {calendarDays.map((day, idx) => {
                const hasEvents = day.events.length > 0
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasEvents) {
                        setSelectedDayEvents({ date: day.dateStr, events: day.events })
                      } else {
                        handleOpenAdd(day.dateStr)
                      }
                    }}
                    className={`min-h-[105px] p-2 bg-white transition-colors cursor-pointer group hover:bg-amber-50/20 relative ${
                      !day.isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {/* Day Number and Badges */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          day.isToday
                            ? 'bg-[#0F1B2D] text-white shadow-xs'
                            : day.isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {day.dayNum}
                      </span>

                      {hasEvents && (
                        <span className="text-[10px] font-bold text-[#C9A84C] bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200/60">
                          {day.events.length}
                        </span>
                      )}
                    </div>

                    {/* Events Mini Pills */}
                    <div className="space-y-1">
                      {day.events.slice(0, 3).map((ev) => {
                        const style = getEventTypeStyle(ev.event_type)
                        const isDone = ev.status === 'TAMAMLANDI'
                        return (
                          <div
                            key={ev.id}
                            title={`${ev.start_time ? ev.start_time + ' - ' : ''}${ev.title}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] truncate font-medium border flex items-center gap-1 ${
                              style.bg
                            } ${style.border} ${isDone ? 'opacity-50 line-through' : style.text}`}
                          >
                            {ev.start_time && (
                              <span className="font-mono font-bold">{ev.start_time}</span>
                            )}
                            <span className="truncate">{ev.title}</span>
                          </div>
                        )
                      })}

                      {day.events.length > 3 && (
                        <div className="text-[10px] font-semibold text-slate-500 pl-1">
                          +{day.events.length - 3} daha...
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Sidebar: Upcoming Deadlines & Hearings */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#C9A84C]" />
                  Yaklaşan Duruşmalar &amp; Süreler
                </h4>
                <span className="text-[11px] text-slate-400">{upcomingEvents.length} Kayıt</span>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Önümüzdeki günlerde planlanmış bir duruşma veya süreli iş bulunmuyor.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
                  {upcomingEvents.map((ev) => {
                    const style = getEventTypeStyle(ev.event_type)
                    const isDone = ev.status === 'TAMAMLANDI'

                    return (
                      <div
                        key={ev.id}
                        className="py-3 group flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${style.bg} ${style.text} ${style.border}`}
                            >
                              {style.label}
                            </span>
                            {ev.is_ics_import ? (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                UYAP
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                Ofis
                              </span>
                            )}
                            <span className="font-bold text-slate-800 font-mono">
                              {new Date(ev.start_date).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short'
                              })}
                              {ev.start_time && ` • ${ev.start_time}`}
                            </span>
                          </div>

                          <h5
                            className={`font-semibold text-slate-900 truncate ${
                              isDone ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {ev.title}
                          </h5>

                          {(ev.court || ev.file_no) && (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <Scale className="w-3 h-3 text-[#C9A84C] flex-shrink-0" />
                              <span>{ev.court} {ev.file_no && `(${ev.file_no})`}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(ev)}
                            title={isDone ? 'Tamamlanmadı yap' : 'Tamamlandı işaretle'}
                            className={`p-1 rounded transition-colors ${
                              isDone
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-300 hover:text-emerald-600 hover:bg-slate-100'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(ev)}
                            title="Düzenle"
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            title="Sil"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick UYAP Tip Card */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <Scale className="w-4 h-4 text-[#C9A84C]" />
                UYAP Takvimi Nasıl İndirilir?
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                UYAP Avukat Portalına e-imza ile giriş yapıp <strong>Duruşma / Takvim</strong> menüsünden 
                <strong> "Dışa Aktar / iCal (.ics)"</strong> seçeneğiyle indirdiğiniz dosyayı buraya 
                yüklediğinizde tüm duruşmalarınız anında listelenir.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda / List View */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Tüm Duruşma &amp; Süreli İş Kayıtları</h4>
            <span className="text-xs text-slate-500">{filteredEvents.length} Toplam Kayıt</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              Henüz takvimde kayıtlı bir etkinlik bulunmuyor.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEvents.map((ev) => {
                const style = getEventTypeStyle(ev.event_type)
                const isDone = ev.status === 'TAMAMLANDI'

                return (
                  <div
                    key={ev.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 items-start flex-shrink-0">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded border uppercase ${style.bg} ${style.text} ${style.border}`}
                        >
                          {style.label}
                        </span>
                        {ev.is_ics_import ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            UYAP
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            Ofis Kaydı
                          </span>
                        )}
                      </div>

                      <div>
                        <h4
                          className={`text-sm font-bold text-slate-900 ${
                            isDone ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {ev.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(ev.start_date).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                            {ev.start_time && ` - ${ev.start_time}`}
                          </span>

                          {(ev.court || ev.file_no) && (
                            <span className="flex items-center gap-1">
                              <Scale className="w-3.5 h-3.5 text-[#C9A84C]" />
                              {ev.court} {ev.file_no && `(${ev.file_no})`}
                            </span>
                          )}

                          {ev.client_name && (
                            <span className="text-slate-600 font-medium">
                              Müvekkil: {ev.client_name}
                            </span>
                          )}
                        </div>

                        {ev.description && (
                          <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-100 max-w-2xl">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleToggleStatus(ev)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Tamamlandı' : 'Tamamla'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(ev)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT CALENDAR EVENT */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingEvent ? 'Duruşma / İş Kaydını Düzenle' : 'Yeni Duruşma & Süreli İş Ekle'}
        size="md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Duruşma / İş Başlığı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: İstanbul 4. Asliye Ticaret Mahkemesi Duruşması"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Etkinlik Türü</label>
              <select
                value={formData.event_type}
                onChange={(e) =>
                  setFormData({ ...formData, event_type: e.target.value as CalendarEventType })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="DURUSMA">Duruşma</option>
                <option value="SURELI_IS">Süreli İş (Cevap/Beyan/İtiraz)</option>
                <option value="KESIF">Keşif</option>
                <option value="TOPLANTI">Müvekkil Görüşmesi / Toplantı</option>
                <option value="DIGER">Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'BEKLIYOR' | 'TAMAMLANDI' | 'IPTAL' })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="BEKLIYOR">Bekliyor (Aktif)</option>
                <option value="TAMAMLANDI">Tamamlandı</option>
                <option value="IPTAL">İptal Edildi</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarih <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Saat</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mahkeme / Kurum</label>
              <input
                type="text"
                placeholder="Örn: İst. 4. Asliye Ticaret"
                value={formData.court}
                onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Esas / Dosya No</label>
              <input
                type="text"
                placeholder="Örn: 2026/124 E."
                value={formData.file_no}
                onChange={(e) => setFormData({ ...formData, file_no: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İlişkili Müvekkil</label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="">-- Seçilmedi --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İlişkili Dava</label>
              <select
                value={formData.case_id}
                onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="">-- Seçilmedi --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.file_no || 'Dosya No Yok'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar / Açıklama</label>
            <textarea
              rows={2}
              placeholder="Tanık dinlenecek, bilirkişi raporuna itiraz edilecek vb..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              {submitting ? 'Kaydediliyor...' : editingEvent ? 'Güncelle' : 'Takvime Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: DAY DETAILS MODAL (When clicking a day in calendar) */}
      {selectedDayEvents && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDayEvents(null)}
          title={`${new Date(selectedDayEvents.date).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })} Günü Etkinlikleri`}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {selectedDayEvents.events.length} Duruşma &amp; İş Kaydı
              </span>
              <button
                onClick={() => {
                  const d = selectedDayEvents.date
                  setSelectedDayEvents(null)
                  handleOpenAdd(d)
                }}
                className="text-xs text-[#C9A84C] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bu Güne Yeni Ekle</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {selectedDayEvents.events.map((ev) => {
                const style = getEventTypeStyle(ev.event_type)
                const isDone = ev.status === 'TAMAMLANDI'

                return (
                  <div key={ev.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${style.bg} ${style.text} ${style.border}`}
                        >
                          {style.label}
                        </span>
                        {ev.is_ics_import ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            UYAP
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            Ofis Kaydı
                          </span>
                        )}
                        {ev.start_time && (
                          <span className="font-bold font-mono text-slate-800">{ev.start_time}</span>
                        )}
                      </div>
                      <h5
                        className={`font-semibold text-slate-900 ${
                          isDone ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {ev.title}
                      </h5>
                      {(ev.court || ev.file_no) && (
                        <p className="text-[11px] text-slate-500">
                          {ev.court} {ev.file_no && `(${ev.file_no})`}
                        </p>
                      )}
                      {ev.description && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(ev)}
                        title={isDone ? 'Tamamlanmadı yap' : 'Tamamlandı işaretle'}
                        className={`p-1.5 rounded transition-colors ${
                          isDone
                            ? 'text-emerald-600 bg-emerald-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDayEvents(null)
                          handleOpenEdit(ev)
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Calendar Import Center Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => {
            if (!importLoading) {
              setIsImportModalOpen(false)
              setPastedText('')
            }
          }}
          title="UYAP & Mac Takvim İçe Aktarma Merkezi"
        >
          <div className="space-y-4">
            {/* Safety Guarantee Callout */}
            <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl text-emerald-950 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">Mevcut ve Elle Eklenen Kayıtlarınız Asla Silinmez</p>
                <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                  Aralık, Ocak veya sonraki ayların yeni UYAP takvimlerini yüklediğinizde; elle girdiğiniz hiçbir duruşma, toplantı veya iş silinmez veya üzerine yazılmaz. Yeni aylar takviminize kümülatif olarak ilave edilir.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setImportTab('file')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  importTab === 'file'
                    ? 'border-[#C9A84C] text-[#0F1B2D]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Dosya Yükle (.ics)</span>
              </button>

              <button
                type="button"
                onClick={() => setImportTab('paste')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  importTab === 'paste'
                    ? 'border-[#C9A84C] text-[#0F1B2D]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Metin Yapıştır (Hızlı)</span>
              </button>

              <button
                type="button"
                onClick={() => setImportTab('guide')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  importTab === 'guide'
                    ? 'border-[#C9A84C] text-[#0F1B2D]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Nasıl Yapılır? (Rehber)</span>
              </button>
            </div>

            {/* Tab 1: File Upload & Drop */}
            {importTab === 'file' && (
              <div className="space-y-4 pt-1">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={handleDrop}
                  onClick={handleNativeSelectIcs}
                  className="border-2 border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50/80 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#0F1B2D] text-[#C9A84C] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      .ics Dosyasını Buraya Sürükleyip Bırakın
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      veya bilgisayarınızdan dosya seçmek için tıklayın
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-[11px] font-medium shadow-sm">
                    <Sparkles className="w-3 h-3 text-[#C9A84C]" />
                    <span>UYAP Portal & Apple Mac Takvim Desteklenir</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Alternatif dosya seçiciyi aç
                  </button>

                  <button
                    type="button"
                    disabled={importLoading}
                    onClick={handleNativeSelectIcs}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileUp className="w-4 h-4 text-[#C9A84C]" />
                    <span>{importLoading ? 'İşleniyor...' : 'Takvim Dosyası Seç (.ics)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Paste Text */}
            {importTab === 'paste' && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-600">
                  UYAP ekranından kopyaladığınız duruşma listesini veya bir <code>.ics</code> dosyasının metin içeriğini doğrudan buraya yapıştırabilirsiniz:
                </p>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="BEGIN:VCALENDAR... veya UYAP duruşma listesi metnini buraya yapıştırın"
                  rows={8}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent resize-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPastedText('')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Temizle
                  </button>
                  <button
                    type="button"
                    disabled={importLoading || !pastedText.trim()}
                    onClick={handlePasteImport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-[#C9A84C]" />
                    <span>{importLoading ? 'Çözümleniyor...' : 'İçeriği Çözümle ve Takvime Ekle'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Step-by-Step Guide */}
            {importTab === 'guide' && (
              <div className="space-y-4 pt-1 text-xs text-slate-700">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-[#0F1B2D] text-[#C9A84C] flex items-center justify-center text-[10px]">1</span>
                    <span>Mac Takvim (Apple Calendar) Uygulamasından Dışa Aktarma:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
                    <li>Mac'inizdeki dahili <strong>Takvim (Calendar)</strong> uygulamasını açın.</li>
                    <li>Sol menüde duruşmalarınızın kayıtlı olduğu takvimi seçin.</li>
                    <li>Ekranın üst menü çubuğundan <strong>Dosya &gt; Dışa Aktar &gt; Dışa Aktar...</strong> yolunu izleyin.</li>
                    <li>Kaydedilen <strong>.ics</strong> dosyasını buraya sürükleyin veya "Dosya Seç" ile yükleyin.</li>
                  </ol>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-[#0F1B2D] text-[#C9A84C] flex items-center justify-center text-[10px]">2</span>
                    <span>UYAP Avukat Portalından Takvim Alma:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
                    <li>UYAP Avukat Portalına e-İmza ile giriş yapın.</li>
                    <li><strong>Duruşma / Keşif Sorgulama</strong> veya Ajanda ekranına gelin.</li>
                    <li>Takvim dışa aktar butonu veya tarayıcı eklentiniz ile <strong>.ics</strong> formatında takviminizi indirin.</li>
                    <li>İndirdiğiniz dosyayı buraya yüklediğinizde tüm mahkeme, esas no, tarih ve saatler otomatik eşleşir.</li>
                  </ol>
                </div>

                <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Elle Eklenen Kayıtlar & Yeni Ay Takvimleri:</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Aralık, Ocak veya diğer ayların yeni takvimlerini yüklediğinizde, eski aylar veya <strong>elle girdiğiniz hiçbir kayıt silinmez</strong>. Sistem yalnızca UYAP'tan gelen kayıtları akıllı olarak eşleştirir, yeni duruşmaları takviminize ilave eder.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setImportTab('file')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0F1B2D] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span>Dosya Yüklemeye Geç</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9A84C]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Calendar
