"use client";

import "../portal.css";
import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Store as StoreIcon, Package, Users, Truck, LogOut, RefreshCw, Plus, CheckCircle, MapPin, ShieldCheck, Search, Trash2, Power, Edit3 } from "lucide-react";

type Role = "merchant" | "courier" | "admin";
type AnyRow = Record<string, any>;
const statusNames: Record<string, string> = {
  placed: "طلب جديد", store_accepted: "قبله المتجر", preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام", rider_assigned: "تم تعيين مندوب",
  arrived_at_store: "وصل المندوب للمتجر", picked_up: "استلمه المندوب",
  on_the_way: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي", rejected: "مرفوض"
};
const merchantNext: Record<string, string[]> = {
  placed: ["store_accepted", "rejected"],
  store_accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup"]
};
const courierNext: Record<string, string[]> = {
  rider_assigned: ["arrived_at_store"],
  arrived_at_store: ["picked_up"],
  picked_up: ["on_the_way"],
  on_the_way: ["delivered"]
};

export default function PortalPage({ params }: { params: { role: string } }) {
  const role = params.role as Role;
  const valid = ["merchant", "courier", "admin"].includes(role);
  const [db, setDb] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<AnyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stores, setStores] = useState<AnyRow[]>([]);
  const [orders, setOrders] = useState<AnyRow[]>([]);
  const [products, setProducts] = useState<AnyRow[]>([]);
  const [jobs, setJobs] = useState<AnyRow[]>([]);
  const [profiles, setProfiles] = useState<AnyRow[]>([]);
  const [storeId, setStoreId] = useState("");
  const [storeFee, setStoreFee] = useState("0");
  const [storeMinimum, setStoreMinimum] = useState("0");
  const [storePrep, setStorePrep] = useState("25");
  const [storeStatus, setStoreStatus] = useState("open");
  const [online, setOnline] = useState(false);
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");

  // Merchant catalog form
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");

  // Admin store onboarding form
  const [ownerId, setOwnerId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeVertical, setStoreVertical] = useState("restaurant");
  const [storeDescription, setStoreDescription] = useState("");
  const [storeCity, setStoreCity] = useState("جدة");
  const [deliveryFee, setDeliveryFee] = useState("8");
  const [minimumOrder, setMinimumOrder] = useState("0");
  const [prepTime, setPrepTime] = useState("30");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("إعدادات الاتصال بقاعدة البيانات غير مكتملة.");
      setLoading(false);
      return;
    }
    const client = createClient(url, key);
    setDb(client);
    client.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        const { data: p } = await client.from("profiles").select("*").eq("id", data.user.id).single();
        setProfile(p);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) setProfile(null);
      else void client.from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data: p }) => setProfile(p));
    });
    return () => subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!db || !user) return;
    setBusy(true);
    setError("");
    try {
      if (role === "merchant") {
        const s = await db.from("stores").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
        if (s.error) throw s.error;
        setStores(s.data || []);
        const selectedStore = (s.data || []).find((x: AnyRow) => x.id === storeId) || s.data?.[0];
        if (selectedStore) {
          setStoreId(selectedStore.id);
          setStoreFee(String(selectedStore.delivery_fee_sar || 0));
          setStoreMinimum(String(selectedStore.minimum_order_sar || 0));
          setStorePrep(String(selectedStore.prep_time_minutes || 25));
          setStoreStatus(selectedStore.status || "open");
          const [o, p] = await Promise.all([
            db.from("orders").select("*,order_items(*)").eq("store_id", selectedStore.id).order("created_at", { ascending: false }).limit(50),
            db.from("products").select("*").eq("store_id", selectedStore.id).order("created_at", { ascending: false })
          ]);
          if (o.error) throw o.error;
          if (p.error) throw p.error;
          setOrders(o.data || []);
          setProducts(p.data || []);
        } else {
          setOrders([]);
          setProducts([]);
        }
      } else if (role === "courier") {
        const [available, assigned, presence] = await Promise.all([
          db.rpc("available_delivery_orders"),
          db.from("deliveries").select("*,orders(order_number,status,total_sar,store_id,stores(name))").eq("courier_id", user.id).order("created_at", { ascending: false }).limit(50),
          db.from("courier_presence").select("*").eq("courier_id", user.id).maybeSingle()
        ]);
        if (available.error) throw available.error;
        if (assigned.error) throw assigned.error;
        setJobs(available.data || []);
        setOrders(assigned.data || []);
        setOnline(!!presence.data?.is_online);
      } else if (role === "admin") {
        const [s, o, p] = await Promise.all([
          db.from("stores").select("*").order("created_at", { ascending: false }).limit(200),
          db.from("orders").select("id,order_number,status,total_sar,created_at,stores(name)").order("created_at", { ascending: false }).limit(200),
          db.from("profiles").select("id,full_name,email,phone,role,is_active,created_at").order("created_at", { ascending: false }).limit(200)
        ]);
        if (s.error) throw s.error;
        if (o.error) throw o.error;
        if (p.error) throw p.error;
        setStores(s.data || []);
        setOrders(o.data || []);
        setProfiles(p.data || []);
      }
    } catch (e: any) {
      setError(e.message || "تعذر تحميل البيانات.");
    } finally {
      setBusy(false);
    }
  }, [db, user, role, storeId]);

  useEffect(() => {
    if (db && user && profile?.role === role) void load();
  }, [db, user, profile?.role, role, load]);

  useEffect(() => {
    if (!db || !user || profile?.role !== role) return;
    const channel = db.channel("operations-" + role + "-" + user.id);
    if (role === "merchant" && storeId) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "store_id=eq." + storeId }, () => { void load(); });
    } else if (role === "courier") {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "deliveries", filter: "courier_id=eq." + user.id }, () => { void load(); });
    } else if (role === "admin") {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { void load(); });
      channel.on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => { void load(); });
    }
    channel.subscribe();
    return () => { void db.removeChannel(channel); };
  }, [db, user, profile?.role, role, storeId, load]);

 async function signIn(e: FormEvent) {
    e.preventDefault();
    if (!db) return;
    setLoading(true); setError("");
    const result = await db.auth.signInWithPassword({ email, password });
    if (result.error) setError(result.error.message);
    else {
      setUser(result.data.user);
      const p = await db.from("profiles").select("*").eq("id", result.data.user.id).single();
      setProfile(p.data);
      if (p.data?.role !== role) setError("هذا الحساب لا يملك صلاحية الدخول لهذه اللوحة.");
    }
    setLoading(false);
  }

  async function signOut() {
    await db?.auth.signOut();
    setUser(null); setProfile(null); setStores([]); setOrders([]);
  }

  async function saveStoreSettings(e: FormEvent) {
    e.preventDefault();
    if (!db || !storeId) return;
    setBusy(true); setError("");
    const result = await db.from("stores").update({
      delivery_fee_sar: Number(storeFee), minimum_order_sar: Number(storeMinimum),
      prep_time_minutes: Number(storePrep), status: storeStatus
    }).eq("id", storeId).select().single();
    setBusy(false);
    if (result.error) setError(result.error.message);
    else setStores(old => old.map(s => s.id === storeId ? result.data : s));
  }

  async function addProduct(e: FormEvent) {
    e.preventDefault();
    if (!db || !storeId) return;
    setBusy(true); setError("");
    const result = await db.from("products").insert({
      store_id: storeId, name: productName.trim(), description: productDescription.trim() || null,
      price_sar: Number(productPrice), image_url: productImage.trim() || null, is_available: true
    }).select().single();
    setBusy(false);
    if (result.error) setError(result.error.message);
    else {
      setProducts(old => [result.data, ...old]);
      setProductName(""); setProductDescription(""); setProductPrice(""); setProductImage("");
    }
  }

  async function toggleProduct(product: AnyRow) {
    if (!db) return;
    const result = await db.from("products").update({ is_available: !product.is_available }).eq("id", product.id).select().single();
    if (result.error) setError(result.error.message);
    else setProducts(old => old.map(p => p.id === product.id ? result.data : p));
  }

  async function deleteProduct(id: string) {
    if (!db || !window.confirm("هل تريد حذف هذا المنتج؟")) return;
    const result = await db.from("products").delete().eq("id", id);
    if (result.error) setError(result.error.message);
    else setProducts(old => old.filter(p => p.id !== id));
  }

  async function setOrderStatus(id: string, status: string) {
    if (!db) return;
    setBusy(true); setError("");
    const result = await db.rpc("transition_order", { p_order_id: id, p_to_status: status });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else await load();
  }

  async function claim(id: string) {
    if (!db) return;
    setBusy(true); setError("");
    const result = await db.rpc("claim_delivery", { p_order_id: id });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else await load();
  }

  async function toggleOnline() {
    if (!db || !user) return;
    const next = !online;
    const result = await db.from("courier_presence").upsert({
      courier_id: user.id, is_online: next, last_seen_at: new Date().toISOString()
    });
    if (result.error) setError(result.error.message);
    else setOnline(next);
  }

  async function approveStore(id: string, approved: boolean) {
    if (!db) return;
    const result = await db.from("stores").update({ is_approved: approved }).eq("id", id);
    if (result.error) setError(result.error.message);
    else await load();
  }

  async function createStore(e: FormEvent) {
    e.preventDefault();
    if (!db || !ownerId) return;
    setBusy(true); setError("");
    const result = await db.rpc("admin_create_store", {
      p_owner_id: ownerId, p_name: storeName.trim(), p_slug: storeSlug.trim().toLowerCase(),
      p_vertical: storeVertical, p_description: storeDescription.trim() || null,
      p_city: storeCity.trim() || "جدة", p_delivery_fee_sar: Number(deliveryFee),
      p_minimum_order_sar: Number(minimumOrder), p_prep_time_minutes: Number(prepTime)
    });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else {
      setStoreName(""); setStoreSlug(""); setStoreDescription(""); setOwnerId("");
      setTab("stores"); await load();
    }
  }

  async function changeRole(id: string, nextRole: string) {
    if (!db) return;
    const result = await db.rpc("admin_set_user_role", { p_user_id: id, p_role: nextRole });
    if (result.error) setError(result.error.message);
    else await load();
  }

  const filteredStores = useMemo(() => stores.filter(s => !search || [s.name, s.city, s.slug].join(" ").toLowerCase().includes(search.toLowerCase())), [stores, search]);
  const filteredOrders = useMemo(() => orders.filter(o => !search || String(o.order_number || o.id).includes(search)), [orders, search]);
  const eligibleOwners = profiles.filter(p => p.is_active && p.role !== "admin");
  const money = (v: any) => Number(v || 0).toFixed(2) + " ر.س";

  if (!valid) return <main className="portal"><section className="panel"><h1>مسار غير صالح</h1><a href="/">العودة للرئيسية</a></section></main>;
  if (loading) return <main className="portal"><div className="panel">جاري تحميل لوحة التحكم...</div></main>;
  if (!user || profile?.role !== role) return <main className="portal"><form className="panel auth" onSubmit={signIn}>
    <a className="portalBrand" href="/">ZOOL <b>FOOD</b></a>
    <h1>{role === "merchant" ? "بوابة التاجر" : role === "courier" ? "بوابة المندوب" : "لوحة الإدارة"}</h1>
    <p>سجّل الدخول بالبريد الإلكتروني وكلمة المرور المخصصة لحسابك.</p>
    <label>البريد الإلكتروني</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/>
    <label>كلمة المرور</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"/>
    {error && <div className="error">{error}</div>}
    <button className="primary" disabled={loading}>تسجيل الدخول</button><a href="/">العودة إلى المتجر</a>
  </form></main>;

  return <main className="portal">
    <header className="portalHeader">
      <a className="portalBrand" href="/">ZOOL <b>FOOD</b></a>
      <span>{role === "merchant" ? "بوابة التاجر" : role === "courier" ? "بوابة المندوب" : "لوحة الإدارة"}</span>
      <button onClick={() => void load()} disabled={busy}><RefreshCw size={16}/> تحديث</button>
      <button onClick={signOut}><LogOut size={16}/> خروج</button>
    </header>
    <div className="portalBody">
      <div className="welcome"><div><small>مرحباً بعودتك</small><h1>{profile?.full_name || user.email}</h1><p>{role === "merchant" ? "إدارة المتجر والمنتجات والطلبات." : role === "courier" ? "استلام الطلبات وإدارة عمليات التوصيل." : "إدارة المتاجر والحسابات والطلبات."}</p></div>
        {role === "courier" && <button className={online ? "online" : "offline"} onClick={toggleOnline}>{online ? "متصل — إيقاف استقبال الطلبات" : "غير متصل — تفعيل الاستقبال"}</button>}
      </div>
      {error && <div className="error">{error}</div>}

      {role === "merchant" && <>
        {stores.length > 1 && <div className="panel"><label>المتجر الحالي</label><select value={storeId} onChange={e => setStoreId(e.target.value)}>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
        {stores.length === 0 ? <section className="panel"><h2>لا يوجد متجر مرتبط بحسابك</h2><p>تم تسجيل حسابك كتاجر، لكن لا يوجد متجر مفعّل بعد. تواصل مع إدارة المنصة لإضافته.</p></section> : <>
          <div className="statsGrid"><article><StoreIcon/><small>المتاجر</small><b>{stores.length}</b></article><article><Package/><small>الطلبات</small><b>{orders.length}</b></article><article><CheckCircle/><small>المنتجات</small><b>{products.length}</b></article></div>
          <section className="panel"><h2>إعدادات المتجر</h2><form className="storeSettingsForm" onSubmit={saveStoreSettings}>
            <div><label>رسوم التوصيل (ر.س)</label><input type="number" min="0" step="0.5" value={storeFee} onChange={e=>setStoreFee(e.target.value)}/></div>
            <div><label>الحد الأدنى للطلب (ر.س)</label><input type="number" min="0" step="1" value={storeMinimum} onChange={e=>setStoreMinimum(e.target.value)}/></div>
            <div><label>وقت التحضير (دقيقة)</label><input type="number" min="0" max="240" value={storePrep} onChange={e=>setStorePrep(e.target.value)}/></div>
            <div><label>حالة المتجر</label><select value={storeStatus} onChange={e=>setStoreStatus(e.target.value)}><option value="open">مفتوح لاستقبال الطلبات</option><option value="busy">مشغول</option><option value="closed">مغلق مؤقتاً</option></select></div>
            <button className="primary" disabled={busy}>حفظ إعدادات المتجر</button>
          </form></section>
          <section className="panel"><h2>طلبات المتجر</h2>{orders.length === 0 ? <p>لا توجد طلبات حالياً.</p> : orders.map(o => <div className="rowItem" key={o.id}>
            <div><b>طلب #{o.order_number}</b><small>{statusNames[o.status] || o.status} · {money(o.total_sar)} · {new Date(o.created_at).toLocaleString("ar-SA")}</small>{o.order_items?.map((i: AnyRow) => <small key={i.id}>{i.product_name} × {i.quantity}</small>)}</div>
            {merchantNext[o.status]?.length ? <select disabled={busy} value="" onChange={e => e.target.value && setOrderStatus(o.id, e.target.value)}><option value="">تحديث الحالة</option>{merchantNext[o.status].map(s => <option key={s} value={s}>{statusNames[s]}</option>)}</select> : <span>{statusNames[o.status] || o.status}</span>}
          </div>)}</section>
          <section className="panel"><h2>إضافة منتج جديد</h2><form className="productForm" onSubmit={addProduct}>
            <input required value={productName} onChange={e => setProductName(e.target.value)} placeholder="اسم المنتج"/>
            <input required type="number" min="0.01" step="0.01" value={productPrice} onChange={e => setProductPrice(e.target.value)} placeholder="السعر بالريال"/>
            <input value={productDescription} onChange={e => setProductDescription(e.target.value)} placeholder="وصف المنتج"/>
            <input type="url" value={productImage} onChange={e => setProductImage(e.target.value)} placeholder="رابط صورة المنتج (اختياري)"/>
            <button className="primary" disabled={busy}><Plus size={16}/> إضافة المنتج</button>
          </form></section>
          <section className="panel"><h2>كتالوج المنتجات</h2>{products.length === 0 ? <p>لم تتم إضافة منتجات بعد.</p> : products.map(p => <div className="rowItem" key={p.id}>
            <div className="productIdentity">{p.image_url ? <img src={p.image_url} alt="" /> : <span className="productPlaceholder"><Package size={18}/></span>}<div><b>{p.name}</b><small>{p.description || "بدون وصف"} · {money(p.price_sar)}</small><small>{p.is_available ? "متاح للبيع" : "غير متاح"}</small></div></div>
            <div className="rowActions"><button onClick={() => toggleProduct(p)} title="تغيير التوفر"><Power size={15}/>{p.is_available ? "إيقاف" : "تفعيل"}</button><button className="danger" onClick={() => deleteProduct(p.id)} title="حذف المنتج"><Trash2 size={15}/></button></div>
          </div>)}</section>
        </>}
      </>}

      {role === "courier" && <>
        <div className="statsGrid"><article><Truck/><small>التوصيلات المسندة</small><b>{orders.length}</b></article><article><MapPin/><small>طلبات جاهزة للاستلام</small><b>{jobs.length}</b></article><article><ShieldCheck/><small>حالة الحساب</small><b>{online ? "متصل" : "غير متصل"}</b></article></div>
        {!online && <div className="notice">فعّل حالة الاتصال لتبدأ استقبال طلبات التوصيل.</div>}
        <section className="panel"><h2>طلبات متاحة للاستلام</h2>{jobs.length === 0 ? <p>لا توجد طلبات جاهزة للاستلام حالياً.</p> : jobs.map(j => <div className="rowItem" key={j.order_id}><div><b>طلب #{j.order_number} · {j.store_name}</b><small>{j.city} · {money(j.total_sar)} · تحضير {j.estimated_prep_minutes || "—"} دقيقة</small></div><button className="primary" disabled={busy || !online} onClick={() => claim(j.order_id)}>قبول التوصيل</button></div>)}</section>
        <section className="panel"><h2>توصيلاتي الحالية والسابقة</h2>{orders.length === 0 ? <p>لم تستلم أي طلب بعد.</p> : orders.map(d => <div className="rowItem" key={d.id}><div><b>طلب #{d.orders?.order_number}</b><small>{d.orders?.stores?.name || "المتجر"} · {statusNames[d.status] || d.status}</small></div>
          {courierNext[d.status]?.length ? <select disabled={busy} value="" onChange={e => e.target.value && setOrderStatus(d.order_id, e.target.value)}><option value="">تحديث الحالة</option>{courierNext[d.status].map(s => <option key={s} value={s}>{statusNames[s]}</option>)}</select> : <span>{statusNames[d.status] || d.status}</span>}
        </div>)}</section>
      </>}

      {role === "admin" && <>
        <div className="statsGrid"><article><StoreIcon/><small>المتاجر</small><b>{stores.length}</b></article><article><Package/><small>الطلبات</small><b>{orders.length}</b></article><article><Users/><small>الحسابات</small><b>{profiles.length}</b></article></div>
        <nav className="adminTabs">{[["overview","نظرة عامة"],["stores","المتاجر"],["new-store","إضافة متجر"],["users","الحسابات"],["orders","الطلبات"]].map(([id,label]) => <button key={id} className={tab === id ? "selected" : ""} onClick={() => { setTab(id); setSearch(""); }}>{label}</button>)}</nav>
        {tab === "overview" && <><section className="panel"><h2>ملخص المنصة</h2><div className="statsGrid"><article><small>متاجر معتمدة</small><b>{stores.filter(s => s.is_approved).length}</b></article><article><small>بانتظار الاعتماد</small><b>{stores.filter(s => !s.is_approved).length}</b></article><article><small>طلبات قيد التنفيذ</small><b>{orders.filter(o => !["delivered","cancelled","rejected"].includes(o.status)).length}</b></article></div></section><section className="panel"><h2>أحدث الطلبات</h2>{orders.slice(0,8).map(o => <div className="rowItem" key={o.id}><div><b>طلب #{o.order_number}</b><small>{o.stores?.name || "متجر"} · {statusNames[o.status] || o.status}</small></div><b>{money(o.total_sar)}</b></div>)}</section></>}
        {tab === "stores" && <section className="panel"><div className="panelHeading"><h2>إدارة المتاجر</h2><label className="searchBox"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن متجر"/></label></div>
          {filteredStores.map(s => <div className="rowItem" key={s.id}><div><b>{s.name}</b><small>{s.vertical} · {s.city} · {s.slug} · {s.status === "closed" ? "مغلق" : s.status === "busy" ? "مشغول" : "مفتوح"}</small><small>رسوم التوصيل: {money(s.delivery_fee_sar)} · {s.is_approved ? "معتمد" : "بانتظار الاعتماد"}</small></div><div className="rowActions">{s.is_approved ? <button onClick={() => approveStore(s.id, false)} className="danger">إيقاف الاعتماد</button> : <button className="primary" onClick={() => approveStore(s.id, true)}>اعتماد</button>}</div></div>)}
          {filteredStores.length === 0 && <p>لا توجد متاجر مطابقة.</p>}</section>}
        {tab === "new-store" && <section className="panel"><h2>إضافة متجر وربط حساب التاجر</h2><p>اختر حساباً مسجلاً مسبقاً، وسيتم تحويله إلى حساب تاجر وربطه بالمتجر الجديد.</p><form className="adminStoreForm" onSubmit={createStore}>
          <label>مالك المتجر</label><select required value={ownerId} onChange={e => setOwnerId(e.target.value)}><option value="">اختر حساباً</option>{eligibleOwners.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email || p.id} — {p.role}</option>)}</select>
          <label>اسم المتجر</label><input required value={storeName} onChange={e => setStoreName(e.target.value)} onBlur={() => !storeSlug && setStoreSlug("store-" + Math.random().toString(36).slice(2,8))} placeholder="مثال: مطعم مذاق البيت"/>
          <label>الرابط المختصر (بالإنجليزية)</label><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={storeSlug} onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} placeholder="mithaq-home"/>
          <label>نوع النشاط</label><select value={storeVertical} onChange={e => setStoreVertical(e.target.value)}><option value="restaurant">مطعم</option><option value="pharmacy">صيدلية</option><option value="supermarket">سوبرماركت</option></select>
          <label>وصف المتجر</label><input value={storeDescription} onChange={e => setStoreDescription(e.target.value)} placeholder="وصف مختصر"/>
          <label>المدينة</label><input required value={storeCity} onChange={e => setStoreCity(e.target.value)} />
          <div className="formTwo"><div><label>رسوم التوصيل (ر.س)</label><input type="number" min="0" step="0.5" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)}/></div><div><label>الحد الأدنى للطلب</label><input type="number" min="0" step="1" value={minimumOrder} onChange={e => setMinimumOrder(e.target.value)}/></div></div>
          <label>وقت التحضير بالدقائق</label><input type="number" min="0" max="240" value={prepTime} onChange={e => setPrepTime(e.target.value)}/>
          <button className="primary" disabled={busy}><Plus size={16}/> إنشاء المتجر وتفعيل حساب التاجر</button>
        </form></section>}
        {tab === "users" && <section className="panel"><div className="panelHeading"><h2>إدارة الحسابات</h2><label className="searchBox"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد"/></label></div>
          {profiles.filter(p => !search || [p.full_name,p.email,p.phone].join(" ").toLowerCase().includes(search.toLowerCase())).map(p => <div className="rowItem" key={p.id}><div><b>{p.full_name || "بدون اسم"}</b><small>{p.email || "—"} · {p.phone || "لا يوجد رقم"}</small><small>{p.is_active ? "نشط" : "موقوف"}</small></div><select disabled={p.id === user.id} value={p.role} onChange={e => changeRole(p.id,e.target.value)}><option value="customer">عميل</option><option value="merchant">تاجر</option><option value="courier">مندوب</option></select></div>)}
        </section>}
        {tab === "orders" && <section className="panel"><div className="panelHeading"><h2>جميع الطلبات</h2><label className="searchBox"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="رقم الطلب"/></label></div>
          {filteredOrders.map(o => <div className="rowItem" key={o.id}><div><b>طلب #{o.order_number}</b><small>{o.stores?.name || "متجر"} · {statusNames[o.status] || o.status} · {new Date(o.created_at).toLocaleString("ar-SA")}</small></div><b>{money(o.total_sar)}</b></div>)}
        </section>}
      </>}
      <p className="footnote">ZOOL FOOD · لوحة تشغيل داخلية. لا تشارك بيانات الدخول مع أي شخص.</p>
    </div>
  </main>;
}
