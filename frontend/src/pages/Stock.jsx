import { useState, useEffect } from 'react';
import { Plus, Package, ArrowUp, ArrowDown, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import api from '../lib/api';
import { formatNumber, formatCurrency, formatDate, STOCK_CATEGORY_LABELS } from '../lib/utils';

const itemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  category: z.enum(['ALIMENT', 'MEDICAMENT', 'EQUIPEMENT', 'AUTRE']),
  quantity: z.coerce.number().min(0),
  unit: z.string().min(1, "L'unité est requise"),
  unitPrice: z.coerce.number().min(0),
  alertThreshold: z.coerce.number().min(0),
});

const movementSchema = z.object({
  type: z.enum(['ENTREE', 'SORTIE']),
  quantity: z.coerce.number().positive('La quantité doit être positive'),
  reason: z.string().optional(),
  date: z.string().optional(),
});

const CATEGORY_COLORS = {
  ALIMENT: 'yellow',
  MEDICAMENT: 'blue',
  EQUIPEMENT: 'purple',
  AUTRE: 'gray',
};

export default function Stock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemModal, setItemModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const itemForm = useForm({ resolver: zodResolver(itemSchema), defaultValues: { category: 'AUTRE', quantity: 0, unitPrice: 0, alertThreshold: 0 } });
  const movementForm = useForm({ resolver: zodResolver(movementSchema), defaultValues: { type: 'ENTREE', date: new Date().toISOString().split('T')[0] } });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock');
      setItems(res.data);
    } catch { setError('Erreur lors du chargement du stock'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditItem(null);
    itemForm.reset({ category: 'AUTRE', quantity: 0, unitPrice: 0, alertThreshold: 0 });
    setItemModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    itemForm.reset({
      name: item.name, category: item.category, quantity: item.quantity,
      unit: item.unit, unitPrice: item.unitPrice, alertThreshold: item.alertThreshold,
    });
    setItemModal(true);
  };

  const openMovement = (item) => {
    setSelectedItem(item);
    movementForm.reset({ type: 'ENTREE', date: new Date().toISOString().split('T')[0] });
    setMovementModal(true);
  };

  const onItemSubmit = async (data) => {
    try {
      if (editItem) {
        await api.put(`/stock/${editItem.id}`, data);
      } else {
        await api.post('/stock', data);
      }
      await fetchItems();
      setItemModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const onMovementSubmit = async (data) => {
    try {
      await api.post(`/stock/${selectedItem.id}/movement`, data);
      await fetchItems();
      setMovementModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/stock/${deleteId}`);
      await fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally { setDeleteId(null); }
  };

  const lowStockItems = items.filter(i => i.alertThreshold > 0 && i.quantity <= i.alertThreshold);
  const filteredItems = categoryFilter ? items.filter(i => i.category === categoryFilter) : items;

  const columns = [
    { key: 'name', label: 'Article', render: (v, row) => (
      <div>
        <p className="font-semibold text-gray-900">{v}</p>
        {row.alertThreshold > 0 && row.quantity <= row.alertThreshold && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
            <AlertTriangle className="w-3 h-3" /> Stock bas
          </p>
        )}
      </div>
    )},
    { key: 'category', label: 'Catégorie', render: (v) => (
      <Badge color={CATEGORY_COLORS[v] || 'gray'}>{STOCK_CATEGORY_LABELS[v]}</Badge>
    )},
    { key: 'quantity', label: 'Quantité', render: (v, row) => (
      <span className={row.alertThreshold > 0 && v <= row.alertThreshold ? 'text-red-600 font-bold' : 'font-medium'}>
        {formatNumber(v)} {row.unit}
      </span>
    )},
    { key: 'unitPrice', label: 'Prix unitaire', render: (v) => formatCurrency(v) },
    { key: 'alertThreshold', label: 'Seuil alerte', render: (v, row) => v > 0 ? `${v} ${row.unit}` : '-' },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); openMovement(row); }}
          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 text-xs font-medium flex items-center gap-1 border border-green-200">
          <ArrowUp className="w-3 h-3" /> Mouvement
        </button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(row); }}
          className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(v); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion des stocks et approvisionnements</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvel article</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error} <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Alertes de stock bas ({lowStockItems.length} article(s))</p>
            <p className="text-sm text-red-600 mt-0.5">
              {lowStockItems.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-gray-900">Articles en stock ({filteredItems.length})</h2>
          </div>
          <div className="sm:ml-auto">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field text-sm py-1.5">
              <option value="">Toutes catégories</option>
              <option value="ALIMENT">Aliment</option>
              <option value="MEDICAMENT">Médicament</option>
              <option value="EQUIPEMENT">Équipement</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredItems}
          loading={loading}
          emptyMessage="Aucun article en stock."
        />
      </div>

      {/* Item Modal */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editItem ? 'Modifier l\'article' : 'Nouvel article'}>
        <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
          <div>
            <label className="label">Nom *</label>
            <input {...itemForm.register('name')} type="text" className="input-field" placeholder="Aliment poules pondeuses" />
            {itemForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{itemForm.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie</label>
              <select {...itemForm.register('category')} className="input-field">
                <option value="ALIMENT">Aliment</option>
                <option value="MEDICAMENT">Médicament</option>
                <option value="EQUIPEMENT">Équipement</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div>
              <label className="label">Unité *</label>
              <input {...itemForm.register('unit')} type="text" className="input-field" placeholder="kg, L, unité..." />
              {itemForm.formState.errors.unit && <p className="text-red-500 text-xs mt-1">{itemForm.formState.errors.unit.message}</p>}
            </div>
            <div>
              <label className="label">Quantité initiale</label>
              <input {...itemForm.register('quantity')} type="number" min="0" step="0.01" className="input-field" />
            </div>
            <div>
              <label className="label">Prix unitaire (MAD)</label>
              <input {...itemForm.register('unitPrice')} type="number" min="0" step="0.01" className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="label">Seuil d'alerte</label>
              <input {...itemForm.register('alertThreshold')} type="number" min="0" step="0.01" className="input-field" placeholder="0 = pas d'alerte" />
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setItemModal(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={itemForm.formState.isSubmitting} className="btn-primary flex-1">
              {itemForm.formState.isSubmitting ? 'Enregistrement...' : (editItem ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Movement Modal */}
      <Modal open={movementModal} onClose={() => setMovementModal(false)} title={`Mouvement de stock — ${selectedItem?.name}`}>
        <form onSubmit={movementForm.handleSubmit(onMovementSubmit)} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <span className="text-gray-500">Stock actuel: </span>
            <span className="font-bold text-gray-900">{formatNumber(selectedItem?.quantity)} {selectedItem?.unit}</span>
          </div>
          <div>
            <label className="label">Type de mouvement *</label>
            <select {...movementForm.register('type')} className="input-field">
              <option value="ENTREE">Entrée (approvisionnement)</option>
              <option value="SORTIE">Sortie (utilisation)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantité *</label>
              <input {...movementForm.register('quantity')} type="number" min="0.01" step="0.01" className="input-field" />
              {movementForm.formState.errors.quantity && <p className="text-red-500 text-xs mt-1">{movementForm.formState.errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Date</label>
              <input {...movementForm.register('date')} type="date" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Motif</label>
            <input {...movementForm.register('reason')} type="text" className="input-field" placeholder="Achat fournisseur, consommation quotidienne..." />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setMovementModal(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={movementForm.formState.isSubmitting} className="btn-primary flex-1">
              {movementForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmer la suppression" size="sm">
        <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cet article ? Tous les mouvements associés seront supprimés.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleDelete} className="btn-danger flex-1">Supprimer</button>
        </div>
      </Modal>
    </div>
  );
}
