import DatabaseConstructor, { Database as BetterSqlite3Database } from 'better-sqlite3'
import { dirname } from 'path'
import fs from 'fs'

export interface Client {
  id: number
  name: string
  tc_no?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  created_at: string
}

export type CreateClientInput = {
  name: string
  tc_no?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export type UpdateClientInput = Partial<CreateClientInput>

export type CaseType = 'DAVA' | 'İCRA' | 'DANIŞMA' | 'DİĞER'
export type CaseStatus = 'DEVAM_EDIYOR' | 'SONUCLANDI' | 'ASKIYA_ALINDI'

export interface Case {
  id: number
  client_id: number
  type: CaseType
  title: string
  court?: string | null
  file_no?: string | null
  status: CaseStatus
  description?: string | null
  opened_at?: string | null
  created_at: string
  client_name?: string
}

export type CreateCaseInput = {
  client_id: number
  type: CaseType
  title: string
  court?: string | null
  file_no?: string | null
  status?: CaseStatus
  description?: string | null
  opened_at?: string | null
}

export type UpdateCaseInput = Partial<CreateCaseInput>

export interface Fee {
  id: number
  client_id: number
  case_id?: number | null
  description: string
  total_amount: number
  collected_amount: number
  date: string
  notes?: string | null
  created_at: string
  client_name?: string
  case_title?: string | null
  remaining_amount?: number
}

export type CreateFeeInput = {
  client_id: number
  case_id?: number | null
  description: string
  total_amount: number
  date: string
  notes?: string | null
}

export type UpdateFeeInput = Partial<CreateFeeInput>

export type PaymentMethod = 'NAKİT' | 'HAVALE' | 'KREDİ_KARTI' | 'ÇEK'

export type InstallmentStatus = 'BEKLIYOR' | 'ODENDI'

export interface FeeInstallment {
  id: number
  fee_id: number
  installment_no: number
  amount: number
  due_date: string
  status: InstallmentStatus
  paid_amount: number
  payment_date?: string | null
  notes?: string | null
  created_at: string
}

export type CreateInstallmentInput = {
  fee_id: number
  installment_no: number
  amount: number
  due_date: string
  status?: InstallmentStatus
  paid_amount?: number
  payment_date?: string | null
  notes?: string | null
}

export interface FeePayment {
  id: number
  fee_id: number
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  notes?: string | null
  created_at: string
}

export type CreateFeePaymentInput = {
  fee_id: number
  amount: number
  payment_date: string
  payment_method?: PaymentMethod
  notes?: string | null
}

export type ExpensePaidBy = 'OFİS' | 'MÜVEKKİL'

export interface ClientExpense {
  id: number
  client_id: number
  case_id?: number | null
  description: string
  amount: number
  paid_by: ExpensePaidBy
  reimbursed: number
  reimbursed_amount: number
  date: string
  created_at: string
  client_name?: string
  case_title?: string | null
}

export type CreateClientExpenseInput = {
  client_id: number
  case_id?: number | null
  description: string
  amount: number
  paid_by?: ExpensePaidBy
  reimbursed?: number
  reimbursed_amount?: number
  date: string
}

export type UpdateClientExpenseInput = Partial<CreateClientExpenseInput>

export type OfficeExpenseCategory =
  | 'KİRA'
  | 'VERGİ'
  | 'KIRTASİYE'
  | 'MAAŞ'
  | 'ELEKTRİK_SU'
  | 'İNTERNET'
  | 'DİĞER'

export interface OfficeExpense {
  id: number
  category: OfficeExpenseCategory
  description: string
  amount: number
  date: string
  month: number
  year: number
  created_at: string
}

export type CreateOfficeExpenseInput = {
  category: OfficeExpenseCategory
  description: string
  amount: number
  date: string
  month?: number
  year?: number
}

export type UpdateOfficeExpenseInput = Partial<CreateOfficeExpenseInput>

export interface ClientNote {
  id: number
  client_id: number
  content: string
  updated_at: string
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

export type CreateCalendarEventInput = {
  client_id?: number | null
  case_id?: number | null
  title: string
  event_type?: CalendarEventType
  start_date: string
  start_time?: string | null
  end_date?: string | null
  end_time?: string | null
  location?: string | null
  description?: string | null
  court?: string | null
  file_no?: string | null
  status?: CalendarEventStatus
  is_ics_import?: number
  ics_uid?: string | null
}

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput>

export interface MonthlyStats {
  totalCollected: number
  totalOfficeExpenses: number
  netProfit: number
  totalClientExpensesUnreimbursed: number
}

export interface SixMonthsStat {
  month: number
  year: number
  label: string
  totalCollected: number
  totalOfficeExpenses: number
}

export interface TotalReceivables {
  totalFees: number
  totalCollected: number
  totalReceivable: number
}

export interface RecentActivityItem {
  id: number
  type: 'PAYMENT' | 'EXPENSE'
  title: string
  subtitle?: string
  description?: string
  amount: number
  date: string
  created_at: string
}

export interface YearlyMonthStat {
  month: number
  monthName?: string
  totalCollected: number
  totalOfficeExpenses: number
  collected?: number
  expenses?: number
  netProfit: number
}

export interface ClientFinancialSummary {
  totalFees: number
  totalCollected: number
  totalReceivable: number
  totalRemaining?: number
  totalClientExpenses: number
  totalExpenses?: number
  totalReimbursed: number
  unreimbursedExpenses?: number
}

export class Database {
  private db: BetterSqlite3Database
  public readonly dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    const dir = dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new DatabaseConstructor(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    this.initTables()
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tc_no TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        court TEXT,
        file_no TEXT,
        status TEXT NOT NULL DEFAULT 'DEVAM_EDIYOR',
        description TEXT,
        opened_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0,
        collected_amount REAL NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS fee_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fee_id INTEGER NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'HAVALE',
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS fee_installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fee_id INTEGER NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
        installment_no INTEGER NOT NULL,
        amount REAL NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'BEKLIYOR',
        paid_amount REAL NOT NULL DEFAULT 0,
        payment_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS client_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        paid_by TEXT NOT NULL DEFAULT 'OFİS',
        reimbursed INTEGER NOT NULL DEFAULT 0,
        reimbursed_amount REAL NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS office_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS client_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
        content TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        event_type TEXT NOT NULL DEFAULT 'DURUSMA',
        start_date TEXT NOT NULL,
        start_time TEXT,
        end_date TEXT,
        end_time TEXT,
        location TEXT,
        description TEXT,
        court TEXT,
        file_no TEXT,
        status TEXT NOT NULL DEFAULT 'BEKLIYOR',
        is_ics_import INTEGER NOT NULL DEFAULT 0,
        ics_uid TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT OR IGNORE INTO settings (key, value) VALUES ('office_name', 'Alan & Alan Hukuk Bürosu');

      CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
      CREATE INDEX IF NOT EXISTS idx_fees_client_id ON fees(client_id);
      CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_id ON fee_payments(fee_id);
      CREATE INDEX IF NOT EXISTS idx_client_expenses_client_id ON client_expenses(client_id);
      CREATE INDEX IF NOT EXISTS idx_office_expenses_year_month ON office_expenses(year, month);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
    `)

    // Clean up any historical duplicate entries on startup
    this.deduplicateCalendarEvents()
  }

  public getSqlite(): BetterSqlite3Database {
    return this.db
  }

  public close(): void {
    this.db.close()
  }

  // ─── CLIENTS ───

  public getAllClients(): Client[] {
    return this.db.prepare(`SELECT * FROM clients ORDER BY name ASC`).all() as Client[]
  }

  public getClientById(id: number): Client | null {
    const row = this.db.prepare(`SELECT * FROM clients WHERE id = ?`).get(id) as Client | undefined
    return row ?? null
  }

  public createClient(data: CreateClientInput): Client {
    const info = this.db.prepare(`
      INSERT INTO clients (name, tc_no, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.tc_no || null,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.notes || null
    )
    return this.getClientById(Number(info.lastInsertRowid))!
  }

  public updateClient(id: number, data: UpdateClientInput): Client | null {
    const keys = Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined)
    if (keys.length === 0) {
      return this.getClientById(id)
    }

    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => (data as Record<string, unknown>)[k])

    this.db.prepare(`UPDATE clients SET ${setClause} WHERE id = ?`).run(...values, id)
    return this.getClientById(id)
  }

  public deleteClient(id: number): void {
    this.db.prepare(`DELETE FROM clients WHERE id = ?`).run(id)
  }

  public searchClients(query: string): Client[] {
    const pattern = `%${(query || '').trim()}%`
    return this.db.prepare(`
      SELECT * FROM clients
      WHERE name LIKE ? OR tc_no LIKE ? OR phone LIKE ? OR email LIKE ?
      ORDER BY name ASC
    `).all(pattern, pattern, pattern, pattern) as Client[]
  }

  // ─── CASES ───

  public getAllCases(): Case[] {
    return this.db.prepare(`
      SELECT 
        c.*,
        cl.name as client_name
      FROM cases c
      LEFT JOIN clients cl ON c.client_id = cl.id
      ORDER BY c.created_at DESC
    `).all() as Case[]
  }

  public getCasesByClientId(clientId: number): Case[] {
    return this.db.prepare(`
      SELECT 
        c.*,
        cl.name as client_name
      FROM cases c
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.client_id = ?
      ORDER BY c.created_at DESC
    `).all(clientId) as Case[]
  }

  public getCaseById(id: number): Case | null {
    const row = this.db.prepare(`
      SELECT 
        c.*,
        cl.name as client_name
      FROM cases c
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = ?
    `).get(id) as Case | undefined
    return row ?? null
  }

  public createCase(data: CreateCaseInput): Case {
    const info = this.db.prepare(`
      INSERT INTO cases (client_id, type, title, court, file_no, status, description, opened_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.client_id,
      data.type,
      data.title,
      data.court || null,
      data.file_no || null,
      data.status || 'DEVAM_EDIYOR',
      data.description || null,
      data.opened_at || null
    )
    return this.getCaseById(Number(info.lastInsertRowid))!
  }

  public updateCase(id: number, data: UpdateCaseInput): Case | null {
    const keys = Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined)
    if (keys.length === 0) {
      return this.getCaseById(id)
    }

    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => (data as Record<string, unknown>)[k])

    this.db.prepare(`UPDATE cases SET ${setClause} WHERE id = ?`).run(...values, id)
    return this.getCaseById(id)
  }

  public deleteCase(id: number): void {
    this.db.prepare(`DELETE FROM cases WHERE id = ?`).run(id)
  }

  // ─── FEES ───

  public getAllFees(): Fee[] {
    return this.db.prepare(`
      SELECT 
        f.*,
        cl.name as client_name,
        ca.title as case_title,
        COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id = f.id), 0) as collected_amount,
        (f.total_amount - COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id = f.id), 0)) as remaining_amount
      FROM fees f
      LEFT JOIN clients cl ON f.client_id = cl.id
      LEFT JOIN cases ca ON f.case_id = ca.id
      ORDER BY f.date DESC, f.id DESC
    `).all() as Fee[]
  }

  public getFeesByClientId(clientId: number): Fee[] {
    return this.db.prepare(`
      SELECT 
        f.*,
        cl.name as client_name,
        ca.title as case_title,
        COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id = f.id), 0) as collected_amount,
        (f.total_amount - COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id = f.id), 0)) as remaining_amount
      FROM fees f
      LEFT JOIN clients cl ON f.client_id = cl.id
      LEFT JOIN cases ca ON f.case_id = ca.id
      WHERE f.client_id = ?
      ORDER BY f.date DESC, f.id DESC
    `).all(clientId) as Fee[]
  }

  public getFeeById(id: number): Fee | null {
    const row = this.db.prepare(`
      SELECT 
        f.*,
        cl.name as client_name,
        ca.title as case_title,
        COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id = f.id), 0) as collected_amount,
        (f.total_amount - COALESCE((SELECT SUM(amount) FROM fee_payments WHERE fee_id = f.id), 0)) as remaining_amount
      FROM fees f
      LEFT JOIN clients cl ON f.client_id = cl.id
      LEFT JOIN cases ca ON f.case_id = ca.id
      WHERE f.id = ?
    `).get(id) as Fee | undefined
    return row ?? null
  }

  public createFee(data: CreateFeeInput): Fee {
    const info = this.db.prepare(`
      INSERT INTO fees (client_id, case_id, description, total_amount, collected_amount, date, notes)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(
      data.client_id,
      data.case_id ?? null,
      data.description,
      data.total_amount,
      data.date,
      data.notes || null
    )
    return this.getFeeById(Number(info.lastInsertRowid))!
  }

  public updateFee(id: number, data: UpdateFeeInput): Fee | null {
    const keys = Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined)
    if (keys.length === 0) {
      return this.getFeeById(id)
    }

    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => (data as Record<string, unknown>)[k])

    this.db.prepare(`UPDATE fees SET ${setClause} WHERE id = ?`).run(...values, id)
    return this.getFeeById(id)
  }

  public deleteFee(id: number): void {
    this.db.prepare(`DELETE FROM fees WHERE id = ?`).run(id)
  }

  // ─── FEE PAYMENTS ───

  public getFeePaymentsByFeeId(feeId: number): FeePayment[] {
    return this.db.prepare(`
      SELECT * FROM fee_payments
      WHERE fee_id = ?
      ORDER BY payment_date DESC, id DESC
    `).all(feeId) as FeePayment[]
  }

  public createFeePayment(data: CreateFeePaymentInput): FeePayment {
    const info = this.db.prepare(`
      INSERT INTO fee_payments (fee_id, amount, payment_date, payment_method, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.fee_id,
      data.amount,
      data.payment_date,
      data.payment_method || 'HAVALE',
      data.notes || null
    )

    this.syncFeeCollectedAmount(data.fee_id)
    return this.db.prepare(`SELECT * FROM fee_payments WHERE id = ?`).get(Number(info.lastInsertRowid)) as FeePayment
  }

  public deleteFeePayment(id: number): void {
    const row = this.db.prepare(`SELECT fee_id FROM fee_payments WHERE id = ?`).get(id) as { fee_id: number } | undefined
    if (row) {
      this.db.prepare(`DELETE FROM fee_payments WHERE id = ?`).run(id)
      this.syncFeeCollectedAmount(row.fee_id)
    }
  }

  private syncFeeCollectedAmount(feeId: number): void {
    this.db.prepare(`
      UPDATE fees
      SET collected_amount = (
        SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE fee_id = ?
      )
      WHERE id = ?
    `).run(feeId, feeId)
  }

  // ─── FEE INSTALLMENTS ───

  public getInstallmentsByFeeId(feeId: number): FeeInstallment[] {
    return this.db.prepare(`
      SELECT * FROM fee_installments
      WHERE fee_id = ?
      ORDER BY installment_no ASC, due_date ASC
    `).all(feeId) as FeeInstallment[]
  }

  public getInstallmentsByClientId(clientId: number): (FeeInstallment & { fee_description: string })[] {
    return this.db.prepare(`
      SELECT fi.*, f.description as fee_description
      FROM fee_installments fi
      JOIN fees f ON fi.fee_id = f.id
      WHERE f.client_id = ?
      ORDER BY fi.due_date ASC, fi.installment_no ASC
    `).all(clientId) as (FeeInstallment & { fee_description: string })[]
  }

  public createInstallment(data: CreateInstallmentInput): FeeInstallment {
    const info = this.db.prepare(`
      INSERT INTO fee_installments (fee_id, installment_no, amount, due_date, status, paid_amount, payment_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.fee_id,
      data.installment_no,
      Number(data.amount) || 0,
      data.due_date,
      data.status || 'BEKLIYOR',
      Number(data.paid_amount) || 0,
      data.payment_date || null,
      data.notes || null
    )
    return this.db.prepare(`SELECT * FROM fee_installments WHERE id = ?`).get(Number(info.lastInsertRowid)) as FeeInstallment
  }

  public createFeeWithInstallments(
    feeData: CreateFeeInput,
    installments: Array<{ installment_no: number; amount: number; due_date: string; notes?: string }>
  ): { fee: Fee; installments: FeeInstallment[] } {
    const createdFee = this.createFee(feeData)
    const createdInstallments: FeeInstallment[] = []

    if (Array.isArray(installments) && installments.length > 0) {
      const insertStmt = this.db.prepare(`
        INSERT INTO fee_installments (fee_id, installment_no, amount, due_date, status, paid_amount, notes)
        VALUES (?, ?, ?, ?, 'BEKLIYOR', 0, ?)
      `)

      const transaction = this.db.transaction(() => {
        for (const item of installments) {
          const info = insertStmt.run(
            createdFee.id,
            item.installment_no,
            Number(item.amount) || 0,
            item.due_date,
            item.notes || null
          )
          const row = this.db.prepare(`SELECT * FROM fee_installments WHERE id = ?`).get(Number(info.lastInsertRowid)) as FeeInstallment
          createdInstallments.push(row)
        }
      })
      transaction()
    }

    return { fee: createdFee, installments: createdInstallments }
  }

  public payInstallment(
    installmentId: number,
    paymentData: { amount: number; payment_date: string; payment_method: PaymentMethod; notes?: string }
  ): { installment: FeeInstallment; payment: FeePayment } {
    const inst = this.db.prepare(`SELECT * FROM fee_installments WHERE id = ?`).get(installmentId) as FeeInstallment | undefined
    if (!inst) {
      throw new Error('Taksit kaydı bulunamadı.')
    }

    const payAmount = Number(paymentData.amount) || inst.amount
    const paymentDate = paymentData.payment_date || new Date().toISOString().split('T')[0]
    const paymentMethod = paymentData.payment_method || 'HAVALE'

    let createdPayment: FeePayment

    const transaction = this.db.transaction(() => {
      // 1. Mark installment as ODENDI
      this.db.prepare(`
        UPDATE fee_installments
        SET status = 'ODENDI',
            paid_amount = ?,
            payment_date = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(payAmount, paymentDate, paymentData.notes || null, installmentId)

      // 2. Insert into fee_payments
      const info = this.db.prepare(`
        INSERT INTO fee_payments (fee_id, amount, payment_date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        inst.fee_id,
        payAmount,
        paymentDate,
        paymentMethod,
        paymentData.notes || `${inst.installment_no}. Taksit Tahsilatı`
      )

      this.syncFeeCollectedAmount(inst.fee_id)
      createdPayment = this.db.prepare(`SELECT * FROM fee_payments WHERE id = ?`).get(Number(info.lastInsertRowid)) as FeePayment
    })

    transaction()

    const updatedInst = this.db.prepare(`SELECT * FROM fee_installments WHERE id = ?`).get(installmentId) as FeeInstallment
    return { installment: updatedInst, payment: createdPayment! }
  }

  public deleteInstallment(id: number): void {
    this.db.prepare(`DELETE FROM fee_installments WHERE id = ?`).run(id)
  }

  // ─── CLIENT EXPENSES ───

  public getClientExpensesByClientId(clientId: number): ClientExpense[] {
    return this.db.prepare(`
      SELECT 
        ce.*,
        cl.name as client_name,
        ca.title as case_title
      FROM client_expenses ce
      LEFT JOIN clients cl ON ce.client_id = cl.id
      LEFT JOIN cases ca ON ce.case_id = ca.id
      WHERE ce.client_id = ?
      ORDER BY ce.date DESC, ce.id DESC
    `).all(clientId) as ClientExpense[]
  }

  public getClientExpenseById(id: number): ClientExpense | null {
    const row = this.db.prepare(`
      SELECT 
        ce.*,
        cl.name as client_name,
        ca.title as case_title
      FROM client_expenses ce
      LEFT JOIN clients cl ON ce.client_id = cl.id
      LEFT JOIN cases ca ON ce.case_id = ca.id
      WHERE ce.id = ?
    `).get(id) as ClientExpense | undefined
    return row ?? null
  }

  public createClientExpense(data: CreateClientExpenseInput): ClientExpense {
    const reimbursedInt = data.reimbursed === true || data.reimbursed === 1 ? 1 : 0
    const info = this.db.prepare(`
      INSERT INTO client_expenses (client_id, case_id, description, amount, paid_by, reimbursed, reimbursed_amount, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.client_id,
      data.case_id ? Number(data.case_id) : null,
      data.description,
      Number(data.amount) || 0,
      data.paid_by || 'OFİS',
      reimbursedInt,
      Number(data.reimbursed_amount) || 0,
      data.date
    )
    return this.getClientExpenseById(Number(info.lastInsertRowid))!
  }

  public updateClientExpense(id: number, data: UpdateClientExpenseInput): ClientExpense | null {
    const sanitizedData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      if (key === 'reimbursed') {
        sanitizedData[key] = value === true || value === 1 ? 1 : 0
      } else if (key === 'case_id') {
        sanitizedData[key] = value ? Number(value) : null
      } else if (key === 'amount' || key === 'reimbursed_amount') {
        sanitizedData[key] = Number(value) || 0
      } else {
        sanitizedData[key] = value
      }
    }

    const keys = Object.keys(sanitizedData)
    if (keys.length === 0) {
      return this.getClientExpenseById(id)
    }

    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => sanitizedData[k])

    this.db.prepare(`UPDATE client_expenses SET ${setClause} WHERE id = ?`).run(...values, id)
    return this.getClientExpenseById(id)
  }

  public deleteClientExpense(id: number): void {
    this.db.prepare(`DELETE FROM client_expenses WHERE id = ?`).run(id)
  }

  // ─── OFFICE EXPENSES ───

  public getAllOfficeExpenses(): OfficeExpense[] {
    return this.db.prepare(`SELECT * FROM office_expenses ORDER BY date DESC, id DESC`).all() as OfficeExpense[]
  }

  public getOfficeExpensesByMonth(param1: number, param2: number): OfficeExpense[] {
    let year = Number(param1)
    let month = Number(param2)
    if (param1 <= 12 && param2 > 100) {
      month = Number(param1)
      year = Number(param2)
    }

    return this.db.prepare(`
      SELECT * FROM office_expenses
      WHERE year = ? AND month = ?
      ORDER BY date DESC, id DESC
    `).all(year, month) as OfficeExpense[]
  }

  public getOfficeExpenseById(id: number): OfficeExpense | null {
    const row = this.db.prepare(`SELECT * FROM office_expenses WHERE id = ?`).get(id) as OfficeExpense | undefined
    return row ?? null
  }

  public createOfficeExpense(data: CreateOfficeExpenseInput): OfficeExpense {
    let month = data.month
    let year = data.year
    if (month === undefined || year === undefined) {
      const parts = (data.date || '').split('-')
      if (parts.length >= 2) {
        year = year ?? parseInt(parts[0], 10)
        month = month ?? parseInt(parts[1], 10)
      } else {
        const now = new Date()
        year = year ?? now.getFullYear()
        month = month ?? (now.getMonth() + 1)
      }
    }

    const info = this.db.prepare(`
      INSERT INTO office_expenses (category, description, amount, date, month, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.category,
      data.description,
      data.amount,
      data.date,
      month,
      year
    )
    return this.getOfficeExpenseById(Number(info.lastInsertRowid))!
  }

  public updateOfficeExpense(id: number, data: UpdateOfficeExpenseInput): OfficeExpense | null {
    const modifiedData = { ...data }
    if (modifiedData.date && (modifiedData.month === undefined || modifiedData.year === undefined)) {
      const parts = modifiedData.date.split('-')
      if (parts.length >= 2) {
        if (modifiedData.year === undefined) modifiedData.year = parseInt(parts[0], 10)
        if (modifiedData.month === undefined) modifiedData.month = parseInt(parts[1], 10)
      }
    }

    const keys = Object.keys(modifiedData).filter((k) => (modifiedData as Record<string, unknown>)[k] !== undefined)
    if (keys.length === 0) {
      return this.getOfficeExpenseById(id)
    }

    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => (modifiedData as Record<string, unknown>)[k])

    this.db.prepare(`UPDATE office_expenses SET ${setClause} WHERE id = ?`).run(...values, id)
    return this.getOfficeExpenseById(id)
  }

  public deleteOfficeExpense(id: number): void {
    this.db.prepare(`DELETE FROM office_expenses WHERE id = ?`).run(id)
  }

  // ─── DASHBOARD ───

  public getMonthlyStats(param1: number, param2: number): MonthlyStats {
    let year = Number(param1)
    let month = Number(param2)
    if (param1 <= 12 && param2 > 100) {
      month = Number(param1)
      year = Number(param2)
    }

    const monthStr = `${year}-${String(month).padStart(2, '0')}`

    const collectedRow = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM fee_payments
      WHERE payment_date LIKE ?
    `).get(`${monthStr}%`) as { total: number }

    const expenseRow = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM office_expenses
      WHERE (year = ? AND month = ?) OR date LIKE ?
    `).get(year, month, `${monthStr}%`) as { total: number }

    const clientExpRow = this.db.prepare(`
      SELECT COALESCE(SUM(amount - reimbursed_amount), 0) as total
      FROM client_expenses
      WHERE paid_by = 'OFİS' AND reimbursed = 0 AND date LIKE ?
    `).get(`${monthStr}%`) as { total: number }

    const totalCollected = collectedRow?.total ?? 0
    const totalOfficeExpenses = expenseRow?.total ?? 0
    const netProfit = totalCollected - totalOfficeExpenses
    const totalClientExpensesUnreimbursed = clientExpRow?.total ?? 0

    return {
      totalCollected,
      totalOfficeExpenses,
      netProfit,
      totalClientExpensesUnreimbursed
    }
  }

  public getLast6MonthsStats(): SixMonthsStat[] {
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ]
    const result: SixMonthsStat[] = []
    const today = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const monthStr = `${year}-${String(month).padStart(2, '0')}`

      const collectedRow = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM fee_payments
        WHERE payment_date LIKE ?
      `).get(`${monthStr}%`) as { total: number }

      const expenseRow = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM office_expenses
        WHERE (year = ? AND month = ?) OR date LIKE ?
      `).get(year, month, `${monthStr}%`) as { total: number }

      result.push({
        month,
        year,
        label: `${monthNames[month - 1]} ${year}`,
        totalCollected: collectedRow?.total ?? 0,
        totalOfficeExpenses: expenseRow?.total ?? 0
      })
    }

    return result
  }

  public getTotalReceivables(): TotalReceivables {
    const feesRow = this.db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as totalFees
      FROM fees
    `).get() as { totalFees: number }

    const collectedRow = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as totalCollected
      FROM fee_payments
    `).get() as { totalCollected: number }

    const totalFees = feesRow?.totalFees ?? 0
    const totalCollected = collectedRow?.totalCollected ?? 0
    const totalReceivable = Math.max(0, totalFees - totalCollected)

    return {
      totalFees,
      totalCollected,
      totalReceivable
    }
  }

  public getRecentActivity(): RecentActivityItem[] {
    const payments = this.db.prepare(`
      SELECT 
        fp.id,
        'PAYMENT' as type,
        ('Tahsilat - ' || cl.name) as title,
        (fp.payment_method || CASE WHEN fp.notes IS NOT NULL AND fp.notes != '' THEN ' (' || fp.notes || ')' ELSE '' END) as subtitle,
        (fp.payment_method || CASE WHEN fp.notes IS NOT NULL AND fp.notes != '' THEN ' (' || fp.notes || ')' ELSE '' END) as description,
        fp.amount,
        fp.payment_date as date,
        fp.created_at
      FROM fee_payments fp
      JOIN fees f ON fp.fee_id = f.id
      JOIN clients cl ON f.client_id = cl.id
      ORDER BY fp.payment_date DESC, fp.id DESC
      LIMIT 10
    `).all() as RecentActivityItem[]

    const expenses = this.db.prepare(`
      SELECT 
        id,
        'EXPENSE' as type,
        ('Ofis Gideri - ' || category) as title,
        description as subtitle,
        description,
        amount,
        date,
        created_at
      FROM office_expenses
      ORDER BY date DESC, id DESC
      LIMIT 10
    `).all() as RecentActivityItem[]

    const combined = [...payments, ...expenses]
    combined.sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date)
      if (cmpDate !== 0) return cmpDate
      return (b.created_at || '').localeCompare(a.created_at || '')
    })

    return combined.slice(0, 10)
  }

  // ─── REPORTS ───

  public getYearlyStats(year: number): YearlyMonthStat[] {
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ]
    const result: YearlyMonthStat[] = []

    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`

      const collectedRow = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM fee_payments
        WHERE payment_date LIKE ?
      `).get(`${monthStr}%`) as { total: number }

      const expenseRow = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM office_expenses
        WHERE (year = ? AND month = ?) OR date LIKE ?
      `).get(year, month, `${monthStr}%`) as { total: number }

      const collected = collectedRow?.total ?? 0
      const expenses = expenseRow?.total ?? 0

      result.push({
        month,
        monthName: monthNames[month - 1],
        totalCollected: collected,
        totalOfficeExpenses: expenses,
        collected,
        expenses,
        netProfit: collected - expenses
      })
    }

    return result
  }

  public getClientFinancialSummary(clientId: number): ClientFinancialSummary {
    const feesRow = this.db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as totalFees
      FROM fees
      WHERE client_id = ?
    `).get(clientId) as { totalFees: number }

    const collectedRow = this.db.prepare(`
      SELECT COALESCE(SUM(fp.amount), 0) as totalCollected
      FROM fee_payments fp
      JOIN fees f ON fp.fee_id = f.id
      WHERE f.client_id = ?
    `).get(clientId) as { totalCollected: number }

    const expRow = this.db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as totalClientExpenses,
        COALESCE(SUM(reimbursed_amount), 0) as totalReimbursed
      FROM client_expenses
      WHERE client_id = ?
    `).get(clientId) as { totalClientExpenses: number; totalReimbursed: number }

    const totalFees = feesRow?.totalFees ?? 0
    const totalCollected = collectedRow?.totalCollected ?? 0
    const totalReceivable = Math.max(0, totalFees - totalCollected)
    const totalClientExpenses = expRow?.totalClientExpenses ?? 0
    const totalReimbursed = expRow?.totalReimbursed ?? 0

    return {
      totalFees,
      totalCollected,
      totalReceivable,
      totalRemaining: totalReceivable,
      totalClientExpenses,
      totalExpenses: totalClientExpenses,
      totalReimbursed,
      unreimbursedExpenses: Math.max(0, totalClientExpenses - totalReimbursed)
    }
  }

  // ─── SETTINGS ───

  public getSettings(): Record<string, string> {
    const rows = this.db.prepare(`SELECT key, value FROM settings`).all() as Array<{ key: string; value: string }>
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  }

  public getSetting(key: string): string | null {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined
    return row ? row.value : null
  }

  public setSetting(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value)
  }

  // ─── NOTES ───

  public getNotesByClientId(clientId: number): { content: string } {
    const row = this.db.prepare(`
      SELECT content FROM client_notes WHERE client_id = ?
    `).get(clientId) as { content: string } | undefined
    return { content: row ? row.content : '' }
  }

  public saveNote(clientId: number, content: string): void {
    this.db.prepare(`
      INSERT INTO client_notes (client_id, content, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(client_id) DO UPDATE SET
        content = excluded.content,
        updated_at = excluded.updated_at
    `).run(clientId, content)
  }

  // ─── CALENDAR EVENTS ───

  public getAllCalendarEvents(): CalendarEvent[] {
    return this.db.prepare(`
      SELECT ce.*, cl.name as client_name, ca.title as case_title
      FROM calendar_events ce
      LEFT JOIN clients cl ON ce.client_id = cl.id
      LEFT JOIN cases ca ON ce.case_id = ca.id
      ORDER BY ce.start_date ASC, ce.start_time ASC
    `).all() as CalendarEvent[]
  }

  public getCalendarEventsByDateRange(startDate: string, endDate: string): CalendarEvent[] {
    return this.db.prepare(`
      SELECT ce.*, cl.name as client_name, ca.title as case_title
      FROM calendar_events ce
      LEFT JOIN clients cl ON ce.client_id = cl.id
      LEFT JOIN cases ca ON ce.case_id = ca.id
      WHERE ce.start_date >= ? AND ce.start_date <= ?
      ORDER BY ce.start_date ASC, ce.start_time ASC
    `).all(startDate, endDate) as CalendarEvent[]
  }

  public createCalendarEvent(data: CreateCalendarEventInput): CalendarEvent {
    const info = this.db.prepare(`
      INSERT INTO calendar_events (
        client_id, case_id, title, event_type, start_date, start_time,
        end_date, end_time, location, description, court, file_no,
        status, is_ics_import, ics_uid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.client_id ? Number(data.client_id) : null,
      data.case_id ? Number(data.case_id) : null,
      data.title,
      data.event_type || 'DURUSMA',
      data.start_date,
      data.start_time || null,
      data.end_date || null,
      data.end_time || null,
      data.location || null,
      data.description || null,
      data.court || null,
      data.file_no || null,
      data.status || 'BEKLIYOR',
      data.is_ics_import ? 1 : 0,
      data.ics_uid || null
    )

    return this.db.prepare(`
      SELECT ce.*, cl.name as client_name, ca.title as case_title
      FROM calendar_events ce
      LEFT JOIN clients cl ON ce.client_id = cl.id
      LEFT JOIN cases ca ON ce.case_id = ca.id
      WHERE ce.id = ?
    `).get(Number(info.lastInsertRowid)) as CalendarEvent
  }

  public updateCalendarEvent(id: number, data: UpdateCalendarEventInput): CalendarEvent | null {
    const sanitizedData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      if (key === 'client_id' || key === 'case_id') {
        sanitizedData[key] = value ? Number(value) : null
      } else {
        sanitizedData[key] = value
      }
    }

    const keys = Object.keys(sanitizedData)
    if (keys.length === 0) {
      return this.db.prepare(`SELECT * FROM calendar_events WHERE id = ?`).get(id) as CalendarEvent
    }

    const setClause = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => sanitizedData[k])

    this.db.prepare(`UPDATE calendar_events SET ${setClause} WHERE id = ?`).run(...values, id)

    return this.db.prepare(`
      SELECT ce.*, cl.name as client_name, ca.title as case_title
      FROM calendar_events ce
      LEFT JOIN clients cl ON ce.client_id = cl.id
      LEFT JOIN cases ca ON ce.case_id = ca.id
      WHERE ce.id = ?
    `).get(id) as CalendarEvent
  }

  public deleteCalendarEvent(id: number): void {
    this.db.prepare(`DELETE FROM calendar_events WHERE id = ?`).run(id)
  }

  public importIcsContent(icsContent: string): {
    importedCount: number
    createdCount: number
    updatedCount: number
    earliestDate?: string
    errors: string[]
  } {
    const errors: string[] = []
    let createdCount = 0
    let updatedCount = 0
    let earliestDate: string | undefined = undefined

    try {
      if (!icsContent || typeof icsContent !== 'string') {
        return { importedCount: 0, createdCount: 0, updatedCount: 0, errors: ['Takvim içeriği boş veya geçersiz.'] }
      }

      // Strip UTF-8 BOM if present
      let content = icsContent
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1)
      }

      // Normalize line breaks
      content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      // RFC 5545 line unfolding: a line starting with space or tab is a continuation
      content = content.replace(/\n[ \t]/g, '')

      const lines = content.split('\n')

      let inEvent = false
      let currentEvent: Record<string, string> = {}
      const eventsToInsert: Record<string, string>[] = []

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        const upper = line.toUpperCase()
        if (upper === 'BEGIN:VEVENT' || upper.startsWith('BEGIN:VEVENT')) {
          inEvent = true
          currentEvent = {}
          continue
        }

        if (upper === 'END:VEVENT' || upper.startsWith('END:VEVENT')) {
          if (inEvent) {
            eventsToInsert.push({ ...currentEvent })
          }
          inEvent = false
          currentEvent = {}
          continue
        }

        if (inEvent) {
          const colonIdx = line.indexOf(':')
          if (colonIdx > 0) {
            let key = line.substring(0, colonIdx).trim()
            const val = line.substring(colonIdx + 1).trim()
            if (key.includes(';')) {
              key = key.split(';')[0]
            }
            currentEvent[key.toUpperCase()] = val
          }
        }
      }

      // Fallback: If no RFC 5545 VEVENT was found, check for plain UYAP copied text / table
      if (eventsToInsert.length === 0) {
        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line) continue

          // Match Turkish date DD.MM.YYYY or DD/MM/YYYY
          const dateMatch = line.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/)
          if (dateMatch) {
            const d = dateMatch[1].padStart(2, '0')
            const m = dateMatch[2].padStart(2, '0')
            const y = dateMatch[3]
            const dtstart = `${y}${m}${d}`

            const timeMatch = line.match(/(\d{1,2}):(\d{2})/)
            const timeStr = timeMatch ? `T${timeMatch[1].padStart(2, '0')}${timeMatch[2]}00` : ''

            const fileMatch = line.match(/(\d{4}\/\d+)/)

            eventsToInsert.push({
              SUMMARY: line,
              DTSTART: dtstart + timeStr,
              FILE_NO: fileMatch ? fileMatch[1] : ''
            })
          }
        }
      }

      const parseIcsDate = (dateStr?: string): { date: string; time: string | null } => {
        if (!dateStr) {
          const now = new Date()
          const y = now.getFullYear()
          const m = String(now.getMonth() + 1).padStart(2, '0')
          const d = String(now.getDate()).padStart(2, '0')
          return { date: `${y}-${m}-${d}`, time: null }
        }

        const str = dateStr.trim()

        // ISO format (e.g. 2026-11-25 or 2026-11-25T09:30:00)
        if (str.includes('-') && str.length >= 10) {
          const parts = str.split('T')
          return { date: parts[0], time: parts[1] ? parts[1].slice(0, 5) : null }
        }

        // Basic RFC format
        const cleaned = str.replace(/[^0-9TZ]/g, '')
        if (cleaned.length >= 8) {
          const y = cleaned.substring(0, 4)
          const m = cleaned.substring(4, 6)
          const d = cleaned.substring(6, 8)

          let timePart: string | null = null
          if (cleaned.includes('T')) {
            const timeRaw = cleaned.split('T')[1]
            if (timeRaw && timeRaw.length >= 4) {
              const hh = parseInt(timeRaw.substring(0, 2), 10)
              const mm = timeRaw.substring(2, 4)

              // If UTC (ends with Z), convert to Turkey timezone (UTC+3)
              if (timeRaw.includes('Z')) {
                const utcDate = new Date(
                  Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hh, parseInt(mm, 10))
                )
                const localY = utcDate.getFullYear()
                const localM = String(utcDate.getMonth() + 1).padStart(2, '0')
                const localD = String(utcDate.getDate()).padStart(2, '0')
                const localH = String(utcDate.getHours()).padStart(2, '0')
                const localMin = String(utcDate.getMinutes()).padStart(2, '0')
                return { date: `${localY}-${localM}-${localD}`, time: `${localH}:${localMin}` }
              } else {
                timePart = `${String(hh).padStart(2, '0')}:${mm}`
              }
            }
          }
          return { date: `${y}-${m}-${d}`, time: timePart }
        }
        return { date: str.slice(0, 10), time: null }
      }

      const insertStmt = this.db.prepare(`
        INSERT INTO calendar_events (
          title, event_type, start_date, start_time, end_date, end_time,
          location, description, court, file_no, status, is_ics_import, ics_uid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BEKLIYOR', 1, ?)
      `)

      const updateStmt = this.db.prepare(`
        UPDATE calendar_events
        SET title = ?, event_type = ?, start_date = ?, start_time = ?,
            end_date = ?, end_time = ?, location = ?, description = ?,
            court = ?, file_no = ?, ics_uid = ?
        WHERE id = ? AND is_ics_import = 1
      `)

      const transaction = this.db.transaction(() => {
        for (const ev of eventsToInsert) {
          const summary = (ev['SUMMARY'] || ev['DESCRIPTION'] || 'UYAP Duruşma / Etkinlik')
            .replace(/\\n/g, ' ')
            .replace(/\\,/g, ',')
            .trim()
          const description = (ev['DESCRIPTION'] || '').replace(/\\n/g, '\n').replace(/\\,/g, ',').trim()
          const location = (ev['LOCATION'] || '').replace(/\\n/g, ' ').replace(/\\,/g, ',').trim()

          const startParsed = parseIcsDate(ev['DTSTART'])
          const endParsed = parseIcsDate(ev['DTEND'])

          // Track earliest date
          if (!earliestDate || startParsed.date < earliestDate) {
            earliestDate = startParsed.date
          }

          // Determine event type
          const fullText = `${summary} ${description}`.toLowerCase()
          let eventType: CalendarEventType = 'DURUSMA'
          if (
            fullText.includes('süre') ||
            fullText.includes('cevap') ||
            fullText.includes('beyan') ||
            fullText.includes('itiraz') ||
            fullText.includes('istinaf') ||
            fullText.includes('temyiz')
          ) {
            eventType = 'SURELI_IS'
          } else if (fullText.includes('keşif') || fullText.includes('kesif')) {
            eventType = 'KESIF'
          } else if (fullText.includes('toplantı') || fullText.includes('toplanti') || fullText.includes('görüşme')) {
            eventType = 'TOPLANTI'
          }

          // Extract court and file number
          let court: string | null = location || null
          let fileNo: string | null = ev['FILE_NO'] || null

          if (!fileNo) {
            const fileNoMatch = summary.match(/(\d{4}\/\d+)/) || description.match(/(\d{4}\/\d+)/)
            if (fileNoMatch) {
              fileNo = fileNoMatch[1]
            }
          }

          if (!court) {
            const courtMatch =
              summary.match(/([^-\n]+?(?:Mahkemesi|Hukuk|Ceza|İcra|Sulh|Ağır Ceza|Asliye|İş|Tüketici))/i) ||
              description.match(/([^-\n]+?(?:Mahkemesi|Hukuk|Ceza|İcra|Sulh|Ağır Ceza|Asliye|İş|Tüketici))/i)
            if (courtMatch) {
              court = courtMatch[1].trim()
            }
          }

          // UID resolution
          const uid = ev['UID'] || `uyap-${startParsed.date}-${startParsed.time || 'all'}-${fileNo || summary.slice(0, 30)}`

          // Check if already exists by:
          // 1. Same ics_uid
          // OR 2. Same date + same file_no (e.g. 2026/549)
          // OR 3. Same date + same start_time + same court
          // OR 4. Same date + same start_time + same title
          const existing = this.db.prepare(`
            SELECT id, is_ics_import FROM calendar_events
            WHERE (ics_uid IS NOT NULL AND ics_uid = ?)
               OR (
                    file_no IS NOT NULL AND file_no != '' AND ? IS NOT NULL AND ? != ''
                    AND start_date = ? AND file_no = ?
                    AND (court IS NULL OR ? IS NULL OR court = ?)
                  )
               OR (
                    start_time IS NOT NULL AND start_time != '' AND ? IS NOT NULL AND ? != ''
                    AND court IS NOT NULL AND court != '' AND ? IS NOT NULL AND ? != ''
                    AND start_date = ? AND start_time = ? AND court = ?
                  )
               OR (
                    start_time IS NOT NULL AND start_time != '' AND ? IS NOT NULL AND ? != ''
                    AND start_date = ? AND start_time = ? AND title = ?
                  )
            ORDER BY is_ics_import DESC, id ASC
            LIMIT 1
          `).get(
            uid,
            fileNo, fileNo, startParsed.date, fileNo, court, court,
            startParsed.time, startParsed.time, court, court, startParsed.date, startParsed.time, court,
            startParsed.time, startParsed.time, startParsed.date, startParsed.time, summary
          ) as { id: number; is_ics_import: number } | undefined

          if (existing) {
            if (existing.is_ics_import === 1) {
              updateStmt.run(
                summary,
                eventType,
                startParsed.date,
                startParsed.time,
                endParsed.date,
                endParsed.time,
                location || null,
                description || null,
                court,
                fileNo,
                uid,
                existing.id
              )
            }
            updatedCount++
          } else {
            insertStmt.run(
              summary,
              eventType,
              startParsed.date,
              startParsed.time,
              endParsed.date,
              endParsed.time,
              location || null,
              description || null,
              court,
              fileNo,
              uid
            )
            createdCount++
          }
        }
      })

      transaction()

      // Post-import cleanup: eliminate any possible duplicates
      this.deduplicateCalendarEvents()
    } catch (err: any) {
      console.error('ICS parse error:', err)
      errors.push(err?.message || 'ICS dosyası işlenirken hata oluştu.')
    }

    const importedCount = createdCount + updatedCount
    return { importedCount, createdCount, updatedCount, earliestDate, errors }
  }

  public deduplicateCalendarEvents(): number {
    try {
      const dups = this.db.prepare(`
        SELECT e1.id as keep_id, e2.id as delete_id, e2.ics_uid as e2_uid
        FROM calendar_events e1
        JOIN calendar_events e2 ON e1.id < e2.id
          AND e1.start_date = e2.start_date
          AND (
            (e1.file_no IS NOT NULL AND e1.file_no != '' AND e1.file_no = e2.file_no)
            OR (e1.start_time IS NOT NULL AND e1.start_time = e2.start_time AND e1.court IS NOT NULL AND e1.court = e2.court)
            OR (e1.start_time IS NOT NULL AND e1.start_time = e2.start_time AND e1.title = e2.title)
            OR (e1.ics_uid IS NOT NULL AND e1.ics_uid = e2.ics_uid)
          )
      `).all() as Array<{ keep_id: number; delete_id: number; e2_uid: string | null }>

      if (!dups || dups.length === 0) return 0

      const deleteStmt = this.db.prepare('DELETE FROM calendar_events WHERE id = ?')
      const updateUidStmt = this.db.prepare('UPDATE calendar_events SET ics_uid = ? WHERE id = ?')

      let removedCount = 0
      const transaction = this.db.transaction(() => {
        const deletedIds = new Set<number>()

        for (const d of dups) {
          if (deletedIds.has(d.delete_id) || deletedIds.has(d.keep_id)) continue

          // If e2 had UYAP uid, transfer it to keep_id if keep_id had Apple UUID
          if (d.e2_uid && d.e2_uid.includes('avukat-portal')) {
            updateUidStmt.run(d.e2_uid, d.keep_id)
          }

          deleteStmt.run(d.delete_id)
          deletedIds.add(d.delete_id)
          removedCount++
        }
      })

      transaction()
      return removedCount
    } catch (err) {
      console.error('Error during deduplication:', err)
      return 0
    }
  }
}

