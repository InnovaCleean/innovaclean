import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    History as HistoryIcon,
    LogOut,
    Menu,
    X,
    Users,
    CreditCard,
    BarChart3,
    Settings,
    DollarSign,
    Gift
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useStore((state) => state.user);
    const logout = useStore((state) => state.logout);
    const settings = useStore((state) => state.settings);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const links = [
        { name: 'Ventas', href: '/sales', icon: ShoppingCart, roles: ['admin', 'seller'] },
        { name: 'Historial', href: '/history', icon: HistoryIcon, roles: ['admin'] },
        { name: 'Inventario', href: '/inventory', icon: Package, roles: ['admin', 'seller'] },
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
        { name: 'Compras', href: '/purchases', icon: CreditCard, roles: ['admin'] },
        { name: 'Gastos', href: '/expenses', icon: DollarSign, roles: ['admin', 'seller'] },
        { name: 'Monedero', href: '/loyalty', icon: Gift, roles: ['admin', 'seller'] },
        { name: 'Flujo de Caja', href: '/cash-flow', icon: DollarSign, roles: ['admin'] },
        { name: 'Usuarios', href: '/users', icon: Users, roles: ['admin'] },
        { name: 'Clientes', href: '/clients', icon: Users, roles: ['admin'] },
        { name: 'Reportes', href: '/reports', icon: BarChart3, roles: ['admin'] },
        { name: 'Configuración', href: '/settings', icon: Settings, roles: ['admin'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role || ''));

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    {settings.logo ? (
                        <img src={settings.logo} alt="Logo" className="w-8 h-8 object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <span className="font-black text-slate-800 tracking-tight">{settings.companyName || 'INNOVA CLEAN'}</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 bg-white border-r border-slate-200 w-64 z-50 transform transition-transform duration-300 md:relative md:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-8">
                            {settings.logo ? (
                                <img src={settings.logo} alt="Logo" className="w-10 h-10 object-contain" />
                            ) : (
                                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <div>
                                <h1 className="font-black text-slate-800 leading-none tracking-tight">
                                    {settings.companyName || 'INNOVA CLEAN'}
                                </h1>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control de Inventario</p>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-6 flex items-center gap-3">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs border border-primary-200">
                                    {user?.name.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-medium">{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="space-y-1">
                            {filteredLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = location.pathname === link.href;
                                return (
                                    <button
                                        key={link.name}
                                        onClick={() => {
                                            navigate(link.href);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                                            isActive
                                                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                                        {link.name}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Bottom actions */}
                    <div className="mt-auto p-6 border-t border-slate-100">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all duration-200 group"
                        >
                            <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-500" />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-4 md:p-8 relative">
                {children}
            </main>

            {/* Overlay for mobile menu */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
