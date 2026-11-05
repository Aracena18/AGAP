"""Credit-only, single-VM fictional pilot control. Never upgrades an Azure offer.

All provisioning is gated by live ARM checks, exact quota/SKU, current operator
credit evidence and a checksum-bound plan. No account credentials are emitted.
"""
import argparse
import datetime as dt
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
REGION = 'australiaeast'
SKU = 'Standard_NC24ads_A100_v4'
MAX_HOURS = 4
MAX_CREDIT_USD = 30
ANCILLARY_RESERVE_USD = 8


def now():
    return dt.datetime.now(dt.timezone.utc)


def instant(value):
    result = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Use an explicit UTC offset for evidence times.')
    return result


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def az(*args):
    result = subprocess.run(['az', *args, '--only-show-errors', '-o', 'json'],
                            capture_output=True, text=True, timeout=180)
    if result.returncode:
        # Azure error bodies may include account identifiers. Retain only a code.
        import re
        code = re.search(r'AADSTS\d+|\b(?:AuthorizationFailed|QuotaExceeded|SkuNotAvailable)\b', result.stderr)
        raise RuntimeError(code.group() if code else 'azure_command_failed')
    return json.loads(result.stdout) if result.stdout.strip() else None


def write_private(path, value):
    path = Path(path)
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')


def validate_credit(evidence, subscription_id, at):
    if evidence.get('subscriptionId') != subscription_id:
        raise ValueError('Credit evidence belongs to another subscription.')
    if evidence.get('currency') != 'USD' or evidence.get('source') != 'Azure Sponsorships Portal':
        raise ValueError('Current USD credit evidence from Azure Sponsorships Portal is required.')
    observed = instant(evidence['observedAt'])
    if not dt.timedelta(0) <= at - observed <= dt.timedelta(hours=24):
        raise ValueError('Credit evidence must be observed within the last 24 hours.')
    if instant(evidence['expiresAt']) <= at + dt.timedelta(hours=4):
        raise ValueError('Credit must remain valid for the complete session.')
    remaining = evidence.get('remainingUsd')
    if isinstance(remaining, bool) or not isinstance(remaining, (int, float)) or not 0 < remaining <= 100000:
        raise ValueError('A positive verified remaining credit amount is required.')
    if not evidence.get('operatorReference'):
        raise ValueError('Record the actual operator and credit observation reference.')
    return min(MAX_CREDIT_USD, remaining)


def cost_envelope(hourly, hours, credit):
    if not 0 < hours <= MAX_HOURS or not 0 < hourly < 100:
        raise ValueError('Unsupported runtime or price.')
    projected = round(hourly * hours + ANCILLARY_RESERVE_USD, 4)
    if projected > min(MAX_CREDIT_USD, credit):
        raise ValueError('The complete pilot forecast exceeds available approved credit.')
    return projected


def retail_price():
    query = (f"armSkuName eq '{SKU}' and armRegionName eq '{REGION}' "
             "and serviceName eq 'Virtual Machines' and priceType eq 'Consumption'")
    url = 'https://prices.azure.com/api/retail/prices?' + urllib.parse.urlencode(
        {'currencyCode': 'USD', '$filter': query})
    with urllib.request.urlopen(url, timeout=30) as response:
        rows = json.load(response)['Items']
    rates = [float(row['retailPrice']) for row in rows
             if row.get('currencyCode') == 'USD' and row.get('unitOfMeasure') == '1 Hour'
             and not any(word in (row.get('productName', '') + ' ' + row.get('meterName', '')).lower()
                         for word in ['windows', 'spot', 'low priority'])]
    if not rates:
        raise ValueError('No exact Linux consumption price is available.')
    return max(rates)


def preflight(credit_path=None):
    account = az('account', 'show')
    subscription = account['id']
    # A cached account show is insufficient; ARM must accept a fresh request.
    policy = az('rest', '--method', 'get', '--url',
                f'https://management.azure.com/subscriptions/{subscription}?api-version=2022-12-01')
    if policy.get('state') != 'Enabled' or policy.get('subscriptionPolicies', {}).get('spendingLimit') != 'On':
        raise ValueError('An enabled subscription with its credit spending limit On is required.')
    if 'student' not in (account.get('name', '') + ' ' + policy.get('subscriptionPolicies', {}).get('quotaId', '')).lower():
        raise ValueError('The selected subscription is not the authorized student offer.')
    skus = az('vm', 'list-skus', '--location', REGION, '--size', SKU, '--all', '--subscription', subscription)
    selected = [s for s in skus if s['name'] == SKU and s.get('resourceType') == 'virtualMachines']
    if len(selected) != 1 or any(r.get('type') == 'Location' for r in selected[0].get('restrictions', [])):
        raise ValueError('The exact A100 SKU is unavailable to this subscription in Australia East.')
    usage = az('vm', 'list-usage', '--location', REGION, '--subscription', subscription)
    family = selected[0]['family'].lower()
    for quota_name in [family, 'cores']:
        quota = next((q for q in usage if q['name']['value'].lower() == quota_name), None)
        if not quota or quota['limit'] - quota['currentValue'] < 24:
            raise ValueError('Insufficient regional/A100-family quota; no paid or different-SKU fallback is permitted.')
    if not credit_path:
        raise ValueError('Current credit/expiry evidence is required before provisioning; see README.')
    ceiling = validate_credit(json.loads(Path(credit_path).read_text()), subscription, now())
    hourly = retail_price()
    forecast = cost_envelope(hourly, MAX_HOURS, ceiling)
    image = az('vm', 'image', 'show', '--urn', 'Canonical:ubuntu-24_04-lts:server:latest', '--location', REGION, '--subscription', subscription)
    return {'checkedAt': now().isoformat(), 'subscriptionId': subscription, 'region': REGION,
            'sku': SKU, 'image': {'publisher': 'Canonical', 'offer': 'ubuntu-24_04-lts', 'sku': 'server', 'version': image['name']}, 'creditEvidenceSha256': digest(credit_path),
            'creditCeilingUsd': ceiling, 'hourlyUsd': hourly, 'maximumAllocatedHours': MAX_HOURS,
            'forecastUsd': forecast, 'spendingLimit': 'On', 'templateSha256': digest(ROOT / 'vm.json')}


def assert_recent_plan(plan, credit_path):
    if not dt.timedelta(0) <= now() - instant(plan['checkedAt']) <= dt.timedelta(minutes=30):
        raise ValueError('Deployment plan expired; repeat live preflight.')
    if plan.get('region') != REGION or plan.get('sku') != SKU or plan.get('spendingLimit') != 'On':
        raise ValueError('Unapproved deployment shape.')
    if plan['templateSha256'] != digest(ROOT / 'vm.json') or plan['creditEvidenceSha256'] != digest(credit_path):
        raise ValueError('Deployment inputs changed; repeat preflight.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['preflight', 'deploy', 'stop', 'tunnel'])
    parser.add_argument('--credit-evidence')
    parser.add_argument('--state', default=str(ROOT / '.state'))
    parser.add_argument('--plan-sha256')
    parser.add_argument('--operator-cidr')
    args = parser.parse_args()
    state = Path(args.state).resolve()
    try:
        if args.action == 'preflight':
            result = preflight(args.credit_evidence)
            write_private(state / 'plan.json', result)
            print(json.dumps({k: v for k, v in result.items() if k != 'subscriptionId'}, indent=2))
            print('planSha256=' + digest(state / 'plan.json'))
        elif args.action == 'deploy':
            plan_path = state / 'plan.json'
            if not args.plan_sha256 or digest(plan_path) != args.plan_sha256:
                raise ValueError('Supply the exact reviewed preflight plan SHA256.')
            plan = json.loads(plan_path.read_text())
            assert_recent_plan(plan, args.credit_evidence)
            current = preflight(args.credit_evidence)
            if current['subscriptionId'] != plan['subscriptionId'] or current['hourlyUsd'] > plan['hourlyUsd']:
                raise ValueError('Subscription or quoted price changed; repeat preflight.')
            cidr = ipaddress.ip_network(args.operator_cidr or '', strict=True)
            if cidr.version != 4 or cidr.prefixlen != 32 or not cidr.network_address.is_global:
                raise ValueError('Supply the operator public IPv4 address as an exact /32.')
            if (state / 'deployment.json').exists():
                raise ValueError('An existing deployment must be stopped/reconciled, not recreated.')
            state.mkdir(mode=0o700, parents=True, exist_ok=True)
            key = state / 'id_ed25519'
            if not key.exists():
                subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
            group = 'agap-fictional-pilot-' + now().strftime('%Y%m%d%H%M%S')
            az('group', 'create', '--name', group, '--location', REGION,
               '--tags', 'agapPurpose=fictional-pilot', 'deleteAfterPilot=true', '--subscription', plan['subscriptionId'])
            deployment = {'resourceGroup': group, 'createdAt': now().isoformat(), 'allocatedHours': 0,
                          'subscriptionId': plan['subscriptionId'], 'planSha256': args.plan_sha256}
            write_private(state / 'deployment.json', deployment)
            shutdown = (now() + dt.timedelta(hours=2)).strftime('%H%M')
            parameters = {'sshPublicKey': {'value': key.with_suffix('.pub').read_text().strip()},
                          'operatorCidr': {'value': str(cidr)}, 'imageReference': {'value': plan['image']},
                          'shutdownTimeUtc': {'value': shutdown}}
            write_private(state / 'parameters.json', {'parameters': parameters})
            az('deployment', 'group', 'create', '--resource-group', group, '--template-file', str(ROOT / 'vm.json'),
               '--parameters', '@' + str(state / 'parameters.json'), '--subscription', plan['subscriptionId'])
            address = az('network', 'public-ip', 'show', '--resource-group', group, '--name', 'agap-pilot-ip', '--subscription', plan['subscriptionId'])['ipAddress']
            deployment.update(address=address, allocatedSince=now().isoformat())
            write_private(state / 'deployment.json', deployment)
            print('VM created. Verify driver, runtime and all private listeners before starting the stack.')
            print('Run stop after the session; the Azure schedule is only an additional safeguard.')
        else:
            deployment = json.loads((state / 'deployment.json').read_text())
            account = az('account', 'show')
            if account['id'] != deployment['subscriptionId']:
                raise ValueError('Select the original pilot subscription first.')
            group = az('group', 'show', '--name', deployment['resourceGroup'], '--subscription', deployment['subscriptionId'])
            if group.get('tags', {}).get('agapPurpose') != 'fictional-pilot':
                raise ValueError('This is not the tool-created pilot resource group.')
            if args.action == 'stop':
                az('vm', 'deallocate', '--resource-group', deployment['resourceGroup'], '--name', 'agap-pilot', '--subscription', deployment['subscriptionId'])
                if deployment.get('allocatedSince'):
                    deployment['allocatedHours'] += (now() - instant(deployment.pop('allocatedSince'))).total_seconds() / 3600
                deployment['stoppedAt'] = now().isoformat()
                write_private(state / 'deployment.json', deployment)
                print('Deallocated. Export backup and remove retained pilot disks/resources after verification.')
            else:
                if not deployment.get('allocatedSince'):
                    raise ValueError('The VM is deallocated. A new session needs a refreshed credit/time check.')
                # Never disable host verification; accept the key only after an ARM/operator fingerprint check.
                subprocess.run(['ssh', '-o', 'StrictHostKeyChecking=ask', '-i', str(state / 'id_ed25519'),
                                '-L', '127.0.0.1:5286:127.0.0.1:5286',
                                '-L', '127.0.0.1:59080:127.0.0.1:59080', '-N',
                                'agappilot@' + deployment['address']], check=True)
    except (RuntimeError, ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        print(json.dumps({'state': 'blocked', 'code': type(error).__name__, 'reason': str(error)}), file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
