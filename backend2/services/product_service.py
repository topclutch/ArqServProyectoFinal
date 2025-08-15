# services/product_service.py

# Suponiendo que tienes un modelo Product similar a este
# from models import Product, db

def get_all_products_service():
    # Lógica para obtener todos los productos
    # Ejemplo: return [p.to_dict() for p in Product.query.all()]
    pass

def get_product_by_id_service(product_id):
    # Lógica para obtener un producto por ID
    # Ejemplo: product = Product.query.get(product_id)
    pass

def create_product_service(data):
    # Lógica para crear un producto
    pass

def update_product_service(product_id, data):
    # Lógica para actualizar un producto
    pass

def delete_product_service(product_id):
    # Lógica para eliminar un producto
    pass

# Nueva función para disminuir stock
def decrease_stock_service(product_id, quantity):
    """
    Disminuye el stock de un producto
    Retorna: (producto_actualizado, mensaje_error) 
    """
    # Obtener el producto
    product = get_product_by_id_service(product_id)
    if not product:
        return None, "Producto no encontrado"
    
    # Verificar stock suficiente
    if product['stock'] < quantity:
        return None, f"Stock insuficiente. Disponible: {product['stock']}"
    
    # Actualizar el stock
    new_stock = product['stock'] - quantity
    updated_data = {'stock': new_stock}
    
    # Actualizar el producto en la base de datos
    updated_product = update_product_service(product_id, updated_data)
    
    if not updated_product:
        return None, "Error al actualizar el stock"
    
    return updated_product, None