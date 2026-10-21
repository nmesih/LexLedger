import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  Briefcase,
  Coins,
  Receipt,
  FileText,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  DollarSign,
  X,
  History,
  CalendarClock,
  Split
} from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import {
  Client,
  Case,
  Fee,
  FeePayment,
  FeeInstallment,
  ClientExpense
} from '../types'

type ActiveTab = 'davalar' | 'ucretler' | 'masraflar' | 'notlar'

export const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const clientId = Number(id)
  const navigate = useNavigate()

  const [client, setClient] = useState<Client | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [fees, setFees] = useState<Fee[]>([])
  const [expenses, setExpenses] = useState<ClientExpense[]>([])
  const [notes, setNotes] = useState<string>('')
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<ActiveTab>('davalar')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Client Modal State
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState<boolean>(false)
  const [clientFormData, setClientFormData] = useState({
    name: '',
    tc_no: '',
    phone: '',
    email: '',
    address: ''
  })

  // Case Modal State
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(false)
  const [editingCase, setEditingCase] = useState<Case | null>(null)
  const [caseFormData, setCaseFormData] = useState({
    title: '',
    type: 'DAVA' as Case['type'],
    court: '',
    file_no: '',
    status: 'DEVAM_EDIYOR' as Case['status'],
    description: '',
    opened_at: new Date().toISOString().split('T')[0]
  })

  // Fee Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState<boolean>(false)
  const [feeFormData, setFeeFormData] = useState({
    description: '',
    total_amount: '',
    case_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    is_installment: false,
    installment_count: 3,
    installments: [] as Array<{
      installment_no: number
      amount: string
      due_date: string
      notes: string
    }>
  })

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false)
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<Fee | null>(null)
  const [selectedInstallmentForPayment, setSelectedInstallmentForPayment] = useState<FeeInstallment | null>(null)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'HAVALE' as FeePayment['payment_method'],
    notes: ''
  })

  // Fee Payments & Installments History View State
  const [expandedFeeId, setExpandedFeeId] = useState<number | null>(null)
  const [feePaymentsList, setFeePaymentsList] = useState<{ [feeId: number]: FeePayment[] }>({})
  const [feeInstallmentsList, setFeeInstallmentsList] = useState<{ [feeId: number]: FeeInstallment[] }>({})
  const [loadingPayments, setLoadingPayments] = useState<boolean>(false)

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false)
  const [editingExpense, setEditingExpense] = useState<ClientExpense | null>(null)
  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    paid_by: 'OFİS' as ClientExpense['paid_by'],
    case_id: '',
    date: new Date().toISOString().split('T')[0],
    reimbursed: false,
    reimbursed_amount: '0'
  })

  // Notes state
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false)

  // Modal Submitting
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const formatCurrency = (amount: number): string => {
    return (amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  }

  const loadClientDetails = useCallback(async () => {
    if (!clientId) return
    try {
      setLoading(true)
      setError(null)

      const [clientRes, casesRes, feesRes, expensesRes, notesRes, allClientInstallments] = await Promise.all([
        window.api.clients.getById(clientId),
        window.api.cases.getByClientId(clientId),
        window.api.fees.getByClientId(clientId),
        window.api.clientExpenses.getByClientId(clientId),
        window.api.notes.getByClientId(clientId),
        window.api.feeInstallments.getByClientId(clientId).catch(() => [])
      ])

      if (!clientRes) {
        setError('Müvekkil bulunamadı.')
        return
      }

      setClient(clientRes)
      setCases(casesRes || [])
      setFees(feesRes || [])
      setExpenses(expensesRes || [])

      // Group installments by fee_id
      if (Array.isArray(allClientInstallments)) {
        const grouped: { [feeId: number]: FeeInstallment[] } = {}
        for (const item of allClientInstallments) {
          if (!grouped[item.fee_id]) grouped[item.fee_id] = []
          grouped[item.fee_id].push(item)
        }
        setFeeInstallmentsList(grouped)
      }

      if (typeof notesRes === 'string') {
        setNotes(notesRes)
      } else if (notesRes && typeof notesRes === 'object') {
        setNotes(notesRes.content || '')
        if (notesRes.updated_at) {
          setNotesSavedAt(notesRes.updated_at)
        }
      } else {
        setNotes(clientRes.notes || '')
      }
    } catch (err: any) {
      console.error('Error loading client detail:', err)
      setError(err?.message || 'Müvekkil bilgileri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadClientDetails()
  }, [loadClientDetails])

  // EDIT CLIENT
  const handleOpenEditClient = (): void => {
    if (!client) return
    setClientFormData({
      name: client.name,
      tc_no: client.tc_no || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || ''
    })
    setModalError(null)
    setIsEditClientModalOpen(true)
  }

  const handleUpdateClient = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!clientFormData.name.trim()) {
      setModalError('Müvekkil adı zorunludur.')
      return
    }

    try {
      setSubmitting(true)
      setModalError(null)
      await window.api.clients.update(clientId, {
        name: clientFormData.name.trim(),
        tc_no: clientFormData.tc_no.trim() || undefined,
        phone: clientFormData.phone.trim() || undefined,
        email: clientFormData.email.trim() || undefined,
        address: clientFormData.address.trim() || undefined
      })
      setIsEditClientModalOpen(false)
      await loadClientDetails()
    } catch (err: any) {
      console.error('Update client error:', err)
      setModalError(err?.message || 'Müvekkil güncellenemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  // CASES ACTIONS
  const handleOpenAddCase = (): void => {
    setEditingCase(null)
    setCaseFormData({
      title: '',
      type: 'DAVA',
      court: '',
      file_no: '',
      status: 'DEVAM_EDIYOR',
      description: '',
      opened_at: new Date().toISOString().split('T')[0]
    })
    setModalError(null)
    setIsCaseModalOpen(true)
  }

  const handleOpenEditCase = (c: Case): void => {
    setEditingCase(c)
    setCaseFormData({
      title: c.title,
      type: c.type,
      court: c.court || '',
      file_no: c.file_no || '',
      status: c.status,
      description: c.description || '',
      opened_at: c.opened_at ? c.opened_at.split('T')[0] : ''
    })
    setModalError(null)
    setIsCaseModalOpen(true)
  }

  const handleSaveCase = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!caseFormData.title.trim()) {
      setModalError('Dava başlığı zorunludur.')
      return
    }

    try {
      setSubmitting(true)
      setModalError(null)

      if (editingCase) {
        await window.api.cases.update(editingCase.id, {
          title: caseFormData.title.trim(),
          type: caseFormData.type,
          court: caseFormData.court.trim() || undefined,
          file_no: caseFormData.file_no.trim() || undefined,
          status: caseFormData.status,
          description: caseFormData.description.trim() || undefined,
          opened_at: caseFormData.opened_at
        })
      } else {
        await window.api.cases.create({
          client_id: clientId,
          title: caseFormData.title.trim(),
          type: caseFormData.type,
          court: caseFormData.court.trim() || undefined,
          file_no: caseFormData.file_no.trim() || undefined,
          status: caseFormData.status,
          description: caseFormData.description.trim() || undefined,
          opened_at: caseFormData.opened_at
        })
      }

      setIsCaseModalOpen(false)
      const updatedCases = await window.api.cases.getByClientId(clientId)
      setCases(updatedCases || [])
    } catch (err: any) {
      console.error('Save case error:', err)
      setModalError(err?.message || 'Dava kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCase = async (caseId: number): Promise<void> => {
    if (!confirm('Bu davayı silmek istediğinize emin misiniz?')) return
    try {
      await window.api.cases.delete(caseId)
      const updated = await window.api.cases.getByClientId(clientId)
      setCases(updated || [])
    } catch (err: any) {
      console.error('Delete case error:', err)
      alert(err?.message || 'Dava silinemedi.')
    }
  }

  // FEES ACTIONS
  const handleOpenAddFee = (): void => {
    setFeeFormData({
      description: '',
      total_amount: '',
      case_id: cases.length > 0 ? String(cases[0].id) : '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      is_installment: false,
      installment_count: 3,
      installments: []
    })
    setModalError(null)
    setIsFeeModalOpen(true)
  }

  const handleGenerateInstallments = (count: number, totalAmountStr: string, startDateStr: string): void => {
    const total = parseFloat(totalAmountStr)
    if (isNaN(total) || total <= 0) {
      setModalError('Taksitleri bölmek için önce geçerli bir Toplam Ücret girin.')
      return
    }

    const safeCount = Math.max(2, Math.min(24, count || 3))
    const baseAmount = Math.floor((total / safeCount) * 100) / 100
    const remainder = Math.round((total - baseAmount * safeCount) * 100) / 100

    const newInstallments = []
    const start = startDateStr ? new Date(startDateStr) : new Date()

    for (let i = 0; i < safeCount; i++) {
      const dueDate = new Date(start)
      dueDate.setMonth(dueDate.getMonth() + i)
      const datePart = dueDate.toISOString().split('T')[0]
      const amountVal = i === safeCount - 1 ? (baseAmount + remainder).toFixed(2) : baseAmount.toFixed(2)

      newInstallments.push({
        installment_no: i + 1,
        amount: amountVal,
        due_date: datePart,
        notes: `${i + 1}. Taksit`
      })
    }

    setFeeFormData((prev) => ({
      ...prev,
      installment_count: safeCount,
      installments: newInstallments
    }))
    setModalError(null)
  }

  const handleSaveFee = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const amountNum = parseFloat(feeFormData.total_amount)
    if (!feeFormData.description.trim() || isNaN(amountNum) || amountNum <= 0) {
      setModalError('Lütfen geçerli bir açıklama ve toplam tutar girin.')
      return
    }

    if (feeFormData.is_installment) {
      if (!feeFormData.installments || feeFormData.installments.length === 0) {
        setModalError('Taksitli seçildiğinde lütfen en az 2 taksit oluşturun.')
        return
      }

      // Check sum of installments
      const installmentSum = feeFormData.installments.reduce(
        (sum, item) => sum + (parseFloat(item.amount) || 0),
        0
      )
      if (Math.abs(installmentSum - amountNum) > 1) {
        setModalError(
          `Taksit tutarları toplamı (${formatCurrency(installmentSum)}) toplam ücretten (${formatCurrency(
            amountNum
          )}) farklı olamaz.`
        )
        return
      }
    }

    try {
      setSubmitting(true)
      setModalError(null)

      const feePayload = {
        client_id: clientId,
        case_id: feeFormData.case_id ? Number(feeFormData.case_id) : null,
        description: feeFormData.description.trim(),
        total_amount: amountNum,
        date: feeFormData.date,
        notes: feeFormData.notes.trim() || null
      }

      if (feeFormData.is_installment && feeFormData.installments.length > 0) {
        const instPayload = feeFormData.installments.map((inst) => ({
          installment_no: inst.installment_no,
          amount: parseFloat(inst.amount) || 0,
          due_date: inst.due_date,
          notes: inst.notes || null
        }))
        await window.api.feeInstallments.createWithFee(feePayload, instPayload)
      } else {
        await window.api.fees.create(feePayload)
      }

      setIsFeeModalOpen(false)
      const updated = await window.api.fees.getByClientId(clientId)
      setFees(updated || [])
    } catch (err: any) {
      console.error('Save fee error:', err)
      setModalError(err?.message || 'Ücret kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFee = async (feeId: number): Promise<void> => {
    if (!confirm('Bu vekalet ücretini, taksitlerini ve ilişkili ödemeleri silmek istediğinize emin misiniz?')) return
    try {
      await window.api.fees.delete(feeId)
      const updated = await window.api.fees.getByClientId(clientId)
      setFees(updated || [])
    } catch (err: any) {
      console.error('Delete fee error:', err)
      alert(err?.message || 'Ücret silinemedi.')
    }
  }

  // PAYMENT ACTIONS
  const handleOpenTakePayment = (fee: Fee): void => {
    setSelectedFeeForPayment(fee)
    setSelectedInstallmentForPayment(null)
    const remaining = Math.max(0, fee.total_amount - (fee.collected_amount || 0))
    setPaymentFormData({
      amount: remaining > 0 ? String(remaining) : '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'HAVALE',
      notes: ''
    })
    setModalError(null)
    setIsPaymentModalOpen(true)
  }

  const handleOpenPayInstallment = (fee: Fee, inst: FeeInstallment): void => {
    setSelectedFeeForPayment(fee)
    setSelectedInstallmentForPayment(inst)
    setPaymentFormData({
      amount: String(inst.amount),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'HAVALE',
      notes: `${inst.installment_no}. Taksit Tahsilatı`
    })
    setModalError(null)
    setIsPaymentModalOpen(true)
  }

  const handleSavePayment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedFeeForPayment) return
    const amountNum = parseFloat(paymentFormData.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError('Lütfen geçerli bir ödeme tutarı girin.')
      return
    }

    try {
      setSubmitting(true)
      setModalError(null)

      if (selectedInstallmentForPayment) {
        await window.api.feeInstallments.pay(selectedInstallmentForPayment.id, {
          amount: amountNum,
          payment_date: paymentFormData.payment_date,
          payment_method: paymentFormData.payment_method,
          notes: paymentFormData.notes.trim() || undefined
        })
      } else {
        await window.api.feePayments.create({
          fee_id: selectedFeeForPayment.id,
          amount: amountNum,
          payment_date: paymentFormData.payment_date,
          payment_method: paymentFormData.payment_method,
          notes: paymentFormData.notes.trim() || undefined
        })
      }

      setIsPaymentModalOpen(false)
      const updatedFees = await window.api.fees.getByClientId(clientId)
      setFees(updatedFees || [])

      if (expandedFeeId === selectedFeeForPayment.id) {
        const [payments, installments] = await Promise.all([
          window.api.feePayments.getByFeeId(selectedFeeForPayment.id),
          window.api.feeInstallments.getByFeeId(selectedFeeForPayment.id)
        ])
        setFeePaymentsList((prev) => ({ ...prev, [selectedFeeForPayment.id]: payments || [] }))
        setFeeInstallmentsList((prev) => ({ ...prev, [selectedFeeForPayment.id]: installments || [] }))
      }
    } catch (err: any) {
      console.error('Save payment error:', err)
      setModalError(err?.message || 'Ödeme kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleFeePayments = async (feeId: number): Promise<void> => {
    if (expandedFeeId === feeId) {
      setExpandedFeeId(null)
      return
    }

    try {
      setLoadingPayments(true)
      setExpandedFeeId(feeId)
      const [payments, installments] = await Promise.all([
        window.api.feePayments.getByFeeId(feeId),
        window.api.feeInstallments.getByFeeId(feeId)
      ])
      setFeePaymentsList((prev) => ({ ...prev, [feeId]: payments || [] }))
      setFeeInstallmentsList((prev) => ({ ...prev, [feeId]: installments || [] }))
    } catch (err) {
      console.error('Error fetching fee payments and installments:', err)
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleDeletePayment = async (feeId: number, paymentId: number): Promise<void> => {
    if (!confirm('Bu tahsilat kaydını silmek istediğinize emin misiniz?')) return
    try {
      await window.api.feePayments.delete(paymentId)
      const updatedFees = await window.api.fees.getByClientId(clientId)
      setFees(updatedFees || [])
      const updatedPayments = await window.api.feePayments.getByFeeId(feeId)
      setFeePaymentsList((prev) => ({ ...prev, [feeId]: updatedPayments || [] }))
    } catch (err: any) {
      console.error('Delete payment error:', err)
      alert(err?.message || 'Ödeme kaydı silinemedi.')
    }
  }

  // EXPENSES ACTIONS
  const handleOpenAddExpense = (): void => {
    setEditingExpense(null)
    setExpenseFormData({
      description: '',
      amount: '',
      paid_by: 'OFİS',
      case_id: cases.length > 0 ? String(cases[0].id) : '',
      date: new Date().toISOString().split('T')[0],
      reimbursed: false,
      reimbursed_amount: '0'
    })
    setModalError(null)
    setIsExpenseModalOpen(true)
  }

  const handleOpenEditExpense = (exp: ClientExpense): void => {
    setEditingExpense(exp)
    setExpenseFormData({
      description: exp.description,
      amount: String(exp.amount),
      paid_by: exp.paid_by,
      case_id: exp.case_id ? String(exp.case_id) : '',
      date: exp.date ? exp.date.split('T')[0] : '',
      reimbursed: exp.reimbursed,
      reimbursed_amount: String(exp.reimbursed_amount || 0)
    })
    setModalError(null)
    setIsExpenseModalOpen(true)
  }

  const handleSaveExpense = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const amountNum = parseFloat(expenseFormData.amount)
    if (!expenseFormData.description.trim() || isNaN(amountNum) || amountNum <= 0) {
      setModalError('Lütfen geçerli bir açıklama ve masraf tutarı girin.')
      return
    }

    try {
      setSubmitting(true)
      setModalError(null)

      const payload = {
        client_id: clientId,
        case_id: expenseFormData.case_id ? Number(expenseFormData.case_id) : null,
        description: expenseFormData.description.trim(),
        amount: amountNum,
        paid_by: expenseFormData.paid_by,
        date: expenseFormData.date,
        reimbursed: expenseFormData.reimbursed ? 1 : 0,
        reimbursed_amount: expenseFormData.reimbursed ? amountNum : parseFloat(expenseFormData.reimbursed_amount) || 0
      }

      if (editingExpense) {
        await window.api.clientExpenses.update(editingExpense.id, payload)
      } else {
        await window.api.clientExpenses.create(payload)
      }

      setIsExpenseModalOpen(false)
      const updated = await window.api.clientExpenses.getByClientId(clientId)
      setExpenses(updated || [])
    } catch (err: any) {
      console.error('Save expense error:', err)
      setModalError(err?.message || 'Masraf kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleReimbursed = async (exp: ClientExpense): Promise<void> => {
    try {
      const nextStatus = !exp.reimbursed
      await window.api.clientExpenses.update(exp.id, {
        reimbursed: nextStatus ? 1 : 0,
        reimbursed_amount: nextStatus ? exp.amount : 0
      } as any)
      const updated = await window.api.clientExpenses.getByClientId(clientId)
      setExpenses(updated || [])
    } catch (err: any) {
      console.error('Toggle reimbursed error:', err)
      alert('Masraf iade durumu güncellenemedi.')
    }
  }

  const handleDeleteExpense = async (expId: number): Promise<void> => {
    if (!confirm('Bu masraf kaydını silmek istediğinize emin misiniz?')) return
    try {
      await window.api.clientExpenses.delete(expId)
      const updated = await window.api.clientExpenses.getByClientId(clientId)
      setExpenses(updated || [])
    } catch (err: any) {
      console.error('Delete expense error:', err)
      alert(err?.message || 'Masraf kaydı silinemedi.')
    }
  }

  // NOTES ACTIONS
  const handleSaveNotes = async (): Promise<void> => {
    try {
      setIsSavingNotes(true)
      await window.api.notes.save(clientId, notes)
      const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      setNotesSavedAt(`Son kayıt: Bugün ${nowStr}`)
    } catch (err: any) {
      console.error('Save notes error:', err)
      alert('Notlar kaydedilirken bir hata oluştu.')
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Expense calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const reimbursedExpenses = expenses.reduce(
    (sum, e) => sum + (e.reimbursed ? e.amount : e.reimbursed_amount || 0),
    0
  )
  const pendingExpenses = Math.max(0, totalExpenses - reimbursedExpenses)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#C9A84C]" />
          <p className="text-sm font-medium text-slate-500">Müvekkil detayları yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Müvekkillere Geri Dön</span>
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
          <p className="font-semibold">{error || 'Müvekkil bulunamadı.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-[#C9A84C]" />
          <span>Müvekkiller Listesi</span>
        </button>

        <button
          onClick={handleOpenEditClient}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 shadow-sm transition-colors"
        >
          <Edit2 className="w-4 h-4 text-[#C9A84C]" />
          <span>Müvekkil Bilgilerini Düzenle</span>
        </button>
      </div>

      {/* 2. Client Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F1B2D] to-slate-800 text-[#C9A84C] flex items-center justify-center font-bold text-2xl shadow-md border border-slate-700">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                {client.tc_no && (
                  <span className="flex items-center gap-1 font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    TC: {client.tc_no}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Kayıt:{' '}
                  {new Date(client.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info Items */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
            <Phone className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Telefon</p>
              <p className="text-slate-800 font-medium mt-0.5">{client.phone || 'Belirtilmedi'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
            <Mail className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
            <div className="truncate">
              <p className="text-[10px] uppercase font-semibold text-slate-400">E-Posta</p>
              <p className="text-slate-800 font-medium mt-0.5 truncate">
                {client.email || 'Belirtilmedi'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
            <MapPin className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Adres</p>
              <p className="text-slate-800 font-medium mt-0.5 line-clamp-1">
                {client.address || 'Belirtilmedi'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('davalar')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'davalar'
                ? 'border-[#C9A84C] text-[#0F1B2D]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Davalar &amp; Dosyalar</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-normal">
              {cases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ucretler')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ucretler'
                ? 'border-[#C9A84C] text-[#0F1B2D]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Vekalet Ücretleri</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-normal">
              {fees.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('masraflar')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'masraflar'
                ? 'border-[#C9A84C] text-[#0F1B2D]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Dava Masrafları</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-normal">
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notlar')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'notlar'
                ? 'border-[#C9A84C] text-[#0F1B2D]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Müvekkil Notları</span>
          </button>
        </nav>
      </div>

      {/* TAB CONTENT 1: DAVALAR */}
      {activeTab === 'davalar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Kayıtlı Davalar</h3>
            <button
              onClick={handleOpenAddCase}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C9A84C]" />
              <span>Yeni Dava Ekle</span>
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center shadow-sm">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Bu müvekkile ait henüz bir dava kaydı bulunmuyor.
              </p>
              <button
                onClick={handleOpenAddCase}
                className="mt-3 text-xs text-[#C9A84C] hover:underline font-semibold"
              >
                + İlk Davayı Ekle
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tür</th>
                      <th className="py-3 px-4">Başlık</th>
                      <th className="py-3 px-4">Mahkeme</th>
                      <th className="py-3 px-4">Dosya No</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4">Açılış Tarihi</th>
                      <th className="py-3 px-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <Badge type={c.type} />
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                          {c.title}
                          {c.description && (
                            <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
                              {c.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">{c.court || '-'}</td>
                        <td className="py-3 px-4 font-mono text-xs">{c.file_no || '-'}</td>
                        <td className="py-3 px-4">
                          <Badge type={c.status} />
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {c.opened_at
                            ? new Date(c.opened_at).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditCase(c)}
                              title="Düzenle"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCase(c.id)}
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
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ÜCRETLER */}
      {activeTab === 'ucretler' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Vekalet Ücretleri &amp; Tahsilatlar</h3>
            <button
              onClick={handleOpenAddFee}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C9A84C]" />
              <span>Yeni Ücret Belirle</span>
            </button>
          </div>

          {fees.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center shadow-sm">
              <Coins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Bu müvekkil için tanımlanmış bir ücret kaydı bulunmuyor.
              </p>
              <button
                onClick={handleOpenAddFee}
                className="mt-3 text-xs text-[#C9A84C] hover:underline font-semibold"
              >
                + Vekalet Ücreti Ekle
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {fees.map((fee) => {
                const collected = fee.collected_amount || 0
                const remaining = Math.max(0, fee.total_amount - collected)
                const isPaid = remaining <= 0
                const isExpanded = expandedFeeId === fee.id
                const payments = feePaymentsList[fee.id] || []
                const installments = feeInstallmentsList[fee.id] || []

                return (
                  <div
                    key={fee.id}
                    className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-sm"
                  >
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{fee.description}</h4>
                          {fee.case_title && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {fee.case_title}
                            </span>
                          )}
                          {installments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <Split className="w-3 h-3 text-[#C9A84C]" />
                              {installments.length} Taksitli
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Sözleşme Tarihi:{' '}
                          {new Date(fee.date).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                          {fee.notes && ` • ${fee.notes}`}
                        </p>
                      </div>

                      {/* Amounts Display */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[11px] uppercase font-semibold text-slate-400">Toplam</p>
                          <p className="text-sm font-bold text-slate-800">
                            {formatCurrency(fee.total_amount)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] uppercase font-semibold text-slate-400">Tahsil</p>
                          <p className="text-sm font-bold text-emerald-600">
                            {formatCurrency(collected)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] uppercase font-semibold text-slate-400">Kalan</p>
                          <p
                            className={`text-sm font-bold ${
                              isPaid ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(remaining)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenTakePayment(fee)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Ödeme Al</span>
                          </button>

                          <button
                            onClick={() => handleToggleFeePayments(fee.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
                            title="Taksitler & Ödeme Geçmişi"
                          >
                            <History className="w-4 h-4 text-[#C9A84C]" />
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteFee(fee.id)}
                            title="Ücreti Sil"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Payments & Installments Plan */}
                    {isExpanded && (
                      <div className="bg-slate-50/70 border-t border-slate-100 p-4 space-y-4 animate-in fade-in duration-150">
                        {/* Section A: Installments Plan (If Any) */}
                        {installments.length > 0 && (
                          <div>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-1.5">
                              <CalendarClock className="w-4 h-4 text-[#C9A84C]" />
                              Taksit ve Vade Planı
                            </h5>
                            <div className="border border-slate-200/90 rounded-lg overflow-hidden bg-white">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="px-3.5 py-2">Taksit</th>
                                    <th className="px-3.5 py-2">Vade Tarihi</th>
                                    <th className="px-3.5 py-2">Tutar</th>
                                    <th className="px-3.5 py-2">Durum</th>
                                    <th className="px-3.5 py-2 text-right">Tahsilat İşlemi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {installments.map((inst) => {
                                    const isInstPaid = inst.status === 'ODENDI'
                                    const isOverdue =
                                      !isInstPaid &&
                                      new Date(inst.due_date).getTime() < new Date().setHours(0, 0, 0, 0)

                                    return (
                                      <tr key={inst.id} className="hover:bg-slate-50/80">
                                        <td className="px-3.5 py-2.5 font-bold text-slate-800">
                                          {inst.installment_no}. Taksit
                                        </td>
                                        <td className="px-3.5 py-2.5 text-slate-600">
                                          {new Date(inst.due_date).toLocaleDateString('tr-TR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                          })}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-bold text-slate-800 font-mono">
                                          {formatCurrency(inst.amount)}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                          {isInstPaid ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                              Tahsil Edildi
                                            </span>
                                          ) : isOverdue ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                              <AlertCircle className="w-3 h-3 text-rose-600" />
                                              Vadesi Geçti
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                              <Clock className="w-3 h-3 text-amber-600" />
                                              Ödeme Bekleniyor
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                          {!isInstPaid ? (
                                            <button
                                              onClick={() => handleOpenPayInstallment(fee, inst)}
                                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                              <DollarSign className="w-3 h-3 text-[#C9A84C]" />
                                              <span>Bu Taksiti Tahsil Et</span>
                                            </button>
                                          ) : (
                                            <span className="text-[11px] text-slate-400">
                                              {inst.payment_date
                                                ? `${new Date(inst.payment_date).toLocaleDateString(
                                                    'tr-TR'
                                                  )} tarihinde ödendi`
                                                : 'Ödendi'}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Section B: Fee Payment Movements */}
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Tahsilat Hareketleri (Kasa Girişleri)
                          </h5>

                          {loadingPayments ? (
                            <div className="py-4 text-center text-xs text-slate-400">
                              Ödemeler yükleniyor...
                            </div>
                          ) : payments.length === 0 ? (
                            <div className="py-3 text-xs text-slate-400 italic">
                              Henüz bu ücret için tahsilat girişi yapılmamış.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-200/60 bg-white rounded-lg border border-slate-200/80 overflow-hidden">
                              {payments.map((p) => (
                                <div
                                  key={p.id}
                                  className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge type={p.payment_method} size="sm" />
                                    <span className="font-semibold text-emerald-700">
                                      +{formatCurrency(p.amount)}
                                    </span>
                                    {p.notes && <span className="text-slate-500">({p.notes})</span>}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-slate-400">
                                      {new Date(p.payment_date).toLocaleDateString('tr-TR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </span>
                                    <button
                                      onClick={() => handleDeletePayment(fee.id, p.id)}
                                      title="Ödemeyi Sil"
                                      className="text-slate-300 hover:text-rose-600 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: MASRAFLAR */}
      {activeTab === 'masraflar' && (
        <div className="space-y-4">
          {/* Summary Mini Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-500">Toplam Masraf</p>
              <h4 className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalExpenses)}
              </h4>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <p className="text-xs uppercase font-semibold text-emerald-600">
                Tahsil Edilen / İade Alınan
              </p>
              <h4 className="text-xl font-bold text-emerald-600 mt-1">
                {formatCurrency(reimbursedExpenses)}
              </h4>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <p className="text-xs uppercase font-semibold text-rose-600">Bekleyen Masraf Bakiyesi</p>
              <h4 className="text-xl font-bold text-rose-600 mt-1">
                {formatCurrency(pendingExpenses)}
              </h4>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Müvekkil Adına Yapılan Masraflar</h3>
            <button
              onClick={handleOpenAddExpense}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C9A84C]" />
              <span>Yeni Masraf Ekle</span>
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center shadow-sm">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Bu müvekkil için kayıtlı masraf bulunmuyor.
              </p>
              <button
                onClick={handleOpenAddExpense}
                className="mt-3 text-xs text-[#C9A84C] hover:underline font-semibold"
              >
                + Masraf Ekle
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">Açıklama</th>
                      <th className="py-3 px-4">Ödeyen</th>
                      <th className="py-3 px-4">Tutar</th>
                      <th className="py-3 px-4">İade Durumu</th>
                      <th className="py-3 px-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(exp.date).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {exp.description}
                          {exp.case_title && (
                            <span className="block text-[11px] text-slate-400 font-normal">
                              Dava: {exp.case_title}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge type={exp.paid_by} size="sm" />
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleReimbursed(exp)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                              exp.reimbursed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                exp.reimbursed ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            {exp.reimbursed ? 'İade Edildi' : 'Bekliyor'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditExpense(exp)}
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
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: NOTLAR */}
      {activeTab === 'notlar' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Müvekkil Özel Notları</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Görüşmeler, hatırlatmalar ve stratejik dava detayları için serbest not alanı
              </p>
            </div>
            {notesSavedAt && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#C9A84C]" />
                {notesSavedAt}
              </span>
            )}
          </div>

          <textarea
            rows={12}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Müvekkil ve dosyalar ile ilgili notlarınızı buraya yazın..."
            className="w-full p-4 bg-slate-50/70 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C] transition-all"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1B2D] hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSavingNotes && <RefreshCw className="w-4 h-4 animate-spin text-[#C9A84C]" />}
              <span>{isSavingNotes ? 'Kaydediliyor...' : 'Notları Kaydet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT CLIENT */}
      <Modal
        isOpen={isEditClientModalOpen}
        onClose={() => !submitting && setIsEditClientModalOpen(false)}
        title="Müvekkil Bilgilerini Güncelle"
        size="md"
      >
        <form onSubmit={handleUpdateClient} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ad Soyad / Kurum <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={clientFormData.name}
              onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">T.C. Kimlik / VKN</label>
              <input
                type="text"
                value={clientFormData.tc_no}
                onChange={(e) => setClientFormData({ ...clientFormData, tc_no: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
              <input
                type="text"
                value={clientFormData.phone}
                onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">E-Posta</label>
            <input
              type="email"
              value={clientFormData.email}
              onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adres</label>
            <textarea
              rows={2}
              value={clientFormData.address}
              onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsEditClientModalOpen(false)}
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
              <span>{submitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD / EDIT CASE */}
      <Modal
        isOpen={isCaseModalOpen}
        onClose={() => !submitting && setIsCaseModalOpen(false)}
        title={editingCase ? 'Davayı Düzenle' : 'Yeni Dava Ekle'}
        size="md"
      >
        <form onSubmit={handleSaveCase} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dava / Dosya Başlığı <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: İşçi Alacağı Davası"
              value={caseFormData.title}
              onChange={(e) => setCaseFormData({ ...caseFormData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dava Türü</label>
              <select
                value={caseFormData.type}
                onChange={(e) =>
                  setCaseFormData({ ...caseFormData, type: e.target.value as Case['type'] })
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
                value={caseFormData.status}
                onChange={(e) =>
                  setCaseFormData({ ...caseFormData, status: e.target.value as Case['status'] })
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
                placeholder="Örn: Ankara 4. İş Mahkemesi"
                value={caseFormData.court}
                onChange={(e) => setCaseFormData({ ...caseFormData, court: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dosya No / Esas No</label>
              <input
                type="text"
                placeholder="Örn: 2024/142 E."
                value={caseFormData.file_no}
                onChange={(e) => setCaseFormData({ ...caseFormData, file_no: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Açılış Tarihi</label>
            <input
              type="date"
              value={caseFormData.opened_at}
              onChange={(e) => setCaseFormData({ ...caseFormData, opened_at: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama / Not</label>
            <textarea
              rows={2}
              placeholder="Dava hakkında kısa açıklama..."
              value={caseFormData.description}
              onChange={(e) => setCaseFormData({ ...caseFormData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsCaseModalOpen(false)}
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

      {/* MODAL 3: ADD FEE */}
      <Modal
        isOpen={isFeeModalOpen}
        onClose={() => !submitting && setIsFeeModalOpen(false)}
        title="Yeni Vekalet Ücreti Tanımla"
        size="lg"
      >
        <form onSubmit={handleSaveFee} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ücret Açıklaması <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Dava Vekalet Ücreti (Peşinat)"
              value={feeFormData.description}
              onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Toplam Ücret (TL) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="0.00"
                value={feeFormData.total_amount}
                onChange={(e) => setFeeFormData({ ...feeFormData, total_amount: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                value={feeFormData.date}
                onChange={(e) => setFeeFormData({ ...feeFormData, date: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              İlişkili Dava (İsteğe Bağlı)
            </label>
            <select
              value={feeFormData.case_id}
              onChange={(e) => setFeeFormData({ ...feeFormData, case_id: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            >
              <option value="">-- Dava Seçilmedi --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.file_no || 'Dosya No Yok'})
                </option>
              ))}
            </select>
          </div>

          {/* INSTALLMENT OPTIONS */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={feeFormData.is_installment}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setFeeFormData((prev) => ({
                      ...prev,
                      is_installment: checked
                    }))
                    if (checked && prev.installments.length === 0 && prev.total_amount) {
                      handleGenerateInstallments(prev.installment_count || 3, prev.total_amount, prev.date)
                    }
                  }}
                  className="w-4 h-4 text-[#C9A84C] rounded border-slate-300 focus:ring-[#C9A84C]"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Split className="w-4 h-4 text-[#C9A84C]" />
                  Bu Vekalet Ücreti Taksitli mi?
                </span>
              </label>

              {feeFormData.is_installment && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {feeFormData.installments.length} Taksit Belirlendi
                </span>
              )}
            </div>

            {feeFormData.is_installment && (
              <div className="pt-2 border-t border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">Taksit Sayısı:</span>
                    <select
                      value={feeFormData.installment_count}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10)
                        setFeeFormData((prev) => ({ ...prev, installment_count: count }))
                        handleGenerateInstallments(count, feeFormData.total_amount, feeFormData.date)
                      }}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                    >
                      <option value={2}>2 Taksit</option>
                      <option value={3}>3 Taksit</option>
                      <option value={4}>4 Taksit</option>
                      <option value={5}>5 Taksit</option>
                      <option value={6}>6 Taksit</option>
                      <option value={8}>8 Taksit</option>
                      <option value={10}>10 Taksit</option>
                      <option value={12}>12 Taksit</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateInstallments(
                        feeFormData.installment_count,
                        feeFormData.total_amount,
                        feeFormData.date
                      )
                    }
                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-[#C9A84C]" />
                    <span>Taksitleri Otomatik Böl</span>
                  </button>
                </div>

                {/* Installments Table */}
                {feeFormData.installments.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Taksit</th>
                          <th className="px-3 py-2">Vade Tarihi</th>
                          <th className="px-3 py-2">Tutar (TL)</th>
                          <th className="px-3 py-2 text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {feeFormData.installments.map((inst, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="px-3 py-1.5 font-medium text-slate-700">
                              {inst.installment_no}. Taksit
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="date"
                                required
                                value={inst.due_date}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setFeeFormData((prev) => {
                                    const next = [...prev.installments]
                                    next[idx].due_date = val
                                    return { ...prev, installments: next }
                                  })
                                }}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                required
                                value={inst.amount}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setFeeFormData((prev) => {
                                    const next = [...prev.installments]
                                    next[idx].amount = val
                                    return { ...prev, installments: next }
                                  })
                                }}
                                className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {feeFormData.installments.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFeeFormData((prev) => {
                                      const next = prev.installments.filter((_, i) => i !== idx)
                                      return {
                                        ...prev,
                                        installments: next.map((it, n) => ({ ...it, installment_no: n + 1 }))
                                      }
                                    })
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="Taksiti Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Installments Summary Footer */}
                    <div className="p-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setFeeFormData((prev) => {
                            const lastDueDate =
                              prev.installments.length > 0
                                ? new Date(prev.installments[prev.installments.length - 1].due_date)
                                : new Date()
                            lastDueDate.setMonth(lastDueDate.getMonth() + 1)
                            return {
                              ...prev,
                              installments: [
                                ...prev.installments,
                                {
                                  installment_no: prev.installments.length + 1,
                                  amount: '0',
                                  due_date: lastDueDate.toISOString().split('T')[0],
                                  notes: `${prev.installments.length + 1}. Taksit`
                                }
                              ]
                            }
                          })
                        }}
                        className="text-[#C9A84C] hover:underline font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ek Taksit Ekle</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          Taksitler Toplamı:{' '}
                          <strong className="text-slate-800">
                            {formatCurrency(
                              feeFormData.installments.reduce(
                                (s, i) => s + (parseFloat(i.amount) || 0),
                                0
                              )
                            )}
                          </strong>
                        </span>
                        {Math.abs(
                          feeFormData.installments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) -
                            (parseFloat(feeFormData.total_amount) || 0)
                        ) > 0.5 && (
                          <span className="text-rose-600 font-semibold text-[11px]">
                            (Toplam ücretten farklı!)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ek Notlar</label>
            <textarea
              rows={2}
              placeholder="Ödeme planı, taksit koşulları vb..."
              value={feeFormData.notes}
              onChange={(e) => setFeeFormData({ ...feeFormData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsFeeModalOpen(false)}
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
              <span>{submitting ? 'Kaydediliyor...' : 'Ücreti Kaydet'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: TAKE PAYMENT */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !submitting && setIsPaymentModalOpen(false)}
        title="Tahsilat / Ödeme Girişi"
        size="md"
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {selectedFeeForPayment && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Ücret Tanımı:</span>
                <span className="font-semibold text-slate-800">
                  {selectedFeeForPayment.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kalan Bakiye:</span>
                <span className="font-bold text-rose-600">
                  {formatCurrency(
                    Math.max(
                      0,
                      selectedFeeForPayment.total_amount -
                        (selectedFeeForPayment.collected_amount || 0)
                    )
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahsil Edilen Tutar (TL) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={paymentFormData.amount}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, amount: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Yöntemi</label>
              <select
                value={paymentFormData.payment_method}
                onChange={(e) =>
                  setPaymentFormData({
                    ...paymentFormData,
                    payment_method: e.target.value as FeePayment['payment_method']
                  })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="HAVALE">Havale / EFT</option>
                <option value="NAKİT">Nakit</option>
                <option value="KREDİ_KARTI">Kredi Kartı</option>
                <option value="ÇEK">Çek</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Tarihi</label>
            <input
              type="date"
              required
              value={paymentFormData.payment_date}
              onChange={(e) =>
                setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Notu / Dekont No</label>
            <input
              type="text"
              placeholder="Dekont no veya ödeme açıklaması..."
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
              <span>{submitting ? 'İşleniyor...' : 'Tahsilatı Onayla'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: ADD / EDIT EXPENSE */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => !submitting && setIsExpenseModalOpen(false)}
        title={editingExpense ? 'Masrafı Düzenle' : 'Yeni Masraf Girişi'}
        size="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Masraf Açıklaması <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Bilirkişi Ücreti, Harç, Tebligat Gideri"
              value={expenseFormData.description}
              onChange={(e) =>
                setExpenseFormData({ ...expenseFormData, description: e.target.value })
              }
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
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeyen Taraf</label>
              <select
                value={expenseFormData.paid_by}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    paid_by: e.target.value as ClientExpense['paid_by']
                  })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="OFİS">Ofis Tarafından Ödendi</option>
                <option value="MÜVEKKİL">Müvekkil Kendisi Ödedi</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                value={expenseFormData.date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İlgili Dava (İsteğe Bağlı)
              </label>
              <select
                value={expenseFormData.case_id}
                onChange={(e) =>
                  setExpenseFormData({ ...expenseFormData, case_id: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              >
                <option value="">-- Dava Seçilmedi --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={expenseFormData.reimbursed}
                onChange={(e) =>
                  setExpenseFormData({ ...expenseFormData, reimbursed: e.target.checked })
                }
                className="w-4 h-4 rounded text-[#0F1B2D] focus:ring-[#C9A84C]"
              />
              <span className="font-medium">Müvekkil bu masrafı ofise iade etti (Tahsil edildi)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsExpenseModalOpen(false)}
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
              <span>{submitting ? 'Kaydediliyor...' : 'Masrafı Kaydet'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ClientDetail
