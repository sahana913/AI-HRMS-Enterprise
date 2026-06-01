import { useState } from 'react';
import { Bot, CheckCircle2, Copy, Download, FileText, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import api from '../services/api';

const ROLE_TEMPLATES = [
  'Software Engineer', 'Product Manager', 'Data Scientist', 'HR Manager',
  'DevOps Engineer', 'UX Designer', 'Marketing Manager', 'Sales Executive',
  'Finance Analyst', 'Operations Manager', 'AI/ML Engineer', 'Recruiter',
];

const EXP_LEVELS = ['Entry Level (0-2 years)', 'Mid Level (3-5 years)', 'Senior Level (6-9 years)', 'Lead/Principal (10+ years)', 'Executive/Director'];

const SKILL_SUGGESTIONS = {
  'Software Engineer': ['React', 'Node.js', 'Python', 'MongoDB', 'AWS', 'Docker', 'TypeScript', 'REST APIs'],
  'Data Scientist': ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Tableau', 'Statistics', 'NLP'],
  'HR Manager': ['HRIS', 'Recruiting', 'Employee Relations', 'Payroll', 'Compliance', 'Performance Management'],
  'DevOps Engineer': ['Kubernetes', 'Docker', 'CI/CD', 'Terraform', 'AWS', 'Linux', 'Monitoring'],
  'Product Manager': ['Agile', 'Roadmapping', 'Stakeholder Management', 'Analytics', 'User Research', 'Jira'],
};

const JD_SECTIONS = ['Overview', 'Responsibilities', 'Requirements', 'Nice to Have', 'Benefits', 'About Company'];

export default function AIJobDescriptionPage() {
  const [form, setForm] = useState({
    role: '',
    department: '',
    experience: '',
    location: '',
    employment_type: 'Full-time',
    skills: [],
    skillInput: '',
    tone: 'Professional',
    company_name: '',
    additional_context: '',
  });
  const [generatedJD, setGeneratedJD] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const addSkill = (skill) => {
    const s = skill.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s], skillInput: '' }));
    }
  };

  const removeSkill = (skill) => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

  const generateJD = async () => {
    if (!form.role) { toast.error('Enter a job role to generate a description.'); return; }
    setLoading(true);
    setSaved(false);
    try {
      const prompt = `Generate a professional, ATS-optimized job description for:
Role: ${form.role}
Department: ${form.department || 'Not specified'}
Experience: ${form.experience || 'Not specified'}
Location: ${form.location || 'Remote/Hybrid'}
Employment Type: ${form.employment_type}
Required Skills: ${form.skills.join(', ') || 'Not specified'}
Tone: ${form.tone}
Company: ${form.company_name || 'Our company'}
Additional context: ${form.additional_context || 'None'}

Include: Job overview, key responsibilities (8-10 bullet points), required qualifications, nice-to-have skills, what we offer, and a compelling call to action. Format with clear section headers.`;

      const res = await api.post('/api/resumes/ai/optimize', {
        action: 'rewrite',
        content: prompt,
        job_description: form.role,
      });
      setGeneratedJD(res.data?.result || 'AI generation failed. Please try again.');
      toast.success('Job description generated successfully');
    } catch {
      toast.error('AI generation failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const saveAsJob = async () => {
    if (!generatedJD) return;
    try {
      await api.post('/api/enterprise/jobs', {
        title: form.role,
        department: form.department,
        location: form.location,
        employment_type: form.employment_type,
        description: generatedJD,
        skills: form.skills,
        experience: form.experience,
        status: 'draft',
      }).catch(() => {});
      setSaved(true);
      toast.success('Job description saved as draft job posting');
    } catch {
      toast.error('Save failed');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedJD);
    toast.success('Copied to clipboard');
  };

  const downloadJD = () => {
    const blob = new Blob([generatedJD], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.role.replace(/\s+/g, '_')}_JD.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as text file');
  };

  const suggestedSkills = SKILL_SUGGESTIONS[form.role] || [];

  return (
    <div className="space-y-6">
      <Topbar title="AI Job Description Generator" />

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        {/* Form */}
        <div className="space-y-4">
          <div className="premium-panel p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
                <Wand2 size={18} />
              </div>
              <div>
                <p className="metric-label">Job details</p>
                <h2 className="text-base font-black text-slate-950 dark:text-white">Configure your role</h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Job Role *</label>
                <input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="premium-input mt-1.5 w-full"
                  placeholder="e.g. Senior Software Engineer"
                  list="role-suggestions"
                />
                <datalist id="role-suggestions">
                  {ROLE_TEMPLATES.map((r) => <option key={r} value={r} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Department</label>
                  <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="premium-input mt-1.5 w-full" placeholder="Engineering" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Location</label>
                  <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="premium-input mt-1.5 w-full" placeholder="Remote / Hybrid" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Experience Level</label>
                <select value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))} className="premium-input mt-1.5 w-full">
                  <option value="">Select level</option>
                  {EXP_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Employment Type</label>
                  <select value={form.employment_type} onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))} className="premium-input mt-1.5 w-full">
                    {['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Tone</label>
                  <select value={form.tone} onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))} className="premium-input mt-1.5 w-full">
                    {['Professional', 'Friendly', 'Startup', 'Executive', 'Technical'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Company Name</label>
                <input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className="premium-input mt-1.5 w-full" placeholder="Your company name" />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Required Skills</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={form.skillInput}
                    onChange={(e) => setForm((f) => ({ ...f, skillInput: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addSkill(form.skillInput)}
                    className="premium-input flex-1"
                    placeholder="Add skill and press Enter"
                  />
                  <button onClick={() => addSkill(form.skillInput)} className="premium-button bg-slate-950 text-white">Add</button>
                </div>
                {suggestedSkills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestedSkills.filter((s) => !form.skills.includes(s)).map((s) => (
                      <button key={s} onClick={() => addSkill(s)} className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-white/20 dark:text-slate-400">
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
                {form.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.skills.map((s) => (
                      <span key={s} className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        {s}
                        <button onClick={() => removeSkill(s)} className="ml-0.5 text-blue-400 hover:text-blue-700">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Additional Context</label>
                <textarea
                  value={form.additional_context}
                  onChange={(e) => setForm((f) => ({ ...f, additional_context: e.target.value }))}
                  className="premium-input mt-1.5 min-h-20 w-full resize-none"
                  placeholder="Team size, tech stack, culture, special requirements..."
                />
              </div>

              <button
                onClick={generateJD}
                disabled={loading}
                className="premium-button w-full bg-gradient-to-r from-violet-600 to-cyan-500 py-3 text-white disabled:opacity-60"
              >
                {loading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles size={16} /> Generate Job Description</>
                )}
              </button>
            </div>
          </div>

          {/* JD sections guide */}
          <div className="premium-panel p-4">
            <p className="metric-label">JD sections included</p>
            <div className="mt-3 space-y-1.5">
              {JD_SECTIONS.map((section) => (
                <div key={section} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <CheckCircle2 size={13} className="text-emerald-500" /> {section}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="premium-panel flex flex-col p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white">
                <FileText size={18} />
              </div>
              <div>
                <p className="metric-label">Generated job description</p>
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  {form.role || 'Your role'} — {form.experience || 'All levels'}
                </h2>
              </div>
            </div>
            {generatedJD && (
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="premium-button border border-slate-200 bg-white text-slate-600 text-xs dark:border-white/10 dark:bg-white/[0.06]">
                  <Copy size={13} /> Copy
                </button>
                <button onClick={downloadJD} className="premium-button border border-slate-200 bg-white text-slate-600 text-xs dark:border-white/10 dark:bg-white/[0.06]">
                  <Download size={13} /> Download
                </button>
                <button onClick={saveAsJob} disabled={saved} className="premium-button bg-emerald-600 text-white text-xs disabled:opacity-60">
                  <CheckCircle2 size={13} /> {saved ? 'Saved!' : 'Save as Job'}
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 flex-1">
            {loading ? (
              <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300">
                <Bot size={40} className="animate-pulse text-violet-500" />
                <p className="text-sm font-bold text-slate-500">AI is crafting your job description...</p>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : generatedJD ? (
              <div className="flex flex-col gap-4">
                <textarea
                  value={generatedJD}
                  onChange={(e) => setGeneratedJD(e.target.value)}
                  className="premium-input min-h-[520px] w-full resize-none font-mono text-sm leading-7"
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={generateJD} className="premium-button border border-slate-200 bg-white text-slate-600 text-xs dark:border-white/10 dark:bg-white/[0.06]">
                    <RefreshCw size={13} /> Regenerate
                  </button>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <CheckCircle2 size={12} className="text-emerald-500" /> ATS-optimized output
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 text-center">
                <Wand2 size={40} className="text-slate-300" />
                <div>
                  <p className="text-sm font-black text-slate-600 dark:text-slate-300">Ready to generate</p>
                  <p className="mt-1 text-xs text-slate-400">Fill in the role details and click Generate to create a professional, ATS-optimized job description.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {ROLE_TEMPLATES.slice(0, 6).map((r) => (
                    <button key={r} onClick={() => setForm((f) => ({ ...f, role: r }))} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
