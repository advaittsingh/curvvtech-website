import { inbox } from "../../theme/inbox";

/** Maps server `delivery_status` to WhatsApp-style ticks (business-sent only). */
export function deliveryMeta(status: string): {
  ticks: string;
  tickColor: string;
  label: string;
} {
  const s = status.toLowerCase();
  if (s === "read" || s === "played") {
    return { ticks: "✓✓", tickColor: inbox.tickRead, label: "Read" };
  }
  if (s === "delivered") {
    return { ticks: "✓✓", tickColor: inbox.tickDelivered, label: "Delivered" };
  }
  if (s === "sent" || s === "sent_to_graph") {
    return { ticks: "✓", tickColor: inbox.tickDelivered, label: "Sent" };
  }
  return { ticks: "✓", tickColor: inbox.tickDelivered, label: status };
}
