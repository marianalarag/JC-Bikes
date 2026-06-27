import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const statusStyles = {
  created: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  procesando: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  enviado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
};

const statusLabels = {
  created: "Pendiente",
  procesando: "Procesando",
  enviado: "Enviado",
};

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const loadOrders = useCallback(async () => {
    setError("");

    try {
      const { data } = await api.get("/admin/orders");
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.error || "No fue posible cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = Promise.resolve().then(loadOrders);
    return () => {
      request.catch(() => {});
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () =>
      statusFilter === "todos"
        ? orders
        : orders.filter((order) => order.status === statusFilter),
    [orders, statusFilter],
  );

  const counts = useMemo(
    () =>
      orders.reduce(
        (result, order) => ({
          ...result,
          [order.status]: (result[order.status] || 0) + 1,
        }),
        { created: 0, procesando: 0, enviado: 0 },
      ),
    [orders],
  );

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    setError("");

    try {
      const { data } = await api.patch(`/admin/orders/${orderId}/status`, {
        status,
      });
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? { ...order, status: data.status, updatedAt: data.updatedAt }
            : order,
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.error || "No fue posible actualizar el pedido.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-300">
              Administración
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-blue-900 dark:text-white">
              Pedidos entrantes
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Revisa el detalle y mantén informado el avance de cada compra.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="self-start rounded-lg bg-gray-600 px-4 py-2.5 font-semibold text-white transition hover:bg-gray-700"
          >
            Volver al panel
          </Link>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          {["created", "procesando", "enviado"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                setStatusFilter((current) =>
                  current === status ? "todos" : status,
                )
              }
              className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 dark:bg-gray-800 ${
                statusFilter === status
                  ? "border-orange-500 ring-2 ring-orange-100 dark:ring-orange-950"
                  : "border-gray-100 dark:border-gray-700"
              }`}
            >
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {statusLabels[status]}
              </span>
              <strong className="mt-1 block text-3xl text-blue-900 dark:text-white">
                {counts[status]}
              </strong>
            </button>
          ))}
        </section>

        {error && (
          <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
            Cargando pedidos…
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <p className="text-lg font-bold text-blue-900 dark:text-white">No hay pedidos</p>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              No existen compras con el filtro seleccionado.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-extrabold text-blue-900 dark:text-white">
                        Pedido #{order.id}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          statusStyles[order.status] || statusStyles.created
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === "created" && (
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "procesando")}
                        className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
                      >
                        Marcar procesando
                      </button>
                    )}
                    {order.status === "procesando" && (
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, "enviado")}
                        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        Marcar enviado
                      </button>
                    )}
                    <strong className="ml-2 text-xl text-blue-900 dark:text-white">
                      {moneyFormatter.format(order.total)}
                    </strong>
                  </div>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-[1fr_2fr]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Cliente
                    </p>
                    <p className="mt-1 font-bold text-gray-800 dark:text-gray-200">
                      {order.customer?.name || "Compra como invitado"}
                    </p>
                    {order.customer?.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customer.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                      Productos
                    </p>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-4 py-2 first:pt-0"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.quantity} × {item.productName}
                          </span>
                          <span className="whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {moneyFormatter.format(item.lineTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
