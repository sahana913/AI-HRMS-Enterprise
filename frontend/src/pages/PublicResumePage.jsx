import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiDownload, FiLoader } from 'react-icons/fi';
import api from '../services/api';

const themes = {
  cyan: '#0891b2',
  blue: '#2563eb',
  emerald: '#059669',
  rose: '#e11d48',
};

export default function PublicResumePage() {
  const { shareId } = useParams();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResume = async () => {
      try {
        const response = await api.get(`/api/public/resumes/${shareId}`);
        setResume(response.data);
      } finally {
        setLoading(false);
      }
    };
    loadResume();
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <FiLoader className="mr-3 animate-spin" /> Loading resume
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-slate-300">
        This resume is private or no longer available.
      </div>
    );
  }

  const accent = themes[resume.theme] || themes.cyan;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950">
          <FiDownload /> Print resume
        </button>
      </div>

      <article className="mx-auto max-w-4xl bg-white shadow-2xl">
        <header className="grid gap-6 p-10 text-white md:grid-cols-[160px_1fr]" style={{ background: accent }}>
          {resume.personal?.image ? (
            <img src={resume.personal.image} alt="" className="h-32 w-32 rounded-lg object-cover shadow-xl" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-white/20 text-5xl font-black">
              {resume.personal?.name?.[0] || 'R'}
            </div>
          )}
          <div>
            <h1 className="text-4xl font-black">{resume.personal?.name || 'Resume'}</h1>
            <p className="mt-2 text-lg font-semibold opacity-90">{resume.personal?.headline || resume.target_role}</p>
            <p className="mt-4 text-sm opacity-90">
              {[resume.personal?.email, resume.personal?.phone, resume.personal?.location, resume.personal?.website].filter(Boolean).join(' | ')}
            </p>
          </div>
        </header>

        <main className="space-y-8 p-10">
          {resume.sections?.map((section) => (
            <section key={section.id}>
              <h2 className="border-b pb-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: accent }}>{section.title}</h2>
              <div className="mt-4 space-y-5">
                {section.items?.map((item, index) => (
                  <div key={index}>
                    {section.type === 'summary' || section.type === 'skills' ? (
                      <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{item.text}</p>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <p className="font-black">{item.role || item.company}</p>
                          <p className="text-xs text-slate-500">{item.period}</p>
                        </div>
                        <p className="text-sm font-bold" style={{ color: accent }}>{item.company}</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{item.description}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>
      </article>
    </div>
  );
}
