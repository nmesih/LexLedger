import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Coins,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react'
import Header from '../components/layout/Header'
import StatCard from '../components/ui/StatCard'
import { Fee } from '../types'

type PaymentFilterStatus = 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'

export const Fees: React.FC = () => {
  const navigate = useNavigate()

  const [fees, setFees] = useState<Fee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isMasked, setIsMasked] = useState<boolean>(true)

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<PaymentFilterStatus>('ALL')

  const loadFees = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await window.api.fees.getAll()
      setFees(data || [])
    } catch (err: any) {
      console.error('Fees fetch error:', err)
      setError(err?.message || 'Ücret kayıtları yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFees()
  }, [loadFees])

  const formatCurrency = (val: number): string => {
    return (val || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  }

  // Aggregate stats
  const totalAgreed = fees.reduce((sum, f) => sum + (f.total_amount || 0), 0)
  const totalCollected = fees.reduce((sum, f) => sum + (f.collected_amount || 0), 0)
  const totalReceivables = Math.max(0, totalAgreed - totalCollected)

  const filteredFees = fees.filter((fee) => {
    const collected = fee.collected_amount || 0
    const remaining = Math.max(0, fee.total_amount - collected)

    const matchesQuery =
      fee.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fee.client_name && fee.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (fee.case_title && fee.case_title.toLowerCase().includes(searchQuery.toLowerCase()))

    let matchesFilter = true
    if (filterStatus === 'PAID') {
      matchesFilter = remaining <= 0 && fee.total_amount > 0
    } else if (filterStatus === 'PARTIAL') {
      matchesFilter = collected > 0 && remaining > 0
    } else if (filterStatus === 'UNPAID') {
      matchesFilter = collected === 0
    }

    return matchesQuery && matchesFilter
  })

  return (
    <div className="space-y-6">
      <Header
        title="Ücretler ve Tahsilatlar"
        subtitle="Müvekkil vekalet ücret sözleşmeleri ve tahsilat takibi"
        actionButton={
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
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Toplam Kararlaştırılan Ücret"
          value={totalAgreed}
          subtitle="Tüm vekalet sözleşmeleri toplamı"
          icon={Coins}
          color="gold"
          isMasked={isMasked}
          onToggleMask={() => setIsMasked((prev) => !prev)}
        />
        <StatCard
          title="Toplam Tahsil Edilen"
          value={totalCollected}
          subtitle="Kayıtlı toplam net nakit girişi"
          icon={TrendingUp}
          color="green"
          isMasked={isMasked}
          onToggleMask={() => setIsMasked((prev) => !prev)}
        />
        <StatCard
          title="Toplam Bekleyen Alacak"
          value={totalReceivables}
          subtitle="Tahsil edilmesi gereken bakiye"
          icon={Clock}
          color="red"
          isMasked={isMasked}
          onToggleMask={() => setIsMasked((prev) => !prev)}
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Müvekkil, dava veya açıklama ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Ödeme Durumu:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PaymentFilterStatus)}
            className="px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
          >
            <option value="ALL">Tümü</option>
            <option value="PAID">Tamamı Ödenmiş</option>
            <option value="PARTIAL">Kısmi Ödenmiş</option>
            <option value="UNPAID">Hiç Ödenmemiş</option>
          </select>
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
            onClick={loadFees}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C9A84C]" />
            <p className="text-sm font-medium text-slate-500">Ücret kayıtları listeleniyor...</p>
          </div>
        </div>
      )}

      {/* Fees Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-sm">
          {filteredFees.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Coins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-semibold text-slate-700">Kayıt Bulunamadı</p>
              <p className="text-xs text-slate-400 mt-1">
                Kriterlere uygun vekalet ücreti kaydı bulunamadı.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Müvekkil</th>
                    <th className="py-3.5 px-4">Dava / Dosya</th>
                    <th className="py-3.5 px-4">Açıklama</th>
                    <th className="py-3.5 px-4 text-right">Toplam Tutar</th>
                    <th className="py-3.5 px-4 text-right">Tahsil Edilen</th>
                    <th className="py-3.5 px-4 text-right">Kalan Bakiye</th>
                    <th className="py-3.5 px-4">Tarih</th>
                    <th className="py-3.5 px-4 text-center">Durum</th>
                    <th className="py-3.5 px-4 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.map((fee) => {
                    const collected = fee.collected_amount || 0
                    const remaining = Math.max(0, fee.total_amount - collected)
                    const isFullyPaid = remaining <= 0

                    return (
                      <tr
                        key={fee.id}
                        onClick={() => navigate(`/clients/${fee.client_id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#C9A84C] transition-colors">
                          {fee.client_name || `Müvekkil #${fee.client_id}`}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {fee.case_title || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">{fee.description}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(fee.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                          {formatCurrency(collected)}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-bold ${
                            isFullyPaid ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(remaining)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(fee.date).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isFullyPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : collected > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isFullyPaid
                              ? 'Tamamlandı'
                              : collected > 0
                              ? 'Kısmi Ödendi'
                              : 'Ödenmedi'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex p-1 text-slate-400 group-hover:text-[#C9A84C] group-hover:translate-x-1 transition-all">
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Fees
