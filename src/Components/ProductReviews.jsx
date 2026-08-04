import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const emptyForm = { rating: 5, comment: "" };

const formatDate = (value) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(new Date(value));

function Stars({ value, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl leading-none transition-colors ${
              star <= value ? "text-amber-400" : "text-gray-300 dark:text-gray-600"
            }`}
            aria-label={`${star} estrella${star === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ) : (
          <span
            key={star}
            className={`text-lg leading-none ${
              star <= value ? "text-amber-400" : "text-gray-300 dark:text-gray-600"
            }`}
            aria-hidden="true"
          >
            ★
          </span>
        ),
      )}
    </div>
  );
}

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const loadReviews = async () => {
    try {
      const response = await api.get(`/products/${productId}/reviews`);
      setReviews(response.data.reviews || []);
      setSummary(response.data.summary || { average: 0, count: 0 });
    } catch (err) {
      setError(err.response?.data?.error || "No se pudieron cargar las reseñas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    api.get(`/products/${productId}/reviews`)
      .then((response) => {
        if (cancelled) return;
        setReviews(response.data.reviews || []);
        setSummary(response.data.summary || { average: 0, count: 0 });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || "No se pudieron cargar las reseñas.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post(`/products/${productId}/reviews`, form);
      setMessage(response.data.message || "Reseña guardada.");
      setForm(emptyForm);
      await loadReviews();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar la reseña.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reviewId) => {
    setError("");
    try {
      await api.delete(`/products/reviews/${reviewId}`);
      await loadReviews();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo eliminar la reseña.");
    }
  };

  return (
    <section className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Comentarios y reseñas</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comparte tu experiencia con este producto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {Number(summary.average || 0).toFixed(1)}
          </span>
          <div>
            <Stars value={Math.round(Number(summary.average || 0))} />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {summary.count} {summary.count === 1 ? "reseña" : "reseñas"}
            </p>
          </div>
        </div>
      </div>

      {token ? (
        <form onSubmit={handleSubmit} className="py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {currentUser?.name ? `Reseña como ${currentUser.name}` : "Escribe una reseña"}
          </h3>
          <Stars
            value={form.rating}
            interactive
            onChange={(rating) => setForm((current) => ({ ...current, rating }))}
          />
          <textarea
            value={form.comment}
            onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            placeholder="¿Qué te pareció el producto?"
            className="mt-3 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">{form.comment.length}/1000</span>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Publicar reseña"}
            </button>
          </div>
        </form>
      ) : (
        <p className="py-5 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">Inicia sesión</Link> para dejar una reseña.
        </p>
      )}

      {message && <p className="mt-4 text-sm text-green-700 dark:text-green-300">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p>}

      <div className="mt-5 space-y-5">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando reseñas...</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Aún no hay reseñas. Sé la primera persona en comentar.</p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">{review.user_name || "Cliente"}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(review.created_at)}</span>
                </div>
                <Stars value={review.rating} />
              </div>
              <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{review.comment}</p>
              {(currentUser?.role === "admin" || Number(currentUser?.id) === Number(review.user_id)) && (
                <button
                  type="button"
                  onClick={() => handleDelete(review.id)}
                  className="mt-2 text-xs text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
