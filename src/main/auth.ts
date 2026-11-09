import crypto from 'crypto'
import fs from 'fs'
import { Database } from './database'

export interface AuthSettings {
  pinEnabled: boolean
  autoLockMinutes: number
  encryptBackups: boolean
}

export interface VerifyPinResult {
  success: boolean
  error?: string
  remainingAttempts?: number
  lockoutRemainingSeconds?: number
}

const MAGIC_HEADER = Buffer.from('LEXLEDGER_ENC_V1') // 16 bytes exactly
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }

export class AuthManager {
  private db: Database
  private locked: boolean = false
  private failedAttempts: number = 0
  private lockoutUntil: number | null = null

  constructor(db: Database) {
    this.db = db
    // On cold boot, if PIN is enabled, app starts locked
    this.locked = this.isPinSet()
  }

  /**
   * Check if PIN protection is active in settings
   */
  public isPinSet(): boolean {
    const enabled = this.db.getSetting('app_pin_enabled')
    const hash = this.db.getSetting('app_pin_hash')
    const salt = this.db.getSetting('app_pin_salt')
    return enabled === 'true' && Boolean(hash) && Boolean(salt)
  }

  /**
   * Check if current session is locked
   */
  public isLocked(): boolean {
    if (!this.isPinSet()) {
      return false
    }
    return this.locked
  }

  /**
   * Lock the current session immediately
   */
  public lock(): void {
    if (this.isPinSet()) {
      this.locked = true
    }
  }

  /**
   * Unlock without PIN check (internal use only, e.g. after successful setPin)
   */
  public forceUnlock(): void {
    this.locked = false
    this.failedAttempts = 0
    this.lockoutUntil = null
  }

  /**
   * Verify user entered PIN
   */
  public verifyPin(pin: string): VerifyPinResult {
    // If PIN is not enabled, always success
    if (!this.isPinSet()) {
      this.locked = false
      return { success: true }
    }

    const now = Date.now()
    if (this.lockoutUntil && now < this.lockoutUntil) {
      const remainingSeconds = Math.ceil((this.lockoutUntil - now) / 1000)
      return {
        success: false,
        error: `Çok fazla hatalı deneme yapıldı. Lütfen ${remainingSeconds} saniye bekleyin.`,
        lockoutRemainingSeconds: remainingSeconds
      }
    }

    const storedHash = this.db.getSetting('app_pin_hash') || ''
    const storedSalt = this.db.getSetting('app_pin_salt') || ''

    try {
      const saltBuf = Buffer.from(storedSalt, 'hex')
      const targetHashBuf = Buffer.from(storedHash, 'hex')

      const calculatedHash = crypto.scryptSync(pin, saltBuf, 64, SCRYPT_PARAMS)

      if (
        targetHashBuf.length === calculatedHash.length &&
        crypto.timingSafeEqual(targetHashBuf, calculatedHash)
      ) {
        // Success
        this.locked = false
        this.failedAttempts = 0
        this.lockoutUntil = null
        return { success: true }
      }
    } catch (err) {
      console.error('PIN verification error:', err)
    }

    // Failed attempt
    this.failedAttempts += 1
    const maxAttempts = 5
    const remainingAttempts = Math.max(0, maxAttempts - this.failedAttempts)

    if (this.failedAttempts >= maxAttempts) {
      // 30 seconds lockout
      this.lockoutUntil = Date.now() + 30000
      return {
        success: false,
        error: 'Çok fazla hatalı deneme! Güvenliğiniz için 30 saniye süreyle kilitlendi.',
        remainingAttempts: 0,
        lockoutRemainingSeconds: 30
      }
    }

    return {
      success: false,
      error: `Hatalı PIN. Kalan deneme hakkı: ${remainingAttempts}`,
      remainingAttempts
    }
  }

  /**
   * Set a new PIN (or update existing PIN)
   */
  public setPin(currentPin: string | null, newPin: string): { success: boolean; error?: string } {
    if (!newPin || typeof newPin !== 'string' || newPin.length < 4 || newPin.length > 12) {
      return { success: false, error: 'PIN en az 4, en fazla 12 karakterden oluşmalıdır.' }
    }

    // If PIN is already set, verify current PIN first
    if (this.isPinSet()) {
      if (!currentPin) {
        return { success: false, error: 'Mevcut PIN girilmelidir.' }
      }
      const verify = this.verifyPin(currentPin)
      if (!verify.success) {
        return { success: false, error: verify.error || 'Mevcut PIN hatalı.' }
      }
    }

    const salt = crypto.randomBytes(32)
    const hash = crypto.scryptSync(newPin, salt, 64, SCRYPT_PARAMS)

    this.db.setSetting('app_pin_enabled', 'true')
    this.db.setSetting('app_pin_hash', hash.toString('hex'))
    this.db.setSetting('app_pin_salt', salt.toString('hex'))

    // Ensure auto-lock has a default if not set
    if (!this.db.getSetting('app_auto_lock_minutes')) {
      this.db.setSetting('app_auto_lock_minutes', '15')
    }

    this.locked = false
    this.failedAttempts = 0
    this.lockoutUntil = null

    return { success: true }
  }

  /**
   * Remove PIN protection (requires entering current PIN)
   */
  public removePin(currentPin: string): { success: boolean; error?: string } {
    if (!this.isPinSet()) {
      return { success: true }
    }

    const verify = this.verifyPin(currentPin)
    if (!verify.success) {
      return { success: false, error: verify.error || 'Mevcut PIN hatalı.' }
    }

    this.db.setSetting('app_pin_enabled', 'false')
    this.db.setSetting('app_pin_hash', '')
    this.db.setSetting('app_pin_salt', '')
    this.locked = false
    this.failedAttempts = 0
    this.lockoutUntil = null

    return { success: true }
  }

  /**
   * Get authentication and lock settings
   */
  public getSettings(): AuthSettings {
    const pinEnabled = this.isPinSet()
    const autoLockMinutesRaw = this.db.getSetting('app_auto_lock_minutes')
    const autoLockMinutes = autoLockMinutesRaw !== null ? parseInt(autoLockMinutesRaw, 10) : 15
    const encryptBackupsRaw = this.db.getSetting('app_encrypt_backups')
    const encryptBackups = encryptBackupsRaw === 'true'

    return {
      pinEnabled,
      autoLockMinutes: isNaN(autoLockMinutes) ? 15 : autoLockMinutes,
      encryptBackups
    }
  }

  /**
   * Update lock settings
   */
  public updateSettings(settings: Partial<AuthSettings>): { success: boolean } {
    if (typeof settings.autoLockMinutes === 'number') {
      this.db.setSetting('app_auto_lock_minutes', String(settings.autoLockMinutes))
    }
    if (typeof settings.encryptBackups === 'boolean') {
      this.db.setSetting('app_encrypt_backups', settings.encryptBackups ? 'true' : 'false')
    }
    return { success: true }
  }

  // ─── AES-256-GCM BACKUP ENCRYPTION / DECRYPTION ───

  /**
   * Encrypt a database backup file using AES-256-GCM
   * Output file format:
   * [16B MAGIC] [16B SALT] [12B IV] [16B AUTH_TAG] [CIPHERTEXT...]
   */
  public async encryptFile(sourcePath: string, destPath: string, pinOrKey?: string): Promise<boolean> {
    try {
      if (!fs.existsSync(sourcePath)) {
        throw new Error('Kaynak dosya bulunamadı: ' + sourcePath)
      }

      // If no pinOrKey passed, use stored PIN hash or office-specific salt
      const salt = crypto.randomBytes(16)
      const iv = crypto.randomBytes(12)
      const passphrase = pinOrKey || this.db.getSetting('app_pin_hash') || 'LexLedger-Default-Office-Key'

      // Derive 256-bit AES key
      const key = crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 })

      const plaintext = fs.readFileSync(sourcePath)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
      cipher.setAAD(MAGIC_HEADER)

      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
      const authTag = cipher.getAuthTag()

      // Assemble final encrypted file
      const finalBuffer = Buffer.concat([
        MAGIC_HEADER, // 16 bytes
        salt,         // 16 bytes
        iv,           // 12 bytes
        authTag,      // 16 bytes
        ciphertext
      ])

      fs.writeFileSync(destPath, finalBuffer)
      return true
    } catch (err) {
      console.error('File encryption error:', err)
      return false
    }
  }

  /**
   * Decrypt an encrypted backup file (.enc) back to SQLite database
   */
  public async decryptFile(sourcePath: string, destPath: string, pinOrKey?: string): Promise<boolean> {
    try {
      if (!fs.existsSync(sourcePath)) {
        throw new Error('Kaynak dosya bulunamadı: ' + sourcePath)
      }

      const fileData = fs.readFileSync(sourcePath)
      if (fileData.length < 60) {
        throw new Error('Dosya geçerli bir şifreli yedek değil (çok küçük).')
      }

      const magic = fileData.subarray(0, 16)
      if (!magic.equals(MAGIC_HEADER)) {
        throw new Error('Geçersiz dosya formatı. LexLedger şifreli yedeği değil.')
      }

      const salt = fileData.subarray(16, 32)
      const iv = fileData.subarray(32, 44)
      const authTag = fileData.subarray(44, 60)
      const ciphertext = fileData.subarray(60)

      const passphrase = pinOrKey || this.db.getSetting('app_pin_hash') || 'LexLedger-Default-Office-Key'
      const key = crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 })

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAAD(MAGIC_HEADER)
      decipher.setAuthTag(authTag)

      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      fs.writeFileSync(destPath, plaintext)
      return true
    } catch (err) {
      console.error('File decryption error:', err)
      return false
    }
  }
}
