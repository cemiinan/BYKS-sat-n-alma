import type { PurchaseOrder, User } from "./types";

export type MockMailResult = {
  ok: true;
  provider: "mock-mail";
  to: string;
  subject: string;
  sentAt: string;
};

export function canSendPurchaseOrder(order: PurchaseOrder, user: User) {
  if (user.role === "Depo" || user.role === "Muhasebe") return false;
  if (user.role === "Personel") return order.status === "Gönderilmeye hazır" && Boolean(order.supplier.email);
  if (user.role === "Admin") return true;
  return user.role === "Hasan" && order.grandTotal < 100000 && order.riskLevel === "Düşük Risk";
}

export function buildPurchaseOrderEmail(order: PurchaseOrder) {
  const currency = order.currency ?? "TRY";
  const exchangeRate = order.exchangeRate ?? 1;
  const exchangeRateDate = order.exchangeRateDate ?? order.orderDate;
  const tlInvoiceAmount = order.tlInvoiceAmount ?? order.grandTotal;
  return {
    to: order.supplier.email,
    subject: `BYKS Satın Alma Siparişi - ${order.poNumber}`,
    body: [
      "Merhaba,",
      "",
      "Aşağıda detayları yer alan satın alma siparişimizi bilgilerinize sunarız.",
      "",
      `Sipariş No: ${order.poNumber}`,
      `Tedarikçi: ${order.supplier.companyName}`,
      `Teslimat Adresi: ${order.deliveryAddress}`,
      `Termin Tarihi: ${order.dueDate}`,
      `Ödeme Vadesi: ${order.paymentTerm}`,
      `Kur: ${currency} / ${exchangeRate.toLocaleString("tr-TR")} (${exchangeRateDate})`,
      `TL Fatura Karşılığı: ${tlInvoiceAmount.toLocaleString("tr-TR")} TL`,
      "",
      "Ürün listesi:",
      "",
      ...order.items.flatMap((item) => [
        `* Ürün adı: ${item.productName}`,
        `* Miktar: ${item.quantity}`,
        `* Birim: ${item.unit}`,
        `* Birim fiyat: ${(item.unitPriceOriginal ?? item.unitPrice).toLocaleString("tr-TR")} ${currency}`,
        `* Toplam: ${item.lineTotal.toLocaleString("tr-TR")} TL`
      ]),
      "",
      "Lütfen siparişi ve termin tarihini yazılı olarak teyit ediniz.",
      "",
      "Saygılarımızla,",
      "BYKS Satın Alma Departmanı"
    ].join("\n")
  };
}

export async function sendPurchaseOrderMail(order: PurchaseOrder): Promise<MockMailResult> {
  const mail = buildPurchaseOrderEmail(order);
  return {
    ok: true,
    provider: "mock-mail",
    to: mail.to,
    subject: mail.subject,
    sentAt: new Date().toLocaleString("tr-TR")
  };
}
