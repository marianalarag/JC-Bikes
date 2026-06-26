import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";
import ProductImageGallery from "../Components/ProductImageGallery";
import { useCart } from "../context/useCart";

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
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

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    setAdding(true);
    setCartMessage("");

    try {
      const result = await addToCart(product, quantity);
      setCartMessage(result.message);
    } catch (err) {
      console.error("Error agregando al carrito:", err);
      setCartMessage("No se pudo verificar el stock.");
    } finally {
      setAdding(false);
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

  const stock = Number(product.stock || 0);
  const quantityOptions = Array.from(
    { length: Math.min(stock, 10) },
    (_, index) => index + 1,
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <Link to="/shop" className="text-blue-600 hover:underline">
            Volver a la tienda
          </Link>
          <Link
            to="/cart"
            className="text-blue-600 hover:underline font-semibold"
          >
            Ver carrito
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <ProductImageGallery productId={product.id} />

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {product.name}
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {product.description || "Sin descripcion"}
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
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={stock <= 0}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 disabled:opacity-60"
              >
                {quantityOptions.length > 0 ? (
                  quantityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))
                ) : (
                  <option value="0">Sin stock</option>
                )}
              </select>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || stock <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {stock <= 0
                ? "Agotado"
                : adding
                  ? "Agregando..."
                  : "Agregar al carrito"}
            </button>

            {cartMessage && (
              <p className="mt-3 text-sm text-blue-700 dark:text-blue-300">
                {cartMessage}
              </p>
            )}

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
