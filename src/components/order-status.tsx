import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders"

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline">
      {status} · {STATUS_LABELS[status]}
    </Badge>
  )
}
