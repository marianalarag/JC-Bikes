import React, { useState, useEffect } from "react";
import api from "../utils/api";

export default function ProductImageGallery({ productId }) {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchImages();
  }, [productId]);

  const checkAdmin = () => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setIsAdmin(userData.role === "admin");
    }
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/products/${productId}/images`);
      console.log("Imágenes cargadas:", res.data);
      setImages(res.data);
      const primary = res.data.find((img) => img.is_primary);
      setSelectedImage(primary || res.data[0] || null);
    } catch (err) {
      console.error("Error al cargar imágenes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/products/${productId}/images`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (response.ok) {
        await fetchImages();
        alert("Imagen subida exitosamente");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "No se pudo subir la imagen"}`);
      }
    } catch (err) {
      console.error("Error al subir imagen:", err);
      alert("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/products/images/${imageId}/primary`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        await fetchImages();
        alert("Imagen principal actualizada");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "No se pudo actualizar"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al actualizar");
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm("¿Eliminar esta imagen permanentemente?")) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/products/images/${imageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        await fetchImages();
        alert("Imagen eliminada exitosamente");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "No se pudo eliminar"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar");
    }
  };

  // Función para obtener la URL correcta de la imagen
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // Si es una URL externa (https://), la usa directamente
    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }
    // Si es local, agrega el puerto del backend
    return `http://localhost:5000${imageUrl}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Carrusel - Imagen principal grande */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden h-96 flex items-center justify-center">
        {selectedImage ? (
          <img
            src={getImageUrl(selectedImage.image_url)}
            alt="Producto"
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error("Error cargando imagen:", selectedImage.image_url);
              e.target.src =
                "https://placehold.co/400x300/1e40af/white?text=JC+BIKES";
            }}
          />
        ) : (
          <div className="text-center text-gray-500">
            <svg
              className="w-24 h-24 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p>Sin imágenes</p>
          </div>
        )}
      </div>

      {/* Miniaturas - Carrusel de fotos */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img) => (
            <div
              key={img.id}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 w-20 h-20 flex-shrink-0 ${
                selectedImage?.id === img.id
                  ? "border-blue-600"
                  : "border-gray-300"
              }`}
              onClick={() => setSelectedImage(img)}
            >
              <img
                src={getImageUrl(img.image_url)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src =
                    "https://placehold.co/80x80/1e40af/white?text=JC";
                }}
              />
              {img.is_primary && (
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-xs text-center">
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panel de administración (solo para admin) */}
      {isAdmin && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
            Administrar imágenes
          </h4>

          <div className="flex gap-2 mb-3">
            <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700">
              {uploading ? "Subiendo..." : "📷 Subir imagen"}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {images.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded"
                >
                  <span className="text-sm truncate flex-1 text-gray-900 dark:text-white">
                    {img.image_url.split("/").pop()}
                  </span>
                  <div className="flex gap-2">
                    {!img.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(img.id)}
                        className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                      >
                        Principal
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="text-red-600 dark:text-red-400 text-sm hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
