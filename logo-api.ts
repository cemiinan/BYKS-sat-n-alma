import type { PurchaseRequest } from "./types";

export type LogoPurchasePayload = {
  requestNo: string;
  supplier: string;
  totalAmount: number;
  currency: "TRY";
  paymentTerm: string;
  approvedAt?: string;
};

export function toLogoPurchasePayload(request: PurchaseRequest): LogoPurchasePayload {
  return {
    requestNo: request.requestNo,
    supplier: request.supplier,
    totalAmount: request.totalAmount,
    currency: "TRY",
    paymentTerm: request.paymentTerm,
    approvedAt: request.history.find((entry) => entry.action === "Cem onayladı" || entry.action === "Hasan onayladı")?.date
  };
}

export async function sendToLogoAccounting(_payload: LogoPurchasePayload) {
  return {
    ok: true,
    integration: "mock-logo-accounting",
    message: "Logo muhasebe entegrasyonu için API yüzeyi hazır; demo modunda dış sisteme gönderim yapılmaz."
  };
}
