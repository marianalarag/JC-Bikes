import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import api from "../utils/api";
import ProductImageGallery from "../Components/ProductImageGallery";
import ProductReviews from "../Components/ProductReviews";
import { useCart } from "../context/useCart";

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
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
        let res;

        try {
          res = await api.get(
            `/products/by-slug/${encodeURIComponent(slug)}`,
          );
        } catch (slugError) {
          if (!/^\d+$/.test(slug)) throw slugError;
          res = await api.get(`/products/${slug}`);
        }

        setProduct(res.data);
        if (res.data.slug && res.data.slug !== slug) {
          navigate(`/product/${res.data.slug}`, { replace: true });
        }
      } catch (err) {
        setError(
          err.response?.data?.error || "Error al cargar el producto",
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [navigate, slug]);

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
  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
  const canonicalUrl = `${siteUrl}/product/${product.slug || slug}`;
  const description =
    product.description ||
    `Compra ${product.name} en JC Bikes. Productos y accesorios para ciclistas.`;
  const imageUrl = product.image_url || `${siteUrl}/favicon.svg`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image: imageUrl,
    sku: String(product.id),
    category: product.category_name,
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "MXN",
      price: Number(product.price).toFixed(2),
      availability:
        stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <Helmet>
        <title>{`${product.name} | JC Bikes`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.name} | JC Bikes`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | JC Bikes`} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
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
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}
