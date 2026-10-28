import QRCode from "qrcode";

// BookingsHelper#qr_code_svg: QR-Code des Tickets in der Markenfarbe
export async function qrCodeSvg(token, { size = 180 } = {}) {
  const svg = await QRCode.toString(String(token), {
    type: "svg",
    margin: 0,
    color: { dark: "#e8112d", light: "#ffffff" }
  });
  return svg.replace("<svg ", `<svg width="${size}" height="${size}" role="img" aria-label="QR-Code des Tickets" `);
}
