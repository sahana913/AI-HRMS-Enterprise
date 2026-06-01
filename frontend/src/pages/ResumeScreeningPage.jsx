import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, Bot, BriefcaseBusiness, CheckCircle2, FileSearch, Gauge, LoaderCircle, Sparkles, Target, UploadCloud } from 'lucide-react';
import api from '../services/api';
import Topbar from '../components/Topbar';

const chartColors = ['#06B6D4', '#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#F43F5E'];

const emptyJob = {
  title: '',
  department: '',
  experience: '',
  location: '',
  employmentType: 'Full-time',
  mustHave: '',
  niceHave: '',
  description: '',
};

const statusStyles = {
  Shortlisted: 'bg-emerald-500/10 text-emerald-600 border-emerald-400/30',
  Selected: 'bg-emerald-500/10 text-emerald-600 border-emerald-400/30',
  Review: 'bg-amber-500/10 text-amber-600 border-amber-400/30',
  Rejected: 'bg-rose-500/10 text-rose-600 border-rose-400/30',
  Failed: 'bg-rose-500/10 text-rose-600 border-rose-400/30',
};

const scoreOf = (item) => Math.round(Number(item?.ats?.ats_score ?? item?.ats_score ?? item?.score ?? 0));
const matchOf = (item) => Math.round(Number(item?.ats?.skills_match ?? item?.skill_match_score ?? item?.match_score ?? scoreOf(item)));
const semanticOf = (item) => Math.round(Number(item?.ats?.semantic_score ?? item?.semantic_score ?? scoreOf(item)));
const experienceOf = (item) => Math.round(Number(item?.ats?.experience_match ?? item?.experience_match_score ?? 0));
const candidateName = (item, fallback = 'Candidate') => item?.candidate_name || item?.name || item?.original_filename?.replace(/\.(pdf|docx)$/i, '') || item?.resume_file?.original_filename?.replace(/\.(pdf|docx)$/i, '') || fallback;
const resultStatus = (item) => {
  const decision = item?.decision || item?.status;
  if (decision === 'Selected' || decision === 'Shortlist' || decision === 'shortlisted') return 'Shortlisted';
  if (decision === 'Rejected' || decision === 'rejected') return 'Rejected';
  return scoreOf(item) >= 75 ? 'Shortlisted' : 'Review';
};

function MiniMetric({ label, value, icon: Icon, tone = 'cyan' }) {
  const toneClass = tone === 'rose' ? 'text-rose-500 bg-rose-500/10' : tone === 'emerald' ? 'text-emerald-500 bg-emerald-500/10' : tone === 'amber' ? 'text-amber-500 bg-amber-500/10' : 'text-cyan-500 bg-cyan-500/10';
  return (
    <div className="premium-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function ProgressLine({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function EmptyChart({ label }) {
  return <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm font-semibold text-slate-500 dark:border-white/10">{label}</div>;
}

export default function ResumeScreeningPage({ mode = 'screening' }) {
  const [job, setJob] = useState(emptyJob);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [dashboard, setDashboard] = useState({ totals: {}, candidates: [], charts: {}, insights: {} });

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/ats/dashboard?limit=50');
      setDashboard(response.data || { totals: {}, candidates: [], charts: {}, insights: {} });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const jd = useMemo(() => [
    job.title && `Job Title: ${job.title}`,
    job.department && `Department: ${job.department}`,
    job.experience && `Experience Required: ${job.experience}`,
    job.location && `Location: ${job.location}`,
    job.employmentType && `Employment Type: ${job.employmentType}`,
    job.mustHave && `Must Have Skills: ${job.mustHave}`,
    job.niceHave && `Nice To Have Skills: ${job.niceHave}`,
    job.description,
  ].filter(Boolean).join('\n'), [job]);

  const addFiles = (fileList) => {
    const accepted = Array.from(fileList || []).filter((item) => /\.(pdf|docx)$/i.test(item.name));
    setFiles((current) => {
      const seen = new Set(current.map((item) => `${item.name}-${item.size}`));
      return [...current, ...accepted.filter((item) => !seen.has(`${item.name}-${item.size}`))];
    });
  };

  const extractRequirements = async () => {
    if (!job.description.trim()) return;
    setExtracting(true);
    try {
      const response = await api.post('/api/ats/extract-requirements', { job_description: jd });
      const data = response.data || {};
      setJob((current) => ({
        ...current,
        mustHave: data.skills?.join(', ') || current.mustHave,
        experience: data.experience || current.experience,
        niceHave: data.certifications?.join(', ') || current.niceHave,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setExtracting(false);
    }
  };

  const openResumeAsset = async (resumeFile, modeType = 'preview') => {
    if (!resumeFile?.id) return;
    const endpoint = modeType === 'download' ? 'download' : 'preview';
    const response = await api.get(`/api/resume-files/${resumeFile.id}/${endpoint}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    if (modeType === 'download') {
      const link = document.createElement('a');
      link.href = url;
      link.download = resumeFile.original_filename || resumeFile.stored_filename || 'resume';
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleScreening = async () => {
    if (!files.length || !jd.trim()) return;
    setLoading(true);
    setBatchSummary(null);
    setBatchResults(files.map((file) => ({
      id: `${file.name}-${file.size}`,
      name: file.name,
      upload: 12,
      parsing: 0,
      screening: 0,
      status: 'Queued',
      result: null,
      error: '',
    })));

    const formData = new FormData();
    formData.append('jd', jd);
    files.forEach((file) => formData.append('files', file));

    try {
      setBatchResults((items) => items.map((item) => ({ ...item, upload: 100, parsing: 35, screening: 12, status: 'Parsing' })));
      const response = await api.post('/api/resume-files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const results = response.data?.results || [];
      setBatchSummary(response.data);
      setBatchResults(files.map((file, index) => {
        const item = results[index] || {};
        return {
          id: `${file.name}-${file.size}`,
          name: file.name,
          upload: 100,
          parsing: item.status === 'failed' ? 100 : 100,
          screening: item.status === 'failed' ? 100 : 100,
          status: item.status === 'failed' ? 'Failed' : item.parsing_status || 'Completed',
          result: item.status === 'failed' ? null : item,
          error: item.error || '',
        };
      }));
      await loadDashboard();
    } catch (error) {
      setBatchResults((items) => items.map((item) => ({ ...item, upload: 100, parsing: 100, screening: 100, status: 'Failed', error: error?.response?.data?.detail || 'Batch analysis failed' })));
    } finally {
      setLoading(false);
    }
  };

  const liveResults = useMemo(() => batchResults.filter((item) => item.result).map((item) => ({ ...item.result, name: item.name })), [batchResults]);
  const candidates = useMemo(() => {
    const saved = (dashboard.candidates || []).map((item) => ({ ...item, persisted: true }));
    const byId = new Map();
    [...liveResults, ...saved].forEach((item, index) => byId.set(item.id || item.resume_file?.id || `${candidateName(item)}-${index}`, item));
    return [...byId.values()].sort((a, b) => scoreOf(b) - scoreOf(a));
  }, [dashboard.candidates, liveResults]);

  const totals = useMemo(() => {
    const stored = dashboard.totals || {};
    return {
      uploaded: batchSummary?.total_uploaded ?? stored.uploaded ?? 0,
      processed: batchSummary?.processed ?? stored.completed ?? 0,
      shortlisted: batchSummary?.shortlisted ?? stored.shortlisted ?? 0,
      interviewReady: batchSummary?.interview_ready ?? stored.interview_ready ?? 0,
      rejected: batchSummary?.rejected ?? stored.rejected ?? 0,
      averageAts: stored.average_ats ?? 0,
      pending: batchSummary?.pending ?? Math.max(Number(stored.uploaded || 0) - Number(stored.completed || 0) - Number(stored.failed || 0), 0),
      failed: batchSummary?.failed ?? stored.failed ?? 0,
    };
  }, [batchSummary, dashboard.totals]);

  const topCandidate = candidates[0];
  const topSkills = dashboard.charts?.skill_distribution || [];
  const insights = dashboard.insights || {};
  const avgMatch = candidates.length ? Math.round(candidates.reduce((sum, item) => sum + matchOf(item), 0) / candidates.length) : 0;
  const resultRows = liveResults.length ? liveResults : candidates.slice(0, 12);

  return (
    <div className="space-y-5">
      <Topbar title={mode === 'ats' ? 'ATS Analyzer' : 'AI Resume Screening'} />

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniMetric label="Total Resumes Uploaded" value={totals.uploaded} icon={UploadCloud} />
        <MiniMetric label="Total Processed" value={totals.processed} icon={CheckCircle2} tone="emerald" />
        <MiniMetric label="Shortlisted" value={totals.shortlisted} icon={Target} tone="emerald" />
        <MiniMetric label="Interview Ready" value={totals.interviewReady} icon={BriefcaseBusiness} />
        <MiniMetric label="Rejected" value={totals.rejected} icon={AlertCircle} tone="rose" />
        <MiniMetric label="Average ATS Score" value={`${Math.round(totals.averageAts)}%`} icon={Gauge} tone="amber" />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[0.92fr_1.12fr_0.96fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-panel-strong p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">Job requirements workspace</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Role calibration</h2>
            </div>
            <FileSearch className="text-cyan-500" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['title', 'Job Title', 'text'],
              ['department', 'Department', 'text'],
              ['experience', 'Experience Required', 'text'],
              ['location', 'Location', 'text'],
            ].map(([key, label, type]) => (
              <label key={key} className="text-sm font-semibold text-slate-500">
                {label}
                <input className="premium-input mt-2 w-full" type={type} value={job[key]} onChange={(event) => setJob({ ...job, [key]: event.target.value })} />
              </label>
            ))}
            <label className="text-sm font-semibold text-slate-500 sm:col-span-2">
              Employment Type
              <select className="premium-input mt-2 w-full" value={job.employmentType} onChange={(event) => setJob({ ...job, employmentType: event.target.value })}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
                <option>Remote</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-500">
              Must Have Skills
              <textarea className="premium-input mt-2 min-h-24 w-full resize-none" value={job.mustHave} onChange={(event) => setJob({ ...job, mustHave: event.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-500">
              Nice To Have Skills
              <textarea className="premium-input mt-2 min-h-24 w-full resize-none" value={job.niceHave} onChange={(event) => setJob({ ...job, niceHave: event.target.value })} />
            </label>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-500">
            Paste Job Description
            <textarea className="premium-input mt-2 min-h-56 w-full resize-none leading-6" value={job.description} onChange={(event) => setJob({ ...job, description: event.target.value })} />
          </label>

          <button onClick={extractRequirements} disabled={extracting || !job.description.trim()} className="premium-button mt-4 w-full bg-slate-950 py-3 text-white disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950">
            {extracting ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />} AI Skill Extraction
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="premium-panel-strong p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">Bulk resume screening workspace</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Processing command center</h2>
            </div>
            <span className="premium-chip">PDF / DOCX</span>
          </div>

          <label
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
            className={`mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition ${dragging ? 'border-cyan-300 bg-cyan-400/10' : 'border-slate-300 bg-white/60 hover:border-cyan-400 dark:border-white/10 dark:bg-white/[0.04]'}`}
          >
            <input type="file" accept=".pdf,.docx" multiple className="absolute h-0 w-0 opacity-0" onChange={(event) => addFiles(event.target.files)} />
            <UploadCloud className="text-cyan-500" size={30} />
            <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{files.length ? `${files.length} files queued` : 'Drag resumes here or click to upload'}</p>
            <p className="mt-1 text-xs text-slate-500">Files are stored in MongoDB-linked secure storage before parsing.</p>
          </label>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ['Uploaded', files.length || totals.uploaded],
              ['Processed', totals.processed],
              ['Pending', totals.pending],
              ['Failed', totals.failed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white/70 p-3 text-center dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-lg font-black text-slate-950 dark:text-white">{value}</p>
                <p className="text-[11px] font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 max-h-[430px] space-y-3 overflow-y-auto pr-1">
            {(batchResults.length ? batchResults : files.map((file) => ({ id: `${file.name}-${file.size}`, name: file.name, upload: 0, parsing: 0, screening: 0, status: 'Queued' }))).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.error || item.status}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusStyles[resultStatus(item.result || { status: item.status })] || statusStyles.Review}`}>{item.result ? resultStatus(item.result) : item.status}</span>
                </div>
                <div className="mt-3 space-y-2">
                  <ProgressLine label="Uploading" value={item.upload || 0} />
                  <ProgressLine label="Parsing" value={item.parsing || 0} />
                  <ProgressLine label="Screening" value={item.screening || 0} />
                </div>
              </div>
            ))}
            {!files.length && !batchResults.length && <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10">No resumes queued yet.</div>}
          </div>

          <button onClick={handleScreening} disabled={loading || !files.length || !jd.trim()} className="premium-button mt-5 w-full bg-gradient-to-r from-blue-600 to-cyan-400 py-3 text-white shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <LoaderCircle className="animate-spin" size={16} /> : <Bot size={16} />} Run AI Screening
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-5">
          <div className="premium-panel-strong p-5">
            <p className="metric-label">Live ATS intelligence</p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Recruiter signal</h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-lg bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950">
                <p className="text-xs font-bold text-cyan-300 dark:text-blue-600">Top Candidate</p>
                <p className="mt-2 text-lg font-black">{topCandidate ? candidateName(topCandidate) : 'No candidate yet'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xs font-bold text-slate-500">Highest ATS Score</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{topCandidate ? `${scoreOf(topCandidate)}%` : '0%'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xs font-bold text-slate-500">Average Match Score</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{avgMatch}%</p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase text-slate-500">Top Skills Found</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topSkills.length ? topSkills.slice(0, 8).map((item) => <span key={item.skill} className="rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-700 dark:text-cyan-200">{item.skill}</span>) : <span className="text-sm text-slate-500">No skills extracted yet.</span>}
              </div>
            </div>
          </div>

          <div className="premium-panel p-5">
            <p className="metric-label">Candidate ranking</p>
            <div className="mt-4 space-y-2">
              {candidates.slice(0, 6).map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-[42px_1fr_64px_74px] items-center gap-2 rounded-lg border border-slate-200 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="font-black text-slate-400">#{index + 1}</span>
                  <span className="truncate font-black text-slate-950 dark:text-white">{candidateName(item)}</span>
                  <span className="font-black text-cyan-600">{scoreOf(item)}%</span>
                  <span className={`rounded-full border px-2 py-1 text-center text-[11px] font-black ${statusStyles[resultStatus(item)] || statusStyles.Review}`}>{resultStatus(item)}</span>
                </div>
              ))}
              {!candidates.length && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-white/10">Ranking appears after resumes are screened.</p>}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="premium-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="metric-label">Screening results</p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Candidate evaluation matrix</h2>
          </div>
          <span className="premium-chip">{resultRows.length} candidates</span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs font-black uppercase text-slate-500">
              <tr>
                {['Candidate Name', 'ATS Score', 'Skill Match', 'Experience Match', 'Semantic Match', 'Missing Skills', 'Recommendation', 'Status'].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {resultRows.map((item, index) => {
                const status = resultStatus(item);
                const missing = item?.ats?.missing_keywords || item?.missing_skills || [];
                return (
                  <tr key={item.id || item.resume_file?.id || index} className="border-t border-slate-200 dark:border-white/10">
                    <td className="px-3 py-4 font-black text-slate-950 dark:text-white">{candidateName(item)}</td>
                    <td className="px-3 py-4 font-black text-cyan-600">{scoreOf(item)}%</td>
                    <td className="px-3 py-4">{matchOf(item)}%</td>
                    <td className="px-3 py-4">{experienceOf(item)}%</td>
                    <td className="px-3 py-4">{semanticOf(item)}%</td>
                    <td className="px-3 py-4 text-slate-500">{missing.length ? missing.slice(0, 3).join(', ') : 'None'}</td>
                    <td className="px-3 py-4 text-slate-500">{item.summary || item.recommendation || (status === 'Rejected' ? 'Reject or revisit requirements' : status === 'Shortlisted' ? 'Move to interview review' : 'Recruiter review recommended')}</td>
                    <td className="px-3 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[status]}`}>{status}</span></td>
                  </tr>
                );
              })}
              {!resultRows.length && (
                <tr><td colSpan="8" className="px-3 py-12 text-center text-sm font-semibold text-slate-500">No screening results found in MongoDB yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="premium-panel p-5">
          <p className="metric-label">Hiring funnel</p>
          <div className="mt-5 space-y-3">
            {(dashboard.charts?.hiring_funnel || []).map((item, index, list) => (
              <div key={item.stage}>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="font-black text-slate-950 dark:text-white">{item.stage}</span>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-slate-950">{item.count}</span>
                </div>
                {index < list.length - 1 && <div className="mx-auto h-4 w-px bg-slate-300 dark:bg-white/20" />}
              </div>
            ))}
            {!dashboard.charts?.hiring_funnel?.length && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-white/10">No pipeline analytics available yet.</p>}
          </div>
        </div>

        <div className="premium-panel-strong p-5">
          <p className="metric-label">AI insights panel</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              `${insights.above_80 || 0} candidates match above 80%.`,
              insights.top_missing_skill ? `Top missing skill: ${insights.top_missing_skill}.` : 'No recurring missing skill detected.',
              `${insights.interview_ready || 0} candidates ready for interview.`,
              `Average experience: ${insights.average_experience || 0} years.`,
            ].map((text) => (
              <div key={text} className="rounded-lg border border-white/50 bg-white/70 p-4 text-sm font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                <Sparkles className="mb-3 text-cyan-500" size={18} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-4">
        <div className="premium-panel p-5 xl:col-span-2">
          <p className="metric-label">ATS score distribution</p>
          {dashboard.charts?.score_distribution?.some((item) => item.count) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboard.charts.score_distribution} margin={{ top: 20, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#06B6D4" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No ATS score records yet." />}
        </div>

        <div className="premium-panel p-5 xl:col-span-2">
          <p className="metric-label">Skill distribution</p>
          {topSkills.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topSkills.slice(0, 8)} layout="vertical" margin={{ top: 10, right: 24, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="skill" width={88} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#2563EB" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No extracted skills found yet." />}
        </div>

        <div className="premium-panel p-5 xl:col-span-2">
          <p className="metric-label">Candidate source analytics</p>
          {dashboard.charts?.source_analytics?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dashboard.charts.source_analytics} dataKey="count" nameKey="source" innerRadius={58} outerRadius={96} paddingAngle={3}>
                  {dashboard.charts.source_analytics.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No source records available yet." />}
        </div>

        <div className="premium-panel p-5 xl:col-span-2">
          <p className="metric-label">Hiring funnel analytics</p>
          {dashboard.charts?.hiring_funnel?.some((item) => item.count) ? (
            <ResponsiveContainer width="100%" height={260}>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="count" data={dashboard.charts.hiring_funnel} isAnimationActive>
                  <LabelList position="right" fill="#334155" stroke="none" dataKey="stage" />
                  {dashboard.charts.hiring_funnel.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No hiring funnel data yet." />}
        </div>
      </section>
    </div>
  );
}
