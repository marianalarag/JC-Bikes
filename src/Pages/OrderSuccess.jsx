import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import BrandLogo from "../Components/BrandLogo";

export default function OrderSuccess() {
  const { state } = useLocation();
  const order = state?.order;
  const email = state?.email;
  const [showToast, setShowToast] = useState(Boolean(state?.order));

  useEffect(() => {
    if (!showToast) return undefined;

    const timer = window.setTimeout(() => setShowToast(false), 6000);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <BrandLogo />
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No hay una orden para mostrar
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Vuelve a la tienda para generar una nueva compra.
            </p>
            <Link
              to="/shop"
              className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Ir a la tienda
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-3 rounded-xl border p-4 shadow-xl ${
            email?.sent
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          }`}
        >
          <span className="text-xl" aria-hidden="true">
            {email?.sent ? "✓" : "!"}
          </span>
          <div className="flex-1">
            <p className="font-bold">
              {email?.sent
                ? "Correo de confirmación enviado"
                : "Orden confirmada"}
            </p>
            <p className="mt-1 text-sm">
              {email?.sent
                ? `Enviamos los detalles a ${email.recipient}.`
                : "No pudimos enviar el correo, pero tu pedido quedó registrado."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-lg leading-none opacity-70 hover:opacity-100"
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      )}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo />
          <Link
            to="/shop"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium"
          >
            Seguir comprando
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sm:p-8">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
              Orden generada
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              Gracias por tu compra
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Tu orden #{order.id} fue registrada correctamente.
            </p>
          </div>

          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={`${item.productId}-${item.productName}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4"
              >
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {item.productName}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.quantity} x ${Number(item.unitPrice).toFixed(2)}
                  </p>
                </div>
                <div className="font-bold text-green-600 dark:text-green-400">
                  ${Number(item.lineTotal).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between text-lg text-gray-900 dark:text-white">
            <span className="font-semibold">Total</span>
            <span className="font-bold">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
