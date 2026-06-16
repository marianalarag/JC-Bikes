import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Dashboard() {
    const navigate = useNavigate();
    
    // Obtener los datos del usuario logueado para mostrar su nombre
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Estados para la gestión de categorías
    const [categories, setCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadCategories = async () => {
        try {
            const res = await api.get('/categories');
            setCategories(res.data);
        } catch (err) {
            console.error("Error al cargar categorías:", err);
            setError('Error al cargar las categorías desde el servidor.');
        }
    };

    useEffect(() => {
        const init = async () => {
            await Promise.resolve();
            loadCategories();
        };
        init();
    }, []);

    const handleLogout = () => {
        // Borrar datos de sesión
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirigir al login
        navigate('/login');
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newCategoryName.trim()) {
            setError('El nombre de la categoría no puede estar vacío.');
            return;
        }

        try {
            await api.post('/categories', { name: newCategoryName });
            setSuccess('Categoría creada exitosamente.');
            setNewCategoryName('');
            loadCategories();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear la categoría.');
        }
    };

    const handleStartEdit = (cat) => {
        setEditingCategoryId(cat.id);
        setEditingCategoryName(cat.name);
        setError('');
        setSuccess('');
    };

    const handleCancelEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName('');
    };

    const handleUpdateCategory = async (id) => {
        setError('');
        setSuccess('');

        if (!editingCategoryName.trim()) {
            setError('El nombre de la categoría no puede estar vacío.');
            return;
        }

        try {
            await api.put(`/categories/${id}`, { name: editingCategoryName });
            setSuccess('Categoría actualizada con éxito.');
            setEditingCategoryId(null);
            setEditingCategoryName('');
            loadCategories();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar la categoría.');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;

        setError('');
        setSuccess('');

        try {
            await api.delete(`/categories/${id}`);
            setSuccess('Categoría eliminada con éxito.');
            loadCategories();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al eliminar la categoría.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Cabecera / Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
                    <div>
                        <span className="bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            admin ({user.role})
                        </span>
                        <h1 className="text-3xl font-extrabold text-blue-900 dark:text-white mt-2">Panel Maestro</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Bienvenido de nuevo, {user.name || 'admin'}</p>
                    </div>
                    
                    <button onClick={handleLogout} 
                            className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
                        Cerrar sesión
                    </button>
                </div>

                {/* Notificaciones */}
                {error && (
                    <div className="mb-6 p-4 text-sm text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-200 border-l-4 border-red-500 rounded-r-lg">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-200 border-l-4 border-green-500 rounded-r-lg">
                        {success}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Columna: Administración de Categorías */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                        <h2 className="text-xl font-bold text-blue-900 dark:text-white mb-6">Administración de Categorías</h2>
                        
                        {/* Formulario Agregar Categoría */}
                        <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Nueva categoría (ej. Componentes, Ropa, Nutrición)"
                                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg flex items-center justify-center font-semibold text-sm transition-colors shrink-0"
                            >
                                <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Agregar
                            </button>
                        </form>

                        {/* Tabla de Categorías */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 rounded-l-lg">ID</th>
                                        <th scope="col" className="px-6 py-3">Nombre</th>
                                        <th scope="col" className="px-6 py-3 text-right rounded-r-lg">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {categories.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{cat.id}</td>
                                            <td className="px-6 py-4">
                                                {editingCategoryId === cat.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingCategoryName}
                                                        onChange={(e) => setEditingCategoryName(e.target.value)}
                                                        className="px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-350 rounded focus:ring-2 focus:ring-orange-500 text-sm text-gray-900 dark:text-white outline-none"
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{cat.name}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingCategoryId === cat.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleUpdateCategory(cat.id)}
                                                            className="p-1.5 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors"
                                                            title="Guardar"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleStartEdit(cat)}
                                                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                            title="Editar"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Columna: Gestión de Inventario */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                        <h2 className="text-xl font-bold text-blue-900 dark:text-white mb-4">Gestión de Inventario</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            Próximamente: Integración del CRUD de productos de JC Bikes vinculado a las categorías para actualizar el inventario directamente en tiempo real.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}