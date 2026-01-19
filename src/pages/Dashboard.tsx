import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { formatCurrency, getCDMXDate, getCDMXNow, parseCDMXDate } from '../lib/utils';
import { TrendingUp, DollarSign, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
    const sales = useStore((state) => state.sales);
    const products = useStore((state) => state.products);
    const users = useStore((state) => state.users);

    // Filters
    const [selectedSeller, setSelectedSeller] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'day', 'week', 'month', 'year'
    const [selectedDate, setSelectedDate] = useState(getCDMXDate());

    // Filter Logic
    const filteredSales = useMemo(() => {
        const now = getCDMXNow();
        // Correct timezone offset issue by treating the string as local
        const specificDayStart = parseCDMXDate(selectedDate);
        specificDayStart.setHours(0, 0, 0, 0);
        const specificDayEnd = parseCDMXDate(selectedDate);
        specificDayEnd.setHours(23, 59, 59, 999);

        // Calculate Week Start (Monday)
        const dayOfWeek = now.getDay(); // 0 is Sunday
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);

        return sales.filter(s => {
            // Seller Filter
            if (selectedSeller !== 'all' && s.sellerId !== selectedSeller) return false;
            if (s.correctionNote?.startsWith('CANCELADO')) return false;

            // Date Filter
            const date = parseCDMXDate(s.date);

            if (selectedPeriod === 'day') {
                return date >= specificDayStart && date <= specificDayEnd;
            }
            if (selectedPeriod === 'week') return date >= startOfWeek;
            if (selectedPeriod === 'month') return date >= startOfMonth;
            if (selectedPeriod === 'year') return date >= startOfYear;

            return true;
        });
    }, [sales, selectedSeller, selectedPeriod, selectedDate]);

    // Metrics Calculation
    const totalSales = filteredSales.reduce((acc, sale) => acc + sale.amount, 0);

    const totalProfit = filteredSales.reduce((acc, sale) => {
        const product = products.find(p => p.sku === sale.sku);
        const cost = product ? product.cost : 0;
        return acc + (sale.amount - (cost * sale.quantity));
    }, 0);

    const inventoryValue = products.reduce((acc, p) => acc + (p.stockCurrent * p.cost), 0);

    // Chart Data
    const chartData = useMemo(() => {
        if (selectedPeriod === 'day') {
            const data = Array.from({ length: 24 }, (_, i) => ({
                name: `${i}:00`,
                sales: 0,
                hour: i
            }));

            filteredSales.forEach(sale => {
                const date = parseCDMXDate(sale.date);
                const hour = date.getHours();
                if (data[hour]) {
                    data[hour].sales += sale.amount;
                }
            });

            return data;
        }

        // Default Logic for Week (Mon-Sun)
        const data = [];

        // We need to generate labels based on period
        const now = new Date(); // To normalize

        if (selectedPeriod === 'week') {
            // Monday to Sunday of Current Week
            const dayOfWeek = now.getDay() || 7; // 1-7
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dayOfWeek - 1));

            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const dateStr = d.toLocaleDateString('es-MX', { weekday: 'short' });

                const daySales = filteredSales.filter(s => {
                    const sd = new Date(s.date);
                    return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth();
                }).reduce((acc, s) => acc + s.amount, 0);

                data.push({ name: dateStr, sales: daySales });
            }
        } else if (selectedPeriod === 'month') {
            // Days of current month
            const year = now.getFullYear();
            const month = now.getMonth();
            const numDays = new Date(year, month + 1, 0).getDate();

            for (let i = 1; i <= numDays; i++) {
                // Only show labels for every ~5 days to avoid clutter, or show day number
                const daySales = filteredSales.filter(s => {
                    const sd = new Date(s.date);
                    return sd.getDate() === i && sd.getMonth() === month;
                }).reduce((acc, s) => acc + s.amount, 0);

                data.push({ name: `${i}`, sales: daySales });
            }
        } else if (selectedPeriod === 'year') {
            // Months
            for (let i = 0; i < 12; i++) {
                const monthName = new Date(now.getFullYear(), i, 1).toLocaleDateString('es-MX', { month: 'short' });

                const monthSales = filteredSales.filter(s => {
                    const sd = new Date(s.date);
                    return sd.getMonth() === i && sd.getFullYear() === now.getFullYear();
                }).reduce((acc, s) => acc + s.amount, 0);

                data.push({ name: monthName, sales: monthSales });
            }
        } else {
            // Day - Hourly
            for (let i = 9; i < 20; i++) { // 9 AM to 8 PM typical ? Or 0-23
                const timeLabel = `${i}:00`;
                const hourSales = filteredSales.filter(s => {
                    const sd = parseCDMXDate(s.date);
                    return sd.getHours() === i;
                }).reduce((acc, s) => acc + s.amount, 0);
                data.push({ name: timeLabel, sales: hourSales });
            }
        }

        return data;
    }, [filteredSales, selectedPeriod]);

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

                    <div className="flex flex-wrap gap-2">
                        {/* Seller Filter */}
                        <select
                            value={selectedSeller}
                            onChange={(e) => setSelectedSeller(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">Todos los Vendedores</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>

                        {/* Period Filter */}
                        <div className="flex bg-white rounded-lg border border-slate-300 overflow-hidden">
                            {[
                                { id: 'day', label: 'Día' },
                                { id: 'week', label: 'Semana' },
                                { id: 'month', label: 'Mes' },
                                { id: 'year', label: 'Año' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPeriod(p.id)}
                                    className={`px-3 py-2 text-sm font-medium transition-colors ${selectedPeriod === p.id
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
                                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 ml-2"
                            />
                        )}
                    </div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Ventas ({selectedPeriod === 'day' ? 'Hoy' : selectedPeriod})</p>
                                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalSales)}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Utilidad Estimada</p>
                                <h3 className={`text-2xl font-bold ${totalProfit < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(totalProfit)}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Valor de Inventario</p>
                                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(inventoryValue)}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 capitalize">Ventas por Periodo ({selectedPeriod})</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(val: number) => formatCurrency(val)} />
                            <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Layout>
    );
}
