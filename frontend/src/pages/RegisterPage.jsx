import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, LockKeyhole, Mail, Sparkles, User, UsersRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const roles = [
  { value: 'hr', label: 'HR' },
  { value: 'employee', label: 'Employee' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'admin', label: 'Admin' },
];

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('hr');
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const isPasswordStrong = (value) => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!name || !email || !password) {
      return toast.error('Please fill in all fields');
    }
    if (!isPasswordStrong(password)) {
      return toast.error('Password needs 8+ characters, uppercase, lowercase, and a number');
    }

    setLoading(true);
    try {
      await signUp({ name, email, password, role });
      navigate('/login', { replace: true });
    } catch {
      // signUp already shows the backend error message.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_86%_14%,rgba(6,182,212,0.1),transparent_28%),linear-gradient(135deg,#f8fafc,#eef2f7_52%,#ffffff)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />

      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <Link to="/" className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/25">
          <Sparkles size={20} />
        </Link>
        <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.24em] text-blue-600">Secure workspace setup</p>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight">Create your AI-HRMS account</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-600">Choose a role to receive the correct protected navigation after login.</p>

        <form onSubmit={handleRegister} className="mt-7 space-y-4">
          <label className="relative block">
            <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="relative block">
            <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="relative block">
            <LockKeyhole className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {password && (
              <span className={`mt-2 block px-2 text-[10px] font-black uppercase tracking-[0.18em] ${isPasswordStrong(password) ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isPasswordStrong(password) ? 'Strong password' : 'Needs uppercase, lowercase, number'}
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-2">
            {roles.map((item) => {
              const active = role === item.value;
              const Icon = item.value === 'candidate' ? BriefcaseBusiness : item.value === 'employee' ? User : UsersRound;
              return (
                <button key={item.value} type="button" onClick={() => setRole(item.value)} className={`flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-black transition ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'}`}>
                  <Icon size={17} /> {item.label}
                </button>
              );
            })}
          </div>

          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 text-sm font-black text-white shadow-2xl shadow-violet-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? 'Creating account...' : 'Create account'} {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-black text-blue-600 transition hover:text-blue-700">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
