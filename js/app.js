/**
 * MIEL & ALGARROBINA — Tienda Virtual
 * app.js — Lógica de la vista pública con Supabase
 */

const STORAGE_KEYS = {
  cart: 'mielAlgarrobina_cart',
  orders: 'mielAlgarrobina_orders',
  reviews: 'mielAlgarrobina_reviews',
  orderCounter: 'mielAlgarrobina_orderCounter'
};

const PRODUCTS = [
  {
    id: 'miel-sullana',
    name: 'Miel Natural de Sullana',
    category: 'miel',
    categoryLabel: 'Miel',
    description: 'Miel 100% pura recolectada en los valles de Sullana. Sabor dulce y aroma natural.',
    price: 18.00,
    stock: 45,
    visual: 'product-visual-miel',
    liquid: 'jar-liquid-honey',
    label: 'Miel Sullana'
  },
  {
    id: 'miel-familiar',
    name: 'Miel Natural Familiar',
    category: 'miel',
    categoryLabel: 'Miel',
    description: 'Presentación familiar ideal para toda la casa. Miel natural de alta calidad.',
    price: 30.00,
    stock: 28,
    visual: 'product-visual-miel-familiar',
    liquid: 'jar-liquid-honey',
    label: 'Miel Familiar'
  },
  {
    id: 'algarrobina-natural',
    name: 'Algarrobina Natural',
    category: 'algarrobina',
    categoryLabel: 'Algarrobina',
    description: 'Algarrobina artesanal elaborada con algarrobo peruano. Rica en hierro y calcio.',
    price: 20.00,
    stock: 32,
    visual: 'product-visual-algarrobina',
    liquid: 'jar-liquid-algarrobina',
    label: 'Algarrobina'
  },
  {
    id: 'algarrobina-familiar',
    name: 'Algarrobina Familiar',
    category: 'algarrobina',
    categoryLabel: 'Algarrobina',
    description: 'Frasco familiar de algarrobina natural. Perfecto para batidos y postres.',
    price: 34.00,
    stock: 20,
    visual: 'product-visual-algarrobina-familiar',
    liquid: 'jar-liquid-algarrobina',
    label: 'Alg. Familiar'
  },
  {
    id: 'combo-dulzura',
    name: 'Combo Dulzura Sullana',
    category: 'miel',
    categoryLabel: 'Combo',
    description: 'Pack especial con miel y algarrobina. Lo mejor de Sullana en un solo pedido.',
    price: 48.00,
    stock: 15,
    visual: 'product-visual-combo',
    liquid: 'jar-liquid-honey',
    label: 'Combo'
  },
  {
    id: 'miel-organica',
    name: 'Miel Orgánica Premium',
    category: 'miel',
    categoryLabel: 'Miel',
    description: 'Miel orgánica certificada de apicultores locales. Edición limitada.',
    price: 25.00,
    stock: 12,
    visual: 'product-visual-organico',
    liquid: 'jar-liquid-honey',
    label: 'Orgánica'
  }
];

let cart = [];
let currentFilter = 'todos';
let selectedRating = 0;

function getStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initStorage() {
  cart = getStorage(STORAGE_KEYS.cart, []);
}

function formatPrice(amount) {
  return `S/ ${Number(amount || 0).toFixed(2)}`;
}

function getStockClass(stock) {
  if (stock > 20) return 'stock-high';
  if (stock > 10) return 'stock-medium';
  return 'stock-low';
}

function getStockLabel(stock) {
  if (stock > 20) return 'En stock';
  if (stock > 10) return 'Stock limitado';
  return 'Pocas unidades';
}

function createJarHTML(visual, liquid, label, size = 'normal') {
  const scale = size === 'small' ? 'scale-90' : '';
  return `
    <div class="jar ${scale}">
      <div class="jar-lid"></div>
      <div class="jar-body">
        <div class="jar-liquid ${liquid}"></div>
        <div class="jar-label">${label}</div>
      </div>
    </div>
  `;
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const filtered = currentFilter === 'todos'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No hay productos en esta categoría.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => `
    <article class="product-card bg-white rounded-2xl overflow-hidden shadow-md border border-amber-100/50 flex flex-col" data-id="${product.id}">
      <div class="product-visual ${product.visual} p-6">
        ${createJarHTML(product.visual, product.liquid, product.label)}
      </div>
      <div class="p-5 flex flex-col flex-grow">
        <div class="flex items-center justify-between mb-2">
          <span class="badge-category badge-${product.category === 'miel' ? 'miel' : 'algarrobina'} px-3 py-1 rounded-full">${product.categoryLabel}</span>
          <span class="stock-indicator ${getStockClass(product.stock)}">
            <span class="stock-dot"></span>
            ${getStockLabel(product.stock)} (${product.stock})
          </span>
        </div>
        <h3 class="font-display text-lg font-semibold text-brown-dark mb-2">${product.name}</h3>
        <p class="text-sm text-gray-600 mb-4 flex-grow leading-relaxed">${product.description}</p>
        <div class="flex items-center justify-between mt-auto pt-3 border-t border-amber-50">
          <span class="text-2xl font-bold text-amber-700">${formatPrice(product.price)}</span>
          <button
            class="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 add-to-cart-btn"
            data-id="${product.id}"
            ${product.stock === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            Agregar
          </button>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });
}

function renderStars(rating, interactive = false) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating;
    const cls = interactive ? 'star-input' : '';
    const dataAttr = interactive ? `data-star="${i}"` : '';
    html += `<span class="${filled ? 'star-filled' : 'star-empty'} ${cls} text-lg" ${dataAttr}>★</span>`;
  }
  return html;
}

// Cargar y mostrar reseñas desde Supabase
async function renderReviews() {
  const container = document.getElementById('reviews-grid');
  if (!container) return;

  if (typeof fetchReviewsSupabase !== 'function') return;

  const reviews = await fetchReviewsSupabase();

  if (!reviews || reviews.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-gray-500">
        Sé el primero en dejar una reseña sobre nuestros productos.
      </div>
    `;
    return;
  }

  container.innerHTML = reviews.map(review => {
    let rawName = review.cliente_nombre || 'Cliente';
    
    // Si viene un correo, extraemos solo la parte antes del @ y capitalizamos la primera letra
    if (rawName.includes('@')) {
      rawName = rawName.split('@')[0];
      rawName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }

    const rating = review.calificacion || 5;
    const comment = review.comentario || '';

    return `
      <div class="review-card bg-white rounded-2xl p-6 shadow-md border border-amber-100/50">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-full bg-amber-400 text-amber-950 font-bold text-lg flex items-center justify-center shrink-0 shadow-inner">
            ${rawName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 class="font-semibold text-brown-dark">${rawName}</h4>
            <div class="flex gap-0.5">${renderStars(rating)}</div>
          </div>
        </div>
        <p class="text-gray-600 leading-relaxed mb-3">"${comment}"</p>
      </div>
    `;
  }).join('');
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (badge) {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
    badge.classList.add('bump');
    setTimeout(() => badge.classList.remove('bump'), 400);
  }
}

async function addToCart(productId) {
  if (window.Auth) {
    const ok = await Auth.requireAuth('Inicia sesión para agregar productos al carrito');
    if (!ok) return;
  }

  const product = PRODUCTS.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast('No hay más stock disponible de este producto.', 'warning');
      return;
    }
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  }

  setStorage(STORAGE_KEYS.cart, cart);
  updateCartBadge();
  renderCart();
  showToast(`${product.name} agregado al carrito`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  setStorage(STORAGE_KEYS.cart, cart);
  updateCartBadge();
  renderCart();
  showToast('Producto eliminado del carrito', 'info');
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  const product = PRODUCTS.find(p => p.id === productId);
  if (!item || !product) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  if (newQty > product.stock) {
    showToast('Stock máximo alcanzado', 'warning');
    return;
  }

  item.quantity = newQty;
  setStorage(STORAGE_KEYS.cart, cart);
  updateCartBadge();
  renderCart();
}

function renderCart() {
  const cartItems = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartFooter = document.getElementById('cart-footer');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartTotal = document.getElementById('cart-total');

  if (!cartItems) return;

  if (cart.length === 0) {
    cartItems.innerHTML = '';
    if (cartEmpty) cartEmpty.classList.remove('hidden');
    if (cartFooter) cartFooter.classList.add('hidden');
    return;
  }

  if (cartEmpty) cartEmpty.classList.add('hidden');
  if (cartFooter) cartFooter.classList.remove('hidden');

  let subtotal = 0;

  cartItems.innerHTML = cart.map(item => {
    const itemSubtotal = item.price * item.quantity;
    subtotal += itemSubtotal;
    return `
      <div class="cart-item flex items-center gap-3 p-3 rounded-xl">
        <div class="flex-grow min-w-0">
          <h4 class="font-semibold text-sm text-brown-dark truncate">${item.name}</h4>
          <p class="text-xs text-gray-500">${formatPrice(item.price)} c/u</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="qty-btn w-7 h-7 rounded-lg bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition" data-id="${item.id}" data-action="decrease">−</button>
          <span class="w-6 text-center text-sm font-semibold">${item.quantity}</span>
          <button class="qty-btn w-7 h-7 rounded-lg bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition" data-id="${item.id}" data-action="increase">+</button>
        </div>
        <div class="text-right min-w-[70px]">
          <p class="font-semibold text-sm text-amber-800">${formatPrice(itemSubtotal)}</p>
          <button class="remove-btn text-xs text-red-500 hover:text-red-700 transition mt-1" data-id="${item.id}">Quitar</button>
        </div>
      </div>
    `;
  }).join('');

  if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
  if (cartTotal) cartTotal.textContent = formatPrice(subtotal);

  cartItems.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = btn.dataset.action === 'increase' ? 1 : -1;
      updateQuantity(btn.dataset.id, delta);
    });
  });

  cartItems.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

function openCart() {
  document.getElementById('cart-overlay')?.classList.add('open');
  document.getElementById('cart-panel')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.getElementById('cart-panel')?.classList.remove('open');
  document.body.style.overflow = '';
}

async function confirmOrder() {
  if (cart.length === 0) {
    showToast('Tu carrito está vacío', 'warning');
    return;
  }

  if (window.Auth) {
    const ok = await Auth.requireAuth('Inicia sesión para confirmar tu pedido');
    if (!ok) return;
  }

  const nameInput = document.getElementById('customerName');
  if (nameInput && window.Auth) {
    const profileName = await Auth.getProfileName();
    if (profileName && !nameInput.value) nameInput.value = profileName;
  }

  openModal('checkout-modal');
}

// Procesar el Checkout en Supabase
async function processCheckout(e) {
  if (e) e.preventDefault();

  const form = document.getElementById('checkout-form');
  const customerNameInput = form ? form.querySelector('[name="customerName"]') || form.querySelector('input') : null;
  const customerName = customerNameInput ? customerNameInput.value.trim() : '';

  if (!customerName) {
    if (typeof showToast === 'function') showToast('Por favor ingresa tu nombre', 'warning');
    return;
  }

  // 1. Obtener usuario de la sesión
  let user = null;
  if (window.Auth && typeof Auth.getCurrentUser === 'function') {
    user = await Auth.getCurrentUser();
  }

  if (!user) {
    if (typeof showToast === 'function') showToast('Debes iniciar sesión para realizar una compra', 'warning');
    return;
  }

  // 2. Calcular total
  const total = cart.reduce((sum, item) => sum + (item.price || item.precio || 0) * (item.quantity || item.cantidad || 1), 0);

  // Obtener el método de pago seleccionado por el usuario
  const paymentSelect = document.getElementById('paymentMethod');
  const selectedPaymentMethod = paymentSelect ? paymentSelect.value : 'efectivo';

  // 3. Preparar los datos con el método de pago
  const orderData = {
    cliente_nombre: customerName,
    cliente_email: user.email,
    total: total,
    metodo_pago: selectedPaymentMethod,
    items: cart.map(item => ({
      id: item.id,
      nombre: item.name || item.nombre,
      cantidad: item.quantity || item.cantidad,
      precio: item.price || item.precio
    }))
  };

  // 4. Enviar a Supabase mediante checkout.js
  const result = await processCheckoutSupabase(orderData);

  if (!result.success) {
    if (typeof showToast === 'function') showToast('Error al procesar el pedido: ' + result.error, 'error');
    return;
  }

  // 5. Limpiar carrito y cerrar modal
  cart = [];
  if (typeof setStorage === 'function' && typeof STORAGE_KEYS !== 'undefined') {
    setStorage(STORAGE_KEYS.cart, cart);
  }

  if (typeof updateCartBadge === 'function') updateCartBadge();
  if (typeof renderCart === 'function') renderCart();
  if (typeof closeModal === 'function') closeModal('checkout-modal');
  if (typeof closeCart === 'function') closeCart();

  if (form) form.reset();

  // 6. Mensaje de éxito
  if (typeof showToast === 'function') {
    showToast(`¡Pedido #${result.orderId} confirmado! Estado: Pendiente`, 'success');
  }

  console.log('[Compra] Pedido guardado en Supabase con ID:', result.orderId);
}

// Enviar reseña a Supabase
async function submitReview(e) {
  e.preventDefault();

  if (window.Auth) {
    const ok = await Auth.requireAuth('Inicia sesión para publicar una reseña');
    if (!ok) return;
  }

  const form = e.target;
  const commentInput = form.reviewComment || form.querySelector('textarea');
  const comment = commentInput ? commentInput.value.trim() : '';

  if (!comment || selectedRating === 0) {
    showToast('Completa el comentario y selecciona una calificación', 'warning');
    return;
  }

  if (typeof addReviewSupabase !== 'function') {
    showToast('El módulo de reseñas no está cargado correctamente', 'error');
    return;
  }

  const result = await addReviewSupabase(comment, selectedRating);

  if (result.success) {
    showToast('¡Gracias por tu reseña!', 'success');
    closeModal('review-modal');
    form.reset();
    selectedRating = 0;
    updateStarInputs();
  } else {
    showToast('Error al publicar reseña: ' + result.error, 'error');
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    info: 'bg-blue-600',
    error: 'bg-red-600'
  };

  const icons = {
    success: '✓',
    warning: '⚠',
    info: 'ℹ',
    error: '✕'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium`;
  toast.innerHTML = `<span class="text-lg">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

function updateStarInputs() {
  const container = document.getElementById('star-rating-input');
  if (!container) return;
  container.innerHTML = renderStars(selectedRating, true);
  container.querySelectorAll('.star-input').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.star);
      updateStarInputs();
    });
  });
}

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderProducts();
    });
  });
}

function setupMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');

  toggle?.addEventListener('click', () => {
    menu?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', menu?.classList.contains('open'));
  });

  menu?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}

function setupNavigation() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top) current = section.id;
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  });
}

function setupEventListeners() {
  document.getElementById('cart-toggle')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('confirm-order-btn')?.addEventListener('click', confirmOrder);
  document.getElementById('checkout-form')?.addEventListener('submit', processCheckout);
  // Mostrar u ocultar aviso de Culqi según el método de pago seleccionado
  document.getElementById('paymentMethod')?.addEventListener('change', (e) => {
    const notice = document.getElementById('culqi-notice');
    if (!notice) return;
    if (e.target.value === 'tarjeta' || e.target.value === 'yape') {
      notice.classList.remove('hidden');
    } else {
      notice.classList.add('hidden');
    }
  });
  document.getElementById('review-form')?.addEventListener('submit', submitReview);

  document.getElementById('open-review-modal')?.addEventListener('click', async () => {
    if (window.Auth) {
      const ok = await Auth.requireAuth('Inicia sesión para escribir una reseña');
      if (!ok) return;
    }
    selectedRating = 0;
    updateStarInputs();
    const nameInput = document.getElementById('reviewName');
    if (nameInput && window.Auth) {
      const profileName = await Auth.getProfileName();
      if (profileName) nameInput.value = profileName;
    }
    openModal('review-modal');
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.scroll);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function populateReviewProducts() {
  const select = document.getElementById('reviewProduct');
  if (!select) return;
  select.innerHTML = PRODUCTS.map(p =>
    `<option value="${p.name}">${p.name}</option>`
  ).join('');
}

function formatOrderDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

async function renderMyOrders() {
  const container = document.getElementById('my-orders-list');
  if (!container || !window.Auth) return;

  const user = await Auth.getCurrentUser();
  if (!user) return;

  const supabase = Auth.initSupabase();
  if (!supabase) return;

  // Obtener pedidos directamente de Supabase
  const { data: mine, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !mine || mine.length === 0) {
    container.innerHTML = `
      <div class="empty-state py-6">
        <div class="empty-state-icon">🛒</div>
        <p class="font-medium text-gray-500">Aún no tienes compras registradas</p>
        <p class="text-sm text-gray-400 mt-1">Confirma un pedido desde el carrito para verlo aquí</p>
      </div>
    `;
    return;
  }

  container.innerHTML = mine.map(order => `
    <div class="p-4 rounded-xl border border-amber-100 bg-cream/50 mb-3">
      <div class="flex items-center justify-between gap-3 mb-2">
        <span class="font-mono text-sm font-semibold text-amber-800">Pedido #${order.id}</span>
        <span class="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-amber-200">${order.estado}</span>
      </div>
      <p class="text-xs text-gray-500 mb-2">${formatOrderDate(order.created_at)}</p>
      <p class="text-sm font-bold text-amber-800 mt-2">${formatPrice(order.total)}</p>
    </div>
  `).join('');
}

async function openMyOrders() {
  if (window.Auth) {
    const ok = await Auth.requireAuth('Inicia sesión para consultar tus compras');
    if (!ok) return;
  }
  await renderMyOrders();
  openModal('orders-modal');
}

function setupAuthStoreActions() {
  document.getElementById('auth-orders-btn')?.addEventListener('click', openMyOrders);
  document.getElementById('mobile-auth-orders')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.remove('open');
    openMyOrders();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initStorage();
  renderProducts();
  renderReviews();
  renderCart();
  updateCartBadge();
  setupFilters();
  setupMobileMenu();
  setupNavigation();
  setupEventListeners();
  populateReviewProducts();
  updateStarInputs();
  setupAuthStoreActions();

  // Suscripción en tiempo real a nuevas reseñas
  if (typeof subscribeReviewsRealtime === 'function') {
    subscribeReviewsRealtime(() => {
      renderReviews();
    });
  }

  if (window.Auth) {
    await Auth.initStoreAuthUI();
  }
});