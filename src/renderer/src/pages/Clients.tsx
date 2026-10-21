import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  Trash2,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import { Client } from '../types'

export const Clients: React.FC = () => {
  const navigate = useNavigate()

  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Modal State for New Client
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
  const [formData, setFormData] = useState({
    name: '',
    tc_no: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete Confirmation State
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = searchQuery.trim()
        ? await window.api.clients.search(searchQuery.trim())
        : await window.api.clients.getAll()
      setClients(data || [])
    } catch (err: any) {
      console.error('Clients fetch error:', err)
      setError(err?.message || 'Müvekkil listesi yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchClients()
    }, 250)
    return () => clearTimeout(debounceTimer)
  }, [fetchClients])

  const handleOpenAddModal = (): void => {
    setFormData({
      name: '',
      tc_no: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    })
    setFormError(null)
    setIsAddModalOpen(true)
  }

  const handleCreateClient = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Müvekkil Adı ve Soyadı zorunludur.')
      return
    }

    try {
      setFormSubmitting(true)
      setFormError(null)

      const created = await window.api.clients.create({
        name: formData.name.trim(),
        tc_no: formData.tc_no.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined
      })

      setIsAddModalOpen(false)
      await fetchClients()
      if (created && created.id) {
        navigate(`/clients/${created.id}`)
      }
    } catch (err: any) {
      console.error('Create client error:', err)
      setFormError(err?.message || 'Müvekkil eklenirken hata oluştu.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteClient = async (): Promise<void> => {
    if (!clientToDelete) return

    try {
      setIsDeleting(true)
      await window.api.clients.delete(clientToDelete.id)
      setClientToDelete(null)
      await fetchClients()
    } catch (err: any) {
      console.error('Delete client error:', err)
      alert(err?.message || 'Müvekkil silinirken bir hata oluştu.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <Header
        title="Müvekkiller"
        subtitle={`Toplam ${clients.length} kayıtlı müvekkil`}
        actionButton={
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#C9A84C]" />
            <span>Yeni Müvekkil Ekle</span>
          </button>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="İsim, T.C. Kimlik veya telefon ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
            onClick={fetchClients}
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
            <p className="text-sm font-medium text-slate-500">Müvekkiller listeleniyor...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && clients.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? 'Sonuç Bulunamadı' : 'Henüz Müvekkil Kaydedilmemiş'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {searchQuery
              ? `"${searchQuery}" aramasıyla eşleşen bir müvekkil kaydı bulunamadı.`
              : 'Yeni bir müvekkil ekleyerek dava ve vekalet ücreti takibine başlayabilirsiniz.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-[#C9A84C]" />
              <span>İlk Müvekkili Ekle</span>
            </button>
          )}
        </div>
      )}

      {/* Client Cards Grid */}
      {!loading && !error && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="group bg-white rounded-xl border border-slate-200 hover:border-[#C9A84C]/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 group-hover:bg-[#C9A84C]/15 text-[#0F1B2D] group-hover:text-gold-600 flex items-center justify-center font-bold text-base transition-colors border border-slate-200/60">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800 group-hover:text-[#C9A84C] transition-colors leading-tight">
                        {client.name}
                      </h4>
                      {client.tc_no && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 mt-0.5">
                          <CreditCard className="w-3 h-3" />
                          TC: {client.tc_no}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setClientToDelete(client)
                    }}
                    title="Müvekkili Sil"
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                  {client.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">Telefon belirtilmemiş</div>
                  )}

                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}

                  {client.address && (
                    <div className="flex items-start gap-2 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-[#C9A84C] transition-colors">
                <span>Detayları Görüntüle</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !formSubmitting && setIsAddModalOpen(false)}
        title="Yeni Müvekkil Ekle"
        size="md"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ad Soyad / Kurum Ünvanı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Ahmet Yılmaz veya ABC Ltd. Şti."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                T.C. Kimlik / Vergi No
              </label>
              <input
                type="text"
                placeholder="11 haneli T.C. veya VKN"
                value={formData.tc_no}
                onChange={(e) => setFormData({ ...formData, tc_no: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefon Numarası
              </label>
              <input
                type="text"
                placeholder="05XX XXX XX XX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-posta Adresi
            </label>
            <input
              type="email"
              placeholder="ornek@alan.av.tr"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adres</label>
            <textarea
              rows={2}
              placeholder="Açık adres bilgisi..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Özel Notlar</label>
            <textarea
              rows={2}
              placeholder="Müvekkil ile ilgili başlangıç notları..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {formSubmitting && <RefreshCw className="w-4 h-4 animate-spin text-[#C9A84C]" />}
              <span>{formSubmitting ? 'Kaydediliyor...' : 'Müvekkili Kaydet'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!clientToDelete}
        onClose={() => !isDeleting && setClientToDelete(null)}
        title="Müvekkili Sil"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{clientToDelete?.name}</span> adlı müvekkili
            silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setClientToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteClient}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isDeleting ? 'Siliniyor...' : 'Evet, Sil'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Clients
