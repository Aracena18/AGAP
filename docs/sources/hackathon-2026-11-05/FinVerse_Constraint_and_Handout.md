

| Team | FinVerse |
| :---- | :---- |
| **Submitted by** | Arquillano, Aaron J. |
| **Describe your constraint** | DCCPEC staff have limited capacity to reconcile information scattered across application records and supporting documents. AGAP must help officers identify which applications need attention and which are ready for separate human approval. Our current workflow presents evidence and affordability results in separate sections without a review priority queue. During Manila, we will build a consolidated review summary and queue, ordered by substantiated urgency and then waiting time. Missing or conflicting evidence will follow a clarification path. Source-linked AI concerns will await human checking, while confirmed material concerns will escalate to an assigned reviewer through an in-app notice. Applications with complete, current assessments and no unresolved blocking concerns will wait for a separate authorized officer’s approval. Judges will see these paths working on fictional cases. AI will neither approve applications nor determine that an applicant is risk-free. |
| **Dimension (Data, People, Technology, Rules, Money, Operations)** | People; Operations. |
| **Why is it realistic for your partner?** | Partner discussions described fragmented member information, supporting records and capacity-assessment spreadsheets, alongside staff difficulties assembling a loan review. Limited review capacity is therefore a realistic pilot condition: officers need to understand an application's evidence and repayment implications without manually rebuilding the case across separate sections. We have not measured a maximum review time or established a quantified time-saving claim. |
| **How does your solution work within it?** | AGAP will organize applications by the action staff need to take. Each application will show its review reasons, supporting evidence, responsible person and next action. Confirmed material concerns receive priority; otherwise comparable cases are ordered by waiting time. Evidence gaps return for clarification. Unconfirmed AI concerns prevent readiness until checked by a human. Ready applications still require a separate authorized approver. |
| **What will you design and build?** | We will move four additions from Planned to Working: a review priority queue; a consolidated evidence and affordability summary; human checking and disposition of source-linked AI concerns; and reviewer assignment with in-app escalation notices. The demonstration will use fictional records, deterministic routing rules and saved review actions. Any sample AI concerns will be clearly labeled as simulated. |
| **Where will judges see it in your prototype or mock-up?** | Judges will see the queue in the staff application workspace and open each case’s review summary. Ana will demonstrate conflicting evidence, resolution and readiness for separate approval. Ben will demonstrate a confirmed affordability concern requiring reviewer attention. Cora will demonstrate missing information and clarification. A clearly labeled sample AI concern will show the human-checking gate. Judges will inspect ownership, notices, evidence links and saved review actions. |
| **In your own words, explain how challenging it would be to address this constraint during the hackathon, and why addressing it would make your solution more robust in real-world conditions or more impactful for the communities you serve.** | The challenge is prioritizing useful human attention without hiding uncertainty or overwhelming staff with unconfirmed alerts. We must distinguish clarification, AI concern checking, substantive review and approval while preserving evidence and decision history. The hackathon scope reuses existing fictional cases and calculations. Intended benefits include clearer responsibility, less repeated navigation and earlier attention to material concerns. Actual time savings and community outcomes remain to be evaluated. |

# AGAP — Priority review and human escalation

*System-change handout \| Planned \| 4 November 2026*

**Purpose:** Help staff identify the next application and the next action while retaining accountable human lending decisions.

## Review paths

| Review path | Entry condition | Responsible person and next action |
| :---- | :---- | :---- |
| Needs clarification | Required information is missing, conflicting or no longer current | Preparing officer obtains clarification and updates the evidence |
| Awaiting concern check | A source-linked AI concern has not been checked | Preparing officer confirms, corrects or dismisses it with a reason |
| Escalated review | Confirmed material affordability or policy concerns require additional review | Assigned eligible reviewer investigates and records the appropriate disposition |
| Ready for approval | Required evidence and assessment are complete and current, the recommendation is current, and blocking concerns are resolved | Separate authorized officer reviews and makes the lending decision |

## Queue behavior

* Prioritize substantiated material concerns; use waiting time to order otherwise comparable cases.  
* Show all applicable concerns, their sources, ownership and pending actions.  
* The preparing officer assigns an escalated case to an eligible reviewer; the reviewer receives an in-app notice.  
* Acknowledging a notice does not resolve a concern.  
* Material evidence changes trigger renewed readiness checks and preserve earlier review history.  
* “Ready for approval” describes workflow readiness. It does not guarantee repayment or eliminate risk.  
* AI suggestions cannot approve, decline, clear policy failures or supply missing financial facts.

**Hackathon boundary:** Working queue rules and saved actions on fictional data. Use the existing simulated officer and reviewer for the demonstration. Production authorization, a real reviewer roster and live AI execution remain separate integration requirements.

