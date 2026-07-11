import { NextResponse } from "next/server";

type Status = "Hasan onayı bekliyor" | "Cem onayı bekliyor" | "Onaylandı" | "Reddedildi" | "Tedarikçiye gönderildi" | "Mal kabul edildi" | "Ödeme planlandı" | "Tamamlandı";
type RequestItem = {
  id: string;
  location: string;
  destination: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: "TL" | "USD" | "EUR";
  exchangeRate: number;
  supplier: string;
  supplierEmail: string;
  due: string;
  deliveryDate: string;
  risk: number;
  reasons: string[];
  status: Status;
  po?: string;
  note?: string;
  mailFrom?: string;
  mailSentAt?: string;
  freightOwner?: "buyer" | "seller";
};

const DEPO_MAIL = "info@byks.com.tr";
const initialRequests: RequestItem[] = [
  { id: "ST-2026-0001", location: "Bodrum Depo", destination: "Yalıkavak Şantiye", product: "Su yalıtım kimyasalı", quantity: 20, unit: "Teneke", unitPrice: 3250, currency: "TL", exchangeRate: 1, supplier: "Ege Kimya", supplierEmail: "siparis@egekimya.com", due: "45 gün", deliveryDate: "2026-07-18", risk: 10, reasons: ["Acil alım +10"], status: "Hasan onayı bekliyor" },
  { id: "ST-2026-0002", location: "İzmir Depo", destination: "İzmir Depo", product: "Epoksi astar", quantity: 60, unit: "Kg", unitPrice: 42, currency: "USD", exchangeRate: 32.85, supplier: "Yeni Tedarik A.Ş.", supplierEmail: "teklif@yenitedarik.com", due: "Peşin", deliveryDate: "2026-07-16", risk: 70, reasons: ["Yeni tedarikçi +40", "Peşin ödeme +30"], status: "Cem onayı bekliyor" },
  { id: "ST-2026-0003", location: "Bodrum Ofis", destination: "Bodrum Ofis", product: "Ambalaj sarf malzemesi", quantity: 100, unit: "Adet", unitPrice: 850, currency: "TL", exchangeRate: 1, supplier: "Bodrum Ambalaj", supplierEmail: "info@bodrumambalaj.com", due: "30 gün", deliveryDate: "2026-07-20", risk: 0, reasons: [], status: "Tedarikçiye gönderildi", po: "PO-2026-0001", mailFrom: DEPO_MAIL, mailSentAt: "2026-07-09 10:30" }
];

type Store = { requests: RequestItem[] };
const globalStore = globalThis as typeof globalThis & { byksDemoStore?: Store };
const store = globalStore.byksDemoStore ?? { requests: initialRequests };
globalStore.byksDemoStore = store;

function cleanRequests() {
  store.requests = store.requests.filter((item) => item.product !== "Canli test" && item.destination !== "Canli Test Silinebilir");
}

function nextPo(items: RequestItem[]) {
  return `PO-2026-${String(items.filter((item) => item.po).length + 1).padStart(4, "0")}`;
}

function nextRequestId(items: RequestItem[]) {
  const numbers = items
    .map((item) => Number(item.id.match(/ST-2026-(\d+)/)?.[1] || 0))
    .filter((value) => Number.isFinite(value));
  return `ST-2026-${String(Math.max(0, ...numbers) + 1).padStart(4, "0")}`;
}

function mailTime() {
  return new Date().toLocaleString("tr-TR");
}

function autoSend(item: RequestItem, items: RequestItem[]): RequestItem {
  return {
    ...item,
    status: "Tedarikçiye gönderildi",
    po: item.po || nextPo(items),
    mailFrom: DEPO_MAIL,
    mailSentAt: mailTime(),
    note: `${item.note || ""}${item.note ? "\n" : ""}PO onay sonrası otomatik olarak info@byks.com.tr adresinden tedarikçiye gönderildi.`
  };
}

export async function GET() {
  cleanRequests();
  return NextResponse.json({ requests: store.requests });
}

export async function POST(request: Request) {
  cleanRequests();
  const body = await request.json().catch(() => null) as { type?: string; id?: string; status?: Status; item?: RequestItem } | null;
  if (!body?.type) return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });

  if (body.type === "create" && body.item) {
    const created = { ...body.item, id: nextRequestId(store.requests), status: "Hasan onayı bekliyor" as Status };
    store.requests = [created, ...store.requests];
    cleanRequests();
    return NextResponse.json({ requests: store.requests, createdId: created.id });
  }

  if (body.type === "status" && body.id && body.status) {
    store.requests = store.requests.map((item) => item.id === body.id ? { ...item, status: body.status as Status } : item);
    return NextResponse.json({ requests: store.requests });
  }

  if (body.type === "hasan-approve" && body.id) {
    store.requests = store.requests.map((item) => item.id === body.id ? { ...item, status: "Cem onayı bekliyor" } : item);
    return NextResponse.json({ requests: store.requests });
  }

  if (body.type === "cem-approve" && body.id) {
    store.requests = store.requests.map((item) => item.id === body.id ? autoSend(item, store.requests) : item);
    return NextResponse.json({ requests: store.requests });
  }

  if (body.type === "send" && body.id) {
    store.requests = store.requests.map((item) => item.id === body.id ? autoSend(item, store.requests) : item);
    return NextResponse.json({ requests: store.requests });
  }

  return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 400 });
}
