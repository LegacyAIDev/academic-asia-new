-- Inject admin_level from profiles into the JWT access token
-- Enable this hook in Supabase Dashboard: Auth > Hooks > Custom Access Token
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  claims jsonb;
  profile_admin_level int;
BEGIN
  SELECT admin_level INTO profile_admin_level
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- Default to level 6 (Basic) if no profile or level found
  claims := jsonb_set(claims, '{admin_level}', to_jsonb(COALESCE(profile_admin_level, 6)));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Allow the auth admin to read profiles for the hook
GRANT SELECT ON public.profiles TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
