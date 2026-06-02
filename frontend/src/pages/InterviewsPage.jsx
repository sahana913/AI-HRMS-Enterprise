import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { toast } from 'react-toastify';
import { CheckCircle2, ExternalLink, MessageSquareText, Video } from 'lucide-react';
import api from '../services/api';

export default function InterviewsPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ candidate_id: '', interviewer: '', interview_date: '', mode: 'Remote', round: 'Screening', meeting_link: '' });
  const [panel, setPanel] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState({});

  const loadPanel = async () => {
    try {
      const response = await api.get('/api/interviews/list');
      setPanel(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { loadPanel(); }, []);

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const response = await api.get('/api/candidates/');
        setCandidates(response.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    loadCandidates();
  }, []);

  useEffect(() => {
    const candidateId = searchParams.get('candidateId');
    if (candidateId) {
      setForm((current) => ({ ...current, candidate_id: candidateId }));
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/api/interviews/schedule', form);
      toast.success('Interview scheduled');
      setForm({ candidate_id: '', interviewer: '', interview_date: '', mode: 'Remote', round: 'Screening', meeting_link: '' });
      loadPanel();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to schedule interview');
      console.error(error);
    }
  };

  const updateInterview = async (id, payload) => {
    try {
      await api.patch(`/api/interviews/${id}`, payload);
      toast.success('Interview updated');
      loadPanel();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to update interview');
    }
  };

  const candidateNameById = new Map(candidates.map((candidate) => [candidate.id || candidate._id, candidate.candidate_name || candidate.name || 'Candidate']));

  return (
    <div className="space-y-6">
      <Topbar title="Interview Management" />
      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="premium-panel-strong p-5">
          <p className="metric-label">Schedule interview</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Panel coordination</h2>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-slate-500">
              Candidate
              <input
                list="candidate-suggestions"
                className="premium-input mt-2 w-full"
                value={form.candidate_id}
                onChange={(e) => setForm({ ...form, candidate_id: e.target.value })}
                placeholder="Type candidate name or select from suggestions"
                required
              />
              <datalist id="candidate-suggestions">
                {candidates.map((candidate) => {
                  const value = candidate.candidate_name || candidate.name || candidate.id || candidate._id;
                  return <option key={value} value={value} />;
                })}
              </datalist>
            </label>
            {['interviewer', 'interview_date'].map((field) => (
              <label key={field} className="block text-sm font-semibold text-slate-500">
                {field.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                <input
                  className="premium-input mt-2 w-full"
                  name={field}
                  type={field === 'interview_date' ? 'datetime-local' : 'text'}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required
                />
              </label>
            ))}
            <label className="block text-sm font-semibold text-slate-500">
              Interview round
              <input
                className="premium-input mt-2 w-full"
                value={form.round}
                onChange={(e) => setForm({ ...form, round: e.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-semibold text-slate-500">
              Meeting link
              <input
                className="premium-input mt-2 w-full"
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                placeholder="Auto-generated for remote interviews if blank"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-500">
              Mode
              <select
                className="premium-input mt-2 w-full"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
              >
                <option value="Remote">Remote</option>
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </label>
            <button className="premium-button w-full bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 font-bold text-white shadow-lg shadow-violet-500/20">
              Schedule interview
            </button>
          </form>
        </div>
        <div className="premium-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">Interview panel</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Scheduled conversations</h2>
            </div>
            <span className="premium-chip">{panel.length} active</span>
          </div>
          <div className="mt-5 space-y-3">
            {panel.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-white/10">No scheduled interviews yet.</div>
            ) : (
              panel.map((item, index) => (
                <div key={index} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                  <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>{item.round || item.mode}</span>
                    <span>{item.status}</span>
                  </div>
                  <p className="mt-3 text-base font-black text-slate-950 dark:text-white">{candidateNameById.get(item.candidate_id) || item.candidate_id || 'Unknown candidate'}</p>
                  <p className="mt-2 text-sm text-slate-500">Interviewer: {item.interviewer}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.interview_date}</p>
                  {item.meeting_link && (
                    <a href={item.meeting_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-cyan-200">
                      <Video size={15} /> Video meeting <ExternalLink size={14} />
                    </a>
                  )}
                  <textarea
                    className="premium-input mt-4 min-h-24 w-full resize-none"
                    value={feedbackDrafts[item.id || item._id] ?? item.feedback ?? ''}
                    onChange={(event) => setFeedbackDrafts({ ...feedbackDrafts, [item.id || item._id]: event.target.value })}
                    placeholder="Interview feedback, evaluation notes, risks, and recommendation"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateInterview(item.id || item._id, { status: 'completed', feedback: feedbackDrafts[item.id || item._id] ?? item.feedback ?? '' })} className="premium-button bg-emerald-500 text-white">
                      <CheckCircle2 size={16} /> Complete
                    </button>
                    <button type="button" onClick={() => updateInterview(item.id || item._id, { status: 'feedback_pending', feedback: feedbackDrafts[item.id || item._id] ?? item.feedback ?? '' })} className="premium-button bg-blue-600 text-white">
                      <MessageSquareText size={16} /> Save feedback
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
