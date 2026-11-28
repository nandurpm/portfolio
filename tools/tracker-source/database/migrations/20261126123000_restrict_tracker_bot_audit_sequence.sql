-- RLS does not protect sequence objects. Keep the private bot audit identity
-- sequence unavailable to API client roles; the Edge Function uses service_role.
REVOKE ALL PRIVILEGES ON SEQUENCE public.tracker_bot_audit_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE public.tracker_bot_audit_id_seq TO service_role;
