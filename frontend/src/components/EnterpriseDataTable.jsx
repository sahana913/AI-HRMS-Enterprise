import { useMemo, useState } from 'react';
import { ArrowDownUp, Download, MoreHorizontal, Search, SlidersHorizontal, X } from 'lucide-react';

const escapeCsvValue = (value) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
};

export default function EnterpriseDataTable({ title, subtitle, columns, rows, rowKey = 'id', actions = true }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(columns[0]?.key);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterKey, setFilterKey] = useState(columns[0]?.key || '');
  const [filterValue, setFilterValue] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    const filterText = filterValue.toLowerCase();
    return rows
      .filter((row) => Object.values(row).join(' ').toLowerCase().includes(text))
      .filter((row) => !filterText || String(row[filterKey] ?? '').toLowerCase().includes(filterText))
      .sort((a, b) => String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? '')));
  }, [filterKey, filterValue, query, rows, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeFilter = Boolean(filterValue);

  const exportCsv = () => {
    const headers = columns.map((column) => column.label);
    const csvRows = filtered.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(','));
    const blob = new Blob([[headers.map(escapeCsvValue).join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilter = () => {
    setFilterValue('');
    setPage(1);
  };

  return (
    <section className="premium-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
        <div>
          <p className="metric-label">{subtitle}</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="premium-input w-64 pl-9" placeholder="Search records..." />
          </label>
          <button onClick={() => setFilterOpen((value) => !value)} className={`premium-button ${activeFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <SlidersHorizontal size={16} /> Filter
          </button>
          <button onClick={exportCsv} className="premium-button bg-white text-slate-950"><Download size={16} /> Export</button>
        </div>
      </div>

      {filterOpen && (
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
          <label className="block min-w-52 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Column
            <select value={filterKey} onChange={(event) => { setFilterKey(event.target.value); setPage(1); }} className="premium-input mt-2 w-full normal-case tracking-normal">
              {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
          </label>
          <label className="block min-w-[260px] flex-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Contains
            <input value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(1); }} className="premium-input mt-2 w-full normal-case tracking-normal" placeholder="Type filter value..." />
          </label>
          <button onClick={clearFilter} className="premium-button bg-white text-slate-600"><X size={16} /> Clear</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs uppercase tracking-wider text-slate-500 backdrop-blur">
            <tr className="border-b border-slate-200">
              <th className="w-10 px-4 py-3"><input type="checkbox" className="rounded border-slate-300 bg-white" /></th>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  <button onClick={() => setSortKey(column.key)} className="inline-flex items-center gap-2 font-black">
                    {column.label} <ArrowDownUp size={13} />
                  </button>
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <tr key={row[rowKey] ?? JSON.stringify(row)} className="group transition hover:bg-slate-50">
                <td className="px-4 py-3"><input type="checkbox" className="rounded border-slate-300 bg-white" /></td>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-slate-700">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-4 text-right">
                    <button className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-blue-600 group-hover:opacity-100">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions ? 2 : 1)} className="px-5 py-10 text-center text-sm text-slate-400">
                  No records match the current search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-500">
        <span>{filtered.length} records - Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="premium-button bg-slate-100 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
          <button disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="premium-button bg-slate-100 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>
    </section>
  );
}
