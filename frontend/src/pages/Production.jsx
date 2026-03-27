import { useState, useEffect } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import api from '../lib/api';
import { formatDate, formatNumber } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const schema = z.object({
  flockId: z.string().min(1, 'Sélectionnez un troupeau'),
  date: z.string().min(1, 'La date est requise'),
  eggsCollected: z.coerce.number().int().min(0, 'Valeur invalide'),
  mortalityCount: z.coerce.number().int().min(0, 'Valeur invalide'),
  feedConsumed: z.coerce.number().min(0, 'Valeur invalide'),
  notes: z.string().optional(),
});

export default function Production() {
  const [records, setRecords] = useState([]);
  const [flocks, setFlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedFlockId, setSelectedFlockId] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      eggsCollected: 0,
      mortalityCount: 0,
      feedConsumed: 0,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, flocksRes, statsRes] = await Promise.all([
        api.get('/production'),
        api.get('/flocks'),
        api.get('/production/stats?period=30'),
      ]);
      setRecords(recordsRes.data);
      setFlocks(flocksRes.data.filter(f => f.status === 'ACTIF'));
      setStats(statsRes.data);
    } catch {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/production', data);
      await fetchData();
      setModalOpen(false);
      reset({
        date: new Date().toISOString().split('T')[0],
        eggsCollected: 0,
        mortalityCount: 0,
        feedConsumed: 0,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  };

  const formatChartDate = (d) => {
    try { return format(parseISO(d), 'dd/MM', { locale: fr }); } catch { return d; }
  };

  const filteredRecords = selectedFlockId
    ? records.filter(r => r.flockId === selectedFlockId)
    : records;

  const columns = [
    {
      key: 'flock',
      label: 'Troupeau',
      render: (v) => <span className="font-medium">{v?.name || '-'}</span>,
    },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    {
      key: 'eggsCollected',
      label: 'Oeufs collectés',
      render: (v) => <span className="font-semibold text-yellow-700">{formatNumber(v)}</span>,
    },
    {
      key: 'mortalityCount',
      label: 'Mortalité',
      render: (v) => <span className={v > 0 ? 'text-red-600 font-medium' : ''}>{formatNumber(v)}</span>,
    },
    {
      key: 'feedConsumed',
      label: 'Aliment (kg)',
      render: (v) => `${v} kg`,
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (v) => v ? <span className="text-gray-500 text-xs truncate max-w-[150px] block">{v}</span> : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production</h1>
          <p className="text-gray-500 text-sm mt-1">Suivi quotidien de la production</p>
        </div>
        <button
          onClick={() => { reset({ date: new Date().toISOString().split('T')[0], eggsCollected: 0, mortalityCount: 0, feedConsumed: 0 }); setModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Enregistrer production</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error} <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </div>
      )}

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-yellow-600">{formatNumber(stats.totalEggs)}</p>
            <p className="text-sm text-gray-500 mt-1">Oeufs (30j)</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-500">{formatNumber(stats.totalMortality)}</p>
            <p className="text-sm text-gray-500 mt-1">Mortalité (30j)</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.totalFeed} kg</p>
            <p className="text-sm text-gray-500 mt-1">Aliment consommé (30j)</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-orange-600">{stats.mortalityRate}%</p>
            <p className="text-sm text-gray-500 mt-1">Taux de mortalité</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {stats?.dailyData?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Tendance de production (30 jours)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(v) => formatChartDate(v)}
                formatter={(value, name) => [
                  formatNumber(value),
                  name === 'eggsCollected' ? 'Oeufs' : 'Mortalité'
                ]}
              />
              <Legend formatter={(v) => v === 'eggsCollected' ? 'Oeufs' : 'Mortalité'} />
              <Line type="monotone" dataKey="eggsCollected" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mortalityCount" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-gray-900">Historique ({filteredRecords.length})</h2>
          </div>
          <div className="sm:ml-auto">
            <select
              value={selectedFlockId}
              onChange={e => setSelectedFlockId(e.target.value)}
              className="input-field text-sm py-1.5 w-full sm:w-auto"
            >
              <option value="">Tous les troupeaux</option>
              {flocks.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredRecords}
          loading={loading}
          emptyMessage="Aucun enregistrement de production. Commencez par enregistrer la production du jour."
        />
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Enregistrer la production du jour">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Troupeau *</label>
            <select {...register('flockId')} className="input-field">
              <option value="">Sélectionner un troupeau</option>
              {flocks.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.breed})</option>
              ))}
            </select>
            {errors.flockId && <p className="text-red-500 text-xs mt-1">{errors.flockId.message}</p>}
          </div>

          <div>
            <label className="label">Date *</label>
            <input {...register('date')} type="date" className="input-field" />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Oeufs collectés</label>
              <input {...register('eggsCollected')} type="number" min="0" className="input-field" />
              {errors.eggsCollected && <p className="text-red-500 text-xs mt-1">{errors.eggsCollected.message}</p>}
            </div>
            <div>
              <label className="label">Mortalité</label>
              <input {...register('mortalityCount')} type="number" min="0" className="input-field" />
              {errors.mortalityCount && <p className="text-red-500 text-xs mt-1">{errors.mortalityCount.message}</p>}
            </div>
            <div>
              <label className="label">Aliment (kg)</label>
              <input {...register('feedConsumed')} type="number" min="0" step="0.1" className="input-field" />
              {errors.feedConsumed && <p className="text-red-500 text-xs mt-1">{errors.feedConsumed.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} placeholder="Observations..." />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
