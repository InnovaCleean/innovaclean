import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { Search, Archive, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getCDMXDate, getCDMXISOString, getCDMXFirstDayOfMonth, parseCDMXDate } from '../lib/utils';
import { Product, Purchase } from '../types';

export default function Purchases() {
    const products = useStore((state) => state.products);
    const purchases = useStore((state) => state.purchases);
    const user = useStore((state) => state.user);
    const addPurchase = useStore((state) => state.addPurchase);
    const updatePurchase = useStore((state) => state.updatePurchase);
    const deletePurchase = useStore((state) => state.deletePurchase);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [cost, setCost] = useState(0);

    const [startDate, setStartDate] = useState(getCDMXFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getCDMXDate());

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [editForm, setEditForm] = useState({ quantity: 0, costUnit: 0 });

    // Search Logic
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower)
        ).slice(0, 5);
    }, [searchTerm, products]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        if (quantity <= 0) {
            alert("La cantidad debe ser mayor a 0");
            return;
        }

        const purchaseData: Purchase = {
            id: crypto.randomUUID(),
            date: getCDMXISOString(),
            sku: selectedProduct.sku,
            quantity: quantity,
            costUnit: cost,
            costTotal: cost * quantity,
            userId: user?.id,
            userName: user?.name
        };

        addPurchase(purchaseData);

        // Reset
        setSearchTerm('');
        setSelectedProduct(null);
        setQuantity(1);
        setCost(0);
    };

    const handleSelectProduct = (p: Product) => {
        setSelectedProduct(p);
        setSearchTerm(p.name);
        setCost(p.cost); // Default to current cost
    };

    const handleOpenEditModal = (p: Purchase) => {
        setEditingPurchase(p);
        setEditForm({ quantity: p.quantity, costUnit: p.costUnit });
        setIsEditModalOpen(true);
    };

    const handleUpdatePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPurchase) return;

        updatePurchase(editingPurchase.id, {
            quantity: editForm.quantity,
            costUnit: editForm.costUnit,
            costTotal: editForm.quantity * editForm.costUnit
        });

        setIsEditModalOpen(false);
        setEditingPurchase(null);
    };

    const handleDeletePurchase = (id: string) => {
        if (confirm('¿Estás seguro de eliminar este registro de compra? El stock se ajustará automáticamente.')) {
            deletePurchase(id);
        }
    };

    // Filtered Purchases
    const displayedPurchases = useMemo(() => {
        const startDay = parseCDMXDate(startDate);
        startDay.setHours(0, 0, 0, 0);

        const endDay = parseCDMXDate(endDate);
        endDay.setHours(23, 59, 59, 999);

        return purchases.filter(p => {
            const d = parseCDMXDate(p.date);
            return d >= startDay && d <= endDay;
        }).sort((a, b) => parseCDMXDate(b.date).getTime() - parseCDMXDate(a.date).getTime());
    }, [purchases, startDate, endDate]);

    return (
        <Layout>
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Purchase Form */}
                <div className="w-full lg:w-1/3 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Archive className="w-6 h-6 text-primary-600" />
                            Surtir Inventario
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Product Search */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            if (!e.target.value) setSelectedProduct(null);
                                        }}
                                        placeholder="Buscar producto..."
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                {searchTerm && !selectedProduct && filteredProducts.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white mt-1 border border-slate-200 rounded-lg shadow-lg">
                                        {filteredProducts.map(p => (
                                            <button
                                                key={p.sku}
                                                type="button"
                                                onClick={() => handleSelectProduct(p)}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                                            >
                                                <div className="font-medium text-slate-900">{p.name}</div>
                                                <div className="text-slate-500 text-xs">SKU: {p.sku}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedProduct && (
                                <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
                                    <div className="text-sm text-primary-800 font-medium">{selectedProduct.name}</div>
                                    <div className="text-xs text-primary-600 mt-1">Stock Actual: {selectedProduct.stockCurrent} ({selectedProduct.unit || 'uds'})</div>
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad a Agregar</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-primary-500"
                                    />
                                    {selectedProduct?.unit && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                                            {selectedProduct.unit}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cost Override */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cost}
                                    onChange={(e) => setCost(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-primary-500"
                                />
                            </div>

                            {/* Summary */}
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                                <div className="text-right w-full">
                                    <span className="text-xs text-slate-500 block">Total Inversión</span>
                                    <span className="text-xl font-bold text-primary-700">{formatCurrency(quantity * cost)}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedProduct}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 active:bg-primary-800 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-50"
                            >
                                Registrar Compra
                            </button>

                        </form>
                    </div>
                </div>

                {/* History */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-0">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800">Historial de Compras</h2>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 text-sm bg-slate-50 font-bold text-slate-700"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 text-sm bg-slate-50 font-bold text-slate-700"
                            />
                        </div>
                    </div>
                    <div className="overflow-auto max-h-[calc(100vh-16rem)] md:max-h-[calc(100vh-12rem)] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-primary-600 text-white font-medium sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 border-b border-primary-700">Fecha</th>
                                    <th className="px-6 py-4 border-b border-primary-700">Usuario</th>
                                    <th className="px-6 py-4 border-b border-primary-700">Producto</th>
                                    <th className="px-6 py-4 border-b border-primary-700">Cant.</th>
                                    <th className="px-6 py-4 border-b border-primary-700">Unidad</th>
                                    <th className="px-6 py-4 border-b border-primary-700">Costo U.</th>
                                    <th className="px-6 py-4 border-b border-primary-700">Total</th>
                                    <th className="px-6 py-4 text-center border-b border-primary-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedPurchases.map((purchase) => {
                                    const product = products.find(p => p.sku === purchase.sku);
                                    return (
                                        <tr key={purchase.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-slate-500 text-xs text-nowrap">
                                                {formatDate(purchase.date)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs">
                                                {purchase.userName || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {product?.name || purchase.sku}
                                            </td>
                                            <td className="px-6 py-4 font-bold">{purchase.quantity}</td>
                                            <td className="px-6 py-4 text-slate-500 uppercase text-[10px] font-bold">
                                                {product?.unit || 'Litro'}
                                            </td>
                                            <td className="px-6 py-4">{formatCurrency(purchase.costUnit)}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {formatCurrency(purchase.costTotal)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(purchase)}
                                                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePurchase(purchase.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {displayedPurchases.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                            No hay compras en este periodo
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editingPurchase && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">Editar Compra</h3>
                            <p className="text-sm text-slate-500 mt-1">SKU: {editingPurchase.sku}</p>
                        </div>
                        <form onSubmit={handleUpdatePurchase} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={editForm.quantity}
                                    onChange={e => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={editForm.costUnit}
                                    onChange={e => setEditForm(prev => ({ ...prev, costUnit: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-primary-500"
                                />
                            </div>

                            <div className="pt-2 text-right">
                                <div className="text-xs text-slate-400 uppercase font-black">Nuevo Total</div>
                                <div className="text-xl font-bold text-primary-700">{formatCurrency(editForm.quantity * editForm.costUnit)}</div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
