import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiCheck, FiCheckCircle, FiClock, FiInfo, FiZap } from 'react-icons/fi';
import Topbar from '../components/Topbar';
import api from '../services/api';

const iconMap = {
  success: FiCheckCircle,
  ai: FiZap,
  reminder: FiClock,
  info: FiInfo,
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const unread = useMemo(() => items.filter((item) => item.unread).length, [items]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await api.get('/api/notifications/');
        setItems(Array.isArray(response.data) ? response.data.map((item) => ({ ...item, title: item.title || item.message, unread: Boolean(item.unread) })) : []);
      } catch (error) {
        console.error(error);
        setItems([]);
      }
    };
    loadNotifications();
  }, []);

  const markAllRead = () => setItems((current) => current.map((item) => ({ ...item, unread: false })));

  return (
    <div className="space-y-6">
      <Topbar title="Notifications" />

      <section className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="premium-panel p-5 text-slate-950">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white"><FiBell /></div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-blue-600">Notification center</p>
          <h2 className="mt-2 text-2xl font-black">{unread} unread updates</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">AI alerts, interview reminders, leave activity, and ATS scoring updates appear here.</p>
          <button onClick={markAllRead} className="premium-button mt-6 bg-slate-950 text-white hover:bg-blue-700"><FiCheck /> Mark all as read</button>
        </div>

        <div className="premium-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">Activity stream</p>
              <p className="text-xs text-slate-500">Real-time HRMS events</p>
            </div>
            <span className="premium-chip">{items.length} total</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No real notifications yet.</div>
            ) : items.map((item, index) => {
              const Icon = iconMap[item.type] || FiBell;
              return (
                <motion.div key={item.id || item.message} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="group flex gap-4 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-900/70">
                  <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.unread ? 'bg-cyan-400 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}>
                    <Icon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-950 dark:text-white">{item.title || item.message}</p>
                      {item.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.message}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">{item.created_at || 'Recently'}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
