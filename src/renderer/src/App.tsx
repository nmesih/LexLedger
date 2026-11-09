import React, { useState, useEffect, useCallback, useRef } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Cases from './pages/Cases'
import Fees from './pages/Fees'
import OfficeExpenses from './pages/OfficeExpenses'
import Reports from './pages/Reports'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import LockScreen from './components/auth/LockScreen'

export const App: React.FC = () => {
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [authChecked, setAuthChecked] = useState<boolean>(false)
  const [pinEnabled, setPinEnabled] = useState<boolean>(false)
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const loadAuthStatus = useCallback(async () => {
    try {
      const [locked, settings] = await Promise.all([
        window.api.auth.isLocked(),
        window.api.auth.getSettings()
      ])
      setIsLocked(Boolean(locked))
      setPinEnabled(Boolean(settings?.pinEnabled))
      setAutoLockMinutes(typeof settings?.autoLockMinutes === 'number' ? settings.autoLockMinutes : 15)
    } catch (err) {
      console.error('Failed to load auth status:', err)
    } finally {
      setAuthChecked(true)
    }
  }, [])

  useEffect(() => {
    loadAuthStatus()

    const handleAuthChange = () => {
      loadAuthStatus()
    }

    const handleManualLock = () => {
      window.api.auth.lock()
      setIsLocked(true)
    }

    window.addEventListener('app-auth-changed', handleAuthChange)
    window.addEventListener('app-lock-session', handleManualLock)

    return () => {
      window.removeEventListener('app-auth-changed', handleAuthChange)
      window.removeEventListener('app-lock-session', handleManualLock)
    }
  }, [loadAuthStatus])

  // Inactivity auto-lock timer
  useEffect(() => {
    if (!pinEnabled || autoLockMinutes <= 0 || isLocked) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      return
    }

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      inactivityTimerRef.current = setTimeout(() => {
        window.api.auth.lock()
        setIsLocked(true)
      }, autoLockMinutes * 60 * 1000)
    }

    // Set initial timer
    resetInactivityTimer()

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }))

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer))
    }
  }, [pinEnabled, autoLockMinutes, isLocked])

  if (!authChecked) {
    return <div className="h-screen w-screen bg-[#0F1B2D]" />
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="cases" element={<Cases />} />
          <Route path="fees" element={<Fees />} />
          <Route path="office-expenses" element={<OfficeExpenses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
