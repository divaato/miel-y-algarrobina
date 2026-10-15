// js/reviews.js

/**
 * Función auxiliar para obtener el cliente de Supabase
 */
function getSupabaseClient() {
    return (window.Auth && typeof Auth.initSupabase === 'function') 
        ? Auth.initSupabase() 
        : window.supabase;
}

/**
 * Obtiene todas las reseñas almacenadas en Supabase
 */
async function fetchReviewsSupabase() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('reseñas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error al obtener reseñas de Supabase:", error);
        return [];
    }
}

/**
 * Inserta una nueva reseña en Supabase
 */
async function addReviewSupabase(comentario, calificacion) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error("No se pudo conectar con Supabase.");

        const user = await Auth.getCurrentUser();
        if (!user) {
            throw new Error("Debes iniciar sesión para publicar una reseña.");
        }

        const profileName = typeof getProfileName === 'function' ? getProfileName() : (user.email || 'Cliente');

        const { data, error } = await supabase
            .from('reseñas')
            .insert([
                {
                    usuario_id: user.id,
                    cliente_nombre: profileName,
                    comentario: comentario,
                    calificacion: parseInt(calificacion)
                }
            ])
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error("Error al publicar la reseña:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Suscribe la página a cambios en tiempo real en la tabla 'reseñas'
 * @param {Function} onNewReview - Función Callback que se ejecuta cuando llega una nueva reseña
 */
function subscribeReviewsRealtime(onNewReview) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase
        .channel('public:reseñas')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'reseñas' },
            (payload) => {
                if (onNewReview && typeof onNewReview === 'function') {
                    onNewReview(payload.new);
                }
            }
        )
        .subscribe();
}