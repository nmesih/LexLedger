export interface Client {
  id: number
  name: string
  tc_no?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  created_at: string
}

export interface Case {
  id: number
  client_id: number
  client_name?: string // joined
  type: 'DAVA' | 'İCRA' | 'DANIŞMA' | 'DİĞER'
  title: string
  court?: string
  file_no?: string
  status: 'DEVAM_EDIYOR' | 'SONUCLANDI' | 'ASKIYA_ALINDI'
  description?: string
  opened_at: string
  created_at: string
}

export interface Fee {
  id: number
  client_id: number
  client_name?: string
  case_id?: number
  case_title?: string
  description: string
  total_amount: number
  collected_amount: number
  remaining_amount?: number // computed
  date: string
  notes?: string
  created_at: string
}

export interface FeePayment {
  id: number
  fee_id: number
  amount: number
  payment_date: string
  payment_method: 'NAKİT' | 'HAVALE' | 'KREDİ_KARTI' | 'ÇEK'
  notes?: string
  created_at: string
}

export interface FeeInstallment {
  id: number
  fee_id: number
  installment_no: number
  amount: number
  due_date: string
  status: 'BEKLIYOR' | 'ODENDI'
  paid_amount: number
  payment_date?: string | null
  notes?: string | null
  fee_description?: string
  created_at: string
}

export interface ClientExpense {
  id: number
  client_id: number
  case_id?: number
  case_title?: string
  description: string
  amount: number
  paid_by: 'OFİS' | 'MÜVEKKİL'
  reimbursed: boolean
  reimbursed_amount: number
  date: string
  created_at: string
}

export interface OfficeExpense {
  id: number
  category: 'KİRA' | 'VERGİ' | 'KIRTASİYE' | 'MAAŞ' | 'ELEKTRİK_SU' | 'İNTERNET' | 'DİĞER'
  description: string
  amount: number
  date: string
  month: number
  year: number
  created_at: string
}

export interface MonthlyStats {
  totalCollected: number
  totalOfficeExpenses: number
  netProfit: number
  totalClientExpensesUnreimbursed: number
}

export interface MonthlyChartData {
  month: number
  year: number
  label: string
  totalCollected: number
  totalOfficeExpenses: number
}

export interface RecentActivityItem {
  id: string | number
  type: 'CASE' | 'FEE' | 'PAYMENT' | 'EXPENSE' | 'CLIENT'
  title: string
  description: string
  date: string
  amount?: number
}

export type CalendarEventType = 'DURUSMA' | 'SURELI_IS' | 'KESIF' | 'TOPLANTI' | 'DIGER'
export type CalendarEventStatus = 'BEKLIYOR' | 'TAMAMLANDI' | 'IPTAL'

export interface CalendarEvent {
  id: number
  client_id?: number | null
  case_id?: number | null
  title: string
  event_type: CalendarEventType
  start_date: string
  start_time?: string | null
  end_date?: string | null
  end_time?: string | null
  location?: string | null
  description?: string | null
  court?: string | null
  file_no?: string | null
  status: CalendarEventStatus
  is_ics_import: number
  ics_uid?: string | null
  created_at: string
  client_name?: string
  case_title?: string
}

export interface YearlyReportData {
  month: number
  monthName: string
  collected: number
  expenses: number
  netProfit: number
}

export interface BackupItem {
  filename: string
  date: string
  size?: number | string
  path?: string
}

export interface ClientFinancialSummary {
  totalFees: number
  totalCollected: number
  totalRemaining: number
  totalExpenses: number
  unreimbursedExpenses: number
}

export interface CalendarImportResult {
  success: boolean
  canceled?: boolean
  filePath?: string
  importedCount?: number
  createdCount?: number
  updatedCount?: number
  earliestDate?: string
  errors?: string[]
}

export interface WindowApi {

  clients: {
    getAll: () => Promise<Client[]>
    getById: (id: number) => Promise<Client | null>
    create: (data: Omit<Client, 'id' | 'created_at'>) => Promise<Client>
    update: (id: number, data: Partial<Client>) => Promise<Client>
    delete: (id: number) => Promise<void | boolean>
    search: (query: string) => Promise<Client[]>
  }
  cases: {
    getAll: () => Promise<Case[]>
    getByClientId: (clientId: number) => Promise<Case[]>
    getById: (id: number) => Promise<Case | null>
    create: (data: Omit<Case, 'id' | 'created_at' | 'client_name'>) => Promise<Case>
    update: (id: number, data: Partial<Case>) => Promise<Case>
    delete: (id: number) => Promise<void | boolean>
  }
  fees: {
    getAll: () => Promise<Fee[]>
    getByClientId: (clientId: number) => Promise<Fee[]>
    create: (data: Omit<Fee, 'id' | 'created_at' | 'collected_amount' | 'remaining_amount' | 'client_name' | 'case_title'>) => Promise<Fee>
    update: (id: number, data: Partial<Fee>) => Promise<Fee>
    delete: (id: number) => Promise<void | boolean>
  }
  feePayments: {
    getByFeeId: (feeId: number) => Promise<FeePayment[]>
    create: (data: Omit<FeePayment, 'id' | 'created_at'>) => Promise<FeePayment>
    delete: (id: number) => Promise<void | boolean>
  }
  feeInstallments: {
    getByFeeId: (feeId: number) => Promise<FeeInstallment[]>
    getByClientId: (clientId: number) => Promise<FeeInstallment[]>
    createWithFee: (
      feeData: Omit<Fee, 'id' | 'created_at' | 'collected_amount' | 'remaining_amount' | 'client_name' | 'case_title'>,
      installments: Array<{ installment_no: number; amount: number; due_date: string; notes?: string }>
    ) => Promise<{ fee: Fee; installments: FeeInstallment[] }>
    pay: (
      installmentId: number,
      paymentData: { amount: number; payment_date: string; payment_method: string; notes?: string }
    ) => Promise<{ installment: FeeInstallment; payment: FeePayment }>
    delete: (id: number) => Promise<void | boolean>
  }
  clientExpenses: {
    getByClientId: (clientId: number) => Promise<ClientExpense[]>
    create: (data: Omit<ClientExpense, 'id' | 'created_at'>) => Promise<ClientExpense>
    update: (id: number, data: Partial<ClientExpense>) => Promise<ClientExpense>
    delete: (id: number) => Promise<void | boolean>
  }
  officeExpenses: {
    getAll: () => Promise<OfficeExpense[]>
    getByMonth: (month: number, year: number) => Promise<OfficeExpense[]>
    create: (data: Omit<OfficeExpense, 'id' | 'created_at'>) => Promise<OfficeExpense>
    update: (id: number, data: Partial<OfficeExpense>) => Promise<OfficeExpense>
    delete: (id: number) => Promise<void | boolean>
  }
  dashboard: {
    getMonthlyStats: (month: number, year: number) => Promise<MonthlyStats>
    getLast6MonthsStats: () => Promise<MonthlyChartData[]>
    getTotalReceivables: () => Promise<number>
    getRecentActivity: () => Promise<RecentActivityItem[]>
  }
  reports: {
    getYearlyStats: (year: number) => Promise<YearlyReportData[]>
    getClientFinancialSummary: (clientId: number) => Promise<ClientFinancialSummary>
    getPdfFonts?: () => Promise<{ regular?: string | null; bold?: string | null }>
  }
  settings: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
  }
  backup: {
    perform: (targetPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
    selectDirectory: () => Promise<string | null>
    getList: () => Promise<BackupItem[]>
  }
  notes: {
    getByClientId: (clientId: number) => Promise<{ content: string; updated_at?: string } | string | null>
    save: (clientId: number, content: string) => Promise<any>
  }
  calendar: {
    getAll: () => Promise<CalendarEvent[]>
    getByRange: (start: string, end: string) => Promise<CalendarEvent[]>
    create: (data: Omit<CalendarEvent, 'id' | 'created_at' | 'client_name' | 'case_title'>) => Promise<CalendarEvent>
    update: (id: number, data: Partial<CalendarEvent>) => Promise<CalendarEvent>
    delete: (id: number) => Promise<void | boolean>
    deduplicate: () => Promise<number>
    selectAndImportIcs: () => Promise<CalendarImportResult>
    importIcsContent: (content: string) => Promise<CalendarImportResult>
  }
}

declare global {
  interface Window {
    api: WindowApi
  }
}
