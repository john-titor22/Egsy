import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Trash2, Users2, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

const inviteSchema = z.object({
  name: z.string().min(2, 'Nom requis (min. 2 caractères)'),
  email: z.string().email('Email invalide'),
});

const ROLE_LABELS = { OWNER: 'Propriétaire', WORKER: 'Employé' };
const ROLE_COLORS = { OWNER: 'green', WORKER: 'blue' };

export default function Equipe() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState(null); // { user, tempPassword }
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(inviteSchema),
  });

  const fetchMembers = async () => {
    try {
      const res = await api.get('/farm-users');
      setMembers(res.data);
    } catch {
      setError('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const onInvite = async (data) => {
    try {
      setError('');
      const res = await api.post('/farm-users/invite', data);
      setInviteResult(res.data);
      setShowInvite(false);
      reset();
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'invitation');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/farm-users/${deleteId}`);
      setMembers(prev => prev.filter(m => m.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(inviteResult.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon équipe</h1>
          <p className="text-gray-500 text-sm mt-1">{members.length} membre(s) dans votre ferme</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setError(''); reset(); }}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Inviter un employé</span>
          <span className="sm:hidden">Inviter</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>Aucun membre pour l'instant</p>
            <p className="text-sm mt-1">Invitez des employés pour leur donner accès à votre ferme.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Membre</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rôle</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ajouté le</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={ROLE_COLORS[member.role] || 'gray'}>
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {member.mustChangePassword ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        Mot de passe temporaire
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.role === 'WORKER' && (
                      deleteId === member.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-gray-500">Confirmer ?</span>
                          <button onClick={handleDelete} className="text-xs text-red-600 font-medium hover:underline">Oui</button>
                          <button onClick={() => setDeleteId(null)} className="text-xs text-gray-500 hover:underline">Non</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(member.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Inviter un employé">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
        <p className="text-sm text-gray-500 mb-4">
          Un mot de passe temporaire sera généré. L'employé devra le changer lors de sa première connexion.
        </p>
        <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input {...register('name')} className="input-field" placeholder="Ahmed Benali" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input-field" placeholder="ahmed@ferme.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Création...' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Temp password reveal modal */}
      <Modal
        open={!!inviteResult}
        onClose={() => setInviteResult(null)}
        title="Compte créé avec succès"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Le compte de <strong>{inviteResult?.user?.name}</strong> a été créé. Partagez ce mot de passe temporaire avec lui — il ne sera plus visible après fermeture.
          </p>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Mot de passe temporaire</p>
            <div className="flex items-center justify-between gap-3">
              <code className="text-lg font-bold text-gray-900 tracking-widest">
                {inviteResult?.tempPassword}
              </code>
              <button
                onClick={copyPassword}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Copier"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            L'employé devra changer ce mot de passe lors de sa première connexion.
          </p>
          <button onClick={() => setInviteResult(null)} className="btn-primary w-full">
            J'ai noté le mot de passe
          </button>
        </div>
      </Modal>
    </div>
  );
}
