"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { backend1Api, backend2Api } from "../services/api"
import { useAuth } from "../context/AuthContext"
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  FileText,
  Eye,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface Sale {
  id: string
  _id?: string
  user_id:
    | {
        _id: string
        name: string
        email: string
      }
    | string // Puede ser string si no está populated
  client?: string
  products: Array<{
    productId: number
    name: string
    quantity: number
    price: number
  }>
  total: number
  createdAt: string
  status: string
  notes?: string
}

interface User {
  id: string
  _id?: string
  name: string
  email: string
  role: string
}

interface Product {
  id: number
  name: string
  price: number
  stock: number
  category: string
}

const Reports: React.FC = () => {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesRes, productsRes, usersRes] = await Promise.allSettled([
        backend1Api.get("/api/sales"),
        backend2Api.get("/api/products"),
        backend1Api.get("/api/users"),
      ])

      const salesData = salesRes.status === "fulfilled" ? salesRes.value.data.data || [] : []
      const productsData = productsRes.status === "fulfilled" ? productsRes.value.data.data || [] : []
      const usersData = usersRes.status === "fulfilled" ? usersRes.value.data.data || [] : []

      setSales(salesData)
      setProducts(productsData)
      setUsers(usersData)

      console.log("=== DATOS CARGADOS EN REPORTS ===")
      console.log("Sales:", salesData)
      if (salesData.length > 0) {
        console.log("Ejemplo de venta:", salesData[0])
        console.log("user_id de la venta:", salesData[0].user_id)
        console.log("Tipo de user_id:", typeof salesData[0].user_id)
        if (typeof salesData[0].user_id === "object") {
          console.log("user_id.name:", salesData[0].user_id.name)
          console.log("user_id.email:", salesData[0].user_id.email)
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
      toast.error("Error al cargar datos del reporte")
    } finally {
      setLoading(false)
    }
  }

  // Función para extraer cliente de las notas
  const extractClientFromNotes = (sale: Sale): string => {
    if (sale.client) return sale.client

    if (sale.notes) {
      const clientMatch = sale.notes.match(/Cliente:\s*([^|]+)/)
      if (clientMatch) {
        return clientMatch[1].trim()
      }
    }

    return "Cliente no especificado"
  }

  // Función para obtener el nombre del vendedor
  const getSellerName = (sale: Sale): string => {
    console.log(`=== OBTENIENDO NOMBRE DEL VENDEDOR ===`)
    console.log("sale.user_id:", sale.user_id)
    console.log("Tipo de sale.user_id:", typeof sale.user_id)

    // Si user_id es un objeto (populated)
    if (typeof sale.user_id === "object" && sale.user_id !== null) {
      console.log("user_id es objeto, nombre:", sale.user_id.name)
      return sale.user_id.name || "Vendedor desconocido"
    }

    // Si user_id es un string (no populated), buscar en la lista de usuarios
    if (typeof sale.user_id === "string") {
      console.log("user_id es string, buscando en lista de usuarios...")
      const seller = users.find((u) => {
        const userId = String(u.id || u._id)
        const saleUserId = String(sale.user_id)
        console.log(`Comparando: "${userId}" === "${saleUserId}"`)
        return userId === saleUserId
      })

      console.log("Vendedor encontrado:", seller)
      return seller?.name || `Vendedor desconocido (ID: ${sale.user_id})`
    }

    return "Vendedor desconocido"
  }

  // Función para obtener el ID del vendedor
  const getSellerId = (sale: Sale): string => {
    if (typeof sale.user_id === "object" && sale.user_id !== null) {
      return sale.user_id._id
    }
    return String(sale.user_id)
  }

  // Datos filtrados
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt)
      const fromDate = dateFrom ? new Date(dateFrom) : null
      const toDate = dateTo ? new Date(dateTo) : null

      const dateMatch = (!fromDate || saleDate >= fromDate) && (!toDate || saleDate <= toDate)
      const userMatch = !selectedUser || getSellerId(sale) === selectedUser
      const statusMatch = !selectedStatus || sale.status === selectedStatus

      return dateMatch && userMatch && statusMatch
    })
  }, [sales, dateFrom, dateTo, selectedUser, selectedStatus])

  // Métricas calculadas
  const metrics = useMemo(() => {
    // Filtrar solo ventas completadas para las métricas de dinero
    const completedSales = filteredSales.filter((sale) => sale.status === "completed")

    const totalSales = filteredSales.length
    const totalRevenue = completedSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const avgSaleValue = completedSales.length > 0 ? totalRevenue / completedSales.length : 0
    const totalProducts = products.length
    const totalUsers = users.length

    return {
      totalSales,
      totalRevenue,
      avgSaleValue,
      totalProducts,
      totalUsers,
    }
  }, [filteredSales, products, users])

  // Datos para gráficos
  const chartData = useMemo(() => {
    // Filtrar solo ventas completadas para cálculos de dinero
    const completedSales = filteredSales.filter((sale) => sale.status === "completed")

    // Ventas por mes (solo completadas)
    const salesByMonth = completedSales.reduce(
      (acc, sale) => {
        const date = new Date(sale.createdAt)
        const month = date.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
        })
        acc[month] = (acc[month] || 0) + (sale.total || 0)
        return acc
      },
      {} as Record<string, number>,
    )

    const monthlyData = Object.entries(salesByMonth)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, total]) => ({
        month,
        total: Number(total.toFixed(2)),
      }))

    // Ventas por usuario (solo completadas)
    const salesByUser = completedSales.reduce(
      (acc, sale) => {
        const sellerName = getSellerName(sale)
        acc[sellerName] = (acc[sellerName] || 0) + (sale.total || 0)
        return acc
      },
      {} as Record<string, number>,
    )

    const userSalesData = Object.entries(salesByUser).map(([name, total]) => ({
      name,
      total: Number(total.toFixed(2)),
    }))

    // Productos más vendidos
    const productSales = filteredSales.reduce(
      (acc, sale) => {
        if (sale.products && Array.isArray(sale.products)) {
          sale.products.forEach((product) => {
            const productName = product.name || `Producto ${product.productId}`
            acc[productName] = (acc[productName] || 0) + (product.quantity || 0)
          })
        }
        return acc
      },
      {} as Record<string, number>,
    )

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }))

    // Estados de ventas
    const statusData = filteredSales.reduce(
      (acc, sale) => {
        const status = sale.status || "unknown"
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const statusChartData = Object.entries(statusData).map(([status, count]) => ({
      status:
        status === "completed"
          ? "Completada"
          : status === "pending"
            ? "Pendiente"
            : status === "cancelled"
              ? "Cancelada"
              : status === "failed"
                ? "Fallida"
                : "Desconocido",
      count,
    }))

    return {
      monthlyData,
      userSalesData,
      topProducts,
      statusChartData,
    }
  }, [filteredSales])

  const generatePDF = () => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setTextColor(0, 0, 0)
    doc.text("Reporte de Ventas - SOA System", 14, 20)

    doc.setFontSize(12)
    doc.text(`Generado por: ${user?.name}`, 14, 30)
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 35)

    if (dateFrom || dateTo) {
      doc.text(`Período: ${dateFrom || "Inicio"} - ${dateTo || "Fin"}`, 14, 40)
    }

    // Métricas
    doc.setFontSize(14)
    doc.text("Resumen Ejecutivo", 14, 55)
    doc.setFontSize(10)
    doc.text(`Total de Ventas: ${metrics.totalSales}`, 14, 65)
    doc.text(`Ingresos Totales: $${metrics.totalRevenue.toFixed(2)}`, 14, 70)
    doc.text(`Valor Promedio por Venta: $${metrics.avgSaleValue.toFixed(2)}`, 14, 75)

    // Tabla de ventas
    autoTable(doc, {
      startY: 85,
      head: [["ID", "Cliente", "Vendedor", "Fecha", "Estado", "Total"]],
      body: filteredSales.map((sale) => [
        sale.id || sale._id || "N/A",
        extractClientFromNotes(sale),
        getSellerName(sale),
        new Date(sale.createdAt).toLocaleDateString(),
        sale.status === "completed"
          ? "Completada"
          : sale.status === "pending"
            ? "Pendiente"
            : sale.status === "failed"
              ? "Fallida"
              : "Cancelada",
        `$${(sale.total || 0).toFixed(2)}`,
      ]),
      styles: {
        fontSize: 8,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
      },
    })

    doc.save(`reporte_ventas_${new Date().toISOString().split("T")[0]}.pdf`)
    toast.success("Reporte PDF generado exitosamente")
  }

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setSelectedUser("")
    setSelectedStatus("")
    toast.success("Filtros limpiados")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-slate-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                Reportes y Análisis
              </h1>
              <p className="text-slate-600 mt-1">Panel de consulta y análisis de datos del sistema</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={generatePDF}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Download className="h-5 w-5 mr-2" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <Filter className="h-6 w-6 mr-2 text-indigo-600" />
            Filtros de Consulta
          </h2>
          <button
            onClick={clearFilters}
            className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-all duration-200"
          >
            Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              Vendedor
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            >
              <option value="">Todos los vendedores</option>
              {users
                .filter((u) => u.role === "Vendedor" || u.role === "Administrador")
                .map((user) => (
                  <option key={user.id || user._id} value={user.id || user._id}>
                    {user.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <ShoppingCart className="h-4 w-4 inline mr-1" />
              Estado
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            >
              <option value="">Todos los estados</option>
              <option value="completed">Completadas</option>
              <option value="pending">Pendientes</option>
              <option value="failed">Fallidas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Total Ventas</p>
              <p className="text-3xl font-bold text-slate-900">{metrics.totalSales}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Ingresos Totales</p>
              <p className="text-3xl font-bold text-slate-900">${metrics.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Promedio por Venta</p>
              <p className="text-3xl font-bold text-slate-900">${metrics.avgSaleValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Productos</p>
              <p className="text-3xl font-bold text-slate-900">{metrics.totalProducts}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Usuarios</p>
              <p className="text-3xl font-bold text-slate-900">{metrics.totalUsers}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ventas por Mes */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Ventas por Mes
            </CardTitle>
            <CardDescription>Evolución de ingresos mensuales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                    formatter={(value) => [`$${value}`, "Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ventas por Usuario */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-emerald-600" />
              Ventas por Vendedor
            </CardTitle>
            <CardDescription>Rendimiento por vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.userSalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                    formatter={(value) => [`$${value}`, "Total Ventas"]}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Productos Más Vendidos */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-orange-600" />
              Productos Más Vendidos
            </CardTitle>
            <CardDescription>Top 5 productos por cantidad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                    formatter={(value) => [`${value}`, "Cantidad Vendida"]}
                  />
                  <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Estados de Ventas */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
              Estados de Ventas
            </CardTitle>
            <CardDescription>Distribución por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chartData.statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Ventas Detallada */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
        <div className="p-6 border-b border-slate-200/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-600" />
            Detalle de Ventas
            <span className="ml-2 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
              {filteredSales.length} registros
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredSales.map((sale, index) => {
                const sellerName = getSellerName(sale)
                const client = extractClientFromNotes(sale)

                return (
                  <tr key={sale.id || sale._id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {sale.id || sale._id || `#${index + 1}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{client}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <span
                        className={sellerName.includes("desconocido") ? "text-red-500 font-medium" : "text-slate-900"}
                      >
                        {sellerName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(sale.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : sale.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : sale.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {sale.status === "completed"
                          ? "Completada"
                          : sale.status === "pending"
                            ? "Pendiente"
                            : sale.status === "failed"
                              ? "Fallida"
                              : "Cancelada"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      ${(sale.total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-all duration-200"
                        onClick={() => {
                          console.log("Detalles de la venta:", sale)
                          toast.success("Ver detalles en consola")
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredSales.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No se encontraron ventas con los filtros aplicados</p>
              <p className="text-slate-400 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports
