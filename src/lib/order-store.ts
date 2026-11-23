import {
  canMove,
  creditOf,
  draftErrors,
  orderTotals,
  submitErrors,
  type Customer,
  type Order,
  type OrderErrors,
  type OrderEvent,
  type OrderInput,
  type OrderStatus,
  type Role,
} from "@/lib/orders"

const STORAGE_KEY = "otc.orders.v1"
const STORE_VERSION = 1
const EMPTY: readonly Order[] = []

export const SAMPLE_CUSTOMERS: readonly Customer[] = [
  {
    code: "KH-001",
    name: "Khách hàng mẫu A",
    address: "Địa chỉ mẫu A",
    creditLimit: 100_000_000,
    openingDebt: 20_000_000,
  },
  {
    code: "KH-002",
    name: "Khách hàng mẫu B",
    address: "Địa chỉ mẫu B",
    creditLimit: 50_000_000,
    openingDebt: 45_000_000,
  },
  {
    code: "KH-003",
    name: "Khách hàng mẫu C",
    address: "Địa chỉ mẫu C",
    creditLimit: 200_000_000,
    openingDebt: 0,
  },
]

export type StoreResult =
  | { ok: true; order: Order }
  | { ok: false; message: string; errors?: OrderErrors }

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedOrders: readonly Order[] = EMPTY

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): readonly Order[] {
  if (!raw) return EMPTY
  try {
    const data = JSON.parse(raw) as { version?: number; orders?: Order[] }
    return data.version === STORE_VERSION && Array.isArray(data.orders)
      ? data.orders
      : EMPTY
  } catch {
    return EMPTY
  }
}

/** Keep one array for one stored value, so that React renders only on a change. */
export function getOrders(): readonly Order[] {
  const raw = readRaw()
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedOrders = parse(raw)
  }
  return cachedOrders
}

export function subscribeOrders(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  listeners.add(listener)
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function write(orders: readonly Order[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORE_VERSION, orders })
    )
  } catch {
    return false
  }
  listeners.forEach((listener) => listener())
  return true
}

function nextCode(orders: readonly Order[]) {
  const highest = orders.reduce((max, order) => {
    const value = Number(order.code.replace("DH-", ""))
    return Number.isSafeInteger(value) ? Math.max(max, value) : max
  }, 0)
  return `DH-${String(highest + 1).padStart(4, "0")}`
}

function commit(orders: readonly Order[], order: Order): StoreResult {
  const exists = orders.some((item) => item.id === order.id)
  const next = exists
    ? orders.map((item) => (item.id === order.id ? order : item))
    : [order, ...orders]
  return write(next)
    ? { ok: true, order }
    : { ok: false, message: "Không lưu được dữ liệu trong trình duyệt." }
}

function moved(order: Order, steps: readonly OrderStatus[], role: Role, note?: string): Order {
  const at = new Date().toISOString()
  const events: OrderEvent[] = steps.map((status, index) => ({
    status,
    at,
    role,
    ...(note && index === steps.length - 1 ? { note } : {}),
  }))
  return {
    ...order,
    status: steps[steps.length - 1]!,
    history: [...order.history, ...events],
    updatedAt: at,
  }
}

export function saveDraft(role: Role, input: OrderInput, id: string | null): StoreResult {
  if (role !== "SALES") {
    return { ok: false, message: "Chỉ nhân viên kinh doanh được đổi đơn nháp." }
  }
  const errors = draftErrors(input)
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Kiểm tra lại thông tin đơn.", errors }
  }
  const orders = getOrders()
  const at = new Date().toISOString()
  if (id) {
    const current = orders.find((order) => order.id === id)
    if (current?.status !== "DRAFT") {
      return { ok: false, message: "Đơn không còn ở trạng thái DRAFT." }
    }
    return commit(orders, { ...current, ...input, updatedAt: at })
  }
  return commit(orders, {
    ...input,
    id: crypto.randomUUID(),
    code: nextCode(orders),
    currency: "VND",
    status: "DRAFT",
    history: [{ status: "DRAFT", at, role }],
    createdAt: at,
    updatedAt: at,
  })
}

/** Send a draft, then check its credit in the same write. */
export function submitOrder(role: Role, id: string): StoreResult {
  if (role !== "SALES") {
    return { ok: false, message: "Chỉ nhân viên kinh doanh được gửi đơn." }
  }
  const orders = getOrders()
  const current = orders.find((order) => order.id === id)
  if (current?.status !== "DRAFT") {
    return { ok: false, message: "Đơn không còn ở trạng thái DRAFT." }
  }
  const errors = submitErrors(current, SAMPLE_CUSTOMERS)
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Đơn chưa đủ thông tin để gửi.", errors }
  }
  const customer = SAMPLE_CUSTOMERS.find((item) => item.code === current.customerCode)!
  const { available } = creditOf(customer, orders, current.id)
  const after: OrderStatus = orderTotals(current).total <= available ? "APPROVED" : "CREDIT_CHECK"
  return commit(orders, moved(current, ["SUBMITTED", after], role))
}

export function decideCredit(
  role: Role,
  id: string,
  decision: "APPROVED" | "CANCELLED",
  note?: string
): StoreResult {
  if (role !== "MANAGER") {
    return { ok: false, message: "Chỉ quản lý được duyệt đơn vượt hạn mức công nợ." }
  }
  const orders = getOrders()
  const current = orders.find((order) => order.id === id)
  if (!current || current.status !== "CREDIT_CHECK" || !canMove(current.status, decision)) {
    return { ok: false, message: "Đơn không còn chờ duyệt công nợ." }
  }
  return commit(orders, moved(current, [decision], role, note?.trim() || undefined))
}
