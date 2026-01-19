import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Layout } from '../components/Layout';
import { User, UserRole } from '../types';
import { Plus, Trash2, Edit2, Shield, User as UserIcon, Camera, Check } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function Users() {
    const users = useStore((state) => state.users);
    const addUser = useStore((state) => state.addUser);
    const updateUser = useStore((state) => state.updateUser);
    const deleteUser = useStore((state) => state.deleteUser);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [tempAvatar, setTempAvatar] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        role: 'seller',
        startDate: new Date().toISOString().split('T')[0]
    });

    const resetForm = () => {
        setFormData({
            name: '',
            username: '',
            password: '',
            email: '',
            phone: '',
            role: 'seller',
            startDate: new Date().toISOString().split('T')[0]
        });
        setEditingUser(null);
    };

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData(user);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingUser) {
            updateUser(editingUser.id, formData);
        } else {
            // Ensure no ID collision from formData if it somehow exists
            const { id: _, ...rest } = formData as any;
            addUser({
                id: crypto.randomUUID(),
                ...rest,
                active: true
            } as User);
        }
        setIsModalOpen(false);
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            deleteUser(id);
        }
    };

    const handleOpenAvatarModal = (user: User) => {
        setEditingUser(user);
        setTempAvatar(user.avatar || null);
        setIsAvatarModalOpen(true);
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setTempAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveAvatar = () => {
        if (editingUser && tempAvatar) {
            updateUser(editingUser.id, { avatar: tempAvatar });
            setIsAvatarModalOpen(false);
            setEditingUser(null);
            setTempAvatar(null);
        }
    };

    const calculateTenure = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 365) {
            return `${diffDays} días`;
        }

        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = (diffDays % 365) % 30;

        return `${years} años, ${months} meses, ${days} días`;
    };

    return (
        <Layout>
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col">
                <div className="flex-none pb-4 bg-slate-50 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Nuevo Usuario</span>
                    </button>
                </div>

                <div className="min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50 max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-8rem)]">
                    <table className="w-full text-left text-sm min-w-[1000px] border-separate border-spacing-0">
                        <thead className="bg-primary-600 text-white font-medium sticky top-0 z-20 shadow-md">
                            <tr>
                                <th className="px-6 py-4 w-20 border-b border-primary-700">Avatar</th>
                                <th className="px-6 py-4 min-w-[200px] border-b border-primary-700">Nombre</th>
                                <th className="px-6 py-4 min-w-[120px] border-b border-primary-700">Usuario</th>
                                <th className="px-6 py-4 min-w-[140px] border-b border-primary-700">Rol</th>
                                <th className="px-6 py-4 min-w-[180px] border-b border-primary-700">Contacto</th>
                                <th className="px-6 py-4 min-w-[120px] border-b border-primary-700">Ingreso</th>
                                <th className="px-6 py-4 min-w-[150px] border-b border-primary-700">Antigüedad</th>
                                <th className="px-6 py-4 text-center border-b border-primary-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="relative group/avatar">
                                            {u.avatar ? (
                                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                                                    <UserIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleOpenAvatarModal(u)}
                                                className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity"
                                                title="Cambiar Foto"
                                            >
                                                <Camera className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{u.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                            {u.role === 'admin' ? 'Administrador' : 'Vendedor'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        <div>{u.email || '-'}</div>
                                        <div>{u.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {formatDate(u.startDate || new Date().toISOString()).split(',')[0]}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-medium text-xs">
                                        {calculateTenure(u.startDate || new Date().toISOString())}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(u)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    &times;
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario (Login)</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                                        <input
                                            type="text" // Visible for admin convenience as requested
                                            required={!editingUser}
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder={editingUser ? "Sin cambios" : ""}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="seller">Vendedor</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Ingreso</label>
                                    <input
                                        type="date"
                                        value={formData.startDate ? formData.startDate.split('T')[0] : ''}
                                        onChange={e => {
                                            // Prevent UTC shift by creating a local ISO string at noon
                                            const dateStr = e.target.value; // YYYY-MM-DD
                                            const localISO = `${dateStr}T12:00:00`;
                                            setFormData({ ...formData, startDate: localISO });
                                        }}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* Avatar Modal */}
                {isAvatarModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 text-center">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Foto de Perfil</h3>
                                <p className="text-sm text-slate-500 mb-6">Sube una imagen para identificar al usuario {editingUser?.name}.</p>

                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-32 h-32 rounded-full border-4 border-primary-50 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner">
                                        {tempAvatar ? (
                                            <img src={tempAvatar} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-12 h-12 text-slate-300" />
                                        )}
                                    </div>

                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={() => avatarInputRef.current?.click()}
                                            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Camera className="w-4 h-4" />
                                            BUSCAR
                                        </button>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarUpload}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsAvatarModalOpen(false);
                                        setTempAvatar(null);
                                        setEditingUser(null);
                                    }}
                                    className="flex-1 px-4 py-3 text-slate-600 font-bold hover:text-slate-800 transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleSaveAvatar}
                                    disabled={!tempAvatar}
                                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-black hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" />
                                    APLICAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
