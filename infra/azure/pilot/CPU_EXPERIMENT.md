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

When SSH egress cannot be verified, remove its narrow NSG rule and use the
subscription-authenticated management channel, `az vm run-command invoke` with
`--command-id RunShellScript --scripts @ABSOLUTE_SCRIPT_PATH`. Keep all inbound
model/database ports closed; do not broaden SSH to all addresses. Start bounded
systemd jobs in the background and inspect them with subsequent run-command
calls. Shell scripts must work with `/bin/sh`; do not rely on brace expansion.

For large transfers, a temporary private StorageV2 container in the same tagged
experiment group can carry Git archives and the small adapter/config artifact
archive. Disable public blob access, require HTTPS, use short-lived read-only
per-blob SAS grants and keep URLs/keys only in mode-0600 ignored `.state` files.
Never print them, commit them, or expose them in process logs. Include transfer
storage/network in the existing ancillary reserve. Skip only explicitly reviewed
repository image-link entries when extracting the code archive; never extract
archive links or special files. Transfer model artifacts as regular files.

Avoid uploading a duplicate large base from the nearly full laptop: retrieve
its exact manifest repository/revision/file directly on the VM, verify byte
count and SHA256 against the imported manifest, then run the complete importer
verification. A 2 GiB bounded downloader with incremental SHA256 and periodic
flush/fsync/page-cache release worked; a 512 MiB downloader hit its dirty-page
cache limit. That failure did not involve model inference. Preserve its receipt.

Keep the pinned requirements and `pip check`/freeze evidence. A review-only probe
is available with `--review-only`; its report explicitly leaves extraction
switching parity unavailable. It still checks the eight-token clean/disabled
readiness probe. This is not a substitute for the full extraction/review run.
The service now validates the generated extraction array against its array
schema before checking individual source citations; the schema itself is
unchanged.

Export the entire small `cpu-evidence` directory, runtime freeze, base-download
receipt and systemd timing/memory/status records before cleanup. A short-lived
write-only SAS for one new evidence blob can transfer a checksummed tar archive;
verify its SHA256 locally before deleting resources. Do not include environment
secrets, private keys, SAS URLs or credential-bearing scripts in the archive.
Delete only the exact task-created group after verifying its `agapPurpose` and
`agapRuntime` tags. Record deallocated state and group absence; retained disks,
public IPs and temporary storage can otherwise continue consuming student credit.
