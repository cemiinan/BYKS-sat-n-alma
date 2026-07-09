"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Banknote,
  Boxes,
  Building2,
  Check,
  ClipboardCheck,
  FileClock,
  FileText,
  FilePlus2,
  Home,
  Link as LinkIcon,
  LogOut,
  Mail,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toLogoPurchasePayload } from "@/lib/logo-api";
import { canSendPurchaseOrder, sendPurchaseOrderMail } from "@/lib/mail-service";
import { buildNotifications, defaultNotificationSettings, getMenuBadges, notificationsForRole, priorityWeight, unreadCount } from "@/lib/notification-service";
import { downloadPurchaseOrderPdfMock } from "@/lib/pdf-service";
import { createPurchaseOrderFromRequest, suppliers } from "@/lib/purchase-order-service";
import type { AppNotification, NotificationChannelSettings, PurchaseOrder, PurchaseOrderStatus, PurchaseRequest, RequestStatus, RiskFlag, RiskLevel, Role, User } from "@/lib/types";

const users: User[] = [
  { id: "cem", name: "Cem", role: "Admin" },
  { id: "hasan", name: "Hasan", role: "Hasan" },
  { id: "personel", name: "Personel", role: "Personel" },
  { id: "depo", name: "Depo", role: "Depo" },
  { id: "muhasebe", name: "Muhasebe", role: "Muhasebe" }
];

const demoCredentials = [
  { username: "cem", password: "byks2026", userId: "cem" },
  { username: "hasan", password: "hasan2026", userId: "hasan" },
  { username: "personel", password: "personel2026", userId: "personel" },
  { username: "depo", password: "depo2026", userId: "depo" },
  { username: "muhasebe", password: "muhasebe2026", userId: "muhasebe" }
];

const locations = [
  { name: "Bodrum Ofis", defaultDestination: "Bodrum Ofis - Satın alma teslim noktası" },
  { name: "Bodrum Depo", defaultDestination: "Bodrum Depo - Mal kabul alanı" },
  { name: "İzmir Depo", defaultDestination: "İzmir Depo - Mal kabul alanı" }
];

const riskRules: Record<RiskFlag, { label: string; score: number }> = {
  newSupplier: { label: "Yeni tedarikçi", score: 40 },
  prepayment: { label: "Peşin ödeme", score: 30 },
  firstPurchase: { label: "İlk kez alınacak ürün", score: 30 },
  outOfBudget: { label: "Bütçe dışı alım", score: 30 },
  enoughStock: { label: "Stokta yeterli ürün varken yeni alım", score: 30 },
  urgent: { label: "Acil alım", score: 10 },
  shortTerm: { label: "Vadesi 30 günden kısa", score: 20 },
  priceIncrease: { label: "Son alış fiyatından %10’dan fazla pahalı", score: 25 }
};

const blankFlags = Object.fromEntries(Object.keys(riskRules).map((key) => [key, false])) as Record<RiskFlag, boolean>;

const seedRequests: PurchaseRequest[] = [
  {
    id: "req-1",
    requestNo: "BYKS-2026-001",
    requestDate: "2026-07-04",
    requester: "Personel",
    branch: "Bodrum Depo",
    productName: "Endüstriyel kahve makinesi yedek grubu",
    brandModel: "BYK-5000 / Grup seti",
    quantity: 2,
    unit: "Adet",
    unitPrice: 42000,
    currency: "TRY",
    exchangeRate: 1,
    exchangeRateDate: "2026-07-04",
    originalTotalAmount: 84000,
    tlInvoiceAmount: 84000,
    vatIncluded: true,
    totalAmount: 84000,
    supplier: "Anka Teknik",
    supplierEmail: "siparis@ankateknik.com",
    paymentTerm: "45 gün",
    dueDate: "2026-07-22",
    materialDestination: "Bodrum Depo - Teknik Servis Rafı",
    purpose: "Servis sürekliliği",
    projectCustomer: "Büyük müşteri bakım projesi",
    currentStock: 0,
    lastPurchasePrice: 39500,
    alternativeOffer: 88500,
    fileName: "anka-teklif.pdf",
    notes: "Hasarlı ünite değişimleri için.",
    status: "Hasan onayı bekliyor",
    riskFlags: { ...blankFlags, urgent: true },
    history: [{ date: "2026-07-04 10:15", user: "Personel", action: "Talep açtı" }]
  },
  {
    id: "req-2",
    requestNo: "BYKS-2026-002",
    requestDate: "2026-07-06",
    requester: "Personel",
    branch: "Bodrum Ofis",
    productName: "Soğutma ünitesi",
    brandModel: "Coldline C12",
    quantity: 1,
    unit: "Adet",
    unitPrice: 5600,
    currency: "USD",
    exchangeRate: 33.04,
    exchangeRateDate: "2026-07-06",
    originalTotalAmount: 5600,
    tlInvoiceAmount: 185000,
    vatIncluded: false,
    totalAmount: 185000,
    supplier: "Nova Soğutma",
    supplierEmail: "teklif@novasogutma.com",
    paymentTerm: "Peşin",
    dueDate: "2026-07-18",
    materialDestination: "Bodrum Ofis - Saha mutfak kurulum alanı",
    purpose: "Yeni müşteri kurulumu",
    projectCustomer: "Saha mutfak projesi",
    currentStock: 0,
    lastPurchasePrice: 155000,
    alternativeOffer: 179000,
    fileName: "nova-soğutma-teklif.jpg",
    notes: "Yeni tedarikçi ve peşin ödeme içeriyor.",
    status: "Cem onayı bekliyor",
    riskFlags: { ...blankFlags, newSupplier: true, prepayment: true, priceIncrease: true },
    history: [
      { date: "2026-07-06 09:40", user: "Personel", action: "Talep açtı" },
      { date: "2026-07-06 14:20", user: "Hasan", action: "Hasan onayladı" }
    ]
  },
  {
    id: "req-3",
    requestNo: "BYKS-2026-003",
    requestDate: "2026-07-07",
    requester: "Personel",
    branch: "Bodrum Depo",
    productName: "Ambalaj sarf seti",
    brandModel: "Standart koli + streç",
    quantity: 600,
    unit: "Paket",
    unitPrice: 470,
    currency: "TRY",
    exchangeRate: 1,
    exchangeRateDate: "2026-07-07",
    originalTotalAmount: 282000,
    tlInvoiceAmount: 282000,
    vatIncluded: true,
    totalAmount: 282000,
    supplier: "PaketPro",
    supplierEmail: "operasyon@paketpro.com",
    paymentTerm: "20 gün",
    dueDate: "2026-07-14",
    materialDestination: "Bodrum Depo - Ambalaj stok alanı",
    purpose: "Aylık operasyon tüketimi",
    projectCustomer: "Genel stok",
    currentStock: 80,
    lastPurchasePrice: 430,
    alternativeOffer: 291000,
    fileName: "paketpro.pdf",
    notes: "Nakit akışı kontrolü bekliyor.",
    status: "Nakit akışı kontrolü bekliyor",
    riskFlags: { ...blankFlags, shortTerm: true, urgent: true },
    history: [
      { date: "2026-07-07 11:05", user: "Personel", action: "Talep açtı" },
      { date: "2026-07-07 15:10", user: "Hasan", action: "Hasan onayladı" }
    ]
  },
  {
    id: "req-4",
    requestNo: "BYKS-2026-004",
    requestDate: "2026-07-02",
    requester: "Personel",
    branch: "İzmir Depo",
    productName: "Servis laptopları",
    brandModel: "ThinkBook 14",
    quantity: 4,
    unit: "Adet",
    unitPrice: 31500,
    currency: "TRY",
    exchangeRate: 1,
    exchangeRateDate: "2026-07-02",
    originalTotalAmount: 126000,
    tlInvoiceAmount: 126000,
    vatIncluded: true,
    totalAmount: 126000,
    supplier: "TeknoKurumsal",
    supplierEmail: "kurumsal@teknokurumsal.com",
    paymentTerm: "30 gün",
    dueDate: "2026-07-26",
    materialDestination: "İzmir Depo - BT teslim noktası",
    purpose: "Saha ekip yenileme",
    projectCustomer: "İç operasyon",
    currentStock: 1,
    lastPurchasePrice: 30200,
    alternativeOffer: 128500,
    fileName: "teknokurumsal.pdf",
    notes: "Onay sonrası siparişe dönüştürüldü.",
    status: "Siparişe dönüştürüldü",
    riskFlags: { ...blankFlags },
    history: [
      { date: "2026-07-02 13:00", user: "Personel", action: "Talep açtı" },
      { date: "2026-07-02 16:00", user: "Hasan", action: "Hasan onayladı" },
      { date: "2026-07-03 09:10", user: "Cem", action: "Cem onayladı" },
      { date: "2026-07-03 09:25", user: "Cem", action: "Siparişe dönüştürdü" }
    ]
  }
];

const menu = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "requests", label: "Talepler", icon: ShoppingCart },
  { key: "new", label: "Yeni Talep", icon: FilePlus2 },
  { key: "approval", label: "Onay", icon: ShieldCheck },
  { key: "orders", label: "Siparişler", icon: FileText },
  { key: "receiving", label: "Mal Kabul", icon: PackageCheck },
  { key: "finance", label: "Fatura / Ödeme", icon: ReceiptText },
  { key: "users", label: "Kullanıcılar", icon: Users }
] as const;

type Screen = (typeof menu)[number]["key"];

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}

function requestCurrency(request: PurchaseRequest) {
  return request.currency ?? "TRY";
}

function requestExchangeRate(request: PurchaseRequest) {
  return request.exchangeRate ?? 1;
}

function requestExchangeDate(request: PurchaseRequest) {
  return request.exchangeRateDate ?? request.requestDate;
}

function requestOriginalTotal(request: PurchaseRequest) {
  return request.originalTotalAmount ?? request.totalAmount;
}

function requestTlInvoiceTotal(request: PurchaseRequest) {
  return request.tlInvoiceAmount ?? request.totalAmount;
}

function currencyMoney(value: number, currency: string) {
  if (currency === "TRY") return money(value);
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

function riskInfo(request: Pick<PurchaseRequest, "riskFlags">) {
  const reasons = Object.entries(request.riskFlags)
    .filter(([, active]) => active)
    .map(([key]) => ({ key: key as RiskFlag, ...riskRules[key as RiskFlag] }));
  const baseScore = reasons.reduce((sum, reason) => sum + reason.score, 0);
  const forcedHighRisk = request.riskFlags.newSupplier && request.riskFlags.prepayment;
  const level: RiskLevel = forcedHighRisk || baseScore >= 50 ? "Yüksek Risk" : baseScore >= 30 ? "Orta Risk" : "Düşük Risk";
  return { score: baseScore, level, reasons, forcedHighRisk };
}

function nextStatusAfterHasan(request: PurchaseRequest): RequestStatus {
  const risk = riskInfo(request);
  if (request.totalAmount > 250000 || risk.score >= 70) return "Nakit akışı kontrolü bekliyor";
  if (request.totalAmount > 100000 || risk.score >= 50 || risk.forcedHighRisk) return "Cem onayı bekliyor";
  return "Onaylandı";
}

function riskClasses(level: RiskLevel) {
  if (level === "Yüksek Risk") return "bg-rose-100 text-rose-700 border-rose-200";
  if (level === "Orta Risk") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function statusClasses(status: RequestStatus) {
  if (status.includes("bekliyor")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "Reddedildi") return "bg-rose-50 text-rose-700 border-rose-100";
  if (status === "Revizyon istendi") return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === "Tamamlandı" || status === "Onaylandı") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function poStatusClasses(status: PurchaseOrderStatus) {
  if (status.includes("gönderildi") || status.includes("bekleniyor")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "İptal edildi" || status === "Revizyon istendi") return "bg-rose-50 text-rose-700 border-rose-100";
  if (status === "Teslim edildi" || status === "Tedarikçi onayladı") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "Gönderilmeye hazır") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

const poSourceStatuses: RequestStatus[] = ["Onaylandı", "Siparişe dönüştürüldü", "Mal kabul edildi", "Fatura girildi", "Ödeme planlandı", "Tamamlandı"];

function priorityClasses(priority: AppNotification["priority"]) {
  if (priority === "kritik") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "yüksek") return "border-orange-200 bg-orange-50 text-orange-700";
  if (priority === "orta") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function menuBadgeFor(key: Screen, badges: ReturnType<typeof getMenuBadges>) {
  if (key === "requests") return badges.requests;
  if (key === "approval") return badges.approval;
  if (key === "orders") return badges.orders;
  if (key === "finance") return badges.finance;
  return 0;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [requests, setRequests] = useState<PurchaseRequest[]>(seedRequests);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedId, setSelectedId] = useState(seedRequests[0]?.id);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<Record<Role, NotificationChannelSettings>>(defaultNotificationSettings);

  useEffect(() => {
    const saved = window.localStorage.getItem("byks-requests");
    if (saved) setRequests(JSON.parse(saved));
    const savedOrders = window.localStorage.getItem("byks-orders");
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    const savedReadNotifications = window.localStorage.getItem("byks-read-notifications");
    if (savedReadNotifications) setReadNotificationIds(JSON.parse(savedReadNotifications));
    const savedNotificationSettings = window.localStorage.getItem("byks-notification-settings");
    if (savedNotificationSettings) setNotificationSettings(JSON.parse(savedNotificationSettings));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("byks-requests", JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    window.localStorage.setItem("byks-orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    window.localStorage.setItem("byks-read-notifications", JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    window.localStorage.setItem("byks-notification-settings", JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    setOrders((existingOrders) => {
      const missingRequests = requests.filter((request) => poSourceStatuses.includes(request.status) && !existingOrders.some((order) => order.requestId === request.id));
      if (!missingRequests.length) return existingOrders;
      return missingRequests.reduce((items, request) => {
        const risk = riskInfo(request);
        return [...items, createPurchaseOrderFromRequest(request, items, { score: risk.score, level: risk.level }, "Sistem")];
      }, existingOrders);
    });
  }, [requests]);

  const selected = requests.find((request) => request.id === selectedId) ?? requests[0];
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const metrics = useMemo(() => buildMetrics(requests, orders), [requests, orders]);
  const isAdmin = currentUser?.role === "Admin";
  const visibleMenu = useMemo(() => menu.filter((item) => item.key !== "users" || isAdmin), [isAdmin]);
  const allNotifications = useMemo(() => buildNotifications(requests, orders, readNotificationIds), [requests, orders, readNotificationIds]);
  const userNotifications = useMemo(() => currentUser ? notificationsForRole(allNotifications, currentUser.role) : [], [allNotifications, currentUser]);
  const userUnreadCount = useMemo(() => unreadCount(userNotifications), [userNotifications]);
  const menuBadges = useMemo(() => getMenuBadges(requests, orders), [requests, orders]);

  useEffect(() => {
    if (screen === "users" && !isAdmin) setScreen("dashboard");
  }, [isAdmin, screen]);

  function updateRequest(id: string, updater: (request: PurchaseRequest) => PurchaseRequest) {
    setRequests((items) => items.map((item) => (item.id === id ? updater(item) : item)));
  }

  function transition(id: string, status: RequestStatus, action: string, note?: string) {
    const userName = currentUser?.name ?? "Sistem";
    updateRequest(id, (request) => ({
      ...request,
      status,
      history: [...request.history, { date: new Date().toLocaleString("tr-TR"), user: userName, action, note }]
    }));
  }

  function completeApproval(id: string, action: string) {
    const userName = currentUser?.name ?? "Sistem";
    const timestamp = new Date().toLocaleString("tr-TR");
    let approvedRequest: PurchaseRequest | undefined;
    setRequests((items) =>
      items.map((request) => {
        if (request.id !== id) return request;
        approvedRequest = {
          ...request,
          status: "Onaylandı",
          history: [...request.history, { date: timestamp, user: userName, action }]
        };
        return approvedRequest;
      })
    );
    if (approvedRequest) {
      setOrders((items) => {
        if (!approvedRequest || items.some((order) => order.requestId === approvedRequest?.id)) return items;
        const risk = riskInfo(approvedRequest);
        const order = createPurchaseOrderFromRequest(approvedRequest, items, { score: risk.score, level: risk.level }, userName, timestamp);
        setSelectedOrderId(order.id);
        return [...items, order];
      });
    }
  }

  function approveHasan(request: PurchaseRequest) {
    const nextStatus = nextStatusAfterHasan(request);
    if (nextStatus === "Onaylandı") completeApproval(request.id, "Hasan onayladı");
    else transition(request.id, nextStatus, "Hasan onayladı");
  }

  async function sendOrder(order: PurchaseOrder) {
    if (!currentUser || !canSendPurchaseOrder(order, currentUser)) return;
    const result = await sendPurchaseOrderMail(order);
    setOrders((items) =>
      items.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status: "Tedarikçi onayı bekleniyor",
              emailSentAt: result.sentAt,
              emailSentTo: result.to,
              auditLog: [...item.auditLog, { date: result.sentAt, user: currentUser.name, action: "PO tedarikçiye gönderildi", note: `${result.to} · ${result.subject}` }]
            }
          : item
      )
    );
  }

  function updateOrderStatus(order: PurchaseOrder, status: PurchaseOrderStatus, action: string) {
    const userName = currentUser?.name ?? "Sistem";
    setOrders((items) =>
      items.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status,
              supplierConfirmedAt: status === "Tedarikçi onayladı" ? new Date().toLocaleString("tr-TR") : item.supplierConfirmedAt,
              auditLog: [...item.auditLog, { date: new Date().toLocaleString("tr-TR"), user: userName, action }]
            }
          : item
      )
    );
  }

  function generatePdf(order: PurchaseOrder) {
    downloadPurchaseOrderPdfMock(order);
    const userName = currentUser?.name ?? "Sistem";
    setOrders((items) =>
      items.map((item) =>
        item.id === order.id
          ? {
              ...item,
              pdfGeneratedAt: new Date().toLocaleString("tr-TR"),
              auditLog: [...item.auditLog, { date: new Date().toLocaleString("tr-TR"), user: userName, action: "PO PDF oluşturuldu" }]
            }
          : item
      )
    );
  }

  function markNotificationRead(id: string) {
    setReadNotificationIds((items) => (items.includes(id) ? items : [...items, id]));
  }

  function markAllNotificationsRead() {
    setReadNotificationIds((items) => Array.from(new Set([...items, ...userNotifications.map((item) => item.id)])));
  }

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-2 md:inset-y-0 md:left-0 md:right-auto md:w-72 md:border-r md:border-t-0 md:p-5">
        <div className="mb-6 hidden md:block">
          <Image src="/byks-logo.jpg" alt="BYKS" width={290} height={122} className="h-14 w-auto rounded-md bg-white object-contain" priority />
          <div className="mt-1 text-sm text-slate-500">Satın Alma Onay Sistemi</div>
        </div>
        <nav className="grid grid-cols-4 gap-1 md:grid-cols-1 md:gap-2">
          {visibleMenu.map((item) => {
            const Icon = item.icon;
            const badge = menuBadgeFor(item.key, menuBadges);
            return (
              <button
                key={item.key}
                title={item.label}
                onClick={() => setScreen(item.key)}
                className={`flex h-12 items-center justify-center rounded-md text-slate-600 md:h-auto md:justify-start md:gap-3 md:px-3 md:py-3 ${
                  screen === item.key ? "bg-navy-800 text-white" : "hover:bg-slate-100"
                }`}
              >
                <Icon size={19} />
                <span className="hidden text-sm font-semibold md:inline">{item.label}</span>
                {badge > 0 && <span className="ml-auto min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[11px] font-bold text-white md:ml-auto">{badge}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="pb-24 md:ml-72 md:pb-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 md:hidden"><Image src="/byks-logo.jpg" alt="BYKS" width={290} height={122} className="h-8 w-auto rounded bg-white object-contain" /><span className="text-lg font-bold text-navy-900">Satın Alma</span></div>
              <div className="text-sm text-slate-500">{currentUser.name} · {currentUser.role}</div>
            </div>
            <div className="relative flex items-center gap-2">
              <button className="btn-secondary relative" onClick={() => setNotificationPanelOpen((open) => !open)} title="Bildirimler">
                <Bell size={16} />
                {userUnreadCount > 0 && <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">{userUnreadCount}</span>}
              </button>
              <button className="btn-secondary" onClick={() => setCurrentUser(null)}>
                <LogOut size={16} /> Çıkış
              </button>
              {notificationPanelOpen && (
                <NotificationPanel
                  notifications={userNotifications}
                  onRead={markNotificationRead}
                  onReadAll={markAllNotificationsRead}
                  onClose={() => setNotificationPanelOpen(false)}
                />
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {screen === "dashboard" && <Dashboard metrics={metrics} requests={requests} orders={orders} notifications={userNotifications} onSelect={(id) => { setSelectedId(id); setScreen("requests"); }} />}
          {screen === "requests" && <RequestsList requests={requests} selected={selected} onSelect={setSelectedId} onStatus={transition} />}
          {screen === "new" && <NewRequest onCreate={(request) => { setRequests((items) => [request, ...items]); setSelectedId(request.id); setScreen("requests"); }} />}
          {screen === "approval" && <ApprovalDesk requests={requests} user={currentUser} onSelect={(id) => { setSelectedId(id); setScreen("requests"); }} onStatus={transition} onHasan={approveHasan} onCem={(request) => completeApproval(request.id, "Cem onayladı")} />}
          {screen === "orders" && <OrdersPanel orders={orders} selected={selectedOrder} user={currentUser} onSelect={setSelectedOrderId} onSend={sendOrder} onPdf={generatePdf} onStatus={updateOrderStatus} />}
          {screen === "receiving" && <Receiving requests={requests} onStatus={transition} />}
          {screen === "finance" && <Finance requests={requests} onStatus={transition} onUpdate={updateRequest} />}
          {screen === "users" && <UsersPanel settings={notificationSettings} onSettingsChange={setNotificationSettings} />}
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credential = demoCredentials.find((item) => item.username === username.trim().toLocaleLowerCase("tr-TR") && item.password === password);
    const user = users.find((item) => item.id === credential?.userId);
    if (!user) {
      setError("Kullanıcı adı veya şifre hatalı.");
      return;
    }
    setError("");
    onLogin(user);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="panel w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/byks-logo.jpg" alt="BYKS" width={290} height={122} className="h-12 w-auto rounded-md bg-white object-contain" priority />
          <div>
            <h1 className="text-2xl font-bold text-navy-900">BYKS Satın Alma</h1>
            <p className="text-sm text-slate-500">Kullanıcı adı ve şifre ile giriş yapın</p>
          </div>
        </div>
        <form className="grid gap-3" onSubmit={submit}>
          <label>
            <span className="label">Kullanıcı adı</span>
            <input className="field" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="cem" autoComplete="username" />
          </label>
          <label>
            <span className="label">Şifre</span>
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </label>
          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>}
          <button className="btn-primary" type="submit">Giriş Yap</button>
        </form>
        <div className="mt-5 rounded-md bg-slate-50 p-3">
          <div className="mb-2 text-xs font-bold uppercase text-slate-500">Demo kullanıcıları</div>
          {demoCredentials.map((credential) => {
            const user = users.find((item) => item.id === credential.userId);
            return (
              <button key={credential.username} type="button" onClick={() => { setUsername(credential.username); setPassword(credential.password); }} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-white">
                <span className="font-semibold text-slate-700">{user?.name} · {credential.username}</span>
                <span className="text-xs text-slate-500">{credential.password}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function NotificationPanel({ notifications, onRead, onReadAll, onClose }: { notifications: AppNotification[]; onRead: (id: string) => void; onReadAll: () => void; onClose: () => void }) {
  return (
    <section className="absolute right-0 top-12 z-40 w-[min(92vw,420px)] rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-100 p-3">
        <div className="font-bold text-navy-900">Bildirimler</div>
        <div className="flex gap-2">
          <button className="text-xs font-semibold text-navy-800" onClick={onReadAll}>Tümünü okundu yap</button>
          <button className="text-xs font-semibold text-slate-500" onClick={onClose}>Kapat</button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto p-2">
        {notifications.map((item) => (
          <button key={item.id} onClick={() => onRead(item.id)} className={`mb-2 w-full rounded-md border p-3 text-left ${item.read ? "bg-white text-slate-600" : "bg-slate-50 text-slate-900 shadow-sm"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className={`text-sm ${item.read ? "font-semibold" : "font-bold"}`}>{item.title}</div>
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${priorityClasses(item.priority)}`}>{item.priority}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{item.recordType}</span>
              <span>{item.recordNo}</span>
              <span>{item.createdAt}</span>
            </div>
          </button>
        ))}
        {!notifications.length && <Empty text="Şu anda size ait bildirim yok." />}
      </div>
    </section>
  );
}

function UrgentActions({ notifications }: { notifications: AppNotification[] }) {
  const urgent = notifications.filter((item) => ["kritik", "yüksek", "orta"].includes(item.priority)).sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority)).slice(0, 6);
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy-900">Acil İşlemler</h2>
        <span className="text-sm text-slate-500">{urgent.length} uyarı</span>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {urgent.map((item) => (
          <div key={item.id} className={`rounded-md border p-3 ${priorityClasses(item.priority)}`}>
            <div className="flex items-start justify-between gap-2">
              <b className="text-sm">{item.title}</b>
              <span className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-bold">{item.priority}</span>
            </div>
            <p className="mt-1 text-sm">{item.description}</p>
          </div>
        ))}
      </div>
      {!urgent.length && <p className="text-sm text-slate-500">Acil işlem bulunmuyor.</p>}
    </section>
  );
}

function Dashboard({ metrics, requests, orders, notifications, onSelect }: { metrics: ReturnType<typeof buildMetrics>; requests: PurchaseRequest[]; orders: PurchaseOrder[]; notifications: AppNotification[]; onSelect: (id: string) => void }) {
  const cards = [
    ["Bekleyen Hasan", metrics.hasanPending, FileClock],
    ["Bekleyen Cem", metrics.cemPending, ShieldCheck],
    ["Nakit akışı", metrics.cashPending, Banknote],
    ["Yüksek risk", metrics.highRiskPending, AlertTriangle],
    ["Bu ay satın alma", money(metrics.monthTotal), ShoppingCart],
    ["Hazır PO", metrics.readyPo, FileText],
    ["Gönderilen PO", metrics.sentPo, Send],
    ["Tedarikçi onayı", metrics.supplierPendingPo, Mail],
    ["Sevkiyat bekleyen", metrics.shipmentPendingPo, Truck],
    ["Bu ay PO tutarı", money(metrics.monthPoTotal), ClipboardCheck],
    ["Peşin alımlar", metrics.prepayments, ClipboardCheck],
    ["Yeni tedarikçi", metrics.newSuppliers, Building2],
    ["Reddedilen", metrics.rejected, X]
  ] as const;
  return (
    <div className="space-y-6">
      <Title title="Dashboard" subtitle="Satın alma operasyonu, riskler ve ödeme takibi" />
      <UrgentActions notifications={notifications} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="panel p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <Icon className="text-navy-700" size={19} />
            </div>
            <div className="mt-3 text-2xl font-bold text-navy-900">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <MiniChart title="Lokasyon bazlı satın alma" rows={metrics.byBranch} />
        <MiniChart title="Tedarikçi bazlı satın alma" rows={metrics.bySupplier} />
        <MiniChart title="Risk dağılımı" rows={metrics.byRisk} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <DataPanel title="En çok risk oluşturan tedarikçiler" rows={metrics.riskySuppliers} />
        <DataPanel title="Vadesi yaklaşan ödemeler" rows={metrics.upcomingPayments} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <DataPanel title="En çok sipariş geçilen tedarikçiler" rows={metrics.topPoSuppliers} />
        <DataPanel title="Son PO hareketleri" rows={orders.slice(0, 5).map((order) => ({ label: order.poNumber, value: order.status }))} />
      </div>
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-4 font-bold text-navy-900">Yüksek riskli bekleyen talepler</div>
        <Table requests={requests.filter((request) => riskInfo(request).level === "Yüksek Risk" && request.status.includes("bekliyor"))} onSelect={onSelect} />
      </section>
    </div>
  );
}

function RequestsList({ requests, selected, onSelect, onStatus }: { requests: PurchaseRequest[]; selected?: PurchaseRequest; onSelect: (id: string) => void; onStatus: (id: string, status: RequestStatus, action: string, note?: string) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-4"><Title title="Satın Alma Talepleri" subtitle="Tablo görünümü ve canlı durum takibi" compact /></div>
        <Table requests={requests} onSelect={onSelect} />
      </section>
      {selected && <Detail request={selected} onStatus={onStatus} />}
    </div>
  );
}

function Detail({ request, onStatus }: { request: PurchaseRequest; onStatus: (id: string, status: RequestStatus, action: string, note?: string) => void }) {
  const risk = riskInfo(request);
  const logoPayload = toLogoPurchasePayload(request);
  const currency = requestCurrency(request);
  return (
    <aside className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900">{request.requestNo}</h2>
          <p className="text-sm text-slate-500">{request.productName}</p>
        </div>
        <Badge className={statusClasses(request.status)}>{request.status}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Info label="TL fatura karşılığı" value={money(requestTlInvoiceTotal(request))} />
        <Info label="Döviz toplamı" value={currencyMoney(requestOriginalTotal(request), currency)} />
        <Info label="Günlük kur" value={`${currency} / ${requestExchangeRate(request).toLocaleString("tr-TR")} · ${requestExchangeDate(request)}`} />
        <Info label="Risk puanı" value={`${risk.score} / ${risk.level}`} badge={riskClasses(risk.level)} />
        <Info label="Şube / depo" value={request.branch} />
        <Info label="Tedarikçi" value={request.supplier} />
        <Info label="Tedarikçi e-posta" value={request.supplierEmail ?? "Tedarikçi kartındaki e-posta"} />
        <Info label="Termin" value={request.dueDate} />
        <Info label="Vade" value={request.paymentTerm} />
        <Info label="Malzemenin gideceği yer" value={request.materialDestination ?? `${request.branch} teslimat adresi`} />
      </div>
      <Block title="Risk sebepleri">
        {risk.reasons.length ? risk.reasons.map((reason) => <div key={reason.key} className="flex justify-between text-sm"><span>{reason.label}</span><b>+{reason.score}</b></div>) : <p className="text-sm text-slate-500">Risk sebebi yok.</p>}
        {risk.forcedHighRisk && <p className="mt-2 text-sm font-semibold text-rose-700">Peşin ödeme + yeni tedarikçi otomatik yüksek risk.</p>}
      </Block>
      <Block title="Talep bilgileri">
        <p className="text-sm text-slate-600">{request.purpose}</p>
        <p className="mt-2 text-sm text-slate-500">Proje / müşteri: {request.projectCustomer}</p>
        <p className="text-sm text-slate-500">Ekli dosya: {request.fileName || "Yok"}</p>
        <p className="text-sm text-slate-500">Logo API hazır payload: {logoPayload.requestNo}</p>
      </Block>
      <Block title="Onay geçmişi">
        <div className="space-y-2">
          {request.history.map((entry, index) => (
            <div key={`${entry.date}-${index}`} className="rounded-md bg-slate-50 p-2 text-sm">
              <b>{entry.action}</b> · {entry.user}
              <div className="text-xs text-slate-500">{entry.date}</div>
              {entry.note && <div className="mt-1 text-slate-600">{entry.note}</div>}
            </div>
          ))}
        </div>
      </Block>
      <div className="mt-4 flex flex-wrap gap-2">
        {request.status === "Onaylandı" && <button className="btn-primary" onClick={() => onStatus(request.id, "Siparişe dönüştürüldü", "Siparişe dönüştürdü")}><Check size={16} /> Siparişe Dönüştür</button>}
      </div>
    </aside>
  );
}

function ApprovalDesk({ requests, user, onSelect, onStatus, onHasan, onCem }: { requests: PurchaseRequest[]; user: User; onSelect: (id: string) => void; onStatus: (id: string, status: RequestStatus, action: string, note?: string) => void; onHasan: (request: PurchaseRequest) => void; onCem: (request: PurchaseRequest) => void }) {
  const queue = requests.filter((request) => request.status === "Hasan onayı bekliyor" || request.status === "Cem onayı bekliyor" || request.status === "Nakit akışı kontrolü bekliyor");
  return (
    <section className="space-y-4">
      <Title title="Onay / Red / Revizyon" subtitle="Red ve revizyon işlemlerinde açıklama zorunludur" />
      <div className="grid gap-4">
        {queue.map((request) => <ApprovalCard key={request.id} request={request} user={user} onSelect={onSelect} onStatus={onStatus} onHasan={onHasan} onCem={onCem} />)}
      </div>
    </section>
  );
}

function ApprovalCard({ request, user, onSelect, onStatus, onHasan, onCem }: { request: PurchaseRequest; user: User; onSelect: (id: string) => void; onStatus: (id: string, status: RequestStatus, action: string, note?: string) => void; onHasan: (request: PurchaseRequest) => void; onCem: (request: PurchaseRequest) => void }) {
  const [note, setNote] = useState("");
  const risk = riskInfo(request);
  const canHasan = user.role === "Hasan" && request.status === "Hasan onayı bekliyor";
  const canCem = user.role === "Admin" && (request.status === "Cem onayı bekliyor" || request.status === "Nakit akışı kontrolü bekliyor");
  return (
    <article className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy-900">{request.requestNo} · {request.productName}</h3>
          <p className="text-sm text-slate-500">{money(request.totalAmount)} · Risk puanı: {risk.score} / {risk.level}</p>
        </div>
        <button className="btn-secondary" onClick={() => onSelect(request.id)}>Detay</button>
      </div>
      <textarea className="field mt-4 min-h-20" placeholder="Red veya revizyon açıklaması" value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        {canHasan && <button className="btn-primary" onClick={() => onHasan(request)}><BadgeCheck size={16} /> Hasan Onayla</button>}
        {canCem && <button className="btn-primary" onClick={() => onCem(request)}><BadgeCheck size={16} /> Cem Onayla</button>}
        <button className="btn-danger" disabled={!note.trim()} onClick={() => onStatus(request.id, "Reddedildi", "Reddedildi", note)}><X size={16} /> Reddet</button>
        <button className="btn-secondary" disabled={!note.trim()} onClick={() => onStatus(request.id, "Revizyon istendi", "Revizyon istedi", note)}><RefreshCw size={16} /> Revizyon İste</button>
      </div>
    </article>
  );
}

function OrdersPanel({
  orders,
  selected,
  user,
  onSelect,
  onSend,
  onPdf,
  onStatus
}: {
  orders: PurchaseOrder[];
  selected?: PurchaseOrder;
  user: User;
  onSelect: (id: string) => void;
  onSend: (order: PurchaseOrder) => void;
  onPdf: (order: PurchaseOrder) => void;
  onStatus: (order: PurchaseOrder, status: PurchaseOrderStatus, action: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_460px]">
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <Title title="Satın Alma Siparişleri" subtitle="Onaylanan taleplerden otomatik oluşan PO kayıtları" compact />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">PO</th><th className="px-4 py-3">Talep</th><th className="px-4 py-3">Tedarikçi</th><th className="px-4 py-3">Tutar</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Durum</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onSelect(order.id)}>
                  <td className="px-4 py-3"><b>{order.poNumber}</b><div className="text-slate-500">{order.orderDate}</div></td>
                  <td className="px-4 py-3">{order.requestNo}</td>
                  <td className="px-4 py-3">{order.supplier.companyName}</td>
                  <td className="px-4 py-3 font-semibold">{money(order.grandTotal)}</td>
                  <td className="px-4 py-3"><Badge className={riskClasses(order.riskLevel)}>{order.riskScore} / {order.riskLevel}</Badge></td>
                  <td className="px-4 py-3"><Badge className={poStatusClasses(order.status)}>{order.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <Empty text="Henüz PO oluşmadı. Onaylanan talepler otomatik burada görünür." />}
        </div>
      </section>
      {selected && <OrderDetail order={selected} user={user} onSend={onSend} onPdf={onPdf} onStatus={onStatus} />}
    </div>
  );
}

function OrderDetail({ order, user, onSend, onPdf, onStatus }: { order: PurchaseOrder; user: User; onSend: (order: PurchaseOrder) => void; onPdf: (order: PurchaseOrder) => void; onStatus: (order: PurchaseOrder, status: PurchaseOrderStatus, action: string) => void }) {
  const canSend = canSendPurchaseOrder(order, user) && order.status === "Gönderilmeye hazır";
  const totals = [
    ["Ara toplam", order.subtotal],
    ["KDV", order.vatAmount],
    ["Genel toplam", order.grandTotal]
  ] as const;
  return (
    <aside className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy-900">{order.poNumber}</h2>
          <p className="text-sm text-slate-500">{order.requestNo} · {order.supplier.companyName}</p>
        </div>
        <Badge className={poStatusClasses(order.status)}>{order.status}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Info label="Risk puanı" value={`${order.riskScore} / ${order.riskLevel}`} badge={riskClasses(order.riskLevel)} />
        <Info label="Termin tarihi" value={order.dueDate} />
        <Info label="Vade" value={order.paymentTerm} />
        <Info label="KDV durumu" value={order.vatIncluded ? "KDV dahil" : "KDV hariç"} />
        <Info label="Kur" value={`${order.currency ?? "TRY"} / ${(order.exchangeRate ?? 1).toLocaleString("tr-TR")} · ${order.exchangeRateDate ?? order.orderDate}`} />
        <Info label="TL fatura karşılığı" value={money(order.tlInvoiceAmount ?? order.grandTotal)} />
      </div>
      <Block title="Tedarikçi kartı">
        <div className="grid gap-2 text-sm text-slate-600">
          <div><b>{order.supplier.companyName}</b> · {order.supplier.contactPerson}</div>
          <div>{order.supplier.email} · {order.supplier.phone}</div>
          <div>{order.supplier.taxOffice} / {order.supplier.taxNumber}</div>
          <div>{order.supplier.address}</div>
          <div>Teslimat şartı: {order.supplier.deliveryTerm}</div>
          <div>Not: {order.supplier.notes}</div>
        </div>
      </Block>
      <Block title="Ürünler">
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={`${order.id}-${item.productName}`} className="rounded-md bg-slate-50 p-3 text-sm">
              <b>{item.productName}</b>
              <div className="text-slate-500">{item.brandModel}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                <span>{item.quantity} {item.unit}</span>
                <span>{currencyMoney(item.unitPriceOriginal ?? item.unitPrice, order.currency ?? "TRY")}</span>
                <span>{money(item.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </Block>
      <Block title="Tutarlar">
        {totals.map(([label, value]) => <div key={label} className="flex justify-between text-sm"><span>{label}</span><b>{money(value)}</b></div>)}
      </Block>
      <Block title="Teslimat ve not">
        <p className="text-sm text-slate-600">{order.deliveryAddress}</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">Malzemenin gideceği yer: {order.materialDestination ?? order.deliveryAddress}</p>
        <p className="mt-2 text-sm text-slate-500">{order.orderNote}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-navy-800"><LinkIcon size={14} /> {order.supplierPortalLink}</p>
      </Block>
      <Block title="Mail taslağı">
        {order.emailDraft ? (
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <b>{order.emailDraft.subject}</b>
            <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-slate-600">{order.emailDraft.body}</pre>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Mail, personelin talepte tanımladığı tedarikçi e-posta adresine gönderilir: {order.supplier.email}</p>
        )}
      </Block>
      <Block title="Onay ve audit geçmişi">
        <div className="space-y-2">
          {[...order.approvalHistory, ...order.auditLog].map((entry, index) => (
            <div key={`${entry.date}-${index}`} className="rounded-md bg-slate-50 p-2 text-sm">
              <b>{entry.action}</b> · {entry.user}
              <div className="text-xs text-slate-500">{entry.date}</div>
              {entry.note && <div className="mt-1 text-slate-600">{entry.note}</div>}
            </div>
          ))}
        </div>
      </Block>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => onPdf(order)}><FileText size={16} /> PDF Aç / İndir</button>
        <button className="btn-primary" disabled={!canSend} onClick={() => onSend(order)}><Send size={16} /> Tedarikçiye Gönder</button>
        {order.status === "Tedarikçi onayı bekleniyor" && <button className="btn-secondary" onClick={() => onStatus(order, "Tedarikçi onayladı", "Tedarikçi teyidi kaydedildi")}><Check size={16} /> Tedarikçi Onayladı</button>}
        {order.status === "Tedarikçi onayladı" && <button className="btn-secondary" onClick={() => onStatus(order, "Sevkiyat hazırlanıyor", "Sevkiyat hazırlanıyor")}><Truck size={16} /> Sevkiyat</button>}
        {order.status === "Sevkiyat hazırlanıyor" && <button className="btn-secondary" onClick={() => onStatus(order, "Yolda", "Sipariş yola çıktı")}><Truck size={16} /> Yolda</button>}
        {order.status === "Yolda" && <button className="btn-secondary" onClick={() => onStatus(order, "Teslim edildi", "Teslim edildi")}><PackageCheck size={16} /> Teslim Edildi</button>}
      </div>
      {!canSend && order.status === "Gönderilmeye hazır" && (
        <p className="mt-3 text-sm text-amber-700">Bu PO için gönderim yetkisi mevcut kullanıcıda değil veya tedarikçi e-posta adresi eksik.</p>
      )}
    </aside>
  );
}

function Receiving({ requests, onStatus }: { requests: PurchaseRequest[]; onStatus: (id: string, status: RequestStatus, action: string, note?: string) => void }) {
  const items = requests.filter((request) => request.status === "Siparişe dönüştürüldü");
  return <ActionList title="Mal Kabul" subtitle="Depo rolü onaylı siparişleri teslim alır" empty="Mal kabul bekleyen sipariş yok." requests={items} actionLabel="Mal Kabul Edildi" onAction={(request) => onStatus(request.id, "Mal kabul edildi", "Mal kabul etti")} />;
}

function Finance({ requests, onStatus, onUpdate }: { requests: PurchaseRequest[]; onStatus: (id: string, status: RequestStatus, action: string, note?: string) => void; onUpdate: (id: string, updater: (request: PurchaseRequest) => PurchaseRequest) => void }) {
  const items = requests.filter((request) => ["Mal kabul edildi", "Fatura girildi", "Ödeme planlandı"].includes(request.status));
  return (
    <section className="space-y-4">
      <Title title="Fatura ve Ödeme Takibi" subtitle="Fatura girişi, ödeme planlama ve tamamlanma adımları" />
      {items.map((request) => (
        <article key={request.id} className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><b className="text-navy-900">{request.requestNo}</b><p className="text-sm text-slate-500">{request.supplier} · {money(request.totalAmount)}</p></div>
            <Badge className={statusClasses(request.status)}>{request.status}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="field" placeholder="Fatura no" value={request.invoiceNo ?? ""} onChange={(event) => onUpdate(request.id, (item) => ({ ...item, invoiceNo: event.target.value }))} />
            <input className="field" type="date" value={request.paymentDate ?? ""} onChange={(event) => onUpdate(request.id, (item) => ({ ...item, paymentDate: event.target.value }))} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {request.status === "Mal kabul edildi" && <button className="btn-primary" onClick={() => onStatus(request.id, "Fatura girildi", "Fatura girdi")}>Fatura Girildi</button>}
            {request.status === "Fatura girildi" && <button className="btn-primary" onClick={() => onStatus(request.id, "Ödeme planlandı", "Ödeme planladı")}>Ödeme Planlandı</button>}
            {request.status === "Ödeme planlandı" && <button className="btn-primary" onClick={() => onStatus(request.id, "Tamamlandı", "Ödeme tamamladı")}>Tamamlandı</button>}
          </div>
        </article>
      ))}
      {!items.length && <Empty text="Muhasebe takibi bekleyen kayıt yok." />}
    </section>
  );
}

function NewRequest({ onCreate }: { onCreate: (request: PurchaseRequest) => void }) {
  const [form, setForm] = useState({
    requester: "Personel", branch: "Bodrum Depo", productName: "", brandModel: "", quantity: 1, unit: "Adet", unitPrice: 0, vatIncluded: true,
    currency: "TRY", exchangeRate: 1, exchangeRateDate: new Date().toISOString().slice(0, 10), supplier: "", supplierEmail: "", paymentTerm: "30 gün", dueDate: "",
    materialDestination: "Bodrum Depo - Mal kabul alanı", purpose: "", projectCustomer: "", currentStock: 0, lastPurchasePrice: 0, alternativeOffer: 0, fileName: "", notes: ""
  });
  const [flags, setFlags] = useState<Record<RiskFlag, boolean>>(blankFlags);
  const originalTotalAmount = Number(form.quantity) * Number(form.unitPrice);
  const effectiveRate = form.currency === "TRY" ? 1 : Number(form.exchangeRate || 1);
  const totalAmount = originalTotalAmount * effectiveRate;
  const preview = riskInfo({ riskFlags: flags });
  function submit() {
    const nextNo = `BYKS-2026-${String(Date.now()).slice(-4)}`;
    onCreate({
      ...form,
      id: crypto.randomUUID(),
      requestNo: nextNo,
      requestDate: new Date().toISOString().slice(0, 10),
      currency: form.currency as PurchaseRequest["currency"],
      exchangeRate: effectiveRate,
      exchangeRateDate: form.exchangeRateDate,
      originalTotalAmount,
      tlInvoiceAmount: totalAmount,
      totalAmount,
      status: "Hasan onayı bekliyor",
      riskFlags: flags,
      history: [{ date: new Date().toLocaleString("tr-TR"), user: form.requester, action: "Talep açtı" }]
    });
  }
  return (
    <section className="space-y-4">
      <Title title="Yeni Talep Oluştur" subtitle="Talep kaydedildiğinde durum otomatik Hasan onayı bekliyor olur" />
      <div className="panel p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {textFields.map(([key, label, type]) => (
            <label key={key}>
              <span className="label">{label}</span>
              {key === "currency" ? (
                <select className="field" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              ) : key === "branch" ? (
                <select
                  className="field"
                  value={form.branch}
                  onChange={(event) => {
                    const location = locations.find((item) => item.name === event.target.value);
                    setForm({ ...form, branch: event.target.value, materialDestination: location?.defaultDestination ?? form.materialDestination });
                  }}
                >
                  {locations.map((location) => <option key={location.name} value={location.name}>{location.name}</option>)}
                </select>
              ) : (
                <input className="field" type={type ?? "text"} value={String(form[key as keyof typeof form])} onChange={(event) => setForm({ ...form, [key]: type === "number" ? Number(event.target.value) : event.target.value })} />
              )}
            </label>
          ))}
          <label><span className="label">KDV</span><select className="field" value={form.vatIncluded ? "yes" : "no"} onChange={(event) => setForm({ ...form, vatIncluded: event.target.value === "yes" })}><option value="yes">KDV dahil</option><option value="no">KDV hariç</option></select></label>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {Object.entries(riskRules).map(([key, rule]) => (
            <label key={key} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span>{rule.label} <b className="text-slate-500">+{rule.score}</b></span>
              <input type="checkbox" checked={flags[key as RiskFlag]} onChange={(event) => setFlags({ ...flags, [key]: event.target.checked })} />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-navy-50 p-4">
          <div>
            <b>TL fatura karşılığı: {money(totalAmount)}</b>
            <div className="text-sm text-slate-600">Döviz toplamı: {currencyMoney(originalTotalAmount, form.currency)} · Kur: {effectiveRate.toLocaleString("tr-TR")}</div>
            <div className="text-sm text-slate-600">Risk puanı: {preview.score} / {preview.level}</div>
          </div>
          <button className="btn-primary" disabled={!form.productName || !form.supplier || !totalAmount} onClick={submit}><FilePlus2 size={16} /> Talebi Aç</button>
        </div>
      </div>
    </section>
  );
}

const textFields: [string, string, string?][] = [
  ["requester", "Talep eden kişi"], ["branch", "Şube / depo"], ["productName", "Ürün adı"], ["brandModel", "Marka / model"],
  ["quantity", "Miktar", "number"], ["unit", "Birim"], ["unitPrice", "Birim fiyat", "number"], ["currency", "Para birimi"], ["exchangeRate", "Günlük kur", "number"], ["exchangeRateDate", "Kur tarihi", "date"],
  ["supplier", "Tedarikçi"], ["supplierEmail", "Tedarikçi e-posta"], ["paymentTerm", "Vade"], ["dueDate", "Termin tarihi", "date"], ["materialDestination", "Malzemenin gideceği yer"], ["purpose", "Kullanım amacı"], ["projectCustomer", "Proje / müşteri"],
  ["currentStock", "Mevcut stok", "number"], ["lastPurchasePrice", "Son alış fiyatı", "number"], ["alternativeOffer", "Alternatif fiyat", "number"],
  ["fileName", "Dosya veya teklif görseli"], ["notes", "Notlar"]
];

function UsersPanel({ settings, onSettingsChange }: { settings: Record<Role, NotificationChannelSettings>; onSettingsChange: (settings: Record<Role, NotificationChannelSettings>) => void }) {
  function toggle(role: Role, key: keyof NotificationChannelSettings) {
    onSettingsChange({
      ...settings,
      [role]: {
        ...settings[role],
        [key]: !settings[role][key]
      }
    });
  }
  return (
    <section className="space-y-4">
      <Title title="Kullanıcı ve Yetki Yönetimi" subtitle="Demo rolleri ve işlem kapsamları" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => <div key={user.id} className="panel p-4"><div className="font-bold text-navy-900">{user.name}</div><div className="text-sm text-slate-500">{user.role}</div><p className="mt-3 text-sm text-slate-600">{roleText(user.role)}</p></div>)}
      </div>
      <Title title="Tedarikçi Kartları" subtitle="PO mail ve teslimat bilgileri bu kartlardan beslenir" />
      <div className="grid gap-3 md:grid-cols-2">
        {suppliers.map((supplier) => (
          <article key={supplier.id} className="panel p-4">
            <div className="font-bold text-navy-900">{supplier.companyName}</div>
            <div className="mt-2 grid gap-1 text-sm text-slate-600">
              <span>{supplier.contactPerson} · {supplier.email}</span>
              <span>{supplier.phone}</span>
              <span>{supplier.taxOffice} / {supplier.taxNumber}</span>
              <span>{supplier.address}</span>
              <span>Vade: {supplier.paymentTerm} · Teslimat: {supplier.deliveryTerm}</span>
              <span>{supplier.notes}</span>
            </div>
          </article>
        ))}
      </div>
      <Title title="Bildirim Ayarları" subtitle="İleride Firebase Cloud Messaging, OneSignal, e-posta ve SMS/WhatsApp entegrasyonuna hazır kanal tercihleri" />
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Kullanıcı rolü</th><th className="px-4 py-3">Uygulama içi</th><th className="px-4 py-3">E-posta</th><th className="px-4 py-3">Mobil push</th><th className="px-4 py-3">Kritik SMS/WhatsApp</th><th className="px-4 py-3">Cihaz token alanı</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold text-navy-900">{user.name} · {user.role}</td>
                  {(["inApp", "email", "mobilePush", "criticalSmsWhatsapp"] as const).map((key) => (
                    <td key={key} className="px-4 py-3"><input type="checkbox" checked={settings[user.role][key]} onChange={() => toggle(user.role, key)} /></td>
                  ))}
                  <td className="px-4 py-3 text-xs text-slate-500">future-fcm-token:{user.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function roleText(role: Role) {
  return {
    Admin: "Nihai onay, yüksek risk, siparişe dönüştürme ve kullanıcı yönetimi.",
    Hasan: "100.000 TL altı tek onay, üzerindeki işlemlerde ön onay.",
    Personel: "Satın alma talebi açar, tedarikçi e-postasını tanımlar ve onay sonrası PO mailini gönderir.",
    Depo: "Sipariş sonrası mal kabul sürecini tamamlar.",
    Muhasebe: "Fatura, ödeme planı ve tamamlanma durumlarını yönetir."
  }[role];
}

function ActionList({ title, subtitle, empty, requests, actionLabel, onAction }: { title: string; subtitle: string; empty: string; requests: PurchaseRequest[]; actionLabel: string; onAction: (request: PurchaseRequest) => void }) {
  return (
    <section className="space-y-4">
      <Title title={title} subtitle={subtitle} />
      {requests.map((request) => <article key={request.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4"><div><b className="text-navy-900">{request.requestNo}</b><p className="text-sm text-slate-500">{request.productName} · {request.branch}</p></div><button className="btn-primary" onClick={() => onAction(request)}><Boxes size={16} /> {actionLabel}</button></article>)}
      {!requests.length && <Empty text={empty} />}
    </section>
  );
}

function Table({ requests, onSelect }: { requests: PurchaseRequest[]; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Talep</th><th className="px-4 py-3">Tedarikçi</th><th className="px-4 py-3">Tutar</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Durum</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((request) => {
            const risk = riskInfo(request);
            return <tr key={request.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onSelect(request.id)}><td className="px-4 py-3"><b>{request.requestNo}</b><div className="text-slate-500">{request.productName}</div></td><td className="px-4 py-3">{request.supplier}</td><td className="px-4 py-3 font-semibold">{money(request.totalAmount)}</td><td className="px-4 py-3"><Badge className={riskClasses(risk.level)}>{risk.score} / {risk.level}</Badge></td><td className="px-4 py-3"><Badge className={statusClasses(request.status)}>{request.status}</Badge></td></tr>;
          })}
        </tbody>
      </table>
      {!requests.length && <Empty text="Kayıt bulunamadı." />}
    </div>
  );
}

function buildMetrics(requests: PurchaseRequest[], orders: PurchaseOrder[]) {
  const currentMonth = "2026-07";
  const approvedLike = requests.filter((request) => !["Reddedildi", "Revizyon istendi"].includes(request.status));
  const group = (getter: (request: PurchaseRequest) => string) => Object.entries(approvedLike.reduce<Record<string, number>>((acc, request) => {
    acc[getter(request)] = (acc[getter(request)] ?? 0) + request.totalAmount;
    return acc;
  }, {})).map(([label, value]) => ({ label, value: money(value), raw: value })).sort((a, b) => b.raw - a.raw).slice(0, 5);
  const orderGroup = (getter: (order: PurchaseOrder) => string) => Object.entries(orders.reduce<Record<string, number>>((acc, order) => {
    acc[getter(order)] = (acc[getter(order)] ?? 0) + order.grandTotal;
    return acc;
  }, {})).map(([label, value]) => ({ label, value: money(value), raw: value })).sort((a, b) => b.raw - a.raw).slice(0, 5);
  const risky = requests.map((request) => ({ request, risk: riskInfo(request) }));
  return {
    hasanPending: requests.filter((request) => request.status === "Hasan onayı bekliyor").length,
    cemPending: requests.filter((request) => request.status === "Cem onayı bekliyor").length,
    cashPending: requests.filter((request) => request.status === "Nakit akışı kontrolü bekliyor").length,
    highRiskPending: risky.filter(({ request, risk }) => risk.level === "Yüksek Risk" && request.status.includes("bekliyor")).length,
    monthTotal: approvedLike.filter((request) => request.requestDate.startsWith(currentMonth)).reduce((sum, request) => sum + request.totalAmount, 0),
    prepayments: requests.filter((request) => request.riskFlags.prepayment).length,
    newSuppliers: requests.filter((request) => request.riskFlags.newSupplier).length,
    rejected: requests.filter((request) => request.status === "Reddedildi").length,
    readyPo: orders.filter((order) => order.status === "Gönderilmeye hazır").length,
    sentPo: orders.filter((order) => ["Tedarikçiye gönderildi", "Tedarikçi onayı bekleniyor", "Tedarikçi onayladı", "Sevkiyat hazırlanıyor", "Kısmi sevkiyat", "Yolda", "Teslim edildi"].includes(order.status)).length,
    supplierPendingPo: orders.filter((order) => order.status === "Tedarikçi onayı bekleniyor").length,
    shipmentPendingPo: orders.filter((order) => ["Tedarikçi onayladı", "Sevkiyat hazırlanıyor"].includes(order.status)).length,
    monthPoTotal: orders.filter((order) => order.orderDate.startsWith(currentMonth)).reduce((sum, order) => sum + order.grandTotal, 0),
    byBranch: group((request) => request.branch),
    bySupplier: group((request) => request.supplier),
    byRisk: Object.entries(risky.reduce<Record<string, number>>((acc, item) => {
      acc[item.risk.level] = (acc[item.risk.level] ?? 0) + item.request.totalAmount;
      return acc;
    }, {})).map(([label, value]) => ({ label, value: money(value) })),
    riskySuppliers: group((request) => request.supplier).filter((row) => requests.some((request) => request.supplier === row.label && riskInfo(request).score > 0)),
    upcomingPayments: requests.filter((request) => request.paymentDate || request.status === "Ödeme planlandı").map((request) => ({ label: request.supplier, value: request.paymentDate ?? request.dueDate })).slice(0, 5),
    topPoSuppliers: orderGroup((order) => order.supplier.companyName)
  };
}

function MiniChart({ title, rows }: { title: string; rows: { label: string; value: string; raw?: number }[] }) {
  const max = Math.max(...rows.map((row) => row.raw ?? 1), 1);
  return <section className="panel p-4"><h3 className="font-bold text-navy-900">{title}</h3><div className="mt-4 space-y-3">{rows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between text-sm"><span>{row.label}</span><b>{row.value}</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-navy-700" style={{ width: `${Math.max(((row.raw ?? 1) / max) * 100, 12)}%` }} /></div></div>)}</div></section>;
}

function DataPanel({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return <section className="panel p-4"><h3 className="font-bold text-navy-900">{title}</h3><div className="mt-3 divide-y divide-slate-100">{rows.map((row) => <div key={`${row.label}-${row.value}`} className="flex justify-between py-2 text-sm"><span>{row.label}</span><b>{row.value}</b></div>)}</div>{!rows.length && <p className="mt-3 text-sm text-slate-500">Kayıt yok.</p>}</section>;
}

function Title({ title, subtitle, compact }: { title: string; subtitle: string; compact?: boolean }) {
  return <div><h1 className={`${compact ? "text-lg" : "text-2xl"} font-bold text-navy-900`}>{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>;
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function Info({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 text-sm font-bold ${badge ? `inline-flex rounded-md border px-2 py-1 ${badge}` : "text-slate-800"}`}>{value}</div></div>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-4 border-t border-slate-100 pt-4"><h3 className="mb-2 font-bold text-navy-900">{title}</h3>{children}</section>;
}

function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-slate-500">{text}</div>;
}
