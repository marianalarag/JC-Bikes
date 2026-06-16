import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../utils/api";

import biciImg from "../images/bicicleta-montaña.jpg";
import cascoImg from "../images/casco-profesional.jpg";
import herramientasImg from "../images/kit-herramientas.jpg";
import luzImg from "../images/luz-led.jpg";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryId = searchParams.get("category");

  // Función para obtener la imagen según el nombre del producto
  const getProductImage = (productName) => {
    const name = productName.toLowerCase();

    if (
      name.includes("bicicleta") ||
      name.includes("bici") ||
      name.includes("trek")
    ) {
      return biciImg;
    }
    if (name.includes("casco")) {
      return cascoImg;
    }
    if (name.includes("herramienta") || name.includes("kit")) {
      return herramientasImg;
    }
    if (name.includes("luz") || name.includes("led")) {
      return luzImg;
    }

    // Imagen por defecto: usa la imagen de bicicleta
    return biciImg;
  };

  useEffect(() => {
    // Cargar categorías
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
    let active = true;

    const loadProducts = async () => {
      if (!active) return;
      setLoading(true);
      try {
        // Usar el nuevo endpoint con paginación
        let url = `/products/paginated?page=${page}&limit=12`;
        if (activeCategoryId) {
          url += `&category=${activeCategoryId}`;
        }
        const res = await api.get(url);
        if (active) {
          setProducts(res.data.products);
          setTotalPages(res.data.totalPages);
        }
      } catch (err) {
        console.error("Error al cargar productos:", err);
        if (active) {
          setProducts([]);
          setTotalPages(1);
        }
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
  }, [activeCategoryId, page]);

  // Resetear página cuando cambia la categoría
  useEffect(() => {
    setPage(1);
  }, [activeCategoryId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header / Navigation */}
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

      {/* Shop Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar / Filters */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-blue-900 dark:text-white border-b border-gray-150 pb-2 mb-4">
                CATEGORÍAS
              </h2>

              <div className="space-y-1">
                <button
                  onClick={() => setSearchParams({})}
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
                    onClick={() => setSearchParams({ category: cat.id })}
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

          {/* Product Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Catálogo de Productos
              </h1>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.length > 0 ? (
                    products.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300"
                      >
                        <div className="h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <img
                            src={getProductImage(product.name)}
                            alt={product.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex-1 line-clamp-2">
                            {product.description || "Sin descripción"}
                          </p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                              ${parseFloat(product.price).toFixed(2)}
                            </span>
                            <button className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                              Añadir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">
                      No hay productos disponibles.
                    </p>
                  )}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      Página {page} de {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
