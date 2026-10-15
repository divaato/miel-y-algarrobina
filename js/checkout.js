// js/checkout.js

/**
 * Registra un pedido y sus detalles de forma asíncrona en Supabase
 * @param {Object} orderData - Datos del pedido (cliente, email, total, items)
 * @returns {Promise<Object>} Resultado de la operación { success: boolean, orderId?: number, error?: string }
 */
async function processCheckoutSupabase(orderData) {
    try {
        // 1. Obtener cliente de Supabase
        const supabase = (window.Auth && typeof Auth.initSupabase === 'function') 
            ? Auth.initSupabase() 
            : window.supabase;

        if (!supabase) {
            throw new Error("No se pudo inicializar la conexión con Supabase.");
        }

        // 2. Obtener la sesión activa del usuario
        const user = await Auth.getCurrentUser();
        if (!user) {
            throw new Error("Debes iniciar sesión para realizar un pedido.");
        }

        const userId = user.id;

        // 3. Insertar el pedido principal en la tabla 'pedidos'
        const { data: orderResult, error: orderError } = await supabase
            .from('pedidos')
            .insert([
                {
                    usuario_id: userId,
                    cliente_nombre: orderData.cliente_nombre,
                    cliente_email: orderData.cliente_email,
                    total: orderData.total,
                    estado: 'Pendiente'
                }
            ])
            .select();

        if (orderError) throw orderError;

        const newOrder = orderResult[0];

        // 4. Preparar los items para la tabla 'detalle_pedidos'
        const orderDetails = orderData.items.map(item => ({
            pedido_id: newOrder.id,
            producto_id: item.id,
            producto_nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio
        }));

        // 5. Insertar todos los detalles del pedido
        const { error: detailsError } = await supabase
            .from('detalle_pedidos')
            .insert(orderDetails);

        if (detailsError) throw detailsError;

        return { success: true, orderId: newOrder.id };

    } catch (error) {
        console.error("Error al procesar la compra en Supabase:", error);
        return { success: false, error: error.message };
    }
}