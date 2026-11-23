import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"

import { OrderDetail } from "@/components/order-detail"
import { OrderForm } from "@/components/order-form"
import { OrderList } from "@/components/order-list"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useOrders } from "@/hooks/use-orders"
import type { Role } from "@/lib/orders"

export function App() {
  const orders = useOrders()
  const [role, setRole] = useState<Role>("SALES")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  // A save keeps the form open. Only a new choice of order resets it.
  const [formKey, setFormKey] = useState(0)

  const selected = orders.find((order) => order.id === selectedId) ?? null
  const showForm = role === "SALES" && (selected ? selected.status === "DRAFT" : creating)

  function choose(id: string | null, create: boolean) {
    setSelectedId(id)
    setCreating(create)
    setFormKey((key) => key + 1)
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-lg font-medium">Đơn hàng</h1>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="app-role">Vai trò chạy thử</Label>
            <NativeSelect
              id="app-role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value as Role)
                setFormKey((key) => key + 1)
              }}
            >
              <NativeSelectOption value="SALES">Nhân viên kinh doanh</NativeSelectOption>
              <NativeSelectOption value="MANAGER">Quản lý</NativeSelectOption>
            </NativeSelect>
          </div>
          {role === "SALES" ? (
            <Button onClick={() => choose(null, true)}>
              <IconPlus data-icon="inline-start" />
              Tạo đơn
            </Button>
          ) : null}
        </div>
      </header>

      <main className="grid items-start gap-6 lg:grid-cols-2">
        <OrderList orders={orders} selectedId={selectedId} onSelect={(id) => choose(id, false)} />
        <div className="min-w-0">
          {showForm ? (
            <OrderForm key={formKey} order={selected} onSaved={setSelectedId} />
          ) : selected ? (
            <OrderDetail key={selected.id} order={selected} orders={orders} role={role} />
          ) : (
            <p className="text-sm text-muted-foreground">Chọn một đơn hàng để xem.</p>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
