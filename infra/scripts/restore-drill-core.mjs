import assert from 'node:assert/strict';

export function resourceNames(id){
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id),'Invalid recovery run ID.');
  return Object.fromEntries(['installer','seed','verify','source','restore','backup','dependencies','data'].map(kind=>[kind,`agap-recovery-${id}-${kind}`]));
}
export function assertOwned(info,id,type){
  const labels=type==='volume'?info.Labels:info.Config?.Labels;
  assert.equal(labels?.['agap.task'],'recovery-verification','Refusing cleanup of an unrelated resource.');
  assert.equal(labels?.['agap.recovery.run'],id,'Refusing cleanup of a different run.');
}
export function cleanupOwned(resources,id,inspect,remove){
  const failed=[];
  for(const [type,names] of resources)for(const name of names){
    try{const info=inspect(type,name);if(info===null)continue;assertOwned(info,id,type);remove(type,name);}
    catch{failed.push(name);}
  }
  return failed;
}
// SHA-256 per table, exact sequence positions, one consistent SQL statement.
// Catalog names are quoted inside PostgreSQL; no identifier comes from CLI input.
export const inventorySql=`CREATE OR REPLACE FUNCTION pg_temp.recovery_inventory() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r record; result jsonb='{}'; n bigint; digest text; sequence_value jsonb;
BEGIN
 FOR r IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_toast%' ORDER BY 1,2 LOOP
  EXECUTE format('SELECT count(*),encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E''\\n'' ORDER BY to_jsonb(t)::text),''''),''UTF8'')),''hex'') FROM %I.%I t',r.schemaname,r.tablename) INTO n,digest;
  result=result||jsonb_build_object(r.schemaname||'.'||r.tablename,jsonb_build_object('count',n,'sha256',digest));
 END LOOP;
 FOR r IN SELECT schemaname,sequencename FROM pg_sequences WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2 LOOP
  EXECUTE format('SELECT jsonb_build_object(''last_value'',last_value,''is_called'',is_called) FROM %I.%I',r.schemaname,r.sequencename) INTO sequence_value;
  result=result||jsonb_build_object(r.schemaname||'.'||r.sequencename,sequence_value);
 END LOOP;
 RETURN result;
END $$;
SELECT pg_temp.recovery_inventory();`;
export const securitySql=`SELECT jsonb_build_object(
 'database',(SELECT jsonb_build_array(datname,pg_get_userbyid(datdba),ARRAY(SELECT a::text FROM unnest(coalesce(datacl,acldefault('d',datdba))) a ORDER BY a::text)) FROM pg_database WHERE datname=current_database()),
 'roles',(SELECT jsonb_agg(jsonb_build_array(rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig,rolvaliduntil) ORDER BY rolname) FROM pg_roles WHERE rolname LIKE 'agap_%' AND rolname<>'agap_recovery_admin'),
 'memberships',(SELECT jsonb_agg(jsonb_build_array(r.rolname,m.rolname,g.rolname,a.admin_option,a.inherit_option,a.set_option) ORDER BY r.rolname,m.rolname,g.rolname) FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member JOIN pg_roles g ON g.oid=a.grantor WHERE r.rolname LIKE 'agap_%'),
 'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,pg_get_userbyid(nspowner),ARRAY(SELECT a::text FROM unnest(coalesce(nspacl,acldefault('n',nspowner))) a ORDER BY a::text)) ORDER BY nspname) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'),
 'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner),ARRAY(SELECT a::text FROM unnest(coalesce(c.relacl,acldefault((CASE WHEN c.relkind='S' THEN 'S' ELSE 'r' END)::"char",c.relowner))) a ORDER BY a::text),c.relrowsecurity,c.relforcerowsecurity) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
 'columns',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.attname,ARRAY(SELECT a::text FROM unnest(t.attacl) a ORDER BY a::text)) ORDER BY n.nspname,c.relname,t.attname) FROM pg_attribute t JOIN pg_class c ON c.oid=t.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE t.attnum>0 AND NOT t.attisdropped AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'),
 'defaultPrivileges',(SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(d.defaclrole),coalesce(n.nspname,''),d.defaclobjtype,ARRAY(SELECT a::text FROM unnest(d.defaclacl) a ORDER BY a::text)) ORDER BY d.defaclrole::regrole::text,coalesce(n.nspname,''),d.defaclobjtype) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname) FROM pg_policies p),
 'functions',(SELECT jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_userbyid(p.proowner),ARRAY(SELECT a::text FROM unnest(coalesce(p.proacl,acldefault('f',p.proowner))) a ORDER BY a::text),p.prosecdef,p.proconfig) ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema')
);`;
