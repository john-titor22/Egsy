import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
  farmName: z.string().min(2, 'Nom de ferme requis'),
  farmLocation: z.string().min(2, 'Localisation requise'),
});

export default function Utilisateurs() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const onSubmit = async (data) => {
    try {
      const res = await api.post('/auth/register', data);
      setUsers(prev => [res.data, ...prev]);
      setShowModal(false);
      reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} compte(s) client</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); reset(); }} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Créer un compte
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun utilisateur pour l'instant</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ferme</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Localisation</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Créé le</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{user.farmName || '—'}</td>
                  <td className="px-6 py-4 text-gray-700">{user.farmLocation || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {deleteId === user.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-500">Confirmer ?</span>
                        <button onClick={() => handleDelete(user.id)} className="text-xs text-red-600 font-medium hover:underline">Oui</button>
                        <button onClick={() => setDeleteId(null)} className="text-xs text-gray-500 hover:underline">Non</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(user.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Créer un compte client">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom complet</label>
              <input {...register('name')} className="input-field" placeholder="Jean Dupont" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="jean@ferme.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input {...register('password')} type="password" className="input-field" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom de la ferme</label>
              <input {...register('farmName')} className="input-field" placeholder="Ferme du Soleil" />
              {errors.farmName && <p className="text-red-500 text-xs mt-1">{errors.farmName.message}</p>}
            </div>
            <div>
              <label className="label">Localisation</label>
              <input {...register('farmLocation')} className="input-field" placeholder="Marrakech" />
              {errors.farmLocation && <p className="text-red-500 text-xs mt-1">{errors.farmLocation.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Création...' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
