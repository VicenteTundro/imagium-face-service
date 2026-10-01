import { requireManagedEvent } from "@/lib/auth";
import { listOrders, ORDER_STATUS } from "@/lib/events";
import { dateTimeFull } from "@/lib/format";

/** CSV dos pedidos do evento, no formato que o Excel em português abre direto (; e vírgula decimal). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { event } = await requireManagedEvent((await params).id);
  const orders = await listOrders(event.id);
  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const money = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
  const lines = [
    ["Pedido", "Criado em", "Aprovado em", "Itens", "Bruto (R$)", "Taxa Mercado Pago (R$)", "Situação"].join(";"),
    ...orders.map((o) =>
      [
        o.id, dateTimeFull(o.created_at), o.approved_at ? dateTimeFull(o.approved_at) : "",
        String(Array.isArray(o.photo_ids) ? o.photo_ids.length : 0), money(o.amount_cents), money(o.mp_fee_cents),
        ORDER_STATUS[o.status]?.label ?? o.status,
      ].map(cell).join(";"),
    ),
  ];
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${event.short_id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
