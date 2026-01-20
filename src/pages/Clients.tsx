import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { ClientForm } from '../components/ClientForm';
import { Search, Plus, Trash2, Edit2, Wallet } from 'lucide-react';
import { Client } from '../types';

export default function Clients() {
    const clients = useStore((state) => state.clients);
    const addClient = useStore((state) => state.addClient);
    const updateClient = useStore((state) => state.updateClient);
    const deleteClient = useStore((state) => state.deleteClient);

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')))
    );

    const handleOpenModal = (client?: Client) => {
        setEditingClient(client || null);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (id === 'general') {
            alert("No se puede eliminar el cliente 'PÚBLICO GENERAL'.");
            return;
        }
        if (confirm('¿Estás seguro de eliminar este cliente?')) {
            deleteClient(id);
        }
    };

    const handleSubmit = (data: Omit<Client, 'id'>) => {
        if (editingClient) {
            updateClient(editingClient.id, data);
        } else {
            addClient({
                ...data,
                id: crypto.randomUUID()
            });
        }
        setIsModalOpen(false);
    };

    return (
        <Layout>
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col">
                <div className="flex-none pb-4 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">Catálogo de Clientes</h1>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre o RFC..."
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                            />
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nuevo Cliente</span>
                        </button>
                    </div>
                </div>

                <div className="min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50 max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-8rem)]">
                    <table className="w-full text-left text-sm min-w-[900px] border-separate border-spacing-0">
                        <thead className="bg-primary-600 text-white font-medium sticky top-0 z-20 shadow-md">
                            <tr>
                                <th className="px-6 py-4 border-b border-primary-700">Razón Social</th>
                                <th className="px-6 py-4 border-b border-primary-700">RFC</th>
                                <th className="px-6 py-4 border-b border-primary-700">Contacto</th>
                                <th className="px-6 py-4 border-b border-primary-700">Ubicación</th>
                                <th className="px-6 py-4 text-center border-b border-primary-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-900">{client.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{client.rfc}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500">{client.email}</div>
                                        <div className="text-xs text-slate-500">{client.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-600">
                                        <div>{client.city}, {client.state}</div>
                                        <div className="text-slate-400">{client.colonia}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(client)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingClient(client); setIsWalletModalOpen(true); }}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                title="Administrar Monedero"
                                            >
                                                <Wallet className="w-4 h-4" />
                                            </button>
                                            {client.id !== 'general' && (
                                                <button
                                                    onClick={() => handleDelete(client.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        No se encontraron clientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Client Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <ClientForm
                                initialData={editingClient}
                                onSubmit={handleSubmit}
                                onCancel={() => setIsModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <WalletModal
                isOpen={isWalletModalOpen}
                onClose={() => { setIsWalletModalOpen(false); setEditingClient(null); }}
                client={editingClient}
            />
        </Layout>
    );
}

function WalletModal({ isOpen, onClose, client }: { isOpen: boolean; onClose: () => void; client: Client | null }) {
    const addManualLoyaltyTransaction = useStore(state => state.addManualLoyaltyTransaction);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !client) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return alert('Monto inválido');
        if (!description) return alert('Descripción requerida');

        setLoading(true);
        try {
            await addManualLoyaltyTransaction(client.id, Number(amount), description, type);
            setAmount('');
            setDescription('');
            onClose();
            alert('Movimiento registrado exitosamente.');
        } catch (error) {
            console.error(error);
            // Alert handled in store
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className={`p-4 text-white font-bold text-lg flex justify-between items-center ${type === 'deposit' ? 'bg-indigo-600' : 'bg-orange-500'}`}>
                    <span>Administrar Monedero</span>
                    <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
                </div>
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm text-slate-500">Cliente:</p>
                    <p className="font-bold text-slate-800">{client.name}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('deposit')}
                            className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${type === 'deposit' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                        >
                            Depósito / Devolución
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('withdrawal')}
                            className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${type === 'withdrawal' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}
                        >
                            Retiro / Ajuste
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto ($)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-2xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm h-20 resize-none focus:border-indigo-500 outline-none"
                            placeholder={type === 'deposit' ? "Ej. Bonificación, Devolución producto..." : "Ej. Error de captura, Canje manual..."}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 ${type === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                        >
                            {loading ? 'Guardando...' : 'Confirmar Movimiento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
