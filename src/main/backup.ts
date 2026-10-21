import { join } from 'path'
import os from 'os'
import fs from 'fs'
import { Database } from './database'

export interface BackupItem {
  filename: string
  path: string
  size: number
  createdAt: string
  timestamp: string
}

export interface BackupResult {
  success: boolean
  path?: string
  filename?: string
  timestamp?: string
  googleDriveCopied?: boolean
  error?: string
}

export class BackupManager {
  private db: Database
  private userDataPath: string
  public readonly backupDir: string

  constructor(db: Database, userDataPath: string) {
    this.db = db
    this.userDataPath = userDataPath
    this.backupDir = join(os.homedir(), 'Documents', 'LexLedger', 'backups')
    this.ensureDir(this.backupDir)
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  public async performBackup(customDir?: string): Promise<BackupResult> {
    try {
      this.ensureDir(this.backupDir)

      const sourceDbPath = this.db.dbPath || join(this.userDataPath, 'lexledger.db')
      if (!fs.existsSync(sourceDbPath)) {
        return { success: false, error: 'Veritabanı dosyası bulunamadı.' }
      }

      const now = new Date()
      const pad = (n: number): string => String(n).padStart(2, '0')
      const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
      const timestamp = `${datePart}_${timePart}`
      const backupFileName = `lexledger_backup_${timestamp}.db`
      const backupFilePath = join(this.backupDir, backupFileName)

      // Use better-sqlite3 online backup or fallback to copyFileSync
      try {
        await this.db.getSqlite().backup(backupFilePath)
      } catch {
        fs.copyFileSync(sourceDbPath, backupFilePath)
      }

      // Check if Google Drive path or secondary backup folder is set in settings or passed
      let googleDriveCopied = false
      const settings = this.db.getSettings()
      const googleDrivePath =
        customDir ||
        settings['google_drive_path'] ||
        settings['backup_path'] ||
        settings['googleDrivePath']

      if (googleDrivePath && fs.existsSync(googleDrivePath)) {
        try {
          const gdriveDest = join(googleDrivePath, backupFileName)
          fs.copyFileSync(backupFilePath, gdriveDest)
          // Also save a latest copy for convenience
          const latestDest = join(googleDrivePath, 'lexledger_guncel.db')
          fs.copyFileSync(backupFilePath, latestDest)
          googleDriveCopied = true
          this.cleanOldBackups(googleDrivePath, 30)
        } catch (err) {
          console.error('Google Drive backup error:', err)
        }
      }

      // Keep max 30 backups locally
      this.cleanOldBackups(this.backupDir, 30)

      return {
        success: true,
        path: backupFilePath,
        filename: backupFileName,
        timestamp: `${datePart} ${timePart.replace(/-/g, ':')}`,
        googleDriveCopied
      }
    } catch (error) {
      console.error('Perform backup failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  public getBackupList(): (BackupItem & { date: string })[] {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return []
      }

      const files = fs.readdirSync(this.backupDir)
      const backups = files
        .filter((file) => file.startsWith('lexledger_backup_') && file.endsWith('.db'))
        .map((file) => {
          const fullPath = join(this.backupDir, file)
          const stat = fs.statSync(fullPath)
          const match = file.match(/lexledger_backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.db/)
          const timestampStr = match
            ? `${match[1]} ${match[2].replace(/-/g, ':')}`
            : stat.mtime.toISOString().replace('T', ' ').slice(0, 19)

          return {
            filename: file,
            path: fullPath,
            size: stat.size,
            date: stat.mtime.toISOString(),
            createdAt: stat.mtime.toISOString(),
            timestamp: timestampStr
          }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return backups
    } catch (error) {
      console.error('Failed to get backup list:', error)
      return []
    }
  }

  private cleanOldBackups(dirPath: string, maxBackups = 30): void {
    try {
      if (!fs.existsSync(dirPath)) return

      const files = fs.readdirSync(dirPath)
      const backupFiles = files
        .filter((file) => file.startsWith('lexledger_backup_') && file.endsWith('.db'))
        .map((file) => {
          const fullPath = join(dirPath, file)
          const stat = fs.statSync(fullPath)
          return {
            file,
            fullPath,
            mtime: stat.mtimeMs
          }
        })
        .sort((a, b) => b.mtime - a.mtime)

      if (backupFiles.length > maxBackups) {
        const toDelete = backupFiles.slice(maxBackups)
        for (const item of toDelete) {
          try {
            fs.unlinkSync(item.fullPath)
          } catch (err) {
            console.error(`Failed to delete older backup file: ${item.fullPath}`, err)
          }
        }
      }
    } catch (err) {
      console.error(`Error cleaning old backups in ${dirPath}:`, err)
    }
  }
}
