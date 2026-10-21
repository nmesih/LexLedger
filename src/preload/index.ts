import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
export const api = {
  // ─── CLIENTS ───
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    getById: (id: number) => ipcRenderer.invoke('clients:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('clients:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('clients:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('clients:delete', id),
    search: (query: string) => ipcRenderer.invoke('clients:search', query)
  },

  // ─── CASES ───
  cases: {
    getAll: () => ipcRenderer.invoke('cases:getAll'),
    getByClientId: (clientId: number) => ipcRenderer.invoke('cases:getByClientId', clientId),
    getById: (id: number) => ipcRenderer.invoke('cases:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('cases:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('cases:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('cases:delete', id)
  },

  // ─── FEES ───
  fees: {
    getAll: () => ipcRenderer.invoke('fees:getAll'),
    getByClientId: (clientId: number) => ipcRenderer.invoke('fees:getByClientId', clientId),
    create: (data: unknown) => ipcRenderer.invoke('fees:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('fees:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('fees:delete', id)
  },

  // ─── FEE PAYMENTS ───
  feePayments: {
    getByFeeId: (feeId: number) => ipcRenderer.invoke('feePayments:getByFeeId', feeId),
    create: (data: unknown) => ipcRenderer.invoke('feePayments:create', data),
    delete: (id: number) => ipcRenderer.invoke('feePayments:delete', id)
  },

  // ─── FEE INSTALLMENTS ───
  feeInstallments: {
    getByFeeId: (feeId: number) => ipcRenderer.invoke('feeInstallments:getByFeeId', feeId),
    getByClientId: (clientId: number) => ipcRenderer.invoke('feeInstallments:getByClientId', clientId),
    createWithFee: (feeData: unknown, installments: unknown) =>
      ipcRenderer.invoke('feeInstallments:createWithFee', feeData, installments),
    pay: (installmentId: number, paymentData: unknown) =>
      ipcRenderer.invoke('feeInstallments:pay', installmentId, paymentData),
    delete: (id: number) => ipcRenderer.invoke('feeInstallments:delete', id)
  },

  // ─── CLIENT EXPENSES ───
  clientExpenses: {
    getByClientId: (clientId: number) => ipcRenderer.invoke('clientExpenses:getByClientId', clientId),
    create: (data: unknown) => ipcRenderer.invoke('clientExpenses:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('clientExpenses:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('clientExpenses:delete', id)
  },

  // ─── OFFICE EXPENSES ───
  officeExpenses: {
    getAll: () => ipcRenderer.invoke('officeExpenses:getAll'),
    getByMonth: (year: number, month: number) => ipcRenderer.invoke('officeExpenses:getByMonth', year, month),
    create: (data: unknown) => ipcRenderer.invoke('officeExpenses:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('officeExpenses:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('officeExpenses:delete', id)
  },

  // ─── DASHBOARD ───
  dashboard: {
    getMonthlyStats: (year: number, month: number) => ipcRenderer.invoke('dashboard:getMonthlyStats', year, month),
    getLast6MonthsStats: () => ipcRenderer.invoke('dashboard:getLast6MonthsStats'),
    getTotalReceivables: () => ipcRenderer.invoke('dashboard:getTotalReceivables'),
    getRecentActivity: () => ipcRenderer.invoke('dashboard:getRecentActivity')
  },

  // ─── REPORTS ───
  reports: {
    getYearlyStats: (year: number) => ipcRenderer.invoke('reports:getYearlyStats', year),
    getClientFinancialSummary: (clientId: number) => ipcRenderer.invoke('reports:getClientFinancialSummary', clientId),
    getPdfFonts: () => ipcRenderer.invoke('reports:getPdfFonts')
  },

  // ─── SETTINGS ───
  settings: {
    get: (key?: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },

  // ─── BACKUP ───
  backup: {
    perform: (customDir?: string) => ipcRenderer.invoke('backup:perform', customDir),
    selectDirectory: () => ipcRenderer.invoke('backup:selectDirectory'),
    getList: () => ipcRenderer.invoke('backup:getList')
  },

  // ─── NOTES ───
  notes: {
    getByClientId: (clientId: number) => ipcRenderer.invoke('notes:getByClientId', clientId),
    save: (clientId: number, content: string) => ipcRenderer.invoke('notes:save', clientId, content)
  },

  // ─── CALENDAR ───
  calendar: {
    getAll: () => ipcRenderer.invoke('calendar:getAll'),
    getByRange: (start: string, end: string) => ipcRenderer.invoke('calendar:getByRange', start, end),
    create: (data: unknown) => ipcRenderer.invoke('calendar:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('calendar:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('calendar:delete', id),
    deduplicate: () => ipcRenderer.invoke('calendar:deduplicate'),
    selectAndImportIcs: () => ipcRenderer.invoke('calendar:selectAndImportIcs'),
    importIcsContent: (content: string) => ipcRenderer.invoke('calendar:importIcsContent', content)
  }
}

// Use `contextBridge` to safely expose APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose api via contextBridge:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
