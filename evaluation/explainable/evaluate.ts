import { z } from 'zod';
import { serialize, sha256, Sha256 } from '../synthetic/src/model.js';
const reference = z.string().trim().min(1).max(2000), probability = z.number().min(0).max(1);
export const CohortSchema = z.strictObject({ partition: z.literal('holdout'), rows: z.array(z.strictObject({ id: reference, label: z.union([z.literal(0), z.literal(1)]).nullable(), weight: z.number().positive().max(1e12), subgroup: reference })).min(1).max(100000) });
export const ProtocolSchema = z.strictObject({ version: z.literal('research-eval-v1'), origin: z.enum(['harness', 'research']), cohortSha256: Sha256, datasetSha256: Sha256, codebookSha256: Sha256, splitSha256: Sha256, featureManifestSha256: Sha256, sourceTermsReference: reference, reviewReference: reference, positiveClass: reference, negativeClass: reference, threshold: probability, thresholdSource: z.literal('validation'), calibrationEdges: z.array(probability).min(3).max(21), minSubgroupCount: z.number().int().min(2).max(100000), selectionFrozenAt: z.iso.datetime() }).superRefine((p, ctx) => { if (p.positiveClass === p.negativeClass || p.calibrationEdges[0] !== 0 || p.calibrationEdges.at(-1) !== 1 || p.calibrationEdges.some((e, i) => i > 0 && e <= p.calibrationEdges[i - 1]))
    ctx.addIssue({ code: 'custom', message: 'Distinct classes and increasing calibration edges spanning 0 to 1 are required.' }); });
export const PredictionsSchema = z.strictObject({ model: z.enum(['ebm', 'logistic']), protocolSha256: Sha256, artifactSha256: Sha256, preprocessingSha256: Sha256, environmentSha256: Sha256, classOrder: z.tuple([z.literal(0), z.literal(1)]), rows: z.array(z.strictObject({ id: reference, probability })).min(1).max(100000) });
export const hashResearch = (value: unknown) => sha256(serialize(value));
type Row = {
    label: 0 | 1;
    weight: number;
    probability: number;
};
function metrics(rows: Row[], threshold: number, edges: number[], weighted: boolean) {
    const scale = weighted ? rows.reduce((max, r) => Math.max(max, r.weight), 0) || 1 : 1;
    const sorted = rows.map(r => ({ ...r, w: weighted ? r.weight / scale : 1 })).sort((a, b) => a.probability - b.probability);
    if (sorted.some(r => r.w === 0))
        throw new Error('Weight dynamic range cannot be represented safely.');
    let mass = 0, positive = 0, negative = 0, brier = 0, tp = 0, fp = 0, fn = 0, tn = 0, negativeBelow = 0, aucNumerator = 0;
    const calibration = edges.slice(1).map((upper, i) => ({ lower: edges[i], upper, includesUpper: i === edges.length - 2, count: 0, mass: 0, predicted: 0, observed: 0 }));
    for (const r of sorted) {
        mass += r.w;
        if (r.label === 1)
            positive += r.w;
        else
            negative += r.w;
        brier += r.w * (r.probability - r.label) ** 2;
        if (r.probability >= threshold) {
            if (r.label === 1)
                tp += r.w;
            else
                fp += r.w;
        }
        else if (r.label === 1)
            fn += r.w;
        else
            tn += r.w;
        const bin = calibration.find(b => r.probability >= b.lower && (r.probability < b.upper || b.includesUpper && r.probability <= b.upper))!;
        bin.count++;
        bin.mass += r.w;
        bin.predicted += r.w * r.probability;
        bin.observed += r.w * r.label;
    }
    // Weighted pairwise concordance, with half credit for ties; O(n log n).
    for (let i = 0; i < sorted.length;) {
        let j = i, pos = 0, neg = 0;
        while (j < sorted.length && sorted[j].probability === sorted[i].probability) {
            const r = sorted[j++];
            if (r.label === 1)
                pos += r.w;
            else
                neg += r.w;
        }
        aucNumerator += pos * (negativeBelow + neg / 2);
        negativeBelow += neg;
        i = j;
    }
    if (positive > 0 && negative > 0 && positive * negative === 0)
        throw new Error('Class weight product cannot be represented safely.');
    return { count: rows.length, mass: mass * scale, positiveMass: positive * scale, negativeMass: negative * scale, brier: mass ? brier / mass : null, auc: positive && negative ? aucNumerator / (positive * negative) : null, threshold, confusion: { truePositive: tp * scale, falsePositive: fp * scale, falseNegative: fn * scale, trueNegative: tn * scale }, precision: tp + fp ? tp / (tp + fp) : null, recall: positive ? tp / positive : null, calibration: calibration.map(b => ({ ...b, mass: b.mass * scale, predicted: b.mass ? b.predicted / b.mass : null, observed: b.mass ? b.observed / b.mass : null })) };
}
export function evaluateResearch(protocolInput: unknown, cohortInput: unknown, ebmInput: unknown, logisticInput: unknown) {
    const protocol = ProtocolSchema.parse(protocolInput), cohort = CohortSchema.parse(cohortInput), ebm = PredictionsSchema.parse(ebmInput), logistic = PredictionsSchema.parse(logisticInput);
    if (hashResearch(cohort) !== protocol.cohortSha256)
        throw new Error('Normalized cohort hash mismatch.');
    if (ebm.model !== 'ebm' || logistic.model !== 'logistic' || ebm.artifactSha256 === logistic.artifactSha256)
        throw new Error('Supply distinct fixed EBM and logistic artifacts.');
    if (ebm.preprocessingSha256 !== logistic.preprocessingSha256)
        throw new Error('Both models must declare the same frozen normalized preprocessing.');
    const ids = new Set(cohort.rows.map(r => r.id));
    if (ids.size !== cohort.rows.length)
        throw new Error('Duplicate cohort row identity.');
    for (const model of [ebm, logistic]) {
        if (model.protocolSha256 !== hashResearch(protocol))
            throw new Error('Protocol hash mismatch.');
        const predicted = new Set(model.rows.map(r => r.id));
        if (predicted.size !== model.rows.length || predicted.size !== ids.size || [...predicted].some(id => !ids.has(id)))
            throw new Error('Predictions must align exactly with the complete cohort.');
    }
    const labeled = cohort.rows.filter(r => r.label !== null), groups = [...new Set(cohort.rows.map(r => r.subgroup))].sort();
    const models = [ebm, logistic].map(model => {
        const predictions = new Map(model.rows.map(r => [r.id, r.probability]));
        const aligned = labeled.map(r => ({ label: r.label!, weight: r.weight, probability: predictions.get(r.id)!, subgroup: r.subgroup }));
        const measure = (rows: Row[]) => ({ unweighted: metrics(rows, protocol.threshold, protocol.calibrationEdges, false), weighted: metrics(rows, protocol.threshold, protocol.calibrationEdges, true) });
        return { model: model.model, artifactSha256: model.artifactSha256, predictionsSha256: hashResearch(model), preprocessingSha256: model.preprocessingSha256, environmentSha256: model.environmentSha256, overall: measure(aligned), subgroups: groups.map(group => { const rows = aligned.filter(r => r.subgroup === group); return rows.length < protocol.minSubgroupCount ? { group, state: 'insufficient' as const, metrics: null } : { group, state: 'available' as const, metrics: measure(rows) }; }) };
    });
    return { version: 'research-eval-report-v1', origin: protocol.origin, evidence: protocol.origin === 'harness' ? 'Synthetic metric harness only; no survey finding.' : 'Metrics from supplied exports; independent execution, source rights and reviews require separate verification.', protocolSha256: hashResearch(protocol), cohortSha256: hashResearch(cohort), provenance: protocol, totalRows: cohort.rows.length, labeledRows: labeled.length, excludedUnknownLabels: cohort.rows.length - labeled.length, models, uncertainty: { state: 'unavailable', reason: 'No reviewed survey-design resampling method is implemented. Point estimates are not confidence intervals.' }, limitations: ['Reported emergency-fund difficulty is not loan default or causal impact.', 'Weights do not by themselves account for survey design.', 'No model promotion, member score or operational decision is produced.'] };
}
