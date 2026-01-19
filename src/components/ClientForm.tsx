import React, { useState, useEffect } from 'react';
import { Loader, MapPin } from 'lucide-react';
import { Client } from '../types';

interface ClientFormProps {
    initialData?: Client | null;
    onSubmit: (data: Omit<Client, 'id'>) => void;
    onCancel: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Omit<Client, 'id'>>({
        name: '',
        rfc: '',
        email: '',
        phone: '',
        address: '',
        zipCode: '',
        colonia: '',
        city: '',
        state: ''
    });

    const [availableColonias, setAvailableColonias] = useState<string[]>([]);
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [isLoadingZip, setIsLoadingZip] = useState(false);

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length === 0) return '';
        if (numbers.length <= 3) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    useEffect(() => {
        if (initialData) {
            const { id, ...rest } = initialData;
            setFormData(rest);
        } else {
            // Fetch geo city on first mount for new clients
            const fetchGeoCity = async () => {
                try {
                    const response = await fetch('https://ipapi.co/json/');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.city) {
                            setFormData(prev => ({ ...prev, city: data.city.toUpperCase() }));
                        }
                    }
                } catch (error) {
                    console.log("Geolocation failed, skipping default city.");
                }
            };
            fetchGeoCity();
        }
    }, [initialData]);

    const handleZipLookup = async (zip: string) => {
        if (zip.length !== 5) return;

        setIsLoadingZip(true);
        try {
            // Using Copomex (common for Mexico) with prueba token
            const response = await fetch(`https://api.copomex.com/query/info_cp/${zip}?token=prueba`);
            if (response.ok) {
                const data = await response.json();

                // Copomex returns an array of objects for each CP info if using search, 
                // but info_cp usually returns one object with 'response' as array of colonias? 
                // Let's check Copomex structure: 
                // {"error":false,"code":200,"message":"OK","response":{...}} 
                // Actually it depends on the endpoint. 
                // Let's use a more predictable mapping or fallback.

                if (data.response) {
                    const info = data.response;
                    const items = Array.isArray(info) ? info : [info];

                    const coloniasRaw = items.map((i: any) => i.asentamiento);
                    const uniqueColonias = Array.from(new Set(coloniasRaw)).map(c => String(c).toUpperCase());

                    const citiesRaw = items.map((i: any) => i.municipio);
                    const uniqueCities = Array.from(new Set(citiesRaw)).map(c => String(c).toUpperCase());

                    setAvailableColonias(uniqueColonias);
                    setAvailableCities(uniqueCities);

                    const first = items[0];
                    setFormData(prev => ({
                        ...prev,
                        state: String(first.estado).toUpperCase(),
                        city: uniqueCities.length === 1 ? uniqueCities[0] : prev.city,
                        colonia: uniqueColonias.length === 1 ? uniqueColonias[0] : ''
                    }));
                }
            } else {
                // Fallback to Zippopotam if Copomex fails
                const zipResponse = await fetch(`https://api.zippopotam.us/mx/${zip}`);
                if (zipResponse.ok) {
                    const data = await zipResponse.json();
                    const places = data.places || [];
                    const colonias = places.map((p: any) => p['place name'].toUpperCase());
                    const uniqueColonias = Array.from(new Set(colonias)) as string[];

                    setAvailableColonias(uniqueColonias);

                    if (places.length > 0) {
                        const first = places[0];
                        setFormData(prev => ({
                            ...prev,
                            state: String(first['state']).toUpperCase(),
                            // Zippopotam MX doesn't give municipio clearly, leave city as is or blank
                            colonia: uniqueColonias.length === 1 ? uniqueColonias[0] : ''
                        }));
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching ZIP data", error);
        } finally {
            setIsLoadingZip(false);
        }
    };

    const handleChange = (field: keyof Omit<Client, 'id'>, value: string) => {
        let finalValue = value;

        // Phone Mask
        if (field === 'phone') {
            finalValue = formatPhone(value);
        } else {
            // Uppercase enforcement for specific fields
            const upperFields = ['name', 'address', 'colonia', 'city', 'state', 'rfc'];
            if (upperFields.includes(field)) {
                finalValue = value.toUpperCase();
            }
        }

        setFormData(prev => ({ ...prev, [field]: finalValue }));

        if (field === 'zipCode' && value.length === 5) {
            handleZipLookup(value);
        }
    };

    const submitHandler = (e: React.FormEvent) => {
        e.preventDefault();

        // Defaults if missing
        const submissionData = {
            ...formData,
            rfc: formData.rfc.trim() || 'XAXX010101000',
            name: formData.name.trim() || 'PÚBLICO GENERAL',
            address: formData.address.trim() || 'CIUDAD',
        };

        onSubmit(submissionData);
    };

    return (
        <form onSubmit={submitHandler} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Razón Social *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 uppercase"
                        placeholder="NOMBRE COMPLETO"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RFC</label>
                    <input
                        type="text"
                        value={formData.rfc}
                        onChange={(e) => handleChange('rfc', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase"
                        placeholder="XAXX010101000"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        placeholder="(###) ###-####"
                        maxLength={14}
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        placeholder="cliente@empresa.com"
                    />
                </div>

                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        Dirección
                    </h3>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Código Postal *</label>
                    <div className="relative">
                        <input
                            type="text"
                            required
                            maxLength={5}
                            value={formData.zipCode}
                            onChange={(e) => handleChange('zipCode', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder="00000"
                        />
                        {isLoadingZip && (
                            <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary-600" />
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 uppercase"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad / Municipio</label>
                    {availableCities.length > 1 ? (
                        <select
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase"
                        >
                            <option value="">SELECCIONAR CIUDAD</option>
                            {availableCities.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase"
                        />
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Colonia</label>
                    {availableColonias.length > 0 ? (
                        <select
                            value={formData.colonia}
                            onChange={(e) => handleChange('colonia', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase"
                        >
                            <option value="">SELECCIONAR COLONIA</option>
                            {availableColonias.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={formData.colonia}
                            onChange={(e) => handleChange('colonia', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase"
                        />
                    )}
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Calle y Número</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase"
                        placeholder="AV. REFORMA 123"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 font-medium">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-lg shadow-primary-500/30"
                >
                    Guardar Cliente
                </button>
            </div>
        </form>
    );
};
