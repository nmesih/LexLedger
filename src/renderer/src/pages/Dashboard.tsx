import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Calendar,
  AlertCircle,
  RefreshCw,
  Clock,
  Briefcase,
  UserCheck,
  CreditCard,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import StatCard from '../components/ui/StatCard'
import Header from '../components/layout/Header'
import { MonthlyStats, MonthlyChartData, RecentActivityItem } from '../types'

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

export const Dashboard: React.FC = () => {
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
  const [isMasked, setIsMasked] = useState<boolean>(true)

  const [stats, setStats] = useState<MonthlyStats>({
    totalCollected: 0,
    totalOfficeExpenses: 0,
    netProfit: 0,
    totalClientExpensesUnreimbursed: 0
  })
  const [totalReceivables, setTotalReceivables] = useState<number>(0)
  const [chartData, setChartData] = useState<MonthlyChartData[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [monthlyStatsRes, receivablesRes, chartRes, activityRes] = await Promise.all([
        window.api.dashboard.getMonthlyStats(selectedMonth, selectedYear),
        window.api.dashboard.getTotalReceivables(),
        window.api.dashboard.getLast6MonthsStats(),
        window.api.dashboard.getRecentActivity()
      ])

      setStats(monthlyStatsRes)
      setTotalReceivables(typeof receivablesRes === 'number' ? receivablesRes : (receivablesRes?.totalReceivable ?? 0))
      setChartData(chartRes || [])
      setRecentActivities(activityRes || [])
    } catch (err: any) {
      console.error('Dashboard data load error:', err)
      setError(err?.message || 'Dashboard verileri yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatCurrency = (val: number): string => {
    return val.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  }

  const getActivityIcon = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'PAYMENT':
      case 'FEE':
        return <Wallet className="w-4 h-4 text-emerald-600" />
      case 'CASE':
        return <Briefcase className="w-4 h-4 text-blue-600" />
      case 'EXPENSE':
        return <TrendingDown className="w-4 h-4 text-rose-600" />
      case 'CLIENT':
        return <UserCheck className="w-4 h-4 text-[#C9A84C]" />
      default:
        return <FileText className="w-4 h-4 text-slate-500" />
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: MONTH_NAMES[i]
  }))

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Header
        title="Genel Bakış"
        subtitle="Büro mali durumu, son aktiviteler ve aylık performans grafikleri"
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
              onClick={loadDashboardData}
              title="Yenile"
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C9A84C]' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Loading state skeleton/overlay */}
      {loading && !error && (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C9A84C]" />
            <p className="text-sm font-medium text-slate-500">Veriler yükleniyor...</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Top row: 4 StatCards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title={`${MONTH_NAMES[selectedMonth - 1]} Tahsilat`}
              value={stats.totalCollected}
              subtitle="Bu ay yapılan net tahsilatlar"
              icon={TrendingUp}
              color="green"
              isMasked={isMasked}
              onToggleMask={() => setIsMasked((prev) => !prev)}
            />
            <StatCard
              title={`${MONTH_NAMES[selectedMonth - 1]} Gider`}
              value={stats.totalOfficeExpenses}
              subtitle="Bu ayki büro operasyonel giderleri"
              icon={TrendingDown}
              color="red"
              isMasked={isMasked}
              onToggleMask={() => setIsMasked((prev) => !prev)}
            />
            <StatCard
              title={`${MONTH_NAMES[selectedMonth - 1]} Net Kâr`}
              value={stats.netProfit}
              subtitle={stats.netProfit >= 0 ? 'Kârlı dönem' : 'Giderler tahsilatı aştı'}
              icon={Scale}
              color={stats.netProfit >= 0 ? 'gold' : 'red'}
              isMasked={isMasked}
              onToggleMask={() => setIsMasked((prev) => !prev)}
            />
            <StatCard
              title="Toplam Alacak"
              value={totalReceivables}
              subtitle="Müvekkillerden tahsil bekleyen bakiye"
              icon={Wallet}
              color="blue"
              isMasked={isMasked}
              onToggleMask={() => setIsMasked((prev) => !prev)}
            />
          </div>

          {/* Middle: Line/Area chart */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  Son 6 Aylık Finansal Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tahsil edilen vekalet ücretleri ile ofis giderlerinin karşılaştırması
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-[#C9A84C]"></span>
                  Tahsilat
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-slate-500"></span>
                  Giderler
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#C9A84C" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
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
                    <Legend verticalAlign="top" height={0} />
                    <Area
                      type="monotone"
                      dataKey="totalCollected"
                      name="Tahsilat"
                      stroke="#C9A84C"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorCollected)"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalOfficeExpenses"
                      name="Gider"
                      stroke="#64748b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Grafik için yeterli veri bulunamadı.
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Recent Activity List */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C9A84C]" />
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Son Hareketler</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Son 10 İşlem</span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Henüz kayıtlı bir hareket bulunmuyor.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivities.slice(0, 10).map((activity) => (
                  <div
                    key={activity.id}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors rounded-lg px-2"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200/60">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{activity.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {activity.amount !== undefined && (
                        <div
                          className={`text-sm font-bold ${
                            activity.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {activity.type === 'EXPENSE' ? '-' : '+'}
                          {formatCurrency(Math.abs(activity.amount))}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(activity.date).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
