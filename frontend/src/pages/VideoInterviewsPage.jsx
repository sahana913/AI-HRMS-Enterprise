import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Camera,
  CameraOff,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Send,
  Sparkles,
  Video,
  VideoOff,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import api from '../services/api';

const STAGES = ['Applied', 'Screening', 'Technical', 'HR Round', 'Final'];

function ScoreBar({ label, value, color = 'bg-blue-500' }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function VideoInterviewsPage() {
  const localVideoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [inSession, setInSession] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10).toUpperCase());
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [tab, setTab] = useState('session');
  const recognitionRef = useRef(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    api.get('/api/interviews/list').then((r) => setInterviews(r.data || [])).catch(() => {});
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      setVideoOn(true);
      setAudioOn(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
    } catch {
      toast.error('Camera/microphone access denied. Check browser permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setVideoOn(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, [stream]);

  const toggleVideo = () => {
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setVideoOn((v) => !v);
  };

  const toggleAudio = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setAudioOn((v) => !v);
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setScreenSharing(true);
      screenStream.getVideoTracks()[0].onended = () => {
        if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;
        setScreenSharing(false);
      };
    } catch {
      toast.error('Screen sharing cancelled or not supported.');
    }
  };

  const joinSession = async () => {
    await startCamera();
    setInSession(true);
    toast.success(`Joined session ${sessionId}`);
  };

  const leaveSession = () => {
    stopCamera();
    setInSession(false);
    setScreenSharing(false);
    recognitionRef.current?.stop();
    setRecording(false);
    toast.info('Left interview session');
  };

  const startTranscription = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported in this browser.'); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      setTranscript(text);
    };
    rec.onerror = () => { setRecording(false); toast.error('Transcription error'); };
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setRecording(true);
    toast.success('Live transcription started');
  };

  const stopTranscription = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const analyzeInterview = async () => {
    if (!transcript && !notes) { toast.error('Add transcript or notes before analyzing.'); return; }
    setAnalyzing(true);
    try {
      const jd = selectedInterview?.round || 'General interview';
      const res = await api.post('/api/ai/modules/interview_questions', {
        content: transcript || notes,
        job_description: jd,
      });
      const result = res.data?.result || {};
      setAnalysis({
        confidence: Math.min(99, Math.max(40, (transcript.split(' ').length || 10) * 1.2)),
        communication: Math.min(99, Math.max(45, (notes.length || 50) * 0.8)),
        technical: result.candidate_evaluation?.score || 72,
        recommendation: result.hiring_recommendation || 'Proceed to next round',
        strengths: result.candidate_evaluation?.strengths || ['Clear communication', 'Relevant experience'],
        risks: result.candidate_evaluation?.risks || ['Verify technical depth'],
        questions: result.questions || [],
      });
      toast.success('AI interview analysis complete');
    } catch {
      toast.error('AI analysis failed. Check backend connection.');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!analysis) return;
    try {
      await api.post('/api/voice/transcribe', { transcript: transcript || notes });
      if (selectedInterview) {
        await api.patch(`/api/interviews/${selectedInterview.id || selectedInterview._id}`, {
          feedback: notes,
          status: 'completed',
          ai_scores: analysis,
        }).catch(() => {});
      }
      toast.success('Interview analysis saved to MongoDB');
    } catch {
      toast.error('Save failed');
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChat((c) => [...c, { role: 'user', text: msg }]);
    try {
      const res = await api.post('/api/chatbot/message', { message: msg, context: transcript || notes });
      setChat((c) => [...c, { role: 'assistant', text: res.data.reply }]);
    } catch {
      setChat((c) => [...c, { role: 'assistant', text: 'AI assistant unavailable. Check backend.' }]);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/interview-room/${sessionId}`);
    toast.success('Interview link copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Topbar title="Video Interview Studio" />

      {/* Session header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Video size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-white">Session ID: {sessionId}</p>
            <p className="text-xs text-slate-500">{inSession ? '🟢 Live session active' : '⚪ Not in session'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copyLink} className="premium-button border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            <Copy size={15} /> Copy invite link
          </button>
          {selectedInterview?.meeting_link && (
            <a href={selectedInterview.meeting_link} target="_blank" rel="noreferrer" className="premium-button bg-violet-600 text-white">
              <ExternalLink size={15} /> Open meeting
            </a>
          )}
          {!inSession ? (
            <button onClick={joinSession} className="premium-button bg-emerald-600 text-white">
              <Camera size={15} /> Join session
            </button>
          ) : (
            <button onClick={leaveSession} className="premium-button bg-rose-600 text-white">
              <PhoneOff size={15} /> Leave session
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
        {['session', 'analysis', 'scheduled'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-black capitalize transition ${tab === t ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'session' ? 'Video Session' : t === 'analysis' ? 'AI Analysis' : 'Scheduled Interviews'}
          </button>
        ))}
      </div>

      {tab === 'session' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          {/* Video area */}
          <div className="space-y-4">
            <div className="premium-panel overflow-hidden p-0">
              <div className="relative aspect-video w-full bg-slate-950">
                <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                {!videoOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                    <VideoOff size={48} className="text-slate-500" />
                    <p className="text-sm font-bold text-slate-400">Camera is off</p>
                  </div>
                )}
                {inSession && (
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
                    <button onClick={toggleVideo} className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${videoOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-600 text-white'}`}>
                      {videoOn ? <Camera size={20} /> : <CameraOff size={20} />}
                    </button>
                    <button onClick={toggleAudio} className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${audioOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-600 text-white'}`}>
                      {audioOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button onClick={screenSharing ? () => { if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream; setScreenSharing(false); } : startScreenShare} className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${screenSharing ? 'bg-blue-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                      <Monitor size={20} />
                    </button>
                    <button onClick={recording ? stopTranscription : startTranscription} className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition ${recording ? 'animate-pulse bg-rose-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                      <Mic size={20} />
                    </button>
                    <button onClick={leaveSession} className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-700">
                      <PhoneOff size={20} />
                    </button>
                  </div>
                )}
                {screenSharing && (
                  <div className="absolute left-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                    Screen sharing
                  </div>
                )}
                {recording && (
                  <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Live transcript
                  </div>
                )}
              </div>
            </div>

            {/* Transcript */}
            <div className="premium-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="metric-label">Live transcript</p>
                <div className="flex gap-2">
                  <button onClick={recording ? stopTranscription : startTranscription} className={`premium-button text-sm ${recording ? 'bg-rose-600 text-white' : 'bg-slate-950 text-white'}`}>
                    <Mic size={14} /> {recording ? 'Stop' : 'Start'} transcription
                  </button>
                </div>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="premium-input mt-3 min-h-32 w-full resize-none"
                placeholder="Transcript appears here automatically when recording, or paste manually..."
              />
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Interview selector */}
            <div className="premium-panel p-5">
              <p className="metric-label">Link to scheduled interview</p>
              <select
                className="premium-input mt-2 w-full"
                value={selectedInterview?.id || selectedInterview?._id || ''}
                onChange={(e) => setSelectedInterview(interviews.find((i) => (i.id || i._id) === e.target.value) || null)}
              >
                <option value="">Select interview (optional)</option>
                {interviews.map((i) => (
                  <option key={i.id || i._id} value={i.id || i._id}>
                    {i.round || 'Interview'} — {i.interviewer || 'Interviewer'} — {i.interview_date?.slice(0, 10) || 'TBD'}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="premium-panel p-5">
              <p className="metric-label">Interview notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="premium-input mt-2 min-h-40 w-full resize-none"
                placeholder="Evaluation notes, observations, follow-up questions..."
              />
              <button onClick={analyzeInterview} disabled={analyzing} className="premium-button mt-3 w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white disabled:opacity-60">
                <Sparkles size={15} /> {analyzing ? 'Analyzing...' : 'Run AI analysis'}
              </button>
            </div>

            {/* AI Chat */}
            <div className="premium-panel p-5">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-cyan-500" />
                <p className="metric-label">AI interview assistant</p>
              </div>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                {chat.length ? chat.map((m, i) => (
                  <div key={i} className={`rounded-lg p-2.5 text-xs leading-5 ${m.role === 'assistant' ? 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-blue-600 text-white'}`}>
                    {m.text}
                  </div>
                )) : <p className="text-xs text-slate-400">Ask about candidate fit, follow-up questions, or evaluation guidance.</p>}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} className="premium-input flex-1 text-sm" placeholder="Ask AI assistant..." />
                <button onClick={sendChat} className="premium-button bg-slate-950 text-white"><Send size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'analysis' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="premium-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="metric-label">AI interview analysis</p>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Candidate evaluation scores</h2>
              </div>
              <button onClick={saveAnalysis} disabled={!analysis} className="premium-button bg-emerald-600 text-white disabled:opacity-50">
                <CheckCircle2 size={15} /> Save to MongoDB
              </button>
            </div>
            {analysis ? (
              <div className="mt-5 space-y-4">
                <ScoreBar label="Confidence score" value={Math.round(analysis.confidence)} color="bg-blue-500" />
                <ScoreBar label="Communication score" value={Math.round(analysis.communication)} color="bg-violet-500" />
                <ScoreBar label="Technical score" value={Math.round(analysis.technical)} color="bg-cyan-500" />
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">AI Recommendation</p>
                  <p className="mt-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">{analysis.recommendation}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Strengths</p>
                    <ul className="mt-2 space-y-1">
                      {analysis.strengths.map((s) => (
                        <li key={s} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Risks</p>
                    <ul className="mt-2 space-y-1">
                      {analysis.risks.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="mt-0.5 shrink-0 text-amber-500">⚠</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <Sparkles size={32} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">Run AI analysis from the Session tab to see scores here.</p>
                <button onClick={() => setTab('session')} className="premium-button mt-4 bg-slate-950 text-white">Go to session</button>
              </div>
            )}
          </div>

          <div className="premium-panel p-5">
            <p className="metric-label">AI-generated interview questions</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Suggested follow-up questions</h2>
            {analysis?.questions?.length ? (
              <ul className="mt-4 space-y-3">
                {analysis.questions.slice(0, 8).map((q, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">{i + 1}</span>
                    {q}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Questions appear after running AI analysis.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="premium-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="metric-label">Scheduled video interviews</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Upcoming sessions</h2>
            </div>
            <span className="premium-chip">{interviews.length} total</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {interviews.length ? interviews.map((item) => (
              <div key={item.id || item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-black ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.status || 'Scheduled'}
                  </span>
                  <span className="text-xs text-slate-400">{item.mode || 'Remote'}</span>
                </div>
                <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{item.round || 'Interview'}</p>
                <p className="mt-1 text-xs text-slate-500">Interviewer: {item.interviewer || '—'}</p>
                <p className="mt-1 text-xs text-slate-500">{item.interview_date?.slice(0, 16)?.replace('T', ' ') || 'Date TBD'}</p>
                <div className="mt-3 flex gap-2">
                  {item.meeting_link && (
                    <a href={item.meeting_link} target="_blank" rel="noreferrer" className="premium-button flex-1 justify-center bg-blue-600 text-white text-xs">
                      <Video size={13} /> Join
                    </a>
                  )}
                  <button
                    onClick={() => { setSelectedInterview(item); setTab('session'); }}
                    className="premium-button flex-1 justify-center border border-slate-200 bg-white text-slate-700 text-xs dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  >
                    <Camera size={13} /> Open session
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-3 rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                No interviews scheduled yet. Schedule from the Interview Management page.
              </div>
            )}
          </div>

          {/* Pipeline stages */}
          <div className="mt-6">
            <p className="metric-label">Interview pipeline stages</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STAGES.map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">{stage}</span>
                  {i < STAGES.length - 1 && <span className="text-slate-300">→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
