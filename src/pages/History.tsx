import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { formatCurrency, formatDate, getCDMXDate, getCDMXFirstDayOfMonth, parseCDMXDate, getCDMXISOString } from '../lib/utils';
import { FileDown, FileText, User, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Eye, X, Pencil, Trash2, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export default function History() {
    const sales = useStore((state) => state.sales);
    const clients = useStore((state) => state.clients);
    const settings = useStore((state) => state.settings);
    const products = useStore((state) => state.products);

    const [startDate, setStartDate] = useState(getCDMXFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getCDMXDate());
    const [clientFilter, setClientFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const updateSale = useStore((state) => state.updateSale);
    const deleteSale = useStore((state) => state.deleteSale);
    const resetDataForDeployment = useStore((state) => state.resetDataForDeployment);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-primary-500 transition-colors" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-primary-600" /> : <ArrowDown className="w-3 h-3 text-primary-600" />;
    };

    const filteredSales = useMemo(() => {
        const startDay = parseCDMXDate(startDate);
        startDay.setHours(0, 0, 0, 0);
        const endDay = parseCDMXDate(endDate);
        endDay.setHours(23, 59, 59, 999);

        return sales.filter(s => {
            const date = parseCDMXDate(s.date);
            const matchesDate = date >= startDay && date <= endDay;
            const matchesClient = clientFilter === 'all' || s.clientId === clientFilter;
            return matchesDate && matchesClient;
        }).sort((a, b) => parseCDMXDate(b.date).getTime() - parseCDMXDate(a.date).getTime());
    }, [sales, startDate, endDate, clientFilter]);

    // Grouping for summary table
    const sortedGroupedSales = useMemo(() => {
        const groups: Record<string, any> = {};
        filteredSales.forEach(s => {
            if (!groups[s.folio]) {
                groups[s.folio] = {
                    folio: s.folio,
                    date: s.date,
                    clientName: s.clientName,
                    sellerName: s.sellerName,
                    amount: 0,
                    cost: 0,
                    items: [],
                    isCancelled: s.correctionNote?.includes('CANCELADO')
                };
            }
            groups[s.folio].amount += s.amount;
            const p = products.find(prod => prod.sku === s.sku);
            groups[s.folio].cost += (p?.cost || 0) * s.quantity;
            groups[s.folio].items.push(s);
            if (groups[s.folio].paymentMethods && !groups[s.folio].paymentMethods.includes(s.paymentMethod || 'cash')) {
                groups[s.folio].paymentMethods.push(s.paymentMethod || 'cash');
            } else if (!groups[s.folio].paymentMethods) {
                groups[s.folio].paymentMethods = [s.paymentMethod || 'cash'];
            }
        });

        let result = Object.values(groups);

        if (sortConfig) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort by date desc
            result.sort((a, b) => parseCDMXDate(b.date).getTime() - parseCDMXDate(a.date).getTime());
        }

        return result;
    }, [filteredSales, products, sortConfig]);

    const sellerRankings = useMemo(() => {
        const stats: Record<string, number> = {};
        filteredSales.forEach(s => {
            if (!s.correctionNote?.includes('CANCELADO')) {
                stats[s.sellerName] = (stats[s.sellerName] || 0) + s.amount;
            }
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [filteredSales]);

    const clientRankings = useMemo(() => {
        const stats: Record<string, number> = {};
        filteredSales.forEach(s => {
            if (!s.correctionNote?.includes('CANCELADO')) {
                const name = s.clientName || 'PÚBLICO GENERAL';
                stats[name] = (stats[name] || 0) + s.amount;
            }
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [filteredSales]);

    const exportToExcel = () => {
        const data = sortedGroupedSales.map(g => {
            const methods = g.paymentMethods ? g.paymentMethods.map((m: string) => {
                const key = (m || 'cash').toLowerCase().trim();
                const map: Record<string, string> = {
                    'cash': 'EFECTIVO',
                    'card_credit': 'TARJETA CREDITO',
                    'card_debit': 'TARJETA DEBITO',
                    'transfer': 'TRANSFERENCIA',
                    'wallet': 'MONEDERO',
                    'multiple': 'MIXTO'
                };
                return map[key] || m;
            }).join(', ') : 'EFECTIVO';

            // Short date format
            const d = parseCDMXDate(g.date);
            const shortDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

            return {
                Folio: g.folio,
                Fecha: shortDate,
                Cliente: g.clientName,
                Vendedor: g.sellerName,
                Total: g.amount,
                'Método de Pago': methods,
                Estado: g.isCancelled ? 'CANCELADO' : 'ACTIVO'
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
        XLSX.writeFile(wb, `reporte_ventas_${startDate}_${endDate}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Header & Branding
        doc.setFontSize(22);
        doc.setTextColor(0, 102, 204);
        doc.text(settings.companyName || 'INNOVA CLEAN', 20, 20);

        // Logo Top Right
        if (settings.logo) {
            try {
                // Approximate 30x30 logo
                doc.addImage(settings.logo, 'PNG', 160, 10, 30, 30);
            } catch (e) {
                console.error('Error adding logo to PDF', e);
            }
        }

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`RFC: ${settings.rfc || 'N/A'}`, 20, 28);
        doc.text(`Dirección: ${settings.address || 'N/A'}`, 20, 33);
        doc.text(`Tel: ${(settings as any).phone || 'N/A'}`, 20, 38);

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('REPORTE DE VENTAS', 105, 55, { align: 'center' });
        doc.setFontSize(10);

        const startD = parseCDMXDate(startDate + 'T00:00:00');
        const endD = parseCDMXDate(endDate + 'T00:00:00');
        const formatD = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

        doc.text(`Periodo: ${formatD(startD)} al ${formatD(endD)}`, 105, 62, { align: 'center' });

        // Table Data
        const tableData = sortedGroupedSales.map(g => {
            const d = parseCDMXDate(g.date);
            const shortDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

            const methods = g.paymentMethods ? g.paymentMethods.map((m: string) => {
                const key = (m || 'cash').toLowerCase().trim();
                const map: Record<string, string> = {
                    'cash': 'EFECTIVO',
                    'card_credit': 'TARJETA CREDITO',
                    'card_debit': 'TARJETA DEBITO',
                    'transfer': 'TRANSFERENCIA',
                    'wallet': 'MONEDERO',
                    'multiple': 'MIXTO'
                };
                return map[key] || m;
            }).join(', ') : 'EFECTIVO';

            return [
                g.folio,
                shortDate,
                g.clientName,
                g.sellerName,
                formatCurrency(g.amount),
                methods,
                g.isCancelled ? 'CANCELADO' : 'ACTIVO'
            ];
        });

        autoTable(doc, {
            startY: 70,
            head: [['Folio', 'Fecha', 'Cliente', 'Vendedor', 'Total', 'Método', 'Estado']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 102, 204] }
        });

        // Consolidados
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        const totalSales = sortedGroupedSales.reduce((acc, g) => acc + (g.isCancelled ? 0 : g.amount), 0);
        const totalCost = sortedGroupedSales.reduce((acc, g) => acc + (g.isCancelled ? 0 : g.cost), 0);
        const utility = totalSales - totalCost;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN DEL PERIODO', 20, finalY);

        doc.setFont('helvetica', 'normal');
        doc.text(`Total Ventas: ${formatCurrency(totalSales)}`, 20, finalY + 10);
        doc.text(`Total Costos: ${formatCurrency(totalCost)}`, 20, finalY + 17);
        if (utility >= 0) doc.setTextColor(0, 128, 0);
        else doc.setTextColor(255, 0, 0);
        doc.text(`Utilidad Bruta: ${formatCurrency(utility)}`, 20, finalY + 24);

        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.text('TOP 5 VENDEDORES', 110, finalY);
        sellerRankings.forEach(([name, total], i) => {
            doc.text(`${i + 1}. ${name}: ${formatCurrency(total)}`, 110, finalY + 10 + (i * 7));
        });

        doc.text('TOP 5 CLIENTES', 110, finalY + 55);
        const maxClientSales = clientRankings.length > 0 ? clientRankings[0][1] : 1;
        clientRankings.forEach(([name, total], i) => {
            const yPos = finalY + 65 + (i * 12);
            doc.setFontSize(9);
            doc.text(`${name}: ${formatCurrency(total)}`, 110, yPos);

            // Draw a small bar
            const barWidth = (total / maxClientSales) * 50;
            doc.setFillColor(0, 150, 136); // Teal
            doc.rect(110, yPos + 2, barWidth, 3, 'F');
        });

        // Footer Timestamp
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            const timestamp = `Generado el: ${formatDate(getCDMXISOString())}`;
            doc.text(timestamp, 105, 285, { align: 'center' });
            doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        }

        doc.save(`reporte_ventas_${startDate}_${endDate}.pdf`);
    };

    return (
        <Layout>
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col">
                <div className="flex-none pb-4 bg-slate-50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">HISTORIAL DE AUDITORÍA</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registro detallado de todos los movimientos de venta</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={exportToExcel}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold transition-all shadow-lg shadow-emerald-500/20 text-xs"
                            >
                                <FileDown className="w-4 h-4" />
                                EXCEL
                            </button>
                            <button
                                onClick={exportToPDF}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold transition-all shadow-lg shadow-rose-500/20 text-xs"
                            >
                                <FileText className="w-4 h-4" />
                                PDF
                            </button>
                        </div>
                    </div>

                    {/* Stats Summary - Compact in sticky header */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Ventas</p>
                            <p className="text-lg font-black text-slate-800">{sortedGroupedSales.length}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Ingreso Total</p>
                            <p className="text-lg font-black text-primary-600">{formatCurrency(sortedGroupedSales.reduce((acc, g) => acc + (g.isCancelled ? 0 : g.amount), 0))}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Costo Total</p>
                            <p className="text-lg font-black text-slate-800">{formatCurrency(sortedGroupedSales.reduce((acc, g) => acc + (g.isCancelled ? 0 : g.cost), 0))}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Utilidad</p>
                            <p className={`text-lg font-black ${sortedGroupedSales.reduce((acc, g) => acc + (g.isCancelled ? 0 : g.amount - g.cost), 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(sortedGroupedSales.reduce((acc, g) => acc + (g.isCancelled ? 0 : g.amount - g.cost), 0))}
                            </p>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mt-3">
                        <div className="flex flex-col lg:flex-row gap-3 items-end">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 w-full lg:w-auto">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 ml-1">
                                        <Calendar className="w-3 h-3" /> Inicio
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 ml-1">
                                        <Calendar className="w-3 h-3" /> Fin
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 font-bold"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 ml-1">
                                        <User className="w-3 h-3" /> Filtrar Cliente
                                    </label>
                                    <select
                                        value={clientFilter}
                                        onChange={e => setClientFilter(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 font-bold truncate"
                                    >
                                        <option value="all">Todos los Clientes</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50 max-h-[calc(100vh-20rem)] md:max-h-[calc(100vh-16rem)]">
                    <table className="w-full text-left text-sm min-w-[1000px] border-separate border-spacing-0">
                        <thead className="bg-primary-600 text-white font-medium sticky top-0 z-20 shadow-md">
                            <tr>
                                <th onClick={() => handleSort('folio')} className="px-6 py-4 border-b border-primary-700 cursor-pointer group hover:bg-primary-700 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Folio <SortIcon columnKey="folio" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('date')} className="px-6 py-4 border-b border-primary-700 cursor-pointer group hover:bg-primary-700 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Fecha <SortIcon columnKey="date" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('clientName')} className="px-6 py-4 border-b border-primary-700 cursor-pointer group hover:bg-primary-700 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Cliente <SortIcon columnKey="clientName" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('sellerName')} className="px-6 py-4 border-b border-primary-700 cursor-pointer group hover:bg-primary-700 transition-colors">
                                    <div className="flex items-center gap-2">
                                        Vendedor <SortIcon columnKey="sellerName" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('amount')} className="px-6 py-4 border-b border-primary-700 cursor-pointer group hover:bg-primary-700 transition-colors text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        Monto <SortIcon columnKey="amount" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 border-b border-primary-700 text-center">Método</th>
                                <th className="px-6 py-4 border-b border-primary-700 text-center">Estado</th>
                                <th className="px-6 py-4 border-b border-primary-700 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedGroupedSales.map(g => (
                                <tr key={g.folio} className={`hover:bg-slate-50 transition-colors ${g.isCancelled ? 'bg-red-50/50' : ''}`}>
                                    <td className="px-6 py-4 font-mono font-bold text-primary-700">{g.folio}</td>
                                    <td className="px-6 py-4 text-slate-500 text-nowrap">{formatDate(g.date)}</td>
                                    <td className="px-6 py-4 font-medium text-slate-700">{g.clientName}</td>
                                    <td className="px-6 py-4 text-slate-600">{g.sellerName}</td>
                                    <td className={`px-6 py-4 font-bold text-right ${g.isCancelled ? 'text-red-400 line-through' : (g.amount < 0 ? 'text-red-600' : 'text-emerald-600')}`}>
                                        {formatCurrency(g.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                                        {g.paymentMethods ? g.paymentMethods.map((m: string) => {
                                            const map: Record<string, string> = {
                                                'cash': 'EFECTIVO',
                                                'card_credit': 'TARJETA CREDITO',
                                                'card_debit': 'TARJETA DEBITO',
                                                'transfer': 'TRANSFERENCIA',
                                                'wallet': 'MONEDERO',
                                                'multiple': 'MIXTO'
                                            };
                                            return map[m] || m;
                                        }).join(', ') : 'EFECTIVO'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {g.isCancelled ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase">CANCELADO</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase">ACTIVO</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                setSelectedFolio(g.folio);
                                                setIsDetailModalOpen(true);
                                            }}
                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-primary-100"
                                            title="Ver Detalle"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedGroupedSales.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        No se encontraron registros en este periodo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Reset Button (Hidden usually, but requested for cleanup before deployment) */}
                <div className="mt-4 flex justify-start">
                    <button
                        onClick={() => {
                            if (confirm('¿ESTÁS SEGURO? Esto eliminará TODAS las ventas y clientes (excepto General). Esta acción no se puede deshacer.')) {
                                resetDataForDeployment();
                                alert('Datos limpiados con éxito. Listo para despliegue.');
                            }
                        }}
                        className="text-[10px] text-slate-300 hover:text-red-500 font-bold uppercase transition-colors"
                    >
                        Limpiar base de datos para despliegue
                    </button>
                </div>

                {/* Detail Modal */}
                {isDetailModalOpen && selectedFolio && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        FOLIO: {selectedFolio}
                                        {sortedGroupedSales.find(g => g.folio === selectedFolio)?.isCancelled && (
                                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">CANCELADO</span>
                                        )}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">Detalle auditado de la transacción</p>
                                </div>
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Cerrar"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-slate-400 font-bold text-[10px] uppercase border-b border-slate-100">
                                        <tr>
                                            <th className="pb-3 px-2">Producto</th>
                                            <th className="pb-3 px-2 text-center">Cant</th>
                                            <th className="pb-3 px-2 text-right">Precio</th>
                                            <th className="pb-3 px-2 text-right">Subtotal</th>
                                            <th className="pb-3 px-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sortedGroupedSales.find(g => g.folio === selectedFolio)?.items.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-2">
                                                    <div className="font-bold text-slate-800 text-xs">{item.sku}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase font-medium">{products.find(p => p.sku === item.sku)?.name || 'Producto'}</div>
                                                </td>
                                                <td className="py-4 px-2 text-center font-mono font-bold text-xs">{item.quantity} {item.unit}</td>
                                                <td className="py-4 px-2 text-right font-mono text-xs">{formatCurrency(item.priceUnit)}</td>
                                                <td className="py-4 px-2 text-right font-mono font-bold text-xs text-primary-600">{formatCurrency(item.amount)}</td>
                                                <td className="py-4 px-2 text-right">
                                                    <div className="flex justify-end gap-2 text-xs">
                                                        <button
                                                            onClick={() => {
                                                                const newQty = prompt('Nueva cantidad:', item.quantity.toString());
                                                                if (newQty !== null) {
                                                                    const qty = parseFloat(newQty);
                                                                    if (!isNaN(qty)) {
                                                                        updateSale(item.id, {
                                                                            quantity: qty,
                                                                            amount: qty * item.priceUnit
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded border border-blue-100 font-bold"
                                                            title="Editar Cantidad"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Motivo de eliminación:');
                                                                if (reason) {
                                                                    deleteSale(item.id, reason);
                                                                }
                                                            }}
                                                            className="p-1 px-2 text-red-600 hover:bg-red-50 rounded border border-red-100 font-bold"
                                                            title="Borrar Item"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-100 bg-slate-50 font-black">
                                            <td colSpan={3} className="py-4 px-2 text-right text-slate-500 uppercase text-[10px]">Total Folio</td>
                                            <td className="py-4 px-2 text-right text-lg text-primary-700">{formatCurrency(sortedGroupedSales.find(g => g.folio === selectedFolio)?.amount || 0)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {/* Payment Breakdown Section */}
                                {(() => {
                                    const group = sortedGroupedSales.find(g => g.folio === selectedFolio);
                                    // Assuming all items share the same payment details, take from first item
                                    const firstItem = group?.items[0];
                                    if (firstItem?.paymentMethod === 'multiple' && firstItem.paymentDetails) {
                                        return (
                                            <div className="mt-6 rounded-lg overflow-hidden border border-slate-200">
                                                {/* Purple Header */}
                                                <div className="bg-purple-100 p-3 flex items-center gap-2">
                                                    <DollarSign className="w-5 h-5 text-purple-700" />
                                                    <h4 className="text-sm font-bold text-purple-800 uppercase tracking-widest">
                                                        DESGLOSE DE PAGO (MIXTO)
                                                    </h4>
                                                </div>

                                                {/* White Body */}
                                                <div className="bg-white p-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {Object.entries(firstItem.paymentDetails).map(([method, amount]) => {
                                                            const map: Record<string, string> = {
                                                                'cash': 'EFECTIVO',
                                                                'card_credit': 'TARJETA CREDITO',
                                                                'card_debit': 'TARJETA DEBITO',
                                                                'transfer': 'TRANSFERENCIA',
                                                                'wallet': 'MONEDERO',
                                                                'multiple': 'MIXTO'
                                                            };
                                                            return (
                                                                <div key={method} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                                                    <span className="text-xs font-bold text-slate-500 uppercase">{map[method] || method}</span>
                                                                    <span className="text-sm font-black text-slate-800">{formatCurrency(amount as number)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className="p-6 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-6 py-2 bg-slate-800 text-white rounded-xl font-black text-xs hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
                                >
                                    CERRAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
