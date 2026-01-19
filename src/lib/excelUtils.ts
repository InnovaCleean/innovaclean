import * as XLSX from 'xlsx';
import { Product } from '../types';

export const DOWNLOAD_TEMPLATE_COLS = [
    'SKU', 'Categoría', 'Nombre', 'Unidad de Medida', 'Stock', 'Costo', 'Menudeo', 'Medio', 'Mayoreo'
];

export const downloadProductTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([DOWNLOAD_TEMPLATE_COLS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
};

export const parseProductsExcel = (file: File): Promise<Partial<Product>[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const products: Partial<Product>[] = json.map((row: any) => ({
                    sku: String(row.SKU || row.sku || '').trim(),
                    category: String(row.Categoría || row.category || 'General').trim(),
                    name: String(row.Nombre || row.name || '').trim(),
                    unit: String(row['Unidad de Medida'] || row.unit || 'Litro').trim(),
                    stockCurrent: Number(row.Stock || row.stockCurrent || 0),
                    stockInitial: Number(row.Stock || row.stockInitial || 0),
                    cost: Number(row.Costo || row.cost || 0),
                    priceRetail: Number(row.Menudeo || row.priceRetail || 0),
                    priceMedium: Number(row.Medio || row.priceMedium || 0),
                    priceWholesale: Number(row.Mayoreo || row.priceWholesale || 0),
                }));

                resolve(products.filter(p => p.sku && p.name));
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
