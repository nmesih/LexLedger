import React, { useState, useEffect, useCallback } from 'react'
import { Scale, Lock, ShieldCheck, AlertCircle, Delete, KeyRound, Unlock } from 'lucide-react'

interface LockScreenProps {
  onUnlock: () => void
  officeName?: string
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, officeName }) => {
  const [pin, setPin] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [isShaking, setIsShaking] = useState<boolean>(false)
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0)
  const [brandTitle, setBrandTitle] = useState<string>(officeName || 'Alan & Alan Hukuk Bürosu')

  // Load office name if not provided
  useEffect(() => {
    if (!officeName) {
      window.api.settings.get('office_name').then((name) => {
        if (typeof name === 'string' && name.trim()) {
          setBrandTitle(name.trim())
        }
      }).catch(() => {})
    } else {
      setBrandTitle(officeName)
    }
  }, [officeName])

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  const submitPin = useCallback(
    async (pinToVerify: string) => {
      if (!pinToVerify || pinToVerify.length < 4 || isVerifying || lockoutSeconds > 0) return

      try {
        setIsVerifying(true)
        setError(null)
        const res = await window.api.auth.verifyPin(pinToVerify)

        if (res.success) {
          setIsShaking(false)
          onUnlock()
        } else {
          setIsShaking(true)
          setError(res.error || 'Hatalı PIN. Lütfen tekrar deneyin.')
          setPin('')
          if (res.lockoutRemainingSeconds && res.lockoutRemainingSeconds > 0) {
            setLockoutSeconds(res.lockoutRemainingSeconds)
          }
          setTimeout(() => setIsShaking(false), 500)
        }
      } catch (err: any) {
        console.error('PIN verification failed:', err)
        setError('Doğrulama sırasında bir hata oluştu.')
        setPin('')
      } finally {
        setIsVerifying(false)
      }
    },
    [isVerifying, lockoutSeconds, onUnlock]
  )

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (lockoutSeconds > 0 || isVerifying) return
      setError(null)

      setPin((prev) => {
        if (prev.length >= 8) return prev
        const next = prev + digit
        // If reached 6 digits, auto submit
        if (next.length === 6) {
          setTimeout(() => submitPin(next), 50)
        }
        return next
      })
    },
    [lockoutSeconds, isVerifying, submitPin]
  )

  const handleDelete = useCallback(() => {
    if (lockoutSeconds > 0 || isVerifying) return
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }, [lockoutSeconds, isVerifying])

  const handleClear = useCallback(() => {
    if (lockoutSeconds > 0 || isVerifying) return
    setError(null)
    setPin('')
  }, [lockoutSeconds, isVerifying])

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutSeconds > 0) return

      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key)
      } else if (e.key === 'Backspace') {
        handleDelete()
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear()
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          submitPin(pin)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lockoutSeconds, handleKeyPress, handleDelete, handleClear, submitPin, pin])

  // Dynamic pin dots (supports 4 to 8 digits, default 6 placeholders)
  const totalDots = Math.max(6, pin.length)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1B2D] text-white select-none overflow-hidden">
      {/* Background subtle radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-[#0F1B2D] to-[#0A121E] pointer-events-none" />

      {/* Decorative background grid pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(201, 168, 76, 0.4) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative w-full max-w-sm px-6 py-8 flex flex-col items-center">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f3d98a] via-[#C9A84C] to-[#9a7524] flex items-center justify-center text-[#0F1B2D] shadow-xl shadow-[#C9A84C]/20 mb-4 border border-[#f9edcc]/40">
            <Scale className="w-9 h-9 text-[#0F1B2D]" strokeWidth={2.2} />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-[#C9A84C] font-serif">
            {brandTitle}
          </h1>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#C9A84C]" />
            Güvenli Oturum Kilidi
          </p>
        </div>

        {/* PIN Indicators with optional shake animation */}
        <div
          className={`flex items-center justify-center gap-3.5 mb-6 py-2 transition-transform ${
            isShaking ? 'translate-x-[-8px] animate-pulse' : ''
          }`}
        >
          {Array.from({ length: totalDots }).map((_, idx) => {
            const isFilled = idx < pin.length
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#C9A84C] scale-110 shadow-md shadow-[#C9A84C]/50 border border-[#f9edcc]'
                    : 'bg-slate-800/90 border border-slate-700/80 scale-100'
                }`}
              />
            )
          })}
        </div>

        {/* Feedback message / Lockout warning */}
        <div className="h-10 mb-4 flex items-center justify-center text-center px-2">
          {lockoutSeconds > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg animate-pulse">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Güvenlik kilidi devrede. Kalan süre: {lockoutSeconds} sn</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              Klavyenizi veya tuş takımını kullanarak PIN girin
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={lockoutSeconds > 0 || isVerifying}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-xl bg-slate-800/70 hover:bg-slate-700/90 active:bg-[#C9A84C] active:text-[#0F1B2D] text-slate-100 text-xl font-semibold border border-slate-700/60 transition-all duration-150 flex items-center justify-center shadow-sm hover:border-[#C9A84C]/40 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            disabled={lockoutSeconds > 0 || isVerifying || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold border border-slate-700/50 transition-all duration-150 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            Temizle
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            disabled={lockoutSeconds > 0 || isVerifying}
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-xl bg-slate-800/70 hover:bg-slate-700/90 active:bg-[#C9A84C] active:text-[#0F1B2D] text-slate-100 text-xl font-semibold border border-slate-700/60 transition-all duration-150 flex items-center justify-center shadow-sm hover:border-[#C9A84C]/40 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            0
          </button>

          {/* Delete Button */}
          <button
            type="button"
            disabled={lockoutSeconds > 0 || isVerifying || pin.length === 0}
            onClick={handleDelete}
            className="h-14 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold border border-slate-700/50 transition-all duration-150 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="Sil"
          >
            <Delete className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Submit Button (for PINs of length 4 to 8 if not auto-submitted) */}
        {pin.length >= 4 && (
          <button
            type="button"
            disabled={lockoutSeconds > 0 || isVerifying}
            onClick={() => submitPin(pin)}
            className="mt-5 w-full max-w-[280px] py-2.5 bg-[#C9A84C] hover:bg-[#b8922d] text-[#0F1B2D] font-bold rounded-xl text-sm transition-all duration-150 shadow-lg shadow-[#C9A84C]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {isVerifying ? (
              <span>Doğrulanıyor...</span>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Oturumu Aç</span>
              </>
            )}
          </button>
        )}

        {/* Footer Security Badge */}
        <div className="mt-8 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>KVKK m.12 &amp; Av. Kanunu m.36 Güvenli Kriptografik Kilit</span>
        </div>
      </div>
    </div>
  )
}

export default LockScreen
