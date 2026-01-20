import * as XLSX from 'xlsx';
import { Sale, Product } from '../types';
import { formatDate } from './utils';

export const exportSalesToExcel = (sales: Sale[], products: Product[], type: 'summary' | 'detailed', fileName: string) => {
    let data: any[] = [];

    if (type === 'summary') {
        // Group by Folio
        const groups: Record<string, Sale[]> = {};
        sales.forEach(s => {
            if (!groups[s.folio]) groups[s.folio] = [];
            groups[s.folio].push(s);
        });

        data = Object.values(groups).map(group => {
            const first = group[0];
            const total = group.reduce((acc, item) => acc + item.amount, 0);
            return {
                'Folio': first.folio,
                'Fecha': formatDate(first.date),
                'Cliente': first.clientName || 'General',
                'Vendedor': first.sellerName || 'Sistema',
                'Método Pago': first.paymentMethod || 'Efectivo',
                'Total': total,
                'Estatus': first.correctionNote?.includes('CANCELADO') ? 'CANCELADO' : 'Activo'
            };
        });
    } else {
        // Detailed
        data = sales.map(s => {
            const product = products.find(p => p.sku === s.sku);
            const cost = product ? product.cost : 0;
            const profit = s.amount - (cost * s.quantity);

            return {
                'Folio': s.folio,
                'Fecha': formatDate(s.date),
                'Cliente': s.clientName || 'General',
                'SKU': s.sku,
                'Producto': s.productName || product?.name || s.sku,
                'Cantidad': s.quantity,
                'Unidad': s.unit,
                'Precio Unit.': s.priceUnit,
                'Costo Unit.': cost,
                'Total Línea': s.amount,
                'Utilidad': profit,
                'Vendedor': s.sellerName,
                'Método Pago': (() => {
                    const m = (s.paymentMethod || 'cash').toLowerCase().trim();
                    const map: Record<string, string> = {
                        'cash': 'EFECTIVO',
                        'card_credit': 'TARJETA CRÉDITO',
                        'card_debit': 'TARJETA DÉBITO',
                        'transfer': 'TRANSFERENCIA',
                        'wallet': 'MONEDERO',
                        'multiple': 'MIXTO'
                    };
                    return map[m] || m;
                })()
            };
        });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};
