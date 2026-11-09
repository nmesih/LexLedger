import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Database } from './database'
import { BackupManager } from './backup'
import { AuthManager } from './auth'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null
let db: Database
let backupManager: BackupManager
let authManager: AuthManager

function ensureUnlocked(): void {
  if (authManager && authManager.isLocked()) {
    throw new Error('OTURUM_KILITLI: Uygulama kilitli. Lütfen PIN giriniz.')
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0F1B2D',
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(details.url)
      }
    } catch {}
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const currentUrl = mainWindow?.webContents.getURL()
    if (navigationUrl !== currentUrl) {
      event.preventDefault()
      try {
        const parsed = new URL(navigationUrl)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          shell.openExternal(navigationUrl)
        }
      } catch {}
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.alanalan.lexledger')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database & auth manager
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'lexledger.db')
  db = new Database(dbPath)
  authManager = new AuthManager(db)
  backupManager = new BackupManager(db, userDataPath, authManager)

  // Perform startup backup
  backupManager.performBackup()

  setupIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

let autoBackupTimer: NodeJS.Timeout | null = null
function triggerAutoBackup(): void {
  if (autoBackupTimer) clearTimeout(autoBackupTimer)
  autoBackupTimer = setTimeout(() => {
    backupManager.performBackup().catch((e) => console.error('Auto backup error:', e))
  }, 3000)
}

function setupIpcHandlers(): void {
  // ─── AUTH & SECURITY ───
  ipcMain.handle('auth:isPinSet', () => authManager.isPinSet())
  ipcMain.handle('auth:isLocked', () => authManager.isLocked())
  ipcMain.handle('auth:verifyPin', (_, pin: string) => authManager.verifyPin(pin))
  ipcMain.handle('auth:setPin', (_, currentPin: string | null, newPin: string) =>
    authManager.setPin(currentPin, newPin)
  )
  ipcMain.handle('auth:removePin', (_, currentPin: string) => authManager.removePin(currentPin))
  ipcMain.handle('auth:lock', () => {
    authManager.lock()
    return true
  })
  ipcMain.handle('auth:getSettings', () => authManager.getSettings())
  ipcMain.handle('auth:updateSettings', (_, settings) => authManager.updateSettings(settings))

  // ─── CLIENTS ───
  ipcMain.handle('clients:getAll', () => {
    ensureUnlocked()
    return db.getAllClients()
  })
  ipcMain.handle('clients:getById', (_, id: number) => {
    ensureUnlocked()
    return db.getClientById(id)
  })
  ipcMain.handle('clients:create', (_, data) => {
    ensureUnlocked()
    const res = db.createClient(data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('clients:update', (_, id: number, data) => {
    ensureUnlocked()
    const res = db.updateClient(id, data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('clients:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteClient(id)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('clients:search', (_, query: string) => {
    ensureUnlocked()
    return db.searchClients(query)
  })

  // ─── CASES ───
  ipcMain.handle('cases:getAll', () => {
    ensureUnlocked()
    return db.getAllCases()
  })
  ipcMain.handle('cases:getByClientId', (_, clientId: number) => {
    ensureUnlocked()
    return db.getCasesByClientId(clientId)
  })
  ipcMain.handle('cases:getById', (_, id: number) => {
    ensureUnlocked()
    return db.getCaseById(id)
  })
  ipcMain.handle('cases:create', (_, data) => {
    ensureUnlocked()
    const res = db.createCase(data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('cases:update', (_, id: number, data) => {
    ensureUnlocked()
    const res = db.updateCase(id, data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('cases:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteCase(id)
    triggerAutoBackup()
    return res
  })

  // ─── FEES ───
  ipcMain.handle('fees:getAll', () => {
    ensureUnlocked()
    return db.getAllFees()
  })
  ipcMain.handle('fees:getByClientId', (_, clientId: number) => {
    ensureUnlocked()
    return db.getFeesByClientId(clientId)
  })
  ipcMain.handle('fees:create', (_, data) => {
    ensureUnlocked()
    const res = db.createFee(data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('fees:update', (_, id: number, data) => {
    ensureUnlocked()
    const res = db.updateFee(id, data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('fees:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteFee(id)
    triggerAutoBackup()
    return res
  })

  // ─── FEE PAYMENTS ───
  ipcMain.handle('feePayments:getByFeeId', (_, feeId: number) => {
    ensureUnlocked()
    return db.getFeePaymentsByFeeId(feeId)
  })
  ipcMain.handle('feePayments:create', (_, data) => {
    ensureUnlocked()
    const res = db.createFeePayment(data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('feePayments:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteFeePayment(id)
    triggerAutoBackup()
    return res
  })

  // ─── FEE INSTALLMENTS ───
  ipcMain.handle('feeInstallments:getByFeeId', (_, feeId: number) => {
    ensureUnlocked()
    return db.getInstallmentsByFeeId(feeId)
  })
  ipcMain.handle('feeInstallments:getByClientId', (_, clientId: number) => {
    ensureUnlocked()
    return db.getInstallmentsByClientId(clientId)
  })
  ipcMain.handle('feeInstallments:createWithFee', (_, feeData, installments) => {
    ensureUnlocked()
    const res = db.createFeeWithInstallments(feeData, installments)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('feeInstallments:updateWithFee', (_, feeId: number, feeData, installments) => {
    ensureUnlocked()
    const res = db.updateFeeWithInstallments(feeId, feeData, installments)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('feeInstallments:pay', (_, installmentId: number, paymentData) => {
    ensureUnlocked()
    const res = db.payInstallment(installmentId, paymentData)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('feeInstallments:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteInstallment(id)
    triggerAutoBackup()
    return res
  })

  // ─── CLIENT EXPENSES ───
  ipcMain.handle('clientExpenses:getByClientId', (_, clientId: number) => {
    ensureUnlocked()
    return db.getClientExpensesByClientId(clientId)
  })
  ipcMain.handle('clientExpenses:create', (_, data) => {
    ensureUnlocked()
    const res = db.createClientExpense(data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('clientExpenses:update', (_, id: number, data) => {
    ensureUnlocked()
    const res = db.updateClientExpense(id, data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('clientExpenses:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteClientExpense(id)
    triggerAutoBackup()
    return res
  })

  // ─── OFFICE EXPENSES ───
  ipcMain.handle('officeExpenses:getAll', () => {
    ensureUnlocked()
    return db.getAllOfficeExpenses()
  })
  ipcMain.handle('officeExpenses:getByMonth', (_, year: number, month: number) => {
    ensureUnlocked()
    return db.getOfficeExpensesByMonth(year, month)
  })
  ipcMain.handle('officeExpenses:create', (_, data) => {
    ensureUnlocked()
    const res = db.createOfficeExpense(data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('officeExpenses:update', (_, id: number, data) => {
    ensureUnlocked()
    const res = db.updateOfficeExpense(id, data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('officeExpenses:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteOfficeExpense(id)
    triggerAutoBackup()
    return res
  })

  // ─── DASHBOARD ───
  ipcMain.handle('dashboard:getMonthlyStats', (_, year: number, month: number) => {
    ensureUnlocked()
    return db.getMonthlyStats(year, month)
  })
  ipcMain.handle('dashboard:getLast6MonthsStats', () => {
    ensureUnlocked()
    return db.getLast6MonthsStats()
  })
  ipcMain.handle('dashboard:getTotalReceivables', () => {
    ensureUnlocked()
    return db.getTotalReceivables()
  })
  ipcMain.handle('dashboard:getRecentActivity', () => {
    ensureUnlocked()
    return db.getRecentActivity()
  })

function getPdfFontBase64(filename: string): string | null {
  const candidatePaths = [
    join(__dirname, '../../resources/fonts', filename),
    join(process.resourcesPath, 'resources/fonts', filename),
    join(process.resourcesPath, 'fonts', filename),
    join(app.getAppPath(), 'resources/fonts', filename),
    `/System/Library/Fonts/Supplemental/${filename === 'Arial-Bold.ttf' ? 'Arial Bold.ttf' : 'Arial.ttf'}`
  ]
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p).toString('base64')
      }
    } catch {}
  }
  return null
}

  // ─── REPORTS ───
  ipcMain.handle('reports:getYearlyStats', (_, year: number) => {
    ensureUnlocked()
    return db.getYearlyStats(year)
  })
  ipcMain.handle('reports:getClientFinancialSummary', (_, clientId: number) => {
    ensureUnlocked()
    return db.getClientFinancialSummary(clientId)
  })
  ipcMain.handle('reports:getPdfFonts', () => ({
    regular: getPdfFontBase64('Arial-Regular.ttf'),
    bold: getPdfFontBase64('Arial-Bold.ttf')
  }))

  // ─── SETTINGS ───
  ipcMain.handle('settings:get', (_, key?: string) => {
    if (key === 'office_name') {
      return db.getSetting('office_name')
    }
    ensureUnlocked()
    return key ? db.getSetting(key) : db.getSettings()
  })
  ipcMain.handle('settings:set', (_, key: string, value: string) => {
    ensureUnlocked()
    return db.setSetting(key, value)
  })

  // ─── BACKUP ───
  ipcMain.handle('backup:perform', (_, customDir?: string) => {
    ensureUnlocked()
    return backupManager.performBackup(customDir)
  })
  ipcMain.handle('backup:selectDirectory', async () => {
    ensureUnlocked()
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Yedekleme Klasörü Seç'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })
  ipcMain.handle('backup:getList', () => {
    ensureUnlocked()
    return backupManager.getBackupList()
  })

  // ─── NOTES ───
  ipcMain.handle('notes:getByClientId', (_, clientId: number) => {
    ensureUnlocked()
    return db.getNotesByClientId(clientId)
  })
  ipcMain.handle('notes:save', (_, clientId: number, content: string) => {
    ensureUnlocked()
    const res = db.saveNote(clientId, content)
    triggerAutoBackup()
    return res
  })

  // ─── CALENDAR EVENTS ───
  ipcMain.handle('calendar:getAll', () => {
    ensureUnlocked()
    return db.getAllCalendarEvents()
  })
  ipcMain.handle('calendar:getByRange', (_, start: string, end: string) => {
    ensureUnlocked()
    return db.getCalendarEventsByDateRange(start, end)
  })
  ipcMain.handle('calendar:create', (_, data) => {
    ensureUnlocked()
    const res = db.createCalendarEvent(data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('calendar:update', (_, id: number, data) => {
    ensureUnlocked()
    const res = db.updateCalendarEvent(id, data)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('calendar:delete', (_, id: number) => {
    ensureUnlocked()
    const res = db.deleteCalendarEvent(id)
    triggerAutoBackup()
    return res
  })
  ipcMain.handle('calendar:deduplicate', () => {
    ensureUnlocked()
    const res = db.deduplicateCalendarEvents()
    if (res > 0) triggerAutoBackup()
    return res
  })
function decodeBufferToText(buf: Buffer): string {
  try {
    const utf8Text = buf.toString('utf-8')
    if (!utf8Text.includes('\uFFFD')) {
      return utf8Text
    }
  } catch {
    // fallback
  }

  // Windows-1254 (Turkish ANSI) decoder
  const map: Record<number, string> = {
    0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026',
    0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160',
    0x8B: '\u2039', 0x8C: '\u0152', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C',
    0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014', 0x98: '\u02DC',
    0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153', 0x9F: '\u0178',
    0xD0: 'Ğ', 0xDD: 'İ', 0xDE: 'Ş', 0xF0: 'ğ', 0xFD: 'ı', 0xFE: 'ş'
  }

  let result = ''
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    if (b < 0x80) {
      result += String.fromCharCode(b)
    } else if (map[b]) {
      result += map[b]
    } else {
      result += String.fromCharCode(b)
    }
  }
  return result
}

  ipcMain.handle('calendar:selectAndImportIcs', async () => {
    ensureUnlocked()
    try {
      const win = mainWindow || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        title: 'UYAP / Mac Takvim (.ics) Dosyası Seç',
        buttonLabel: 'Takvimi İçe Aktar',
        filters: [
          { name: 'Tüm Takvim Dosyaları (*.ics, *.ical)', extensions: ['ics', 'ical', 'ICS', 'ICAL'] },
          { name: 'Tüm Dosyalar (*.*)', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]
        const buf = fs.readFileSync(filePath)
        const fileContent = decodeBufferToText(buf)
        const importResult = db.importIcsContent(fileContent)
        triggerAutoBackup()
        return { success: true, filePath, ...importResult }
      }
      return { success: false, canceled: true }
    } catch (err: any) {
      console.error('calendar:selectAndImportIcs error:', err)
      return { success: false, errors: [err?.message || 'Dosya seçilirken veya okunurken hata oluştu.'] }
    }
  })
  ipcMain.handle('calendar:importIcsContent', (_, content: string) => {
    ensureUnlocked()
    try {
      const res = db.importIcsContent(content)
      triggerAutoBackup()
      return { success: true, ...res }
    } catch (err: any) {
      console.error('calendar:importIcsContent error:', err)
      return { success: false, errors: [err?.message || 'İçerik içe aktarılırken hata oluştu.'] }
    }
  })
}
