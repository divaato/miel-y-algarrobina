/**
 * MIEL & ALGARROBINA — Dashboard de Administración
 * admin.js — Lógica del panel admin
 * Sesión 05 — Pedidos sincronizados con Supabase
 */

const STORAGE_KEYS = {
  reviews: 'mielAlgarrobina_reviews'
};

let currentFilter = 'todos';
let orders = [];

/* ============================================
   FORMATO
============================================ */

function formatPrice(amount) {
  return `S/ ${Number(amount || 0).toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';

  const date = new Date(dateStr);

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusClass(status) {
  const map = {
    'Pendiente': 'status-pendiente',
    'Aprobado': 'status-aprobado',
    'Anulado': 'status-anulado'
  };

  return map[status] || 'status-pendiente';
}

function getStatusIcon(status) {
  const map = {
    'Pendiente': '⏳',
    'Aprobado': '✓',
    'Anulado': '✕'
  };

  return map[status] || '•';
}

/* ============================================
   SUPABASE
============================================ */

function getSupabase() {
  if (!window.Auth) {
    console.error('[Admin] Auth no está disponible.');
    return null;
  }

  const client = Auth.initSupabase();

  if (!client) {
    console.error('[Admin] No se pudo inicializar Supabase.');
    return null;
  }

  return client;
}

/* ============================================
   CARGAR PEDIDOS DESDE SUPABASE
============================================ */

async function loadOrders() {
  const supabase = getSupabase();

  if (!supabase) {
    showToast('No se pudo conectar con Supabase.', 'warning');
    return false;
  }

  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[Admin] Error al cargar pedidos:', ordersError);
      showToast(
        'Error al cargar los pedidos desde Cloud.',
        'warning'
      );
      return false;
    }

    const { data: detailsData, error: detailsError } = await supabase
      .from('detalle_pedidos')
      .select('*');

    if (detailsError) {
      console.warn(
        '[Admin] No se pudieron cargar los detalles:',
        detailsError
      );
    }

    const details = detailsData || [];

    orders = (ordersData || []).map(order => {
      const orderDetails = details
        .filter(detail =>
          String(detail.pedido_id) === String(order.id)
        )
        .map(detail => ({
          id: detail.producto_id,
          name: detail.producto_nombre,
          quantity: Number(detail.cantidad || 1),
          price: Number(detail.precio || 0)
        }));

      return {
        id: String(order.id),
        customer: order.cliente_nombre || 'Cliente',
        email: order.cliente_email || '',
        products: orderDetails,
        total: Number(order.total || 0),
        date: order.created_at,
        status: order.estado || 'Pendiente'
      };
    });

    console.log('[Admin] Pedidos cargados desde Supabase:', orders);

    return true;

  } catch (error) {
    console.error('[Admin] Error inesperado:', error);
    showToast('Ocurrió un error al cargar los pedidos.', 'warning');
    return false;
  }
}

/* ============================================
   FILTROS
============================================ */

function getFilteredOrders() {
  if (currentFilter === 'todos') {
    return orders;
  }

  const statusMap = {
    pendientes: 'Pendiente',
    aprobados: 'Aprobado',
    anulados: 'Anulado'
  };

  return orders.filter(
    order => order.status === statusMap[currentFilter]
  );
}

/* ============================================
   ESTADÍSTICAS
============================================ */

function updateStats() {
  const total = orders.length;

  const pendientes = orders.filter(
    order => order.status === 'Pendiente'
  ).length;

  const aprobados = orders.filter(
    order => order.status === 'Aprobado'
  ).length;

  const anulados = orders.filter(
    order => order.status === 'Anulado'
  ).length;

  animateCounter('stat-total', total);
  animateCounter('stat-pendientes', pendientes);
  animateCounter('stat-aprobados', aprobados);
  animateCounter('stat-anulados', anulados);
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);

  if (!el) return;

  const current = parseInt(el.textContent) || 0;

  if (current === target) {
    el.textContent = target;
    return;
  }

  const duration = 400;
  const start = performance.now();
  const diff = target - current;

  function step(now) {
    const progress = Math.min(
      (now - start) / duration,
      1
    );

    const eased = 1 - Math.pow(1 - progress, 3);

    el.textContent = Math.round(
      current + diff * eased
    );

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/* ============================================
   MOSTRAR PEDIDOS
============================================ */

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  const emptyState = document.getElementById('orders-empty');

  if (!tbody) return;

  const filtered = getFilteredOrders();

  if (filtered.length === 0) {
    tbody.innerHTML = '';

    if (emptyState) {
      emptyState.classList.remove('hidden');
    }

    return;
  }

  if (emptyState) {
    emptyState.classList.add('hidden');
  }

  tbody.innerHTML = filtered.map(order => {

    const productCount = order.products.reduce(
      (sum, product) =>
        sum + Number(product.quantity || 0),
      0
    );

    const productLabel =
      productCount === 1
        ? '1 producto'
        : `${productCount} productos`;

    const productsDetail =
      order.products.length > 0
        ? order.products
            .map(product =>
              `${product.name} (×${product.quantity})`
            )
            .join(', ')
        : 'Sin detalles';

    return `
      <tr class="border-b border-gray-100">

        <td class="px-4 py-4">
          <span class="font-mono font-semibold text-sm text-amber-800">
            #${order.id}
          </span>
        </td>

        <td class="px-4 py-4">
          <div class="flex items-center gap-2">

            <div class="w-8 h-8 rounded-full
                        bg-gradient-to-br from-amber-200 to-amber-400
                        flex items-center justify-center
                        text-xs font-bold text-brown-dark">

              ${String(order.customer).charAt(0).toUpperCase()}

            </div>

            <div>
              <span class="font-medium text-sm">
                ${order.customer}
              </span>

              ${
                order.email
                  ? `<p class="text-xs text-gray-400">${order.email}</p>`
                  : ''
              }
            </div>

          </div>
        </td>

        <td class="px-4 py-4">

          <span class="text-sm text-gray-600">
            ${productLabel}
          </span>

          <p
            class="text-xs text-gray-400 mt-1 max-w-[200px] truncate"
            title="${productsDetail}"
          >
            ${productsDetail}
          </p>

        </td>

        <td class="px-4 py-4">

          <span class="font-semibold text-sm text-amber-800">
            ${formatPrice(order.total)}
          </span>

        </td>

        <td class="px-4 py-4">

          <span class="text-sm text-gray-500">
            ${formatDate(order.date)}
          </span>

        </td>

        <td class="px-4 py-4">

          <span class="status-badge ${getStatusClass(order.status)}">
            ${getStatusIcon(order.status)}
            ${order.status}
          </span>

        </td>

        <td class="px-4 py-4">

          <div class="flex flex-wrap gap-2">

            ${
              order.status !== 'Aprobado'
                ? `
                  <button
                    class="action-btn action-btn-approve"
                    data-id="${order.id}"
                    data-action="Aprobado"
                    title="Aprobar"
                  >
                    ✓ Aprobar
                  </button>
                `
                : ''
            }

            ${
              order.status !== 'Pendiente'
                ? `
                  <button
                    class="action-btn action-btn-pending"
                    data-id="${order.id}"
                    data-action="Pendiente"
                    title="Marcar pendiente"
                  >
                    ⏳ Pendiente
                  </button>
                `
                : ''
            }

            ${
              order.status !== 'Anulado'
                ? `
                  <button
                    class="action-btn action-btn-cancel"
                    data-id="${order.id}"
                    data-action="Anulado"
                    title="Anular"
                  >
                    ✕ Anular
                  </button>
                `
                : ''
            }

          </div>

        </td>

      </tr>
    `;
  }).join('');

  tbody
    .querySelectorAll('[data-action]')
    .forEach(button => {

      button.addEventListener('click', () => {

        updateOrderStatus(
          button.dataset.id,
          button.dataset.action
        );

      });

    });
}

/* ============================================
   ACTUALIZAR ESTADO EN SUPABASE
============================================ */

async function updateOrderStatus(orderId, newStatus) {

  const supabase = getSupabase();

  if (!supabase) {
    showToast(
      'No se pudo conectar con Supabase.',
      'warning'
    );
    return;
  }

  const validStatuses = [
    'Pendiente',
    'Aprobado',
    'Anulado'
  ];

  if (!validStatuses.includes(newStatus)) {
    showToast(
      'Estado no válido.',
      'warning'
    );
    return;
  }

  try {

    console.log(
      `[Admin] Actualizando pedido ${orderId} a ${newStatus}...`
    );

    const { data, error } = await supabase
      .from('pedidos')
      .update({
        estado: newStatus
      })
      .eq('id', Number(orderId))
      .select()
      .single();

    if (error) {

      console.error(
        '[Admin] Error al actualizar estado:',
        error
      );

      showToast(
        `No se pudo actualizar el pedido: ${error.message}`,
        'warning'
      );

      return;
    }

    console.log(
      '[Admin] Pedido actualizado correctamente en Cloud:',
      data
    );

    const order = orders.find(
      item => String(item.id) === String(orderId)
    );

    if (order) {
      order.status = newStatus;
    }

    updateStats();
    renderOrdersTable();

    showToast(
      `Pedido #${orderId} actualizado a: ${newStatus}`,
      'success'
    );

  } catch (error) {

    console.error(
      '[Admin] Error inesperado al actualizar:',
      error
    );

    showToast(
      'Ocurrió un error al actualizar el pedido.',
      'warning'
    );
  }
}

/* ============================================
   TOAST
============================================ */

function showToast(message, type = 'success') {

  const container =
    document.getElementById('toast-container');

  if (!container) return;

  const colors = {
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    info: 'bg-blue-600'
  };

  const toast = document.createElement('div');

  toast.className =
    `${colors[type] || colors.info}
     text-white px-5 py-3 rounded-xl
     shadow-lg text-sm font-medium
     animate-fade-in-up`;

  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {

    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';

    setTimeout(() => {
      toast.remove();
    }, 300);

  }, 3000);
}

/* ============================================
   FILTROS
============================================ */

function setupFilters() {

  document
    .querySelectorAll('.admin-filter-btn')
    .forEach(button => {

      button.addEventListener('click', () => {

        document
          .querySelectorAll('.admin-filter-btn')
          .forEach(item =>
            item.classList.remove('active')
          );

        button.classList.add('active');

        currentFilter =
          button.dataset.filter;

        renderOrdersTable();

      });

    });
}

/* ============================================
   RESEÑAS
============================================ */

function getStorage(key, fallback) {

  try {

    const data =
      localStorage.getItem(key);

    return data
      ? JSON.parse(data)
      : fallback;

  } catch {

    return fallback;

  }
}

function renderReviewsAdmin() {

  const container =
    document.getElementById(
      'admin-reviews-list'
    );

  if (!container) return;

  const reviews =
    getStorage(
      STORAGE_KEYS.reviews,
      []
    );

  if (reviews.length === 0) {

    container.innerHTML =
      '<p class="text-gray-400 text-sm">No hay reseñas registradas.</p>';

    return;
  }

  container.innerHTML =
    reviews
      .slice(0, 5)
      .map(review => `

        <div
          class="flex items-start gap-3 p-3
                 rounded-xl bg-gray-50
                 border border-gray-100"
        >

          <div
            class="w-8 h-8 rounded-full
                   bg-amber-100
                   flex items-center justify-center
                   text-xs font-bold
                   text-amber-800
                   flex-shrink-0"
          >
            ${review.name.charAt(0)}
          </div>

          <div class="flex-grow min-w-0">

            <div
              class="flex items-center
                     justify-between gap-2"
            >

              <span class="font-semibold text-sm">
                ${review.name}
              </span>

              <span class="text-amber-500 text-sm">
                ${'★'.repeat(review.rating)}
              </span>

            </div>

            <p class="text-xs text-gray-500 truncate">
              ${review.comment}
            </p>

          </div>

        </div>

      `)
      .join('');
}

/* ============================================
   INICIO DEL DASHBOARD
============================================ */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    try {

      if (window.Auth) {

        const allowed =
          await Auth.protectAdminPage();

        if (!allowed) return;

        await Auth.initAdminAuthUI();
      }

    } finally {

      document.documentElement
        .classList
        .remove('admin-checking');

    }

    const loaded =
      await loadOrders();

    if (!loaded) return;

    updateStats();

    renderOrdersTable();

    renderReviewsAdmin();

    setupFilters();

  }
);