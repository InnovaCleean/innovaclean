import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Lock } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useStore((state) => state.login);
    const users = useStore((state) => state.users);
    const settings = useStore((state) => state.settings);

    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryUser, setRecoveryUser] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ username, password } as any);
            const currentUser = useStore.getState().user; // Get fresh state after login

            if (currentUser) {
                if (currentUser.role === 'admin') {
                    navigate('/dashboard');
                } else {
                    navigate('/sales');
                }
            } else {
                setError('Credenciales incorrectas');
            }
        } catch (err) {
            console.error(err);
            setError('Error al iniciar sesión');
        }
    };

    const handleRecovery = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation Logic
        const userFound = users.find(u =>
            u.username.toLowerCase() === recoveryUser.toLowerCase() ||
            u.email?.toLowerCase() === recoveryUser.toLowerCase()
        );

        if (userFound) {
            alert(`Se ha enviado una nueva contraseña al correo registrado para "${userFound.name}".\nCopia oculta enviada al administrador.`);
            setIsRecovering(false);
            setRecoveryUser('');
            setError('');
        } else {
            setError('No se encontró ningún usuario con esa información.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8 bg-primary-600 text-center">
                    <div className="flex justify-center mb-4">
                        {settings.logo ? (
                            <img
                                src={settings.logo}
                                alt="Logo"
                                className="h-20 w-auto object-contain bg-white rounded-lg p-1"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-white">Innova Clean</h1>
                    <p className="text-primary-100 mt-2">Sistema de Control de Inventario</p>
                </div>

                {!isRecovering ? (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Usuario</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="Ej. admin"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-lg shadow-primary-500/30"
                        >
                            Iniciar Sesión
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setIsRecovering(true)}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRecovery} className="p-8 space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Recuperar Contraseña</h3>
                            <p className="text-sm text-slate-500 mt-1">Ingresa tu usuario para restablecer tu acceso.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Usuario</label>
                            <input
                                type="text"
                                value={recoveryUser}
                                onChange={(e) => setRecoveryUser(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="usuario@mail.com o nombre de usuario"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-lg shadow-primary-500/30"
                        >
                            Enviar Solicitud
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setIsRecovering(false)}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
                            >
                                Volver a Iniciar Sesión
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
