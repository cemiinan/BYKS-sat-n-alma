import type { AppNotification, NotificationChannelSettings, PurchaseOrder, PurchaseRequest, Role } from "./types";

export const defaultNotificationSettings: Record<Role, NotificationChannelSettings> = {
  Admin: { inApp: true, email: true, mobilePush: false, criticalSmsWhatsapp: true },
  Hasan: { inApp: true, email: true, mobilePush: false, criticalSmsWhatsapp: false },
  Personel: { inApp: true, email: true, mobilePush: false, criticalSmsWhatsapp: false },
  Depo: { inApp: true, email: false, mobilePush: false, criticalSmsWhatsapp: false },
  Muhasebe: { inApp: true, email: true, mobilePush: false, criticalSmsWhatsapp: true }
};

function nowLabel() {
  return new Date().toLocaleString("tr-TR");
}

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function notification(id: string, readIds: string[], data: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification {
  return {
    id,
    read: readIds.includes(id),
    createdAt: nowLabel(),
    ...data
  };
}

export function buildNotifications(requests: PurchaseRequest[], orders: PurchaseOrder[], readIds: string[]): AppNotification[] {
  const items: AppNotification[] = [];
  const hasanPending = requests.filter((request) => request.status === "Hasan onayı bekliyor");
  const cemPending = requests.filter((request) => request.status === "Cem onayı bekliyor");
  const cashPending = requests.filter((request) => request.status === "Nakit akışı kontrolü bekliyor");
  const revisions = requests.filter((request) => request.status === "Revizyon istendi");
  const rejected = requests.filter((request) => request.status === "Reddedildi");
  const readyOrders = orders.filter((order) => order.status === "Gönderilmeye hazır");
  const sentOrders = orders.filter((order) => order.status === "Tedarikçi onayı bekleniyor");
  const shipmentOrders = orders.filter((order) => ["Tedarikçi onayladı", "Sevkiyat hazırlanıyor", "Yolda"].includes(order.status));
  const upcomingPayments = requests.filter((request) => {
    const remaining = daysUntil(request.paymentDate ?? request.dueDate);
    return ["Fatura girildi", "Ödeme planlandı", "Mal kabul edildi"].includes(request.status) && remaining >= 0 && remaining <= 7;
  });

  if (hasanPending.length) {
    items.push(notification("hasan-pending-approval", readIds, {
      title: "Hasan onayınızı bekleyen talepler var",
      description: `Hasan onayınızı bekleyen ${hasanPending.length} satın alma talebi var.`,
      recordType: "Talep",
      recordNo: `${hasanPending.length} kayıt`,
      priority: hasanPending.some((request) => request.totalAmount > 100000) ? "yüksek" : "orta",
      visibleTo: ["Hasan"]
    }));
  }

  if (cemPending.length) {
    const highRiskCount = cemPending.filter((request) => request.totalAmount > 100000 || request.riskFlags.newSupplier || request.riskFlags.prepayment).length;
    items.push(notification("cem-pending-approval", readIds, {
      title: "Cem onayınızı bekleyen talepler var",
      description: `Cem onayınızı bekleyen ${cemPending.length} talep var. ${highRiskCount} tanesi yüksek riskli veya nihai onay gerektiriyor.`,
      recordType: "Talep",
      recordNo: `${cemPending.length} kayıt`,
      priority: highRiskCount ? "kritik" : "yüksek",
      visibleTo: ["Admin"]
    }));
  }

  if (cashPending.length) {
    items.push(notification("cash-flow-pending", readIds, {
      title: "Nakit akışı kontrolü bekleniyor",
      description: `${cashPending.length} talep nakit akışı kontrolü bekliyor.`,
      recordType: "Talep",
      recordNo: `${cashPending.length} kayıt`,
      priority: "kritik",
      visibleTo: ["Admin", "Muhasebe"]
    }));
  }

  readyOrders.forEach((order) => {
    items.push(notification(`po-ready-${order.id}`, readIds, {
      title: `${order.poNumber} gönderilmeyi bekliyor`,
      description: `${order.supplier.companyName} için PO tedarikçiye gönderilmeye hazır.`,
      recordType: "PO",
      recordNo: order.poNumber,
      priority: order.riskLevel === "Yüksek Risk" ? "kritik" : "orta",
      visibleTo: ["Admin", "Hasan", "Personel"]
    }));
  });

  sentOrders.forEach((order) => {
    items.push(notification(`po-supplier-confirm-${order.id}`, readIds, {
      title: `${order.poNumber} tedarikçi teyidi bekliyor`,
      description: `${order.supplier.companyName} sipariş teyidi henüz gelmedi.`,
      recordType: "PO",
      recordNo: order.poNumber,
      priority: "orta",
      visibleTo: ["Admin", "Personel"]
    }));
  });

  if (shipmentOrders.length) {
    items.push(notification("warehouse-receiving", readIds, {
      title: "Mal kabul takibi gerekiyor",
      description: `${shipmentOrders.length} PO için sevkiyat veya teslimat takibi bekleniyor.`,
      recordType: "Mal Kabul",
      recordNo: `${shipmentOrders.length} PO`,
      priority: "orta",
      visibleTo: ["Depo", "Admin"]
    }));
  }

  if (upcomingPayments.length) {
    items.push(notification("upcoming-payments", readIds, {
      title: "Yaklaşan ödeme vadeleri var",
      description: `${upcomingPayments.length} ödeme vadesi bu hafta doluyor.`,
      recordType: "Ödeme",
      recordNo: `${upcomingPayments.length} kayıt`,
      priority: upcomingPayments.some((request) => daysUntil(request.paymentDate ?? request.dueDate) <= 2) ? "kritik" : "yüksek",
      visibleTo: ["Muhasebe", "Admin"]
    }));
  }

  revisions.forEach((request) => {
    items.push(notification(`revision-${request.id}`, readIds, {
      title: `${request.requestNo} revizyon için geri gönderildi`,
      description: `${request.productName} talebiniz için revizyon istendi.`,
      recordType: "Talep",
      recordNo: request.requestNo,
      priority: "orta",
      visibleTo: ["Personel"]
    }));
  });

  rejected.forEach((request) => {
    items.push(notification(`rejected-${request.id}`, readIds, {
      title: `${request.requestNo} reddedildi`,
      description: `${request.productName} talebiniz reddedildi.`,
      recordType: "Talep",
      recordNo: request.requestNo,
      priority: "yüksek",
      visibleTo: ["Personel"]
    }));
  });

  return items.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));
}

export function notificationsForRole(notifications: AppNotification[], role: Role) {
  return notifications.filter((item) => item.visibleTo.includes(role));
}

export function unreadCount(notifications: AppNotification[]) {
  return notifications.filter((item) => !item.read).length;
}

export function priorityWeight(priority: AppNotification["priority"]) {
  return { düşük: 1, orta: 2, yüksek: 3, kritik: 4 }[priority];
}

export function getMenuBadges(requests: PurchaseRequest[], orders: PurchaseOrder[]) {
  const upcomingPayments = requests.filter((request) => {
    const remaining = daysUntil(request.paymentDate ?? request.dueDate);
    return ["Fatura girildi", "Ödeme planlandı", "Mal kabul edildi"].includes(request.status) && remaining >= 0 && remaining <= 7;
  }).length;
  return {
    requests: requests.filter((request) => ["Revizyon istendi", "Reddedildi"].includes(request.status)).length,
    approval: requests.filter((request) => ["Hasan onayı bekliyor", "Cem onayı bekliyor", "Nakit akışı kontrolü bekliyor"].includes(request.status)).length,
    orders: orders.filter((order) => order.status === "Gönderilmeye hazır").length,
    finance: upcomingPayments
  };
}

export async function sendPushNotificationStub(_notification: AppNotification, _deviceToken?: string) {
  return {
    ok: true,
    provider: "future-fcm-or-onesignal",
    message: "Demo modunda gerçek mobil push gönderilmez."
  };
}
