import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";
import ProductImageGallery from "../Components/ProductImageGallery";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data);
    } catch (err) {
      setError("Error al cargar el producto");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center text-red-600 py-8">
        {error || "Producto no encontrado"}
        <Link to="/shop" className="block text-blue-600 mt-4">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <Link
          to="/shop"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Volver a la tienda
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* GALERÍA DE IMÁGENES - Esto es lo que pide el sprint */}
          <ProductImageGallery productId={product.id} />

          {/* Información del producto */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {product.name}
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {product.description || "Sin descripción"}
            </p>

            <div className="mb-6">
              <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                ${parseFloat(product.price).toFixed(2)}
              </span>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Cantidad:
              </label>
              <select className="border rounded-lg px-4 py-2 dark:bg-gray-700">
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors">
              Agregar al carrito
            </button>

            {product.stock !== undefined && (
              <p className="mt-4 text-sm text-gray-500">
                Stock disponible: {product.stock} unidades
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
