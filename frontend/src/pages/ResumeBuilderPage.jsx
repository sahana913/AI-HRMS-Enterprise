import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Award,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  GraduationCap,
  Image,
  Languages,
  LayoutTemplate,
  Link as LinkIcon,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import {
  createResume,
  deleteResume,
  duplicateResume,
  fetchResumes,
  optimizeResumeContent,
  parseResumeFile,
  updateResume,
} from '../services/resumeService';

const templates = [
  { id: 'corporate', label: 'Corporate', accent: 'from-blue-600 to-indigo-700', note: 'Enterprise leadership' },
  { id: 'executive', label: 'Executive', accent: 'from-slate-700 to-slate-950', note: 'Senior profiles' },
  { id: 'ats', label: 'ATS Optimized', accent: 'from-emerald-500 to-cyan-500', note: 'Parser friendly' },
  { id: 'modern', label: 'Modern Tech', accent: 'from-violet-500 to-blue-500', note: 'Product and tech' },
  { id: 'minimal', label: 'Minimal', accent: 'from-slate-300 to-white', note: 'Clean and compact' },
  { id: 'creative', label: 'Creative Pro', accent: 'from-fuchsia-500 to-rose-500', note: 'Brand-forward' },
];

const themes = {
  violet: '#7C3AED',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  emerald: '#059669',
  rose: '#E11D48',
  slate: '#334155',
};

const fonts = ['Inter', 'Arial', 'Georgia', 'Garamond', 'Trebuchet MS'];
const layouts = ['Compact', 'Balanced', 'Spacious'];

const steps = [
  { id: 'profile', label: 'Personal', icon: FileText },
  { id: 'summary', label: 'Summary', icon: Sparkles },
  { id: 'experience', label: 'Experience', icon: BriefcaseBusiness },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: ShieldCheck },
  { id: 'extras', label: 'Extras', icon: Award },
  { id: 'design', label: 'Design', icon: Palette },
];

const sectionTypes = [
  { type: 'summary', label: 'Professional Summary', icon: Sparkles },
  { type: 'experience', label: 'Experience', icon: BriefcaseBusiness },
  { type: 'education', label: 'Education', icon: GraduationCap },
  { type: 'skills', label: 'Skills', icon: ShieldCheck },
  { type: 'certifications', label: 'Certifications', icon: Award },
  { type: 'projects', label: 'Projects', icon: LayoutTemplate },
  { type: 'achievements', label: 'Achievements', icon: Target },
  { type: 'languages', label: 'Languages', icon: Languages },
  { type: 'social', label: 'Social Links', icon: LinkIcon },
];

const aiActions = [
  { action: 'summary', label: 'AI summary generation', icon: Sparkles },
  { action: 'rewrite', label: 'AI resume enhancement', icon: Wand2 },
  { action: 'experience', label: 'AI bullet rewriting', icon: BriefcaseBusiness },
  { action: 'grammar', label: 'AI grammar improvement', icon: CheckCircle2 },
  { action: 'keywords', label: 'AI keyword optimization', icon: Target },
  { action: 'score', label: 'AI ATS optimization', icon: CircleGauge },
  { action: 'skills', label: 'AI skill recommendations', icon: ShieldCheck },
  { action: 'template', label: 'AI template recommendations', icon: LayoutTemplate },
  { action: 'achievement', label: 'AI achievement generation', icon: Award },
  { action: 'interview', label: 'AI interview questions', icon: Bot },
];

const inputClass = 'peer w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 pb-3 pt-6 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-transparent focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-white/[0.04] dark:text-white';
const labelClass = 'pointer-events-none absolute left-4 top-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 transition peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-violet-500';

const sectionFieldLabels = {
  experience: {
    primary: 'Role',
    secondary: 'Company',
    date: 'Period',
    details: 'Work highlights and impact',
    fallback: 'Role',
  },
  education: {
    primary: 'Degree or credential',
    secondary: 'School or institution',
    date: 'Year or period',
    details: 'Academic details',
    fallback: 'Credential',
  },
  certifications: {
    primary: 'Credential',
    secondary: 'Issuing organization',
    date: 'Issued date',
    details: 'Credential details',
    fallback: 'Credential',
  },
  projects: {
    primary: 'Project name',
    secondary: 'Client, team, or platform',
    date: 'Project period',
    details: 'Project outcome and contribution',
    fallback: 'Project',
  },
  achievements: {
    primary: 'Achievement title',
    secondary: 'Context',
    date: 'Date',
    details: 'Result or proof',
    fallback: 'Achievement',
  },
  social: {
    primary: 'Profile name',
    secondary: 'Platform',
    date: 'Optional date',
    details: 'URL or note',
    fallback: 'Profile',
  },
};

const getSectionFieldLabels = (type) => sectionFieldLabels[type] || {
  primary: 'Title',
  secondary: 'Organization',
  date: 'Period',
  details: 'Details',
  fallback: 'Entry',
};

const emptySection = (type) => ({
  id: `${type}-${Date.now()}`,
  type,
  title: sectionTypes.find((section) => section.type === type)?.label || type.charAt(0).toUpperCase() + type.slice(1),
  items: type === 'skills' || type === 'summary' || type === 'languages'
    ? [{ text: '' }]
    : [{ role: '', company: '', period: '', description: '' }],
});

const defaultResume = (user) => ({
  title: user?.name ? `${user.name} Resume` : 'Untitled Resume',
  target_role: '',
  template: 'modern',
  theme: 'slate',
  font: 'Inter',
  layout: 'Balanced',
  visibility: 'private',
  personal: {
    name: user?.name || '',
    headline: '',
    email: user?.email || '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    portfolio: '',
    image: '',
    imageBg: '#0f172a',
    imageZoom: 1,
  },
  sections: [
    { id: 'summary', type: 'summary', title: 'Professional Summary', items: [{ text: '' }] },
    { id: 'experience', type: 'experience', title: 'Experience', items: [{ role: '', company: '', period: '', description: '' }] },
    { id: 'education', type: 'education', title: 'Education', items: [{ role: '', company: '', period: '', description: '' }] },
    { id: 'skills', type: 'skills', title: 'Skills', items: [{ text: '' }] },
    { id: 'projects', type: 'projects', title: 'Projects', items: [{ role: '', company: '', period: '', description: '' }] },
    { id: 'certifications', type: 'certifications', title: 'Certifications', items: [{ role: '', company: '', period: '', description: '' }] },
    { id: 'achievements', type: 'achievements', title: 'Achievements', items: [{ role: '', company: '', period: '', description: '' }] },
    { id: 'languages', type: 'languages', title: 'Languages', items: [{ text: '' }] },
    { id: 'social', type: 'social', title: 'Social Links', items: [{ role: '', company: '', period: '', description: '' }] },
  ],
  analytics: { views: 0, downloads: 0, score: 0 },
});

function FloatingField({ label, value, onChange, type = 'text', textarea = false, rows = 4 }) {
  return (
    <label className="relative block">
      {textarea ? (
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={label} className={`${inputClass} resize-none leading-6`} />
      ) : (
        <input value={value || ''} onChange={(event) => onChange(event.target.value)} type={type} placeholder={label} className={inputClass} />
      )}
      <span className={labelClass}>{label}</span>
    </label>
  );
}

function ScoreRing({ value = 0, label = 'ATS' }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="-rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={radius} stroke="rgba(148,163,184,0.22)" strokeWidth="10" fill="none" />
        <circle cx="56" cy="56" r={radius} stroke="#06B6D4" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-slate-950 dark:text-white">{normalized}</p>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function ResumePreview({ resume, zoom }) {
  const accent = themes[resume.theme] || themes.violet;
  const isMinimal = resume.template === 'minimal' || resume.template === 'ats';
  const isExecutive = resume.template === 'executive';
  const padding = resume.layout === 'Compact' ? 'p-8' : resume.layout === 'Spacious' ? 'p-12' : 'p-10';
  const fontFamily = resume.font || 'Inter';
  const personal = resume.personal || {};

  return (
    <div className="max-h-[calc(100vh-220px)] overflow-auto rounded-2xl border border-slate-200/80 bg-slate-100/70 p-4 shadow-inner dark:border-white/10 dark:bg-slate-950/80">
      <div
        className={`mx-auto min-h-[980px] w-[760px] origin-top overflow-hidden bg-white text-slate-950 shadow-2xl transition-transform ${resume.template === 'creative' ? 'rounded-[2rem]' : ''}`}
        style={{ transform: `scale(${zoom})`, marginBottom: `${(zoom - 1) * 980}px`, fontFamily }}
      >
        <div className={isMinimal ? padding : 'grid min-h-[980px] grid-cols-[246px_1fr]'}>
          {!isMinimal && (
            <aside className={`${isExecutive ? 'bg-slate-950' : ''} p-8 text-white`} style={{ background: isExecutive ? '#0f172a' : accent }}>
              {personal.image ? (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl shadow-xl" style={{ background: personal.imageBg || '#0f172a' }}>
                  <img src={personal.image} alt="" className="h-24 w-24 rounded-2xl object-cover" style={{ transform: `scale(${personal.imageZoom || 1})` }} />
                </div>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/20 text-4xl font-black">
                  {personal.name?.[0] || 'R'}
                </div>
              )}
              <h2 className="mt-8 text-3xl font-black leading-tight">{personal.name || 'Your Name'}</h2>
              <p className="mt-2 text-sm font-semibold opacity-90">{personal.headline || resume.target_role}</p>
              <div className="mt-8 space-y-2 text-xs opacity-90">
                {[personal.email, personal.phone, personal.location, personal.website, personal.linkedin, personal.portfolio].filter(Boolean).map((item) => <p key={item}>{item}</p>)}
              </div>
            </aside>
          )}

          <main className={isMinimal ? '' : padding}>
            {isMinimal && (
              <header className="border-b pb-6">
                <h2 className="text-4xl font-black">{personal.name || 'Your Name'}</h2>
                <p className="mt-2 text-lg font-semibold" style={{ color: accent }}>{personal.headline || resume.target_role}</p>
                <p className="mt-3 text-xs text-slate-500">{[personal.email, personal.phone, personal.location, personal.website, personal.linkedin].filter(Boolean).join(' | ')}</p>
              </header>
            )}

            <div className="space-y-7">
              {resume.sections?.map((section) => (
                <section key={section.id}>
                  <h3 className="mb-3 border-b pb-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: accent }}>
                    {section.title}
                  </h3>
                  <div className="space-y-4">
                    {section.items?.map((item, index) => {
                      const labels = getSectionFieldLabels(section.type);
                      return (
                        <div key={`${section.id}-${index}`}>
                          {section.type === 'summary' || section.type === 'skills' || section.type === 'languages' ? (
                            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{item.text}</p>
                          ) : (
                            <div>
                              <div className="flex items-baseline justify-between gap-4">
                                <p className="font-bold">{item.role || item.company || labels.fallback}</p>
                                <p className="text-xs text-slate-500">{item.period}</p>
                              </div>
                              <p className="text-sm font-semibold" style={{ color: accent }}>{item.company}</p>
                              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{item.description}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ResumeBuilderPage() {
  const [resumes, setResumes] = useState([]);
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [zoom, setZoom] = useState(0.72);
  const [step, setStep] = useState('profile');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [aiOutput, setAiOutput] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const saveTimer = useRef(null);

  const filteredResumes = useMemo(() => {
    const normalized = query.toLowerCase();
    return resumes.filter((resume) =>
      [resume.title, resume.target_role, resume.template].join(' ').toLowerCase().includes(normalized)
    );
  }, [query, resumes]);

  const sectionMap = useMemo(() => {
    const map = {};
    active?.sections?.forEach((section, index) => {
      if (!map[section.type]) map[section.type] = { section, index };
    });
    return map;
  }, [active]);

  const completeness = useMemo(() => {
    if (!active) return 0;
    const personal = active.personal || {};
    const fields = [personal.name, personal.email, personal.phone, personal.location, personal.headline, active.target_role];
    const sectionScore = Math.min(50, (active.sections || []).filter((section) => section.items?.some((item) => item.text || item.description || item.role)).length * 6);
    return Math.min(100, fields.filter(Boolean).length * 8 + sectionScore);
  }, [active]);

  const atsScore = Math.min(98, Math.max(48, active?.analytics?.score || completeness || 82));
  const semanticScore = Math.min(96, Math.max(52, Math.round((atsScore + completeness) / 2)));
  const confidenceScore = Math.min(97, Math.max(58, atsScore + (active?.sections?.length || 0) - 3));
  const resumeText = useMemo(() => JSON.stringify(active?.sections || []).toLowerCase(), [active?.sections]);
  const targetKeywords = useMemo(() => Array.from(new Set(String(active?.target_role || '').toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) || [])).slice(0, 10), [active?.target_role]);
  const matchedKeywords = useMemo(() => targetKeywords.filter((keyword) => resumeText.includes(keyword)).slice(0, 8), [resumeText, targetKeywords]);
  const missingKeywords = useMemo(() => targetKeywords.filter((keyword) => !resumeText.includes(keyword)).slice(0, 8), [resumeText, targetKeywords]);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const data = await fetchResumes();
      setResumes(data);
      setActive(data[0] || null);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load resumes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
    const handleResumeUpdate = () => loadResumes();
    window.addEventListener('hrms:resume-updated', handleResumeUpdate);
    return () => window.removeEventListener('hrms:resume-updated', handleResumeUpdate);
  }, []);

  useEffect(() => {
    if (!active?.id) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const saved = await updateResume(active.id, active);
        setResumes((items) => items.map((item) => (item.id === saved.id ? saved : item)));
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Auto-save failed');
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => window.clearTimeout(saveTimer.current);
  }, [active]);

  useEffect(() => {
    if (!active?.id || !active.sections) return;
    const required = ['summary', 'experience', 'education', 'skills', 'certifications', 'projects', 'achievements', 'languages', 'social'];
    const existing = new Set(active.sections.map((section) => section.type));
    const missing = required.filter((type) => !existing.has(type));
    if (missing.length) {
      updateActive({ sections: [...active.sections, ...missing.map((type) => emptySection(type))] });
    }
  }, [active?.id]);

  const updateActive = (patch) => setActive((resume) => ({ ...resume, ...patch }));
  const updatePersonal = (field, value) => updateActive({ personal: { ...active.personal, [field]: value } });

  const updateSection = (sectionIndex, patch) => {
    const sections = [...active.sections];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch };
    updateActive({ sections });
  };

  const updateItem = (sectionIndex, itemIndex, patch) => {
    const sections = [...active.sections];
    const items = [...sections[sectionIndex].items];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    sections[sectionIndex] = { ...sections[sectionIndex], items };
    updateActive({ sections });
  };

  const addItem = (sectionIndex) => {
    const section = active.sections[sectionIndex];
    const item = section.type === 'summary' || section.type === 'skills' || section.type === 'languages'
      ? { text: '' }
      : { role: '', company: '', period: '', description: '' };
    updateSection(sectionIndex, { items: [...section.items, item] });
  };

  const removeItem = (sectionIndex, itemIndex) => {
    const section = active.sections[sectionIndex];
    updateSection(sectionIndex, { items: section.items.filter((_, index) => index !== itemIndex) });
  };

  const addSection = (type) => {
    updateActive({ sections: [...(active.sections || []), emptySection(type)] });
  };

  const reorderSection = (from, to) => {
    if (from === null || to === null || from === to) return;
    const sections = [...active.sections];
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    updateActive({ sections });
    setDragIndex(null);
  };

  const createNewResume = async () => {
    try {
      const created = await createResume(defaultResume(JSON.parse(localStorage.getItem('hrms_user') || '{}')));
      setResumes((items) => [created, ...items]);
      setActive(created);
      toast.success('Resume created');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create resume');
    }
  };

  const handleDuplicate = async (id) => {
    const duplicated = await duplicateResume(id);
    setResumes((items) => [duplicated, ...items]);
    setActive(duplicated);
    toast.success('Resume duplicated');
  };

  const handleDelete = async (id) => {
    await deleteResume(id);
    const next = resumes.filter((resume) => resume.id !== id);
    setResumes(next);
    setActive(next[0] || null);
    toast.info('Resume deleted');
  };

  const handleParseUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const parsed = await parseResumeFile(file);
      const created = await createResume({ ...parsed, template: active?.template || 'modern', theme: active?.theme || 'violet' });
      setResumes((items) => [created, ...items]);
      setActive(created);
      toast.success('Resume parsed and converted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Upload parsing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 420;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = active.personal?.imageBg || '#0f172a';
        ctx.fillRect(0, 0, size, size);
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        updatePersonal('image', canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const exportDoc = () => {
    const lines = [
      active.personal?.name,
      active.personal?.headline,
      [active.personal?.email, active.personal?.phone, active.personal?.location, active.personal?.website, active.personal?.linkedin].filter(Boolean).join(' | '),
      '',
      ...(active.sections || []).flatMap((section) => [
        section.title?.toUpperCase(),
        ...(section.items || []).map((item) => item.text || [item.role, item.company, item.period, item.description].filter(Boolean).join('\n')),
        '',
      ]),
    ].filter((line) => line !== undefined);
    const blob = new Blob([lines.join('\n')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${active.title || 'resume'}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runAi = async (action, content, applyResult) => {
    setAiLoading(true);
    try {
      const { result } = await optimizeResumeContent({ action, content, job_description: active.target_role });
      setAiOutput(result);
      if (applyResult) applyResult(result);
      toast.success('AI suggestion applied');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'AI optimization failed');
    } finally {
      setAiLoading(false);
    }
  };

  const renderSectionEditor = (type) => {
    const found = sectionMap[type];
    if (!found) {
      return (
        <div className="premium-panel p-5">
          <p className="metric-label">{type}</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Add this resume section</h2>
          <button onClick={() => addSection(type)} className="premium-button mt-4 bg-violet-500 text-white"><Plus size={16} /> Add section</button>
        </div>
      );
    }
    const { section, index: sectionIndex } = found;
    const Icon = sectionTypes.find((item) => item.type === type)?.icon || FileText;
    const textOnly = ['summary', 'skills', 'languages'].includes(section.type);
    const labels = getSectionFieldLabels(section.type);

    return (
      <motion.div key={section.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-500/10 p-2 text-violet-500 dark:text-cyan-300"><Icon size={19} /></div>
            <div>
              <p className="metric-label">{section.type}</p>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">{section.title}</h2>
            </div>
          </div>
          <button onClick={() => runAi(textOnly ? section.type : 'experience', JSON.stringify(section.items), (result) => {
            if (textOnly) updateItem(sectionIndex, 0, { text: result });
            else toast.info(result);
          })} className="premium-button bg-violet-500/10 text-violet-600 hover:bg-violet-500/15 dark:text-violet-200">
            {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} AI improve
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <FloatingField label="Section title" value={section.title} onChange={(value) => updateSection(sectionIndex, { title: value })} />
          {section.items.map((item, itemIndex) => (
            <div key={`${section.id}-${itemIndex}`} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              {textOnly ? (
                <FloatingField label={section.type === 'skills' ? 'Skills, keywords, tools' : section.title} value={item.text || ''} onChange={(value) => updateItem(sectionIndex, itemIndex, { text: value })} textarea rows={section.type === 'summary' ? 6 : 4} />
              ) : (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FloatingField label={labels.primary} value={item.role || ''} onChange={(value) => updateItem(sectionIndex, itemIndex, { role: value })} />
                    <FloatingField label={labels.secondary} value={item.company || ''} onChange={(value) => updateItem(sectionIndex, itemIndex, { company: value })} />
                  </div>
                  <FloatingField label={labels.date} value={item.period || ''} onChange={(value) => updateItem(sectionIndex, itemIndex, { period: value })} />
                  <FloatingField label={labels.details} value={item.description || ''} onChange={(value) => updateItem(sectionIndex, itemIndex, { description: value })} textarea rows={5} />
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-between gap-2">
                <button onClick={() => runAi(textOnly ? 'rewrite' : 'experience', item.text || item.description || '', (result) => textOnly ? updateItem(sectionIndex, itemIndex, { text: result }) : updateItem(sectionIndex, itemIndex, { description: result }))} className="premium-button bg-cyan-400/10 px-3 py-2 text-xs text-cyan-600 dark:text-cyan-300">
                  <Wand2 size={14} /> Rewrite
                </button>
                <button onClick={() => removeItem(sectionIndex, itemIndex)} className="premium-button px-3 py-2 text-xs text-slate-500 hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => addItem(sectionIndex)} className="premium-button border border-dashed border-slate-300 text-slate-500 hover:border-violet-400 hover:text-violet-500 dark:border-white/10">
            <Plus size={16} /> Add item
          </button>
        </div>
      </motion.div>
    );
  };

  const publicLink = active?.share_id ? `${window.location.origin}/resume/${active.share_id}` : '';

  return (
    <div className="space-y-6">
      <Topbar title="AI Resume Builder" />

      <div className="grid gap-4 2xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <div className="premium-panel p-4">
            <button onClick={createNewResume} className="premium-button w-full bg-gradient-to-r from-violet-500 to-cyan-400 py-3 font-black text-white shadow-lg shadow-violet-500/20">
              <FilePlus2 size={17} /> New resume
            </button>
            <label className="premium-button mt-3 w-full cursor-pointer border border-dashed border-slate-300 py-3 text-slate-500 hover:border-cyan-400 hover:text-cyan-500 dark:border-white/10">
              <UploadCloud size={17} /> Parse PDF/DOCX
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={(event) => handleParseUpload(event.target.files?.[0])} />
            </label>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resumes" className="premium-input w-full pl-10" />
            </div>
          </div>

          <div className="premium-panel p-3">
            <p className="metric-label px-2 py-2">Resume library</p>
            <div className="space-y-2">
              {loading ? [...Array(3)].map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/[0.05]" />) : filteredResumes.length ? (
                filteredResumes.map((resume) => (
                  <button key={resume.id} onClick={() => setActive(resume)} className={`w-full rounded-2xl border p-3 text-left transition ${active?.id === resume.id ? 'border-violet-400 bg-violet-500/10' : 'border-slate-200/80 bg-white/50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">{resume.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{resume.target_role || 'General resume'}</p>
                      </div>
                      <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-black uppercase text-cyan-500">{resume.template}</span>
                    </div>
                    <p className="mt-3 text-[11px] font-semibold text-slate-400">Updated {resume.updated_at ? new Date(resume.updated_at).toLocaleString() : 'recently'}</p>
                  </button>
                ))
              ) : <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400 dark:border-white/10">No resumes match.</div>}
            </div>
          </div>
        </aside>

        {!active ? (
          <div className="premium-panel flex min-h-[620px] flex-col items-center justify-center p-10 text-center">
            <LayoutTemplate className="text-slate-400" size={48} />
            <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">Create your first AI resume</h2>
            <p className="mt-2 max-w-md text-slate-500">Start from a premium template or upload an existing resume to auto-fill the builder.</p>
          </div>
        ) : (
          <main className="grid min-w-0 gap-4 xl:grid-cols-[minmax(390px,560px)_minmax(0,1fr)]">
            <section className="min-w-0 space-y-4">
              <div className="premium-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="metric-label">Professional form wizard</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Resume workspace</h2>
                  </div>
                  <div className="premium-chip">
                    {saving ? <><Loader2 className="animate-spin" size={14} /> Autosaving</> : <><CheckCircle2 size={14} /> Autosaved</>}
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${completeness}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{completeness}% profile completion</p>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {steps.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => setStep(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition ${step === item.id ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-500 hover:text-slate-950 dark:bg-white/[0.05] dark:hover:text-white'}`}>
                        <Icon size={14} /> {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }} className="space-y-4">
                  {step === 'profile' && (
                    <>
                      <div className="premium-panel p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="metric-label">Personal information</p>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">Identity and contact</h2>
                          </div>
                          <span className="premium-chip">Inline edit</span>
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <FloatingField label="Resume title" value={active.title} onChange={(value) => updateActive({ title: value })} />
                          <FloatingField label="Target role or keywords" value={active.target_role || ''} onChange={(value) => updateActive({ target_role: value })} />
                          {['name', 'headline', 'email', 'phone', 'location', 'website', 'linkedin', 'portfolio'].map((field) => (
                            <FloatingField key={field} label={field.replace('_', ' ')} value={active.personal?.[field] || ''} onChange={(value) => updatePersonal(field, value)} />
                          ))}
                        </div>
                      </div>

                      <div className="premium-panel p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="metric-label">Profile image studio</p>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">Avatar preview and crop</h2>
                          </div>
                          <Image size={20} className="text-violet-500" />
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-[150px_1fr]">
                          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.05]" style={{ background: active.personal?.imageBg || '#0f172a' }}>
                            {active.personal?.image ? <img src={active.personal.image} alt="" className="h-32 w-32 rounded-2xl object-cover" style={{ transform: `scale(${active.personal?.imageZoom || 1})` }} /> : <span className="text-4xl font-black text-white">{active.personal?.name?.[0] || 'R'}</span>}
                          </div>
                          <div className="space-y-3">
                            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-center text-sm font-bold text-slate-500 transition hover:border-violet-400 hover:text-violet-500 dark:border-white/10 dark:bg-white/[0.04]">
                              <UploadCloud size={20} />
                              Drag-drop or click to upload image
                              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
                            </label>
                            <label className="block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                              Crop zoom
                              <input type="range" min="1" max="1.8" step="0.05" value={active.personal?.imageZoom || 1} onChange={(event) => updatePersonal('imageZoom', Number(event.target.value))} className="mt-2 w-full" />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['#0f172a', '#ffffff', '#7C3AED', '#06B6D4', '#e2e8f0'].map((color) => <button key={color} aria-label={color} onClick={() => updatePersonal('imageBg', color)} className="h-8 w-8 rounded-xl border border-slate-300 dark:border-white/10" style={{ background: color }} />)}
                              <button onClick={() => updatePersonal('imageBg', 'transparent')} className="premium-button px-3 py-2 text-xs text-slate-500">Remove bg</button>
                              <button onClick={() => updatePersonal('image', '')} className="premium-button px-3 py-2 text-xs text-rose-500">Clear</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 'summary' && renderSectionEditor('summary')}
                  {step === 'experience' && renderSectionEditor('experience')}
                  {step === 'education' && renderSectionEditor('education')}
                  {step === 'skills' && renderSectionEditor('skills')}

                  {step === 'extras' && (
                    <div className="space-y-4">
                      {['certifications', 'projects', 'achievements', 'languages', 'social'].map((type) => renderSectionEditor(type))}
                    </div>
                  )}

                  {step === 'design' && (
                    <div className="space-y-4">
                      <div className="premium-panel p-5">
                        <p className="metric-label">Resume template system</p>
                        <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Premium templates</h2>
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {templates.map((template) => (
                            <button key={template.id} onClick={() => updateActive({ template: template.id })} className={`rounded-2xl border p-4 text-left transition ${active.template === template.id ? 'border-violet-400 bg-violet-500/10' : 'border-slate-200/80 bg-slate-50/80 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04]'}`}>
                              <span className={`mb-4 block h-2 rounded-full bg-gradient-to-r ${template.accent}`} />
                              <span className="block font-black text-slate-950 dark:text-white">{template.label}</span>
                              <span className="mt-1 block text-xs text-slate-500">{template.note}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="premium-panel p-5">
                        <p className="metric-label">Theme customization</p>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Accent color</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {Object.entries(themes).map(([name, value]) => <button key={name} aria-label={name} onClick={() => updateActive({ theme: name })} className={`h-9 w-9 rounded-2xl border-2 ${active.theme === name ? 'border-slate-950 dark:border-white' : 'border-transparent'}`} style={{ background: value }} />)}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Typography</p>
                            <div className="mt-3 grid gap-2">
                              <select value={active.font || 'Inter'} onChange={(event) => updateActive({ font: event.target.value })} className="premium-input">
                                {fonts.map((font) => <option key={font} value={font}>{font}</option>)}
                              </select>
                              <select value={active.layout || 'Balanced'} onChange={(event) => updateActive({ layout: event.target.value })} className="premium-input">
                                {layouts.map((layout) => <option key={layout} value={layout}>{layout}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="premium-panel p-5">
                        <p className="metric-label">Section library</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {sectionTypes.map(({ type, label, icon: Icon }) => (
                            <button key={type} onClick={() => addSection(type)} className="premium-button bg-slate-100 px-3 py-2 text-xs text-slate-600 hover:text-violet-500 dark:bg-white/[0.05] dark:text-slate-300">
                              <Icon size={14} /> {label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-5 space-y-2">
                          {active.sections?.map((section, index) => (
                            <div key={section.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderSection(dragIndex, index)} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{section.title}</span>
                              <button onClick={() => updateActive({ sections: active.sections.filter((_, itemIndex) => itemIndex !== index) })} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </section>

            <section className="min-w-0 space-y-4">
              <div className="premium-panel sticky top-28 z-10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="metric-label">Live resume preview</p>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">Export-ready document</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setZoom((value) => Math.max(0.5, value - 0.08))} className="premium-button h-10 w-10 p-0 dark:bg-white/[0.05]" aria-label="Zoom out"><ZoomOut size={16} /></button>
                    <button onClick={() => setZoom((value) => Math.min(1, value + 0.08))} className="premium-button h-10 w-10 p-0 dark:bg-white/[0.05]" aria-label="Zoom in"><ZoomIn size={16} /></button>
                    <button onClick={() => window.print()} className="premium-button bg-slate-950 text-white dark:bg-white dark:text-slate-950"><Download size={16} /> Print</button>
                    <button onClick={exportDoc} className="premium-button dark:bg-white/[0.06]"><Download size={16} /> DOCX</button>
                  </div>
                </div>
              </div>

              <ResumePreview resume={active} zoom={zoom} />
            </section>
          </main>
        )}

        {active && (
          <aside className="space-y-4">
            <div className="premium-panel p-4">
              <button onClick={() => setDrawerOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
                <span>
                  <span className="metric-label block">AI assistant sidebar</span>
                  <span className="mt-1 block text-lg font-black text-slate-950 dark:text-white">Resume Copilot</span>
                </span>
                <ChevronRight className={`transition ${drawerOpen ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {drawerOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 grid gap-2">
                      {aiActions.map(({ action, label, icon: Icon }) => (
                        <button key={action} onClick={() => runAi(action, JSON.stringify(active.sections), null)} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 text-left text-sm font-bold text-slate-600 transition hover:border-violet-400 hover:text-violet-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          <Icon size={17} className="text-cyan-500" /> {label}
                        </button>
                      ))}
                    </div>
                    {aiOutput && (
                      <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        <p className="mb-2 font-black text-cyan-600 dark:text-cyan-300">AI suggestion</p>
                        {aiOutput}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="premium-panel p-4">
              <p className="metric-label">ATS optimization widget</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <ScoreRing value={atsScore} label="ATS" />
                <div className="min-w-0 flex-1 space-y-3">
                  {[
                    ['Semantic matching', semanticScore],
                    ['Resume completeness', completeness],
                    ['Recruiter visibility', Math.min(96, atsScore + 4)],
                    ['AI confidence', confidenceScore],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-xs font-bold text-slate-500"><span>{label}</span><span>{value}%</span></div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="premium-panel p-4">
              <p className="metric-label">Keyword matching</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {matchedKeywords.length ? matchedKeywords.map((keyword) => <span key={keyword} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">{keyword}</span>) : <span className="text-xs font-semibold text-slate-400">Add target-role keywords to measure matches.</span>}
              </div>
              <p className="metric-label mt-5">Missing skills</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {missingKeywords.length ? missingKeywords.map((keyword) => <span key={keyword} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">{keyword}</span>) : <span className="text-xs font-semibold text-slate-400">No target keyword gaps detected.</span>}
              </div>
            </div>

            <div className="premium-panel p-4">
              <p className="metric-label">Resume heatmap</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {Array.from({ length: 16 }).map((_, index) => (
                  <div key={index} className={`h-10 rounded-xl ${index % 5 === 0 ? 'bg-amber-400/25' : index % 3 === 0 ? 'bg-blue-400/25' : 'bg-cyan-400/25'}`} />
                ))}
              </div>
            </div>

            <div className="premium-panel p-4">
              <p className="metric-label">Publishing</p>
              <div className="mt-4 grid gap-2">
                <button onClick={() => updateActive({ visibility: active.visibility === 'public' ? 'private' : 'public' })} className="premium-button justify-start dark:bg-white/[0.05]"><Eye size={16} /> {active.visibility === 'public' ? 'Public' : 'Private'}</button>
                <button onClick={() => handleDuplicate(active.id)} className="premium-button justify-start dark:bg-white/[0.05]"><Copy size={16} /> Duplicate</button>
                <button onClick={() => navigator.clipboard.writeText(publicLink).then(() => toast.success('Public link copied'))} disabled={active.visibility !== 'public'} className="premium-button justify-start bg-cyan-400 text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"><Share2 size={16} /> Share public link</button>
                <button onClick={() => handleDelete(active.id)} className="premium-button justify-start bg-rose-500/10 text-rose-500"><Trash2 size={16} /> Delete resume</button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
