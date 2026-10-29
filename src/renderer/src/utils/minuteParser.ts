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
  is_definite_deadline: boolean // Kesin süre veya yasal itiraz süresi mi?
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

/**
 * Türkçe büyük/küçük harf duyarlılığını (İ/i, I/ı vb.) hatasız normalize eder.
 */
export const normalizeTr = (str: string): string => {
  return (str || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
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
  const cleaned = normalizeTr(text.trim())
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
 * Kesin süreler, itiraz / kanun yolları (CMK/HMK), avans depoları ve bir sonraki celseyi çıkarır.
 */
export const parseCourtMinute = (
  rawText: string,
  options: { applyAdliTatil?: boolean } = {}
): MinuteParseResult => {
  const text = rawText || ''
  const courtInfo: ParsedCourtInfo = {}

  // 1. MAHKEME ADI TESPİTİ
  // Büyük harfle başlayan mahkeme adlarını temizce yakala
  const courtMatch = text.match(
    /(?:T\.?C\.?\s*)?\b([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü0-9\s.]+MAHKEMES[İI](?:'N[İI]Z?|'NE)?(?:\s+BAŞKANLIĞI|\s+HÂKİMLİĞİ)?)/
  )
  if (courtMatch) {
    let cleanCourt = courtMatch[1]
      .replace(/(?:'n[iz]|'ne|başkanlığı|hâkimliği)/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    // Baştaki "vasıtasıyla", "veya", "ile" gibi bağlaçları temizle
    cleanCourt = cleanCourt.replace(/^(?:veya|ile|vasıtasıyla|nezdinde|tarafından|mahkemesince)\s+/i, '')
    courtInfo.court = cleanCourt
  }

  // 2. ESAS NO TESPİTİ
  const fileNoMatch = text.match(
    /(?:ESAS\s*NO\s*[:]\s*|\bESAS\s*:\s*|\b)(\d{4}\s*\/\s*\d+)(?:\s*E\.?|\s*Esas)?/i
  )
  if (fileNoMatch) {
    courtInfo.file_no = fileNoMatch[1].replace(/\s+/g, '') + ' E.'
  }

  // 3. CELSE / DURUŞMA REFERANS TARİHİ TESPİTİ
  // Yalnızca açıkça belirtilmiş celse tarihini veya karar sonundaki tarihi al
  // (Gelecekteki sonraki duruşma tarihini başlangıç tarihi sanmaması için filtreliyoruz)
  const celseMatch = text.match(
    /(?:Celse\s*Tarihi\s*[:]\s*|Tarih\s*[:]\s*|Duruşma\s*Günü\s*[:]\s*)(\d{1,2}[./]\d{1,2}[./]\d{4})/i
  )
  if (celseMatch) {
    const ymd = parseTrDateToYmd(celseMatch[1])
    if (ymd) courtInfo.hearing_date = ymd
  } else {
    // Tutanak sonundaki tarih: "karar verildi. 29/10/2026"
    const endDateMatch = text.match(
      /(?:karar\s*verildi|imza|kâtip|hâkim)[\s\S]*?(\d{1,2}[./]\d{1,2}[./]\d{4})\s*$/i
    )
    if (endDateMatch) {
      const ymd = parseTrDateToYmd(endDateMatch[1])
      if (ymd) courtInfo.hearing_date = ymd
    }
  }

  // Referans Başlangıç Tarihi: Zaptın celse tarihi varsa o, yoksa BUGÜNÜN tarihi
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

  // Maddelere ve alt bentlere ayır: 1-, 2., 3), A-, alt bentler (-Adli kontrol...)
  const rawClauses = clausesText
    .split(/(?:\r?\n|^)\s*(?:\d+[\.\-\)]|[A-ZÇĞİÖŞÜ]\s*[\.\-\)]|Ara\s*Karar\s*\d+[:.\-]?|[-•*]\s*(?=[A-ZÇĞİÖŞÜa-zçğıöşü]))/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 10)

  // 5. HER MADDEYİ ÇÖZÜMLE
  for (const clause of rawClauses) {
    const normClause = normalizeTr(clause)
    const isDefinite = normClause.includes('kesin süre') || normClause.includes('kesin olarak')
    const isObjection =
      normClause.includes('itiraz') ||
      normClause.includes('istinaf') ||
      normClause.includes('temyiz') ||
      normClause.includes('kanun yolu')

    // A) SONRAKİ DURUŞMA TESPİTİ
    // "duruşmanın 03/12/2026 günü saat 10:55 bırakılmasına karar verildi"
    const nextHearingMatch =
      clause.match(
        /(?:duruşma(?:nın|ya)?|celse(?:nin)?|bırakılmasına|talikine|ertelenmesine)[\s\S]*?(\d{1,2}[./]\d{1,2}[./]\d{4})(?:\s*günü)?(?:\s*saat\s*(\d{1,2}[:.]\d{2}))?/i
      ) ||
      clause.match(
        /(\d{1,2}[./]\d{1,2}[./]\d{4})(?:\s*günü)?\s*(?:saat\s*)?(\d{1,2}[:.]\d{2})?[\s\S]*?(?:duruşma|bırakıl|talik|ertelen)/i
      )

    if (
      nextHearingMatch &&
      (normClause.includes('duruşma') ||
        normClause.includes('celse') ||
        normClause.includes('bırakıl') ||
        normClause.includes('talik') ||
        normClause.includes('ertelen'))
    ) {
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

        // Eğer bu fıkrada başka süre/para geçmiyorsa diğer sürelere bakmadan devam et
        if (
          !/(?:süre|içinde|içerisinde|zarfında|TL|ücret|avans|itiraz)/i.test(
            clause.replace(nextHearingMatch[0], '')
          )
        ) {
          continue
        }
      }
    }

    // B) SÜRELİ İŞLER / KESİN SÜRELER / İTİRAZ & KANUN YOLU SÜRELERİ
    // Örn 1: "2 haftalık kesin süre verilmesine"
    // Örn 2: "tebliğden itibaren 2 HAFTA içinde ... İTİRAZ edilebileceğinin bildirilmesine"
    // Örn 3: "7 gün içerisinde istinaf yoluna başvurulabileceğine"
    const durationMatch =
      normClause.match(
        /(\d+|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|on\s*beş|onbeş|yirmi|otuz)\s*(günlük|gün|haftalık|hafta|aylık|ay)\s*(?:(kesin\s*)?süre|(?:içinde|içerisinde|zarfında|müddetle))/
      ) ||
      normClause.match(
        /(?:tebliğ(?:den)?|öğrenme(?:den)?|karar(?:dan)?)\s*(?:itibaren\s*)?(\d+|bir|iki|üç|dört|beş|yedi|on|on\s*beş|yirmi|otuz)\s*(gün|hafta|ay)\s*(?:içinde|içerisinde)?/
      )

    // C) PARASAL DEPO / BİLİRKİŞİ / AVANS TESPİTİ
    const amountMatch = clause.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+)\s*(?:TL|Türk\s*Lirası)/i)
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
        let itemTitle = ''
        if (isObjection) {
          if (normClause.includes('adli kontrol')) {
            itemTitle = 'İtiraz Süresi: Adli Kontrol Kararına İtiraz'
          } else if (normClause.includes('tutukla')) {
            itemTitle = 'İtiraz Süresi: Tutukluluk Kararına İtiraz'
          } else if (normClause.includes('istinaf')) {
            itemTitle = 'İstinaf Başvuru Süresi'
          } else if (normClause.includes('temyiz')) {
            itemTitle = 'Temyiz Başvuru Süresi'
          } else {
            itemTitle = 'İtiraz / Kanun Yolu Başvuru Süresi'
          }
        } else if (normClause.includes('bilirkişi')) {
          itemTitle = extractedAmount
            ? 'Bilirkişi Ücreti Deposu'
            : 'Bilirkişi Raporuna İtiraz / Beyan'
        } else if (normClause.includes('tanık')) {
          itemTitle = 'Tanık Listesi / Masrafı Bildirimi'
        } else if (normClause.includes('delil') || normClause.includes('belge')) {
          itemTitle = 'Delil & Belge Sunma Süresi'
        } else if (normClause.includes('müzekkere')) {
          itemTitle = 'Müzekkere Masrafı / Takibi'
        } else if (normClause.includes('ıslah')) {
          itemTitle = 'Islah Dilekçesi / Harcı'
        } else if (normClause.includes('cevap')) {
          itemTitle = 'Cevap Dilekçesi Sunma Süresi'
        } else {
          itemTitle = `${isDefinite ? 'Kesin Süre' : 'Süreli İş'}: ${numVal} ${
            unit.startsWith('hafta') ? 'Haftalık' : 'Günlük'
          } Süre`
        }

        if (extractedAmount && !itemTitle.includes('Deposu')) {
          itemTitle += ` (${extractedAmount.toLocaleString('tr-TR')} ₺)`
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
          is_definite_deadline: isDefinite || isObjection,
          priority: isDefinite || isObjection ? 'high' : extractedAmount ? 'medium' : 'normal',
          original_clause: clause
        })
      }
    } else if (extractedAmount && /depo|yatırıl|avans|ücret/i.test(clause)) {
      // Süre net belirtilmemiş ama para depo etme kararı var (varsayılan 2 hafta)
      const target = new Date(baseDate)
      target.setDate(target.getDate() + 14)
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
        is_definite_deadline: false,
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
