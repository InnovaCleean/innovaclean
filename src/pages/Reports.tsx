import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { formatCurrency, getCDMXDate, getCDMXFirstDayOfMonth, parseCDMXDate, getCDMXNow } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Download } from 'lucide-react';
import { exportSalesToExcel } from '../lib/exportUtils';

export default function Reports() {
    const sales = useStore((state) => state.sales);
    const users = useStore((state) => state.users);
    const products = useStore((state) => state.products);

    // Filters
    const [selectedSeller, setSelectedSeller] = useState<string>('all');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
    const [selectedDate, setSelectedDate] = useState<string>(getCDMXDate());

    // Custom Range State
    const [customStartDate, setCustomStartDate] = useState(getCDMXFirstDayOfMonth());
    const [customEndDate, setCustomEndDate] = useState(getCDMXDate());

    // Filter Logic
    const salesByPeriod = useMemo(() => {
        const now = getCDMXNow();

        const startOfSelectedDay = parseCDMXDate(selectedDate);
        startOfSelectedDay.setHours(0, 0, 0, 0);
        const endOfSelectedDay = parseCDMXDate(selectedDate);
        endOfSelectedDay.setHours(23, 59, 59, 999);

        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);

        // Custom Range parsing
        const rangeStart = parseCDMXDate(customStartDate);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = parseCDMXDate(customEndDate);
        rangeEnd.setHours(23, 59, 59, 999);

        return sales.filter(s => {
            if (s.correctionNote?.startsWith('CANCELADO')) return false;

            // Date Filter
            const date = parseCDMXDate(s.date);
            if (selectedPeriod === 'day') {
                return date >= startOfSelectedDay && date <= endOfSelectedDay;
            }
            if (selectedPeriod === 'week') return date >= startOfWeek;
            if (selectedPeriod === 'month') return date >= startOfMonth;
            if (selectedPeriod === 'year') return date >= startOfYear;
            if (selectedPeriod === 'custom') {
                return date >= rangeStart && date <= rangeEnd;
            }
            return true;
        });
    }, [sales, selectedPeriod, selectedDate, customStartDate, customEndDate]);

    const filteredSales = useMemo(() => {
        if (selectedSeller === 'all') return salesByPeriod;
        return salesByPeriod.filter(s => s.sellerId === selectedSeller);
    }, [salesByPeriod, selectedSeller]);

    // Derived Stats
    const totalSales = filteredSales.reduce((acc, s) => acc + s.amount, 0);

    const totalCost = filteredSales.reduce((acc, s) => {
        const product = products.find(p => p.sku === s.sku);
        const cost = product ? product.cost : 0;
        return acc + (cost * s.quantity);
    }, 0);

    const totalProfit = totalSales - totalCost;

    // Seller Breakdown
    const sellerStats = useMemo(() => {
        return users.map(seller => {
            const sellerSales = salesByPeriod.filter(s => s.sellerId === seller.id);
            const revenue = sellerSales.reduce((acc, s) => acc + s.amount, 0);
            return {
                id: seller.id,
                name: seller.name,
                sales: revenue,
                count: sellerSales.length
            };
        })
            .filter(stat => stat.sales > 0 || stat.count > 0)
            .sort((a, b) => b.sales - a.sales);
    }, [users, salesByPeriod]);

    // Product Breakdown
    const productStats = useMemo(() => {
        const stats: Record<string, { sku: string; name: string; unit: string; quantity: number; revenue: number; cost: number }> = {};

        filteredSales.forEach(s => {
            const product = products.find(p => p.sku === s.sku);
            if (!product) return;

            if (!stats[s.sku]) {
                stats[s.sku] = { sku: s.sku, name: product.name, unit: product.unit || 'Litro', quantity: 0, revenue: 0, cost: 0 };
            }

            stats[s.sku].quantity += s.quantity;
            stats[s.sku].revenue += s.amount;
            stats[s.sku].cost += (product.cost * s.quantity);
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales, products]);

    // Client Breakdown
    const clientStats = useMemo(() => {
        const stats: Record<string, { id: string; name: string; sales: number; count: number }> = {};

        filteredSales.forEach(s => {
            const clientId = s.clientId || 'general';
            if (!stats[clientId]) {
                const clientName = s.clientName || 'PÚBLICO GENERAL';
                stats[clientId] = { id: clientId, name: clientName, sales: 0, count: 0 };
            }
            stats[clientId].sales += s.amount;
            stats[clientId].count += 1;
        });

        return Object.values(stats)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 20);
    }, [filteredSales]);

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">Reportes Avanzados</h1>

                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex gap-2">
                            <button
                                onClick={() => exportSalesToExcel(filteredSales, products, 'summary', `Ventas_Resumen_${selectedDate}`)}
                                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm"
                                title="Exportar Resumen por Folio"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">RESUMEN</span>
                            </button>
                            <button
                                onClick={() => exportSalesToExcel(filteredSales, products, 'detailed', `Ventas_Detalle_${selectedDate}`)}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-xs font-bold shadow-sm"
                                title="Exportar Detalle por Producto"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">DETALLE</span>
                            </button>
                        </div>
                        {/* Period Filter */}
                        <div className="flex bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                            {[
                                { id: 'day', label: 'Día' },
                                { id: 'week', label: 'Semana' },
                                { id: 'month', label: 'Mes' },
                                { id: 'year', label: 'Año' },
                                { id: 'custom', label: 'Rango' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPeriod(p.id)}
                                    className={`px-3 py-2 text-xs font-bold uppercase transition-colors ${selectedPeriod === p.id
                                        ? 'bg-primary-500 text-white'
                                        : 'hover:bg-slate-50 text-slate-600'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {selectedPeriod === 'day' && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 font-bold text-slate-700"
                            />
                        )}

                        {selectedPeriod === 'custom' && (
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300 shadow-sm animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-1.5 px-2">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className="text-xs bg-transparent border-none outline-none font-bold text-slate-700"
                                    />
                                </div>
                                <span className="text-slate-300 text-xs">|</span>
                                <div className="flex items-center gap-1.5 px-2">
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={e => setCustomEndDate(e.target.value)}
                                        className="text-xs bg-transparent border-none outline-none font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                        )}

                        <select
                            value={selectedSeller}
                            onChange={(e) => setSelectedSeller(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 font-bold text-slate-700 shadow-sm"
                        >
                            <option value="all">Usuarios: Todos</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-500 font-medium font-sans">Ventas Totales</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 uppercase">{formatCurrency(totalSales)}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-500 font-medium font-sans">Costo Total</p>
                        <h3 className="text-2xl font-bold text-red-600 mt-1 uppercase">{formatCurrency(totalCost)}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-500 font-medium font-sans">Utilidad Neta</p>
                        <h3 className={`text-2xl font-bold ${totalProfit < 0 ? 'text-red-600' : 'text-emerald-600'} mt-1 uppercase`}>{formatCurrency(totalProfit)}</h3>
                    </div>
                </div>

                {/* Seller Ranking */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 capitalize">Mejores Vendedores ({selectedPeriod})</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sellerStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Bar dataKey="sales" fill="#0284c7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Detailed Product Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Detalle por Producto</h3>
                    </div>
                    <div className="overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-primary-600 text-white font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">SKU</th>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4 text-center">Cant.</th>
                                    <th className="px-6 py-4">Unidad</th>
                                    <th className="px-6 py-4 text-right">Inversión (Costo)</th>
                                    <th className="px-6 py-4 text-right">Ventas</th>
                                    <th className="px-6 py-4 text-right">Utilidad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {productStats.map((stat, idx) => (
                                    <tr key={stat.sku} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="px-6 py-3 font-mono text-xs text-slate-500">{stat.sku}</td>
                                        <td className="px-6 py-3 font-medium text-slate-900">{stat.name}</td>
                                        <td className="px-6 py-3 text-center font-bold text-slate-700">{stat.quantity}</td>
                                        <td className="px-6 py-3 text-slate-400 font-bold uppercase text-[10px]">{stat.unit}</td>
                                        <td className="px-6 py-3 text-right font-medium text-red-600">
                                            {formatCurrency(stat.cost)}
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-900">
                                            {formatCurrency(stat.revenue)}
                                        </td>
                                        <td className={`px-6 py-3 text-right font-bold ${(stat.revenue - stat.cost) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {formatCurrency(stat.revenue - stat.cost)}
                                        </td>
                                    </tr>
                                ))}
                                {productStats.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                            Sin datos en el periodo seleccionado
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Client Ranking */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 capitalize">Top 20 Clientes ({selectedPeriod})</h3>
                    <div className="h-80 w-full mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={clientStats} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Bar dataKey="sales" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3 text-center">Registros de Venta</th>
                                    <th className="px-6 py-3 text-right">Total Facturado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clientStats.map((stat) => (
                                    <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-slate-900">{stat.name}</td>
                                        <td className="px-6 py-3 text-center text-slate-600">{stat.count}</td>
                                        <td className="px-6 py-3 text-right font-bold text-emerald-600">
                                            {formatCurrency(stat.sales)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
