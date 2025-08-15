"use client"

import { useState, useEffect } from "react"
import { backend1Api, backend2Api } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { ShoppingCart, Plus, Minus, Trash2, Package, User, DollarSign } from "lucide-react"
import toast from "react-hot-toast"

const Sales = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [clientName, setClientName] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await backend2Api.get("/api/products")
      setProducts(response.data.data || [])
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Error al cargar productos")
    }
  }

  const addProduct = (product) => {
    const existingIndex = selectedProducts.findIndex((p) => p.id === product.id)

    if (existingIndex >= 0) {
      const updated = [...selectedProducts]
      updated[existingIndex].quantity += 1
      setSelectedProducts(updated)
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }])
    }
    toast.success(`${product.name} agregado`)
  }

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeProduct(productId)
      return
    }

    const updated = selectedProducts.map((p) => (p.id === productId ? { ...p, quantity: newQuantity } : p))
    setSelectedProducts(updated)
  }

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId))
    toast.success("Producto eliminado del carrito")
  }

  const calculateTotal = () => {
    return selectedProducts.reduce((total, product) => total + product.price * product.quantity, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user || !user.id) {
      toast.error("Usuario no autenticado")
      return
    }

    if (selectedProducts.length === 0) {
      toast.error("Debe agregar al menos un producto")
      return
    }

    if (!clientName.trim()) {
      toast.error("Debe ingresar el nombre del cliente")
      return
    }

    setLoading(true)

    try {
      // Crear las notas combinadas
      const combinedNotes = `Cliente: ${clientName}${notes ? ` | Notas: ${notes}` : ""}`

      const saleData = {
        user_id: user.id || user._id, // Usar tanto id como _id
        client: clientName, // Nombre del cliente
        products: selectedProducts.map((p) => ({
          productId: p.id,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
        })),
        total: calculateTotal(),
        notes: combinedNotes, // Notas combinadas
        status: "completed", // Estado completado
      }

      console.log("=== DATOS DE VENTA DETALLADOS ===")
      console.log("Usuario completo:", user)
      console.log("user.id:", user.id)
      console.log("user._id:", user._id)
      console.log("Tipo de user.id:", typeof user.id)
      console.log("Tipo de user._id:", typeof user._id)
      console.log("user_id que se enviará:", user.id || user._id)
      console.log("Tipo del user_id final:", typeof (user.id || user._id))
      console.log("Datos completos a enviar:", saleData)

      const response = await backend1Api.post("/api/sales", saleData)
      console.log("=== RESPUESTA DEL SERVIDOR ===")
      console.log("Respuesta completa:", response.data)

      if (response.data.success) {
        // Solo actualizar stock si la venta fue exitosa
        try {
          for (const product of selectedProducts) {
            await backend2Api.patch(`/api/products/${product.id}/decrease-stock`, {
              quantity: product.quantity,
            })
          }
          console.log("Stock actualizado correctamente")
        } catch (stockError) {
          console.error("Error actualizando stock:", stockError)
          toast.error("Venta registrada pero error actualizando stock")
        }

        toast.success("¡Venta registrada exitosamente!")

        // Reset form
        setSelectedProducts([])
        setClientName("")
        setNotes("")
        loadProducts() // Reload to get updated stock
      } else {
        toast.error(response.data.message || "Error al registrar la venta")
      }
    } catch (error) {
      console.error("=== ERROR EN VENTA ===")
      console.error("Error completo:", error)
      console.error("Respuesta del error:", error.response?.data)
      console.error("Status del error:", error.response?.status)

      const errorMessage = error.response?.data?.message || "Error al registrar la venta"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-slate-200/50">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Nueva Venta
            </h1>
            <p className="text-slate-600 mt-1">Registra una nueva venta en el sistema</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Products Selection */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200/50">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <Package className="h-6 w-6 mr-2 text-emerald-600" />
            Productos Disponibles
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all duration-200"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{product.name}</h3>
                  <p className="text-sm text-slate-600">{product.category}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-lg font-bold text-emerald-600">${product.price}</span>
                    <span
                      className={`text-sm px-2 py-1 rounded-full ${
                        product.stock > 10
                          ? "bg-green-100 text-green-800"
                          : product.stock > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      Stock: {product.stock}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => addProduct(product)}
                  disabled={product.stock === 0}
                  className="ml-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Shopping Cart & Sale Form */}
        <div className="space-y-6">
          {/* Cart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <ShoppingCart className="h-6 w-6 mr-2 text-orange-600" />
              Carrito de Compras
            </h2>

            {selectedProducts.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No hay productos seleccionados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{product.name}</h3>
                      <p className="text-sm text-slate-600">${product.price} c/u</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(product.id, product.quantity - 1)}
                        className="p-1 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{product.quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, product.quantity + 1)}
                        className="p-1 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sale Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <User className="h-6 w-6 mr-2 text-blue-600" />
              Información de la Venta
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-black placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Ingresa el nombre del cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notas Adicionales (Opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-black placeholder-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                  placeholder="Notas sobre la venta (opcional)"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">Vendedor:</span>
                  <span className="font-semibold text-slate-900">{user?.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">Cliente:</span>
                  <span className="font-semibold text-slate-900">{clientName || "Sin especificar"}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">Productos:</span>
                  <span className="font-semibold text-slate-900">{selectedProducts.length}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="text-slate-900">Total:</span>
                  <span className="text-emerald-600">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || selectedProducts.length === 0 || !clientName.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-6 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                ) : (
                  <DollarSign className="h-6 w-6 mr-2" />
                )}
                {loading ? "Procesando Venta..." : "Registrar Venta"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sales
