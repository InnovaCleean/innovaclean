import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { Search, AlertTriangle, PlusCircle, Trash2, Eye, X, Printer, Share2, Mail, DollarSign, FileText } from 'lucide-react';
import { formatCurrency, formatDate, getCDMXDate, getCDMXISOString, getCDMXDateFromISO, parseCDMXDate } from '../lib/utils';
import { Sale, Client, PaymentMethod } from '../types';
import { ClientForm } from '../components/ClientForm';
import { jsPDF } from 'jspdf';

export default function Sales() {
    const products = useStore((state) => state.products);
    const sales = useStore((state) => state.sales);
    const user = useStore((state) => state.user);
    const isAdmin = user?.role === 'admin';
    const settings = useStore((state) => state.settings);
    const clients = useStore((state) => state.clients);
    const addSalesBatch = useStore((state) => state.addSalesBatch);
    const cancelSaleByFolio = useStore((state) => state.cancelSaleByFolio);
    const updateFolioDate = useStore((state) => state.updateFolioDate);
    const addClient = useStore((state) => state.addClient); // Need to add client

    const [cart, setCart] = useState<Sale[]>([]);
    const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductSku, setSelectedProductSku] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);

    // Derived state for selected product to ensure fresh stock data
    const selectedProduct = useMemo(() => {
        return products.find(p => p.sku === selectedProductSku) || null;
    }, [products, selectedProductSku]);

    const [correctionMode, setCorrectionMode] = useState(false);
    const [correctionNote, setCorrectionNote] = useState('');

    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState('general');
    const [historyClientFilter, setHistoryClientFilter] = useState('all');
    const [startDate, setStartDate] = useState(getCDMXDate());
    const [endDate, setEndDate] = useState(getCDMXDate());

    const [currentPriceType, setCurrentPriceType] = useState<'retail' | 'medium' | 'wholesale'>('retail');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

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

        setSelectedProductSku(null);
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

    const loyaltyTransactions = useStore((state) => state.loyaltyTransactions);

    const walletBalance = useMemo(() => {
        if (!selectedClient || selectedClient === 'general') return 0;
        return loyaltyTransactions
            .filter(t => t.clientId === selectedClient)
            .reduce((acc, t) => acc + t.amount, 0); // Amount is + for earn, - for redeem
    }, [selectedClient, loyaltyTransactions]);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentSplits, setPaymentSplits] = useState<Record<string, number>>({});

    const handleSplitChange = (method: string, amount: number) => {
        if (amount < 0) amount = 0;
        if (method === 'wallet' && amount > walletBalance) {
            amount = walletBalance;
        }
        setPaymentSplits(prev => ({ ...prev, [method]: amount }));
    };

    const handleConfirmSale = () => {
        if (cart.length === 0) return;

        const currentClient = clients.find(c => c.id === selectedClient);

        // Security Check: Validate Wallet Status for Redemption
        const isWalletBlocked = !currentClient?.walletStatus || currentClient.walletStatus !== 'active';

        if (paymentMethod === 'wallet') {
            if (isWalletBlocked) {
                alert(`El monedero de ${currentClient?.name} está marcando como ${currentClient?.walletStatus === 'pending' ? 'PENDIENTE' : 'INACTIVO'}. Solo puede acumular puntos, no usarlos para pagar.`);
                return;
            }
            if (walletBalance < cartTotal) {
                const useWallet = confirm(`Saldo insuficiente en monedero (${formatCurrency(walletBalance)}). ¿Deseas usar todo el saldo y pagar el resto con otro método?`);
                if (useWallet) {
                    setPaymentMethod('multiple');
                    setPaymentSplits({
                        wallet: walletBalance,
                        cash: cartTotal - walletBalance
                    });
                    setIsPaymentModalOpen(true);
                    return;
                } else {
                    return;
                }
            }
        }

        if (paymentMethod === 'multiple') {
            // Note: Multiple payment confirmation is handled in handleConfirmSplitPayment
            // We only initialize the modal here.

            // However, if we are switching TO multiple from the wallet shortage logic above, 
            // the check inside handleConfirmSplitPayment will catch it.
            // But if user selected "Multiple" directly, we enter here.
            setPaymentSplits({ cash: cartTotal }); // Default init
            setIsPaymentModalOpen(true);
            return;
        }

        const finalizedCart = cart.map(item => ({
            ...item,
            clientId: selectedClient,
            clientName: currentClient?.name || 'PÚBLICO GENERAL',
            paymentMethod: paymentMethod,
            paymentDetails: undefined // Simple payment
        }));

        addSalesBatch(finalizedCart);
        setCart([]);
        setCorrectionMode(false);
        setCorrectionNote('');
        setPaymentMethod('cash');
    };

    const handleConfirmSplitPayment = () => {
        const totalSplits = Object.values(paymentSplits).reduce((a, b) => a + b, 0);
        if (Math.abs(totalSplits - cartTotal) > 0.01) return;

        const currentClient = clients.find(c => c.id === selectedClient);

        // Security Check: Validate Wallet Status if trying to use wallet balance
        if (paymentSplits['wallet'] > 0) {
            const isWalletBlocked = !currentClient?.walletStatus || currentClient.walletStatus !== 'active';
            if (isWalletBlocked) {
                alert(`El monedero de ${currentClient?.name} está marcando como ${currentClient?.walletStatus === 'pending' ? 'PENDIENTE' : 'INACTIVO'}. No se puede redimir saldo aún.`);
                return;
            }
        }

        // Clean up zero entries
        const cleanSplits: Record<string, number> = {};
        Object.entries(paymentSplits).forEach(([k, v]) => {
            if (v > 0) cleanSplits[k] = v;
        });

        const finalizedCart = cart.map(item => ({
            ...item,
            clientId: selectedClient,
            clientName: currentClient?.name || 'PÚBLICO GENERAL',
            paymentMethod: 'multiple' as PaymentMethod,
            paymentDetails: cleanSplits
        }));

        addSalesBatch(finalizedCart);
        setIsPaymentModalOpen(false);
        setCart([]);
        setCorrectionMode(false);
        setCorrectionNote('');
        setPaymentMethod('cash');
    };

    // ...



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
            paymentMethod?: string;
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
                    isCorrection: false,
                    paymentMethod: s.paymentMethod
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
            cancelSaleByFolio(folio, reason);
            setIsDetailModalOpen(false);
        }
    };

    const generateTicketText = (sale: typeof activeFolioData) => {
        if (!sale) return '';
        let text = `*TICKET DE VENTA*\nFolio: ${sale.folio}\nFecha: ${formatDate(sale.date)}\nCliente: ${sale.clientName}\n\n`;
        sale.items.forEach(item => {
            text += `${item.quantity} ${item.unit || 'pz'} - ${item.productName || item.sku}\n$${item.priceUnit} x ${item.quantity} = $${item.amount}\n`;
        });
        text += `\n*TOTAL: ${formatCurrency(sale.amount)}*\n\nGracias por su compra.`;
        return encodeURIComponent(text);
    };

    const handlePrintTicket = () => {
        if (!activeFolioData) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsHtml = activeFolioData.items.map(item => `
            <tr>
                <td>${item.quantity}</td>
                <td>${item.productName || item.sku}</td>
                <td style="text-align: right">$${item.priceUnit}</td>
                <td style="text-align: right">$${item.amount}</td>
            </tr>
        `).join('');

        const html = `
            <html>
            <head>
                <style>
                    body { font-family: monospace; font-size: 12px; max-width: 300px; margin: 0 auto; color: black; }
                    .header { text-align: center; margin-bottom: 10px; }
                    .header h1 { margin: 0; font-size: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                    th, td { text-align: left; padding: 2px 0; }
                    .total { text-align: right; font-weight: bold; font-size: 14px; margin-top: 5px; border-top: 1px dashed black; pt-2; }
                    .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${settings.companyName}</h1>
                    <p>Folio: ${activeFolioData.folio}<br>${formatDate(activeFolioData.date)}</p>
                </div>
                <table>
                    <thead><tr><th>Cant</th><th>Prod</th><th>P.U</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="total">
                    TOTAL: ${formatCurrency(activeFolioData.amount)}
                </div>
                <div class="footer">
                    <p>¡Gracias por su preferencia!</p>
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleShareWhatsapp = () => {
        if (!activeFolioData) return;
        // Generic message, user attaches PDF
        const text = encodeURIComponent(`Hola, le envío su ticket de compra Folio: ${activeFolioData.folio} de ${settings.companyName}.`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleShareEmail = () => {
        if (!activeFolioData) return;
        const text = generateTicketText(activeFolioData);
        window.open(`mailto:?subject=Ticket de Venta ${activeFolioData.folio}&body=${text}`, '_blank');
    };

    const handleGeneratePDFTicket = () => {
        if (!activeFolioData) return;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 200] // Small Receipt Format approx
        });

        const startY = 10;
        let y = startY;
        const centerX = 40;

        // Header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.companyName || 'INNOVA CLEAN', centerX, y, { align: 'center' });
        y += 5;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (settings.address) {
            doc.text(settings.address, centerX, y, { align: 'center', maxWidth: 70 });
            y += 4 + (settings.address.length > 30 ? 4 : 0);
        }
        if (settings.phone) {
            doc.text(`Tel: ${settings.phone}`, centerX, y, { align: 'center' });
            y += 4;
        }
        y += 2;
        doc.text('------------------------------------------------', centerX, y, { align: 'center' });
        y += 4;

        // Info
        doc.setFont('helvetica', 'bold');
        doc.text(`FOLIO: ${activeFolioData.folio}`, centerX, y, { align: 'center' });
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${formatDate(activeFolioData.date)}`, centerX, y, { align: 'center' });
        y += 4;
        if (activeFolioData.clientName) {
            doc.text(`Cliente: ${activeFolioData.clientName}`, centerX, y, { align: 'center', maxWidth: 70 });
            y += 4 + (activeFolioData.clientName.length > 25 ? 4 : 0);
        }

        y += 2;
        doc.text('------------------------------------------------', centerX, y, { align: 'center' });
        y += 4;

        // Items
        doc.setFontSize(7);
        doc.text('CANT  DESCRIPCION           IMPORTE', 5, y);
        y += 4;

        activeFolioData.items.forEach(item => {
            const p = products.find(prod => prod.sku === item.sku);
            const name = (p?.name || item.sku).substring(0, 18);
            const qty = item.quantity.toString().padEnd(4);
            const total = formatCurrency(item.amount);

            doc.text(`${qty} ${name}`, 5, y);
            doc.text(total, 75, y, { align: 'right' });
            y += 4;
        });

        y += 2;
        doc.text('------------------------------------------------', centerX, y, { align: 'center' });
        y += 4;

        // Totals
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL: ${formatCurrency(activeFolioData.amount)}`, 75, y, { align: 'right' });
        y += 6;

        // Payment Method
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const method = activeFolioData.items[0]?.paymentMethod || 'cash';
        const methodMap: Record<string, string> = {
            'cash': 'EFECTIVO',
            'card_credit': 'TARJETA CREDITO',
            'card_debit': 'TARJETA DEBITO',
            'transfer': 'TRANSFERENCIA',
            'wallet': 'MONEDERO',
            'multiple': 'MIXTO'
        };

        if (method === 'multiple' && activeFolioData.items[0]?.paymentDetails) {
            doc.text('PAGO MIXTO:', 5, y);
            y += 4;
            Object.entries(activeFolioData.items[0].paymentDetails).forEach(([m, amt]) => {
                doc.text(`- ${methodMap[m] || m}: ${formatCurrency(amt as number)}`, 5, y);
                y += 4;
            });
        } else {
            doc.text(`MÉTODO DE PAGO: ${methodMap[method] || method}`, 5, y);
        }

        y += 10;
        doc.setFontSize(7);
        doc.text('¡GRACIAS POR SU COMPRA!', centerX, y, { align: 'center' });

        doc.save(`Ticket_Folio_${activeFolioData.folio}.pdf`);
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
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                                    <span>Cliente</span>
                                    {selectedClient !== 'general' && (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${walletBalance > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                                            Monedero: {formatCurrency(walletBalance)}
                                        </span>
                                    )}
                                </label>
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
                                            if (!e.target.value) setSelectedProductSku(null);
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
                                                    setSelectedProductSku(p.sku);
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
                                            setSelectedProductSku(null);
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

                            {/* Payment Method Selector */}
                            <div className="py-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método de Pago</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium"
                                >
                                    <option value="cash">EFECTIVO</option>
                                    <option value="card_debit">TARJETA DEBITO</option>
                                    <option value="card_credit">TARJETA CREDITO</option>
                                    <option value="transfer">TRANSFERENCIA</option>
                                    <option value="wallet">MONEDERO</option>
                                    <option value="multiple">MIXTO</option>
                                </select>
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

                {/* Payment Split Modal */}
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-primary-600 text-white">
                                <h3 className="text-lg font-bold">Pago Múltiple</h3>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="text-center mb-4">
                                    <div className="text-sm text-slate-500">Total a Pagar</div>
                                    <div className="text-3xl font-black text-slate-800">{formatCurrency(cartTotal)}</div>
                                </div>

                                <div className="space-y-3">
                                    {/* Wallet Row */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 text-sm font-bold text-slate-600 uppercase">Monedero</div>
                                        <input
                                            type="number"
                                            value={paymentSplits.wallet || ''}
                                            onChange={e => handleSplitChange('wallet', Number(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder={`Max: ${formatCurrency(walletBalance)}`}
                                        />
                                    </div>
                                    {/* Cash Row */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 text-sm font-bold text-slate-600 uppercase">Efectivo</div>
                                        <input
                                            type="number"
                                            value={paymentSplits.cash || ''}
                                            onChange={e => handleSplitChange('cash', Number(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    {/* Card Credit Row */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 text-sm font-medium text-slate-600">T. Crédito</div>
                                        <input
                                            type="number"
                                            value={paymentSplits.card_credit || ''}
                                            onChange={e => handleSplitChange('card_credit', Number(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    {/* Card Debit Row */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 text-sm font-medium text-slate-600">T. Débito</div>
                                        <input
                                            type="number"
                                            value={paymentSplits.card_debit || ''}
                                            onChange={e => handleSplitChange('card_debit', Number(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    {/* Transfer Row */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 text-sm font-medium text-slate-600">Transferencia</div>
                                        <input
                                            type="number"
                                            value={paymentSplits.transfer || ''}
                                            onChange={e => handleSplitChange('transfer', Number(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-slate-600">Total Cubierto:</span>
                                        <span className={`font-bold ${Math.abs(Object.values(paymentSplits).reduce((a, b) => a + b, 0) - cartTotal) < 0.01 ? 'text-emerald-600' : 'text-orange-500'}`}>
                                            {formatCurrency(Object.values(paymentSplits).reduce((a, b) => a + b, 0))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-medium text-slate-600">Restante:</span>
                                        <span className="font-bold text-slate-800">
                                            {formatCurrency(cartTotal - Object.values(paymentSplits).reduce((a, b) => a + b, 0))}
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleConfirmSplitPayment}
                                        disabled={Math.abs(Object.values(paymentSplits).reduce((a, b) => a + b, 0) - cartTotal) > 0.01}
                                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg"
                                    >
                                        Registrar Venta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


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
                                    <th className="px-6 py-3">Método</th>
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
                                            <td className="px-6 py-4 text-slate-600 text-xs uppercase font-bold">
                                                {group.paymentMethod === 'multiple' ? 'MIXTO' :
                                                    group.paymentMethod === 'cash' ? 'EFECTIVO' :
                                                        (group.paymentMethod === 'card' || group.paymentMethod === 'card_credit') ? 'TARJETA CREDITO' :
                                                            group.paymentMethod === 'card_debit' ? 'TARJETA DEBITO' :
                                                                group.paymentMethod === 'transfer' ? 'TRANSFERENCIA' :
                                                                    group.paymentMethod === 'wallet' ? 'MONEDERO' : group.paymentMethod}
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
            {
                isClientModalOpen && (
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
                )
            }

            {/* Detail Modal */}
            {
                isDetailModalOpen && activeFolioData && (
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
                                <table className="w-full text-left text-sm mb-6">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Payment Details - Bottom Left - Styled like Theme */}
                                    {activeFolioData.items[0]?.paymentMethod && (
                                        <div className={`p-4 rounded-lg border flex flex-col gap-2 ${activeFolioData.items[0].paymentMethod === 'multiple' ? 'bg-primary-50 border-primary-100' : 'bg-slate-50 border-slate-200'}`}>
                                            <h4 className={`text-sm font-bold flex items-center gap-2 uppercase ${activeFolioData.items[0].paymentMethod === 'multiple' ? 'text-primary-800' : 'text-slate-700'}`}>
                                                <DollarSign className="w-4 h-4" />
                                                Método de Pago: {activeFolioData.items[0].paymentMethod === 'multiple' ? 'Mixto' :
                                                    activeFolioData.items[0].paymentMethod === 'cash' ? 'Efectivo' :
                                                        (activeFolioData.items[0].paymentMethod === 'card_credit' || activeFolioData.items[0].paymentMethod === 'card_debit' || activeFolioData.items[0].paymentMethod === 'card') ? 'Tarjeta' :
                                                            activeFolioData.items[0].paymentMethod === 'transfer' ? 'Transferencia' :
                                                                activeFolioData.items[0].paymentMethod === 'wallet' ? 'Monedero' : activeFolioData.items[0].paymentMethod}
                                            </h4>

                                            {activeFolioData.items[0].paymentMethod === 'multiple' && activeFolioData.items[0].paymentDetails && (
                                                <div className="space-y-1 mt-1">
                                                    {Object.entries(activeFolioData.items[0].paymentDetails).map(([method, amount]) => (
                                                        <div key={method} className="flex justify-between text-sm">
                                                            <span className="capitalize text-primary-700 opacity-80">{method === 'cash' ? 'Efectivo' : (method === 'card' || method === 'card_credit' || method === 'card_debit') ? 'Tarjeta' : method === 'transfer' ? 'Transf.' : method === 'wallet' ? 'Monedero' : method}:</span>
                                                            <span className="font-bold text-primary-900">{formatCurrency(amount as number)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Correction Notes - Bottom Right (or stacked) */}
                                    {activeFolioData.items.some(i => i.correctionNote) && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
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
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePrintTicket}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300"
                                        title="Imprimir Ticket"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleShareWhatsapp}
                                        className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors border border-green-300"
                                        title="Enviar por WhatsApp"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleShareEmail}
                                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors border border-blue-300"
                                        title="Enviar por Correo"
                                    >
                                        <Mail className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleGeneratePDFTicket}
                                        className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-colors border border-rose-300"
                                        title="Descargar PDF"
                                    >
                                        <FileText className="w-5 h-5" />
                                    </button>
                                </div>
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
                )
            }
        </Layout>
    );
}

function amountColor(amount: number) {
    if (amount < 0) return 'text-red-600';
    return 'text-emerald-600';
}
