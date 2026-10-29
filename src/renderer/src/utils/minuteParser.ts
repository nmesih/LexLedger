import { CalendarEventType } from '../types'

export interface ParsedCourtInfo {
  court?: string
  file_no?: string
  hearing_date?: string // YYYY-MM-DD
}

export interface ExtractedActionItem {
  id: string
  selected: boolean
  title: string
  event_type: CalendarEventType
  target_date: string // YYYY-MM-DD
  target_time?: string // HH:mm
  court?: string
  file_no?: string
  description?: string
  amount?: number
  is_definite_deadline: boolean // Kesin süre mi?
  priority: 'high' | 'medium' | 'normal'
  original_clause?: string
}

export interface MinuteParseResult {
  courtInfo: ParsedCourtInfo
  items: ExtractedActionItem[]
}

// Helpers for Date Formatting
export const pad2 = (n: number): string => String(n).padStart(2, '0')

export const toYmd = (d: Date): string => {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export const parseTrDateToYmd = (dateStr: string): string | null => {
  // Matches dd.mm.yyyy or dd/mm/yyyy
  const m = dateStr.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/**
 * HMK m.93 gereğince sürenin son günü hafta sonuna (Cumartesi veya Pazar)
 * rastlarsa, süre tatili takip eden ilk iş gününe (Pazartesi) uzar.
 */
export const adjustForHmkWeekend = (date: Date): Date => {
  const adjusted = new Date(date)
  const dayOfWeek = adjusted.getDay() // 0: Pazar, 6: Cumartesi
  if (dayOfWeek === 6) {
    adjusted.setDate(adjusted.getDate() + 2) // Cumartesi -> Pazartesi
  } else if (dayOfWeek === 0) {
    adjusted.setDate(adjusted.getDate() + 1) // Pazar -> Pazartesi
  }
  return adjusted
}

/**
 * HMK m.104 gereği süre adli tatile (20 Temmuz - 31 Ağustos) denk gelirse,
 * tatilin bitiminden itibaren 1 hafta (7 Eylül) uzar.
 */
export const adjustForAdliTatil = (date: Date): Date => {
  const m = date.getMonth() + 1 // 1-12
  const d = date.getDate()
  // 20 Temmuz (7/20) - 31 Ağustos (8/31) arası
  const isAdliTatil = (m === 7 && d >= 20) || m === 8
  if (isAdliTatil) {
    // 7 Eylül'e ötele
    const adjusted = new Date(date.getFullYear(), 8, 7) // 8 is September (0-indexed)
    return adjustForHmkWeekend(adjusted)
  }
  return date
}

// Convert Turkish number words to integers
const parseTrNumber = (text: string): number | null => {
  const cleaned = text.trim().toLowerCase()
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10)
  const map: Record<string, number> = {
    bir: 1,
    iki: 2,
    üç: 3,
    dört: 4,
    beş: 5,
    altı: 6,
    yedi: 7,
    sekiz: 8,
    dokuz: 9,
    on: 10,
    'on bir': 11,
    'onbir': 11,
    'on iki': 12,
    'oniki': 12,
    'on beş': 15,
    'onbeş': 15,
    yirmi: 20,
    otuz: 30,
    kırk: 40,
    elli: 50,
    altmış: 60
  }
  return map[cleaned] ?? null
}

/**
 * Duruşma zaptı metnini tamamen yerel olarak ve bellek içinde (in-memory) analiz eder.
 */
export const parseCourtMinute = (
  rawText: string,
  options: { applyAdliTatil?: boolean } = {}
): MinuteParseResult => {
  const text = rawText || ''
  const courtInfo: ParsedCourtInfo = {}

  // 1. MAHKEME ADI TESPİTİ
  // Örn: T.C. ANKARA 4. ASLİYE TİCARET MAHKEMESİ veya İSTANBUL 12. İŞ MAHKEMESİ
  const courtMatch = text.match(
    /(?:T\.?C\.?\s*)?([A-ZÇĞİÖŞÜ0-9\s.]+MAHKEMES[İI](?:'N[İI]Z?|'NE)?(?:\s+BAŞKANLIĞI|\s+HÂKİMLİĞİ)?)/i
  )
  if (courtMatch) {
    courtInfo.court = courtMatch[1]
      .replace(/(?:'n[iz]|'ne|başkanlığı|hâkimliği)/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // 2. ESAS NO TESPİTİ
  // Örn: ESAS NO : 2024/152 Esas veya 2023/45 E.
  const fileNoMatch = text.match(
    /(?:ESAS\s*NO\s*[:]\s*|\bESAS\s*:\s*|\b)(\d{4}\s*\/\s*\d+)(?:\s*E\.?|\s*Esas)?/i
  )
  if (fileNoMatch) {
    courtInfo.file_no = fileNoMatch[1].replace(/\s+/g, '') + ' E.'
  }

  // 3. CELSE / DURUŞMA TARİHİ TESPİTİ
  // Tutanaktaki ilk veya celse tarihlerinden bugünkü/referans duruşma tarihini bul
  const celseMatch = text.match(/(?:Celse\s*Tarihi\s*[:]\s*|Tarih\s*[:]\s*)(\d{1,2}[./]\d{1,2}[./]\d{4})/i)
  if (celseMatch) {
    const ymd = parseTrDateToYmd(celseMatch[1])
    if (ymd) courtInfo.hearing_date = ymd
  } else {
    // Alternatif olarak tutanak başındaki ilk geçerli tarihi ara
    const firstDateMatch = text.match(/\b(\d{1,2}[./]\d{1,2}[./]\d{4})\b/)
    if (firstDateMatch) {
      const ymd = parseTrDateToYmd(firstDateMatch[1])
      if (ymd) courtInfo.hearing_date = ymd
    }
  }

  // Referans Başlangıç Tarihi: Zaptın celse tarihi varsa o, yoksa bugünün yerel tarihi
  const baseDate = courtInfo.hearing_date
    ? new Date(courtInfo.hearing_date + 'T00:00:00')
    : new Date()

  const items: ExtractedActionItem[] = []
  let itemIdCounter = 1

  // 4. "GEREĞİ DÜŞÜNÜLDÜ" VEYA ARA KARARLAR BÖLÜMÜNÜ BULMA
  let clausesText = text
  const geregiIndex = text.search(/GEREĞİ\s*DÜŞÜNÜLDÜ\s*[:.]?/i)
  if (geregiIndex !== -1) {
    clausesText = text.slice(geregiIndex)
  }

  // Maddelere ayır: 1-, 1., 1), veya Ara Karar 1
  const rawClauses = clausesText
    .split(/(?:\r?\n|^)\s*(?:\d+[\.\-\)]|[A-ZÇĞİÖŞÜ]\s*[\.\-\)]|Ara\s*Karar\s*\d+[:.\-]?)\s*/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 15) // Çok kısa parçaları at

  // Maddeleri analiz et
  for (const clause of rawClauses) {
    const isDefinite = /kesin\s+süre/i.test(clause)

    // A) SONRAKİ DURUŞMA TESPİTİ
    // Örn: "Bir sonraki duruşmanın 18/02/2027 günü saat 10:45'e bırakılmasına"
    // Örn: "Duruşmanın 24.11.2026 günü saat 09:30'a talikine"
    const nextHearingMatch = clause.match(
      /(?:duruşma(?:nın|ya)?|celse(?:nin)?|bırakılmasına|talikine|ertelenmesine)[\s\S]*?(\d{1,2}[./]\d{1,2}[./]\d{4})(?:\s*günü)?(?:\s*saat\s*(\d{1,2}[:.]\d{2}))?/i
    ) || clause.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})(?:\s*günü)?\s*saat\s*(\d{1,2}[:.]\d{2})[\s\S]*?(?:duruşma|bırakıl|talik)/i)

    if (nextHearingMatch && /duruşma|celse|talik|bırakıl/i.test(clause)) {
      const targetDateYmd = parseTrDateToYmd(nextHearingMatch[1])
      let targetTime = '09:30'
      if (nextHearingMatch[2]) {
        targetTime = nextHearingMatch[2].replace('.', ':')
      }

      if (targetDateYmd) {
        items.push({
          id: `item-${itemIdCounter++}`,
          selected: true,
          title: `Duruşma: ${courtInfo.court || courtInfo.file_no || 'Duruşma Celsesi'}`,
          event_type: 'DURUSMA',
          target_date: targetDateYmd,
          target_time: targetTime,
          court: courtInfo.court,
          file_no: courtInfo.file_no,
          description: clause.slice(0, 300),
          is_definite_deadline: false,
          priority: 'high',
          original_clause: clause
        })
        continue // Duruşma maddesi olarak eklendi, diğer kontrollere geç
      }
    }

    // B) SÜRELİ İŞLER / KESİN SÜRELER TESPİTİ
    // Örn: "iki haftalık kesin süre verilmesine", "10 günlük süre verilmesine"
    const durationMatch = clause.match(
      /(\d+|bir|iki|üç|dört|beş|altı|yedi|on|on\s*beş|onbeş|yirmi|otuz)\s*(günlük|gün|haftalık|hafta|aylık|ay)\s*(kesin\s*)?süre/i
    )

    // C) PARASAL DEPO / GİDER / BİLİRKİŞİ ÜCRETİ TESPİTİ
    // Örn: "3.000,00 TL bilirkişi ücreti", "500 TL gider avansı"
    const amountMatch = clause.match(
      /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+)\s*(?:TL|Türk\s*Lirası)/i
    )
    let extractedAmount: number | undefined
    if (amountMatch) {
      const rawNum = amountMatch[1].replace(/\./g, '').replace(',', '.')
      const parsedNum = parseFloat(rawNum)
      if (!isNaN(parsedNum) && parsedNum > 0) {
        extractedAmount = parsedNum
      }
    }

    if (durationMatch) {
      const numVal = parseTrNumber(durationMatch[1])
      const unit = durationMatch[2].toLowerCase()

      if (numVal && numVal > 0) {
        const target = new Date(baseDate)

        if (unit.startsWith('hafta')) {
          target.setDate(target.getDate() + numVal * 7)
        } else if (unit.startsWith('gün')) {
          target.setDate(target.getDate() + numVal)
        } else if (unit.startsWith('ay')) {
          target.setMonth(target.getMonth() + numVal)
        }

        // HMK Hafta sonu denetimi (Pazartesiye öteleme)
        let finalDate = adjustForHmkWeekend(target)

        // Adli tatil kuralı istendiyse
        if (options.applyAdliTatil) {
          finalDate = adjustForAdliTatil(finalDate)
        }

        // Başlık Türetme
        let itemTitle = isDefinite ? 'Kesin Süre: ' : 'Süreli İş: '
        if (/bilirkişi/i.test(clause)) {
          itemTitle += extractedAmount ? 'Bilirkişi Ücreti Deposu' : 'Bilirkişi Raporuna İtiraz / Beyan'
        } else if (/tanık/i.test(clause)) {
          itemTitle += 'Tanık Listesi / Masrafı Bildirimi'
        } else if (/delil|belge/i.test(clause)) {
          itemTitle += 'Delil & Belge Sunma Süresi'
        } else if (/müzekkere/i.test(clause)) {
          itemTitle += 'Müzekkere Masrafı / Takibi'
        } else if (/ıslah/i.test(clause)) {
          itemTitle += 'Islah Dilekçesi / Harcı'
        } else if (/ihtiyati\s*tedbir/i.test(clause)) {
          itemTitle += 'İhtiyati Tedbir Teminatı'
        } else {
          itemTitle += `${numVal} ${unit.startsWith('hafta') ? 'Haftalık' : 'Günlük'} Ara Karar İfası`
        }

        items.push({
          id: `item-${itemIdCounter++}`,
          selected: true,
          title: itemTitle,
          event_type: 'SURELI_IS',
          target_date: toYmd(finalDate),
          target_time: '17:00', // Mesai bitimi
          court: courtInfo.court,
          file_no: courtInfo.file_no,
          description: clause.slice(0, 300),
          amount: extractedAmount,
          is_definite_deadline: isDefinite,
          priority: isDefinite ? 'high' : extractedAmount ? 'medium' : 'normal',
          original_clause: clause
        })
      }
    } else if (extractedAmount && /depo|yatırıl|avans|ücret/i.test(clause)) {
      // Süre net belirtilmemiş ama para depo etme kararı var (varsayılan 2 hafta)
      const target = new Date(baseDate)
      target.setDate(target.getDate() + 14) // 2 hafta
      const finalDate = adjustForHmkWeekend(target)

      items.push({
        id: `item-${itemIdCounter++}`,
        selected: true,
        title: `Mali Yükümlülük: Avans / Ücret Deposu (${extractedAmount.toLocaleString('tr-TR')} ₺)`,
        event_type: 'SURELI_IS',
        target_date: toYmd(finalDate),
        target_time: '17:00',
        court: courtInfo.court,
        file_no: courtInfo.file_no,
        description: clause.slice(0, 300),
        amount: extractedAmount,
        is_definite_deadline: isDefinite,
        priority: 'high',
        original_clause: clause
      })
    }
  }

  // Tarihe göre sırala (en yakın tarih önce)
  items.sort((a, b) => a.target_date.localeCompare(b.target_date))

  return {
    courtInfo,
    items
  }
}
