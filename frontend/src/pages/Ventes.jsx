import { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Trash2, FileText, Check } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import api from '../lib/api';
import {
  formatCurrency, formatDate, formatNumber,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS
} from '../lib/utils';

const saleSchema = z.object({
  clientName: z.string().min(1, 'Le nom du client est requis'),
  clientPhone: z.string().optional(),
  date: z.string().min(1, 'La date est requise'),
  paymentStatus: z.enum(['PAYE', 'EN_ATTENTE', 'PARTIEL']),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description requise'),
    quantity: z.coerce.number().positive('Quantité positive requise'),
    unitPrice: z.coerce.number().min(0),
    totalPrice: z.coerce.number().min(0),
  })).min(1, 'Au moins un article est requis'),
});

export default function Ventes() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailSale, setDetailSale] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      paymentStatus: 'EN_ATTENTE',
      items: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchItems = watch('items');

  useEffect(() => { fetchSales(); }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales');
      setSales(res.data);
    } catch { setError('Erreur lors du chargement des ventes'); }
    finally { setLoading(false); }
  };

  const computeItemTotal = (index) => {
    const qty = parseFloat(watchItems[index]?.quantity) || 0;
    const price = parseFloat(watchItems[index]?.unitPrice) || 0;
    const total = qty * price;
    setValue(`items.${index}.totalPrice`, total);
    return total;
  };

  const grandTotal = watchItems?.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0) || 0;

  const onSubmit = async (data) => {
    const items = data.items.map(item => ({
      ...item,
      totalPrice: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
    try {
      await api.post('/sales', { ...data, items, totalAmount });
      await fetchSales();
      setModalOpen(false);
      reset({ date: new Date().toISOString().split('T')[0], paymentStatus: 'EN_ATTENTE', items: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }] });
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    }
  };

  const updateStatus = async (saleId, paymentStatus) => {
    try {
      await api.put(`/sales/${saleId}/status`, { paymentStatus });
      await fetchSales();
      if (detailSale?.id === saleId) {
        const res = await api.get(`/sales/${saleId}`);
        setDetailSale(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  const generateInvoice = async (saleId) => {
    try {
      await api.post(`/sales/${saleId}/invoice`);
      await fetchSales();
      const res = await api.get(`/sales/${saleId}`);
      setDetailSale(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la génération de la facture');
    }
  };

  const filteredSales = statusFilter ? sales.filter(s => s.paymentStatus === statusFilter) : sales;

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const paidRevenue = sales.filter(s => s.paymentStatus === 'PAYE').reduce((sum, s) => sum + s.totalAmount, 0);
  const pendingRevenue = sales.filter(s => s.paymentStatus !== 'PAYE').reduce((sum, s) => sum + s.totalAmount, 0);

  const columns = [
    { key: 'clientName', label: 'Client', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'totalAmount', label: 'Montant', render: (v) => <span className="font-bold">{formatCurrency(v)}</span> },
    {
      key: 'paymentStatus', label: 'Statut',
      render: (v) => <Badge color={PAYMENT_STATUS_COLORS[v]}>{PAYMENT_STATUS_LABELS[v]}</Badge>
    },
    {
      key: 'invoice', label: 'Facture',
      render: (v) => v ? (
        <span className="text-xs text-green-700 font-medium flex items-center gap-1">
          <FileText className="w-3 h-3" /> {v.invoiceNumber}
        </span>
      ) : <span className="text-xs text-gray-400">Non générée</span>
    },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <button onClick={(e) => { e.stopPropagation(); setDetailSale(row); }}
          className="text-xs text-primary-600 hover:underline font-medium">
          Détails
        </button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez vos ventes et factures</p>
        </div>
        <button onClick={() => { reset({ date: new Date().toISOString().split('T')[0], paymentStatus: 'EN_ATTENTE', items: [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }] }); setModalOpen(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle vente</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error} <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">Chiffre d'affaires total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(paidRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">Montant encaissé</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">En attente de paiement</p>
        </div>
      </div>

      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-gray-900">Liste des ventes ({filteredSales.length})</h2>
          </div>
          <div className="sm:ml-auto">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm py-1.5">
              <option value="">Tous les statuts</option>
              <option value="PAYE">Payé</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="PARTIEL">Partiel</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredSales}
          loading={loading}
          emptyMessage="Aucune vente enregistrée."
        />
      </div>

      {/* Create sale modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle vente" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom du client *</label>
              <input {...register('clientName')} type="text" className="input-field" placeholder="Nom du client" />
              {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName.message}</p>}
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input {...register('clientPhone')} type="tel" className="input-field" placeholder="+212 6XX XX XX XX" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input {...register('date')} type="date" className="input-field" />
            </div>
            <div>
              <label className="label">Statut de paiement</label>
              <select {...register('paymentStatus')} className="input-field">
                <option value="EN_ATTENTE">En attente</option>
                <option value="PAYE">Payé</option>
                <option value="PARTIEL">Partiel</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Articles *</label>
              <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 })}
                className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input {...register(`items.${index}.description`)} type="text" className="input-field text-sm" placeholder="Description" />
                  </div>
                  <div className="w-20">
                    <input {...register(`items.${index}.quantity`)} type="number" min="0" step="0.01"
                      className="input-field text-sm" placeholder="Qté"
                      onChange={(e) => { register(`items.${index}.quantity`).onChange(e); computeItemTotal(index); }} />
                  </div>
                  <div className="w-28">
                    <input {...register(`items.${index}.unitPrice`)} type="number" min="0" step="0.01"
                      className="input-field text-sm" placeholder="Prix unit."
                      onChange={(e) => { register(`items.${index}.unitPrice`).onChange(e); computeItemTotal(index); }} />
                  </div>
                  <div className="w-28 pt-2">
                    <span className="text-sm font-medium text-gray-700">
                      {formatCurrency((parseFloat(watchItems[index]?.quantity) || 0) * (parseFloat(watchItems[index]?.unitPrice) || 0))}
                    </span>
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="p-2 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.items && <p className="text-red-500 text-xs mt-1">{errors.items.message || errors.items.root?.message}</p>}
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <div className="text-right">
                <span className="text-sm text-gray-500">Total: </span>
                <span className="text-xl font-bold text-primary-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} placeholder="Remarques..." />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Enregistrement...' : 'Créer la vente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sale detail modal */}
      {detailSale && (
        <Modal open={!!detailSale} onClose={() => setDetailSale(null)} title={`Vente — ${detailSale.clientName}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Client:</span> <span className="font-medium">{detailSale.clientName}</span></div>
              <div><span className="text-gray-500">Téléphone:</span> <span className="font-medium">{detailSale.clientPhone || '-'}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(detailSale.date)}</span></div>
              <div><span className="text-gray-500">Statut:</span> <Badge color={PAYMENT_STATUS_COLORS[detailSale.paymentStatus]}>{PAYMENT_STATUS_LABELS[detailSale.paymentStatus]}</Badge></div>
              {detailSale.invoice && (
                <div className="col-span-2">
                  <span className="text-gray-500">Facture:</span>{' '}
                  <span className="font-medium text-green-700">{detailSale.invoice.invoiceNumber}</span>
                  <span className="text-gray-400 text-xs ml-2">(émise le {formatDate(detailSale.invoice.issuedAt)})</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Articles</h3>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Qté</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Prix unit.</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailSale.items?.map((item, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.quantity)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={3} className="px-3 py-2 font-semibold text-right">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-primary-600">{formatCurrency(detailSale.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {detailSale.notes && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <span className="font-medium">Notes: </span>{detailSale.notes}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {detailSale.paymentStatus !== 'PAYE' && (
                <button onClick={() => updateStatus(detailSale.id, 'PAYE')}
                  className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                  <Check className="w-4 h-4" /> Marquer payé
                </button>
              )}
              {detailSale.paymentStatus !== 'PARTIEL' && (
                <button onClick={() => updateStatus(detailSale.id, 'PARTIEL')}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                  Paiement partiel
                </button>
              )}
              {!detailSale.invoice && (
                <button onClick={() => generateInvoice(detailSale.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600">
                  <FileText className="w-4 h-4" /> Générer facture
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
