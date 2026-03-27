import { useState, useEffect } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

const schema = z.object({
  category: z.string().min(1, 'La catégorie est requise'),
  description: z.string().min(1, 'La description est requise'),
  amount: z.coerce.number().positive('Le montant doit être positif'),
  date: z.string().min(1, 'La date est requise'),
});

const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#f59e0b', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'];

export default function Depenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/categories'),
      ]);
      setExpenses(expRes.data);
      setCategories(catRes.data);
    } catch { setError('Erreur lors du chargement des dépenses'); }
    finally { setLoading(false); }
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/expenses', data);
      await fetchData();
      setModalOpen(false);
      reset({ date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/expenses/${deleteId}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally { setDeleteId(null); }
  };

  const filteredExpenses = expenses.filter(e => {
    if (categoryFilter && e.category !== categoryFilter) return false;
    if (dateRange.start && new Date(e.date) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(e.date) > new Date(dateRange.end)) return false;
    return true;
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown for chart
  const byCategory = {};
  filteredExpenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  const chartData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const columns = [
    { key: 'category', label: 'Catégorie', render: (v) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{v}</span>
    )},
    { key: 'description', label: 'Description', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'amount', label: 'Montant', render: (v) => <span className="font-bold text-red-600">{formatCurrency(v)}</span> },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'id', label: 'Actions', render: (v) => (
      <button onClick={(e) => { e.stopPropagation(); setDeleteId(v); }}
        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
        <Trash2 className="w-4 h-4" />
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-gray-500 text-sm mt-1">Suivi des dépenses de la ferme</p>
        </div>
        <button onClick={() => { reset({ date: new Date().toISOString().split('T')[0] }); setModalOpen(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle dépense</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error} <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-600">{formatCurrency(totalAll)}</p>
          <p className="text-sm text-gray-500 mt-1">Total des dépenses</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-600">{expenses.length}</p>
          <p className="text-sm text-gray-500 mt-1">Nombre de transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        {chartData.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Répartition par catégorie</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend
                  formatter={(v) => <span className="text-xs">{v}</span>}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        <div className={`card p-0 ${chartData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-gray-900">Dépenses ({filteredExpenses.length})</h2>
                {filteredExpenses.length !== expenses.length && (
                  <span className="text-sm text-gray-500">— {formatCurrency(totalFiltered)}</span>
                )}
              </div>
              <div className="sm:ml-auto flex flex-wrap gap-2">
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field text-sm py-1.5 w-auto">
                  <option value="">Toutes catégories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
                  className="input-field text-sm py-1.5 w-auto" placeholder="Du" />
                <input type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
                  className="input-field text-sm py-1.5 w-auto" placeholder="Au" />
                {(categoryFilter || dateRange.start || dateRange.end) && (
                  <button onClick={() => { setCategoryFilter(''); setDateRange({ start: '', end: '' }); }}
                    className="text-sm text-red-500 hover:underline px-2">
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={filteredExpenses}
            loading={loading}
            emptyMessage="Aucune dépense enregistrée."
          />
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle dépense">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Catégorie *</label>
            <select {...register('category')} className="input-field">
              <option value="">Sélectionner une catégorie</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="label">Description *</label>
            <input {...register('description')} type="text" className="input-field" placeholder="Achat aliment, vaccin, réparation..." />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Montant (MAD) *</label>
              <input {...register('amount')} type="number" min="0" step="0.01" className="input-field" placeholder="0.00" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Date *</label>
              <input {...register('date')} type="date" className="input-field" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmer la suppression" size="sm">
        <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cette dépense ?</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleDelete} className="btn-danger flex-1">Supprimer</button>
        </div>
      </Modal>
    </div>
  );
}
