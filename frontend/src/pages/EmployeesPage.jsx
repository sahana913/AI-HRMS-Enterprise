import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Topbar from '../components/Topbar';
import { fetchEmployees, addEmployee, deleteEmployee } from '../services/employeeService';
import EnterpriseDataTable from '../components/EnterpriseDataTable';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', department: '', designation: '', joining_date: '' });
  const [loading, setLoading] = useState(false);

  const loadEmployees = async () => {
    try {
      setEmployees(await fetchEmployees());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await addEmployee(form);
      setForm({ name: '', email: '', department: '', designation: '', joining_date: '' });
      toast.success('Employee added successfully');
      await loadEmployees();
    } catch (error) {
      toast.error('Could not add employee.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id);
      toast.success('Employee removed');
      await loadEmployees();
    } catch (error) {
      toast.error('Delete failed');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <Topbar title="Employee Management" />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <EnterpriseDataTable
          title="All employees"
          subtitle="Team roster"
          rowKey="id"
          rows={employees.map((employee) => ({ ...employee, id: employee._id ?? employee.id, joined: employee.joining_date || 'N/A' }))}
          columns={[
            { key: 'name', label: 'Employee', render: (value, row) => <div><p className="font-black text-slate-950 dark:text-white">{value}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
            { key: 'department', label: 'Department' },
            { key: 'designation', label: 'Designation' },
            { key: 'joined', label: 'Joined' },
            { key: 'id', label: 'Delete', render: (value) => <button onClick={() => handleDelete(value)} className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/20">Delete</button> },
          ]}
        />

        <section className="premium-panel p-5">
          <p className="metric-label">Add employee</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Create workforce record</h2>
          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            {['name', 'email', 'department', 'designation', 'joining_date'].map((field) => (
              <label key={field} className="block text-sm font-semibold text-slate-500">
                {field.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                <input className="premium-input mt-2 w-full" name={field} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required />
              </label>
            ))}
            <button type="submit" disabled={loading} className="premium-button w-full bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950">
              {loading ? 'Saving...' : 'Add employee'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
