import React, { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { LayoutDashboard, HandCoins, Users, HandHeart, Mail, Newspaper, Image, Calendar, Send, LogOut, Download, Award, Settings as SettingsIcon } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";

export function AdminGuard({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

const NAV = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/admin/donations", label: "Donations", icon: HandCoins },
  { to: "/admin/athletes", label: "Athletes", icon: Users },
  { to: "/admin/volunteers", label: "Volunteers", icon: HandHeart },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/newsletter", label: "Newsletter", icon: Send },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/stories", label: "Stories", icon: Newspaper },
  { to: "/admin/gallery", label: "Gallery", icon: Image },
  { to: "/admin/sponsors", label: "Sponsors", icon: Award },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export function AdminLayout() {
  const { admin, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex" data-testid="admin-layout">
      <aside className="w-64 shrink-0 bg-white border-r border-border h-screen sticky top-0 flex flex-col">
        <Link to="/admin" className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary text-white grid place-items-center font-bold">LS</div>
          <div>
            <div className="font-heading font-bold text-primary">Scorpions</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin</div>
          </div>
        </Link>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive ? "bg-primary text-white" : "text-foreground/70 hover:bg-primary/5"
                }`
              }
              data-testid={`admin-nav-${label.toLowerCase()}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{admin?.email}</div>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5"
            onClick={async () => { await logout(); nav("/admin/login"); toast.success("Signed out"); }}
            data-testid="admin-logout"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

export function AdminOverview() {
  const [s, setS] = useState({});
  useEffect(() => { api.get("/admin/stats").then((r) => setS(r.data)).catch(() => {}); }, []);
  const cards = [
    { k: "athletes", label: "Athlete registrations", v: s.athletes ?? 0, Icon: Users },
    { k: "volunteers", label: "Volunteer signups", v: s.volunteers ?? 0, Icon: HandHeart },
    { k: "donations", label: "Donations pledged", v: s.donations_count ?? 0, Icon: HandCoins },
    { k: "donations_total", label: "Total pledged (ZAR)", v: `R ${(s.donations_total || 0).toLocaleString()}`, Icon: HandCoins },
    { k: "newsletter", label: "Newsletter subscribers", v: s.newsletter ?? 0, Icon: Send },
    { k: "contact", label: "Contact messages", v: s.contact ?? 0, Icon: Mail },
    { k: "events", label: "Events", v: s.events ?? 0, Icon: Calendar },
    { k: "stories", label: "Stories", v: s.stories ?? 0, Icon: Newspaper },
    { k: "gallery", label: "Gallery items", v: s.gallery ?? 0, Icon: Image },
  ];
  return (
    <div data-testid="admin-overview">
      <h1 className="text-3xl font-heading font-bold text-primary mb-2">Overview</h1>
      <p className="text-muted-foreground mb-8">A snapshot of the Scorpions today.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ k, label, v, Icon }) => (
          <div key={k} className="bg-white rounded-xl border border-border p-6" data-testid={`stat-${k}`}>
            <Icon className="w-5 h-5 text-accent mb-3" />
            <div className="text-3xl font-heading font-bold text-primary">{v}</div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Reusable list page ----
function useToken() { return localStorage.getItem("ls_token") || ""; }

function ExportButton({ kind }) {
  const token = useToken();
  const url = `${API_BASE}/admin/export/${kind}`;
  return (
    <a
      href={url + (token ? `?token=${encodeURIComponent(token)}` : "")}
      onClick={async (e) => {
        e.preventDefault();
        const res = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) { toast.error("Export failed"); return; }
        const blob = await res.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${kind}.csv`;
        link.click();
      }}
      className="btn-pill bg-primary text-white px-4 py-2 text-sm hover:bg-primary-700"
      data-testid={`export-${kind}`}
    >
      <Download className="w-4 h-4" /> Export CSV
    </a>
  );
}

function DataTable({ title, endpoint, exportKind, columns }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(endpoint).then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <div data-testid={`table-${exportKind}`}>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl font-heading font-bold text-primary">{title}</h1>
        {exportKind && <ExportButton kind={exportKind} />}
      </div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {columns.map((c) => <th key={c.key} className="px-4 py-3 font-semibold text-foreground/80">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">No records yet.</td></tr>}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-foreground/80 align-top max-w-xs truncate">
                      {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const dateCol = (v) => v ? new Date(v).toLocaleString() : "";

export const AdminDonations = () => <DataTable title="Donations" endpoint="/admin/donations" exportKind="donations"
  columns={[
    { key: "donor_name", label: "Donor" },
    { key: "email", label: "Email" },
    { key: "amount", label: "Amount", render: (v, r) => `${r.currency || "ZAR"} ${Number(v).toLocaleString()}` },
    { key: "frequency", label: "Freq" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Date", render: dateCol },
  ]} />;

export const AdminAthletes = () => <DataTable title="Athlete registrations" endpoint="/admin/athletes" exportKind="athletes"
  columns={[
    { key: "athlete_name", label: "Athlete" },
    { key: "date_of_birth", label: "DOB" },
    { key: "guardian_name", label: "Guardian" },
    { key: "guardian_email", label: "Email" },
    { key: "guardian_phone", label: "Phone" },
    { key: "program", label: "Program" },
    { key: "created_at", label: "Registered", render: dateCol },
  ]} />;

export const AdminVolunteers = () => <DataTable title="Volunteers" endpoint="/admin/volunteers" exportKind="volunteers"
  columns={[
    { key: "full_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role_interest", label: "Role interest" },
    { key: "availability", label: "Availability" },
    { key: "created_at", label: "Date", render: dateCol },
  ]} />;

export const AdminMessages = () => <DataTable title="Contact messages" endpoint="/admin/contact" exportKind="contact"
  columns={[
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "subject", label: "Subject" },
    { key: "message", label: "Message" },
    { key: "created_at", label: "Date", render: dateCol },
  ]} />;

export const AdminNewsletter = () => <DataTable title="Newsletter subscribers" endpoint="/admin/newsletter" exportKind="newsletter"
  columns={[
    { key: "email", label: "Email" },
    { key: "name", label: "Name" },
    { key: "created_at", label: "Subscribed", render: dateCol },
  ]} />;

// ---- CRUD pages ----
function CmsPage({ title, endpoint, fields, initial, dataTestId, itemLabel }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initial);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => { try { const { data } = await api.get(endpoint); setItems(data); } catch { /* ignore */ } };
  useEffect(() => { load(); }, [endpoint]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editId) await api.put(`${endpoint}/${editId}`, form);
      else await api.post(endpoint, form);
      toast.success(editId ? "Updated" : "Created");
      setForm(initial); setEditId(null);
      load();
    } catch (err) { toast.error("Save failed"); }
    finally { setBusy(false); }
  };
  const edit = (row) => {
    const next = { ...initial };
    Object.keys(initial).forEach((k) => { if (row[k] !== undefined && row[k] !== null) next[k] = row[k]; });
    setForm(next); setEditId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const del = async (row) => {
    if (!confirm(`Delete this ${itemLabel}?`)) return;
    try { await api.delete(`${endpoint}/${row.id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none text-sm";

  return (
    <div data-testid={dataTestId}>
      <h1 className="text-3xl font-heading font-bold text-primary mb-6">{title}</h1>
      <form onSubmit={submit} className="bg-white rounded-xl border border-border p-6 mb-8 grid gap-4" data-testid={`${dataTestId}-form`}>
        {fields.map((f) => (
          <div key={f.name} className={f.full ? "" : "md:max-w-2xl"}>
            <label className="block text-sm font-semibold text-primary mb-1">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea rows={f.rows || 4} value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inp} data-testid={`${dataTestId}-${f.name}`} />
            ) : f.type === "select" ? (
              <select value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inp} data-testid={`${dataTestId}-${f.name}`}>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "checkbox" ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} data-testid={`${dataTestId}-${f.name}`} />
                <span className="text-sm text-foreground/80">{f.checkboxLabel || "Published"}</span>
              </label>
            ) : f.type === "image" ? (
              <div className="space-y-2">
                <input type="text" placeholder="Paste image URL or upload below"
                  value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  className={inp} data-testid={`${dataTestId}-${f.name}`} />
                <div className="flex items-center gap-3 flex-wrap">
                  <ImageUploader
                    testid={`${dataTestId}-${f.name}-uploader`}
                    onUploaded={(url) => setForm({ ...form, [f.name]: url })}
                  />
                  {form[f.name] && (
                    <img src={form[f.name]} alt="preview" className="h-14 rounded border border-border object-cover" />
                  )}
                </div>
              </div>
            ) : (
              <input type={f.type || "text"} value={form[f.name] || ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inp} data-testid={`${dataTestId}-${f.name}`} />
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-pill bg-accent text-white px-6 py-2.5 text-sm hover:bg-accent-700" data-testid={`${dataTestId}-submit`}>
            {busy ? "Saving…" : editId ? `Update ${itemLabel}` : `Add ${itemLabel}`}
          </button>
          {editId && (
            <button type="button" onClick={() => { setForm(initial); setEditId(null); }} className="btn-pill border-2 border-border px-6 py-2.5 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-border divide-y divide-border">
        {items.length === 0 && <div className="p-6 text-center text-muted-foreground">No {itemLabel}s yet.</div>}
        {items.map((row) => (
          <div key={row.id} className="p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-primary">{row.title || row.name || row.caption || row.image_url || "(untitled)"}</div>
              <div className="text-sm text-muted-foreground truncate">{row.subtitle || row.tier || row.website || row.description || row.location || row.athlete_name}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => edit(row)} className="text-primary hover:text-accent text-sm font-semibold" data-testid={`${dataTestId}-edit-${row.id}`}>Edit</button>
              <button onClick={() => del(row)} className="text-destructive text-sm font-semibold" data-testid={`${dataTestId}-delete-${row.id}`}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const AdminEvents = () => (
  <CmsPage
    title="Events" endpoint="/admin/events" dataTestId="cms-events" itemLabel="event"
    initial={{ title: "", kind: "practice", starts_at: "", location: "", description: "", published: true }}
    fields={[
      { name: "title", label: "Title" },
      { name: "kind", label: "Type", type: "select", options: ["practice", "game", "community"] },
      { name: "starts_at", label: "Starts at (ISO, e.g. 2026-03-01T18:00:00Z)" },
      { name: "location", label: "Location" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "published", label: "", type: "checkbox" },
    ]}
  />
);

export const AdminStories = () => (
  <CmsPage
    title="Stories" endpoint="/admin/stories" dataTestId="cms-stories" itemLabel="story"
    initial={{ title: "", subtitle: "", body: "", athlete_name: "", image_url: "", published: true }}
    fields={[
      { name: "title", label: "Title" },
      { name: "subtitle", label: "Subtitle" },
      { name: "athlete_name", label: "Athlete name" },
      { name: "image_url", label: "Photo", type: "image" },
      { name: "body", label: "Body", type: "textarea", rows: 8 },
      { name: "published", label: "", type: "checkbox" },
    ]}
  />
);

export const AdminGallery = () => (
  <CmsPage
    title="Gallery" endpoint="/admin/gallery" dataTestId="cms-gallery" itemLabel="image"
    initial={{ caption: "", image_url: "", source: "upload", published: true }}
    fields={[
      { name: "image_url", label: "Photo", type: "image" },
      { name: "caption", label: "Caption" },
      { name: "source", label: "Source", type: "select", options: ["upload", "facebook", "external"] },
      { name: "published", label: "", type: "checkbox" },
    ]}
  />
);

export const AdminSponsors = () => (
  <CmsPage
    title="Sponsors &amp; partners" endpoint="/admin/sponsors" dataTestId="cms-sponsors" itemLabel="sponsor"
    initial={{ name: "", tier: "partner", website: "", logo_url: "", published: true }}
    fields={[
      { name: "name", label: "Sponsor / partner name" },
      { name: "tier", label: "Tier", type: "select", options: ["headline", "partner", "grant", "community"] },
      { name: "website", label: "Website URL" },
      { name: "logo_url", label: "Logo (optional — an icon will be used if empty)", type: "image" },
      { name: "published", label: "", type: "checkbox" },
    ]}
  />
);

export function AdminSettings() {
  const [form, setForm] = useState({
    mission: "", tagline: "", org_email: "", whatsapp: "",
    facebook_url: "", instagram_url: "", address: "", logo_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/public/settings")
      .then((r) => setForm((f) => ({ ...f, ...r.data })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/admin/settings", form);
      toast.success("Settings saved");
    } catch { toast.error("Save failed"); }
    finally { setBusy(false); }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none text-sm";

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div data-testid="admin-settings">
      <h1 className="text-3xl font-heading font-bold text-primary mb-2">Site settings</h1>
      <p className="text-muted-foreground mb-8">These appear on the public site — logo, mission, contact info, socials.</p>

      <form onSubmit={save} className="bg-white rounded-xl border border-border p-6 grid gap-5 max-w-3xl" data-testid="settings-form">
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">Organization logo</label>
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="logo" className="w-16 h-16 rounded-2xl object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary text-white grid place-items-center font-heading font-bold text-xl">LS</div>
            )}
            <div className="flex flex-col gap-2">
              <ImageUploader testid="settings-logo-uploader" onUploaded={(url) => setForm({ ...form, logo_url: url })} />
              {form.logo_url && (
                <button type="button" onClick={() => setForm({ ...form, logo_url: "" })} className="text-xs text-destructive font-semibold self-start" data-testid="settings-logo-remove">
                  Remove logo (use LS tile)
                </button>
              )}
            </div>
          </div>
          <input type="text" placeholder="Or paste a logo URL" value={form.logo_url || ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className={inp + " mt-3"} data-testid="settings-logo-url" />
        </div>

        <SField label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} testid="settings-tagline" />
        <SArea label="Mission" value={form.mission} onChange={(v) => setForm({ ...form, mission: v })} testid="settings-mission" rows={4} />

        <div className="grid md:grid-cols-2 gap-4">
          <SField label="Contact email" value={form.org_email} onChange={(v) => setForm({ ...form, org_email: v })} testid="settings-email" />
          <SField label="WhatsApp number" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} testid="settings-whatsapp" />
          <SField label="Facebook URL" value={form.facebook_url} onChange={(v) => setForm({ ...form, facebook_url: v })} testid="settings-facebook" />
          <SField label="Instagram URL" value={form.instagram_url} onChange={(v) => setForm({ ...form, instagram_url: v })} testid="settings-instagram" />
        </div>
        <SField label="Physical address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} testid="settings-address" />

        <button type="submit" disabled={busy} className="btn-pill bg-accent text-white px-6 py-2.5 text-sm hover:bg-accent-700 justify-self-start" data-testid="settings-save">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}

const _sInp = "w-full px-3 py-2 rounded-lg border border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none text-sm";
function SField({ label, value, onChange, testid }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-1">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} className={_sInp} data-testid={testid} />
    </div>
  );
}
function SArea({ label, value, onChange, testid, rows = 4 }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-1">{label}</label>
      <textarea rows={rows} value={value || ""} onChange={(e) => onChange(e.target.value)} className={_sInp} data-testid={testid} />
    </div>
  );
}
