"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { backend1Api, backend2Api } from "../services/api"
import {
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  DollarSign,
  TrendingUp,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Link } from "react-router-dom"

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    sales: 0,
    revenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: string
    message: string
    time: string
    icon: React.ComponentType<any>
  }>>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const [productsRes, salesRes, usersRes] = await Promise.allSettled([
        backend2Api.get("/api/products"),
        backend1Api.get("/api/sales"),
        backend1Api.get("/api/users"),
      ])

      const products = productsRes.status === "fulfilled" ? productsRes.value.data.data || [] : []
      const sales    = salesRes.status    === "fulfilled" ? salesRes.value.data.data    || [] : []
      const users    = usersRes.status    === "fulfilled" ? usersRes.value.data.data    || [] : []

      const revenue = sales.reduce((total, sale: any) => total + (sale.total || 0), 0)

      setStats({
        users: users.length,
        products: products.length,
        sales: sales.length,
        revenue,
      })

      setRecentActivity([
        { type: "sale",    message: "Nueva venta registrada",    time: "2 min ago",  icon: ShoppingCart },
        { type: "user",    message: "Nuevo usuario registrado",   time: "5 min ago",  icon: Users },
        { type: "product", message: "Producto actualizado",       time: "10 min ago", icon: Package },
      ])
    } catch (err) {
      console.error("Error cargando datos del dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: "Usuarios",
      value: stats.users,
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      change: "+12%",
      positive: true,
    },
    {
      name: "Productos",
      value: stats.products,
      icon: Package,
      gradient: "from-emerald-500 to-teal-500",
      change: "+8%",
      positive: true,
    },
    {
      name: "Ventas",
      value: stats.sales,
      icon: ShoppingCart,
      gradient: "from-orange-500 to-red-500",
      change: "+23%",
      positive: true,
    },
    {
      name: "Ingresos",
      value: `$${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-purple-500 to-pink-500",
      change: "+15%",
      positive: true,
    },
  ]

  const quickActions = [
    { name: "Gestionar Usuarios",   href: "/users",    icon: Users,        color: "blue",    roles: ["Administrador"] },
    { name: "Gestionar Productos",  href: "/products", icon: Package,      color: "emerald", roles: ["Administrador"] },
    { name: "Nueva Venta",          href: "/sales",    icon: ShoppingCart, color: "orange",  roles: ["Vendedor", "Administrador"] },
    { name: "Ver Reportes",         href: "/reports",  icon: BarChart3,    color: "purple",  roles: ["Consultor", "Administrador"] },
  ]

  const filteredActions = quickActions.filter(a => a.roles.includes(user?.role || ""))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')`
          }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">¡Bienvenido, {user?.name}! 👋</h1>
            <p className="text-slate-300 text-lg">Panel de {user?.role} - Sistema SOA</p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Zap className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">Estado del Sistema</p>
              <p className="text-lg font-semibold text-green-400">Activo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(stat => (
          <div
            key={stat.name}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.positive ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`p-4 bg-gradient-to-r ${stat.gradient} rounded-2xl shadow-lg`}>
                <stat.icon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <Activity className="h-6 w-6 mr-2 text-blue-600" /> Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredActions.map(action => (
              <Link
                key={action.name}
                to={action.href}
                className={`p-4 bg-gradient-to-r from-${action.color}-50 to-${action.color}-100 rounded-xl border border-${action.color}-200 hover:shadow-lg transition-all duration-300 hover:scale-105`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-${action.color}-500 rounded-lg group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`font-medium text-${action.color}-700`}>{action.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-green-600" /> Actividad Reciente
          </h3>
          <div className="space-y-4">
            {recentActivity.map((act, idx) => (
              <div key={idx} className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <act.icon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{act.message}</p>
                  <p className="text-xs text-slate-500">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role-specific Information */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-slate-200/50">
        <h3 className="text-2xl font-bold text-slate-900 mb-6">Panel de {user?.role}</h3>

        {user?.role === "Administrador" && (
          <div className="space-y-6">
            {/* Contenido para Administrador… */}
          </div>
        )}
        {user?.role === "Vendedor" && (
          <div className="space-y-6">
            {/* Contenido para Vendedor… */}
          </div>
        )}
        {user?.role === "Consultor" && (
          <div className="space-y-6">
            {/* Contenido para Consultor… */}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
