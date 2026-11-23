import { useState } from "react"
import { IconPlus, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { SAMPLE_CUSTOMERS, saveDraft, submitOrder } from "@/lib/order-store"
import {
  formatMoney,
  orderTotals,
  type Order,
  type OrderErrors,
  type OrderInput,
} from "@/lib/orders"

type LineDraft = { id: string; item: string; quantity: string; unitPrice: string }

const digits = (value: string) => value.replace(/\D/g, "")
const emptyLine = (): LineDraft => ({
  id: crypto.randomUUID(),
  item: "",
  quantity: "",
  unitPrice: "",
})
const shown = (value: number) => (value === 0 ? "" : String(value))

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

export function OrderForm({
  order,
  onSaved,
}: {
  order: Order | null
  onSaved: (id: string) => void
}) {
  const [orderId, setOrderId] = useState(order?.id ?? null)
  const [customerCode, setCustomerCode] = useState(order?.customerCode ?? "")
  const [shippingAddress, setShippingAddress] = useState(order?.shippingAddress ?? "")
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? "")
  const [lines, setLines] = useState<LineDraft[]>(
    order?.lines.length
      ? order.lines.map((line) => ({
          id: line.id,
          item: line.item,
          quantity: shown(line.quantity),
          unitPrice: shown(line.unitPrice),
        }))
      : [emptyLine()]
  )
  const [tax, setTax] = useState(shown(order?.tax ?? 0))
  const [discount, setDiscount] = useState(shown(order?.discount ?? 0))
  const [errors, setErrors] = useState<OrderErrors>({})
  const [message, setMessage] = useState<string | null>(null)

  const input: OrderInput = {
    customerCode,
    shippingAddress: shippingAddress.trim(),
    deliveryDate,
    lines: lines.map((line) => ({
      id: line.id,
      item: line.item.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    })),
    tax: Number(tax),
    discount: Number(discount),
  }
  const { subtotal, total } = orderTotals(input)

  function changeLine(id: string, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function changeCustomer(code: string) {
    setCustomerCode(code)
    const customer = SAMPLE_CUSTOMERS.find((item) => item.code === code)
    if (customer && !shippingAddress.trim()) setShippingAddress(customer.address)
  }

  function save() {
    const result = saveDraft("SALES", input, orderId)
    setErrors(result.ok ? {} : (result.errors ?? {}))
    setMessage(result.ok ? `Đã lưu đơn ${result.order.code}.` : result.message)
    if (!result.ok) return null
    setOrderId(result.order.id)
    onSaved(result.order.id)
    return result.order
  }

  function submit() {
    const saved = save()
    if (!saved) return
    const result = submitOrder("SALES", saved.id)
    if (!result.ok) {
      setErrors(result.errors ?? {})
      setMessage(result.message)
      return
    }
    onSaved(result.order.id)
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <h2 className="text-base font-medium">
        {order ? `Sửa đơn ${order.code}` : "Tạo đơn hàng"}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-customer">Khách hàng</Label>
          <NativeSelect
            id="order-customer"
            className="w-full"
            value={customerCode}
            aria-invalid={!!errors.customerCode}
            aria-describedby={errors.customerCode ? "order-customer-error" : undefined}
            onChange={(event) => changeCustomer(event.target.value)}
          >
            <NativeSelectOption value="">Chọn khách hàng</NativeSelectOption>
            {SAMPLE_CUSTOMERS.map((customer) => (
              <NativeSelectOption key={customer.code} value={customer.code}>
                {customer.code} · {customer.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError id="order-customer-error" message={errors.customerCode} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-date">Ngày giao</Label>
          <Input
            id="order-date"
            type="date"
            value={deliveryDate}
            aria-invalid={!!errors.deliveryDate}
            aria-describedby={errors.deliveryDate ? "order-date-error" : undefined}
            onChange={(event) => setDeliveryDate(event.target.value)}
          />
          <FieldError id="order-date-error" message={errors.deliveryDate} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="order-address">Địa chỉ giao hàng</Label>
        <Textarea
          id="order-address"
          rows={2}
          value={shippingAddress}
          aria-invalid={!!errors.shippingAddress}
          aria-describedby={errors.shippingAddress ? "order-address-error" : undefined}
          onChange={(event) => setShippingAddress(event.target.value)}
        />
        <FieldError id="order-address-error" message={errors.shippingAddress} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Danh mục vật tư</legend>
        {lines.map((line, index) => (
          <div key={line.id} className="grid items-end gap-2 sm:grid-cols-[1fr_6rem_9rem_auto]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`line-item-${line.id}`}>Vật tư {index + 1}</Label>
              <Input
                id={`line-item-${line.id}`}
                value={line.item}
                onChange={(event) => changeLine(line.id, { item: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`line-quantity-${line.id}`}>Số lượng</Label>
              <Input
                id={`line-quantity-${line.id}`}
                inputMode="numeric"
                value={line.quantity}
                onChange={(event) => changeLine(line.id, { quantity: digits(event.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`line-price-${line.id}`}>Đơn giá (VND)</Label>
              <Input
                id={`line-price-${line.id}`}
                inputMode="numeric"
                value={line.unitPrice}
                onChange={(event) => changeLine(line.id, { unitPrice: digits(event.target.value) })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Xóa vật tư ${index + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
            >
              <IconTrash />
            </Button>
          </div>
        ))}
        <FieldError id="order-lines-error" message={errors.lines} />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, emptyLine()])}
          >
            <IconPlus data-icon="inline-start" />
            Thêm vật tư
          </Button>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-tax">Thuế (VND)</Label>
          <Input
            id="order-tax"
            inputMode="numeric"
            value={tax}
            onChange={(event) => setTax(digits(event.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-discount">Chiết khấu (VND)</Label>
          <Input
            id="order-discount"
            inputMode="numeric"
            value={discount}
            onChange={(event) => setDiscount(digits(event.target.value))}
          />
        </div>
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tiền hàng</dt>
          <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt>Tổng tiền</dt>
          <dd className="tabular-nums">{formatMoney(total)}</dd>
        </div>
      </dl>
      <FieldError id="order-total-error" message={errors.total} />

      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={save}>
          Lưu đơn nháp
        </Button>
        <Button type="submit">Gửi đơn</Button>
      </div>
    </form>
  )
}
