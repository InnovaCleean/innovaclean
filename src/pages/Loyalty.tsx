import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { Search, Gift, Phone, CheckCircle, Clock, Smartphone } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { Client } from '../types';

export default function Loyalty() {
    const clients = useStore((state) => state.clients);
    const loyaltyTransactions = useStore((state) => state.loyaltyTransactions);
    // const settings = useStore((state) => state.settings); // Unused
    const updateClient = useStore((state) => state.updateClient);

    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const user = useStore((state) => state.user);
    // Option A: Pending/Active Strategy (No PIN required for request)

    const filteredClients = useMemo(() => {
        return clients.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm)
        );
    }, [clients, searchTerm]);

    const activeClient = clients.find(c => c.id === selectedClient);

    const clientTransactions = useMemo(() => {
        if (selectedClient === 'all') return loyaltyTransactions;
        return loyaltyTransactions.filter(t => t.clientId === selectedClient);
    }, [loyaltyTransactions, selectedClient]);

    const clientBalance = useMemo(() => {
        if (!activeClient) return 0;
        return loyaltyTransactions
            .filter(t => t.clientId === activeClient.id)
            .reduce((acc, t) => acc + t.amount, 0);
    }, [activeClient, loyaltyTransactions]);

    // Activation Logic

    const handleRequestActivation = (client: Client) => {
        // 1. Block Generic Clients
        const genericNames = ['publico general', 'público general', 'mostrador', 'ventas', 'general', 'cliente general'];
        if (genericNames.some(name => client.name.toLowerCase().includes(name))) {
            alert('No se puede activar monedero para clientes genéricos. Debe registrar un cliente específico.');
            return;
        }

        // 2. Validate Phone
        if (!client.phone || client.phone.length < 10) {
            alert('El cliente necesita un número de teléfono válido.');
            return;
        }

        // 3. Check uniqueness
        const duplicate = clients.find(c =>
            c.id !== client.id &&
            c.phone === client.phone &&
            (c.walletStatus === 'active' || c.walletStatus === 'pending')
        );

        if (duplicate) {
            alert(`Este teléfono ya está asociado a otro monedero (${duplicate.name}).`);
            return;
        }

        // 4. Set to Pending
        updateClient(client.id, { walletStatus: 'pending', walletActive: false });
        alert('Solicitud de monedero creada. El cliente puede ACUMULAR puntos, pero requiere aprobación del Gerente para CANJEAR.');
    };

    const handleApproveActivation = () => {
        if (!activeClient) return;
        updateClient(activeClient.id, { walletStatus: 'active', walletActive: true });
        alert('¡Monedero validado y activado para canje!');
    };

    return (
        <Layout>
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
                {/* Sidebar... (unchanged, just need to make sure I don't break the closure) */}
                <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Gift className="w-5 h-5 text-primary-600" />
                            Monederos
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredClients.map(client => {
                            const balance = loyaltyTransactions
                                .filter(t => t.clientId === client.id)
                                .reduce((acc, t) => acc + t.amount, 0);

                            // Status Indicator
                            let statusColor = 'bg-slate-100 text-slate-500';
                            if (client.walletStatus === 'active') statusColor = 'bg-emerald-100 text-emerald-700';
                            if (client.walletStatus === 'pending') statusColor = 'bg-yellow-100 text-yellow-700';

                            return (
                                <button
                                    key={client.id}
                                    onClick={() => setSelectedClient(client.id)}
                                    className={`w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 transition-colors ${selectedClient === client.id ? 'bg-primary-50 hover:bg-primary-50 border-primary-100' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-slate-900">{client.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {client.phone || 'Sin teléfono'}
                                                </div>
                                                {client.walletStatus && client.walletStatus !== 'inactive' && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold ${statusColor}`}>
                                                        {client.walletStatus === 'active' ? 'Activo' : 'Pendiente'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold ${balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {formatCurrency(balance)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 uppercase">Saldo</div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                    {activeClient ? (
                        <>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800">{activeClient.name}</h1>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="text-sm text-slate-500">
                                            Teléfono: <span className="font-medium text-slate-700">{activeClient.phone || 'N/A'}</span>
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            Email: <span className="font-medium text-slate-700">{activeClient.email || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right p-4 bg-primary-50 rounded-xl border border-primary-100">
                                    <div className="text-xs text-primary-600 font-bold uppercase tracking-wider mb-1">Saldo Disponible</div>
                                    <div className="text-3xl font-black text-primary-700">{formatCurrency(clientBalance)}</div>
                                </div>
                            </div>

                            {/* Activation / Verification Section */}
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                {(!activeClient.walletStatus || activeClient.walletStatus === 'inactive') && (
                                    <button
                                        onClick={() => handleRequestActivation(activeClient)}
                                        className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-2"
                                    >
                                        <Smartphone className="w-4 h-4" />
                                        Solicitar Alta de Monedero (Modo Pendiente)
                                    </button>
                                )}

                                {activeClient.walletStatus === 'pending' && (
                                    <div className="flex items-center gap-4 animate-in fade-in">
                                        <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-100">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm font-medium">Monedero Pendiente de Verificación (Acumula, no canjea)</span>
                                        </div>
                                        {user?.role === 'admin' && (
                                            <button
                                                onClick={handleApproveActivation}
                                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Aprobar Activación (Gerente)
                                            </button>
                                        )}
                                    </div>
                                )}

                                {activeClient.walletStatus === 'active' && (
                                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-sm font-medium">Monedero Activo y Verificado</span>
                                    </div>
                                )}
                            </div>

                            {/* Transactions Table */}
                            <div className="flex-1 overflow-auto p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    Historial de Movimientos
                                </h3>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                                            <th className="px-4 py-3">Descripción</th>
                                            <th className="px-4 py-3">Tipo</th>
                                            <th className="px-4 py-3 text-right rounded-r-lg">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {clientTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                                    {formatDate(t.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {t.description}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${t.type === 'earn' ? 'bg-emerald-100 text-emerald-700' :
                                                            t.type === 'adjustment' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {t.type === 'earn' ? 'Acumulado' :
                                                            t.type === 'adjustment' ? 'Ajuste Manual' :
                                                                'Canjeado/Retiro'}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                        {clientTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                                                    No hay movimientos registrados
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                            <Gift className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Selecciona un cliente para ver su monedero</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
