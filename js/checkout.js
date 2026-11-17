async function processCheckoutSupabase(orderData) {
    try {
        const supabase = (window.Auth && typeof Auth.initSupabase === 'function') 
            ? Auth.initSupabase() 
            : window.supabase;

        if (!supabase) {
            throw new Error("No se pudo inicializar la conexión con Supabase.");
        }

        const user = await Auth.getCurrentUser();
        if (!user) {
            throw new Error("Debes iniciar sesión para realizar un pedido.");
        }

        const userId = user.id;

        // Generar número de boleta virtual (Ejemplo: B001-839201)
        const numeroComprobante = 'B001-' + String(Date.now()).slice(-6);

        const { data: orderResult, error: orderError } = await supabase
            .from('pedidos')
            .insert([
                {
                    usuario_id: userId,
                    cliente_nombre: orderData.cliente_nombre,
                    cliente_email: orderData.cliente_email,
                    total: orderData.total,
                    estado: 'Pendiente',
                    metodo_pago: orderData.metodo_pago || 'efectivo',
                    numero_comprobante: numeroComprobante
                }
            ])
            .select();

        if (orderError) throw orderError;

        const newOrder = orderResult[0];

        const orderDetails = orderData.items.map(item => ({
            pedido_id: newOrder.id,
            producto_id: item.id,
            producto_nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio
        }));

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