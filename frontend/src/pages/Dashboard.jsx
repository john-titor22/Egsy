import { useState, useEffect } from 'react';
import {
  Bird, Egg, ShoppingCart, Receipt, TrendingUp, AlertTriangle,
  TrendingDown, Package
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import api from '../lib/api';
import { formatCurrency, formatDate, formatNumber, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      setError('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const formatChartDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'dd/MM', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre ferme avicole</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Bird}
          label="Troupeaux actifs"
          value={loading ? '...' : formatNumber(data?.activeFlocks || 0)}
          sub={`${formatNumber(data?.totalBirds || 0)} volailles`}
          color="orange"
          loading={loading}
        />
        <StatCard
          icon={Egg}
          label="Oeufs ce mois"
          value={loading ? '...' : formatNumber(data?.totalEggsThisMonth || 0)}
          sub="Production mensuelle"
          color="yellow"
          loading={loading}
        />
        <StatCard
          icon={ShoppingCart}
          label="Ventes ce mois"
          value={loading ? '...' : formatCurrency(data?.totalSalesThisMonth || 0)}
          sub="Chiffre d'affaires"
          color="green"
          loading={loading}
        />
        <StatCard
          icon={Receipt}
          label="Dépenses ce mois"
          value={loading ? '...' : formatCurrency(data?.totalExpensesThisMonth || 0)}
          sub={`Bénéfice net: ${formatCurrency(data?.netProfit || 0)}`}
          color="red"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Production chart */}
        <div className="card xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Production (7 derniers jours)</h2>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : data?.productionTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.productionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(v) => formatChartDate(v)}
                  formatter={(value, name) => [
                    formatNumber(value),
                    name === 'eggsCollected' ? 'Oeufs' : 'Mortalité'
                  ]}
                />
                <Bar dataKey="eggsCollected" name="Oeufs" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mortalityCount" name="Mortalité" fill="#fca5a5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Aucune donnée de production disponible
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-900">Alertes stock</h2>
            {data?.lowStockAlerts?.length > 0 && (
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {data.lowStockAlerts.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : data?.lowStockAlerts?.length > 0 ? (
            <div className="space-y-2">
              {data.lowStockAlerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-red-600">
                      {item.quantity} {item.unit} restant(s)
                    </p>
                  </div>
                  <Package className="w-4 h-4 text-red-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune alerte stock</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent sales */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Ventes récentes</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data?.recentSales?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{sale.clientName}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(sale.date)}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={PAYMENT_STATUS_COLORS[sale.paymentStatus]}>
                        {PAYMENT_STATUS_LABELS[sale.paymentStatus]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            Aucune vente enregistrée
          </div>
        )}
      </div>
    </div>
  );
}
