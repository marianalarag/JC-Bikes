import React from "react";

const PLACEHOLDER_IMAGES = {
  default: "https://placehold.co/400x300?text=JC+BIKES",
  bicicleta:
    "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400",
  casco: "https://images.unsplash.com/photo-1575408264798-b50b252663e6?w=400",
  herramienta:
    "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400",
  luz: "https://images.unsplash.com/photo-1558981800-9e6f8f9b3b3c?w=400",
};

const getImageForProduct = (productName) => {
  if (productName.toLowerCase().includes("bicicleta"))
    return PLACEHOLDER_IMAGES.bicicleta;
  if (productName.toLowerCase().includes("casco"))
    return PLACEHOLDER_IMAGES.casco;
  if (productName.toLowerCase().includes("herramienta"))
    return PLACEHOLDER_IMAGES.herramienta;
  if (productName.toLowerCase().includes("luz")) return PLACEHOLDER_IMAGES.luz;
  return PLACEHOLDER_IMAGES.default;
};

export default function ProductCard({ product }) {
  const imageUrl = product.image_url || getImageForProduct(product.name);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300">
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
  );
}
