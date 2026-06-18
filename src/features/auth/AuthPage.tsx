import { useState, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { BrandMark } from '../../components/primitives/BrandMark';
import { authStore, useAuth, AuthError } from './store';
import { EASE } from '../motion/primitives';

type Mode = 'login' | 'register' | 'forgot';

const EASE_CSS = [0.22, 1, 0.36, 1] as const;

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Already signed in → bounce to where they were headed (or dashboard).
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (ready && user) return <Navigate to={from} replace />;

  const submit = () => {
    setError(null);
    setBusy(true);
    (async () => {
      try {
        if (mode === 'forgot') {
          const { resetUrl, emailSent: sent } = await authStore.requestPasswordReset(email);
          setForgotSent(true);
          setEmailSent(!!sent);
          // Local/dev fallback surfaces the link directly; with a backend the
          // reset is delivered by email and no link is returned.
          setDevResetLink(resetUrl ?? null);
          return;
        }
        if (mode === 'register') await authStore.registerAsync(name, email, password, username);
        else await authStore.loginAsync(email, password);
        navigate(from, { replace: true });
      } catch (e) {
        setError(e instanceof AuthError ? e.message : 'Something went wrong. Please try again.');
      } finally {
        setBusy(false);
      }
    })();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  // Subtle cursor glow that follows the pointer across the entrance.
  const onPointerMove = (e: React.PointerEvent) => {
    const el = surfaceRef.current;
    if (!el) return;
    el.style.setProperty('--mx', `${e.clientX}px`);
    el.style.setProperty('--my', `${e.clientY}px`);
  };

  return (
    <div
      ref={surfaceRef}
      onPointerMove={onPointerMove}
      className="em-halo relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-5 py-12"
    >
      {/* Floating ambient gradients */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="em-float-a absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--em-glow-focal), transparent 70%)' }}
        />
        <div
          className="em-float-b absolute -right-32 bottom-0 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--em-glow-brass), transparent 70%)' }}
        />
      </div>

      {/* Cursor glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          background:
            'radial-gradient(380px circle at var(--mx, 50%) var(--my, 30%), var(--em-glow-brass), transparent 60%)',
        }}
      />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
        className="relative z-[1] w-full max-w-md"
      >
        {/* Brand */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
          className="mb-9 flex flex-col items-center text-center"
        >
          <motion.div
            className="mb-5 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
          >
            <BrandMark glyphOnly size={48} />
          </motion.div>
          <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-brass">
            Expense Machine
          </p>
          <AnimatePresence mode="wait">
            <motion.h1
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE_CSS }}
              className="font-serif text-[2rem] leading-tight text-bright"
            >
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset your password'}
            </motion.h1>
          </AnimatePresence>
          <p className="mt-2 max-w-sm text-[0.9rem] text-muted">
            {mode === 'login'
              ? 'Sign in to your private financial command center.'
              : mode === 'register'
                ? 'A calm, private place to understand your money.'
                : "Enter your account email and we'll send you a reset link."}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
          className="rounded-panel border border-hairline bg-surface p-7"
        >
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.32, ease: EASE_CSS }}
                  className="overflow-hidden"
                >
                  <Field icon={<UserIcon size={15} />} label="Name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Your name"
                      autoComplete="name"
                      className="h-11 w-full rounded-control border border-hairline bg-ground pl-10 pr-3 text-[0.9rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
                    />
                  </Field>
                  <div className="mt-3">
                    <Field icon={<UserIcon size={15} />} label="Username">
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Choose a username"
                        autoComplete="username"
                        className="h-11 w-full rounded-control border border-hairline bg-ground pl-10 pr-3 text-[0.9rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
                      />
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Field icon={<Mail size={15} />} label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="you@example.in"
                autoComplete="email"
                className="h-11 w-full rounded-control border border-hairline bg-ground pl-10 pr-3 text-[0.9rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
              />
            </Field>
            {mode !== 'forgot' && (
              <Field icon={<Lock size={15} />} label="Password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="h-11 w-full rounded-control border border-hairline bg-ground pl-10 pr-10 text-[0.9rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-soft"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </Field>
            )}
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); setForgotSent(false); setDevResetLink(null); }}
                className="-mt-1 self-end text-[0.78rem] text-muted underline-offset-2 transition-colors hover:text-brass hover:underline"
              >
                Forgot password?
              </button>
            )}

            {mode === 'forgot' && forgotSent && (
              <div className="rounded-control border border-hairline bg-surface p-4 text-[0.82rem]">
                {devResetLink ? (
                  <>
                    <p className="mb-2 font-medium text-bright">Reset link ready</p>
                    <p className="mb-3 text-muted">
                      Expense Machine runs entirely in your browser — there is no email server.
                      Click the link below to reset your password:
                    </p>
                    <a
                      href={devResetLink}
                      className="block break-all rounded-control border border-brass-deep/40 bg-brass/5 px-3 py-2 text-[0.78rem] text-brass underline hover:bg-brass/10"
                    >
                      {devResetLink}
                    </a>
                    <p className="mt-3 text-[0.74rem] text-muted">
                      This link expires in 30 minutes and can only be used once.
                    </p>
                  </>
                ) : emailSent ? (
                  <>
                    <p className="mb-2 font-medium text-bright">Check your email</p>
                    <p className="text-muted">
                      If an account exists for <strong className="text-soft">{email}</strong>,
                      a password reset link is on its way. Open it from your inbox to set a new
                      password. The link expires shortly, so use it soon.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-2 font-medium text-bright">No account found</p>
                    <p className="text-muted">
                      No account is registered with <strong className="text-soft">{email}</strong>.
                      Please check the email address, or{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('register'); setError(null); setForgotSent(false); }}
                        className="text-brass underline-offset-2 hover:underline"
                      >
                        create an account
                      </button>.
                    </p>
                  </>
                )}
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: EASE_CSS }}
                  className="rounded-control border border-loss/40 bg-loss/10 px-3.5 py-2.5 text-[0.82rem] text-loss"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {!(mode === 'forgot' && forgotSent) && (
            <motion.button
              type="button"
              onClick={submit}
              disabled={busy}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2.5 rounded-control bg-brass text-[0.9rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              {!busy && <ArrowRight size={16} strokeWidth={2} />}
            </motion.button>
            )}
          </div>
        </motion.div>

        {/* Switch mode */}
        <motion.p
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
          className="mt-6 text-center text-[0.85rem] text-muted"
        >
          {mode === 'forgot' ? 'Remembered it?' : mode === 'login' ? 'New to Expense Machine?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'register' ? 'login' : m === 'forgot' ? 'login' : 'register'));
              setError(null);
              setForgotSent(false);
              setDevResetLink(null);
            }}
            className="text-brass underline-offset-2 transition-colors hover:underline"
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </motion.p>
      </motion.div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-3.5 text-faint">{icon}</span>
        {children}
      </span>
    </label>
  );
}
