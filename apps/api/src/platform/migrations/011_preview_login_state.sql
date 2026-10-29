-- Bind assurance and return navigation to one-use, browser-bound OAuth state.
ALTER TABLE identity.oauth_states ADD COLUMN requested_acr text CHECK(requested_acr IN ('1','2'));
ALTER TABLE identity.oauth_states ADD COLUMN return_path text NOT NULL DEFAULT '/staff';
UPDATE identity.oauth_states SET return_path='/member' WHERE audience='member';
