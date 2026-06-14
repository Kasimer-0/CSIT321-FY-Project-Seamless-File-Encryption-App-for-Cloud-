import { useEffect, useState, type CSSProperties } from "react"

/**
 * Compatibility module for the react-hot-toast imports already used by the UI.
 * The original dependency was unavailable in the project setup, so this small adapter preserves
 * the same success/error API and prevents the Vite application from failing at startup.
 */
type ToastType = "success" | "error" | "loading"

type ToastEvent = {
  id: number
  message: string
  type: ToastType
}

type ToasterProps = {
  position?: "top-center" | "top-right" | "top-left" | "bottom-center" | "bottom-right" | "bottom-left"
}

let nextToastId = 1
const subscribers = new Set<(toast: ToastEvent) => void>()

function notify(type: ToastType, message: unknown) {
  const toast = {
    id: nextToastId++,
    message: String(message),
    type,
  }
  subscribers.forEach((subscriber) => subscriber(toast))
  return toast.id
}

const toast = {
  success: (message: unknown) => notify("success", message),
  error: (message: unknown) => notify("error", message),
  loading: (message: unknown) => notify("loading", message),
  dismiss: () => undefined,
}

function positionStyle(position: ToasterProps["position"]): CSSProperties {
  const vertical = position?.startsWith("bottom") ? "bottom" : "top"
  const horizontal = position?.endsWith("left")
    ? "left"
    : position?.endsWith("right")
      ? "right"
      : "center"

  return {
    position: "fixed",
    zIndex: 2000,
    [vertical]: 16,
    left: horizontal === "center" ? "50%" : horizontal === "left" ? 16 : undefined,
    right: horizontal === "right" ? 16 : undefined,
    transform: horizontal === "center" ? "translateX(-50%)" : undefined,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    pointerEvents: "none",
  }
}

function toastStyle(type: ToastType): CSSProperties {
  return {
    minWidth: 260,
    maxWidth: 420,
    padding: "10px 14px",
    borderRadius: 6,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)",
    color: type === "error" ? "#842029" : type === "success" ? "#0f5132" : "#084298",
    background: type === "error" ? "#f8d7da" : type === "success" ? "#d1e7dd" : "#cfe2ff",
    border: `1px solid ${type === "error" ? "#f5c2c7" : type === "success" ? "#badbcc" : "#b6d4fe"}`,
    fontSize: 14,
    pointerEvents: "auto",
  }
}

export function Toaster({ position = "top-center" }: ToasterProps) {
  const [items, setItems] = useState<ToastEvent[]>([])

  useEffect(() => {
    const subscriber = (item: ToastEvent) => {
      setItems((current) => [...current, item])
      window.setTimeout(() => {
        setItems((current) => current.filter((toastItem) => toastItem.id !== item.id))
      }, 3200)
    }

    subscribers.add(subscriber)
    return () => {
      subscribers.delete(subscriber)
    }
  }, [])

  return (
    <div style={positionStyle(position)}>
      {items.map((item) => (
        <div key={item.id} style={toastStyle(item.type)} role="status">
          {item.message}
        </div>
      ))}
    </div>
  )
}

export default toast
