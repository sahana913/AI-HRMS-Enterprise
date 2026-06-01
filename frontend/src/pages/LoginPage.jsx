import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getRoleHome } from '../utils/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const session = await signIn(email, password);
      const role = session?.user?.role || session?.data?.user?.role;
      navigate(location.state?.from?.pathname || getRoleHome(role), { replace: true });
    } catch {
      // AuthContext owns the toast message.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6 text-slate-950 [perspective:1400px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(6,182,212,0.1),transparent_28%),linear-gradient(135deg,#f8fafc,#eef2f7_52%,#ffffff)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />

      <motion.form
        onSubmit={handleLogin}
        initial={{ opacity: 0, y: 24, rotateX: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="group relative w-full max-w-md rounded-lg border border-white/80 bg-white/95 p-8 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_18px_30px_rgba(15,23,42,0.10),0_48px_100px_rgba(37,99,235,0.18),0_80px_140px_rgba(15,23,42,0.18)] backdrop-blur-2xl [transform-style:preserve-3d]"
      >
        <div className="pointer-events-none absolute -inset-1 -z-10 rounded-xl bg-gradient-to-br from-white via-blue-200/40 to-cyan-300/30 blur-sm opacity-90 transition group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(255,255,255,0)_42%)]" />
        <Link to="/" className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/25">
          <Sparkles size={20} />
        </Link>
        <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.24em] text-blue-600">AI-HRMS Enterprise</p>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight">Welcome back</h1>
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-6 text-slate-600">Sign in to unlock your dashboard, role-based workspace, and protected HR workflows.</p>

        <div className="mt-7 space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Email
            <span className="relative mt-2 block">
              <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
              <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="you@company.com" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </span>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Password
            <span className="relative mt-2 block">
              <LockKeyhole className="absolute left-3 top-3.5 text-slate-500" size={18} />
              <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" type="password" placeholder="Password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </span>
          </label>
          <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 text-sm font-black text-white shadow-2xl shadow-violet-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? 'Verifying...' : 'Sign in'} {!submitting && <ArrowRight size={17} />}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
          <ShieldCheck size={15} /> JWT protected session
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          New to AI-HRMS? <Link to="/signup" className="font-black text-blue-600 transition hover:text-blue-700">Create account</Link>
        </p>
      </motion.form>
    </div>
  );
};

export default LoginPage;
