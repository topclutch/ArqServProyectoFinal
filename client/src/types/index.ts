export interface User {
  id?: string
  _id?: string // Agregar esta línea
  name: string
  email: string
  password?: string
  role: "Administrador" | "Vendedor" | "Consultor"
  createdAt: string
  updatedAt: string
}

export type Product = {
  id: number
  name: string
  price: number
  stock: number
  description: string
  category: string
  image_url: string
}

export interface Sale {
  id: string
  _id?: string
  user_id: string
  products: SaleProduct[]
  total: number
  date?: string
  createdAt?: string
  status: "pending" | "completed" | "cancelled"
  client?: string
  notes?: string
}

export interface SaleProduct {
  productId: number
  quantity: number
  price: number
  name?: string
}

export interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
