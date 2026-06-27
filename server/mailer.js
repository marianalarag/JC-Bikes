const nodemailer = require("nodemailer");

const requiredSmtpVariables = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];

const smtpIsConfigured = () =>
  requiredSmtpVariables.every((variable) => process.env[variable]);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMoney = (value) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value));

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const buildItemsHtml = (items) =>
  items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            ${escapeHtml(item.productName)}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${formatMoney(item.lineTotal)}
          </td>
        </tr>`,
    )
    .join("");

const sendOrderConfirmation = async ({ recipient, customerName, order }) => {
  if (!recipient) {
    return { sent: false, reason: "no_recipient" };
  }

  if (!smtpIsConfigured()) {
    console.warn(
      "Correo de confirmación omitido: faltan variables de entorno SMTP.",
    );
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"JC Bikes" <${from}>`,
      to: recipient,
      subject: `Confirmación de pedido #${order.id} | JC Bikes`,
      text: [
        `Hola ${customerName || "ciclista"},`,
        `Recibimos tu pedido #${order.id}.`,
        ...order.items.map(
          (item) =>
            `${item.quantity} x ${item.productName}: ${formatMoney(item.lineTotal)}`,
        ),
        `Total: ${formatMoney(order.total)}`,
        "Gracias por comprar en JC Bikes.",
      ].join("\n"),
      html: `
        <div style="background:#f3f4f6;padding:32px;font-family:Arial,sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;">
            <div style="background:#1e3a8a;color:#ffffff;padding:24px;">
              <h1 style="margin:0;font-size:24px;">JC Bikes</h1>
              <p style="margin:8px 0 0;">Confirmación de tu pedido</p>
            </div>
            <div style="padding:24px;">
              <h2 style="margin-top:0;">¡Gracias por tu compra, ${escapeHtml(customerName || "ciclista")}!</h2>
              <p>Recibimos correctamente tu pedido <strong>#${order.id}</strong>.</p>
              <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                <thead>
                  <tr>
                    <th style="text-align:left;">Producto</th>
                    <th style="text-align:center;">Cantidad</th>
                    <th style="text-align:right;">Importe</th>
                  </tr>
                </thead>
                <tbody>${buildItemsHtml(order.items)}</tbody>
              </table>
              <p style="font-size:20px;text-align:right;margin-top:24px;">
                Total: <strong>${formatMoney(order.total)}</strong>
              </p>
              <p style="color:#6b7280;margin-bottom:0;">
                Te avisaremos cuando tu pedido avance.
              </p>
            </div>
          </div>
        </div>`,
    });

    return { sent: true, recipient };
  } catch (error) {
    console.error(
      `No se pudo enviar el correo del pedido #${order.id}:`,
      error.message,
    );
    return { sent: false, reason: "delivery_failed" };
  }
};

module.exports = { sendOrderConfirmation };
