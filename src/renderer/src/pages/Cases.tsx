import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import Header from '../components/layout/Header'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { Case, Client } from '../types'

export const Cases: React.FC = () => {
  const navigate = useNavigate()

  const [cases, setCases] = useState<Case[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // New Case Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    type: 'DAVA' as Case['type'],
    court: '',
    file_no: '',
    status: 'DEVAM_EDIYOR' as Case['status'],
    description: '',
    opened_at: new Date().toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadCasesAndClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [allCases, allClients] = await Promise.all([
        window.api.cases.getAll(),
        window.api.clients.getAll()
      ])
      setCases(allCases || [])
      setClients(allClients || [])
    } catch (err: any) {
      console.error('Error loading cases:', err)
      setError(err?.message || 'Dava listesi yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCasesAndClients()
  }, [loadCasesAndClients])

  const filteredCases = cases.filter((c) => {
    const matchesQuery =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.file_no && c.file_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.court && c.court.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.client_name && c.client_name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = selectedType === 'ALL' || c.type === selectedType
    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus

    return matchesQuery && matchesType && matchesStatus
  })

  const activeCount = cases.filter((c) => c.status === 'DEVAM_EDIYOR').length
  const closedCount = cases.filter((c) => c.status === 'SONUCLANDI').length
  const suspendedCount = cases.filter((c) => c.status === 'ASKIYA_ALINDI').length

  const handleOpenAddModal = (): void => {
    setFormData({
      client_id: clients.length > 0 ? String(clients[0].id) : '',
      title: '',
      type: 'DAVA',
      court: '',
      file_no: '',
      status: 'DEVAM_EDIYOR',
      description: '',
      opened_at: new Date().toISOString().split('T')[0]
    })
    setFormError(null)
    setIsAddModalOpen(true)
  }

  const handleCreateCase = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.client_id) {
      setFormError('Lütfen müvekkil seçimi yapın ve dava başlığını girin.')
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      await window.api.cases.create({
        client_id: Number(formData.client_id),
        title: formData.title.trim(),
        type: formData.type,
        court: formData.court.trim() || undefined,
        file_no: formData.file_no.trim() || undefined,
        status: formData.status,
        description: formData.description.trim() || undefined,
        opened_at: formData.opened_at
      })

      setIsAddModalOpen(false)
      await loadCasesAndClients()
    } catch (err: any) {
      console.error('Create case error:', err)
      setFormError(err?.message || 'Dava kaydı oluşturulamadı.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Davalar ve Dosyalar"
        subtitle={`Toplam ${cases.length} dosya kaydı`}
        actionButton={
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9A84C]" />
            <span>Yeni Dava Ekle</span>
          </button>
        }
      />

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Devam Eden Davalar</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{activeCount}</h4>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Sonuçlanan Dosyalar</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{closedCount}</h4>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">Askıya Alınanlar</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{suspendedCount}</h4>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Dava başlığı, dosya no, mahkeme veya müvekkil ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Tür:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
            >
              <option value="ALL">Tümü</option>
              <option value="DAVA">Dava</option>
              <option value="İCRA">İcra</option>
              <option value="DANIŞMA">Danışma</option>
              <option value="DİĞER">Diğer</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Durum:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
            >
              <option value="ALL">Tümü</option>
              <option value="DEVAM_EDIYOR">Devam Ediyor</option>
              <option value="SONUCLANDI">Sonuçlandı</option>
              <option value="ASKIYA_ALINDI">Askıya Alındı</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadCasesAndClients}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C9A84C]" />
            <p className="text-sm font-medium text-slate-500">Davalar listeleniyor...</p>
          </div>
        </div>
      )}

      {/* Cases Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-sm">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-base font-semibold text-slate-700">Dosya Bulunamadı</p>
              <p className="text-xs text-slate-400 mt-1">
                Arama kriterlerine uygun dava veya dosya kaydı mevcut değil.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Müvekkil</th>
                    <th className="py-3.5 px-4">Tür</th>
                    <th className="py-3.5 px-4">Dava Başlığı</th>
                    <th className="py-3.5 px-4">Mahkeme</th>
                    <th className="py-3.5 px-4">Dosya No</th>
                    <th className="py-3.5 px-4">Durum</th>
                    <th className="py-3.5 px-4">Tarih</th>
                    <th className="py-3.5 px-4 text-right">Git</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/clients/${c.client_id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#C9A84C] transition-colors">
                        {c.client_name || `Müvekkil #${c.client_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge type={c.type} />
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">
                        {c.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{c.court || '-'}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {c.file_no || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge type={c.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {c.opened_at
                          ? new Date(c.opened_at).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex p-1 text-slate-400 group-hover:text-[#C9A84C] group-hover:translate-x-1 transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Case Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !submitting && setIsAddModalOpen(false)}
        title="Yeni Dava / Dosya Oluştur"
        size="md"
      >
        <form onSubmit={handleCreateCase} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Müvekkil <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            >
              <option value="">-- Müvekkil Seçin --</option>
              {clients.map((cli) => (
                <option key={cli.id} value={cli.id}>
                  {cli.name} {cli.tc_no ? `(TC: ${cli.tc_no})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dava Başlığı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Tapu İptal ve Tescil Davası"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dava Türü</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as Case['type'] })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="DAVA">Dava</option>
                <option value="İCRA">İcra</option>
                <option value="DANIŞMA">Danışma</option>
                <option value="DİĞER">Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dava Durumu</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as Case['status'] })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                <option value="SONUCLANDI">Sonuçlandı</option>
                <option value="ASKIYA_ALINDI">Askıya Alındı</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mahkeme / Daire
              </label>
              <input
                type="text"
                placeholder="Örn: İstanbul 12. Asliye Hukuk"
                value={formData.court}
                onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dosya / Esas No</label>
              <input
                type="text"
                placeholder="Örn: 2024/512 E."
                value={formData.file_no}
                onChange={(e) => setFormData({ ...formData, file_no: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Açılış Tarihi</label>
            <input
              type="date"
              value={formData.opened_at}
              onChange={(e) => setFormData({ ...formData, opened_at: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dosya Açıklaması</label>
            <textarea
              rows={2}
              placeholder="Konu, talep veya özel bilgiler..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsAddModalOpen(false)}
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
              <span>{submitting ? 'Kaydediliyor...' : 'Davayı Kaydet'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Cases
