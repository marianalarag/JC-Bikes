import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Conectar con el endpoint de Express
        fetch('http://localhost:5000/api/products')
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error al cargar los productos:", err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header / Navigation (Simplified for Shop) */}
            <nav className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center">
                                <span className="font-bold text-xl text-gray-800 dark:text-white">JC BIKES</span>
                            </Link>
                        </div>
                        <div className="flex items-center">
                            <Link to="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium">
                                Volver a Inicio
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Shop Content Skeleton */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    
                    {/* Sidebar / Filters */}
                    <aside className="w-full md:w-64 shrink-0">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filtros</h2>
                            
                            {/* Filter Categories Dummy */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Categorías</h3>
                                    <ul className="space-y-2">
                                        <li className="flex items-center">
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span className="ml-2 text-gray-600 dark:text-gray-400">Bicicletas</span>
                                        </li>
                                        <li className="flex items-center">
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span className="ml-2 text-gray-600 dark:text-gray-400">Accesorios</span>
                                        </li>
                                        <li className="flex items-center">
                                            <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span className="ml-2 text-gray-600 dark:text-gray-400">Repuestos</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catálogo de Productos</h1>
                            <select className="border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-700 dark:text-gray-300">
                                <option>Más recientes</option>
                                <option>Precio: menor a mayor</option>
                                <option>Precio: mayor a menor</option>
                            </select>
                        </div>

                        {/* Grid Skeleton */}
                        {loading ? (
                            <p className="text-gray-500 dark:text-gray-400">Cargando productos...</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.length > 0 ? products.map((product) => (
                                    <div key={product.id || product} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
                                        <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                            <span className="text-gray-400 dark:text-gray-500">Imagen del producto</span>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{product.name || `Producto Ejemplo ${product}`}</h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex-1">
                                                Breve descripción del producto o características principales.
                                            </p>
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">${product.price || '99.99'}</span>
                                                <button className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                                                    Añadir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-gray-500 dark:text-gray-400">No hay productos disponibles.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
