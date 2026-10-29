import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Scale,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  FileText,
  ShieldCheck,
  Clipboard,
  RotateCcw,
  Building,
  Briefcase,
  Coins,
  ArrowRight
} from 'lucide-react'
import Modal from '../ui/Modal'
import { Client, Case } from '../../types'
import {
  parseCourtMinute,
  ExtractedActionItem,
  MinuteParseResult
} from '../../utils/minuteParser'

interface MinuteRadarModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  cases: Case[]
  onAddEvents: (events: Array<{
    title: string
    event_type: 'DURUSMA' | 'SURELI_IS'
    start_date: string
    start_time: string
    court: string
    file_no: string
    description: string
    client_id: number | null
    case_id: number | null
    status: 'BEKLIYOR'
    is_ics_import: 0
  }>) => Promise<void>
}

const SAMPLE_MINUTE_TEXT = `T.C. ANKARA 4. ASLİYE TİCARET MAHKEMESİ
ESAS NO : 2024/245 Esas
CELSE NO : 3
Celse Tarihi: 15/10/2026

DURUŞMA TUTANAĞI

Katılanlar: Davacı vekili Av. Mehmet, Davalı vekili Av. Ayşe geldiler. Açık duruşmaya devam olundu.
Davacı vekili: Bilirkişi raporundaki aleyhe hususları kabul etmiyoruz, itirazlarımızı sunmak üzere süre talep ediyoruz dedi.
Davalı vekili: Rapor doğrultusunda davanın reddini talep ederiz dedi.

GEREĞİ DÜŞÜNÜLDÜ :
1- Davacı vekiline bilirkişi raporuna karşı beyan ve itirazlarını bildirmek üzere iki haftalık kesin süre verilmesine,
2- Davalı vekiline ek delillerini sunmak ve tanık isimlerini bildirmek üzere 10 günlük süre tanınmasına,
3- Kusur tespitine ilişkin dosyanın yeni bir bilirkişi heyetine tevdii için 4.500,00 TL bilirkişi ücretinin davacı tarafça iki haftalık kesin süre içinde mahkeme veznesine depo edilmesine,
4- Bir sonraki duruşmanın 18/02/2027 günü saat 10:45'e bırakılmasına karar verildi.`

export const MinuteRadarModal: React.FC<MinuteRadarModalProps> = ({
  isOpen,
  onClose,
  clients,
  cases,
  onAddEvents
}) => {
  const [rawText, setRawText] = useState<string>('')
  const [isAnalyzed, setIsAnalyzed] = useState<boolean>(false)
  const [court, setCourt] = useState<string>('')
  const [fileNo, setFileNo] = useState<string>('')
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [items, setItems] = useState<ExtractedActionItem[]>([])
  const [applyAdliTatil, setApplyAdliTatil] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRawText('')
      setIsAnalyzed(false)
      setCourt('')
      setFileNo('')
      setSelectedCaseId('')
      setSelectedClientId('')
      setItems([])
      setErrorMessage(null)
    }
  }, [isOpen])

  // When selectedCaseId changes, auto-fill client and court/file_no
  const handleCaseChange = (caseIdStr: string): void => {
    setSelectedCaseId(caseIdStr)
    if (!caseIdStr) return
    const foundCase = cases.find((c) => String(c.id) === caseIdStr)
    if (foundCase) {
      setSelectedClientId(String(foundCase.client_id))
      if (!court && foundCase.court) setCourt(foundCase.court)
      if (!fileNo && foundCase.case_number) setFileNo(foundCase.case_number)
    }
  }

  // Paste from clipboard
  const handlePasteFromClipboard = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setRawText(text)
        setErrorMessage(null)
      }
    } catch {
      setErrorMessage('Panodan okuma izni alınamadı. Lütfen metni el ile yapıştırın.')
    }
  }

  // Load sample minute
  const handleLoadSample = (): void => {
    setRawText(SAMPLE_MINUTE_TEXT)
    setErrorMessage(null)
  }

  // Perform Analysis
  const handleAnalyze = (): void => {
    if (!rawText.trim()) {
      setErrorMessage('Lütfen önce duruşma zaptı metnini yapıştırın.')
      return
    }

    try {
      setErrorMessage(null)
      const parsed: MinuteParseResult = parseCourtMinute(rawText, { applyAdliTatil })

      setCourt(parsed.courtInfo.court || '')
      setFileNo(parsed.courtInfo.file_no || '')
      setItems(parsed.items)
      setIsAnalyzed(true)

      // Try matching case by file_no
      if (parsed.courtInfo.file_no) {
        const cleanFile = parsed.courtInfo.file_no.toLowerCase().replace(/\s+/g, '')
        const matchedCase = cases.find((c) =>
          c.case_number.toLowerCase().replace(/\s+/g, '').includes(cleanFile)
        )
        if (matchedCase) {
          setSelectedCaseId(String(matchedCase.id))
          setSelectedClientId(String(matchedCase.client_id))
        }
      }
    } catch (err: any) {
      setErrorMessage('Ayrıştırma sırasında bir hata oluştu: ' + (err?.message || ''))
    }
  }

  // Toggle item selection
  const handleToggleItem = (id: string): void => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    )
  }

  // Update item field
  const handleUpdateItem = (id: string, field: keyof ExtractedActionItem, val: any): void => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    )
  }

  // Remove an item
  const handleRemoveItem = (id: string): void => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  // Add a manual item
  const handleAddCustomItem = (): void => {
    const today = new Date().toISOString().split('T')[0]
    const newItem: ExtractedActionItem = {
      id: `custom-${Date.now()}`,
      selected: true,
      title: 'Yeni Süreli İş / Görev',
      event_type: 'SURELI_IS',
      target_date: today,
      target_time: '17:00',
      court: court,
      file_no: fileNo,
      description: '',
      is_definite_deadline: false,
      priority: 'normal'
    }
    setItems((prev) => [...prev, newItem])
  }

  // Toggle select all
  const selectedCount = items.filter((i) => i.selected).length
  const allSelected = items.length > 0 && selectedCount === items.length

  const handleToggleSelectAll = (): void => {
    const nextVal = !allSelected
    setItems((prev) => prev.map((it) => ({ ...it, selected: nextVal })))
  }

  // Save selected events to Calendar
  const handleSaveEvents = async (): Promise<void> => {
    const selectedItems = items.filter((it) => it.selected)
    if (selectedItems.length === 0) {
      setErrorMessage('Lütfen takvime eklemek için en az bir ara karar seçin.')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage(null)

      const payloadList = selectedItems.map((item) => ({
        title: item.title,
        event_type: item.event_type,
        start_date: item.target_date,
        start_time: item.target_time || (item.event_type === 'DURUSMA' ? '09:30' : '17:00'),
        court: court.trim() || item.court || '',
        file_no: fileNo.trim() || item.file_no || '',
        description: item.description || '',
        client_id: selectedClientId ? Number(selectedClientId) : null,
        case_id: selectedCaseId ? Number(selectedCaseId) : null,
        status: 'BEKLIYOR' as const,
        is_ics_import: 0 as const
      }))

      await onAddEvents(payloadList)
      onClose()
    } catch (err: any) {
      console.error('Failed to add events from radar:', err)
      setErrorMessage('Takvime eklenirken hata: ' + (err?.message || 'Bilinmeyen hata'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🧠 Zabıt & Süre Radarı"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Privacy & Security Guarantee Banner */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 text-white rounded-xl border border-amber-500/30 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#C9A84C]" />
            </div>
            <div>
              <span className="font-semibold text-amber-200">Local-First Güvenlik Garantisi:</span>
              <p className="text-slate-300 text-[11px] leading-tight">
                Tutanak metni yalnızca geçici bellekte (RAM) taranır; diske, sunucuya veya veritabanına{' '}
                <strong className="text-white underline decoration-amber-400">kesinlikle kaydedilmez</strong>.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md text-[10px] font-bold tracking-wider">
            %100 ÇEVRİMDIŞI
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Text Input Mode */}
        {!isAnalyzed ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>Duruşma Zaptı Metnini Yapıştırın:</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Panodan Yapıştır</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#C9A84C]" />
                  <span>Örnek Tutanak Yükle</span>
                </button>
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="UYAP'tan kopyaladığınız duruşma zaptını veya ara kararları buraya yapıştırın... (Örn: GEREĞİ DÜŞÜNÜLDÜ: 1- Davacıya 2 haftalık kesin süre verilmesine...)"
              rows={12}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyAdliTatil}
                  onChange={(e) => setApplyAdliTatil(e.target.checked)}
                  className="rounded text-[#C9A84C] focus:ring-[#C9A84C]"
                />
                <span>HMK m.104 Adli Tatil Koruması (20 Temmuz - 31 Ağustos sonrasına 1 hafta uzat)</span>
              </label>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!rawText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1B2D] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#C9A84C]" />
                <span>Zaptı Çözümle ve Süreleri Bul</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: Analysis Results & Card Selection */
          <div className="space-y-4">
            {/* Metadata Matching Toolbar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-500" />
                  <span>Mahkeme:</span>
                </label>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="Mahkeme Adı"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C9A84C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Scale className="w-3 h-3 text-slate-500" />
                  <span>Esas No:</span>
                </label>
                <input
                  type="text"
                  value={fileNo}
                  onChange={(e) => setFileNo(e.target.value)}
                  placeholder="2024/152 E."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C9A84C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-500" />
                  <span>Dava İle Eşleştir:</span>
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => handleCaseChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C9A84C] focus:outline-none cursor-pointer"
                >
                  <option value="">Seçim Yapılmadı (Bağımsız)</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} - {c.court}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Müvekkil:
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C9A84C] focus:outline-none cursor-pointer"
                >
                  <option value="">Seçim Yapılmadı</option>
                  {clients.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions Bar above items list */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded text-[#C9A84C] focus:ring-[#C9A84C] cursor-pointer"
                  />
                  <span>Tümünü Seç ({selectedCount}/{items.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Madde Ekle</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAnalyzed(false)}
                className="text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Metni Yeniden Düzenle</span>
              </button>
            </div>

            {/* Extracted Items Cards List */}
            {items.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-700 font-medium">
                  Metinde doğrudan takvime eklenebilecek bir ara karar veya duruşma tarihi tespit edilemedi.
                </p>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manuel Madde Ekle</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      item.selected
                        ? item.is_definite_deadline
                          ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                          : item.event_type === 'DURUSMA'
                          ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-300 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(item.id)}
                        className="mt-1 rounded text-[#C9A84C] focus:ring-[#C9A84C] cursor-pointer"
                      />

                      <div className="flex-1 space-y-2">
                        {/* Top row: Badges and Title */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {item.event_type === 'DURUSMA' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold tracking-wider">
                                DURUŞMA
                              </span>
                            ) : item.is_definite_deadline ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-[10px] font-bold tracking-wider flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                KESİN SÜRE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold tracking-wider">
                                SÜRELİ İŞ
                              </span>
                            )}

                            {item.amount && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1">
                                <Coins className="w-3 h-3 text-[#C9A84C]" />
                                {item.amount.toLocaleString('tr-TR')} ₺
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Bu maddeyi kaldır"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title input */}
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#C9A84C] focus:outline-none"
                        />

                        {/* Date and Time Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
                            <span className="text-slate-500 text-[11px]">Tarih:</span>
                            <input
                              type="date"
                              value={item.target_date}
                              onChange={(e) => handleUpdateItem(item.id, 'target_date', e.target.value)}
                              className="font-medium text-slate-800 focus:outline-none bg-transparent flex-1"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-[#C9A84C] shrink-0" />
                            <span className="text-slate-500 text-[11px]">Saat:</span>
                            <input
                              type="time"
                              value={item.target_time || '09:30'}
                              onChange={(e) => handleUpdateItem(item.id, 'target_time', e.target.value)}
                              className="font-medium text-slate-800 focus:outline-none bg-transparent flex-1"
                            />
                          </div>
                        </div>

                        {/* Clause excerpt snippet */}
                        {item.description && (
                          <p className="text-[11px] text-slate-500 italic bg-white/60 p-2 rounded border border-slate-100 line-clamp-2">
                            "{item.description}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                İptal
              </button>

              <button
                type="button"
                onClick={handleSaveEvents}
                disabled={selectedCount === 0 || isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1B2D] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {isSaving ? 'Ekleniyor...' : `Seçilenleri Takvime Ekle (${selectedCount})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
