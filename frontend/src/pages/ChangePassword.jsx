import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Egg } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Minimum 6 caractères'),
  confirmPassword: z.string().min(1, 'Confirmation requise'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export default function ChangePassword() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const isForced = user?.mustChangePassword;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      const payload = { newPassword: data.newPassword };
      if (!isForced) payload.currentPassword = data.currentPassword;

      const res = await api.patch('/auth/change-password', payload);
      updateUser(res.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
            <Egg className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isForced ? 'Définir votre mot de passe' : 'Changer le mot de passe'}
          </h1>
          {isForced && (
            <p className="text-gray-500 mt-2 text-sm">
              Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire avant de continuer.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!isForced && (
              <div>
                <label className="label">Mot de passe actuel</label>
                <input
                  {...register('currentPassword')}
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                />
                {errors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="label">Nouveau mot de passe</label>
              <input
                {...register('newPassword')}
                type="password"
                className="input-field"
                placeholder="••••••••"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="input-field"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              <KeyRound className="w-4 h-4" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </button>
          </form>

          {!isForced && (
            <button
              onClick={() => navigate(-1)}
              className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 text-center"
            >
              Annuler
            </button>
          )}

          {isForced && (
            <button
              onClick={logout}
              className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 text-center"
            >
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
