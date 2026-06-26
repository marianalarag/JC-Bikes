import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useCart } from "../context/useCart";
import BrandLogo from "../Components/BrandLogo";

const PLACEHOLDER_IMAGES = {
  default: "https://placehold.co/160x120/1e40af/white?text=JC+BIKES",
  bicicleta:
    "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=160",
  casco: "https://images.unsplash.com/photo-1575408264798-b50b252663e6?w=160",
  herramienta:
    "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=160",
  luz: "https://images.unsplash.com/photo-1558981800-9e6f8f9b3b3c?w=160",
};

const getImageForProduct = (productName) => {
  const name = productName.toLowerCase();
  if (name.includes("bicicleta")) return PLACEHOLDER_IMAGES.bicicleta;
  if (name.includes("casco")) return PLACEHOLDER_IMAGES.casco;
  if (name.includes("herramienta") || name.includes("kit"))
    return PLACEHOLDER_IMAGES.herramienta;
  if (name.includes("luz")) return PLACEHOLDER_IMAGES.luz;
  return PLACEHOLDER_IMAGES.default;
};

function CartItemImage({ product }) {
  const [imageUrl, setImageUrl] = useState(getImageForProduct(product.name));

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const res = await api.get(`/products/${product.id}/images`);
        const primary = res.data.find((img) => img.is_primary) || res.data[0];

        if (primary) {
          setImageUrl(
            primary.image_url.startsWith("http")
              ? primary.image_url
              : `http://localhost:5000${primary.image_url}`,
          );
        }
      } catch (err) {
        console.error("Error cargando imagen del carrito:", err);
      }
    };

    fetchImage();
  }, [product.id]);

  return (
    <img
      src={imageUrl}
      alt={product.name}
      className="h-24 w-24 rounded-lg object-cover bg-gray-200 dark:bg-gray-700 shrink-0"
    />
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const {
    items,
    subtotal,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const handleQuantityChange = async (productId, quantity) => {
    const result = await updateQuantity(productId, quantity);
    if (!result.ok) {
      alert(result.message);
    }
  };

  const handleCheckout = async () => {
    setCheckoutError("");
    setCheckingOut(true);

    try {
      const response = await api.post("/orders", {
        items: items.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      });

      clearCart();
      navigate("/order-success", { state: { order: response.data.order } });
    } catch (err) {
      setCheckoutError(
        err.response?.data?.error || "No se pudo generar la orden.",
      );
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <BrandLogo />
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/shop"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Carrito
          </h1>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Vaciar carrito
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Tu carrito esta vacio.
            </p>
            <Link
              to="/shop"
              className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <CartItemImage product={product} />

                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {product.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ${Number(product.price).toFixed(2)} c/u
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(product.id, quantity - 1)}
                      className="h-9 w-9 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                      aria-label="Restar unidad"
                    >
                      -
                    </button>
                    <span className="h-9 w-16 inline-flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(product.id, quantity + 1)}
                      className="h-9 w-9 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                      aria-label="Sumar unidad"
                    >
                      +
                    </button>
                  </div>

                  <div className="sm:w-28 text-left sm:text-right font-bold text-green-600 dark:text-green-400">
                    ${(Number(product.price) * quantity).toFixed(2)}
                  </div>

                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <aside className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 h-fit">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">
                Resumen
              </h2>
              <div className="flex justify-between text-gray-700 dark:text-gray-200 mb-4">
                <span>Subtotal</span>
                <span className="font-bold">${subtotal.toFixed(2)}</span>
              </div>
              {checkoutError && (
                <p className="mb-4 text-sm text-red-600">{checkoutError}</p>
              )}
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {checkingOut ? "Generando orden..." : "Continuar compra"}
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
