import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Lock, Search } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadPermissions = async () => {
    try {
      const response = await api.get('/api/admin/permissions');
      setPermissions(response.data || []);
    } catch (error) {
      toast.error('Failed to load permissions');
      console.error(error);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const categories = ['all', 'roles', 'permissions', 'departments', 'payroll', 'audit', 'security', 'system'];
  
  const filtered = permissions.filter(perm => {
    const matchesSearch = perm.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          perm.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || perm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryColors = {
    roles: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
    permissions: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    departments: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    payroll: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    audit: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
    security: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    system: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  };

  return (
    <div className="space-y-6">
      <Topbar title="Permissions Management" icon={Lock} />
      
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-panel"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="premium-input w-full pl-9"
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`premium-chip capitalize transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950'
                      : 'border-slate-200/50 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length > 0 ? (
              filtered.map((perm, idx) => (
                <motion.div
                  key={perm._id || perm.id || perm.key || perm.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`rounded-xl border border-slate-200/50 p-4 dark:border-white/5 dark:bg-white/[0.02] ${categoryColors[perm.category] || categoryColors.system}`}
                >
                  <p className="font-black text-slate-950 dark:text-white">{perm.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{perm.description}</p>
                  <span className={`premium-chip mt-3 inline-block text-xs capitalize ${categoryColors[perm.category] || categoryColors.system}`}>
                    {perm.category}
                  </span>
                </motion.div>
              ))
            ) : (
              <p className="col-span-full text-center text-sm text-slate-500 py-8">No permissions found</p>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 flex gap-3 rounded-xl border border-slate-200/50 bg-white p-4 dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Permissions</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{permissions.length}</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Categories</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{categories.length - 1}</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">100%</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
