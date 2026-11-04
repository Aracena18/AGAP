-- Seek pages in a member's immutable submission order, including timestamp ties.
CREATE INDEX member_support_history_page ON monitoring.requests(organization_id,member_id,submitted_at DESC,id DESC);
