export const ORDER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "CREDIT_CHECK",
  "APPROVED",
  "PREPARING",
  "PART_SHIPPED",
  "SHIPPED",
  "INVOICED",
  "OVERDUE",
  "PAID",
  "RETURNED",
  "CANCELLED",
  "CLOSED",
  "BAD_DEBT",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type Role = "SALES" | "MANAGER"

export const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Đang nhập",
  SUBMITTED: "Đã gửi xử lý",
  CREDIT_CHECK: "Chờ duyệt công nợ",
  APPROVED: "Đã xác nhận",
  PREPARING: "Kho đang chuẩn bị",
  PART_SHIPPED: "Đã giao một phần",
  SHIPPED: "Đã giao toàn bộ",
  INVOICED: "Đã xuất hóa đơn",
  OVERDUE: "Quá hạn",
  PAID: "Đã thanh toán",
  RETURNED: "Có hàng trả lại",
  CANCELLED: "Đã hủy",
  CLOSED: "Đã hoàn tất",
  BAD_DEBT: "Không thu hồi",
}

// SUBMITTED to APPROVED follows the flow chart for an order within the credit limit.
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["CREDIT_CHECK", "APPROVED", "CANCELLED"],
  CREDIT_CHECK: ["APPROVED", "CANCELLED"],
  APPROVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PART_SHIPPED", "SHIPPED", "CANCELLED"],
  PART_SHIPPED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["INVOICED"],
  INVOICED: ["PAID", "OVERDUE"],
  OVERDUE: ["PAID", "BAD_DEBT"],
  PAID: ["CLOSED", "RETURNED"],
  RETURNED: ["CLOSED"],
  CANCELLED: [],
  CLOSED: [],
  BAD_DEBT: [],
}

// These orders hold credit until the customer pays.
const CREDIT_HOLDING: readonly OrderStatus[] = [
  "APPROVED",
  "PREPARING",
  "PART_SHIPPED",
  "SHIPPED",
  "INVOICED",
  "OVERDUE",
]

export type Customer = {
  code: string
  name: string
  address: string
  creditLimit: number
  openingDebt: number
}

export type OrderLine = {
  id: string
  item: string
  quantity: number
  unitPrice: number
}

export type OrderInput = {
  customerCode: string
  shippingAddress: string
  deliveryDate: string
  lines: OrderLine[]
  tax: number
  discount: number
}

export type OrderEvent = {
  status: OrderStatus
  at: string
  role: Role
  note?: string
}

export type Order = OrderInput & {
  id: string
  code: string
  currency: "VND"
  status: OrderStatus
  history: OrderEvent[]
  createdAt: string
  updatedAt: string
}

export type OrderErrors = Partial<
  Record<"customerCode" | "shippingAddress" | "deliveryDate" | "lines" | "total", string>
>

export function canMove(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to)
}

export function orderTotals(order: Pick<OrderInput, "lines" | "tax" | "discount">) {
  const subtotal = order.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  )
  return { subtotal, total: subtotal + order.tax - order.discount }
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** The amounts must be valid in a draft. Other fields can stay empty. */
export function draftErrors(input: OrderInput): OrderErrors {
  const errors: OrderErrors = {}
  const { subtotal, total } = orderTotals(input)
  if (input.deliveryDate && !isIsoDate(input.deliveryDate)) {
    errors.deliveryDate = "Ngày giao không hợp lệ."
  }
  if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(total)) {
    errors.total = "Số tiền quá lớn."
  } else if (total < 0) {
    errors.total = "Tổng tiền không được âm."
  }
  return errors
}

export function submitErrors(input: OrderInput, customers: readonly Customer[]): OrderErrors {
  const errors = draftErrors(input)
  if (!customers.some((customer) => customer.code === input.customerCode)) {
    errors.customerCode = "Chọn khách hàng."
  }
  if (!input.shippingAddress.trim()) errors.shippingAddress = "Nhập địa chỉ giao hàng."
  if (!input.deliveryDate) errors.deliveryDate = "Nhập ngày giao."
  const linesOk =
    input.lines.length > 0 &&
    input.lines.every((line) => line.item.trim() && line.quantity > 0)
  if (!linesOk) errors.lines = "Mỗi dòng vật tư cần tên và số lượng lớn hơn 0."
  return errors
}

/** The credit left for this order. The order itself does not count. */
export function creditOf(customer: Customer, orders: readonly Order[], orderId: string) {
  const held = orders
    .filter(
      (order) =>
        order.id !== orderId &&
        order.customerCode === customer.code &&
        CREDIT_HOLDING.includes(order.status)
    )
    .reduce((sum, order) => sum + orderTotals(order).total, 0)
  return {
    limit: customer.creditLimit,
    debt: customer.openingDebt,
    held,
    available: customer.creditLimit - customer.openingDebt - held,
  }
}

export function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} VND`
}
