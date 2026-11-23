import { useState } from "react"

import { OrderStatusBadge } from "@/components/order-status"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { decideCredit, SAMPLE_CUSTOMERS } from "@/lib/order-store"
import {
  creditOf,
  formatMoney,
  orderTotals,
  type Order,
  type Role,
} from "@/lib/orders"

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-4 font-medium" : "flex justify-between gap-4"}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

/** The read view of an order, and the credit decision for a manager. */
export function OrderDetail({
  order,
  orders,
  role,
}: {
  order: Order
  orders: readonly Order[]
  role: Role
}) {
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const customer = SAMPLE_CUSTOMERS.find((item) => item.code === order.customerCode)
  const { subtotal, total } = orderTotals(order)
  const credit = customer ? creditOf(customer, orders, order.id) : null
  const waiting = order.status === "CREDIT_CHECK"

  function decide(decision: "APPROVED" | "CANCELLED") {
    const result = decideCredit(role, order.id, decision, note)
    setError(result.ok ? null : result.message)
    if (result.ok) setNote("")
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">
          {waiting ? "Duyệt công nợ" : "Chi tiết đơn"} {order.code}
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        <Row label="Khách hàng" value={customer ? `${customer.code} · ${customer.name}` : "—"} />
        <Row label="Địa chỉ giao hàng" value={order.shippingAddress || "—"} />
        <Row label="Ngày giao" value={order.deliveryDate || "—"} />
      </dl>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vật tư</TableHead>
            <TableHead className="text-right">Số lượng</TableHead>
            <TableHead className="text-right">Đơn giá</TableHead>
            <TableHead className="text-right">Thành tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>{line.item || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(line.unitPrice)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(line.quantity * line.unitPrice)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <dl className="flex flex-col gap-1 text-sm">
        <Row label="Tiền hàng" value={formatMoney(subtotal)} />
        <Row label="Thuế" value={formatMoney(order.tax)} />
        <Row label="Chiết khấu" value={formatMoney(order.discount)} />
        <Row label="Tổng tiền" value={formatMoney(total)} strong />
      </dl>

      {credit && waiting ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Công nợ của khách hàng</h3>
          <dl className="flex flex-col gap-1 text-sm">
            <Row label="Hạn mức" value={formatMoney(credit.limit)} />
            <Row label="Nợ hiện tại" value={formatMoney(credit.debt)} />
            <Row label="Đơn đã xác nhận chưa thu" value={formatMoney(credit.held)} />
            <Row label="Công nợ khả dụng" value={formatMoney(credit.available)} strong />
            <Row label="Vượt hạn mức" value={formatMoney(total - credit.available)} strong />
          </dl>
        </div>
      ) : null}

      {waiting && role === "MANAGER" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="credit-note">Ghi chú quyết định</Label>
          <Textarea id="credit-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={() => decide("CANCELLED")}>
              Từ chối
            </Button>
            <Button onClick={() => decide("APPROVED")}>Đồng ý</Button>
          </div>
        </div>
      ) : null}

      {waiting && role !== "MANAGER" ? (
        <p className="text-sm text-muted-foreground">Đơn đang chờ quản lý duyệt công nợ.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Lịch sử</h3>
        <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
          {order.history.map((event, index) => (
            <li key={`${event.status}-${index}`}>
              {event.at.slice(0, 19).replace("T", " ")} UTC · {event.status} ·{" "}
              {event.role === "SALES" ? "Kinh doanh" : "Quản lý"}
              {event.note ? ` · ${event.note}` : ""}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
