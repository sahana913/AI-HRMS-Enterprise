import { useEffect, useRef, useState } from 'react';
import { Bot, RefreshCw, Send, Sparkles, Trash2, User } from 'lucide-react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import api from '../services/api';

const QUICK_PROMPTS = [
  'What is the leave policy?',
  'How do I apply for sick leave?',
  'When is payroll processed?',
  'What are the employee benefits?',
  'How do I request a salary revision?',
  'What is the work from home policy?',
  'How do I submit an attendance correction?',
  'What is the performance review cycle?',
];

const TOPICS = [
  { label: 'Leave Policy', icon: '📅' },
  { label: 'Payroll', icon: '💰' },
  { label: 'Benefits', icon: '🎁' },
  { label: 'Attendance', icon: '🕐' },
  { label: 'Performance', icon: '📊' },
  { label: 'Onboarding', icon: '🚀' },
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
        <Bot size={15} />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-800">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIChatbotPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm your AI HR Assistant. I can help you with leave policies, payroll queries, company benefits, attendance, performance reviews, and any other HR-related questions. How can I help you today?",
      ts: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState('hr_policies');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg, ts: new Date().toLocaleTimeString() }]);
    setLoading(true);
    try {
      const res = await api.post('/api/chatbot/message', { message: msg, context });
      setMessages((m) => [...m, { role: 'assistant', text: res.data.reply, ts: new Date().toLocaleTimeString() }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'I\'m having trouble connecting to the backend. Please ensure the server is running.', ts: new Date().toLocaleTimeString() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: "Chat cleared. How can I help you with HR policies, payroll, or employee benefits?",
      ts: new Date().toLocaleTimeString(),
    }]);
    toast.info('Chat history cleared');
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">
      <Topbar title="AI HR Chatbot" />

      <div className="grid flex-1 gap-4 overflow-hidden xl:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <div className="hidden space-y-4 overflow-y-auto xl:block">
          <div className="premium-panel p-4">
            <p className="metric-label">Quick questions</p>
            <div className="mt-3 space-y-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="premium-panel p-4">
            <p className="metric-label">Topic context</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TOPICS.map(({ label, icon }) => (
                <button
                  key={label}
                  onClick={() => { setContext(label.toLowerCase().replace(' ', '_')); toast.info(`Context: ${label}`); }}
                  className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${context === label.toLowerCase().replace(' ', '_') ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'}`}
                >
                  <span className="block text-lg">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="premium-panel p-4">
            <p className="metric-label">AI capabilities</p>
            <ul className="mt-3 space-y-2">
              {[
                'Leave policy & balances',
                'Payroll & payslip queries',
                'Benefits & perks info',
                'Attendance corrections',
                'Performance review help',
                'Onboarding guidance',
                'Company policy Q&A',
                'HR process walkthroughs',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Sparkles size={11} className="shrink-0 text-cyan-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
                <Bot size={17} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">AI HR Assistant</p>
                <p className="text-xs text-emerald-500">● Online — powered by Gemini AI</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={clearChat} className="premium-button border border-slate-200 bg-white text-slate-500 text-xs dark:border-white/10 dark:bg-white/[0.06]">
                <Trash2 size={13} /> Clear
              </button>
              <button onClick={() => window.location.reload()} className="premium-button border border-slate-200 bg-white text-slate-500 text-xs dark:border-white/10 dark:bg-white/[0.06]">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'assistant' ? 'bg-gradient-to-br from-violet-500 to-cyan-400 text-white' : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'}`}>
                  {msg.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
                </div>
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${msg.role === 'assistant' ? 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200' : 'rounded-br-sm bg-slate-950 text-white dark:bg-blue-600'}`}>
                    {msg.text}
                  </div>
                  <span className="px-1 text-[10px] text-slate-400">{msg.ts}</span>
                </div>
              </div>
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts (mobile) */}
          <div className="flex gap-2 overflow-x-auto border-t border-slate-200 px-4 py-2 dark:border-white/10 xl:hidden">
            {QUICK_PROMPTS.slice(0, 4).map((p) => (
              <button key={p} onClick={() => sendMessage(p)} className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-4 dark:border-white/10">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="premium-input flex-1"
                placeholder="Ask about leave, payroll, benefits, attendance, or any HR policy..."
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="premium-button bg-slate-950 text-white disabled:opacity-50 dark:bg-blue-600"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">AI responses are generated by Gemini. Always verify critical HR decisions with your HR team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
