import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot,
  CalendarPlus,
  ChevronDown,
  Filter,
  GripVertical,
  Loader2,
  MessageSquareText,
  Search,
  Sparkles,
  Tag,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getRoleHome } from '../utils/auth';
import api from '../services/api';

const stages = ['Applied', 'Screening', 'Shortlisted', 'Interview Scheduled', 'Interviewed', 'Selected', 'Rejected'];

const statusStageMap = {
  applied: 'Applied',
  pending: 'Applied',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  interview: 'Interview Scheduled',
  interview_scheduled: 'Interview Scheduled',
  interviewed: 'Interviewed',
  technical_round: 'Interviewed',
  hr_round: 'Interviewed',
  selected: 'Selected',
  rejected: 'Rejected',
};

function toStage(candidate) {
  if (stages.includes(candidate.stage)) return candidate.stage;
  const status = String(candidate.status || '').toLowerCase();
  if (statusStageMap[status]) return statusStageMap[status];
  return candidate.ai_recommendation === 'Selected' ? 'Shortlisted' : 'Applied';
}

function normalizeCandidate(candidate, index) {
  const score = Math.round(Number(candidate.resume_score ?? candidate.score ?? candidate.ats_score ?? 0));
  const skills = Array.isArray(candidate.skills) ? candidate.skills : [];
  return {
    id: candidate.id || candidate._id || String(index),
    name: candidate.candidate_name || candidate.name || candidate.candidate || 'Candidate',
    role: candidate.role || candidate.target_role || candidate.job_title || 'Candidate profile',
    stage: toStage(candidate),
    score,
    rank: index + 1,
    owner: candidate.owner || candidate.hr || 'HR',
    tags: skills.slice(0, 4),
    notes: candidate.summary || candidate.ai_recommendation || 'No recruiter notes recorded yet.',
    last: candidate.updated_at || candidate.created_at || '',
  };
}

function CandidateCard({ candidate, onDragStart, onSchedule }) {
  return (
    <motion.div
      layout
      draggable
      onDragStart={(event) => onDragStart(event, candidate.id)}
      whileHover={{ y: -2 }}
      className="group rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:border-violet-400/60 hover:shadow-xl hover:shadow-violet-500/10 dark:border-white/10 dark:bg-white/[0.045]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">{candidate.name}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{candidate.role}</p>
        </div>
        <GripVertical size={16} className="text-slate-300 opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-black text-violet-600 dark:text-violet-300">
          <Sparkles size={12} /> Rank #{candidate.rank}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${candidate.score >= 85 ? 'bg-emerald-500/10 text-emerald-500' : candidate.score >= 70 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {candidate.score} ATS
        </span>
      </div>
      <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500">{candidate.notes}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {candidate.tags.length ? candidate.tags.map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 dark:bg-white/[0.07]">
            <Tag size={10} className="mr-1 inline" />{item}
          </span>
        )) : <span className="text-[11px] font-semibold text-slate-400">No skills extracted</span>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400 dark:border-white/10">
        <span className="truncate">{candidate.owner}</span>
        <button type="button" onClick={() => onSchedule(candidate.id)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/10 px-2 py-1 text-cyan-600 hover:bg-cyan-400/20 dark:text-cyan-300">
          <CalendarPlus size={12} /> Schedule
        </button>
      </div>
    </motion.div>
  );
}

export default function AtsPipelinePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [query, setQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const response = await api.get('/api/candidates/');
        const ranked = [...(response.data || [])]
          .sort((a, b) => Number(b.resume_score ?? b.score ?? 0) - Number(a.resume_score ?? a.score ?? 0))
          .map(normalizeCandidate);
        setCandidates(ranked);
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Unable to load candidates');
      } finally {
        setLoading(false);
      }
    };
    loadCandidates();
    const handleRealtime = () => loadCandidates();
    window.addEventListener('hrms:realtime', handleRealtime);
    return () => window.removeEventListener('hrms:realtime', handleRealtime);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return candidates.filter((candidate) => {
      const textMatch = [candidate.name, candidate.role, candidate.tags.join(' ')].join(' ').toLowerCase().includes(normalized);
      const scoreMatch = scoreFilter === 'all' || (scoreFilter === 'top' && candidate.score >= 85) || (scoreFilter === 'review' && candidate.score < 85);
      return textMatch && scoreMatch;
    });
  }, [candidates, query, scoreFilter]);

  const counts = useMemo(() => stages.map((stage) => ({ stage, count: candidates.filter((item) => item.stage === stage).length })), [candidates]);
  const averageAts = candidates.length ? Math.round(candidates.reduce((sum, item) => sum + item.score, 0) / candidates.length) : 0;

  const onDrop = async (stage) => {
    if (!draggedId) return;
    const previous = candidates;
    setCandidates((items) => items.map((item) => item.id === draggedId ? { ...item, stage, last: new Date().toISOString() } : item));
    setDraggedId(null);
    try {
      await api.patch(`/api/candidates/${draggedId}/stage`, { stage });
    } catch (error) {
      setCandidates(previous);
      toast.error(error?.response?.data?.detail || 'Unable to update candidate stage');
    }
  };

  const openScheduler = (candidateId = '') => {
    const interviewsPath = `${getRoleHome(user?.role)}/interviews`;
    navigate(candidateId ? `${interviewsPath}?candidateId=${encodeURIComponent(candidateId)}` : interviewsPath);
  };

  return (
    <div className="space-y-6">
      <Topbar title="ATS Pipeline" />

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="premium-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="metric-label">Hiring command center</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">AI-ranked recruitment pipeline</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Real candidates from resume screening and candidate intake appear here.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Candidates', candidates.length],
                ['Avg ATS', `${averageAts}%`],
                ['Top matches', candidates.filter((item) => item.score >= 85).length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xl font-black text-slate-950 dark:text-white">{value}</p>
                  <p className="text-[11px] font-bold text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="premium-input w-full pl-10" placeholder="Search candidates, roles, tags..." />
            </label>
            <button onClick={() => setScoreFilter(scoreFilter === 'top' ? 'all' : 'top')} className={`premium-button ${scoreFilter === 'top' ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300'}`}>
              <Filter size={16} /> Top AI matches
            </button>
            <button onClick={() => openScheduler()} className="premium-button bg-cyan-400 text-slate-950"><CalendarPlus size={16} /> Schedule interview</button>
          </div>
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Recruiter activity feed</p>
          <div className="mt-4 space-y-3">
            {candidates.slice(0, 4).map((candidate) => (
              <div key={candidate.id} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">{candidate.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{candidate.score}% ATS in {candidate.stage}</p>
                </div>
              </div>
            ))}
            {!loading && candidates.length === 0 && <p className="text-sm leading-6 text-slate-500">No candidate activity yet. Screen a resume or add candidates to populate this feed.</p>}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="premium-panel flex min-h-72 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Loading candidates...</div>
      ) : (
        <section className="overflow-x-auto pb-2">
          <div className="grid min-w-[1540px] grid-cols-7 gap-3">
            {stages.map((stage) => {
              const stageCandidates = filtered.filter((candidate) => candidate.stage === stage);
              return (
                <div key={stage} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(stage)} className="min-h-[620px] rounded-2xl border border-slate-200/80 bg-slate-100/70 p-3 dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="sticky top-24 z-10 mb-3 flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 backdrop-blur dark:bg-slate-950/90">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">{stage}</p>
                      <p className="text-[11px] font-bold text-slate-400">{counts.find((item) => item.stage === stage)?.count || 0} candidates</p>
                    </div>
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                  <div className="space-y-3">
                    {stageCandidates.map((candidate) => (
                      <CandidateCard key={candidate.id} candidate={candidate} onSchedule={openScheduler} onDragStart={(event, id) => {
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggedId(id);
                      }} />
                    ))}
                    {!stageCandidates.length && (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-xs font-semibold text-slate-400 dark:border-white/10">
                        {candidates.length ? 'No candidates in this stage' : 'No real candidate data yet'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          [Bot, 'AI ranking', 'Candidates are sorted by stored ATS score from resume analysis.'],
          [MessageSquareText, 'Recruiter notes', 'Candidate summaries and status changes are stored on backend records.'],
          [UserRoundCheck, 'Enterprise workflow', 'Pipeline stage moves persist to MongoDB for future sessions.'],
        ].map(([Icon, title, body]) => (
          <div key={title} className="premium-panel p-5">
            <Icon className="text-violet-500 dark:text-cyan-300" />
            <p className="mt-4 text-base font-black text-slate-950 dark:text-white">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
