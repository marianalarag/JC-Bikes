import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import ProductCard from "../Components/ProductCard";

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryId = searchParams.get("category");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");
        setCategories(res.data);
      } catch (err) {
        console.error("Error al cargar categorías:", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Usar el endpoint simple por ahora
        const res = await api.get("/products/simple");
        setProducts(res.data);
        setTotalPages(1);
      } catch (err) {
        console.error("Error al cargar productos:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleCategoryClick = (categoryId) => {
    if (categoryId) {
      setSearchParams({ category: categoryId });
    } else {
      setSearchParams({});
    }
  };

  // Filtrar productos por categoría en el frontend (temporal)
  const filteredProducts = activeCategoryId
    ? products.filter((p) => p.category_id === parseInt(activeCategoryId))
    : products;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="font-bold text-xl text-gray-800 dark:text-white">
                  JC BIKES
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium"
              >
                Volver a Inicio
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 shrink-0">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-blue-900 dark:text-white border-b border-gray-150 pb-2 mb-4">
                CATEGORIAS
              </h2>
              <div className="space-y-1">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    !activeCategoryId
                      ? "bg-blue-900 text-white shadow-sm"
                      : "text-gray-600 hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400"
                  }`}
                >
                  Ver Todo
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      activeCategoryId === String(cat.id)
                        ? "bg-blue-900 text-white shadow-sm"
                        : "text-gray-600 hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Catalogo de Productos
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">
                  No hay productos disponibles en esta categoria.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
