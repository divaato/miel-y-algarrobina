-- ============================================================
-- MIEL & ALGARROBINA — Schema Supabase (Sesión 03)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- ORDEN RECOMENDADO:
-- 1. Authentication → Providers → Email → desactivar "Confirm email"
--    (para poder iniciar sesión al instante en la actividad)
-- 2. Ejecutar ESTE script completo (crea tablas, RLS y trigger)
-- 3. Authentication → Users → Add user:
--      cliente@ejemplo.com
--      admin@ejemplo.com
--    Las contraseñas se eligen en el dashboard; NO se guardan aquí.
-- 4. Volver a ejecutar la sección 8 de este archivo
--    (asocia perfiles y asigna el rol Administrador)
-- 5. Capturas para la actividad:
--    - Table Editor → roles
--    - Table Editor → perfiles
--    - Authentication → Users
--    - SQL Editor: SELECT * FROM public.vista_usuarios_roles;
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLA DE ROLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL UNIQUE
);

COMMENT ON TABLE public.roles IS 'Roles del sistema: Cliente y Administrador';

INSERT INTO public.roles (nombre) VALUES
  ('Cliente'),
  ('Administrador')
ON CONFLICT (nombre) DO NOTHING;

-- ------------------------------------------------------------
-- 2. TABLA DE PERFILES (vinculada a auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  rol_id      INTEGER NOT NULL REFERENCES public.roles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.perfiles IS 'Perfil de usuario con rol asignado';
COMMENT ON COLUMN public.perfiles.id IS 'UUID del usuario autenticado en auth.users';

CREATE INDEX IF NOT EXISTS idx_perfiles_rol_id ON public.perfiles(rol_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_email ON public.perfiles(email);

-- ------------------------------------------------------------
-- 3. AUTO-PERFIL: todo usuario nuevo nace con rol Cliente
--    Nadie puede registrarse como Administrador desde el formulario.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email, rol_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    (SELECT id FROM public.roles WHERE nombre = 'Cliente' LIMIT 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 4. FUNCIÓN: verificar si el usuario es Administrador
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_administrador()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles p
    JOIN public.roles r ON r.id = p.rol_id
    WHERE p.id = auth.uid()
      AND r.nombre = 'Administrador'
  );
$$;

-- ------------------------------------------------------------
-- 5. FUNCIÓN: impedir que un cliente cambie su propio rol
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_cambio_rol()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.rol_id IS DISTINCT FROM NEW.rol_id THEN
    IF auth.uid() = OLD.id AND NOT public.es_administrador() THEN
      RAISE EXCEPTION 'No tienes permiso para modificar tu rol';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_cambio_rol ON public.perfiles;
CREATE TRIGGER trg_proteger_cambio_rol
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_cambio_rol();

-- ------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_authenticated" ON public.roles;
CREATE POLICY "roles_select_authenticated"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "perfiles_select_own" ON public.perfiles;
CREATE POLICY "perfiles_select_own"
  ON public.perfiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "perfiles_select_admin" ON public.perfiles;
CREATE POLICY "perfiles_select_admin"
  ON public.perfiles FOR SELECT
  TO authenticated
  USING (public.es_administrador());

DROP POLICY IF EXISTS "perfiles_insert_cliente" ON public.perfiles;
CREATE POLICY "perfiles_insert_cliente"
  ON public.perfiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND rol_id = (SELECT id FROM public.roles WHERE nombre = 'Cliente')
  );

DROP POLICY IF EXISTS "perfiles_update_own" ON public.perfiles;
CREATE POLICY "perfiles_update_own"
  ON public.perfiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "perfiles_update_admin" ON public.perfiles;
CREATE POLICY "perfiles_update_admin"
  ON public.perfiles FOR UPDATE
  TO authenticated
  USING (public.es_administrador())
  WITH CHECK (public.es_administrador());

-- ------------------------------------------------------------
-- 7. VISTA PARA CONSULTAS (captura en consola Cloud)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.vista_usuarios_roles AS
SELECT
  p.id,
  p.nombre,
  p.email,
  r.nombre AS rol,
  p.created_at
FROM public.perfiles p
JOIN public.roles r ON r.id = p.rol_id
ORDER BY p.created_at DESC;

COMMENT ON VIEW public.vista_usuarios_roles IS 'Vista combinada de perfiles y roles para administración';

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.perfiles TO authenticated;
GRANT SELECT ON public.vista_usuarios_roles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.roles_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_administrador() TO authenticated;

REVOKE ALL ON TABLE public.perfiles FROM anon;
REVOKE ALL ON TABLE public.roles FROM anon;

-- ============================================================
-- 8. USUARIOS DE PRUEBA
-- ============================================================
-- Primero créalos en Authentication → Users (Add user).
-- Luego ejecuta este bloque (o vuelve a ejecutar todo el script).
-- ============================================================

INSERT INTO public.perfiles (id, nombre, email, rol_id)
SELECT
  u.id,
  'Cliente de Prueba',
  'cliente@ejemplo.com',
  (SELECT id FROM public.roles WHERE nombre = 'Cliente')
FROM auth.users u
WHERE u.email = 'cliente@ejemplo.com'
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  email = EXCLUDED.email,
  rol_id = EXCLUDED.rol_id;

INSERT INTO public.perfiles (id, nombre, email, rol_id)
SELECT
  u.id,
  'Administrador de Prueba',
  'admin@ejemplo.com',
  (SELECT id FROM public.roles WHERE nombre = 'Administrador')
FROM auth.users u
WHERE u.email = 'admin@ejemplo.com'
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  email = EXCLUDED.email,
  rol_id = EXCLUDED.rol_id;

-- ------------------------------------------------------------
-- 9. CONSULTAS DE VERIFICACIÓN
-- ------------------------------------------------------------
-- SELECT * FROM public.roles;
-- SELECT * FROM public.perfiles;
-- SELECT * FROM public.vista_usuarios_roles;
