import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { THEMES } from '../lib/themes';
import { Upload, Check, RefreshCw, DollarSign, Gift } from 'lucide-react';

export default function Settings() {
    const settings = useStore((state) => state.settings);
    const setTheme = useStore((state) => state.setTheme);
    const setLogo = useStore((state) => state.setLogo);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert('El archivo es demasiado grande. Máximo 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setLogo(result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setLogo(''); // Empty string removes it
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h1>
                    <p className="text-slate-500">Personaliza la apariencia y preferencias de la aplicación.</p>
                </div>

                {/* Company Info Section */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary-600" />
                        Información de la Empresa
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre de la Empresa</label>
                            <input
                                type="text"
                                value={settings.companyName}
                                onChange={(e) => useStore.getState().updateSettings({ companyName: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Razón Social</label>
                            <input
                                type="text"
                                value={settings.razonSocial || ''}
                                onChange={(e) => useStore.getState().updateSettings({ razonSocial: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RFC</label>
                            <input
                                type="text"
                                value={settings.rfc || ''}
                                onChange={(e) => useStore.getState().updateSettings({ rfc: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-uppercase"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2 lg:col-span-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dirección (Calle y Número)</label>
                            <input
                                type="text"
                                value={settings.address || ''}
                                onChange={(e) => useStore.getState().updateSettings({ address: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código Postal</label>
                            <input
                                type="text"
                                value={settings.zipCode || ''}
                                onChange={(e) => useStore.getState().updateSettings({ zipCode: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Colonia</label>
                            <input
                                type="text"
                                value={settings.colonia || ''}
                                onChange={(e) => useStore.getState().updateSettings({ colonia: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ciudad / Municipio</label>
                            <input
                                type="text"
                                value={settings.city || ''}
                                onChange={(e) => useStore.getState().updateSettings({ city: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</label>
                            <input
                                type="text"
                                value={settings.state || ''}
                                onChange={(e) => useStore.getState().updateSettings({ state: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">País</label>
                            <input
                                type="text"
                                value={settings.country || 'México'}
                                onChange={(e) => useStore.getState().updateSettings({ country: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teléfono de la Empresa</label>
                            <input
                                type="text"
                                value={settings.phone || ''}
                                onChange={(e) => useStore.getState().updateSettings({ phone: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <hr className="my-8 border-slate-100" />

                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Logotipo de la Empresa</h3>
                            <p className="text-sm text-slate-600">
                                Sube el logo de tu empresa. Se mostrará en la barra lateral y reportes.
                                Recomendamos una imagen **PNG con fondo transparente** de **512x512 píxeles**.
                                Tamaño máximo permitido: **2MB**.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Seleccionar Imagen
                                </button>
                                {settings.logo && (
                                    <button
                                        onClick={handleRemoveLogo}
                                        className="px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        Eliminar Logo
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                        </div>

                        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center w-full max-w-xs h-32">
                            {settings.logo ? (
                                <img src={settings.logo} alt="Logo Preview" className="max-h-24 max-w-full object-contain" />
                            ) : (
                                <span className="text-slate-400 text-sm">Sin logo personalizado</span>
                            )}
                        </div>
                    </div>
                </section>

                {/* Theme Section */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-primary-600" />
                        Tema de Color
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {THEMES.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => setTheme(theme.id)}
                                className={`
                                    relative p-4 rounded-xl border-2 text-left transition-all hover:scale-105
                                    ${settings.themeId === theme.id
                                        ? 'border-primary-600 ring-2 ring-primary-100'
                                        : 'border-slate-100 hover:border-slate-300'}
                                `}
                            >
                                <div className="space-y-3">
                                    <div className="flex gap-1 h-8">
                                        <div className="flex-1 rounded-l-md" style={{ backgroundColor: theme.colors[500] }}></div>
                                        <div className="flex-1" style={{ backgroundColor: theme.colors[400] }}></div>
                                        <div className="flex-1 rounded-r-md" style={{ backgroundColor: theme.colors[300] }}></div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm font-medium ${settings.themeId === theme.id ? 'text-primary-700' : 'text-slate-700'}`}>
                                            {theme.name}
                                        </span>
                                        {settings.themeId === theme.id && (
                                            <div className="bg-primary-600 text-white p-1 rounded-full">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>



                {/* Loyalty Section */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary-600" />
                        Monedero Electrónico
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Configura el porcentaje de compra que se abonará al monedero del cliente.
                    </p>

                    <div className="max-w-md p-4 bg-primary-50 rounded-xl border border-primary-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-slate-700">Porcentaje de Bonificación</label>
                            <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-[10px] font-black uppercase">LOYALTY</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={settings.loyaltyPercentage || 0}
                                onChange={(e) => useStore.getState().updateSettings({ loyaltyPercentage: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <span className="text-lg font-bold text-slate-400">%</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 italic">
                            Ejemplo: Si pones 5%, por cada $100 de compra el cliente recibe $5 en su monedero. Pon 0 para desactivar.
                        </p>
                    </div>
                </section>

                {/* Price Thresholds Section */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary-600" />
                        Configuración de Precios (Mayoreo)
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Define las cantidades mínimas necesarias para que el sistema aplique automáticamente los precios de Medio Mayoreo y Mayoreo.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-slate-700">Umbral Medio Mayoreo</label>
                                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-[10px] font-black uppercase">MEDIO</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    value={settings.priceThresholds?.medium || 6}
                                    onChange={(e) => useStore.getState().updateSettings({
                                        priceThresholds: {
                                            ...(settings.priceThresholds || { medium: 6, wholesale: 12 }),
                                            medium: parseInt(e.target.value) || 0
                                        }
                                    })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                                <span className="text-sm text-slate-500 font-medium whitespace-nowrap">piezas o más</span>
                            </div>
                            <p className="text-[11px] text-slate-400 italic">
                                Ejemplo: Si pones 6, de 6 a 11 piezas se cobrará precio Medio.
                            </p>
                        </div>

                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-slate-700">Umbral Mayoreo Total</label>
                                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-[10px] font-black uppercase">MAYOREO</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    value={settings.priceThresholds?.wholesale || 12}
                                    onChange={(e) => useStore.getState().updateSettings({
                                        priceThresholds: {
                                            ...(settings.priceThresholds || { medium: 6, wholesale: 12 }),
                                            wholesale: parseInt(e.target.value) || 0
                                        }
                                    })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                                <span className="text-sm text-slate-500 font-medium whitespace-nowrap">piezas o más</span>
                            </div>
                            <p className="text-[11px] text-slate-400 italic">
                                Ejemplo: Si pones 12, a partir de 12 piezas se cobrará precio Mayoreo.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </Layout >
    );
}
