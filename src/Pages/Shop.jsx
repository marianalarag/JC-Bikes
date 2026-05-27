import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeCategoryId = searchParams.get('category');

    useEffect(() => {
        // Cargar categorías
        api.get('/categories')
            .then(res => setCategories(res.data))
            .catch(err => console.error("Error al cargar categorías:", err));
    }, []);

    // Cargar las categorías al inicio
    useEffect(() => {
        fetch('http://localhost:5000/api/categories')
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error("Error al cargar categorías:", err));
    }, []);

    // Cargar productos cada vez que cambien los filtros o la búsqueda
    useEffect(() => {
        let active = true;

        const loadProducts = async () => {
            // Evitar setState síncrono en cuerpo del efecto
            await Promise.resolve();
            if (!active) return;

            setLoading(true);
            try {
                const url = activeCategoryId ? `/products?category=${activeCategoryId}` : '/products';
                const res = await api.get(url);
                if (active) {
                    setProducts(res.data);
                }
            } catch (err) {
                console.error("Error al cargar productos:", err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            active = false;
        };
    }, [activeCategoryId]);

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
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-blue-900 dark:text-white border-b border-gray-150 pb-2 mb-4">CATEGORÍAS</h2>
                            
                            <div className="space-y-1">
                                <button
                                    onClick={() => setSearchParams({})}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                                        !activeCategoryId 
                                            ? 'bg-blue-900 text-white shadow-sm' 
                                            : 'text-gray-600 hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400'
                                    }`}
                                >
                                    Ver Todo
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSearchParams({ category: cat.id })}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                                            activeCategoryId === String(cat.id)
                                                ? 'bg-blue-900 text-white shadow-sm' 
                                                : 'text-gray-600 hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
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
                                    <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">

                                        {/* Galería (Imagen) */}
                                        <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform hover:scale-105" />
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500">Sin Imagen</span>
                                            )}
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-1" title={product.name}>{product.name}</h3>

                                            {/* Sistema de Reseñas y Categoría */}
                                            <div className="flex items-center mt-1 mb-2">
                                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded mr-2">
                                                    {product.category_name || 'General'}
                                                </span>
                                                <div className="flex text-yellow-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(product.average_rating) ? 'fill-current' : 'text-gray-300 dark:text-gray-600 fill-current'}`} viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-500 ml-1">({product.review_count})</span>
                                            </div>

                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex-1 line-clamp-2">
                                                {product.description}
                                            </p>

                                            {/* Sistema de Variantes (Colores y Tallas) */}
                                            {product.variants && product.variants.length > 0 && product.variants[0] !== null && (
                                                <div className="mt-3">
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Opciones:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.variants.map((v, idx) => (
                                                            <span key={idx} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                                                                {v.color} - {v.size}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-xl font-bold text-gray-900 dark:text-white">${parseFloat(product.price).toFixed(2)}</span>
                                                <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
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
