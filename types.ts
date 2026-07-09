export type Role = "Admin" | "Hasan" | "Personel" | "Depo" | "Muhasebe";

export type User = {
  id: string;
  name: string;
  role: Role;
  deviceToken?: string;
};

export type NotificationPriority = "düşük" | "orta" | "yüksek" | "kritik";

export type NotificationRecordType = "Talep" | "PO" | "Ödeme" | "Mal Kabul" | "Sistem";

export type NotificationChannelSettings = {
  inApp: boolean;
  email: boolean;
  mobilePush: boolean;
  criticalSmsWhatsapp: boolean;
};

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  recordType: NotificationRecordType;
  recordNo: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
  visibleTo: Role[];
};

export type RequestStatus =
  | "Taslak"
  | "Hasan onayı bekliyor"
  | "Cem onayı bekliyor"
  | "Nakit akışı kontrolü bekliyor"
  | "Onaylandı"
  | "Reddedildi"
  | "Revizyon istendi"
  | "Siparişe dönüştürüldü"
  | "Mal kabul edildi"
  | "Fatura girildi"
  | "Ödeme planlandı"
  | "Tamamlandı";

export type RiskLevel = "Düşük Risk" | "Orta Risk" | "Yüksek Risk";

export type Currency = "TRY" | "USD" | "EUR" | "GBP";

export type RiskFlag =
  | "newSupplier"
  | "prepayment"
  | "firstPurchase"
  | "outOfBudget"
  | "enoughStock"
  | "urgent"
  | "shortTerm"
  | "priceIncrease";

export type HistoryEntry = {
  date: string;
  user: string;
  action: string;
  note?: string;
};

export type Supplier = {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  taxOffice: string;
  taxNumber: string;
  address: string;
  paymentTerm: string;
  deliveryTerm: string;
  notes: string;
};

export type PurchaseOrderStatus =
  | "Taslak PO"
  | "Gönderilmeye hazır"
  | "Tedarikçiye gönderildi"
  | "Tedarikçi onayı bekleniyor"
  | "Tedarikçi onayladı"
  | "Revizyon istendi"
  | "Sevkiyat hazırlanıyor"
  | "Kısmi sevkiyat"
  | "Yolda"
  | "Teslim edildi"
  | "İptal edildi";

export type PurchaseOrderItem = {
  productName: string;
  brandModel: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  unitPriceOriginal?: number;
  lineTotal: number;
  lineTotalOriginal?: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  requestId: string;
  requestNo: string;
  orderDate: string;
  supplier: Supplier;
  items: PurchaseOrderItem[];
  currency: Currency;
  exchangeRate: number;
  exchangeRateDate: string;
  originalTotalAmount: number;
  tlInvoiceAmount: number;
  vatIncluded: boolean;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  paymentTerm: string;
  dueDate: string;
  deliveryAddress: string;
  materialDestination: string;
  orderNote: string;
  approvalHistory: HistoryEntry[];
  auditLog: HistoryEntry[];
  riskScore: number;
  riskLevel: RiskLevel;
  status: PurchaseOrderStatus;
  supplierPortalLink: string;
  emailDraft?: {
    to: string;
    subject: string;
    body: string;
    createdAt: string;
  };
  emailSentAt?: string;
  emailSentTo?: string;
  pdfGeneratedAt?: string;
  supplierConfirmedAt?: string;
  manualFinalCheckRequired: boolean;
};

export type PurchaseRequest = {
  id: string;
  requestNo: string;
  requestDate: string;
  requester: string;
  branch: string;
  productName: string;
  brandModel: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency?: Currency;
  exchangeRate?: number;
  exchangeRateDate?: string;
  originalTotalAmount?: number;
  tlInvoiceAmount?: number;
  vatIncluded: boolean;
  totalAmount: number;
  supplier: string;
  supplierEmail?: string;
  paymentTerm: string;
  dueDate: string;
  materialDestination?: string;
  purpose: string;
  projectCustomer: string;
  currentStock: number;
  lastPurchasePrice: number;
  alternativeOffer: number;
  fileName: string;
  notes: string;
  status: RequestStatus;
  invoiceNo?: string;
  paymentDate?: string;
  riskFlags: Record<RiskFlag, boolean>;
  history: HistoryEntry[];
};
