import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings as SettingsIcon,
  HardDrive,
  Folder,
  DownloadCloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Scale,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Edit2,
  Check,
  Lock,
  KeyRound,
  ShieldAlert,
  Unlock,
  Eye,
  EyeOff,
  X
} from 'lucide-react'
import Header from '../components/layout/Header'
import { BackupItem, AuthSettings } from '../types'

export const Settings: React.FC = () => {
  const [backupPath, setBackupPath] = useState<string>('')
  const [drivePath, setDrivePath] = useState<string>('')
  const [backups, setBackups] = useState<BackupItem[]>([])

  const [officeName, setOfficeName] = useState<string>('Alan & Alan Hukuk Bürosu')
  const [officeNameInput, setOfficeNameInput] = useState<string>('Alan & Alan Hukuk Bürosu')
  const [isEditingOfficeName, setIsEditingOfficeName] = useState<boolean>(false)
  const [savingOfficeName, setSavingOfficeName] = useState<boolean>(false)
  const [officeNameStatusMessage, setOfficeNameStatusMessage] = useState<string | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false)
  const [backupStatusMessage, setBackupStatusMessage] = useState<string | null>(null)
  const [backupStatusType, setBackupStatusType] = useState<'success' | 'error' | null>(null)

  // Auth / PIN State
  const [authSettings, setAuthSettings] = useState<AuthSettings>({
    pinEnabled: false,
    autoLockMinutes: 15,
    encryptBackups: false
  })
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false)
  const [pinModalType, setPinModalType] = useState<'set' | 'change' | 'remove'>('set')
  const [currentPin, setCurrentPin] = useState<string>('')
  const [newPin, setNewPin] = useState<string>('')
  const [confirmPin, setConfirmPin] = useState<string>('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccess, setPinSuccess] = useState<string | null>(null)
  const [pinSubmitting, setPinSubmitting] = useState<boolean>(false)
  const [showCurrentPin, setShowCurrentPin] = useState<boolean>(false)
  const [showNewPin, setShowNewPin] = useState<boolean>(false)
  const [showConfirmPin, setShowConfirmPin] = useState<boolean>(false)

  const loadSettingsAndBackups = useCallback(async () => {
    try {
      setLoading(true)
      const [driveSetting, localSetting, officeSetting, backupList, auth] = await Promise.all([
        window.api.settings.get('google_drive_path'),
        window.api.settings.get('local_backup_path'),
        window.api.settings.get('office_name'),
        window.api.backup.getList(),
        window.api.auth.getSettings()
      ])

      if (auth) {
        setAuthSettings(auth)
      }

      // Drive path extraction with safe type checking
      if (typeof driveSetting === 'string') {
        setDrivePath(driveSetting)
      } else if (driveSetting && typeof driveSetting === 'object' && 'google_drive_path' in driveSetting) {
        setDrivePath(String((driveSetting as Record<string, any>)['google_drive_path'] || ''))
      }

      // Local path extraction
      if (typeof localSetting === 'string') {
        setBackupPath(localSetting)
      } else if (localSetting && typeof localSetting === 'object' && 'local_backup_path' in localSetting) {
        setBackupPath(String((localSetting as Record<string, any>)['local_backup_path'] || ''))
      }

      // Office Name extraction
      let currentOfficeName = 'Alan & Alan Hukuk Bürosu'
      if (typeof officeSetting === 'string' && officeSetting.trim()) {
        currentOfficeName = officeSetting.trim()
      } else if (officeSetting && typeof officeSetting === 'object' && 'office_name' in officeSetting) {
        const val = String((officeSetting as Record<string, any>)['office_name'] || '').trim()
        if (val) currentOfficeName = val
      }
      setOfficeName(currentOfficeName)
      setOfficeNameInput(currentOfficeName)

      setBackups(Array.isArray(backupList) ? backupList : [])
    } catch (err: any) {
      console.error('Settings load error:', err)
      setBackupStatusMessage('Ayarlar yüklenirken bir sorun oluştu: ' + (err?.message || ''))
      setBackupStatusType('error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSaveOfficeName = async (): Promise<void> => {
    try {
      setSavingOfficeName(true)
      setOfficeNameStatusMessage(null)
      const cleanName = officeNameInput.trim() || 'Alan & Alan Hukuk Bürosu'
      await window.api.settings.set('office_name', cleanName)
      setOfficeName(cleanName)
      setOfficeNameInput(cleanName)
      setIsEditingOfficeName(false)
      window.dispatchEvent(new CustomEvent('office-name-updated', { detail: cleanName }))
      setOfficeNameStatusMessage('✓ Büro ünvanı başarıyla güncellendi!')
      setTimeout(() => setOfficeNameStatusMessage(null), 3500)
    } catch (err: any) {
      console.error('Save office name error:', err)
      setOfficeNameStatusMessage('Büro ünvanı kaydedilemedi: ' + (err?.message || ''))
    } finally {
      setSavingOfficeName(false)
    }
  }

  useEffect(() => {
    loadSettingsAndBackups()
  }, [loadSettingsAndBackups])

  const handleSelectDriveDirectory = async (): Promise<void> => {
    try {
      const selected = await window.api.backup.selectDirectory()
      if (selected && typeof selected === 'string') {
        setDrivePath(selected)
        await window.api.settings.set('google_drive_path', selected)
        // Automatically perform a sync backup to verify
        const res = await window.api.backup.perform(selected)
        if (res?.success) {
          setBackupStatusMessage('Google Drive klasörü başarıyla bağlandı ve ilk yedek kopyalandı!')
          setBackupStatusType('success')
          const updatedList = await window.api.backup.getList()
          setBackups(updatedList || [])
        } else {
          setBackupStatusMessage('Klasör kaydedildi fakat yedekleme sırasında: ' + (res?.error || ''))
          setBackupStatusType('error')
        }
      }
    } catch (err: any) {
      console.error('Select directory error:', err)
      setBackupStatusMessage('Klasör seçilirken bir hata oluştu: ' + (err?.message || ''))
      setBackupStatusType('error')
    }
  }

  const handleOpenPinModal = (type: 'set' | 'change' | 'remove') => {
    setPinModalType(type)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setPinError(null)
    setPinSuccess(null)
    setShowCurrentPin(false)
    setShowNewPin(false)
    setShowConfirmPin(false)
    setPinModalOpen(true)
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setPinSuccess(null)

    try {
      setPinSubmitting(true)

      if (pinModalType === 'set') {
        if (!newPin || newPin.length < 4 || newPin.length > 12) {
          setPinError('PIN en az 4, en fazla 12 karakter olmalıdır.')
          return
        }
        if (newPin !== confirmPin) {
          setPinError('Yeni PIN ile tekrarı uyuşmuyor.')
          return
        }
        const res = await window.api.auth.setPin(null, newPin)
        if (!res.success) {
          setPinError(res.error || 'PIN belirlenemedi.')
          return
        }
        setPinSuccess('PIN kilidi başarıyla etkinleştirildi!')
      } else if (pinModalType === 'change') {
        if (!currentPin) {
          setPinError('Mevcut PIN kodunuzu giriniz.')
          return
        }
        if (!newPin || newPin.length < 4 || newPin.length > 12) {
          setPinError('Yeni PIN en az 4, en fazla 12 karakter olmalıdır.')
          return
        }
        if (newPin !== confirmPin) {
          setPinError('Yeni PIN ile tekrarı uyuşmuyor.')
          return
        }
        const res = await window.api.auth.setPin(currentPin, newPin)
        if (!res.success) {
          setPinError(res.error || 'PIN değiştirilemedi.')
          return
        }
        setPinSuccess('PIN başarıyla güncellendi!')
      } else if (pinModalType === 'remove') {
        if (!currentPin) {
          setPinError('Mevcut PIN kodunuzu giriniz.')
          return
        }
        const res = await window.api.auth.removePin(currentPin)
        if (!res.success) {
          setPinError(res.error || 'PIN kaldırılamadı.')
          return
        }
        setPinSuccess('PIN kilidi başarıyla kaldırıldı.')
      }

      const updated = await window.api.auth.getSettings()
      if (updated) setAuthSettings(updated)
      window.dispatchEvent(new CustomEvent('app-auth-changed'))

      setTimeout(() => {
        setPinModalOpen(false)
        setPinSuccess(null)
      }, 1200)
    } catch (err: any) {
      console.error('PIN submit error:', err)
      setPinError(err?.message || 'İşlem sırasında beklenmeyen bir hata oluştu.')
    } finally {
      setPinSubmitting(false)
    }
  }

  const handleAutoLockChange = async (minutes: number) => {
    try {
      await window.api.auth.updateSettings({ autoLockMinutes: minutes })
      setAuthSettings((prev) => ({ ...prev, autoLockMinutes: minutes }))
      window.dispatchEvent(new CustomEvent('app-auth-changed'))
    } catch (err) {
      console.error('Auto lock update failed:', err)
    }
  }

  const handleToggleEncryptBackups = async () => {
    try {
      const nextVal = !authSettings.encryptBackups
      await window.api.auth.updateSettings({ encryptBackups: nextVal })
      setAuthSettings((prev) => ({ ...prev, encryptBackups: nextVal }))
      window.dispatchEvent(new CustomEvent('app-auth-changed'))
    } catch (err) {
      console.error('Encrypt backups toggle failed:', err)
    }
  }

  const handleLockNow = () => {
    window.dispatchEvent(new CustomEvent('app-lock-session'))
  }

  const handlePerformBackup = async (): Promise<void> => {
    try {
      setIsBackingUp(true)
      setBackupStatusMessage(null)
      const res = await window.api.backup.perform(drivePath || undefined)

      if (res && res.success) {
        const msg = res.googleDriveCopied
          ? 'Yedekleme tamamlandı! Hem yerel diske hem Google Drive klasörünüze kaydedildi.'
          : 'Yedekleme yerel diske başarıyla kaydedildi.'
        setBackupStatusMessage(msg)
        setBackupStatusType('success')
        const updatedList = await window.api.backup.getList()
        setBackups(updatedList || [])
      } else {
        setBackupStatusMessage(res?.error || 'Yedekleme işlemi tamamlanamadı.')
        setBackupStatusType('error')
      }
    } catch (err: any) {
      console.error('Perform backup error:', err)
      setBackupStatusMessage(err?.message || 'Yedekleme esnasında bir hata oluştu.')
      setBackupStatusType('error')
    } finally {
      setIsBackingUp(false)
    }
  }

  const formatFileSize = (bytes?: number | string): string => {
    if (!bytes) return '-'
    const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes
    if (isNaN(num)) return String(bytes)
    if (num < 1024) return `${num} B`
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
    return `${(num / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (rawDate?: string, timestamp?: string): string => {
    if (timestamp) return timestamp
    if (!rawDate) return '-'
    try {
      const d = new Date(rawDate)
      if (isNaN(d.getTime())) return rawDate
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return String(rawDate)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Header
        title="Ayarlar &amp; Sistem Yedekleme"
        subtitle="Veritabanı güvenliği, bulut senkronizasyonu ve büro bilgileri"
      />

      {/* Notification Toast */}
      {backupStatusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all duration-200 ${
            backupStatusType === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {backupStatusType === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{backupStatusMessage}</span>
          </div>
          <button
            onClick={() => setBackupStatusMessage(null)}
            className="text-xs underline hover:no-underline font-medium"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Section 1: Yedekleme */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <HardDrive className="w-6 h-6 text-[#C9A84C]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Veritabanı ve Dosya Yedekleme</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Müvekkil, dava ve mali kayıtlarınızın güvenliği için tek tıkla tam yedek alın
              </p>
            </div>
          </div>

          <button
            onClick={handlePerformBackup}
            disabled={isBackingUp}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isBackingUp ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#C9A84C]" />
            ) : (
              <DownloadCloud className="w-4 h-4 text-[#C9A84C]" />
            )}
            <span>{isBackingUp ? 'Yedek Alınıyor...' : 'Şimdi Yedekle'}</span>
          </button>
        </div>

        {/* Directory Configurations */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Google Drive / Harici Bulut Yedekleme Yolu
              </label>
              {drivePath ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Bulut Senkronu Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Henüz Drive Seçilmedi
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Örn: Google Drive klasörünüzü seçin..."
                value={drivePath}
                onChange={(e) => setDrivePath(e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
              <button
                onClick={handleSelectDriveDirectory}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold border border-transparent transition-colors cursor-pointer"
              >
                <Folder className="w-4 h-4 text-[#C9A84C]" />
                <span>Drive Klasörü Seç</span>
              </button>
            </div>
            <div className="mt-2 p-3 bg-amber-50/60 border border-amber-200/70 rounded-lg text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold flex items-center gap-1 mb-1 text-amber-950">
                <ShieldCheck className="w-4 h-4 text-[#C9A84C]" />
                Google Drive'a Nasıl Kaydediliyor?
              </p>
              Mac'inizde kurulu Google Drive uygulamasının senkronize ettiği bir klasörü (veya büronuzun ortak Drive klasörünü) buradan seçtiğinizde;
              her müvekkil, dava veya ücret kaydettiğinizde ve her yedeklemede tüm verileriniz anında buraya kopyalanır ve Google Drive tarafından otomatik buluta yüklenir.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Yerel Sistem Varsayılan Yedek Yolu (Bilgisayarınızda)
            </label>
            <div className="px-3.5 py-2 text-xs bg-slate-100/70 border border-slate-200 rounded-lg text-slate-600 font-mono">
              {backupPath || '~/Documents/LexLedger/backups'}
            </div>
          </div>
        </div>

        {/* Past Backups List */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C9A84C]" />
              Geçmiş Yedek Dosyaları
            </h4>
            <span className="text-xs text-slate-400">{backups.length} Yedek Arşivlendi</span>
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#C9A84C]" />
              <span>Yedek listesi kontrol ediliyor...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Henüz alınmış bir yedek dosyası bulunmuyor. 'Şimdi Yedekle' butonuna tıklayarak ilk yedeği oluşturun.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
              {backups.map((b, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                    <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 font-mono text-[11px]">
                          {b.filename}
                        </p>
                        {(b.isEncrypted || b.filename.endsWith('.enc')) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            AES-256 Şifreli
                          </span>
                        )}
                      </div>
                      {b.path && <p className="text-[10px] text-slate-400 truncate max-w-md">{b.path}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <span className="text-slate-500 font-mono">{formatFileSize(b.size)}</span>
                    <span className="text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(b.date || (b as any).createdAt, (b as any).timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section: Güvenlik & PIN Kilidi */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <Lock className="w-6 h-6 text-[#C9A84C]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900">Güvenlik &amp; PIN Kilidi</h3>
                {authSettings.pinEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Kilit Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    <AlertCircle className="w-3 h-3 text-slate-500" />
                    Kilit Devre Dışı
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Avukatlık Kanunu m.36 ve KVKK m.12 gereğince müvekkil ve mali sırlarınızı yetkisiz erişimlere karşı koruyun
              </p>
            </div>
          </div>

          {authSettings.pinEnabled ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLockNow}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Ekranı Şimdi Kilitle"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Şimdi Kilitle</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenPinModal('change')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                PIN Değiştir
              </button>
              <button
                type="button"
                onClick={() => handleOpenPinModal('remove')}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors border border-rose-200 cursor-pointer"
              >
                Kilidi Kaldır
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenPinModal('set')}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-[#C9A84C]" />
              <span>PIN Kilidi Oluştur</span>
            </button>
          )}
        </div>

        {/* Security Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Auto lock timer */}
          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C9A84C]" />
                Otomatik Kilitlenme Süresi
              </label>
              <span className="text-[11px] text-slate-400">
                {authSettings.autoLockMinutes === 0 ? 'Kapalı' : `${authSettings.autoLockMinutes} dk hareketsizlik`}
              </span>
            </div>
            <select
              value={authSettings.autoLockMinutes}
              disabled={!authSettings.pinEnabled}
              onChange={(e) => handleAutoLockChange(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
            >
              <option value={5}>5 Dakika (Yüksek Güvenlik)</option>
              <option value={15}>15 Dakika (Önerilen)</option>
              <option value={30}>30 Dakika</option>
              <option value={60}>1 Saat</option>
              <option value={0}>Asla (Yalnızca elle kilitle)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-2">
              Bilgisayar başında olmadığınızda süre dolunca ekran otomatik olarak PIN ile kilitlenir.
            </p>
          </div>

          {/* Backup encryption toggle */}
          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C9A84C]" />
                  Yedekleri AES-256 ile Şifrele
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authSettings.encryptBackups}
                    onChange={handleToggleEncryptBackups}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F1B2D]"></div>
                </label>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Google Drive veya yerel klasörünüze aktarılan yedek kopyalarını AES-256-GCM kriptografisiyle (.enc) şifreler.
              </p>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 font-mono">
              Durum: {authSettings.encryptBackups ? 'AES-256 Kriptolu Aktif' : 'Standart SQLite Kopyası'}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Uygulama & Büro Bilgileri */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Scale className="w-6 h-6 text-[#C9A84C]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Uygulama &amp; Lisans Bilgileri</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hukuk bürosu kimlik detayları ve yazılım sürüm bilgileri
            </p>
          </div>
        </div>

        {officeNameStatusMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              officeNameStatusMessage.startsWith('✓')
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{officeNameStatusMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Büro Resmi Ünvanı / Avukat Adı
              </span>
              {isEditingOfficeName ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveOfficeName}
                    disabled={savingOfficeName}
                    className="text-xs font-semibold px-2.5 py-1 bg-[#C9A84C] hover:bg-[#b8922d] text-[#0F1B2D] rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingOfficeName ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOfficeNameInput(officeName)
                      setIsEditingOfficeName(false)
                    }}
                    className="text-xs font-medium px-2 py-1 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingOfficeName(true)}
                  className="text-xs font-medium text-[#C9A84C] hover:text-[#b8922d] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Değiştir
                </button>
              )}
            </div>

            {isEditingOfficeName ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={officeNameInput}
                  onChange={(e) => setOfficeNameInput(e.target.value)}
                  placeholder="Örn: Alan & Alan Hukuk Bürosu"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveOfficeName()
                    if (e.key === 'Escape') {
                      setOfficeNameInput(officeName)
                      setIsEditingOfficeName(false)
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-base font-serif text-[#C9A84C]">
                  {officeName}
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-2">
              Sol menüde, raporlarda ve oluşturulan tüm resmi çıktılarda bu isim kullanılır.
            </p>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg">
            <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
              Yazılım Versiyonu
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-800 text-sm">LexLedger v1.0.0</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Güncel Sürüm
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Masaüstü işletim sistemi için optimize edilmiş çevrimdışı ve güvenli sürüm.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 text-xs text-slate-500 leading-relaxed">
          Bu yazılım {officeName} için özel olarak geliştirilmiş kurumsal dava,
          vekalet ücreti ve mali operasyon takip platformudur. Tüm verileriniz yerel SQLite şifreli
          veritabanında saklanır ve üçüncü şahıslarla paylaşılmaz.
        </div>
      </div>

      {/* PIN Configuration Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0F1B2D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-[#C9A84C]" />
                <h3 className="font-bold text-sm tracking-tight">
                  {pinModalType === 'set' && 'Güvenlik PIN Kilidi Belirle'}
                  {pinModalType === 'change' && 'PIN Kodunu Değiştir'}
                  {pinModalType === 'remove' && 'PIN Kilidini Kaldır'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePinSubmit} className="p-6 space-y-4">
              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              {/* Current PIN (for change or remove) */}
              {(pinModalType === 'change' || pinModalType === 'remove') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mevcut PIN Kodunuz
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPin ? 'text' : 'password'}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="Mevcut PIN..."
                      maxLength={12}
                      autoFocus
                      required
                      className="w-full px-3 py-2 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPin(!showCurrentPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New PIN & Confirm (for set or change) */}
              {(pinModalType === 'set' || pinModalType === 'change') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {pinModalType === 'set' ? 'Yeni PIN (4-12 Karakter)' : 'Yeni PIN Kodu'}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="Örn: 123456"
                        maxLength={12}
                        autoFocus={pinModalType === 'set'}
                        required
                        className="w-full px-3 py-2 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Yeni PIN Tekrarı
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPin ? 'text' : 'password'}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="Yeni PIN tekrar..."
                        maxLength={12}
                        required
                        className="w-full px-3 py-2 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  disabled={pinSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={pinSubmitting}
                  className={`px-5 py-2 text-xs font-bold rounded-lg text-white transition-colors flex items-center gap-2 cursor-pointer shadow-sm ${
                    pinModalType === 'remove'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#0F1B2D] hover:bg-slate-800'
                  }`}
                >
                  {pinSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C9A84C]" />}
                  <span>
                    {pinModalType === 'set' && 'PIN Kilidini Etkinleştir'}
                    {pinModalType === 'change' && 'PIN Kodunu Güncelle'}
                    {pinModalType === 'remove' && 'Kilidi Kaldır'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
