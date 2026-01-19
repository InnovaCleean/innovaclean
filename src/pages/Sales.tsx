import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { Search, AlertTriangle, PlusCircle, Trash2, Eye, X } from 'lucide-react';
import { formatCurrency, formatDate, getCDMXDate, getCDMXISOString, getCDMXDateFromISO, parseCDMXDate } from '../lib/utils';
import { Product, Sale, Client } from '../types';
import { ClientForm } from '../components/ClientForm';

export default function Sales() {
    const products = useStore((state) => state.products);
    const sales = useStore((state) => state.sales);
    const user = useStore((state) => state.user);
    const isAdmin = user?.role === 'admin';
    const settings = useStore((state) => state.settings);
    const clients = useStore((state) => state.clients);
    const addSalesBatch = useStore((state) => state.addSalesBatch);
    const deleteSaleByFolio = useStore((state) => state.deleteSaleByFolio);
    const updateFolioDate = useStore((state) => state.updateFolioDate);
    const addClient = useStore((state) => state.addClient); // Need to add client

    const [cart, setCart] = useState<Sale[]>([]);
    const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [correctionMode, setCorrectionMode] = useState(false);
    const [correctionNote, setCorrectionNote] = useState('');

    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState('general');
    const [historyClientFilter, setHistoryClientFilter] = useState('all');
    const [startDate, setStartDate] = useState(getCDMXDate());
    const [endDate, setEndDate] = useState(getCDMXDate());

    const [currentPriceType, setCurrentPriceType] = useState<'retail' | 'medium' | 'wholesale'>('retail');

    const handleNewClientSubmit = (data: Omit<Client, 'id'>) => {
        const newId = crypto.randomUUID();
        addClient({ ...data, id: newId });
        setSelectedClient(newId);
        setIsClientModalOpen(false);
    };

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);
    }, [searchTerm, products]);

    useEffect(() => {
        if (selectedProduct) {
            const absQty = Math.abs(quantity);
            const mid = settings.priceThresholds?.medium || 6;
            const whole = settings.priceThresholds?.wholesale || 12;

            if (absQty >= whole) setCurrentPriceType('wholesale');
            else if (absQty >= mid) setCurrentPriceType('medium');
            else setCurrentPriceType('retail');
        } else {
            setCurrentPriceType('retail'); // Reset if no product selected
        }
    }, [quantity, selectedProduct, settings.priceThresholds]);

    const currentPrice = useMemo(() => {
        if (!selectedProduct) return 0;
        if (currentPriceType === 'wholesale') return selectedProduct.priceWholesale;
        if (currentPriceType === 'medium') return selectedProduct.priceMedium;
        return selectedProduct.priceRetail;
    }, [selectedProduct, currentPriceType]);

    const total = currentPrice * quantity;
    const cartTotal = cart.reduce((acc, item) => acc + item.amount, 0);

    const handleAddToCart = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        // Check if item already in cart (same SKU and same correction status)
        const existingIdx = cart.findIndex(item => item.sku === selectedProduct.sku && item.isCorrection === correctionMode);

        const finalQuantity = correctionMode ? -Math.abs(quantity) : Math.abs(quantity);
        const finalAmount = currentPrice * finalQuantity;

        const saleData: Sale = {
            id: crypto.randomUUID(),
            folio: '', // Store adds this
            date: getCDMXISOString(),
            sku: selectedProduct.sku,
            productName: selectedProduct.name, // Add product name
            unit: selectedProduct.unit || 'Litro',
            quantity: finalQuantity,
            priceType: currentPriceType as any,
            priceUnit: currentPrice,
            amount: finalAmount,
            sellerId: user?.id || 'unknown',
            sellerName: user?.name || 'Sistema',
            clientId: selectedClient,
            clientName: clients.find(c => c.id === selectedClient)?.name || 'General',
            isCorrection: correctionMode,
            correctionNote: correctionMode ? correctionNote : undefined
        };

        if (existingIdx >= 0) {
            const newCart = [...cart];
            newCart[existingIdx].quantity += finalQuantity;
            newCart[existingIdx].amount += finalAmount;
            setCart(newCart);
        } else {
            setCart(prev => [...prev, saleData]);
        }

        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity(1);
    };

    const handleRemoveFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const handleUpdateCartQuantity = (id: string, newQty: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const product = products.find(p => p.sku === item.sku);
                if (product) {
                    const absQty = Math.abs(newQty);
                    const mid = settings.priceThresholds?.medium || 6;
                    const whole = settings.priceThresholds?.wholesale || 12;

                    let priceType: 'retail' | 'medium' | 'wholesale' = 'retail';
                    if (absQty >= whole) priceType = 'wholesale';
                    else if (absQty >= mid) priceType = 'medium';

                    const priceUnit = priceType === 'wholesale' ? product.priceWholesale :
                        priceType === 'medium' ? product.priceMedium :
                            product.priceRetail;

                    const amount = priceUnit * newQty;
                    return { ...item, quantity: newQty, priceType, priceUnit, amount, unit: product.unit || 'Litro' };
                }
                return { ...item, quantity: newQty, amount: item.priceUnit * newQty };
            }
            return item;
        }));
    };

    const handleConfirmSale = () => {
        if (cart.length === 0) return;

        const currentClient = clients.find(c => c.id === selectedClient);
        const finalizedCart = cart.map(item => ({
            ...item,
            clientId: selectedClient,
            clientName: currentClient?.name || 'PÚBLICO GENERAL'
        }));

        addSalesBatch(finalizedCart);

        setCart([]);
        setCorrectionMode(false);
        setCorrectionNote('');
    };

    const displayedSales = useMemo(() => {
        const startDay = parseCDMXDate(startDate);
        startDay.setHours(0, 0, 0, 0);
        const endDay = parseCDMXDate(endDate);
        endDay.setHours(23, 59, 59, 999);

        return sales.filter(s => {
            const date = parseCDMXDate(s.date);
            const matchesDate = date >= startDay && date <= endDay;
            const matchesClient = historyClientFilter === 'all' || s.clientId === historyClientFilter;
            return matchesDate && matchesClient;
        }).sort((a, b) => parseCDMXDate(b.date).getTime() - parseCDMXDate(a.date).getTime());
    }, [sales, startDate, endDate, historyClientFilter]);

    const groupedSales = useMemo(() => {
        const groups: Record<string, {
            folio: string;
            date: string;
            clientId: string;
            clientName: string;
            sellerName: string;
            amount: number;
            items: Sale[];
            isCancelled: boolean;
            isCorrection: boolean;
        }> = {};

        displayedSales.forEach(s => {
            if (!groups[s.folio]) {
                groups[s.folio] = {
                    folio: s.folio,
                    date: s.date,
                    clientId: s.clientId || 'general',
                    clientName: s.clientName || 'General',
                    sellerName: s.sellerName || 'Sistema',
                    amount: 0,
                    items: [],
                    isCancelled: false,
                    isCorrection: false
                };
            }
            groups[s.folio].amount += s.amount;
            groups[s.folio].items.push(s);
            if (s.isCorrection) groups[s.folio].isCorrection = true;
            if (s.correctionNote?.includes('CANCELADO')) {
                groups[s.folio].isCancelled = true;
            }
        });

        return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [displayedSales]);

    const activeFolioData = useMemo(() => {
        return groupedSales.find(g => g.folio === selectedFolio);
    }, [groupedSales, selectedFolio]);

    const handleCancelFolio = (folio: string) => {
        const reason = window.prompt('Motivo de la cancelación del FOLIO completo:');
        if (reason) {
            deleteSaleByFolio(folio, reason);
            setIsDetailModalOpen(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sales Form */}
                <div className="w-full lg:w-1/3 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <PlusCircle className="w-6 h-6 text-primary-600" />
                            Nueva Venta
                        </h2>

                        <form onSubmit={handleAddToCart} className="space-y-4">
                            {/* Client Selector */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedClient}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsClientModalOpen(true)}
                                        className="bg-primary-50 text-primary-600 p-2 rounded-lg hover:bg-primary-100"
                                        title="Nuevo Cliente"
                                    >
                                        <PlusCircle className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

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
                                        placeholder="Buscar por nombre o SKU..."
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                {/* Suggestions Dropdown */}
                                {searchTerm && !selectedProduct && filteredProducts.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white mt-1 border border-slate-200 rounded-lg shadow-lg">
                                        {filteredProducts.map(p => (
                                            <button
                                                key={p.sku}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProduct(p);
                                                    setSearchTerm(p.name);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                                            >
                                                <div className="font-medium text-slate-900">{p.name}</div>
                                                <div className="text-slate-500 text-xs">SKU: {p.sku} | Stock: {p.stockCurrent} {p.unit || 'Litro'}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedProduct && (
                                <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 relative group">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedProduct(null);
                                            setSearchTerm('');
                                        }}
                                        className="absolute right-2 top-2 p-1 text-primary-400 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Cambiar Producto"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="text-sm text-primary-800 font-medium">{selectedProduct.name}</div>
                                    <div className="text-xs text-primary-600 mt-1">Disponible: {selectedProduct.stockCurrent} {selectedProduct.unit || 'Litro'}</div>
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-primary-500"
                                />
                            </div>

                            {/* Price Type Indicator */}
                            {selectedProduct && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Tipo de Precio:</span>
                                        <span className={`font-bold capitalize ${currentPriceType === 'wholesale' ? 'text-green-600' :
                                            currentPriceType === 'medium' ? 'text-blue-600' : 'text-slate-700'
                                            }`}>
                                            {currentPriceType === 'retail' ? 'Menudeo' : currentPriceType === 'medium' ? 'Medio' : 'Mayoreo'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                                <div>
                                    <span className="text-xs text-slate-500 block">Precio Unitario</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(currentPrice)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 block">Total</span>
                                    <span className="text-xl font-bold text-primary-700">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            {/* Correction Toggle */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="correction"
                                    checked={correctionMode}
                                    onChange={(e) => setCorrectionMode(e.target.checked)}
                                    className="rounded text-red-600 focus:ring-red-500"
                                />
                                <label htmlFor="correction" className="text-sm text-slate-600 select-none">
                                    Es una corrección / devolución
                                </label>
                            </div>

                            {correctionMode && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nota de Corrección</label>
                                    <textarea
                                        required
                                        value={correctionNote}
                                        onChange={(e) => setCorrectionNote(e.target.value)}
                                        className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                        placeholder="Motivo de la corrección..."
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!selectedProduct}
                                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 ${correctionMode
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                                    : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {correctionMode ? 'Agregar Corrección' : 'Agregar Producto'}
                            </button>

                        </form>
                    </div>

                    {/* Cart Preview Section */}
                    {cart.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-md border-2 border-primary-100 space-y-4 animate-in slide-in-from-top duration-300">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                    {cart.length}
                                </span>
                                Resumen de Venta
                            </h3>
                            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-2">
                                {cart.map(item => {
                                    const p = products.find(prod => prod.sku === item.sku);
                                    return (
                                        <div key={item.id} className="py-2 flex flex-col gap-1">
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="font-medium text-slate-900">{p?.name}</div>
                                                <button
                                                    onClick={() => handleRemoveFromCart(item.id)}
                                                    className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateCartQuantity(item.id, Number(e.target.value))}
                                                        className={`w-16 px-1 py-0.5 text-xs border rounded outline-none focus:border-primary-500 font-bold ${item.quantity < 0 ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-700'}`}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit || 'Litro'}</span>
                                                    <span className="text-xs text-slate-400">x {formatCurrency(item.priceUnit)}</span>
                                                </div>
                                                <span className={`text-sm font-bold ${item.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {formatCurrency(item.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-center">
                                <span className="text-slate-600 font-medium font-sans uppercase tracking-wider text-xs">Total Venta</span>
                                <span className="text-2xl font-black text-primary-700">{formatCurrency(cartTotal)}</span>
                            </div>
                            <button
                                onClick={handleConfirmSale}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-lg shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                            >
                                CONFIRMAR Y REGISTRAR
                            </button>
                        </div>
                    )}
                </div>

                {/* History / Table - Responsive */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800">Historial de Ventas</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Cliente</span>
                                <select
                                    value={historyClientFilter}
                                    onChange={e => setHistoryClientFilter(e.target.value)}
                                    className="bg-transparent py-1 text-sm outline-none font-medium text-slate-700 min-w-[120px]"
                                >
                                    <option value="all">TODOS LOS CLIENTES</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="border border-slate-300 rounded px-2 py-1 text-sm bg-slate-50"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="border border-slate-300 rounded px-2 py-1 text-sm bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="overflow-auto flex-1 h-[600px]">
                        <table className="w-full text-left text-sm relative">
                            <thead className="bg-primary-600 text-white font-medium sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3">Folio</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Total</th>
                                    <th className="px-6 py-3">Vendedor</th>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupedSales.map((group) => {
                                    return (
                                        <tr key={group.folio} className={`${group.isCorrection ? 'bg-red-50' : 'hover:bg-slate-50'} ${group.isCancelled ? 'opacity-50' : ''}`}>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">{group.folio}</td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {group.clientName}
                                            </td>
                                            <td className={`px-6 py-4 font-bold ${amountColor(group.amount)}`}>
                                                {formatCurrency(group.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs">
                                                {group.sellerName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {formatDate(group.date)}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedFolio(group.folio);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Ver Detalle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {isAdmin && !group.isCancelled && (
                                                    <button
                                                        onClick={() => handleCancelFolio(group.folio)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Cancelar Folio"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {groupedSales.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            No hay ventas en este periodo
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Client Modal */}
            {isClientModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800">
                                Nuevo Cliente
                            </h2>
                            <button
                                onClick={() => setIsClientModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <ClientForm
                                onSubmit={handleNewClientSubmit}
                                onCancel={() => setIsClientModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailModalOpen && activeFolioData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    Folio: {activeFolioData.folio}
                                    {activeFolioData.isCancelled && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-sans uppercase">CANCELADO</span>}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    {isAdmin && !activeFolioData.isCancelled ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={getCDMXDateFromISO(activeFolioData.date)}
                                                onChange={(e) => updateFolioDate(activeFolioData.folio, e.target.value)}
                                                className="text-xs border-b border-dashed border-primary-500 bg-transparent text-primary-700 font-bold outline-none cursor-pointer"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">{formatDate(activeFolioData.date)}</p>
                                    )}
                                    <span className="text-slate-400">|</span>
                                    <p className="text-sm font-bold text-slate-700">{activeFolioData.clientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-4 py-3 text-center">Cant.</th>
                                        <th className="px-4 py-3 text-center">Unidad</th>
                                        <th className="px-4 py-3 text-right">Precio U.</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {activeFolioData.items.map((item) => {
                                        const p = products.find(prod => prod.sku === item.sku);
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900">{p?.name || item.sku}</div>
                                                    <div className="text-xs text-slate-400">SKU: {item.sku}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-700 font-bold">{item.quantity}</td>
                                                <td className="px-4 py-3 text-center text-slate-400 font-bold uppercase text-[10px]">{item.unit || 'Litro'}</td>
                                                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.priceUnit)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-4 text-right text-slate-600 uppercase tracking-tighter text-xs">Total de la Operación</td>
                                        <td className="px-4 py-4 text-right text-2xl text-primary-700">{formatCurrency(activeFolioData.amount)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {activeFolioData.items.some(i => i.correctionNote) && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                                    <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        Notas / Motivo de Cancelación
                                    </h4>
                                    <p className="text-sm text-red-700">
                                        {activeFolioData.items.find(i => i.correctionNote)?.correctionNote}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                            >
                                Cerrar
                            </button>
                            {isAdmin && !activeFolioData.isCancelled && (
                                <button
                                    onClick={() => handleCancelFolio(activeFolioData.folio)}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-500/30 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Cancelar Venta
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

function amountColor(amount: number) {
    if (amount < 0) return 'text-red-600';
    return 'text-emerald-600';
}
