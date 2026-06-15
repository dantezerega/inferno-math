import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, LogIn, LogOut, Mail, Star, Trophy } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { levelInfo } from '@/game/xp';

function displayName(user: ReturnType<typeof useAuth.getState>['user']): string {
  if (!user) return '';
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return (
    (meta?.full_name as string) ||
    (meta?.name as string) ||
    user.email ||
    'Player'
  );
}

function avatarUrl(user: ReturnType<typeof useAuth.getState>['user']): string | null {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  return (meta?.avatar_url as string) ?? (meta?.picture as string) ?? null;
}

/**
 * Navigation user menu. Renders nothing when cloud sync is unconfigured, so the
 * local-only experience is unchanged. Logged out → email + one-time-code form.
 * Logged in → avatar with a popover showing streak, level/XP, best score.
 */
export function UserMenu() {
  const configured = useAuth((s) => s.configured);
  const loading = useAuth((s) => s.loading);
  const user = useAuth((s) => s.user);
  const summary = useAuth((s) => s.summary);
  const signOut = useAuth((s) => s.signOut);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!configured) return null;

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />;
  }

  // ---- Logged out: email OTP sign-in ----
  if (!user) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-9 items-center gap-2 rounded-xl border border-border bg-elevated px-3 text-sm font-semibold text-content transition-colors hover:bg-surface-2"
        >
          <LogIn size={15} aria-hidden />
          Sign in
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="glass absolute right-0 z-40 mt-2 w-72 rounded-2xl p-4 shadow-glass"
            >
              <SignInForm onDone={() => setOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---- Logged in: profile popover ----
  const name = displayName(user);
  const avatar = avatarUrl(user);
  const initials = name.slice(0, 1).toUpperCase();
  const lvl = summary ? levelInfo(summary.xp) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-elevated p-0.5 pr-2.5 transition-colors hover:bg-surface-2"
      >
        <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-flame text-sm font-bold text-white">
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        {summary && (
          <span className="flex items-center gap-1 text-xs font-bold text-content">
            <Flame size={13} className="text-accent" fill="currentColor" aria-hidden />
            {summary.currentStreak}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass absolute right-0 z-40 mt-2 w-64 rounded-2xl p-4 shadow-glass"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-flame text-base font-bold text-white">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-content">
                  {name}
                </div>
                {user.email && (
                  <div className="truncate text-xs text-muted">{user.email}</div>
                )}
              </div>
            </div>

            {summary && lvl && (
              <>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-content">
                      Level {summary.level}
                    </span>
                    <span className="text-muted">
                      {lvl.xpIntoLevel}/{lvl.xpForNext} XP
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-flame"
                      style={{ width: `${lvl.progress * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <MenuStat
                    icon={<Flame size={14} className="text-accent" fill="currentColor" />}
                    label="Streak"
                    value={`${summary.currentStreak} day${summary.currentStreak === 1 ? '' : 's'}`}
                  />
                  <MenuStat
                    icon={<Trophy size={14} className="text-accent" />}
                    label="Best"
                    value={summary.bestScore}
                  />
                  <MenuStat
                    icon={<Star size={14} className="text-accent" />}
                    label="Best streak"
                    value={summary.bestStreak}
                  />
                  <MenuStat
                    icon={<Star size={14} className="text-accent" fill="currentColor" />}
                    label="XP"
                    value={summary.xp}
                  />
                </div>
              </>
            )}

            <button
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2/60 py-2 text-sm font-semibold text-content transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <LogOut size={15} aria-hidden />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Two-step email → one-time-code sign-in form. */
function SignInForm({ onDone }: { onDone: () => void }) {
  const sendOtp = useAuth((s) => s.sendOtp);
  const verifyEmailOtp = useAuth((s) => s.verifyEmailOtp);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail || busy) return;
    setBusy(true);
    const ok = await sendOtp(email.trim());
    setBusy(false);
    if (ok) setStep('code');
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6 || busy) return;
    setBusy(true);
    const ok = await verifyEmailOtp(email.trim(), code);
    setBusy(false);
    if (ok) {
      setCode('');
      setEmail('');
      setStep('email');
      onDone();
    }
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent';
  const btnClass =
    'flex w-full items-center justify-center gap-2 rounded-xl bg-flame py-2 text-sm font-semibold text-white shadow-glow transition disabled:opacity-50';

  if (step === 'email') {
    return (
      <form onSubmit={submitEmail} className="space-y-3">
        <div>
          <div className="mb-1 text-sm font-semibold text-content">Sign in</div>
          <p className="text-xs text-muted">
            Enter your email and we'll send a one-time login code.
          </p>
        </div>
        <input
          type="email"
          autoFocus
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <button type="submit" disabled={!validEmail || busy} className={btnClass}>
          <Mail size={15} aria-hidden />
          {busy ? 'Sending…' : 'Send code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} className="space-y-3">
      <div>
        <div className="mb-1 text-sm font-semibold text-content">Enter code</div>
        <p className="text-xs text-muted">
          We sent a code to <span className="text-content">{email}</span>.
        </p>
      </div>
      <input
        type="text"
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
      />
      <button type="submit" disabled={code.trim().length < 6 || busy} className={btnClass}>
        {busy ? 'Verifying…' : 'Verify & sign in'}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep('email');
          setCode('');
        }}
        className="w-full text-center text-xs text-muted hover:text-content"
      >
        Use a different email
      </button>
    </form>
  );
}

function MenuStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-bold text-content">
        {value}
      </div>
    </div>
  );
}
