"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type LineItem = { description: string; qty: number; amount_cents: number };
type Addon = { id: string; name: string; amount_cents: number };
type TimelineRow = { id?: string; title: string; start_date?: string; end_date?: string; duration?: string; description?: string };
type Section = { title: string; content: string; block_type?: string; section_key?: string };
type Proposal = {
  title: string;
  client_name?: string;
  status: string;
  total_cents?: number;
  sections: Section[];
  metadata_json?: {
    line_items?: LineItem[];
    addons?: Addon[];
    timeline_milestones?: TimelineRow[];
    scope_modules?: { groups: { title: string; items: string[] }[] };
    payment_milestones?: { label: string; percent: number }[];
  };
};

const API = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "https://api.curvvtech.in";

function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

function sumLineItems(items: LineItem[]) {
  return items.reduce((s, i) => s + i.qty * i.amount_cents, 0);
}

export default function ProposalSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Proposal | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [changesNote, setChangesNote] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [signName, setSignName] = useState("");
  const [signTitle, setSignTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/proposals/share/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Not found");
        return r.json();
      })
      .then((payload: Proposal) => {
        setData(payload);
        setSignName(payload.client_name ?? "");
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const items = data?.metadata_json?.line_items ?? [];
  const addons = data?.metadata_json?.addons ?? [];

  const displayTotal = useMemo(() => {
    const base = sumLineItems(items);
    const addonTotal = addons
      .filter((a) => selectedAddons.includes(a.id))
      .reduce((s, a) => s + a.amount_cents, 0);
    return base + addonTotal;
  }, [items, addons, selectedAddons]);

  function toggleAddon(id: string) {
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function respond(action: "approve" | "reject" | "changes") {
    if (!token) return;
    setSubmitting(true);
    try {
      const path = action === "changes" ? "changes" : action;
      const body =
        action === "approve"
          ? { selected_addon_ids: selectedAddons, signature: { client_name: signName, designation: signTitle } }
          : action === "changes"
            ? { note: changesNote }
            : {};
      const res = await fetch(`${API}/api/proposals/share/${token}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setDone(action);
      else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !data) return <div className="p-12 text-center text-stone-600">{error}</div>;
  if (!data) return <div className="p-12 text-center text-stone-500">Loading proposal…</div>;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold text-stone-900">{data.title}</h1>
      <p className="text-stone-500 mt-2">Prepared for {data.client_name ?? "you"}</p>
      {displayTotal > 0 && <p className="text-xl font-semibold mt-4">{formatInr(displayTotal)}</p>}

      <div className="mt-10 space-y-8">
        {data.sections
          .filter((s) => !["cover", "pricing", "addons", "signature", "timeline", "scope_modules"].includes(s.block_type ?? "") && s.section_key !== "cover")
          .map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-medium border-b border-stone-200 pb-2">{s.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-stone-700 leading-relaxed">{s.content || "—"}</p>
            </section>
          ))}

        {(data.metadata_json?.scope_modules?.groups ?? []).length > 0 && (
          <section>
            <h2 className="text-lg font-medium border-b border-stone-200 pb-2">Detailed Scope of Work</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-6">
              {data.metadata_json!.scope_modules!.groups.map((g, gi) => (
                <div key={gi}>
                  <h3 className="font-medium text-stone-800 mb-2">{g.title}</h3>
                  <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
                    {g.items.map((item, ii) => <li key={ii}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {(data.metadata_json?.timeline_milestones ?? []).length > 0 && (
          <section>
            <h2 className="text-lg font-medium border-b border-stone-200 pb-2">Project Timeline</h2>
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="border-b text-left text-stone-500">
                  <th className="py-2">Milestone</th>
                  <th className="py-2">Start</th>
                  <th className="py-2">End</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.metadata_json!.timeline_milestones!.map((m, idx) => (
                  <tr key={m.id ?? idx} className="border-b border-stone-100">
                    <td className="py-2 font-medium">{m.title}</td>
                    <td className="py-2">{m.start_date || m.duration || "—"}</td>
                    <td className="py-2">{m.end_date || "—"}</td>
                    <td className="py-2 text-stone-600">{m.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {items.length > 0 && (
          <section>
            <h2 className="text-lg font-medium border-b border-stone-200 pb-2">Investment & Milestones</h2>
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Item</th>
                  <th>Qty</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-stone-100">
                    <td className="py-2">{item.description}</td>
                    <td>{item.qty}</td>
                    <td className="text-right">{formatInr(item.qty * item.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data.metadata_json?.payment_milestones ?? []).length > 0 && (
              <ul className="mt-4 text-sm text-stone-600 space-y-1">
                {data.metadata_json!.payment_milestones!.map((m, i) => (
                  <li key={i}>
                    {m.label} — {m.percent}% ({formatInr(Math.round(displayTotal * (m.percent / 100)))})
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {addons.length > 0 && (
          <section>
            <h2 className="text-lg font-medium border-b border-stone-200 pb-2">Optional add-ons</h2>
            <p className="text-sm text-stone-500 mt-2">Select any add-ons to include in your approved scope.</p>
            <ul className="mt-4 space-y-2">
              {addons.map((addon) => (
                <li key={addon.id}>
                  <label className="flex items-center gap-3 rounded-lg border border-stone-200 p-3 cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-300"
                      checked={selectedAddons.includes(addon.id)}
                      onChange={() => toggleAddon(addon.id)}
                    />
                    <span className="flex-1 text-stone-800">{addon.name}</span>
                    <span className="text-sm font-medium text-stone-700">+{formatInr(addon.amount_cents)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {displayTotal > 0 && (
          <p className="text-right text-lg font-semibold border-t border-stone-200 pt-4">
            Total{selectedAddons.length > 0 ? " (with add-ons)" : ""}: {formatInr(displayTotal)}
          </p>
        )}
      </div>

      {!done && data.status !== "approved" && data.status !== "rejected" && (
        <div className="mt-12 space-y-4">
          <div className="rounded-lg border border-stone-200 p-4 space-y-3">
            <p className="text-sm font-medium">Sign to approve</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="rounded-md border border-stone-200 px-3 py-2 text-sm"
                placeholder="Your name"
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
              />
              <input
                className="rounded-md border border-stone-200 px-3 py-2 text-sm"
                placeholder="Designation (optional)"
                value={signTitle}
                onChange={(e) => setSignTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={submitting || !signName.trim()}
              onClick={() => respond("approve")}
              className="rounded-lg bg-stone-900 text-white px-6 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Approve proposal
            </button>
            <button
              disabled={submitting}
              onClick={() => respond("reject")}
              className="rounded-lg border border-stone-300 px-6 py-2.5 text-sm disabled:opacity-50"
            >
              Reject
            </button>
          </div>
          <div className="rounded-lg border border-stone-200 p-4 space-y-2">
            <p className="text-sm font-medium">Request changes</p>
            <textarea
              className="w-full rounded-md border border-stone-200 p-2 text-sm"
              rows={3}
              value={changesNote}
              onChange={(e) => setChangesNote(e.target.value)}
              placeholder="Tell us what you'd like adjusted…"
            />
            <button
              disabled={submitting}
              onClick={() => respond("changes")}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Submit change request
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
      {done && (
        <p className="mt-8 text-emerald-700 font-medium">
          Thank you — your {done === "approve" ? "approval" : done === "reject" ? "response" : "feedback"} has been recorded.
        </p>
      )}
    </main>
  );
}
