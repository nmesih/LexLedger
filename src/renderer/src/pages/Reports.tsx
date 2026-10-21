import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Scale,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Header from '../components/layout/Header'
import StatCard from '../components/ui/StatCard'
import { YearlyReportData } from '../types'

const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık'
]

export const Reports: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [reportData, setReportData] = useState<YearlyReportData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [isMasked, setIsMasked] = useState<boolean>(true)

  const loadYearlyReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await window.api.reports.getYearlyStats(selectedYear)

      // Ensure all 12 months exist
      const full12Months: YearlyReportData[] = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const found = data ? data.find((d) => d.month === m) : undefined
        return {
          month: m,
          monthName: MONTH_NAMES[i],
          collected: found ? found.collected : 0,
          expenses: found ? found.expenses : 0,
          netProfit: found ? found.netProfit : 0
        }
      })

      setReportData(full12Months)
    } catch (err: any) {
      console.error('Error loading yearly reports:', err)
      setError(err?.message || 'Yıllık rapor verileri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    loadYearlyReport()
  }, [loadYearlyReport])

  const formatCurrency = (val: number): string => {
    return (val || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  }

  // Yearly totals
  const totalCollected = reportData.reduce((sum, item) => sum + (item.collected || 0), 0)
  const totalExpenses = reportData.reduce((sum, item) => sum + (item.expenses || 0), 0)
  const totalNetProfit = totalCollected - totalExpenses

  // PDF Export
  const handleExportPDF = async (): Promise<void> => {
    try {
      setIsExporting(true)
      let officeName = 'Alan & Alan Hukuk Bürosu'
      try {
        const saved = await window.api.settings.get('office_name')
        if (typeof saved === 'string' && saved.trim()) {
          officeName = saved.trim()
        } else if (saved && typeof saved === 'object' && 'office_name' in saved) {
          const val = String((saved as Record<string, any>)['office_name'] || '').trim()
          if (val) officeName = val
        }
      } catch {}

      // Currency formatting helper: guaranteed no broken symbols, standard TL format
      const formatPdfMoney = (val: number): string => {
        const num = val || 0
        const formatted = num.toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        return `${formatted} TL`
      }

      // Initialize jsPDF (A4 Portrait, mm units)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Fetch bundled TrueType fonts for 100% Turkish character fidelity
      let activeFont = 'helvetica'
      let isCustomFontLoaded = false

      try {
        if (window.api.reports?.getPdfFonts) {
          const fonts = await window.api.reports.getPdfFonts()
          if (fonts?.regular) {
            doc.addFileToVFS('Arial-Regular.ttf', fonts.regular)
            doc.addFont('Arial-Regular.ttf', 'ArialCustom', 'normal')
            if (fonts.bold) {
              doc.addFileToVFS('Arial-Bold.ttf', fonts.bold)
              doc.addFont('Arial-Bold.ttf', 'ArialCustom', 'bold')
            }
            activeFont = 'ArialCustom'
            isCustomFontLoaded = true
            doc.setFont(activeFont, 'normal')
          }
        }
      } catch (fontErr) {
        console.warn('Custom font load failed, using fallback helvetica:', fontErr)
      }

      // Safe text converter for fallback mode only
      const toSafeText = (str: string): string => {
        if (isCustomFontLoaded) return str
        return str
          .replace(/ı/g, 'i')
          .replace(/İ/g, 'I')
          .replace(/ş/g, 's')
          .replace(/Ş/g, 'S')
          .replace(/ğ/g, 'g')
          .replace(/Ğ/g, 'G')
          .replace(/ü/g, 'u')
          .replace(/Ü/g, 'U')
          .replace(/ö/g, 'o')
          .replace(/Ö/g, 'O')
          .replace(/ç/g, 'c')
          .replace(/Ç/g, 'C')
      }

      const officeTitle = toSafeText(officeName)
      const reportTitle = toSafeText(`Yıllık Finansal Performans ve Gelir-Gider Raporu — ${selectedYear}`)
      const creationDate = new Date().toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })

      // 1. TOP HEADER BRANDING BANNER
      // Gold top accent stripe
      doc.setFillColor(201, 168, 76) // #C9A84C
      doc.rect(0, 0, 210, 3, 'F')

      // Navy main background banner
      doc.setFillColor(15, 27, 45) // #0F1B2D
      doc.rect(0, 3, 210, 36, 'F')

      // Office Name (Gold, Bold, Large)
      doc.setTextColor(201, 168, 76)
      doc.setFontSize(18)
      doc.setFont(activeFont, 'bold')
      doc.text(officeTitle, 15, 18)

      // Report Subtitle
      doc.setTextColor(226, 232, 240)
      doc.setFontSize(9.5)
      doc.setFont(activeFont, 'normal')
      doc.text(reportTitle, 15, 27)

      // Right metadata
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.text(toSafeText(`Tarih: ${creationDate}`), 195, 19, { align: 'right' })
      doc.text(toSafeText('Resmi Kurumsal Mali Rapor'), 195, 26, { align: 'right' })

      // 2. THREE EXECUTIVE SUMMARY CARDS
      // Card geometry: Total width = 180mm. 3 cards: 57mm each, 4.5mm gaps. Margins: 15mm.
      const cardY = 46
      const cardH = 24
      const cardW = 57
      const gap = 4.5

      // Card 1: Toplam Tahsilat
      const c1X = 15
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(c1X, cardY, cardW, cardH, 2, 2, 'FD')
      // Emerald top accent
      doc.setFillColor(16, 185, 129)
      doc.roundedRect(c1X, cardY, cardW, 2, 1, 1, 'F')
      doc.setFontSize(7.5)
      doc.setFont(activeFont, 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text(toSafeText('YILLIK TOPLAM TAHSİLAT'), c1X + 4, cardY + 8)
      doc.setFontSize(11)
      doc.setTextColor(16, 185, 129)
      doc.text(formatPdfMoney(totalCollected), c1X + 4, cardY + 16)
      doc.setFontSize(6.8)
      doc.setFont(activeFont, 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(toSafeText('Tahsil edilen net nakit girişi'), c1X + 4, cardY + 21)

      // Card 2: Toplam Gider
      const c2X = c1X + cardW + gap
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(c2X, cardY, cardW, cardH, 2, 2, 'FD')
      // Rose top accent
      doc.setFillColor(225, 29, 72)
      doc.roundedRect(c2X, cardY, cardW, 2, 1, 1, 'F')
      doc.setFontSize(7.5)
      doc.setFont(activeFont, 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text(toSafeText('YILLIK TOPLAM OFİS GİDERİ'), c2X + 4, cardY + 8)
      doc.setFontSize(11)
      doc.setTextColor(225, 29, 72)
      doc.text(formatPdfMoney(totalExpenses), c2X + 4, cardY + 16)
      doc.setFontSize(6.8)
      doc.setFont(activeFont, 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(toSafeText('Operasyonel büro masrafları'), c2X + 4, cardY + 21)

      // Card 3: Net Kâr / Zarar
      const c3X = c2X + cardW + gap
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(c3X, cardY, cardW, cardH, 2, 2, 'FD')
      // Gold / Red top accent
      doc.setFillColor(totalNetProfit >= 0 ? 201 : 225, totalNetProfit >= 0 ? 168 : 29, totalNetProfit >= 0 ? 76 : 72)
      doc.roundedRect(c3X, cardY, cardW, 2, 1, 1, 'F')
      doc.setFontSize(7.5)
      doc.setFont(activeFont, 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text(toSafeText('YILLIK NET KÂR / BAKİYE'), c3X + 4, cardY + 8)
      doc.setFontSize(11)
      doc.setTextColor(totalNetProfit >= 0 ? 15 : 225, totalNetProfit >= 0 ? 27 : 29, totalNetProfit >= 0 ? 45 : 72)
      doc.text(formatPdfMoney(totalNetProfit), c3X + 4, cardY + 16)
      doc.setFontSize(6.8)
      doc.setFont(activeFont, 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(toSafeText(totalNetProfit >= 0 ? 'Dönem kâr ile tamamlandı' : 'Giderler tahsilatı aştı'), c3X + 4, cardY + 21)

      // 3. TABLE OF MONTHS (autoTable)
      const tableData = reportData.map((row) => [
        toSafeText(row.monthName),
        formatPdfMoney(row.collected),
        formatPdfMoney(row.expenses),
        formatPdfMoney(row.netProfit)
      ])

      // Push totals row
      tableData.push([
        toSafeText('GENEL TOPLAM'),
        formatPdfMoney(totalCollected),
        formatPdfMoney(totalExpenses),
        formatPdfMoney(totalNetProfit)
      ])

      autoTable(doc, {
        startY: 77,
        margin: { left: 15, right: 15 },
        head: [[toSafeText('Ay'), toSafeText('Tahsil Edilen Ücret'), toSafeText('Ofis Giderleri'), toSafeText('Net Bakiye')]],
        body: tableData,
        theme: 'striped',
        styles: {
          font: activeFont,
          fontSize: 8.5,
          cellPadding: { top: 3.2, right: 4, bottom: 3.2, left: 4 },
          textColor: [51, 65, 85],
          overflow: 'visible'
        },
        headStyles: {
          font: activeFont,
          fontStyle: 'bold',
          fillColor: [15, 27, 45],
          textColor: [201, 168, 76],
          fontSize: 9,
          cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 }
        },
        alternateRowStyles: {
          fillColor: [250, 251, 253]
        },
        columnStyles: {
          0: { cellWidth: 36, fontStyle: 'bold' },
          1: { cellWidth: 48, halign: 'right', textColor: [16, 185, 129] },
          2: { cellWidth: 48, halign: 'right', textColor: [225, 29, 72] },
          3: { cellWidth: 48, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [241, 245, 249]
            data.cell.styles.textColor = [15, 27, 45]
            if (data.column.index === 1) data.cell.styles.textColor = [16, 185, 129]
            if (data.column.index === 2) data.cell.styles.textColor = [225, 29, 72]
            if (data.column.index === 3) {
              data.cell.styles.textColor = totalNetProfit >= 0 ? [15, 27, 45] : [225, 29, 72]
            }
          }
        }
      })

      // 4. FOOTER ON ALL PAGES
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        // Footer divider line
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(15, 282, 195, 282)

        // Footer texts
        doc.setFont(activeFont, 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(148, 163, 184)
        doc.text(
          toSafeText(`${officeTitle} • LexLedger Güvenli Mali Raporlama Sistemi`),
          15,
          287
        )
        doc.text(
          toSafeText(`Sayfa ${i} / ${pageCount}`),
          195,
          287,
          { align: 'right' }
        )
      }

      // Safe clean filename
      const cleanFileName = toSafeText(officeName)
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/__+/g, '_')
      doc.save(`${cleanFileName}_Mali_Rapor_${selectedYear}.pdf`)
    } catch (err: any) {
      console.error('PDF export error:', err)
      alert('PDF raporu oluşturulurken bir hata meydana geldi: ' + (err?.message || ''))
    } finally {
      setIsExporting(false)
    }
  }

  const yearOptions = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Finansal Raporlar"
        subtitle="Yıllık gelir, gider, kârlılık analizleri ve resmi rapor çıktıları"
        actionButton={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMasked((prev) => !prev)}
              title={isMasked ? 'Miktarları Göster' : 'Miktarları Gizle'}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-sm text-sm font-medium transition-colors cursor-pointer"
            >
              {isMasked ? (
                <>
                  <Eye className="w-4 h-4 text-[#C9A84C]" />
                  <span className="text-xs font-semibold text-slate-700">Miktarları Göster</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">Miktarları Gizle</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm">
              <Calendar className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-xs text-slate-500">Yıl:</span>
              <select
                aria-label="Yıl seçin"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent border-none text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={isExporting || loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#C9A84C]" />
              <span>{isExporting ? 'Oluşturuluyor...' : 'PDF Olarak İndir'}</span>
            </button>
          </div>
        }
      />

      {/* Summary StatCards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title={`${selectedYear} Toplam Tahsilat`}
          value={totalCollected}
          subtitle="Yıl boyunca tahsil edilen vekalet ücretleri"
          icon={TrendingUp}
          color="green"
          isMasked={isMasked}
          onToggleMask={() => setIsMasked((prev) => !prev)}
        />
        <StatCard
          title={`${selectedYear} Toplam Ofis Gideri`}
          value={totalExpenses}
          subtitle="Yıl boyunca büro operasyon masrafları"
          icon={TrendingDown}
          color="red"
          isMasked={isMasked}
          onToggleMask={() => setIsMasked((prev) => !prev)}
        />
        <StatCard
          title={`${selectedYear} Yıllık Net Kâr`}
          value={totalNetProfit}
          subtitle={totalNetProfit >= 0 ? 'Dönem kârla tamamlandı' : 'Dönem zararla tamamlandı'}
          icon={Scale}
          color={totalNetProfit >= 0 ? 'gold' : 'red'}
          isMasked={isMasked}
          onToggleMask={() => setIsMasked((prev) => !prev)}
        />
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#C9A84C]" />
              {selectedYear} Aylık Tahsilat &amp; Gider Karşılaştırması
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Her ay için tahsilat (altın) ve gider (kırmızı) dağılımı
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          {reportData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reportData}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="monthName"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₺${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), '']}
                  contentStyle={{
                    backgroundColor: '#0F1B2D',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
                />
                <Bar
                  dataKey="collected"
                  name="Tahsil Edilen Ücret"
                  fill="#C9A84C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="expenses"
                  name="Ofis Giderleri"
                  fill="#e11d48"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Rapor verisi bulunamadı.
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadYearlyReport}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C9A84C]" />
            <p className="text-sm font-medium text-slate-500">Raporlar hesaplanıyor...</p>
          </div>
        </div>
      )}

      {/* Month-by-month Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              {selectedYear} Yılı Ay Bazında Detaylı Finansal Döküm
            </h4>
            <span className="text-xs text-slate-400">12 Aylık Veri Tablosu</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Dönem (Ay)</th>
                  <th className="py-3 px-6 text-right">Tahsilat</th>
                  <th className="py-3 px-6 text-right">Ofis Giderleri</th>
                  <th className="py-3 px-6 text-right">Net Kâr / Zarar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-6 font-semibold text-slate-800">{row.monthName}</td>
                    <td className="py-3 px-6 text-right font-medium text-emerald-600">
                      {formatCurrency(row.collected)}
                    </td>
                    <td className="py-3 px-6 text-right font-medium text-rose-600">
                      {formatCurrency(row.expenses)}
                    </td>
                    <td
                      className={`py-3 px-6 text-right font-bold ${
                        row.netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(row.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900 text-sm">
                <tr>
                  <td className="py-4 px-6 uppercase tracking-wider text-xs">Genel Yıllık Toplam</td>
                  <td className="py-4 px-6 text-right text-emerald-700">
                    {formatCurrency(totalCollected)}
                  </td>
                  <td className="py-4 px-6 text-right text-rose-700">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td
                    className={`py-4 px-6 text-right ${
                      totalNetProfit >= 0 ? 'text-slate-950' : 'text-rose-700'
                    }`}
                  >
                    {formatCurrency(totalNetProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
