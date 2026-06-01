import { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import api from '../services/api';
import EnterpriseDataTable from '../components/EnterpriseDataTable';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const response = await api.get('/api/candidates/');
        setCandidates(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    loadCandidates();
  }, []);

  return (
    <div className="space-y-6">
      <Topbar title="Candidate Pipeline" />
      <EnterpriseDataTable
        title="Candidate intelligence"
        subtitle="Recruiting CRM"
        rowKey="id"
        rows={candidates.map((candidate, index) => ({
          id: candidate._id ?? candidate.id ?? index,
          name: candidate.candidate_name || candidate.name || 'Candidate',
          email: candidate.email || 'N/A',
          score: candidate.resume_score || candidate.score || 0,
          status: candidate.status || 'Review',
          recommendation: candidate.ai_recommendation || 'AI review',
          skills: (candidate.skills || []).join(', ') || 'No skills extracted',
        }))}
        columns={[
          { key: 'name', label: 'Candidate', render: (value, row) => <div><p className="font-black text-slate-950 dark:text-white">{value}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
          { key: 'score', label: 'ATS Score', render: (value) => <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-500">{value}%</span> },
          { key: 'status', label: 'Status' },
          { key: 'recommendation', label: 'AI Recommendation' },
          { key: 'skills', label: 'Skills' },
        ]}
      />
    </div>
  );
}
