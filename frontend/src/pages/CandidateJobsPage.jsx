import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Bookmark, BookmarkCheck, BriefcaseBusiness, CheckCircle2, Loader2, MapPin, Send, Sparkles, XCircle } from 'lucide-react';
import Topbar from '../components/Topbar';
import api from '../services/api';

function JobCard({ job, mode, onSave, onUnsave, onApply, onWithdraw, busy }) {
  return (
    <div className="premium-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness size={18} className="text-blue-600" />
            <p className="truncate text-lg font-black text-slate-950">{job.role || job.job_title || 'Open role'}</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {[job.department, job.company, job.location].filter(Boolean).join(' - ') || 'Company details not recorded'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.saved && <span className="premium-chip border-emerald-200 bg-emerald-50 text-emerald-700"><BookmarkCheck size={14} /> Saved</span>}
          {job.applied && <span className="premium-chip border-blue-200 bg-blue-50 text-blue-700"><CheckCircle2 size={14} /> Applied</span>}
        </div>
      </div>

      {'match' in job && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Match</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{Math.round(job.match || 0)}%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Hiring probability</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{Math.round(job.probability || 0)}%</p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Matched skills</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(job.matched_skills || []).length ? job.matched_skills.map((skill) => (
              <span key={skill} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700">{skill}</span>
            )) : <span className="text-sm text-slate-500">No overlap recorded yet.</span>}
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Skill gaps</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(job.missing_skills || []).length ? job.missing_skills.map((skill) => (
              <span key={skill} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-700">{skill}</span>
            )) : <span className="text-sm text-slate-500">No skill gaps detected.</span>}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {job.saved ? (
          <button disabled={busy} onClick={() => onUnsave(job)} className="premium-button border border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:text-rose-600">
            <XCircle size={16} /> Unsave
          </button>
        ) : (
          <button disabled={busy} onClick={() => onSave(job)} className="premium-button border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700">
            <Bookmark size={16} /> Save
          </button>
        )}
        {job.applied ? (
          <button disabled={busy} onClick={() => onWithdraw(job)} className="premium-button bg-slate-100 text-slate-600 hover:text-rose-600">
            <XCircle size={16} /> Withdraw
          </button>
        ) : (
          <button disabled={busy} onClick={() => onApply(job)} className="premium-button bg-slate-950 text-white hover:bg-blue-700">
            <Send size={16} /> Apply
          </button>
        )}
      </div>
    </div>
  );
}

export default function CandidateJobsPage({ mode = 'matches' }) {
  const [matches, setMatches] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    const [matchesResult, savedResult, applicationsResult] = await Promise.allSettled([
      api.get('/api/candidate/job-matches'),
      api.get('/api/candidate/saved-jobs'),
      api.get('/api/candidate/applications'),
    ]);
    if (matchesResult.status === 'fulfilled') {
      setMatches(matchesResult.value.data.jobs || []);
      setStats(matchesResult.value.data.stats || {});
    }
    if (savedResult.status === 'fulfilled') setSavedJobs(savedResult.value.data || []);
    if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const applicationByJob = useMemo(() => {
    const map = new Map();
    applications.forEach((item) => {
      if (item.job_id && item.status !== 'withdrawn') map.set(String(item.job_id), item);
    });
    return map;
  }, [applications]);

  const savedIds = useMemo(() => new Set(savedJobs.map((item) => String(item.job_id))), [savedJobs]);

  const visibleJobs = useMemo(() => {
    if (mode === 'saved') {
      return savedJobs.map((job) => ({
        id: job.job_id,
        role: job.job_title,
        company: job.company,
        location: job.location,
        saved: true,
        applied: applicationByJob.has(String(job.job_id)),
      }));
    }
    return matches.map((job) => ({
      ...job,
      saved: savedIds.has(String(job.id)) || Boolean(job.saved),
      applied: applicationByJob.has(String(job.id)) || Boolean(job.applied),
      application_id: applicationByJob.get(String(job.id))?.id,
    }));
  }, [applicationByJob, matches, mode, savedIds, savedJobs]);

  const saveJob = async (job) => {
    setBusyId(String(job.id));
    try {
      await api.post('/api/candidate/saved-jobs', {
        job_id: job.id,
        job_title: job.role || job.job_title,
        company: job.company || job.department,
        location: job.location,
      });
      toast.success('Job saved');
      await load();
    } finally {
      setBusyId('');
    }
  };

  const unsaveJob = async (job) => {
    setBusyId(String(job.id));
    try {
      await api.delete(`/api/candidate/saved-jobs/${job.id}`);
      toast.success('Job removed from saved jobs');
      await load();
    } finally {
      setBusyId('');
    }
  };

  const applyJob = async (job) => {
    setBusyId(String(job.id));
    try {
      await api.post('/api/candidate/applications', {
        job_id: job.id,
        job_title: job.role || job.job_title,
        company: job.company || job.department,
        location: job.location,
      });
      toast.success('Application submitted');
      await load();
    } finally {
      setBusyId('');
    }
  };

  const withdrawJob = async (job) => {
    const application = applicationByJob.get(String(job.id));
    if (!application?.id) return;
    setBusyId(String(job.id));
    try {
      await api.post(`/api/candidate/applications/${application.id}/withdraw`);
      toast.success('Application withdrawn');
      await load();
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <Topbar title={mode === 'saved' ? 'Saved Jobs' : 'Job Matches'} />

      <section className="premium-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="metric-label">{mode === 'saved' ? 'Candidate saved jobs' : 'AI job matching'}</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">{mode === 'saved' ? 'Jobs you saved from MongoDB' : 'Recommended jobs from your real resume data'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {mode === 'saved'
                ? 'Saved records are stored in the saved_jobs collection and update the candidate dashboard.'
                : 'Matches use jobs, resume profiles, ATS reports, applications, and saved job records.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Matches', stats.job_matches || matches.length],
              ['Saved', savedJobs.length],
              ['Applied', applications.filter((item) => item.status !== 'withdrawn').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="text-[11px] font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="premium-panel flex min-h-72 items-center justify-center text-sm font-bold text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} /> Loading real job data...
        </div>
      ) : visibleJobs.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              mode={mode}
              busy={busyId === String(job.id)}
              onSave={saveJob}
              onUnsave={unsaveJob}
              onApply={applyJob}
              onWithdraw={withdrawJob}
            />
          ))}
        </section>
      ) : (
        <div className="premium-panel flex min-h-96 flex-col items-center justify-center p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Sparkles size={24} /></div>
          <h2 className="mt-5 text-xl font-black text-slate-950">{mode === 'saved' ? 'No saved jobs yet' : 'No matched jobs yet'}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {mode === 'saved'
              ? 'Save jobs from Job Matches and they will appear here.'
              : 'Add real open jobs to the jobs collection and upload/analyze a candidate resume to generate matches.'}
          </p>
        </div>
      )}
    </div>
  );
}
