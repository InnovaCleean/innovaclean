import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { Search, Edit2, Trash2, RefreshCw, X, Download, Upload, Plus } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Product } from '../types';
import { downloadProductTemplate, parseProductsExcel } from '../lib/excelUtils';

export default function Inventory() {
    const products = useStore((state) => state.products);
    const user = useStore((state) => state.user);
    const updateProduct = useStore((state) => state.updateProduct);
    const deleteProduct = useStore((state) => state.deleteProduct);
    const resetAllStock = useStore((state) => state.resetAllStock);
    const importProducts = useStore((state) => state.importProducts);
    const addProduct = useStore((state) => state.addProduct);

    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'sku', direction: 'asc' });

    const filteredProducts = useMemo(() => {
        let result = products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        result.sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [products, searchTerm, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const isAdmin = user?.role === 'admin';

    const defaultProduct: Product = {
        id: '',
        sku: '',
        name: '',
        category: 'General',
        priceRetail: 0,
        priceMedium: 0,
        priceWholesale: 0,
        cost: 0,
        stockInitial: 0,
        stockCurrent: 0,
        unit: 'Pieza'
    };

    const handleCreate = () => {
        setEditingProduct({ ...defaultProduct });
        setIsCreating(true);
    };

    const handleResetStock = () => {
        if (window.confirm('¿Está seguro de volver TODOS los stocks a 0? Esta acción no se puede deshacer.')) {
            resetAllStock();
        }
    };

    const handleDelete = (sku: string) => {
        if (window.confirm('¿Está seguro de eliminar este producto?')) {
            deleteProduct(sku);
        }
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            if (isCreating) {
                await addProduct(editingProduct);
                alert('Producto creado correctamente');
            } else {
                updateProduct(editingProduct.sku, editingProduct);
            }
            setEditingProduct(null);
            setIsCreating(false);
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const products = await parseProductsExcel(file);
            const mode = confirm('¿Desea REEMPLAZAR todo el inventario? (Aceptar para REEMPLAZAR, Cancelar para solo AGREGAR nuevos productos)');
            importProducts(products, mode);
            alert('Inventario actualizado con éxito');
        } catch (error) {
            console.error(error);
            alert('Error al procesar el archivo Excel');
        }
        e.target.value = '';
    };

    return (
        <Layout>
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col">
                <div className="flex-none pb-4 bg-slate-50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar SKU o nombre..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex gap-2">
                                {isAdmin && (
                                    <button
                                        onClick={handleCreate}
                                        className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-bold shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        NUEVO
                                    </button>
                                )}
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={downloadProductTemplate}
                                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            PLANTILLA
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-xs font-bold border border-primary-100"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            CARGAR
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImportExcel}
                                            accept=".xlsx, .xls, .csv"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={handleResetStock}
                                            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                                            title="Reiniciar todo el stock a 0"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Limpiar Stock</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50 max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-9rem)]">
                    <table className="w-full text-left text-sm min-w-[1300px] border-separate border-spacing-0">
                        <thead className="bg-primary-600 text-white font-medium sticky top-0 z-20 shadow-md">
                            <tr>
                                <th onClick={() => handleSort('sku')} className="px-6 py-4 border-b border-primary-700 cursor-pointer hover:bg-primary-700">SKU</th>
                                <th onClick={() => handleSort('category')} className="px-6 py-4 border-b border-primary-700 cursor-pointer hover:bg-primary-700">Categoría</th>
                                <th onClick={() => handleSort('name')} className="px-6 py-4 border-b border-primary-700 cursor-pointer hover:bg-primary-700">Nombre</th>
                                <th onClick={() => handleSort('unit')} className="px-6 py-4 border-b border-primary-700 cursor-pointer hover:bg-primary-700">Unidad</th>
                                <th onClick={() => handleSort('stockCurrent')} className="px-6 py-4 text-center border-b border-primary-700 cursor-pointer hover:bg-primary-700">Stock</th>
                                {isAdmin && <th className="px-6 py-4 text-right border-b border-primary-700">Costo Unit.</th>}
                                <th className="px-6 py-4 text-right border-b border-primary-700">Menudeo</th>
                                <th className="px-6 py-4 text-right border-b border-primary-700">Medio</th>
                                <th className="px-6 py-4 text-right border-b border-primary-700">Mayoreo</th>
                                {isAdmin && <th className="px-6 py-4 text-right font-bold bg-primary-700 border-b border-primary-800">Valor Inv.</th>}
                                {isAdmin && <th className="px-6 py-4 text-center border-b border-primary-700">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map((p) => (
                                <tr key={p.sku} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{p.sku}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">{p.category}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                                    <td className="px-6 py-4 text-slate-500">{p.unit || 'Litro'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.stockCurrent > 10 ? 'bg-green-100 text-green-800' :
                                            p.stockCurrent > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {p.stockCurrent}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">
                                            {formatCurrency(p.cost)}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(p.priceRetail)}</td>
                                    <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(p.priceMedium)}</td>
                                    <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(p.priceWholesale)}</td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-right font-bold text-primary-700 bg-primary-50 group-hover:bg-primary-100/50">
                                            {formatCurrency(p.stockCurrent * p.cost)}
                                        </td>
                                    )}
                                    {isAdmin && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingProduct(p);
                                                        setIsCreating(false);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.sku)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Edit/Create Modal */}
                {editingProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-primary-600 text-white">
                                <h3 className="text-lg font-bold">
                                    {isCreating ? 'Nuevo Producto' : `Editar Producto: ${editingProduct.sku}`}
                                </h3>
                                <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-white/20 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSave} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">SKU</label>
                                        <input
                                            type="text"
                                            value={editingProduct.sku}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                                            className={`w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 ${!isCreating ? 'bg-slate-100' : ''}`}
                                            required
                                            disabled={!isCreating}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Nombre</label>
                                        <input
                                            type="text"
                                            value={editingProduct.name}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Categoría</label>
                                        <input
                                            type="text"
                                            value={editingProduct.category}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Unidad de Medida</label>
                                        <input
                                            type="text"
                                            value={editingProduct.unit || ''}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                                            placeholder="Litro, Galón, Pieza..."
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Stock {isCreating ? 'Inicial' : 'Actual'}</label>
                                        <input
                                            type="number"
                                            value={editingProduct.stockCurrent}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setEditingProduct({ ...editingProduct, stockCurrent: val, stockInitial: isCreating ? val : editingProduct.stockInitial });
                                            }}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Costo</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingProduct.cost}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, cost: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Precio Menudeo</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingProduct.priceRetail}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, priceRetail: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Precio Medio</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingProduct.priceMedium}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, priceMedium: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Precio Mayoreo</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingProduct.priceWholesale}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, priceWholesale: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setEditingProduct(null)}
                                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 shadow-lg shadow-primary-500/30"
                                    >
                                        Guardar Cambios
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

