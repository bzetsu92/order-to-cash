import { OrderStatusBadge } from "@/components/order-status"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SAMPLE_CUSTOMERS } from "@/lib/order-store"
import { formatMoney, orderTotals, type Order } from "@/lib/orders"

export function OrderList({
  orders,
  selectedId,
  onSelect,
}: {
  orders: readonly Order[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có đơn hàng.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã đơn</TableHead>
          <TableHead>Khách hàng</TableHead>
          <TableHead className="text-right">Tổng tiền</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id} data-state={order.id === selectedId ? "selected" : undefined}>
            <TableCell>
              <Button variant="link" size="xs" onClick={() => onSelect(order.id)}>
                {order.code}
              </Button>
            </TableCell>
            <TableCell>
              {SAMPLE_CUSTOMERS.find((customer) => customer.code === order.customerCode)?.name ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(orderTotals(order).total)}
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
