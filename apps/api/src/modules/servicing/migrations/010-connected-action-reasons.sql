-- Transport action reasons commit with the existing financial command/effects.
CREATE TABLE servicing.action_reasons (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, branch_id uuid NOT NULL,
 loan_id uuid NOT NULL, command_id uuid NOT NULL, user_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('prepare_release','prepare_repayment','authorize','submit','observe','finalize')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
 correlation_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(organization_id,loan_id) REFERENCES servicing.originations(organization_id,id),
 FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id),
 FOREIGN KEY(organization_id,user_id) REFERENCES identity.staff_users(organization_id,id)
);
ALTER TABLE servicing.action_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicing.action_reasons FORCE ROW LEVEL SECURITY;
CREATE POLICY financial_scope ON servicing.action_reasons
 USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
 AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer') OR servicing.staff_role('auditor')))
 WITH CHECK(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
 AND user_id=NULLIF(current_setting('agap.user_id',true),'')::uuid
 AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer')));
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON servicing.action_reasons FOR EACH ROW EXECUTE FUNCTION servicing.immutable_record();
GRANT SELECT,INSERT ON servicing.action_reasons TO agap_runtime;
CREATE INDEX action_reason_history ON servicing.action_reasons(organization_id,loan_id,recorded_at,id);
