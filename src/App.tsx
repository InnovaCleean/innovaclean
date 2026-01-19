import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import History from './pages/History';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Clients from './pages/Clients';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useStore } from './store/useStore';
import { useEffect } from 'react';

function App() {
    const fetchInitialData = useStore(state => state.fetchInitialData);
    const settings = useStore(state => state.settings);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (settings.companyName) {
            document.title = settings.companyName;
        }
        if (settings.logo) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'shortcut icon';
                document.head.appendChild(link);
            }
            link.href = settings.logo;
        }
    }, [settings.companyName, settings.logo]);

    return (

        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/dashboard" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                <Route path="/purchases" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Purchases />
                    </ProtectedRoute>
                } />

                <Route path="/users" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Users />
                    </ProtectedRoute>
                } />

                <Route path="/reports" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Reports />
                    </ProtectedRoute>
                } />

                <Route path="/clients" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Clients />
                    </ProtectedRoute>
                } />

                <Route path="/settings" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <Settings />
                    </ProtectedRoute>
                } />

                <Route path="/sales" element={
                    <ProtectedRoute allowedRoles={['admin', 'seller']}>
                        <Sales />
                    </ProtectedRoute>
                } />

                <Route path="/history" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <History />
                    </ProtectedRoute>
                } />

                <Route path="/inventory" element={
                    <ProtectedRoute allowedRoles={['admin', 'seller']}>
                        <Inventory />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
