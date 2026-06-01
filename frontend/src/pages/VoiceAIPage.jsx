import { useMemo, useState } from 'react';
import { Bot, Command, Mic, MessageSquareText, Radio, Send, Square } from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import api from '../services/api';

export default function VoiceAIPage() {
  const [transcript, setTranscript] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [screening, setScreening] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [voiceCommand, setVoiceCommand] = useState('');
  const [commandResult, setCommandResult] = useState(null);
  const [recording, setRecording] = useState(false);

  const recognitionSupported = useMemo(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), []);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech-to-text is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setRecording(true);
    recognition.onerror = () => {
      setRecording(false);
      toast.error('Voice capture failed');
    };
    recognition.onend = () => setRecording(false);
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0].transcript).join(' ');
      setTranscript(text);
    };
    recognition.start();
    window.hrmsRecognition = recognition;
  };

  const stopRecording = () => {
    window.hrmsRecognition?.stop?.();
    setRecording(false);
  };

  const saveTranscript = async () => {
    const response = await api.post('/api/voice/transcribe', { transcript });
    toast.success('Interview transcript stored');
    return response.data;
  };

  const runVoiceScreen = async () => {
    const response = await api.post('/api/voice/screen', { transcript, job_description: jobDescription });
    setScreening(response.data);
    toast.success('Candidate voice screening complete');
  };

  const sendChat = async () => {
    if (!chatMessage.trim()) return;
    const userMessage = { role: 'user', text: chatMessage };
    setChat((items) => [...items, userMessage]);
    setChatMessage('');
    const response = await api.post('/api/chatbot/message', { message: chatMessage, context: transcript });
    setChat((items) => [...items, { role: 'assistant', text: response.data.reply }]);
  };

  const runVoiceCommand = async () => {
    if (!voiceCommand.trim()) return;
    const response = await api.post('/api/voice/command', { command: voiceCommand, context: transcript || jobDescription });
    setCommandResult(response.data);
    toast.success('Recruiter voice action processed');
  };

  return (
    <div className="space-y-6">
      <Topbar title="Voice AI Recruitment Assistant" />

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="premium-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="metric-label">Candidate voice screening</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Speech-to-text and interview transcript generation</h2>
            </div>
            <span className="premium-chip"><Radio size={14} /> {recognitionSupported ? 'Browser STT ready' : 'Manual transcript mode'}</span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="metric-label">Job context</span>
              <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} className="premium-input mt-2 min-h-40 w-full resize-none" placeholder="Paste job description or interview rubric..." />
            </label>
            <label className="block">
              <span className="metric-label">Transcript</span>
              <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} className="premium-input mt-2 min-h-40 w-full resize-none" placeholder="Record or paste candidate answers..." />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={recording ? stopRecording : startRecording} className={`premium-button ${recording ? 'bg-rose-600 text-white' : 'bg-slate-950 text-white'}`}>
              {recording ? <Square size={16} /> : <Mic size={16} />} {recording ? 'Stop recording' : 'Start voice capture'}
            </button>
            <button onClick={saveTranscript} className="premium-button bg-blue-600 text-white"><MessageSquareText size={16} /> Save transcript</button>
            <button onClick={runVoiceScreen} className="premium-button bg-cyan-400 text-slate-950"><Bot size={16} /> AI voice screen</button>
          </div>
        </div>

        <div className="premium-panel p-5">
          <p className="metric-label">Voice screening result</p>
          {screening ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-4xl font-black text-slate-950 dark:text-white">{screening.score}%</p>
                <p className="mt-1 text-sm font-bold text-slate-500">{screening.decision}</p>
              </div>
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">{screening.summary}</p>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10">Run a voice screen to generate score, transcript summary, and recruiter recommendation.</p>
          )}
        </div>
      </section>

      <section className="premium-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Command className="text-violet-500" />
            <div>
              <p className="metric-label">Recruiter voice actions</p>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Voice commands connected to backend workflows</h2>
            </div>
          </div>
          <span className="premium-chip">MongoDB audit enabled</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input value={voiceCommand} onChange={(event) => setVoiceCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runVoiceCommand()} className="premium-input" placeholder="Try: Shortlist this candidate, schedule interview, open ATS screening..." />
          <button onClick={runVoiceCommand} className="premium-button bg-violet-600 text-white"><Command size={16} /> Run command</button>
        </div>
        {commandResult && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ['Intent', commandResult.intent],
              ['Action', commandResult.action],
              ['Response', commandResult.response],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="metric-label">{label}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="premium-panel p-5">
        <div className="flex items-center gap-3">
          <Bot className="text-cyan-500" />
          <div>
            <p className="metric-label">AI chatbot</p>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Recruitment assistant</h2>
          </div>
        </div>
        <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          {chat.length ? chat.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`rounded-lg p-3 text-sm leading-6 ${item.role === 'assistant' ? 'bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300' : 'bg-blue-600 text-white'}`}>
              {item.text}
            </div>
          )) : <p className="text-sm text-slate-500">Ask about candidate fit, interview risks, follow-up questions, or transcript summary.</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <input value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendChat()} className="premium-input flex-1" placeholder="Ask the AI recruitment assistant..." />
          <button onClick={sendChat} className="premium-button bg-slate-950 text-white"><Send size={16} /> Send</button>
        </div>
      </section>
    </div>
  );
}
