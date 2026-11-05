import copy
import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest

from infra.azure.pilot import cpu_plan


class CpuPlanGuards(unittest.TestCase):
    def test_cpu_template_preserves_exact_private_gpu_template_security(self):
        original = json.loads((cpu_plan.ROOT / 'vm.json').read_text())
        expected = copy.deepcopy(original)
        for item in expected['resources']:
            item['location'] = cpu_plan.REGION
            if item['type'] == 'Microsoft.Compute/virtualMachines':
                item['properties']['hardwareProfile']['vmSize'] = cpu_plan.SKU
        self.assertEqual(json.loads((cpu_plan.ROOT / 'cpu-vm.json').read_text()), expected)
        self.assertEqual(cpu_plan.HOURS, 2)
        self.assertEqual(cpu_plan.CEILING, 10)

    def test_plan_rejects_expiry_cross_profile_or_changed_code_and_credit(self):
        with tempfile.TemporaryDirectory() as directory:
            credit = Path(directory) / 'credit.json'
            credit.write_text('{}')
            plan = {'profile': 'fictional-cpu-compatibility-v1', 'region': cpu_plan.REGION,
                    'sku': cpu_plan.SKU, 'checkedAt': cpu_plan.now().isoformat(),
                    'creditSha256': cpu_plan.digest(credit), 'sourceBindings': cpu_plan.bindings()}
            cpu_plan.check_plan(plan, credit)
            for change in [{'profile': 'gpu'}, {'sku': 'different'}, {'region': 'different'},
                           {'checkedAt': (cpu_plan.now() - dt.timedelta(minutes=31)).isoformat()},
                           {'sourceBindings': {}}, {'creditSha256': '0' * 64}]:
                with self.subTest(change=change), self.assertRaises(ValueError):
                    cpu_plan.check_plan({**plan, **change}, credit)


if __name__ == '__main__':
    unittest.main()
