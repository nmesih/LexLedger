import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Plus,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  PieChart as PieIcon
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { OfficeExpense } from '../types'

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

const CATEGORY_COLORS: { [cat: string]: string } = {
  KİRA: '#0F1B2D',
  VERGİ: '#e11d48',
  KIRTASİYE: '#0284c7',
  MAAŞ: '#C9A84C',
  ELEKTRİK_SU: '#d97706',
  İNTERNET: '#0d9488',
  DİĞER: '#64748b'
}

const CATEGORY_LABELS: { [cat: string]: string } = {
  KİRA: 'Kira',
  VERGİ: 'Vergi / SGK',
  KIRTASİYE: 'Kırtasiye & Sarf',
  MAAŞ: 'Personel / Maaş',
  ELEKTRİK_SU: 'Elektrik / Su / Doğalgaz',
  İNTERNET: 'İnternet / İletişim',
  DİĞER: 'Diğer Genel Gider'
}

export const OfficeExpenses: React.FC = () => {
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')

  const [expenses, setExpenses] = useState<OfficeExpense[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingExpense, setEditingExpense] = useState<OfficeExpense | null>(null)
  const [formData, setFormData] = useState({
    category: 'KİRA' as OfficeExpense['category'],
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await window.api.officeExpenses.getByMonth(selectedMonth, selectedYear)
      setExpenses(data || [])
    } catch (err: any) {
      console.error('Office expenses error:', err)
      setError(err?.message || 'Ofis giderleri yüklenirken hata oluştu.')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const formatCurrency = (val: number): string => {
    return (val || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  }

  const handleOpenAddModal = (): void => {
    setEditingExpense(null)
    setFormData({
      category: 'KİRA',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (expense: OfficeExpense): void => {
    setEditingExpense(expense)
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date ? expense.date.split('T')[0] : ''
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveExpense = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const amountNum = parseFloat(formData.amount)
    if (!formData.description.trim() || isNaN(amountNum) || amountNum <= 0) {
      setFormError('Lütfen geçerli bir açıklama ve gider tutarı girin.')
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      const expDate = new Date(formData.date)
      const month = expDate.getMonth() + 1
      const year = expDate.getFullYear()

      if (editingExpense) {
        await window.api.officeExpenses.update(editingExpense.id, {
          category: formData.category,
          description: formData.description.trim(),
          amount: amountNum,
          date: formData.date,
          month,
          year
        })
      } else {
        await window.api.officeExpenses.create({
          category: formData.category,
          description: formData.description.trim(),
          amount: amountNum,
          date: formData.date,
          month,
          year
        })
      }

      setIsModalOpen(false)
      await loadExpenses()
    } catch (err: any) {
      console.error('Save office expense error:', err)
      setFormError(err?.message || 'Gider kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: number): Promise<void> => {
    if (!confirm('Bu ofis gider kaydını silmek istediğinize emin misiniz?')) return
    try {
      await window.api.officeExpenses.delete(id)
      await loadExpenses()
    } catch (err: any) {
      console.error('Delete expense error:', err)
      alert(err?.message || 'Gider silinemedi.')
    }
  }

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategoryFilter === 'ALL') return true
    return e.category === selectedCategoryFilter
  })

  // Total for this month
  const totalThisMonth = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // Chart data grouped by category
  const categoryTotals: { [key: string]: number } = {}
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount
  })

  const pieChartData = Object.keys(categoryTotals).map((cat) => ({
    name: CATEGORY_LABELS[cat] || cat,
    categoryKey: cat,
    value: categoryTotals[cat],
    color: CATEGORY_COLORS[cat] || '#64748b'
  }))

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: MONTH_NAMES[i]
  }))
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Ofis Giderleri"
        subtitle="Büro operasyonel ve genel ofis harcamaları"
        actionButton={
          <div className="flex items-center gap-3">
            {/* Month Year Selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm">
              <Calendar className="w-4 h-4 text-[#C9A84C]" />
              <select
                aria-label="Ay seçin"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Yıl seçin"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer pl-1"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C9A84C]" />
              <span>Gider Ekle</span>
            </button>
          </div>
        }
      />

      {/* Top Banner: Total & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Total Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Toplam Gider
              </span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">
              {formatCurrency(totalThisMonth)}
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Toplam {expenses.length} adet harcama kalemi kaydedildi.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dönem Seçimi:</span>
            <span className="font-semibold text-slate-700">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#C9A84C]" />
                Kategori Bazlı Gider Dağılımı
              </h3>
              <p className="text-xs text-slate-500">Giderlerin kalemlere göre oransal görünümü</p>
            </div>
          </div>

          <div className="h-48 w-full">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), 'Tutar']}
                    contentStyle={{
                      backgroundColor: '#0F1B2D',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Bu ay için henüz gider kaydı girilmedi.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter & Table Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Kategori Filtresi:</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
          >
            <option value="ALL">Tüm Kategoriler</option>
            <option value="KİRA">Kira</option>
            <option value="VERGİ">Vergi / SGK</option>
            <option value="KIRTASİYE">Kırtasiye</option>
            <option value="MAAŞ">Maaş</option>
            <option value="ELEKTRİK_SU">Elektrik / Su</option>
            <option value="İNTERNET">İnternet</option>
            <option value="DİĞER">Diğer</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {filteredExpenses.length} Kalem Listeleniyor
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadExpenses}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C9A84C]" />
            <p className="text-sm font-medium text-slate-500">Giderler yükleniyor...</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-sm">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-semibold text-slate-700">Kayıt Bulunamadı</p>
              <p className="text-xs text-slate-400 mt-1">
                Seçili dönem ve filtrede ofis gider kaydı bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Tarih</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4">Açıklama</th>
                    <th className="py-3.5 px-4 text-right">Tutar</th>
                    <th className="py-3.5 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge type={exp.category} label={CATEGORY_LABELS[exp.category]} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{exp.description}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            title="Düzenle"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            title="Sil"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingExpense ? 'Ofis Giderini Düzenle' : 'Yeni Ofis Gideri Ekle'}
        size="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gider Kategorisi</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as OfficeExpense['category'] })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            >
              <option value="KİRA">Kira</option>
              <option value="VERGİ">Vergi / SGK</option>
              <option value="KIRTASİYE">Kırtasiye &amp; Sarf Malzemesi</option>
              <option value="MAAŞ">Personel Maaşları</option>
              <option value="ELEKTRİK_SU">Elektrik / Su / Isınma</option>
              <option value="İNTERNET">İnternet &amp; Telekomünikasyon</option>
              <option value="DİĞER">Diğer Masraflar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Açıklama <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Ekim Ayı Büro Kirası veya Yazıcı Toneri"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tutar (TL) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin text-[#C9A84C]" />}
              <span>{submitting ? 'Kaydediliyor...' : 'Gideri Kaydet'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default OfficeExpenses
