"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, ClipboardList, CreditCard, FileText, Home, LogOut, Menu, PackageCheck, Send, ShieldCheck, Users, XCircle } from "lucide-react";

type Role = "Cem" | "Hasan" | "Personel" | "Depo" | "Muhasebe";
type Status = "Hasan onayı bekliyor" | "Cem onayı bekliyor" | "Nakit akışı kontrolü bekliyor" | "Onaylandı" | "Reddedildi" | "Siparişe dönüştürüldü" | "Tedarikçiye gönderildi" | "Mal kabul edildi" | "Ödeme planlandı" | "Tamamlandı";
type RequestItem = {
  id: string;
  date: string;
  requester: string;
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
  purpose: string;
  risk: number;
  reasons: string[];
  status: Status;
  po?: string;
};

const users: Record<Role, { username: string; password: string; title: string }> = {
  Cem: { username: "cem", password: "byks2026", title: "Admin / Nihai Onay" },
  Hasan: { username: "hasan", password: "hasan2026", title: "Satın Alma Onayı" },
  Personel: { username: "personel", password: "personel2026", title: "Talep Açan" },
  Depo: { username: "depo", password: "depo2026", title: "Mal Kabul" },
  Muhasebe: { username: "muhasebe", password: "muhasebe2026", title: "Fatura ve Ödeme" }
};

const initialRequests: RequestItem[] = [
  { id: "ST-2026-0001", date: "2026-07-10", requester: "Personel", location: "Bodrum Depo", destination: "Yalıkavak Şantiye", product: "Su yalıtım kimyasalı", quantity: 20, unit: "Teneke", unitPrice: 3250, currency: "TL", exchangeRate: 1, supplier: "Ege Kimya", supplierEmail: "siparis@egekimya.com", due: "45 gün", deliveryDate: "2026-07-18", purpose: "Şantiye malzeme ihtiyacı", risk: 10, reasons: ["Acil alım +10"], status: "Hasan onayı bekliyor" },
  { id: "ST-2026-0002", date: "2026-07-10", requester: "Personel", location: "İzmir Depo", destination: "İzmir Depo", product: "Epoksi astar", quantity: 60, unit: "Kg", unitPrice: 42, currency: "USD", exchangeRate: 32.85, supplier: "Yeni Tedarik A.Ş.", supplierEmail: "teklif@yenitedarik.com", due: "Peşin", deliveryDate: "2026-07-16", purpose: "Yeni müşteri projesi", risk: 70, reasons: ["Yeni tedarikçi +40", "Peşin ödeme +30"], status: "Cem onayı bekliyor" },
  { id: "ST-2026-0003", date: "2026-07-09", requester: "Personel", location: "Bodrum Ofis", destination: "Bodrum Ofis", product: "Ambalaj sarf malzemesi", quantity: 100, unit: "Adet", unitPrice: 850, currency: "TL", exchangeRate: 1, supplier: "Bodrum Ambalaj", supplierEmail: "info@bodrumambalaj.com", due: "30 gün", deliveryDate: "2026-07-20", purpose: "Depo sevkiyat hazırlığı", risk: 0, reasons: [], status: "Onaylandı", po: "PO-2026-0001" }
];

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}

function riskLabel(score: number) {
  if (score >= 50) return "Yüksek Risk";
  if (score >= 30) return "Orta Risk";
  return "Düşük Risk";
}

function statusColor(status: Status) {
  if (status.includes("Reddedildi")) return "bg-red-100 text-red-700";
  if (status.includes("bekliyor")) return "bg-amber-100 text-amber-700";
  if (status.includes("Onaylandı") || status.includes("Tamamlandı")) return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export default function Page() {
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [screen, setScreen] = useState("Dashboard");
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [selectedId, setSelectedId] = useState(initialRequests[0].id);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const current = requests.find((item) => item.id === selectedId) || requests[0];
  const notifications = useMemo(() => {
    if (!role) return [];
    return requests.filter((item) => {
      if (role === "Hasan") return item.status === "Hasan onayı bekliyor";
      if (role === "Cem") return item.status === "Cem onayı bekliyor" || item.status === "Nakit akışı kontrolü bekliyor" || item.risk >= 50;
      if (role === "Personel") return item.requester === "Personel";
      if (role === "Depo") return item.status === "Tedarikçiye gönderildi";
      return item.status === "Mal kabul edildi" || item.status === "Ödeme planlandı";
    });
  }, [requests, role]);

  const totals = useMemo(() => {
    const monthTotal = requests.reduce((sum, item) => sum + item.quantity * item.unitPrice * item.exchangeRate, 0);
    return {
      hasan: requests.filter((i) => i.status === "Hasan onayı bekliyor").length,
      cem: requests.filter((i) => i.status === "Cem onayı bekliyor").length,
      cash: requests.filter((i) => i.status === "Nakit akışı kontrolü bekliyor").length,
      high: requests.filter((i) => i.risk >= 50 && i.status.includes("bekliyor")).length,
      poReady: requests.filter((i) => i.status === "Onaylandı").length,
      monthTotal
    };
  }, [requests]);

  function login() {
    const found = (Object.keys(users) as Role[]).find((key) => users[key].username === username.trim().toLowerCase() && users[key].password === password);
    if (found) setRole(found);
    else alert("Kullanıcı adı veya şifre hatalı");
  }

  function updateStatus(id: string, status: Status) {
    setRequests((items) => items.map((item) => {
      if (item.id !== id) return item;
      const po = item.po || (status === "Onaylandı" ? `PO-2026-${String(items.filter((x) => x.po).length + 1).padStart(4, "0")}` : item.po);
      return { ...item, status, po };
    }));
  }

  function approve(item: RequestItem) {
    const total = item.quantity * item.unitPrice * item.exchangeRate;
    if (role === "Hasan") {
      if (total > 250000 || item.risk >= 70) updateStatus(item.id, "Nakit akışı kontrolü bekliyor");
      else if (total > 100000 || item.risk >= 50) updateStatus(item.id, "Cem onayı bekliyor");
      else updateStatus(item.id, "Onaylandı");
    }
    if (role === "Cem") updateStatus(item.id, "Onaylandı");
  }

  if (!role) {
    return (
      <main className="min-h-screen bg-slate-100 px-5 py-8">
        <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <Image src="/byks-logo.svg" alt="BYKS" width={290} height={122} className="mb-5 h-16 w-auto" priority />
          <h1 className="text-2xl font-bold text-slate-950">BYKS Satın Alma</h1>
          <p className="mt-1 text-sm text-slate-500">Kullanıcı adı ve şifre ile giriş yapın</p>
          <div className="mt-6 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Şifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={login} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Giriş Yap</button>
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Demo kullanıcıları</p>
            {Object.entries(users).map(([name, user]) => <p key={name}>{name}: {user.username} / {user.password}</p>)}
          </div>
        </section>
      </main>
    );
  }

  const nav = [
    ["Dashboard", Home], ["Talepler", ClipboardList], ["Onaylar", ShieldCheck], ["Siparişler", FileText], ["Mal Kabul", PackageCheck], ["Ödemeler", CreditCard], ["Kullanıcılar", Users]
  ] as const;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)}><Menu size={20} /></button>
            <Image src="/byks-logo.svg" alt="BYKS" width={290} height={122} className="h-9 w-auto" />
            <div className="hidden sm:block"><p className="font-bold">BYKS Satın Alma</p><p className="text-xs text-slate-500">{role} · {users[role].title}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-xl border border-slate-200 p-2"><Bell size={20} />{notifications.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{notifications.length}</span>}</button>
            <button className="rounded-xl border border-slate-200 p-2" onClick={() => setRole(null)}><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 md:grid-cols-[240px_1fr]">
        <aside className={`${menuOpen ? "block" : "hidden"} rounded-2xl bg-white p-3 shadow-sm md:block`}>
          {nav.map(([name, Icon]) => (
            <button key={name} onClick={() => { setScreen(name); setMenuOpen(false); }} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold ${screen === name ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="flex items-center gap-2"><Icon size={18} />{name}</span>
              {name === "Onaylar" && notifications.length > 0 && <span className="rounded-full bg-red-600 px-2 text-xs text-white">{notifications.length}</span>}
            </button>
          ))}
        </aside>

        <section className="space-y-4">
          {screen === "Dashboard" && <Dashboard totals={totals} requests={requests} />}
          {screen === "Talepler" && <Requests requests={requests} select={(id) => { setSelectedId(id); setScreen("Detay"); }} />}
          {screen === "Onaylar" && <Approvals role={role} requests={requests} approve={approve} reject={(id) => updateStatus(id, "Reddedildi")} select={(id) => { setSelectedId(id); setScreen("Detay"); }} />}
          {screen === "Siparişler" && <Orders role={role} requests={requests} send={(id) => updateStatus(id, "Tedarikçiye gönderildi")} />}
          {screen === "Mal Kabul" && <Workflow title="Mal Kabul" items={requests.filter((i) => i.status === "Tedarikçiye gönderildi")} action="Mal kabul edildi" onAction={(id) => updateStatus(id, "Mal kabul edildi")} />}
          {screen === "Ödemeler" && <Workflow title="Fatura ve Ödeme" items={requests.filter((i) => i.status === "Mal kabul edildi" || i.status === "Ödeme planlandı")} action="Ödeme planlandı" onAction={(id) => updateStatus(id, "Ödeme planlandı")} />}
          {screen === "Kullanıcılar" && <UsersPanel role={role} />}
          {screen === "Detay" && <Detail item={current} back={() => setScreen("Talepler")} />}
        </section>
      </div>
    </main>
  );
}

function Dashboard({ totals, requests }: { totals: any; requests: RequestItem[] }) {
  const cards = [
    ["Bekleyen Hasan onayları", totals.hasan], ["Bekleyen Cem onayları", totals.cem], ["Nakit akışı kontrolü", totals.cash], ["Yüksek riskli bekleyen", totals.high], ["Gönderilmeye hazır PO", totals.poReady], ["Bu ay toplam satın alma", money(totals.monthTotal)]
  ];
  return <><div className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="text-lg font-bold">Acil İşlemler</h2><div className="mt-3 flex flex-wrap gap-2">{requests.filter((i) => i.status.includes("bekliyor") || i.risk >= 50).map((i) => <span key={i.id} className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">{i.id} · {riskLabel(i.risk)}</span>)}</div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div></>;
}

function Requests({ requests, select }: { requests: RequestItem[]; select: (id: string) => void }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="text-lg font-bold">Satın Alma Talepleri</h2><div className="mt-4 space-y-3">{requests.map((item) => <button key={item.id} onClick={() => select(item.id)} className="w-full rounded-xl border border-slate-200 p-4 text-left"><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{item.id} · {item.product}</p><p className="text-sm text-slate-500">{item.location} → {item.destination}</p><p className="text-sm text-slate-500">{item.supplier} · Kur: {item.exchangeRate}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusColor(item.status)}`}>{item.status}</span></div><p className="mt-2 font-bold">{money(item.quantity * item.unitPrice * item.exchangeRate)}</p></button>)}</div></div>;
}

function Approvals({ role, requests, approve, reject, select }: { role: Role; requests: RequestItem[]; approve: (item: RequestItem) => void; reject: (id: string) => void; select: (id: string) => void }) {
  const list = requests.filter((i) => role === "Hasan" ? i.status === "Hasan onayı bekliyor" : role === "Cem" ? i.status === "Cem onayı bekliyor" || i.status === "Nakit akışı kontrolü bekliyor" : false);
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="text-lg font-bold">Onaylar</h2><div className="mt-4 space-y-3">{list.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><button onClick={() => select(item.id)} className="text-left"><p className="font-bold">{item.id} · {item.product}</p><p className="text-sm text-slate-500">Risk puanı: {item.risk} / {riskLabel(item.risk)}</p></button><div className="mt-3 flex gap-2"><button onClick={() => approve(item)} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white"><CheckCircle2 className="inline" size={18} /> Onayla</button><button onClick={() => reject(item.id)} className="flex-1 rounded-xl bg-red-600 px-3 py-2 font-bold text-white"><XCircle className="inline" size={18} /> Reddet</button></div></div>)}{list.length === 0 && <p className="text-slate-500">Bekleyen onay yok.</p>}</div></div>;
}

function Orders({ role, requests, send }: { role: Role; requests: RequestItem[]; send: (id: string) => void }) {
  const orders = requests.filter((i) => i.po || i.status === "Onaylandı");
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="text-lg font-bold">Satın Alma Siparişleri</h2><div className="mt-4 space-y-3">{orders.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="font-bold">{item.po || "PO oluşturulacak"} · {item.product}</p><p className="text-sm text-slate-500">Tedarikçi: {item.supplier} · {item.supplierEmail}</p><p className="text-sm text-slate-500">Termin: {item.deliveryDate} · Vade: {item.due}</p><p className="mt-2 font-bold">{money(item.quantity * item.unitPrice * item.exchangeRate)}</p>{item.status === "Onaylandı" && (role === "Cem" || role === "Hasan" || role === "Personel") && <button onClick={() => send(item.id)} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"><Send className="inline" size={18} /> Tedarikçiye Gönder</button>}</div>)}</div></div>;
}

function Workflow({ title, items, action, onAction }: { title: string; items: RequestItem[]; action: Status; onAction: (id: string) => void }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="text-lg font-bold">{title}</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="font-bold">{item.id} · {item.product}</p><p className="text-sm text-slate-500">{item.status}</p><button onClick={() => onAction(item.id)} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">{action}</button></div>)}{items.length === 0 && <p className="text-slate-500">Bekleyen kayıt yok.</p>}</div></div>;
}

function Detail({ item, back }: { item: RequestItem; back: () => void }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><button onClick={back} className="mb-4 rounded-xl border border-slate-200 px-3 py-2">Geri</button><h2 className="text-xl font-bold">{item.id}</h2><p className="text-slate-500">{item.product}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Toplam tutar" value={money(item.quantity * item.unitPrice * item.exchangeRate)} /><Info label="Risk puanı" value={`${item.risk} / ${riskLabel(item.risk)}`} /><Info label="Durum" value={item.status} /><Info label="Tedarikçi" value={item.supplier} /><Info label="Malzemenin gideceği yer" value={item.destination} /><Info label="Kur" value={`${item.currency} · ${item.exchangeRate}`} /></div><div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="font-bold">Risk sebepleri</p>{item.reasons.length ? item.reasons.map((r) => <p key={r} className="text-sm text-slate-600">{r}</p>) : <p className="text-sm text-slate-600">Risk sebebi yok.</p>}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function UsersPanel({ role }: { role: Role }) {
  if (role !== "Cem") return <div className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="text-lg font-bold">Kullanıcı ve Yetki Yönetimi</h2><p className="mt-2 text-slate-500">Bu ekranı sadece Cem görebilir.</p></div>;
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="text-lg font-bold">Kullanıcı ve Yetki Yönetimi</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(users).map(([name, user]) => <div key={name} className="rounded-xl border border-slate-200 p-4"><p className="font-bold">{name}</p><p className="text-sm text-slate-500">{user.title}</p><p className="mt-2 text-sm">{user.username} / {user.password}</p></div>)}</div></div>;
}
