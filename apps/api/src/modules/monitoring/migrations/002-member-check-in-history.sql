-- Members retain access to the exact check-in and optional loan reference they shared.
CREATE OR REPLACE VIEW monitoring.member_history WITH(security_barrier=true) AS SELECT r.id,r.submitted_at,r.status,d.message,
 (SELECT a.response FROM monitoring.actions a WHERE a.request_id=r.id ORDER BY a.version DESC LIMIT 1) AS response,
 d.check_in,d.loan_id
 FROM monitoring.requests r JOIN monitoring.disclosures d ON d.request_id=r.id
 WHERE r.member_id=platform.current_member() AND r.organization_id=platform.current_organization();
