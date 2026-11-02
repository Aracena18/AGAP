# Hosting and cost proposal — 3 November 2026

**Decision requested later: approve a bounded fictional staging pilot before provisioning. No budget has been approved, no subscription upgraded and no resource purchased by this implementation.** The preferred low-cost starting point remains the student's existing benefits and free Vercel for eligible personal demonstration use. Production operating costs and hosting eligibility require separate institutional acceptance.

## Evidence and assumptions

The [public retail price snapshot](evidence/azure-retail-prices-2026-11-03.json) was retrieved from the [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) for Southeast Asia, consumption/USD. These are list-price planning inputs, not the subscription's actual bill, credits, discounts, availability or quota. No peso exchange rate is guessed. Estimates exclude tax and require a refreshed quote at approval.

The [live authentication probe](evidence/azure-access-2026-11-03.json) failed with `AADSTS700082`; Azure sign-in must be renewed before subscription-specific checks. Cached student-subscription information does not establish current credits or production eligibility. Azure Students describes a $100 credit for its first 12 months and disables the subscription when credits are exhausted unless upgraded; actual remaining benefit is unknown. Check the [offer terms](https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0170p) before choosing institutional use.

Vercel Hobby is restricted to personal non-commercial use ([Hobby terms](https://vercel.com/docs/plans/hobby)); it is not assumed eligible for cooperative operations. Allow $20/month for a Pro platform starting point, then confirm seats, usage and actual suitable agreement ([Pro pricing](https://vercel.com/docs/plans/pro-plan)). No upgrade is performed. Existing domain renewal is a separate owner expense; DNS remains unchanged.

## Costed operating envelope

Assume 730 hours/month, modest document traffic (about 1,000 small fictional applications / 5,000 documents), one production environment and no high availability replicas initially. These quantities are workload assumptions, not capacity certification. Before real use, load testing must determine suitable sizing and the institution must accept availability/recovery targets. Staging is additional and must be stopped or budgeted independently.

Azure Container Apps public Southeast Asia active rates in the snapshot are $0.000034/vCPU-second and $0.000004/GiB-second. The table intentionally reserves full-time active CPU as an upper planning envelope; actual idle billing, free grants and scale-down may reduce costs, but are not promised. A polling worker requires a running replica and cannot be assumed to scale to zero safely.

| Component | Initial planning allocation / rule | Monthly USD envelope |
| --- | --- | ---: |
| API | 0.5 vCPU / 1 GiB, 730 active hours | 55.19 |
| Background worker | 0.5 vCPU / 1 GiB, 730 active hours | 55.19 |
| Maintained ClamAV | 2 vCPU / 4 GiB, 730 active hours | 220.75 |
| Keycloak | 1 vCPU / 2 GiB, persistent PostgreSQL-backed state | 110.38 |
| PostgreSQL compute | Flexible Server B2S at $0.104/hour, 730 hours | 75.92 |
| PostgreSQL disk/IOPS | **Allowance**, final disk/storage meter must be quoted | 20.00 |
| Private originals + derived text | **Allowance**, e.g. 100 GiB hot LRS at $0.02/GiB-month plus versions/operations | 5.00 |
| Backups/offsite restore | **Allowance**, separate storage, identity/files/key recovery and restore traffic | 10.00 |
| Logs and alerts | **Allowance**, bounded ingestion/retention, no document text or secrets in logs | 15.00 |
| Key Vault | **Allowance**; standard operations listed $0.03/10,000 | 1.00 |
| Container registry | **Allowance**, final registry tier/storage quote required | 5.00 |
| Private networking, DNS and egress | **Allowance**, actual private endpoints/traffic/region must be quoted | 30.00 |
| Suitable Vercel hosting | Starting allowance, eligibility/seats/usage to confirm | 20.00 |
| **Base envelope, excluding GPU/tax/extra staging/HA** | Full-time active CPU and explicitly marked allowances | **623.43** |

The rounded practical planning range is approximately **$350–650/month before GPU**, depending on measured CPU/idle behavior and final storage/network choices. The low end is a planning scenario rather than a quoted guaranteed configuration. Even the small PostgreSQL B1MS alone lists $18.98/month before disk; student credit must not be treated as perpetual free production hosting. Shared cooperative operation cannot responsibly be promised at zero cost.

## GPU and inference

Start with the pinned pretrained Qwen baseline. Experiment D is not enabled. One authenticated private service is required, with GPU cost bounded by approved runtime hours, single concurrency and adapter limits. Public Southeast Asia Container Apps T4 GPU usage lists $0.000095/second = **$0.342/GPU-hour**, **excluding associated CPU/memory and startup**. Supported regions, quotas, startup latency and a compatible environment must be confirmed ([serverless GPU documentation](https://learn.microsoft.com/en-us/azure/container-apps/gpu-serverless-overview)). A regional price meter does not prove this subscription can deploy that GPU.

As a separate private GPU-service comparison, the queried Southeast Asia Linux `Standard_NC4as_T4_v3` on-demand VM meter listed $0.736/hour: 25 allocated hours $18.40; 100 hours $73.60; always allocated 730 hours $537.28. Add managed disk/network/backup costs and verify that exact regional SKU/quota before considering it. A stopped VM must be **deallocated** to stop compute billing; disks still cost money. Spot/preemptible prices are not used as a production availability guarantee. No GPU deployment or VM allocation has occurred.

Actual model execution is currently blocked by missing compatible GPU/runtime/artifacts; the [preflight report](evidence/qwen-preflight-2026-11-03.json) explicitly records `modelExecuted:false`. No saved research summary substitutes for the required actual, independent evaluation. Until acceptance, the application exposes manual entry and an honest unavailable state.

## Suggested first budget and renewal checklist

Propose **a maximum $100 equivalent for one 30-day fictional staging pilot**, only after current credit/eligibility and SKU/quotas are verified. This is a proposed cap, not approved spending. Schedule CPU/scanner/Keycloak to demonstration/evaluation hours, use a modest database only if actually eligible, cap GPU at ten allocated hours initially, and review daily spend. Budget alerts alone do not stop billing: use explicit resource shutdown/deallocation and operator checks. Do not weaken private storage, file clearance or authenticated access to fit a free tier.

After sign-in renewal, record subscription offer/credit expiry, relevant provider registrations, Container Apps environment limits, PostgreSQL 18/size availability, regional GPU-family quotas, Vercel plan eligibility, private endpoint costs and suitable data residency. PostgreSQL 18 is listed by Azure, but regional provisioning still needs verification ([supported versions](https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/concepts-supported-versions)). Select the final region/quantities, refresh all allowances using the Azure calculator and obtain approval for both setup and recurring operation before executing deployment. No subscription IDs or access tokens belong in this repository.
