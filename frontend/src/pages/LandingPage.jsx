import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Database,
  FileSearch,
  FileText,
  GitBranch,
  LockKeyhole,
  MessageSquareText,
  MousePointer2,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Wand2,
  Workflow,
  Zap,
} from 'lucide-react';

const navItems = [
  ['Features', '#features'],
  ['Solutions', '#solutions'],
  ['ATS Intelligence', '#ats-intelligence'],
  ['Resume Studio', '#resume-studio'],
  ['Pricing', '#pricing'],
  ['About', '#about'],
];

const heroMetrics = [
  ['92%', 'resume parsing accuracy'],
  ['3.4x', 'faster shortlisting'],
  ['41h', 'saved per recruiter'],
];

const trustedMetrics = [
  ['18k+', 'candidate records processed'],
  ['640k', 'resume signals analyzed'],
  ['99.9%', 'role access reliability'],
  ['12', 'workflow modules unified'],
];

const featureCards = [
  [BrainCircuit, 'AI talent intelligence', 'Analyze resumes, job fit, hiring probability, and candidate readiness from live workflow data.'],
  [ShieldCheck, 'Enterprise access control', 'Keep admin, HR, employee, and candidate workspaces protected with role-based navigation.'],
  [GitBranch, 'Recruitment pipeline OS', 'Track applications from applied through ATS screening, interviews, selection, and rejection.'],
  [FileSearch, 'Resume intelligence', 'Parse skills, education, experience, formatting quality, keyword gaps, and recruiter visibility.'],
  [Workflow, 'Workflow automation', 'Connect approvals, interviews, candidate updates, notifications, and operational follow-through.'],
  [Database, 'MongoDB-backed analytics', 'Dashboard numbers come from users, resumes, applications, ATS reports, interviews, and saved jobs.'],
];

const roleTabs = [
  [Building2, 'Admin', 'Security, users, analytics, and governance', '8 modules'],
  [Users, 'HR', 'ATS, candidates, interviews, reports, and jobs', '11 modules'],
  [ClipboardList, 'Employee', 'Attendance, leave, resume, career, documents', '7 modules'],
  [MousePointer2, 'Candidate', 'Resume studio, ATS score, jobs, interviews', '6 modules'],
];

const atsRows = [
  ['Applied', 324, '100%'],
  ['ATS Screened', 248, '77%'],
  ['Shortlisted', 92, '28%'],
  ['Interview Scheduled', 46, '14%'],
  ['Selected', 18, '6%'],
];

const resumeSignals = [
  ['Matched skills', 'React, FastAPI, MongoDB, analytics'],
  ['Missing keywords', 'Kubernetes, CI/CD, workforce planning'],
  ['Formatting quality', 'Section hierarchy, contact details, parser safety'],
  ['Recruiter visibility', 'High intent profile with measurable outcomes'],
];

const automationItems = [
  ['Resume uploaded', 'Parse profile, store ATS report, update dashboard'],
  ['Application submitted', 'Update pipeline, activity heatmap, job history'],
  ['Interview scheduled', 'Sync readiness, stage status, feedback queue'],
  ['Recruiter viewed profile', 'Track attention, visibility, and follow-up signal'],
];

const testimonials = [
  ['A boardroom-ready talent command center.', 'AI-HRMS makes resume intelligence, candidate movement, and executive hiring metrics feel like one operating system.', 'Priya N.', 'Head of Talent'],
  ['The first HR tool that feels built for modern recruiting teams.', 'The ATS analytics are clean, practical, and credible enough for daily recruiter reviews and leadership demos.', 'Arjun R.', 'Recruiting Lead'],
  ['It has the polish of a funded SaaS product.', 'The public site stays focused, and the authenticated workspaces feel properly separated by role.', 'Meera S.', 'People Ops Director'],
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: 'easeOut' },
};

function SectionHeader({ eyebrow, title, body, align = 'left' }) {
  return (
    <motion.div {...fadeUp} className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{body}</p>
    </motion.div>
  );
}

function ProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, delay: 0.08, ease: 'easeOut' }}
      className="relative"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_28px_90px_rgba(15,23,42,0.16)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300 sm:block">Live ATS Command</div>
          </div>

          <div className="grid min-h-[560px] lg:grid-cols-[190px_1fr]">
            <aside className="hidden border-r border-white/10 bg-white/[0.035] p-4 lg:block">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">AI-HRMS</p>
                  <p className="text-sm font-black">Talent OS</p>
                </div>
              </div>
              {['Dashboard', 'ATS Pipeline', 'Resume Studio', 'Interviews', 'Analytics'].map((item, index) => (
                <div key={item} className={`mb-2 rounded-xl px-3 py-2 text-xs font-bold ${index === 0 ? 'bg-white text-slate-950' : 'text-slate-400'}`}>
                  {item}
                </div>
              ))}
            </aside>

            <main className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Enterprise recruiting</p>
                  <h3 className="mt-1 text-xl font-black">Candidate intelligence dashboard</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> MongoDB live
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ['ATS score', '86%', Target, 'Latest resume'],
                  ['Job matches', '24', BriefcaseBusiness, 'Skill aligned'],
                  ['Interviews', '7', CalendarCheck2, '3 pending feedback'],
                ].map(([label, value, Icon, detail]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center justify-between">
                      <Icon size={17} className="text-cyan-200" />
                      <span className="text-[10px] font-black uppercase text-slate-400">Live</span>
                    </div>
                    <p className="mt-4 text-2xl font-black">{value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-300">{label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_0.78fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Hiring funnel</p>
                      <p className="mt-1 text-sm font-black">Pipeline conversion</p>
                    </div>
                    <BarChart3 size={18} className="text-cyan-200" />
                  </div>
                  <div className="space-y-3">
                    {atsRows.map(([stage, count, percent]) => (
                      <div key={stage}>
                        <div className="mb-1 flex justify-between text-xs font-bold text-slate-300">
                          <span>{stage}</span>
                          <span>{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300" style={{ width: percent }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    ['AI recommendation', 'Shortlist senior platform candidates with MongoDB and FastAPI depth.', Bot],
                    ['Interview signal', 'Technical round readiness is high. Feedback pending for 3 panels.', MessageSquareText],
                    ['Skill gap', 'Add Kubernetes and CI/CD to improve recruiter search visibility.', Wand2],
                  ].map(([title, body, Icon]) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                      <div className="flex items-start gap-3">
                        <Icon size={17} className="mt-0.5 shrink-0 text-cyan-200" />
                        <div>
                          <p className="text-xs font-black text-white">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Candidate pipeline', 'Applied to HR round', GitBranch],
                  ['Resume intelligence', 'Skills, gaps, education, format', FileText],
                ].map(([title, body, Icon]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <Icon size={18} className="text-cyan-200" />
                    <p className="mt-3 text-sm font-black">{title}</p>
                    <p className="mt-1 text-xs text-slate-400">{body}</p>
                  </div>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeatureCard({ Icon, title, body, index }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_22px_70px_rgba(79,70,229,0.12)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-cyan-200">
        <Icon size={21} />
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-5 inline-flex items-center gap-1 text-sm font-black text-indigo-600">
        Learn more <ChevronRight size={15} className="transition group-hover:translate-x-1" />
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="ai-saas-landing min-h-screen overflow-x-hidden text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/45 bg-white/62 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-cyan-200 shadow-lg shadow-slate-300/70">
              <Sparkles size={18} />
            </span>
            <span className="leading-none">
              <span className="block text-sm font-black tracking-tight">AI-HRMS</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Talent OS</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 xl:flex">
            {navItems.map(([label, href]) => (
              <a key={label} href={href} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">Login</Link>
            <Link to="/signup" className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 md:inline-flex">Sign Up</Link>
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-indigo-700">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_6%,rgba(79,70,229,0.22),transparent_32%),radial-gradient(circle_at_86%_2%,rgba(6,182,212,0.16),transparent_30%),radial-gradient(circle_at_48%_88%,rgba(124,58,237,0.12),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_54%,#f8fafc_100%)]" />
          <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pb-20 lg:pt-14">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
                <Zap size={14} /> AI-powered enterprise HRMS
              </div>
              <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
                AI-powered hiring and workforce intelligence.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                AI-HRMS combines ATS intelligence, resume analytics, interviews, employee workflows, and role-based dashboards in one premium SaaS platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-300/80 transition hover:-translate-y-0.5 hover:bg-indigo-700">
                  Start free <ArrowRight size={17} />
                </Link>
                <a href="#product-preview" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-700">
                  <Play size={17} /> Watch platform tour
                </a>
              </div>
              <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                {heroMetrics.map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
                    <p className="text-2xl font-black text-slate-950">{value}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <div id="product-preview">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="border-y border-white/55 bg-white/35 backdrop-blur-xl">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
            {trustedMetrics.map(([value, label], index) => (
              <motion.div key={label} {...fadeUp} transition={{ duration: 0.45, delay: index * 0.03 }} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <p className="text-3xl font-black tracking-tight text-slate-950">{value}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Product features"
            title="Everything an enterprise talent team expects, without the clutter."
            body="Clean role boundaries, AI-assisted hiring workflows, and data-rich dashboards create a system that feels built for real recruiting operations."
            align="center"
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map(([Icon, title, body], index) => (
              <FeatureCard key={title} Icon={Icon} title={title} body={body} index={index} />
            ))}
          </div>
        </section>

        <section id="solutions" className="bg-white/30 py-24 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <SectionHeader
                eyebrow="Role-based platform preview"
                title="One public product, four protected workspaces."
                body="Public visitors see the landing page, pricing, and auth. After login, each role gets a focused workspace with only the workflows they can access."
              />
              <motion.div {...fadeUp} className="grid gap-4 sm:grid-cols-2">
                {roleTabs.map(([Icon, role, body, count]) => (
                  <div key={role} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <Icon size={20} />
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{count}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-black text-slate-950">{role}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section id="ats-intelligence" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div {...fadeUp} className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">AI ATS analytics</p>
                  <h3 className="mt-2 text-2xl font-black">Recruitment pipeline intelligence</h3>
                </div>
                <CircleGauge className="text-cyan-200" size={28} />
              </div>
              <div className="mt-8 space-y-4">
                {atsRows.map(([stage, count, percent]) => (
                  <div key={stage} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="mb-2 flex justify-between text-sm font-bold">
                      <span>{stage}</span>
                      <span>{count} candidates</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10">
                      <div className="h-3 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300" style={{ width: percent }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <SectionHeader
              eyebrow="ATS Intelligence"
              title="Replace placeholder charts with live pipeline signals."
              body="Analyze applications by stage, ATS screen outcomes, shortlisting velocity, interview conversion, and hiring probability from real database records."
            />
          </div>
        </section>

        <section id="resume-studio" className="bg-white/30 py-24 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <SectionHeader
                eyebrow="Resume Studio"
                title="Dynamic ATS scoring from parsed resume evidence."
                body="Expose matched skills, missing keywords, education relevance, experience relevance, formatting quality, improvement tips, and recruiter visibility."
              />
              <motion.div {...fadeUp} className="grid gap-4 md:grid-cols-2">
                {resumeSignals.map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                      <CheckCircle2 size={18} />
                    </div>
                    <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div {...fadeUp} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
              <div className="grid gap-3">
                {automationItems.map(([title, body], index) => (
                  <div key={title} className="grid grid-cols-[42px_1fr] gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-cyan-200">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <SectionHeader
              eyebrow="Workflow automation"
              title="Realtime dashboards without fake counters."
              body="Every key action writes to the backend, then the candidate, HR, and admin workspaces refresh around the latest resume, application, interview, notification, and recruiter activity."
            />
          </div>
        </section>

        <section id="about" className="bg-slate-950 py-24 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 lg:grid-cols-3">
              {testimonials.map(([quote, body, name, role], index) => (
                <motion.div key={name} {...fadeUp} transition={{ duration: 0.5, delay: index * 0.05 }} className="rounded-2xl border border-white/10 bg-white/[0.055] p-6">
                  <div className="flex gap-1 text-cyan-200">
                    {[0, 1, 2, 3, 4].map((item) => <Star key={item} size={15} fill="currentColor" />)}
                  </div>
                  <h3 className="mt-5 text-xl font-black">{quote}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
                  <p className="mt-6 text-sm font-black">{name}</p>
                  <p className="text-xs font-semibold text-slate-500">{role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Get started</p>
                <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">Launch an investor-demo quality HR platform with real AI analytics.</h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Bring ATS scoring, job matching, resume intelligence, interviews, employee workflows, and protected role dashboards into one premium SaaS experience.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5">
                    Create account <ArrowRight size={17} />
                  </Link>
                  <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-cyan-200">
                    Login <LockKeyhole size={17} />
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                {['Real MongoDB analytics', 'Protected role dashboards', 'AI ATS and resume engine', 'Candidate job matching'].map((item) => (
                  <div key={item} className="flex items-center gap-3 border-b border-white/10 py-3 last:border-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200"><Check size={15} /></span>
                    <span className="text-sm font-bold text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-base font-black text-slate-950">AI-HRMS</p>
            <p className="mt-1">Enterprise Talent Operating System</p>
          </div>
          <div className="flex flex-wrap gap-4 font-bold">
            {navItems.map(([label, href]) => <a key={label} href={href} className="hover:text-slate-950">{label}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
