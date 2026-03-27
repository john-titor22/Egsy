import { cn } from '../lib/utils';

export default function StatCard({ icon: Icon, label, value, sub, color = 'orange', loading = false }) {
  const colorMap = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="card flex items-start gap-4">
      {Icon && (
        <div className={cn('p-3 rounded-xl flex-shrink-0', colorMap[color] || colorMap.orange)}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {loading ? (
          <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        )}
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
