import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { GitBranch, Plus, Trash2, User } from 'lucide-react';
import Topbar from '../../components/Topbar';
import api from '../../services/api';

const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];
const emptyBoard = Object.fromEntries(COLUMNS.map((column) => [column, []]));

const priorityColors = {
  High: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  Low: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
};

export default function ProjectBoardPage() {
  const [board, setBoard] = useState(emptyBoard);
  const [draggedTask, setDraggedTask] = useState(null);
  const [newTaskColumn, setNewTaskColumn] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const loadBoard = async () => {
      try {
        const response = await api.get('/api/projects/board');
        if (response.data?.tasks && response.data?.columns) {
          const newBoard = { ...emptyBoard };
          response.data.columns.forEach(col => {
            newBoard[col.title] = response.data.tasks.filter(t => t.status === col.title);
          });
          setBoard(newBoard);
        }
      } catch (error) {
        console.error(error);
        setBoard(emptyBoard);
      }
    };

  useEffect(() => {
    loadBoard();
  }, []);

  const handleDragStart = (e, task, column) => {
    setDraggedTask({ task, fromColumn: column });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, toColumn) => {
    e.preventDefault();
    if (!draggedTask) return;

    const { task, fromColumn } = draggedTask;

    if (fromColumn === toColumn) {
      setDraggedTask(null);
      return;
    }

    try {
      await api.put(`/api/projects/tasks/${task.id || task._id}`, { ...task, status: toColumn });
      await loadBoard();
      toast.success(`Task moved to ${toColumn}`);
    } catch (error) {
      toast.error('Task move failed');
      console.error(error);
    } finally {
      setDraggedTask(null);
    }
  };

  const handleAddTask = async (column) => {
    if (!newTaskTitle.trim()) {
      toast.error('Task title required');
      return;
    }

    try {
      await api.post('/api/projects/tasks', {
        title: newTaskTitle,
        priority: 'Medium',
        status: column,
      });
      await loadBoard();
      setNewTaskTitle('');
      setNewTaskColumn(null);
      toast.success('Task created');
    } catch (error) {
      toast.error('Task create failed');
      console.error(error);
    }
  };

  const handleDeleteTask = async (column, taskId) => {
    try {
      await api.delete(`/api/projects/tasks/${taskId}`);
      await loadBoard();
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Task delete failed');
      console.error(error);
    }
  };

  const totalTasks = Object.values(board).reduce((sum, col) => sum + col.length, 0);
  const completedTasks = board.Done?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <Topbar title="Project Board" icon={GitBranch} />

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-panel"
      >
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-950 dark:text-white">Project Progress</h3>
            <span className="text-2xl font-black text-emerald-600">{progress}%</span>
          </div>
          <div className="h-4 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <p className="text-slate-600 dark:text-slate-400">Total Tasks</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{totalTasks}</p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">Completed</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">{completedTasks}</p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">In Progress</p>
              <p className="mt-1 text-2xl font-black text-amber-600">{board['In Progress']?.length || 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Kanban Board */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-x-auto"
      >
        <div className="flex gap-6 pb-4">
          {COLUMNS.map((column, colIdx) => (
            <div
              key={column}
              className="flex-shrink-0 w-96"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column)}
            >
              {/* Column Header */}
              <div className="mb-4">
                <h3 className="font-black text-slate-950 dark:text-white mb-2">{column}</h3>
                <div className="inline-block premium-chip bg-slate-200/50 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  {board[column]?.length || 0} tasks
                </div>
              </div>

              {/* Column Container */}
              <div className="space-y-3 rounded-2xl border-2 border-dashed border-slate-200/30 bg-slate-50/30 p-4 dark:border-white/10 dark:bg-white/[0.01] min-h-[500px] relative">
                {/* Tasks */}
                {board[column]?.map((task, idx) => (
                  <motion.div
                    key={task.id || task._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task, column)}
                    className="cursor-move rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-300/50 transition dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-blue-300/30"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-slate-950 dark:text-white flex-1">{task.title}</h4>
                      <button
                        onClick={() => handleDeleteTask(column, task.id || task._id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`premium-chip text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className="premium-chip bg-slate-200/50 text-slate-700 dark:bg-white/10 dark:text-slate-300 text-xs flex items-center gap-1">
                        <User size={10} />
                        {String(task.owner || 'Unassigned').split('@')[0]}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {/* Empty State */}
                {(!board[column] || board[column].length === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-slate-400">Drop tasks here</p>
                  </div>
                )}

                {/* Add Task Button */}
                {newTaskColumn === column ? (
                  <div className="space-y-2 rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <input
                      type="text"
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTask(column)}
                      autoFocus
                      className="premium-input w-full"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddTask(column)}
                        className="flex-1 premium-button bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setNewTaskColumn(null);
                          setNewTaskTitle('');
                        }}
                        className="flex-1 premium-button bg-slate-200 text-slate-950 hover:bg-slate-300 dark:bg-slate-700 dark:text-white text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewTaskColumn(column)}
                    className="w-full rounded-xl border border-dashed border-slate-200/50 p-3 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:hover:border-white/20 dark:hover:text-slate-300 transition"
                  >
                    <Plus size={16} className="inline mr-2" />
                    Add task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
