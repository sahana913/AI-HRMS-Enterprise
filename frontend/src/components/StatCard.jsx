import React from 'react';

export default function StatCard({ title, value, accent, icon, extra }) {
  const colors = {
    cyan: 'text-cyan-600 border-slate-200 bg-white dark:text-cyan-300 dark:border-slate-800 dark:bg-slate-900',
    blue: 'text-blue-600 border-slate-200 bg-white dark:text-blue-300 dark:border-slate-800 dark:bg-slate-900',
    emerald: 'text-emerald-600 border-slate-200 bg-white dark:text-emerald-300 dark:border-slate-800 dark:bg-slate-900',
    violet: 'text-violet-600 border-slate-200 bg-white dark:text-violet-300 dark:border-slate-800 dark:bg-slate-900',
  };

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${colors[accent] || colors.blue}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-lg bg-slate-100 p-2 text-lg dark:bg-slate-950">{icon}</span>
        <span className="text-2xl font-bold text-slate-950 dark:text-white">{value}</span>
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{extra}</p>
    </div>
  );
}
