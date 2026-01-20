import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { Plus, Trash2, X, DollarSign, Tag, User } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Expense } from '../types';

export default function Expenses() {
    const expenses = useStore((state) => state.expenses);
    const addExpense = useStore((state) => state.addExpense);
    const deleteExpense = useStore((state) => state.deleteExpense);
    const user = useStore((state) => state.user);
    // const settings = useStore((state) => state.settings); // Removed unused variable

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<Expense> & { paymentMethod: string }>({
        description: '',
        amount: 0,
        type: 'variable',
        category: 'General',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash'
    });

    // Access check: Admin and Seller allowed (Seller: Capture only)
    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.description || !newExpense.amount) return;

        // Append payment method if not cash
        let finalDesc = newExpense.description;
        if (newExpense.paymentMethod !== 'cash') {
            const methodLabel = newExpense.paymentMethod === 'transfer' ? 'Transferencia' : 'Tarjeta';
            finalDesc += ` [Pago: ${methodLabel}]`;
        }

        await addExpense({
            ...newExpense,
            description: finalDesc,
            userId: user.id || '',
            userName: user.name || 'Usuario',
        } as Expense);

        setIsModalOpen(false);
        setNewExpense({
            description: '',
            amount: 0,
            type: 'variable',
            category: 'General',
            date: new Date().toISOString().split('T')[0],
            paymentMethod: 'cash'
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar este gasto?')) {
            deleteExpense(id);
        }
    };

    return (
        <Layout>
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col">
                <div className="flex-none pb-4 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-slate-800">Gastos</h1>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-bold"
                        >
                            <Plus className="w-4 h-4" />
                            REGISTRAR GASTO
                        </button>
                    </div>
                </div>

                <div className="min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 border-b border-slate-200">Fecha</th>
                                <th className="px-6 py-3 border-b border-slate-200">Descripción</th>
                                <th className="px-6 py-3 border-b border-slate-200">Categoría</th>
                                <th className="px-6 py-3 border-b border-slate-200">Tipo</th>
                                <th className="px-6 py-3 border-b border-slate-200">Usuario</th>
                                <th className="px-6 py-3 border-b border-slate-200 text-right">Monto</th>
                                {(user.role === 'admin') && <th className="px-6 py-3 border-b border-slate-200 text-center">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                        No hay gastos registrados.
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                                            {(() => {
                                                const [y, m, d] = expense.date.split('-');
                                                return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-MX');
                                            })()}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {expense.description}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                                <Tag className="w-3 h-3 mr-1" />
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${expense.type === 'fijo' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                                {expense.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 text-xs">
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {expense.userName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-700">
                                            - {formatCurrency(expense.amount)}
                                        </td>
                                        {(user.role === 'admin') && (
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                                                    title="Eliminar Gasto"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
                            <div className="bg-primary-600 p-4 flex justify-between items-center text-white">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Nuevo Gasto
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="hover:bg-primary-700 p-1 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none placeholder:text-slate-300"
                                        placeholder="Ej. Renta del mes"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto</label>
                                        <input
                                            type="number"
                                            value={newExpense.amount}
                                            onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-700"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                        <select
                                            value={newExpense.type}
                                            onChange={e => setNewExpense({ ...newExpense, type: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="variable">Variable</option>
                                            <option value="fijo">Fijo</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Payment Method Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
                                    <select
                                        value={newExpense.paymentMethod}
                                        onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="cash">EFECTIVO 💵</option>
                                        <option value="transfer">TRANSFERENCIA 🏦</option>
                                        <option value="card_debit">TARJETA DEBITO 💳</option>
                                        <option value="card_credit">TARJETA CREDITO 💳</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                        <input
                                            type="text"
                                            value={newExpense.category}
                                            onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="General"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            value={newExpense.date}
                                            onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-lg shadow-primary-500/20 transition-all"
                                    >
                                        Guardar Gasto
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
