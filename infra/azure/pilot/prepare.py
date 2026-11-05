"""Generate isolated fictional pilot secrets/configuration; never prints passwords.

Run on the pilot host. Existing generated state is never overwritten. The
original realm's MFA flows remain intact; presentation clients are removed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import uuid


def secret():
    return secrets.token_urlsafe(36)


def write(path, content, mode=0o600):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    with os.fdopen(fd, 'w') as stream:
        stream.write(content)


def env_text(values):
    return ''.join(f'{key}={value}\n' for key, value in values.items())


def prepare(repo, directory, artifacts):
    repo, directory, artifacts = Path(repo).resolve(), Path(directory).resolve(), Path(artifacts).resolve()
    candidate = artifacts / 'fictional-candidate.json'
    manifest = artifacts / 'model_manifest.json'
    if not candidate.is_file() or not manifest.is_file():
        raise ValueError('First import/verify the model and create its fictional candidate record.')
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if any(directory.iterdir()):
        raise ValueError('Generated state exists. Reuse it; do not rotate active credentials by rerunning setup.')
    passwords = {name: secret() for name in ['owner', 'runtime', 'identity', 'worker', 'keycloak']}
    client_secret, session_secret, model_token, idp_admin = (secret() for _ in range(4))
    realm = json.loads((repo / 'infra/keycloak/agap-realm.json').read_text())
    realm['clients'] = [client for client in realm['clients'] if client['clientId'] == 'agap-staff']
    for client in realm['clients']:
        client['secret'] = client_secret
        client['redirectUris'] = ['http://127.0.0.1:5286/api/v1/auth/callback', 'http://127.0.0.1:5286/api/v1/member/auth/callback']
        client['webOrigins'] = ['http://127.0.0.1:5286']
    users = {user['username']: user for user in realm['users']}
    for name in ['reviewer', 'cashier', 'financial_authorizer', 'verifier', 'accountant']:
        if name not in users:
            users[name] = {'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'agap-fictional-pilot/' + name)),
                           'username': name, 'firstName': 'Fictional ' + name.replace('_', ' '),
                           'lastName': 'Pilot', 'enabled': True, 'emailVerified': True}
    logins = {}
    for name, user in users.items():
        password = secret()
        user['credentials'] = [{'type': 'password', 'value': password, 'temporary': False}]
        user['requiredActions'] = [] if name == 'member' else ['CONFIGURE_TOTP']
        logins[name] = {'password': password, 'totpEnrollmentRequired': name != 'member'}
    realm['users'] = list(users.values())
    # Keycloak's container UID must read its bind mount; the containing host
    # directory remains 0700 and the mount exposes only this individual file.
    write(directory / 'realm.json', json.dumps(realm, indent=2) + '\n', 0o444)
    write(directory / 'access.json', json.dumps({'fictionalOnly': True, 'accounts': logins,
          'identityAdministratorPassword': idp_admin}, indent=2) + '\n')
    common = {'NODE_ENV': 'development', 'FICTIONAL_PILOT_ENABLED': 'true',
              'EVIDENCE_WORKFLOW_ENABLED': 'true', 'EVIDENCE_RECORD_MODE': 'fictional',
              'DOCUMENT_DIRECTORY': '/private-documents', 'QWEN_ENDPOINT': 'http://127.0.0.1:8080/',
              'QWEN_SERVICE_TOKEN': model_token, 'QWEN_FICTIONAL_CANDIDATE_FILE': '/artifacts/fictional-candidate.json',
              'QWEN_FICTIONAL_CANDIDATE_SHA256': hashlib.sha256(candidate.read_bytes()).hexdigest()}
    api = dict(common, LOCAL_PRESENTATION_MODE='false', LOCAL_PREVIEW_PASSWORD_ONLY='false',
               API_HOST='127.0.0.1', API_PORT='4100', PUBLIC_ORIGIN='http://127.0.0.1:5286',
               DATABASE_URL=f'postgresql://agap_runtime:{passwords["runtime"]}@127.0.0.1:55432/agap',
               IDENTITY_DATABASE_URL=f'postgresql://agap_identity:{passwords["identity"]}@127.0.0.1:55432/agap',
               SESSION_SECRET=session_secret, SESSION_TTL_SECONDS='1800',
               PRIVACY_NOTICE_VERSION='fictional-azure-pilot-v1',
               OIDC_ISSUER='http://127.0.0.1:59080/realms/agap', OIDC_CLIENT_ID='agap-staff', OIDC_CLIENT_SECRET=client_secret)
    write(directory / 'api.env', env_text(api))
    worker = dict(common, WORKER_DATABASE_URL=f'postgresql://agap_worker_local:{passwords["worker"]}@127.0.0.1:55432/agap',
                  WORKER_ORGANIZATION_ID='20000000-0000-4000-8000-000000000001', CLAMAV_HOST='127.0.0.1', CLAMAV_PORT='3310')
    write(directory / 'worker.env', env_text(worker))
    write(directory / 'operator.env', env_text(dict(api, **{'MIGRATION_DATABASE_URL': f'postgresql://agap_owner:{passwords["owner"]}@127.0.0.1:55432/agap'})))
    write(directory / 'postgres.env', env_text({'POSTGRES_USER': 'agap_owner', 'POSTGRES_DB': 'agap', 'POSTGRES_PASSWORD': passwords['owner']}))
    write(directory / 'keycloak.env', env_text({'KC_DB': 'postgres', 'KC_DB_URL': 'jdbc:postgresql://127.0.0.1:55432/keycloak',
          'KC_DB_USERNAME': 'agap_keycloak', 'KC_DB_PASSWORD': passwords['keycloak'],
          'KC_BOOTSTRAP_ADMIN_USERNAME': 'pilot-identity-admin', 'KC_BOOTSTRAP_ADMIN_PASSWORD': idp_admin,
          'KC_HOSTNAME': 'http://127.0.0.1:59080', 'KC_HOSTNAME_STRICT': 'true', 'KC_HTTP_ENABLED': 'true',
          'KC_HTTP_HOST': '127.0.0.1', 'KC_HTTP_PORT': '59080', 'KC_HEALTH_ENABLED': 'true'}))
    model = dict(common, QWEN_ARTIFACT_DIRECTORY='/artifacts', QWEN_BIND='127.0.0.1', QWEN_PORT='8080',
                 QWEN_EXPORT_MANIFEST_SHA256=hashlib.sha256(manifest.read_bytes()).hexdigest())
    write(directory / 'qwen.env', env_text(model))
    sql = ''.join(f"CREATE ROLE {role} LOGIN PASSWORD '{passwords[name]}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;\n"
                  for role, name in [('agap_runtime', 'runtime'), ('agap_identity', 'identity'), ('agap_worker_local', 'worker'), ('agap_keycloak', 'keycloak')])
    sql += 'CREATE DATABASE keycloak OWNER agap_keycloak;\n'
    write(directory / 'init.sql', sql, 0o444)
    write(directory / 'compose.env', env_text({'AGAP_PILOT_RUNTIME': str(directory), 'AGAP_PILOT_ARTIFACTS': str(artifacts)}))
    print('Private fictional configuration generated. Passwords are in access.json; enroll real TOTP for each staff account.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument('--directory', required=True)
    parser.add_argument('--artifacts', required=True)
    args = parser.parse_args()
    prepare(args.repo, args.directory, args.artifacts)
