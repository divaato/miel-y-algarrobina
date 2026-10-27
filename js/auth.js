/**
 * MIEL & ALGARROBINA — Autenticación y roles
 * Supabase Auth + control de acceso por rol + Verificación por Enlace
 */

const Auth = (() => {
  const ROLES = {
    CLIENTE: 'Cliente',
    ADMINISTRADOR: 'Administrador'
  };

  let supabase = null;
  let cachedProfile = null;

  function isConfigured() {
    return (
      typeof SUPABASE_CONFIG !== 'undefined' &&
      SUPABASE_CONFIG.url &&
      SUPABASE_CONFIG.anonKey &&
      SUPABASE_CONFIG.url !== 'TU_SUPABASE_URL' &&
      SUPABASE_CONFIG.anonKey !== 'TU_SUPABASE_ANON_KEY'
    );
  }

  function initSupabase() {
    if (!isConfigured()) {
      console.warn('[Auth] Configura SUPABASE_URL y SUPABASE_ANON_KEY en config.js');
      return null;
    }
    if (!supabase && typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
    }
    return supabase;
  }

  function getClient() {
    return supabase || initSupabase();
  }

  async function getSession() {
    const client = getClient();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  async function getCurrentUser() {
    const session = await getSession();
    return session?.user ?? null;
  }

  async function getUserProfile(forceRefresh = false) {
    const user = await getCurrentUser();
    if (!user) {
      cachedProfile = null;
      return null;
    }

    if (cachedProfile && cachedProfile.id === user.id && !forceRefresh) {
      return cachedProfile;
    }

    const client = getClient();
    if (!client) return null;

    const { data, error } = await client
      .from('perfiles')
      .select('id, nombre, email, rol_id, roles(nombre)')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Error al obtener perfil:', error.message);
      return null;
    }

    cachedProfile = data;
    return data;
  }

  async function getUserRole() {
    const profile = await getUserProfile();
    if (!profile) return null;
    return profile.roles?.nombre ?? null;
  }

  function redirectByRole(role) {
    if (role === ROLES.ADMINISTRADOR) {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'index.html';
    }
  }

  function translateAuthError(error) {
    const msg = (error?.message || '').toLowerCase();

    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch')) {
      return 'Error de conexión. Revisa tu internet o la URL de Supabase.';
    }
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (msg.includes('user already registered') || msg.includes('already been registered')) {
      return 'Este correo ya está registrado. Inicia sesión.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Debes confirmar tu correo (revisa tu bandeja de entrada o spam) antes de iniciar sesión.';
    }
    if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
      return 'El formato del correo electrónico no es válido.';
    }
    if (msg.includes('password') && (msg.includes('short') || msg.includes('least'))) {
      return 'La contraseña es demasiado corta. Usa al menos 6 caracteres.';
    }
    if (msg.includes('user not found')) {
      return 'No existe una cuenta con ese correo electrónico.';
    }

    return error?.message || 'Ocurrió un error inesperado. Intenta nuevamente.';
  }

  async function createProfile(userId, nombre, email) {
    const client = getClient();
    if (!client) throw new Error('Supabase no está configurado.');

    const { data: rolData, error: rolError } = await client
      .from('roles')
      .select('id')
      .eq('nombre', ROLES.CLIENTE)
      .single();

    if (rolError) throw rolError;

    const { error } = await client.from('perfiles').insert({
      id: userId,
      nombre,
      email,
      rol_id: rolData.id
    });

    if (error && error.code !== '23505') throw error;
  }

  async function protectPage(requiredRole) {
    if (requiredRole === ROLES.ADMINISTRADOR) {
      return protectAdminPage();
    }
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  // Registro de usuario
  async function signUp(nombre, email, password) {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase no está configurado.' };
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    });

    if (error) {
      return { success: false, error: translateAuthError(error) };
    }

    cachedProfile = null;
    return { success: true, user: data.user, session: data.session };
  }

  async function signIn(email, password) {
    const client = getClient();
    if (!client) return { success: false, error: 'Supabase no está configurado.' };

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) return { success: false, error: translateAuthError(error) };

    cachedProfile = null;
    let role = await getUserRole();

    // Reparador de perfiles ausentes
    if (!role && data.user) {
      try {
        const nombre = data.user.user_metadata?.nombre || data.user.email.split('@')[0];
        await createProfile(data.user.id, nombre, data.user.email);
        cachedProfile = null;
        role = await getUserRole();
      } catch (profileError) {
        console.error('[Auth] No se pudo reparar el perfil:', profileError);
      }
    }

    if (!role) {
      await signOut(false);
      return {
        success: false,
        error: 'Tu cuenta no tiene un perfil asignado. Contacta a soporte.'
      };
    }

    return { success: true, user: data.user, session: data.session, role };
  }

  async function signOut(redirect = true) {
    const client = getClient();
    cachedProfile = null;
    if (client) await client.auth.signOut();
    if (redirect) window.location.href = 'login.html';
  }

  async function requireAuth(message) {
    const user = await getCurrentUser();
    if (user) return true;

    if (typeof showToast === 'function') {
      showToast(message || 'Debes iniciar sesión para continuar', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
      }, 1200);
    } else {
      window.location.href = 'login.html';
    }
    return false;
  }

  async function protectAdminPage() {
    if (!isConfigured()) {
      window.location.href = 'login.html?error=config&redirect=admin.html';
      return false;
    }

    initSupabase();
    const session = await getSession();

    if (!session) {
      window.location.href = 'login.html?redirect=admin.html';
      return false;
    }

    const role = await getUserRole();

    if (role !== ROLES.ADMINISTRADOR) {
      window.location.href = 'index.html?acceso=denegado';
      return false;
    }

    return true;
  }

  async function initStoreAuthUI() {
    initSupabase();
    const user = await getCurrentUser();
    const profile = user ? await getUserProfile() : null;
    
    // Si entró por el link y no tiene perfil en la BD, lo creamos ahora
    if (user && !profile) {
       try {
         const nombre = user.user_metadata?.nombre || user.email.split('@')[0];
         await createProfile(user.id, nombre, user.email);
       } catch(e) {
         console.warn("Fallo creando perfil desde UI:", e);
       }
    }

    const guestEl = document.getElementById('auth-guest');
    const userEl = document.getElementById('auth-user');
    const greetingEl = document.getElementById('auth-greeting');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const mobileGuest = document.getElementById('mobile-auth-guest');
    const mobileUser = document.getElementById('mobile-auth-user');
    const mobileGreeting = document.getElementById('mobile-auth-greeting');
    const mobileLogout = document.getElementById('mobile-auth-logout');

    const displayName = profile?.nombre
      || user?.user_metadata?.nombre
      || (user?.email ? user.email.split('@')[0] : 'Cliente');

    if (user) {
      const firstName = String(displayName).split(' ')[0];
      if (greetingEl) greetingEl.textContent = `Hola, ${firstName}`;
      if (mobileGreeting) mobileGreeting.textContent = `Hola, ${firstName}`;
      guestEl?.classList.add('auth-slot-hidden');
      userEl?.classList.remove('auth-slot-hidden');
      mobileGuest?.classList.add('hidden');
      mobileUser?.classList.remove('hidden');
    } else {
      guestEl?.classList.remove('auth-slot-hidden');
      userEl?.classList.add('auth-slot-hidden');
      mobileGuest?.classList.remove('hidden');
      mobileUser?.classList.add('hidden');
    }

    logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });

    mobileLogout?.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });

    return profile;
  }

  function setupAuthFormHandlers() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const loginSubmit = document.getElementById('login-submit');
    const registerSubmit = document.getElementById('register-submit');

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError?.classList.add('hidden');

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      if (!email || !password) {
        showFormError(loginError, 'Completa el correo y la contraseña.');
        return;
      }

      loginSubmit.disabled = true;
      loginSubmit.textContent = 'Iniciando sesión...';

      initSupabase();
      const result = await signIn(email, password);

      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Iniciar sesión';

      if (!result.success) {
        showFormError(loginError, result.error);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect && result.role === ROLES.ADMINISTRADOR && redirect.includes('admin')) {
        window.location.href = 'admin.html';
      } else {
        redirectByRole(result.role);
      }
    });

    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      registerError?.classList.add('hidden');

      const nombre = registerForm.nombre.value.trim();
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const confirm = registerForm.confirmPassword.value;

      if (!nombre || !email || !password || !confirm) {
        showFormError(registerError, 'Todos los campos son obligatorios.');
        return;
      }

      if (password !== confirm) {
        showFormError(registerError, 'Las contraseñas no coinciden.');
        return;
      }

      registerSubmit.disabled = true;
      registerSubmit.textContent = 'Procesando...';

      initSupabase();
      const result = await signUp(nombre, email, password);

      registerSubmit.disabled = false;
      registerSubmit.textContent = 'Crear cuenta';

      if (!result.success) {
        showFormError(registerError, result.error);
        return;
      }

      // Mostrar mensaje de éxito en lugar del modal
      showFormError(registerError, '¡Registro exitoso! En espera de verificación. Por favor, revisa tu correo electrónico (y spam) y haz clic en el enlace para activar tu cuenta.', 'success');
      
      // Limpiar el formulario
      registerForm.reset();
    });

    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.togglePassword);
        if (!input) return;
        const hidden = input.type === 'password';
        input.type = hidden ? 'text' : 'password';
        btn.textContent = hidden ? 'Ocultar' : 'Ver';
      });
    });
  }

  function showFormError(el, message, type = 'error') {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden', 'auth-alert-error', 'auth-alert-success');
    el.classList.add(type === 'success' ? 'auth-alert-success' : 'auth-alert-error');
  }

  return {
    ROLES,
    initSupabase,
    signUp,
    signIn,
    signOut,
    getSession,
    getCurrentUser,
    getUserProfile,
    getUserRole,
    redirectByRole,
    requireAuth,
    protectPage,
    protectAdminPage,
    initStoreAuthUI,
    setupAuthFormHandlers,
    isConfigured
  };
})();

window.Auth = Auth;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form') || document.getElementById('register-form')) {
    Auth.initSupabase();
    Auth.setupAuthFormHandlers();

    Auth.getSession().then(async (session) => {
      if (!session) return;
      const role = await Auth.getUserRole();
      
      // Si fue verificado por el link pero no tiene rol/perfil, crearlo:
      if (!role && session.user) {
        try {
          const client = Auth.initSupabase();
          const { data: rolData } = await client.from('roles').select('id').eq('nombre', 'Cliente').single();
          const nombre = session.user.user_metadata?.nombre || session.user.email.split('@')[0];
          await client.from('perfiles').insert({ id: session.user.id, nombre, email: session.user.email, rol_id: rolData.id });
          Auth.redirectByRole('Cliente');
        } catch(e) {}
      } else if (role) {
        Auth.redirectByRole(role);
      }
    });
  }
});
