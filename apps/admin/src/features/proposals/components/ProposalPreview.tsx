import type { ProposalMetadata } from "../constants";
import { formatInr, formatProposalContent, sumLineItems } from "../constants";

type Section = { title: string; content: string; block_type?: string; section_key?: string };

type Props = {
  title: string;
  clientName?: string | null;
  projectType?: string | null;
  metadata: ProposalMetadata;
  sections: Section[];
  totalCents?: number;
};

export function ProposalPreview({ title, clientName, projectType, metadata, sections, totalCents }: Props) {
  const lineTotal = sumLineItems(metadata.line_items);
  const total = totalCents ?? lineTotal;
  const coverSection = sections.find((s) => s.section_key === "cover" || s.title === "Cover");
  const skipTypes = new Set(["cover", "pricing", "addons", "signature", "scope_modules"]);

  return (
    <div className="bg-white text-stone-900 rounded-xl shadow-lg border border-stone-200 overflow-hidden">
      <div className="bg-stone-900 text-white px-8 py-12 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-3">Digital Transformation Proposal</p>
        {coverSection?.content ? (
          <p className="whitespace-pre-wrap text-stone-200 text-sm leading-relaxed">{coverSection.content}</p>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="mt-3 text-stone-300">Prepared for {clientName ?? "Client"}</p>
            <p className="mt-2 text-sm text-stone-400">Prepared by CurvvTech</p>
            {metadata.proposal_reference && <p className="mt-2 text-xs text-stone-500">Ref: {metadata.proposal_reference}</p>}
            {projectType && <p className="mt-1 text-sm text-stone-400">{projectType}</p>}
          </>
        )}
        {total > 0 && <p className="mt-6 text-2xl font-semibold">{formatInr(total)}</p>}
      </div>

      <div className="px-8 py-10 space-y-10">
        {sections.map((section, i) => {
          const block = section.block_type ?? "text";
          if (skipTypes.has(block) || section.section_key === "cover") return null;

          if (block === "scope_modules") {
            const groups = metadata.scope_modules?.groups ?? [];
            if (groups.length === 0) return null;
            return (
              <section key={i}>
                <h2 className="text-lg font-semibold border-b border-stone-200 pb-2">{section.title}</h2>
                <div className="mt-4 grid sm:grid-cols-2 gap-6">
                  {groups.map((g, gi) => (
                    <div key={gi}>
                      <h3 className="font-medium text-stone-800 mb-2">{g.title}</h3>
                      <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
                        {g.items.map((item, ii) => <li key={ii}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block === "timeline") {
            const rows = metadata.timeline_milestones ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={i}>
                <h2 className="text-lg font-semibold border-b border-stone-200 pb-2">{section.title}</h2>
                <table className="w-full mt-4 text-sm">
                  <thead>
                    <tr className="border-b text-left text-stone-500">
                      <th className="py-2 font-medium">Milestone</th>
                      <th className="py-2 font-medium">Start</th>
                      <th className="py-2 font-medium">End</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id} className="border-b border-stone-100">
                        <td className="py-2.5 font-medium">{m.title}</td>
                        <td className="py-2.5">{m.start_date ?? m.duration ?? "—"}</td>
                        <td className="py-2.5">{m.end_date ?? "—"}</td>
                        <td className="py-2.5 text-stone-600">{m.description ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          }

          if (!section.content?.trim()) return null;

          return (
            <section key={i}>
              <h2 className="text-lg font-semibold border-b border-stone-200 pb-2">{section.title}</h2>
              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-stone-700">{formatProposalContent(section.content)}</p>
            </section>
          );
        })}

        {(metadata.line_items ?? []).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold border-b border-stone-200 pb-2">Investment & Milestones</h2>
            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="border-b text-left text-stone-500">
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium text-center">Qty</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {metadata.line_items!.map((item) => (
                  <tr key={item.id} className="border-b border-stone-100">
                    <td className="py-2.5">{item.description}</td>
                    <td className="py-2.5 text-center">{item.qty}</td>
                    <td className="py-2.5 text-right">{formatInr(item.qty * item.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-semibold text-lg mt-4">Total: {formatInr(lineTotal)}</p>
            {(metadata.payment_milestones ?? []).length > 0 && (
              <ul className="mt-4 text-sm text-stone-600 space-y-1">
                {metadata.payment_milestones!.map((m) => (
                  <li key={m.id}>
                    {m.label} — {m.percent}% ({formatInr(Math.round(lineTotal * (m.percent / 100)))})
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {(metadata.addons ?? []).length > 0 && (
          <section>
            <h2 className="text-lg font-semibold border-b border-stone-200 pb-2">Optional add-ons</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {metadata.addons!.map((a) => (
                <li key={a.id} className="flex justify-between border border-stone-100 rounded-lg px-4 py-2">
                  <span>{a.name}</span>
                  <span className="font-medium">+{formatInr(a.amount_cents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold border-b border-stone-200 pb-2">Signatures</h2>
          <div className="grid sm:grid-cols-2 gap-8 mt-8">
            <SignaturePreview label="CurvvTech" name="Authorized signatory" />
            <SignaturePreview
              label={clientName ?? "Client"}
              name={metadata.signature?.client_name ?? "Client signatory"}
              subtitle={metadata.signature?.designation}
            />
          </div>
        </section>
      </div>

      <div className="px-8 py-4 bg-stone-50 border-t border-stone-200 text-center text-xs text-stone-400">
        CurvvTech · Confidential proposal
      </div>
    </div>
  );
}

function SignaturePreview({ label, name, subtitle }: { label: string; name: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400 mb-6">{label}</p>
      <div className="border-b border-stone-300 h-12 mb-2" />
      <p className="font-medium text-sm">{name}</p>
      {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      <p className="text-xs text-stone-400 mt-2">Date: _______________</p>
    </div>
  );
}
