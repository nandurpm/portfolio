-- Guard for enabled tracker ledgers. Verify with the disposable PostgreSQL harness before deployment.
-- Tested by the disposable PostgreSQL 17 harness. Does not rewrite any existing plan.
BEGIN;
CREATE OR REPLACE FUNCTION public.tracker_preserve_optional_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE field_name text; collection_name text; optional_key text;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  FOREACH field_name IN ARRAY ARRAY['additionalLoans','provisions','reconciliations'] LOOP
   IF jsonb_typeof(OLD.data->field_name)='array' AND jsonb_array_length(OLD.data->field_name)>0
    AND (NOT(NEW.data ? field_name) OR jsonb_typeof(NEW.data->field_name) IS DISTINCT FROM 'array') THEN
     RAISE EXCEPTION 'Update tracker clients: existing % must be preserved',field_name USING ERRCODE='22023';
   END IF;
  END LOOP;
  -- Modern salary history and PF are schema opt-ins. Even an empty ledger
  -- must not be dropped by a legacy client which does not know the field.
  FOREACH field_name IN ARRAY ARRAY['salaryChanges','pfMovements','accounts','ledgerTransactions'] LOOP
   IF jsonb_typeof(OLD.data->field_name) = 'array'
    AND (NOT(NEW.data ? field_name) OR jsonb_typeof(NEW.data->field_name) IS DISTINCT FROM 'array') THEN
     RAISE EXCEPTION 'Update tracker clients: existing % must be preserved',field_name USING ERRCODE='22023';
   END IF;
  END LOOP;
  FOREACH collection_name IN ARRAY ARRAY['entries','accounts','ledgerTransactions'] LOOP
    FOREACH optional_key IN ARRAY CASE collection_name
      WHEN 'entries' THEN ARRAY['accountId']
      WHEN 'accounts' THEN ARRAY['creditLimit','planLoanId']
      ELSE ARRAY['incomeCategoryId','expenseCategoryId','provisionId','billDueMonth','reversalOfId'] END LOOP
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(OLD.data->collection_name,'[]'::jsonb)) old_record
        JOIN jsonb_array_elements(coalesce(NEW.data->collection_name,'[]'::jsonb)) new_record ON old_record->>'id'=new_record->>'id'
        WHERE old_record ? optional_key AND NOT(new_record ? optional_key)
          AND (collection_name <> 'accounts' OR old_record->>'kind'=new_record->>'kind')
      ) THEN RAISE EXCEPTION 'Update tracker clients: preserve %.%',collection_name,optional_key USING ERRCODE='22023'; END IF;
    END LOOP;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(OLD.data->'additionalLoans','[]'::jsonb)) ol
    JOIN jsonb_array_elements(coalesce(NEW.data->'additionalLoans','[]'::jsonb)) nl ON ol->>'id'=nl->>'id'
    CROSS JOIN LATERAL jsonb_array_elements(ol->'rows') old_row
    JOIN LATERAL jsonb_array_elements(nl->'rows') new_row ON old_row->>'id'=new_row->>'id'
    WHERE old_row ? 'principal' AND (NOT(new_row ? 'principal') OR NOT(new_row ? 'interest') OR NOT(new_row ? 'balance'))
  ) THEN RAISE EXCEPTION 'Update tracker client: preserve lender principal allocations' USING ERRCODE='22023'; END IF;
  IF OLD.data->'settings' ? 'openingFromAccounts'  AND NOT(coalesce(NEW.data->'settings','{}'::jsonb) ? 'openingFromAccounts') THEN
    RAISE EXCEPTION 'Update tracker client before saving account opening source' USING ERRCODE='22023';
  END IF;
  IF OLD.data->'settings' ? 'emiPreviousMonth' AND NOT(coalesce(NEW.data->'settings','{}'::jsonb) ? 'emiPreviousMonth') THEN
   RAISE EXCEPTION 'Update tracker client before saving EMI timing' USING ERRCODE='22023';
  END IF;
 END IF;
 IF jsonb_typeof(NEW.data->'entries') IS DISTINCT FROM 'array' OR jsonb_typeof(NEW.data->'categories') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Invalid plan arrays' USING ERRCODE='22023';
 END IF;
 IF (NEW.data ? 'accounts') IS DISTINCT FROM (NEW.data ? 'ledgerTransactions') THEN
  RAISE EXCEPTION 'Accounts and ledger transactions must be enabled together' USING ERRCODE='22023';
 END IF;
 IF NEW.data ? 'accounts' AND (
  jsonb_typeof(NEW.data->'accounts') IS DISTINCT FROM 'array'
  OR jsonb_typeof(NEW.data->'ledgerTransactions') IS DISTINCT FROM 'array'
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'accounts') a
    WHERE jsonb_typeof(a) IS DISTINCT FROM 'object' OR coalesce(a->>'id','')='' OR coalesce(a->>'name','')=''
      OR jsonb_typeof(a->'openingBalance') IS DISTINCT FROM 'number')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'accounts') a GROUP BY a->>'id' HAVING count(*)>1)
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'ledgerTransactions') t
    WHERE jsonb_typeof(t) IS DISTINCT FROM 'object' OR coalesce(t->>'id','')='' OR coalesce(t->>'date','')=''
      OR jsonb_typeof(t->'amount') IS DISTINCT FROM 'number' OR (t->>'amount')::numeric<=0
      OR ((t ? 'sourceAccountId') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'accounts') a WHERE a->>'id'=t->>'sourceAccountId'))
      OR ((t ? 'destinationAccountId') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'accounts') a WHERE a->>'id'=t->>'destinationAccountId')))
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'ledgerTransactions') t GROUP BY t->>'id' HAVING count(*)>1)
 ) THEN RAISE EXCEPTION 'Invalid account ledger' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'entries') e
   WHERE jsonb_typeof(e) IS DISTINCT FROM 'object' OR coalesce(e->>'id','')='' OR jsonb_typeof(e->'amount') IS DISTINCT FROM 'number') THEN
  RAISE EXCEPTION 'Invalid transaction fields' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'entries') e WHERE (e->>'amount')::numeric<=0)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'entries') e GROUP BY e->>'id' HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'categories') c GROUP BY c->>'id' HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'entries') e WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'categories') c WHERE c->>'id'=e->>'categoryId')) THEN
  RAISE EXCEPTION 'Duplicate or invalid transaction/category' USING ERRCODE='22023';
 END IF;
 IF EXISTS(
  WITH rows AS (
   SELECT r.value AS installment,NULL::text AS owner FROM jsonb_array_elements(coalesce(NEW.data#>'{loan,rows}','[]'::jsonb)) r
   UNION ALL SELECT r.value,l.value->>'id' FROM jsonb_array_elements(coalesce(NEW.data->'additionalLoans','[]'::jsonb)) l CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.value->'rows','[]'::jsonb)) r
  ) SELECT 1 FROM rows GROUP BY installment->>'id' HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'Duplicate installment IDs' USING ERRCODE='22023'; END IF;
 IF EXISTS(
  WITH rows AS (
   SELECT r.value AS installment,NULL::text AS owner FROM jsonb_array_elements(coalesce(NEW.data#>'{loan,rows}','[]'::jsonb)) r
   UNION ALL SELECT r.value,l.value->>'id' FROM jsonb_array_elements(coalesce(NEW.data->'additionalLoans','[]'::jsonb)) l CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.value->'rows','[]'::jsonb)) r
  )
  SELECT 1 FROM jsonb_array_elements(NEW.data->'entries') e
   LEFT JOIN rows r ON r.installment->>'id'=e->>'loanRowId'
   LEFT JOIN LATERAL (SELECT value FROM jsonb_array_elements(NEW.data->'categories') c WHERE c.value->>'id'=e->>'categoryId') c ON true
  WHERE e ? 'loanRowId' AND (jsonb_typeof(e->'loanRowId') IS DISTINCT FROM 'string' OR r.installment IS NULL OR c.value->>'role' IS DISTINCT FROM 'emi' OR c.value->>'group' IS DISTINCT FROM 'Debt' OR (c.value->>'loanId') IS DISTINCT FROM r.owner OR (r.owner IS NULL AND coalesce((r.installment->>'paidBeforeOpening')::boolean,false)))
 ) THEN RAISE EXCEPTION 'Invalid loan receipt link' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tracker_preserve_optional_fields() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tracker_preserve_optional_fields() TO tracker_plan_writer;
DROP TRIGGER IF EXISTS tracker_preserve_optional_fields ON public.tracker_plans;
CREATE TRIGGER tracker_preserve_optional_fields BEFORE INSERT OR UPDATE OF data ON public.tracker_plans
FOR EACH ROW EXECUTE FUNCTION public.tracker_preserve_optional_fields();
COMMIT;
-- Reviewed rollback ONLY: DROP TRIGGER tracker_preserve_optional_fields ON public.tracker_plans;
-- DROP FUNCTION public.tracker_preserve_optional_fields();
