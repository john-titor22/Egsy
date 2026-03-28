import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bird,
  ClipboardList,
  Package,
  ShoppingCart,
  Receipt,
  X,
  Egg,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const clientNavItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/troupeaux', label: 'Troupeaux', icon: Bird },
  { to: '/production', label: 'Production', icon: ClipboardList },
  { to: '/stock', label: 'Stock', icon: Package },
  { to: '/ventes', label: 'Ventes', icon: ShoppingCart },
  { to: '/depenses', label: 'Dépenses', icon: Receipt },
];

const adminNavItems = [
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users },
];

export default function Sidebar({ onClose }) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-lg">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <Egg className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Eggsy</h1>
            <p className="text-xs text-gray-500 leading-tight">Gestion avicole</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Farm name */}
      {user?.farmName && (
        <div className="px-4 py-3 bg-primary-50 border-b border-primary-100">
          <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">Ferme</p>
          <p className="text-sm font-semibold text-primary-800 truncate">{user.farmName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {(user?.role === 'ADMIN' ? adminNavItems : clientNavItems).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
