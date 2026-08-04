import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { resolveApiUrl } from "../utils/api";
import { useCart } from "../context/useCart";

const PLACEHOLDER_IMAGES = {
  default: "https://placehold.co/400x300/1e40af/white?text=JC+BIKES",
  bicicleta:
    "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400",
  casco: "https://images.unsplash.com/photo-1575408264798-b50b252663e6?w=400",
  herramienta:
    "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400",
  luz: "https://images.unsplash.com/photo-1558981800-9e6f8f9b3b3c?w=400",
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

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [primaryImage, setPrimaryImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [cartMessage, setCartMessage] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchPrimaryImage = async () => {
      try {
        const res = await api.get(`/products/${product.id}/images`);
        const primary = res.data.find((img) => img.is_primary);
        if (primary) {
          const imageUrl = resolveApiUrl(primary.image_url);
          setPrimaryImage(imageUrl);
        }
      } catch (err) {
        console.error("Error cargando imagen principal:", err);
      } finally {
        setLoadingImage(false);
      }
    };

    fetchPrimaryImage();
  }, [product.id]);

  const handleClick = () => {
    navigate(`/product/${product.slug || product.id}`);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    setAdding(true);
    setCartMessage("");

    try {
      const result = await addToCart(product, 1);
      setCartMessage(result.message);
    } catch (err) {
      console.error("Error agregando al carrito:", err);
      setCartMessage("No se pudo verificar el stock.");
    } finally {
      setAdding(false);
    }
  };

  const imageUrl = loadingImage
    ? getImageForProduct(product.name)
    : primaryImage || getImageForProduct(product.name);
  const isOutOfStock = Number(product.stock || 0) <= 0;

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      style={{ cursor: "pointer" }}
    >
      <div className="h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex-1 line-clamp-2">
          {product.description || "Sin descripcion"}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${parseFloat(product.price).toFixed(2)}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={adding || isOutOfStock}
            className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isOutOfStock ? "Agotado" : adding ? "..." : "Anadir"}
          </button>
        </div>
        {cartMessage && (
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
            {cartMessage}
          </p>
        )}
      </div>
    </div>
  );
}
