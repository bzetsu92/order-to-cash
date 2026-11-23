import { useSyncExternalStore } from "react"

import { getOrders, subscribeOrders } from "@/lib/order-store"

export function useOrders() {
  return useSyncExternalStore(subscribeOrders, getOrders)
}
