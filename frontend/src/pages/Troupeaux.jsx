import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Bird } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import api from '../lib/api';
import { formatDate, formatNumber, FLOCK_PURPOSE_LABELS, FLOCK_STATUS_LABELS } from '../lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  breed: z.string().min(1, 'La race est requise'),
  quantity: z.coerce.number().int().positive('La quantité doit être positive'),
  arrivalDate: z.string().min(1, 'La date est requise'),
  purpose: z.enum(['CHAIR', 'OEUF']),
  status: z.enum(['ACTIF', 'TERMINE']),
  batchNumber: z.string().optional(),
});

export default function Troupeaux() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER';
  const [flocks, setFlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFlock, setEditFlock] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      purpose: 'OEUF',
      status: 'ACTIF',
    },
  });

  useEffect(() => {
    fetchFlocks();
  }, []);

  const fetchFlocks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/flocks');
      setFlocks(res.data);
    } catch {
      setError('Erreur lors du chargement des troupeaux');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditFlock(null);
    reset({ purpose: 'OEUF', status: 'ACTIF' });
    setModalOpen(true);
  };

  const openEdit = (flock) => {
    setEditFlock(flock);
    reset({
      name: flock.name,
      breed: flock.breed,
      quantity: flock.quantity,
      arrivalDate: flock.arrivalDate?.split('T')[0],
      purpose: flock.purpose,
      status: flock.status,
      batchNumber: flock.batchNumber || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editFlock) {
        await api.put(`/flocks/${editFlock.id}`, data);
      } else {
        await api.post('/flocks', data);
      }
      await fetchFlocks();
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/flocks/${deleteId}`);
      await fetchFlocks();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setDeleteId(null);
    }
  };

  const columns = [
    { key: 'name', label: 'Nom', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'breed', label: 'Race' },
    { key: 'quantity', label: 'Quantité', render: (v) => formatNumber(v) },
    {
      key: 'purpose',
      label: 'Type',
      render: (v) => (
        <Badge color={v === 'OEUF' ? 'yellow' : 'orange'}>
          {FLOCK_PURPOSE_LABELS[v]}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (v) => (
        <Badge color={v === 'ACTIF' ? 'green' : 'gray'}>
          {FLOCK_STATUS_LABELS[v]}
        </Badge>
      ),
    },
    { key: 'arrivalDate', label: 'Date d\'arrivée', render: (v) => formatDate(v) },
    ...(canManage ? [{
      key: 'id',
      label: 'Actions',
      render: (v, row) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(v); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Troupeaux</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos lots de volailles</p>
        </div>
        {canManage && <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau troupeau</span>
          <span className="sm:hidden">Ajouter</span>
        </button>}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </div>
      )}

      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Bird className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900">Liste des troupeaux ({flocks.length})</h2>
        </div>
        <DataTable
          columns={columns}
          data={flocks}
          loading={loading}
          emptyMessage="Aucun troupeau enregistré. Cliquez sur 'Nouveau troupeau' pour commencer."
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editFlock ? 'Modifier le troupeau' : 'Nouveau troupeau'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nom du troupeau *</label>
              <input {...register('name')} type="text" className="input-field" placeholder="Lot A - Printemps 2024" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Race *</label>
              <input {...register('breed')} type="text" className="input-field" placeholder="ISA Brown" />
              {errors.breed && <p className="text-red-500 text-xs mt-1">{errors.breed.message}</p>}
            </div>

            <div>
              <label className="label">Quantité *</label>
              <input {...register('quantity')} type="number" className="input-field" placeholder="500" />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="label">Date d'arrivée *</label>
              <input {...register('arrivalDate')} type="date" className="input-field" />
              {errors.arrivalDate && <p className="text-red-500 text-xs mt-1">{errors.arrivalDate.message}</p>}
            </div>

            <div>
              <label className="label">Numéro de lot</label>
              <input {...register('batchNumber')} type="text" className="input-field" placeholder="LOT-2024-001" />
            </div>

            <div>
              <label className="label">Type *</label>
              <select {...register('purpose')} className="input-field">
                <option value="OEUF">Ponte</option>
                <option value="CHAIR">Poulet de chair</option>
              </select>
            </div>

            <div>
              <label className="label">Statut *</label>
              <select {...register('status')} className="input-field">
                <option value="ACTIF">Actif</option>
                <option value="TERMINE">Terminé</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Enregistrement...' : (editFlock ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer ce troupeau ? Tous les enregistrements de production associés seront également supprimés. Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleDelete} className="btn-danger flex-1">Supprimer</button>
        </div>
      </Modal>
    </div>
  );
}
