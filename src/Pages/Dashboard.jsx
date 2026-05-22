import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    
    // Obtener los datos del usuario logueado para mostrar su nombre
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        // Borrar datos de sesión
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirigir al inicio o login
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel Maestro</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Bienvenido, {user.name || 'Administrador'}</p>
                    </div>
                    
                    <button onClick={handleLogout} 
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">
                        Cerrar Sesión
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Gestión de Inventario</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Próximamente: Aquí podrás agregar, editar y eliminar bicicletas o accesorios de la base de datos PostgreSQL.
                    </p>
                </div>
            </div>
        </div>
    );
}