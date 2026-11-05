import datetime as dt
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('pilot', ROOT / 'pilot.py')
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)


class CreditGuards(unittest.TestCase):
    def setUp(self):
        self.at = dt.datetime(2026, 11, 5, tzinfo=dt.timezone.utc)
        self.evidence = {'subscriptionId': 'fictional-subscription', 'currency': 'USD',
                         'source': 'Azure Education Hub', 'remainingUsd': 40,
                         'observedAt': self.at.isoformat(), 'expiresAt': (self.at + dt.timedelta(days=2)).isoformat(),
                         'operatorReference': 'Fictional guard test; no live balance asserted'}

    def test_credit_is_bounded_and_all_costs_must_fit(self):
        self.assertEqual(pilot.validate_credit(self.evidence, 'fictional-subscription', self.at), 30)
        self.assertEqual(pilot.validate_credit(dict(self.evidence, source='Azure Sponsorships Portal'), 'fictional-subscription', self.at), 30)
        self.assertAlmostEqual(pilot.cost_envelope(5.326, 4, 30), 29.304)
        with self.assertRaises(ValueError):
            pilot.cost_envelope(5.326, 4, 20)
        with self.assertRaises(ValueError):
            pilot.cost_envelope(5.326, 4.01, 100)

    def test_missing_expired_future_or_cross_subscription_evidence_is_denied(self):
        variants = [{'remainingUsd': None}, {'remainingUsd': 0}, {'remainingUsd': True},
                    {'remainingUsd': float('nan')}, {'subscriptionId': 'other'},
                    {'observedAt': (self.at + dt.timedelta(seconds=1)).isoformat()},
                    {'observedAt': (self.at - dt.timedelta(hours=25)).isoformat()},
                    {'expiresAt': (self.at + dt.timedelta(hours=4)).isoformat()},
                    {'source': 'invented balance'}, {'currency': 'PHP'}, {'operatorReference': ''}]
        for variant in variants:
            with self.subTest(variant=variant), self.assertRaises(ValueError):
                pilot.validate_credit(dict(self.evidence, **variant), 'fictional-subscription', self.at)

    def test_template_has_only_operator_ssh_and_exact_gpu(self):
        template = json.loads((ROOT / 'vm.json').read_text())
        groups = [r for r in template['resources'] if r['type'].endswith('/networkSecurityGroups')]
        self.assertEqual(len(groups), 1)
        rules = groups[0]['properties']['securityRules']
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0]['properties']['destinationPortRange'], '22')
        self.assertEqual(rules[0]['properties']['sourceAddressPrefix'], "[parameters('operatorCidr')]")
        vm = next(r for r in template['resources'] if r['type'].endswith('/virtualMachines'))
        self.assertEqual(vm['properties']['hardwareProfile']['vmSize'], pilot.SKU)
        self.assertEqual(vm['location'], pilot.REGION)
        self.assertTrue(vm['properties']['osProfile']['linuxConfiguration']['disablePasswordAuthentication'])
        schedule = next(r for r in template['resources'] if r['type'].endswith('/schedules'))
        self.assertEqual(schedule['properties']['timeZoneId'], 'UTC')
        self.assertEqual(schedule['properties']['status'], 'Enabled')

    def test_quota_supports_arm_integer_strings_and_fails_closed(self):
        self.assertEqual(pilot.available_quota({'limit': '24', 'currentValue': '0'}), 24)
        self.assertEqual(pilot.available_quota({'limit': 6, 'currentValue': 0}), 6)
        for invalid in [None, True, 'unknown', -1, 24.5]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                pilot.available_quota({'limit': invalid, 'currentValue': 0})

    def test_secret_files_are_private(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'state.json'
            pilot.write_private(path, {'fictional': True})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)


if __name__ == '__main__':
    unittest.main()
