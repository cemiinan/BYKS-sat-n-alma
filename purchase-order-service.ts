import type { HistoryEntry, PurchaseOrder, PurchaseRequest, RiskLevel, Supplier } from "./types";

export const suppliers: Supplier[] = [
  {
    id: "anka-teknik",
    companyName: "Anka Teknik",
    contactPerson: "Murat Yılmaz",
    email: "siparis@ankateknik.com",
    phone: "+90 212 555 10 20",
    taxOffice: "Maslak",
    taxNumber: "1234567890",
    address: "Maslak Mah. Teknik Sok. No:12 Sarıyer / İstanbul",
    paymentTerm: "45 gün",
    deliveryTerm: "Bodrum Depo teslim",
    notes: "Servis yedek parça tedarikçisi."
  },
  {
    id: "nova-sogutma",
    companyName: "Nova Soğutma",
    contactPerson: "Ece Demir",
    email: "teklif@novasogutma.com",
    phone: "+90 216 555 22 30",
    taxOffice: "Kadıköy",
    taxNumber: "2345678901",
    address: "Sanayi Cad. No:48 Ataşehir / İstanbul",
    paymentTerm: "Peşin",
    deliveryTerm: "Kurulum sahası teslim",
    notes: "Yeni tedarikçi; peşin ödeme kontrolü gerekir."
  },
  {
    id: "paketpro",
    companyName: "PaketPro",
    contactPerson: "Selin Kaya",
    email: "operasyon@paketpro.com",
    phone: "+90 312 555 31 40",
    taxOffice: "Ostim",
    taxNumber: "3456789012",
    address: "Ostim OSB 1200. Cad. No:9 Yenimahalle / Ankara",
    paymentTerm: "20 gün",
    deliveryTerm: "Bodrum Depo teslim",
    notes: "Ambalaj sarf ürünlerinde düzenli tedarikçi."
  },
  {
    id: "teknokurumsal",
    companyName: "TeknoKurumsal",
    contactPerson: "Barış Aksoy",
    email: "kurumsal@teknokurumsal.com",
    phone: "+90 232 555 44 50",
    taxOffice: "Konak",
    taxNumber: "4567890123",
    address: "Akdeniz Mah. Kurumsal Plaza No:5 Konak / İzmir",
    paymentTerm: "30 gün",
    deliveryTerm: "İzmir Depo teslim",
    notes: "BT ekipmanı tedarikçisi."
  }
];

const defaultSupplier = (name: string, paymentTerm: string): Supplier => ({
  id: name.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"),
  companyName: name,
  contactPerson: "Yetkili kişi",
  email: "satinalma@tedarikci-demo.com",
  phone: "+90 000 000 00 00",
  taxOffice: "Belirtilmedi",
  taxNumber: "Belirtilmedi",
  address: "Tedarikçi adresi eklenecek",
  paymentTerm,
  deliveryTerm: "BYKS depo teslim",
  notes: "Demo tedarikçi kartı."
});

export function findSupplier(name: string, paymentTerm: string) {
  return suppliers.find((supplier) => supplier.companyName === name) ?? defaultSupplier(name, paymentTerm);
}

export function nextPoNumber(existingOrders: PurchaseOrder[]) {
  const max = existingOrders.reduce((highest, order) => {
    const numeric = Number(order.poNumber.split("-").at(-1));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `PO-2026-${String(max + 1).padStart(4, "0")}`;
}

export function createPurchaseOrderFromRequest(
  request: PurchaseRequest,
  existingOrders: PurchaseOrder[],
  risk: { score: number; level: RiskLevel },
  createdBy: string,
  createdAt = new Date().toLocaleString("tr-TR")
): PurchaseOrder {
  const supplier = {
    ...findSupplier(request.supplier, request.paymentTerm),
    email: request.supplierEmail || findSupplier(request.supplier, request.paymentTerm).email
  };
  const currency = request.currency ?? "TRY";
  const exchangeRate = request.exchangeRate ?? 1;
  const originalTotalAmount = request.originalTotalAmount ?? request.totalAmount;
  const tlInvoiceAmount = request.tlInvoiceAmount ?? request.totalAmount;
  const subtotal = request.vatIncluded ? tlInvoiceAmount / 1.2 : tlInvoiceAmount;
  const vatAmount = request.vatIncluded ? tlInvoiceAmount - subtotal : tlInvoiceAmount * 0.2;
  const grandTotal = subtotal + vatAmount;
  const lowRiskAutoDraft = tlInvoiceAmount < 100000 && risk.level === "Düşük Risk";
  const manualFinalCheckRequired = tlInvoiceAmount > 100000 || risk.score >= 50 || request.riskFlags.prepayment || request.riskFlags.newSupplier;
  const poNumber = nextPoNumber(existingOrders);
  const auditLog: HistoryEntry[] = [
    { date: createdAt, user: createdBy, action: "PO oluşturuldu", note: `${request.requestNo} talebinden otomatik oluşturuldu.` }
  ];

  return {
    id: `po-${request.id}`,
    poNumber,
    requestId: request.id,
    requestNo: request.requestNo,
    orderDate: new Date().toISOString().slice(0, 10),
    supplier,
    items: [
      {
        productName: request.productName,
        brandModel: request.brandModel,
        quantity: request.quantity,
        unit: request.unit,
        unitPrice: request.unitPrice * exchangeRate,
        unitPriceOriginal: request.unitPrice,
        lineTotal: tlInvoiceAmount,
        lineTotalOriginal: originalTotalAmount
      }
    ],
    currency,
    exchangeRate,
    exchangeRateDate: request.exchangeRateDate ?? new Date().toISOString().slice(0, 10),
    originalTotalAmount,
    tlInvoiceAmount,
    vatIncluded: request.vatIncluded,
    subtotal,
    vatAmount,
    grandTotal,
    paymentTerm: request.paymentTerm,
    dueDate: request.dueDate,
    deliveryAddress: request.materialDestination || `${request.branch} teslimat adresi`,
    materialDestination: request.materialDestination || `${request.branch} teslimat adresi`,
    orderNote: request.notes || request.purpose,
    approvalHistory: request.history,
    auditLog: lowRiskAutoDraft
      ? [...auditLog, { date: createdAt, user: "Sistem", action: "E-posta taslağı oluşturuldu", note: "100.000 TL altı ve düşük riskli PO." }]
      : auditLog,
    riskScore: risk.score,
    riskLevel: risk.level,
    status: "Gönderilmeye hazır",
    supplierPortalLink: `https://portal.byks.local/orders/${poNumber}`,
    emailDraft: lowRiskAutoDraft ? buildEmailDraft(poNumber, supplier.email, request, supplier.companyName) : undefined,
    manualFinalCheckRequired
  };
}

export function buildEmailDraft(poNumber: string, to: string, request: PurchaseRequest, supplierName = request.supplier) {
  return {
    to,
    subject: `BYKS Satın Alma Siparişi - ${poNumber}`,
    body: [
      "Merhaba,",
      "",
      "Aşağıda detayları yer alan satın alma siparişimizi bilgilerinize sunarız.",
      "",
      `Sipariş No: ${poNumber}`,
      `Tedarikçi: ${supplierName}`,
      `Teslimat Adresi: ${request.materialDestination || `${request.branch} teslimat adresi`}`,
      `Termin Tarihi: ${request.dueDate}`,
      `Ödeme Vadesi: ${request.paymentTerm}`,
      `Kur: ${request.currency ?? "TRY"} / ${(request.exchangeRate ?? 1).toLocaleString("tr-TR")} (${request.exchangeRateDate ?? new Date().toISOString().slice(0, 10)})`,
      `TL Fatura Karşılığı: ${(request.tlInvoiceAmount ?? request.totalAmount).toLocaleString("tr-TR")} TL`,
      "",
      "Ürün listesi:",
      "",
      `* ${request.productName}`,
      `* Miktar: ${request.quantity}`,
      `* Birim: ${request.unit}`,
      `* Birim fiyat: ${request.unitPrice.toLocaleString("tr-TR")} TL`,
      `* Toplam: ${request.totalAmount.toLocaleString("tr-TR")} TL`,
      "",
      "Lütfen siparişi ve termin tarihini yazılı olarak teyit ediniz.",
      "",
      "Saygılarımızla,",
      "BYKS Satın Alma Departmanı"
    ].join("\n"),
    createdAt: new Date().toLocaleString("tr-TR")
  };
}
