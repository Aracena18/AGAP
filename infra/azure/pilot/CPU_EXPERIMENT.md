# Student-credit CPU compatibility experiment

This is a separate, explicitly unapproved model-execution experiment. The user
authorized a free route or existing student-credit billing after the A100 block.
No subscription upgrade is permitted. The original CUDA/BF16 service and release
gates remain unchanged.

The exact planned host is Standard_B4as_v2 in Korea Central: four CPUs,16 GB RAM,
no GPU. Live preflight requires the student offer, spending limit On, exact SKU,
family/total quota and allowed-region policy. At the observed USD0.187 compute
hourly rate, two hours plus USD8 reserved for disk/network forecasts USD8.374.
The experiment is refused if its forecast exceeds USD10 or remaining credit.
This is a conservative forecast, not an Azure billing guarantee. No auto restart
or unbounded alternate machine selection exists.

```bash
python3 -m infra.azure.pilot.cpu_plan preflight --credit-evidence infra/azure/pilot/.state/cpu/credit.json
python3 -m infra.azure.pilot.cpu_plan deploy --credit-evidence infra/azure/pilot/.state/cpu/credit.json --plan-sha256 ACTUAL_REVIEWED_DIGEST --operator-cidr ACTUAL_PUBLIC_IPV4/32
```

After verified SSH host-key comparison with Azure run-command output, transfer
only the checked repository revision and the verified ignored experiment-f-v1
artifact folder. Preserve the original Downloads. Install python3-venv on the
host; use a separate virtual environment and the pinned CPU requirements:

```bash
python3 -m venv /home/agappilot/agap-cpu-venv
/home/agappilot/agap-cpu-venv/bin/pip install --no-cache-dir -r models/qwen/service/requirements.cpu.lock
/home/agappilot/agap-cpu-venv/bin/pip check
/home/agappilot/agap-cpu-venv/bin/pip freeze --all > /home/agappilot/cpu-runtime-freeze.txt
```

Run cpu_probe with --allow-unapproved-fictional-cpu and exact manifest/candidate
checksums. Use a systemd unit as agappilot with MemoryMax=13G,MemorySwapMax=0,
RuntimeMaxSec=1800. The probe uses at most four threads and 600 seconds per
generation. Its outer unit bounds loading and readiness probes as well. It
loads unquantized float32 values, retaining the same base/F weights, source
bundles, prompts and schemas. It performs extraction → F review → disabled
extraction, records raw results, citation/schema checks, exact switching parity,
latency and process peak RSS. Source text is not silently truncated.

This initial probe opens no HTTP listener and performs no training, merge,
financial calculation or lending decision. Passing it does not demonstrate
BF16/CUDA compatibility, application HTTP latency, accuracy or independent
acceptance. Keep failed evidence. Connect HTTP only after actual compatibility
and performance evidence. A CPU can be substantially slower than a GPU; success
and useful application latency are not assumed.

Deallocate after the test, export the small verified evidence, and remove only
the task-created tagged group. The original helper can stop this separate state:

```bash
python3 infra/azure/pilot/pilot.py stop --state infra/azure/pilot/.state/cpu
```

Verify PowerState/deallocated. Retained disk/IP remain potentially billable until
the exact experiment group is deleted. Do not delete unrelated resources.
