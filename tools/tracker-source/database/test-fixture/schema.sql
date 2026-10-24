-- Metadata-only snapshot from production on 2026-10-24; synthetic/local fixture ONLY.
-- No production rows, identities, credentials or settings were exported.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE tracker_plan_writer NOLOGIN NOBYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon,authenticated,tracker_plan_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,tracker_plan_writer;
CREATE TABLE public.tracker_plans(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),mutation_id uuid NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.tracker_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.tracker_plans TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.tracker_plans TO tracker_plan_writer;
CREATE POLICY "tracker_insert_own" ON public.tracker_plans FOR INSERT TO tracker_plan_writer WITH CHECK ((user_id = ( SELECT (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid AS "coalesce")));
CREATE POLICY "tracker_read_own" ON public.tracker_plans FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "tracker_update_own" ON public.tracker_plans FOR UPDATE TO tracker_plan_writer USING ((user_id = ( SELECT (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid AS "coalesce"))) WITH CHECK ((user_id = ( SELECT (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid AS "coalesce")));
CREATE POLICY "tracker_writer_read" ON public.tracker_plans FOR SELECT TO tracker_plan_writer USING ((user_id = ( SELECT (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid AS "coalesce")));
GRANT CREATE ON SCHEMA public TO tracker_plan_writer;
CREATE OR REPLACE FUNCTION public.tracker_save_plan(p_data jsonb, p_expected_revision bigint, p_mutation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  owner uuid := coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
  current_row public.tracker_plans%rowtype;
  payment_row jsonb;
  receipt_total numeric;
  receipt_count bigint;
begin
  if owner is null then raise exception 'Sign in before syncing.' using errcode = '42501'; end if;
  if p_mutation_id is null or p_expected_revision < 0 or p_expected_revision is null then
    raise exception 'Invalid sync revision or mutation.';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object'
     or p_data->>'schemaVersion' is distinct from '1'
     or jsonb_typeof(p_data->'entries') is distinct from 'array'
     or jsonb_typeof(p_data->'categories') is distinct from 'array'
     or octet_length(p_data::text) > 8388608 then raise exception 'Invalid or oversized plan.'; end if;
  -- An older client must not overwrite totals derived from multiple receipts.
  for payment_row in
    select value from jsonb_array_elements(coalesce(p_data #> '{loan,rows}', '[]'::jsonb))
    union all
    select r.value from jsonb_array_elements(coalesce(p_data->'additionalLoans', '[]'::jsonb)) l
      cross join lateral jsonb_array_elements(coalesce(l.value->'rows', '[]'::jsonb)) r
  loop
    select coalesce(sum((e.value->>'amount')::numeric),0),count(*) into receipt_total,receipt_count
      from jsonb_array_elements(p_data->'entries') e where e.value->>'loanRowId'=payment_row->>'id';
    if receipt_count > 0 and (
      receipt_total > (payment_row->>'emi')::numeric or
      receipt_total is distinct from (payment_row->>'paidAmount')::numeric or
      (payment_row->>'paid')::boolean is distinct from (receipt_total >= (payment_row->>'emi')::numeric)
    ) then
      raise exception 'Installment totals must match all linked receipts. Update every device to version 1.5 or later, then review the payment.';
    end if;
  end loop;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text, 0));
  select * into current_row from public.tracker_plans where user_id = owner for update;
  if found then
    if current_row.mutation_id = p_mutation_id then
      return jsonb_build_object('ok', true, 'revision', current_row.revision, 'data', current_row.data);
    end if;
    if current_row.revision <> p_expected_revision then
      return jsonb_build_object('ok', false, 'revision', current_row.revision, 'data', current_row.data);
    end if;
    update public.tracker_plans set data = p_data, revision = revision + 1,
      mutation_id = p_mutation_id, updated_at = clock_timestamp()
      where user_id = owner returning * into current_row;
  else
    if p_expected_revision <> 0 then
      return jsonb_build_object('ok', false, 'revision', 0, 'data', null);
    end if;
    insert into public.tracker_plans(user_id, data, revision, mutation_id)
      values(owner, p_data, 1, p_mutation_id) returning * into current_row;
  end if;
  return jsonb_build_object('ok', true, 'revision', current_row.revision, 'data', current_row.data);
end;
$function$
;
ALTER FUNCTION public.tracker_save_plan(jsonb,bigint,uuid) OWNER TO tracker_plan_writer;
REVOKE ALL ON FUNCTION public.tracker_save_plan(jsonb,bigint,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tracker_save_plan(jsonb,bigint,uuid) TO authenticated;
REVOKE CREATE ON SCHEMA public FROM tracker_plan_writer;
