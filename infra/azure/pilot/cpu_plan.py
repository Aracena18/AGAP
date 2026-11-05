"""Explicit two-hour student-credit CPU experiment; no automatic GPU fallback."""
import argparse
import datetime as dt
import ipaddress
import json
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.request

from infra.azure.pilot.pilot import az, digest, instant, now, validate_credit, write_private

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
REGION, SKU, CORES = 'koreacentral', 'Standard_B4as_v2', 4
HOURS, CEILING, RESERVE = 2, 10, 8


def bindings():
    names = ['infra/azure/pilot/cpu-vm.json', 'infra/azure/pilot/cpu_plan.py',
             'models/qwen/service/cpu_probe.py', 'models/qwen/service/requirements.cpu.lock',
             'models/qwen/service/server.py', 'models/qwen/service/review.py',
             'models/qwen/service/prompt.txt', 'models/qwen/service/finding.schema.json',
             'models/qwen/service/review.schema.json', 'models/qwen/service/review-input.schema.json',
             'models/qwen/experiment_f/prompt.txt', 'models/qwen/experiment_f/identity.json']
    return {name: digest(REPO / name) for name in names}


def price():
    query = f"armSkuName eq '{SKU}' and armRegionName eq '{REGION}' and serviceName eq 'Virtual Machines' and priceType eq 'Consumption'"
    url = 'https://prices.azure.com/api/retail/prices?' + urllib.parse.urlencode({'currencyCode': 'USD', '$filter': query})
    with urllib.request.urlopen(url, timeout=30) as response:
        rows = json.load(response)['Items']
    rates = [float(row['retailPrice']) for row in rows if row.get('currencyCode') == 'USD'
             and row.get('unitOfMeasure') == '1 Hour' and row.get('productName', '').startswith('Virtual Machines ')
             and not any(word in (row.get('productName', '') + row.get('meterName', '')).lower()
                         for word in ['windows', 'spot', 'low priority'])]
    if not rates:
        raise ValueError('No exact Linux CPU price is available.')
    return max(rates)


def preflight(credit):
    account = az('account', 'show')
    sub = account['id']
    policy = az('rest', '--method', 'get', '--url', f'https://management.azure.com/subscriptions/{sub}?api-version=2022-12-01')
    props = policy.get('subscriptionPolicies', {})
    if policy.get('state') != 'Enabled' or props.get('spendingLimit') != 'On' or 'student' not in props.get('quotaId', '').lower():
        raise ValueError('The enabled student offer and spending limit On are required.')
    ceiling = min(CEILING, validate_credit(json.loads(Path(credit).read_text()), sub, now()))
    quotas = az('vm', 'list-usage', '--location', REGION, '--subscription', sub)
    url = f'https://management.azure.com/subscriptions/{sub}/providers/Microsoft.Compute/skus?' + urllib.parse.urlencode({'api-version': '2021-07-01', '$filter': f"location eq '{REGION}'"})
    skus = az('rest', '--method', 'get', '--url', url)
    selected = next((s for s in skus['value'] if s['name'] == SKU and s.get('resourceType') == 'virtualMachines'), None)
    if not selected or any(r.get('type') == 'Location' for r in selected.get('restrictions', [])):
        raise ValueError('This exact CPU SKU is unavailable; no other SKU is selected automatically.')
    caps = {c['name']: c['value'] for c in selected.get('capabilities', [])}
    if int(caps.get('vCPUs', 0)) != CORES or float(caps.get('MemoryGB', 0)) != 16 or int(caps.get('GPUs', 0)) != 0:
        raise ValueError('The CPU experiment hardware differs.')
    for name in ['cores', selected['family']]:
        quota = next((q for q in quotas if q['name']['value'].lower() == name.lower()), None)
        if not quota or int(quota['limit']) - int(quota['currentValue']) < CORES:
            raise ValueError('Insufficient CPU quota; no upgrade or fallback is allowed.')
    assignments = az('rest', '--method', 'get', '--url', f'https://management.azure.com/subscriptions/{sub}/providers/Microsoft.Authorization/policyAssignments?api-version=2022-06-01')
    for assignment in assignments['value']:
        locations = assignment.get('properties', {}).get('parameters', {}).get('listOfAllowedLocations', {}).get('value')
        if locations and REGION not in [value.lower() for value in locations]:
            raise ValueError('The CPU region is outside the subscription policy.')
    hourly = price()
    forecast = round(hourly * HOURS + RESERVE, 4)
    if forecast > ceiling:
        raise ValueError('The complete CPU forecast exceeds approved credit/budget.')
    image = az('vm', 'image', 'show', '--urn', 'Canonical:ubuntu-24_04-lts:server:latest', '--location', REGION, '--subscription', sub)
    return {'profile': 'fictional-cpu-compatibility-v1', 'subscriptionId': sub, 'checkedAt': now().isoformat(),
            'region': REGION, 'sku': SKU, 'vcpus': CORES, 'memoryGb': 16,
            'maximumAllocatedHours': HOURS, 'maximumUsd': ceiling, 'forecastUsd': forecast,
            'computeHourlyUsd': hourly, 'ancillaryReserveUsd': RESERVE, 'spendingLimit': 'On',
            'creditSha256': digest(credit), 'sourceBindings': bindings(),
            'image': {'publisher': 'Canonical', 'offer': 'ubuntu-24_04-lts', 'sku': 'server', 'version': image['name']}}


def check_plan(plan, credit):
    if plan.get('profile') != 'fictional-cpu-compatibility-v1' or plan.get('region') != REGION or plan.get('sku') != SKU:
        raise ValueError('Unapproved CPU deployment profile.')
    if not dt.timedelta(0) <= now() - instant(plan['checkedAt']) <= dt.timedelta(minutes=30):
        raise ValueError('Repeat live CPU preflight; the plan expired.')
    if plan['creditSha256'] != digest(credit) or plan['sourceBindings'] != bindings():
        raise ValueError('CPU deployment inputs changed.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['preflight', 'deploy'])
    parser.add_argument('--credit-evidence', required=True)
    parser.add_argument('--state', default=str(ROOT / '.state/cpu'))
    parser.add_argument('--plan-sha256')
    parser.add_argument('--operator-cidr')
    args = parser.parse_args()
    state = Path(args.state).resolve()
    if args.action == 'preflight':
        plan = preflight(args.credit_evidence)
        write_private(state / 'plan.json', plan)
        print(json.dumps({k: v for k, v in plan.items() if k not in ['subscriptionId', 'sourceBindings']}, indent=2))
        print('planSha256=' + digest(state / 'plan.json'))
        return
    if not args.plan_sha256 or digest(state / 'plan.json') != args.plan_sha256:
        raise ValueError('Supply the exact reviewed CPU plan checksum.')
    plan = json.loads((state / 'plan.json').read_text())
    check_plan(plan, args.credit_evidence)
    current = preflight(args.credit_evidence)
    if current['subscriptionId'] != plan['subscriptionId'] or current['computeHourlyUsd'] > plan['computeHourlyUsd']:
        raise ValueError('The CPU account/price changed; repeat preflight.')
    cidr = ipaddress.ip_network(args.operator_cidr or '', strict=True)
    if cidr.version != 4 or cidr.prefixlen != 32 or not cidr.network_address.is_global:
        raise ValueError('Only an exact operator public IPv4/32 SSH rule is allowed.')
    if (state / 'deployment.json').exists():
        raise ValueError('Reconcile/stop the existing CPU experiment; do not create another.')
    key = state / 'id_ed25519'
    if not key.exists():
        subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
    group = 'agap-fictional-cpu-' + now().strftime('%Y%m%d%H%M%S')
    sub = plan['subscriptionId']
    az('group', 'create', '--name', group, '--location', REGION, '--subscription', sub,
       '--tags', 'agapPurpose=fictional-pilot', 'deleteAfterPilot=true', 'agapRuntime=cpu-compatibility')
    deployment = {'resourceGroup': group, 'subscriptionId': sub, 'createdAt': now().isoformat(),
                  'allocatedHours': 0, 'cpuPlanSha256': args.plan_sha256}
    write_private(state / 'deployment.json', deployment)
    values = {'sshPublicKey': key.with_suffix('.pub').read_text().strip(), 'operatorCidr': str(cidr),
              'imageReference': plan['image'], 'shutdownTimeUtc': (now() + dt.timedelta(hours=2)).strftime('%H%M')}
    write_private(state / 'parameters.json', {'parameters': {k: {'value': v} for k, v in values.items()}})
    az('deployment', 'group', 'create', '--resource-group', group, '--subscription', sub,
       '--template-file', str(ROOT / 'cpu-vm.json'), '--parameters', '@' + str(state / 'parameters.json'))
    deployment.update(address=az('network', 'public-ip', 'show', '--resource-group', group,
                                '--name', 'agap-pilot-ip', '--subscription', sub)['ipAddress'], allocatedSince=now().isoformat())
    write_private(state / 'deployment.json', deployment)
    print('CPU experiment created. Verify SSH host fingerprint, run the bounded probe, then deallocate.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'state': 'blocked', 'code': type(error).__name__, 'reason': str(error)}), file=sys.stderr)
        sys.exit(2)
