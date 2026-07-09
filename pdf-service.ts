import type { PurchaseOrder } from "./types";

function moneyText(value: number) {
  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL`;
}

function currencyText(value: number, currency: string) {
  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${currency}`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = `${current} ${word}`.trim();
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines = 3) {
  wrapText(ctx, text, width).slice(0, maxLines).forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

function drawQrPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const pattern = [
    "111111111",
    "100010001",
    "101110101",
    "100010001",
    "111011111",
    "001010100",
    "111110101",
    "100000001",
    "111111111"
  ];
  const cell = size / pattern.length;
  ctx.fillStyle = "#eef4ff";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#0a2544";
  pattern.forEach((row, rowIndex) => {
    row.split("").forEach((bit, columnIndex) => {
      if (bit === "1") ctx.fillRect(x + columnIndex * cell, y + rowIndex * cell, cell * 0.92, cell * 0.92);
    });
  });
}

function blobFromCanvas(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PDF görseli oluşturulamadı."));
    }, "image/jpeg", 0.92);
  });
}

async function buildPageImage(order: PurchaseOrder) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = 595 * scale;
  canvas.height = 842 * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF çizim alanı oluşturulamadı.");
  ctx.scale(scale, scale);

  const currency = order.currency ?? "TRY";
  const exchangeRate = order.exchangeRate ?? 1;
  const exchangeRateDate = order.exchangeRateDate ?? order.orderDate;
  const tlInvoiceAmount = order.tlInvoiceAmount ?? order.grandTotal;
  const delivery = order.materialDestination ?? order.deliveryAddress;
  const approvers = Array.from(new Set(order.approvalHistory.map((entry) => entry.user))).join(", ") || "Onay kaydı yok";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 595, 842);
  ctx.fillStyle = "#0a2544";
  ctx.fillRect(0, 0, 595, 48);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px Arial, Helvetica, sans-serif";
  ctx.fillText("SATIN ALMA SİPARİŞ FORMU", 48, 30);

  const logo = await loadImage("/byks-logo.jpg");
  if (logo) ctx.drawImage(logo, 48, 64, 150, 63);
  else {
    ctx.fillStyle = "#0a2544";
    ctx.fillRect(48, 64, 150, 63);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px Arial, Helvetica, sans-serif";
    ctx.fillText("BYKS", 84, 102);
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 14px Arial, Helvetica, sans-serif";
  ctx.fillText(`PO No: ${order.poNumber}`, 392, 78);
  ctx.font = "12px Arial, Helvetica, sans-serif";
  ctx.fillText(`Sipariş Tarihi: ${order.orderDate}`, 392, 98);
  ctx.fillText(`Talep No: ${order.requestNo}`, 392, 116);
  ctx.fillText(`Durum: ${order.status}`, 392, 134);

  ctx.fillStyle = "#eef4ff";
  ctx.fillRect(48, 155, 230, 82);
  ctx.fillRect(317, 155, 230, 82);
  ctx.fillStyle = "#0a2544";
  ctx.font = "700 12px Arial, Helvetica, sans-serif";
  ctx.fillText("TEDARİKÇİ", 60, 176);
  ctx.fillText("TESLİMAT", 329, 176);
  ctx.fillStyle = "#1f2937";
  ctx.font = "700 11px Arial, Helvetica, sans-serif";
  ctx.fillText(order.supplier.companyName, 60, 196);
  ctx.font = "10px Arial, Helvetica, sans-serif";
  ctx.fillText(`${order.supplier.contactPerson} · ${order.supplier.email}`, 60, 212);
  drawWrapped(ctx, order.supplier.address, 60, 228, 205, 13, 2);
  ctx.fillText(order.deliveryAddress, 329, 196);
  drawWrapped(ctx, `Malzemenin gideceği yer: ${delivery}`, 329, 212, 205, 13, 3);

  ctx.fillStyle = "#0a2544";
  ctx.font = "700 13px Arial, Helvetica, sans-serif";
  ctx.fillText("SİPARİŞ BİLGİLERİ", 48, 270);
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(48, 277);
  ctx.lineTo(547, 277);
  ctx.stroke();
  ctx.fillStyle = "#334155";
  ctx.font = "11px Arial, Helvetica, sans-serif";
  ctx.fillText(`Vade: ${order.paymentTerm}`, 48, 300);
  ctx.fillText(`Termin: ${order.dueDate}`, 210, 300);
  ctx.fillText(`KDV: ${order.vatIncluded ? "Dahil" : "Hariç"}`, 360, 300);
  ctx.fillText(`Kur: ${currency} / ${exchangeRate.toLocaleString("tr-TR")} (${exchangeRateDate})`, 48, 318);
  ctx.font = "700 11px Arial, Helvetica, sans-serif";
  ctx.fillText(`TL Fatura Karşılığı: ${moneyText(tlInvoiceAmount)}`, 300, 318);

  const tableY = 350;
  ctx.fillStyle = "#0a2544";
  ctx.fillRect(48, tableY, 499, 28);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 10px Arial, Helvetica, sans-serif";
  ctx.fillText("Ürün", 58, tableY + 18);
  ctx.fillText("Miktar", 272, tableY + 18);
  ctx.fillText("Birim", 332, tableY + 18);
  ctx.fillText("Birim Fiyat", 396, tableY + 18);
  ctx.fillText("Toplam TL", 484, tableY + 18);

  ctx.strokeStyle = "#dbe3ee";
  ctx.fillStyle = "#1f2937";
  ctx.font = "10px Arial, Helvetica, sans-serif";
  order.items.slice(0, 8).forEach((item, index) => {
    const y = tableY + 28 + index * 34;
    ctx.strokeRect(48, y, 499, 34);
    drawWrapped(ctx, item.productName, 58, y + 14, 190, 12, 2);
    ctx.fillText(String(item.quantity), 272, y + 20);
    ctx.fillText(item.unit, 332, y + 20);
    ctx.fillText(currencyText(item.unitPriceOriginal ?? item.unitPrice, currency), 396, y + 20);
    ctx.fillText(moneyText(item.lineTotal), 484, y + 20);
  });

  ctx.strokeStyle = "#cbd5e1";
  ctx.strokeRect(360, 650, 187, 78);
  ctx.fillStyle = "#1f2937";
  ctx.font = "11px Arial, Helvetica, sans-serif";
  ctx.fillText(`Ara Toplam: ${moneyText(order.subtotal)}`, 376, 674);
  ctx.fillText(`KDV: ${moneyText(order.vatAmount)}`, 376, 696);
  ctx.font = "700 13px Arial, Helvetica, sans-serif";
  ctx.fillText(`Genel Toplam: ${moneyText(order.grandTotal)}`, 376, 720);

  ctx.fillStyle = "#0a2544";
  ctx.font = "700 12px Arial, Helvetica, sans-serif";
  ctx.fillText("Sipariş Notları", 48, 655);
  ctx.fillStyle = "#334155";
  ctx.font = "10px Arial, Helvetica, sans-serif";
  drawWrapped(ctx, order.orderNote || "-", 48, 674, 280, 13, 4);

  ctx.fillText(`Onaylayanlar: ${approvers}`, 48, 758);
  ctx.fillText(`Portal Linki: ${order.supplierPortalLink}`, 48, 776);
  drawQrPlaceholder(ctx, 470, 744, 64);
  ctx.fillStyle = "#334155";
  ctx.font = "9px Arial, Helvetica, sans-serif";
  ctx.fillText("QR Kod Alanı", 474, 820);

  ctx.fillStyle = "#64748b";
  ctx.font = "9px Arial, Helvetica, sans-serif";
  ctx.fillText("Genel Şartlar: Teslimat, irsaliye ve fatura bilgilerinde PO numarası yer almalıdır. Termin değişiklikleri yazılı teyit gerektirir.", 48, 820);

  const imageBlob = await blobFromCanvas(canvas);
  return new Uint8Array(await imageBlob.arrayBuffer());
}

function concat(parts: Uint8Array<ArrayBufferLike>[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function buildPdfFromJpeg(pageImage: Uint8Array<ArrayBufferLike>) {
  const encoder = new TextEncoder();
  const drawCommand = encoder.encode("q 595 0 0 842 0 0 cm /PageImage Do Q\n");
  const objects: Uint8Array<ArrayBufferLike>[] = [
    encoder.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    encoder.encode("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    encoder.encode("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /PageImage 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"),
    concat([encoder.encode(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pageImage.length} >>\nstream\n`), pageImage, encoder.encode("\nendstream\nendobj\n")]),
    concat([encoder.encode(`5 0 obj\n<< /Length ${drawCommand.length} >>\nstream\n`), drawCommand, encoder.encode("endstream\nendobj\n")])
  ];
  const chunks: Uint8Array<ArrayBufferLike>[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = chunks[0].length;
  for (const object of objects) {
    offsets.push(length);
    chunks.push(object);
    length += object.length;
  }
  const xrefStart = length;
  chunks.push(encoder.encode([
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  ].join("")));
  return concat(chunks);
}

export async function downloadPurchaseOrderPdfMock(order: PurchaseOrder) {
  const preview = window.open("", "_blank");
  if (preview) {
    preview.document.write("<!doctype html><title>PDF hazırlanıyor</title><body style=\"font-family:Arial,sans-serif;padding:24px\">PDF hazırlanıyor...</body>");
  }
  const pageImage = await buildPageImage(order);
  const content = buildPdfFromJpeg(pageImage);
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  if (preview) {
    preview.document.open();
    preview.document.write(`<!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>${order.poNumber} PDF</title>
          <style>
            html, body { margin: 0; height: 100%; font-family: Arial, sans-serif; background: #f1f5f9; }
            header { height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; background: #0a2544; color: white; }
            a { color: white; font-weight: 700; }
            iframe { width: 100%; height: calc(100% - 52px); border: 0; background: white; }
          </style>
        </head>
        <body>
          <header>
            <strong>${order.poNumber} PDF önizleme</strong>
            <a href="${url}" download="${order.poNumber}.pdf">PDF indir</a>
          </header>
          <iframe src="${url}" title="${order.poNumber} PDF"></iframe>
        </body>
      </html>`);
    preview.document.close();
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${order.poNumber}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}
