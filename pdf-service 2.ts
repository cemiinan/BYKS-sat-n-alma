import type { PurchaseOrder } from "./types";

function pdfSafe(text: string) {
  return text
    .replaceAll("ğ", "g")
    .replaceAll("Ğ", "G")
    .replaceAll("ı", "i")
    .replaceAll("İ", "I")
    .replaceAll("ö", "o")
    .replaceAll("Ö", "O")
    .replaceAll("ş", "s")
    .replaceAll("Ş", "S")
    .replaceAll("ü", "u")
    .replaceAll("Ü", "U")
    .replaceAll("ç", "c")
    .replaceAll("Ç", "C")
    .replaceAll("₺", "TL")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[\\()]/g, "\\$&");
}

function wrapLine(line: string, max = 92) {
  if (line.length <= max) return [line];
  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > max) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildPurchaseOrderPdfLines(order: PurchaseOrder) {
  const currency = order.currency ?? "TRY";
  const exchangeRate = order.exchangeRate ?? 1;
  const exchangeRateDate = order.exchangeRateDate ?? order.orderDate;
  const tlInvoiceAmount = order.tlInvoiceAmount ?? order.grandTotal;
  return [
    "BYKS LOGO ALANI",
    `PO Numarası: ${order.poNumber}`,
    `Sipariş Tarihi: ${order.orderDate}`,
    "",
    "Tedarikçi Bilgileri",
    `${order.supplier.companyName}`,
    `${order.supplier.contactPerson} · ${order.supplier.email} · ${order.supplier.phone}`,
    `${order.supplier.taxOffice} / ${order.supplier.taxNumber}`,
    `${order.supplier.address}`,
    "",
    `Teslimat Adresi: ${order.deliveryAddress}`,
    `Malzemenin Gideceği Yer: ${order.materialDestination ?? order.deliveryAddress}`,
    `Kur: ${currency} / ${exchangeRate.toLocaleString("tr-TR")} (${exchangeRateDate})`,
    `TL Fatura Karşılığı: ${tlInvoiceAmount.toLocaleString("tr-TR")} TL`,
    "",
    "Ürün Tablosu",
    ...order.items.map((item) => `${item.productName} | ${item.quantity} ${item.unit} | ${(item.unitPriceOriginal ?? item.unitPrice).toLocaleString("tr-TR")} ${currency} | ${item.lineTotal.toLocaleString("tr-TR")} TL`),
    "",
    `Ara Toplam: ${order.subtotal.toLocaleString("tr-TR")} TL`,
    `KDV: ${order.vatAmount.toLocaleString("tr-TR")} TL`,
    `Genel Toplam: ${order.grandTotal.toLocaleString("tr-TR")} TL`,
    `Vade: ${order.paymentTerm}`,
    `Termin Tarihi: ${order.dueDate}`,
    `Sipariş Notları: ${order.orderNote}`,
    "",
    `Onaylayan Kişiler: ${order.approvalHistory.map((entry) => entry.user).join(", ")}`,
    `QR Kod Alanı: ${order.supplierPortalLink}`,
    "",
    "Genel Şartlar",
    "Teslimat ve fatura bilgileri sipariş numarası ile eşleşmelidir. Termin değişiklikleri yazılı olarak bildirilmelidir."
  ];
}

export function buildPurchaseOrderPdfText(order: PurchaseOrder) {
  return buildPurchaseOrderPdfLines(order).join("\n");
}

function buildValidPdf(lines: string[]) {
  const wrapped = lines.flatMap((line) => (line ? wrapLine(line) : [""])).slice(0, 54);
  const textCommands = wrapped
    .map((line, index) => {
      const y = 780 - index * 14;
      const size = index === 0 ? 18 : line.endsWith("Bilgileri") || line === "Urun Tablosu" || line === "Genel Sartlar" ? 13 : 10;
      return `BT /F1 ${size} Tf 48 ${y} Td (${pdfSafe(line)}) Tj ET`;
    })
    .join("\n");
  const stream = `${textCommands}\n`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

export function downloadPurchaseOrderPdfMock(order: PurchaseOrder) {
  const content = buildValidPdf(buildPurchaseOrderPdfLines(order));
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${order.poNumber}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
