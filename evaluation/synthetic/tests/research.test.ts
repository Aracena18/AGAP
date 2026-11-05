import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateResearch, hashResearch } from '../../explainable/evaluate.js';
import { researchCli } from '../../explainable/cli.js';
const digest = (char: string) => char.repeat(64);
function fixture() {
    const cohort = { partition: 'holdout', rows: [{ id: 'a', label: 0, weight: 1, subgroup: 'first' }, { id: 'b', label: 1, weight: 2, subgroup: 'first' }, { id: 'c', label: 0, weight: 3, subgroup: 'second' }, { id: 'd', label: 1, weight: 4, subgroup: 'second' }, { id: 'unknown', label: null, weight: 5, subgroup: 'small' }] };
    const protocol = { version: 'research-eval-v1', origin: 'harness', cohortSha256: hashResearch(cohort), datasetSha256: digest('a'), codebookSha256: digest('b'), splitSha256: digest('c'), featureManifestSha256: digest('d'), sourceTermsReference: 'Fictional test only', reviewReference: 'Unapproved arithmetic harness', positiveClass: 'Fictional positive', negativeClass: 'Fictional negative', threshold: 0.5, thresholdSource: 'validation', calibrationEdges: [0, 0.5, 1], minSubgroupCount: 2, selectionFrozenAt: '2026-11-05T00:00:00Z' };
    const base = { protocolSha256: hashResearch(protocol), preprocessingSha256: digest('e'), environmentSha256: digest('f'), classOrder: [0, 1], rows: [{ id: 'a', probability: 0.1 }, { id: 'b', probability: 0.4 }, { id: 'c', probability: 0.6 }, { id: 'd', probability: 0.9 }, { id: 'unknown', probability: 0.2 }] };
    return { cohort, protocol, ebm: { ...base, model: 'ebm', artifactSha256: digest('1') }, logistic: { ...base, model: 'logistic', artifactSha256: digest('2') } };
}
const run = (f: ReturnType<typeof fixture>) => evaluateResearch(f.protocol, f.cohort, f.ebm, f.logistic);
describe('independent normalized research exports', () => {
    it('matches independent weighted/unweighted arithmetic and excludes unknown labels', () => { const result = run(fixture()), m = result.models[0].overall; expect(result).toMatchObject({ origin: 'harness', totalRows: 5, labeledRows: 4, excludedUnknownLabels: 1 }); expect(m.unweighted.brier).toBeCloseTo(0.185); expect(m.weighted.brier).toBeCloseTo(0.185); expect(m.unweighted.auc).toBeCloseTo(0.75); expect(m.weighted.auc).toBeCloseTo(0.75); expect(m.weighted.confusion).toEqual({ truePositive: 4, falsePositive: 3, falseNegative: 2, trueNegative: 1 }); expect(m.weighted.precision).toBeCloseTo(4 / 7); expect(m.weighted.recall).toBeCloseTo(4 / 6); expect(m.weighted.calibration[0]).toMatchObject({ count: 2, mass: 3 }); expect(m.weighted.calibration[0].predicted).toBeCloseTo(0.3); expect(m.weighted.calibration[0].observed).toBeCloseTo(2 / 3); expect(result.models[0].subgroups.find(g => g.group === 'small')).toEqual({ group: 'small', state: 'insufficient', metrics: null }); expect(result.uncertainty.state).toBe('unavailable'); });
    it('preserves point estimates when valid survey weights are globally rescaled', () => { const original = run(fixture()).models[0].overall.weighted; const f = fixture(); for (const row of f.cohort.rows)
        row.weight *= 1e-300; f.protocol.cohortSha256 = hashResearch(f.cohort); for (const model of [f.ebm, f.logistic])
        model.protocolSha256 = hashResearch(f.protocol); const measured = run(f).models[0].overall.weighted; expect(measured.auc).toBeCloseTo(original.auc!); expect(measured.brier).toBeCloseTo(original.brier!); expect(measured.recall).toBeCloseTo(original.recall!); });
    it('gives ties half credit and places probability one in the final bin', () => { const f = fixture(); for (const model of [f.ebm, f.logistic])
        for (const row of model.rows)
            row.probability = 1; const m = run(f).models[0].overall; expect(m.weighted.auc).toBe(0.5); expect(m.unweighted.calibration[0].predicted).toBeNull(); expect(m.unweighted.calibration[1].count).toBe(4); });
    it('keeps undefined metrics unavailable when no known positive class exists', () => { const f = fixture(); for (const row of f.cohort.rows)
        row.label = 0; f.protocol.cohortSha256 = hashResearch(f.cohort); for (const model of [f.ebm, f.logistic])
        model.protocolSha256 = hashResearch(f.protocol); const m = run(f).models[0].overall; expect(m.weighted.auc).toBeNull(); expect(m.weighted.recall).toBeNull(); });
    it('rejects changed cohort, protocol, class order and preprocessing', () => { const f = fixture(); f.cohort.rows[0].label = 1; expect(() => run(f)).toThrow(/cohort hash/); const p = fixture(); p.protocol.threshold = 0.3; expect(() => run(p)).toThrow(/Protocol hash/); const c = fixture(); c.ebm.classOrder = [1, 0]; expect(() => run(c)).toThrow(); const t = fixture(); t.ebm.preprocessingSha256 = digest('0'); expect(() => run(t)).toThrow(/preprocessing/); });
    it('rejects extra, missing and duplicate prediction IDs, including unknown-label rows', () => { for (const mutate of [(rows: {
            id: string;
            probability: number;
        }[]) => rows.pop(), (rows: {
            id: string;
            probability: number;
        }[]) => rows.push({ ...rows[0] }), (rows: {
            id: string;
            probability: number;
        }[]) => { rows[0].id = 'unrecognized'; }]) {
        const f = fixture();
        mutate(f.ebm.rows);
        expect(() => run(f)).toThrow(/align exactly/);
    } });
    it('rejects invalid probabilities, weights and undeclared protocol fields', () => { for (const value of [NaN, Infinity, -0.1, 1.1]) {
        const f = fixture();
        f.ebm.rows[0].probability = value;
        expect(() => run(f)).toThrow();
    } const f = fixture(); f.cohort.rows[0].weight = 0; expect(() => run(f)).toThrow(); expect(() => evaluateResearch({ ...fixture().protocol, approved: true }, fixture().cohort, fixture().ebm, fixture().logistic)).toThrow(); });
    it('requires predeclared increasing calibration boundaries and subgroup minimum', () => { const f = fixture(); f.protocol.calibrationEdges = [0, 0.5, 0.5, 1]; expect(() => run(f)).toThrow(); f.protocol.calibrationEdges = [0, 0.5, 1]; f.protocol.minSubgroupCount = 0; expect(() => run(f)).toThrow(); });
    it('writes a new report through the CLI and refuses overwrites or unknown flags', async () => { const dir = await mkdtemp(join(tmpdir(), 'agap-research-')); try {
        const f = fixture();
        for (const name of ['protocol', 'cohort', 'ebm', 'logistic'] as const)
            await writeFile(join(dir, name + '.json'), JSON.stringify(f[name]));
        const args = ['protocol', 'cohort', 'ebm', 'logistic'].flatMap(name => ['--' + name, join(dir, name + '.json')]).concat(['--out', join(dir, 'report.json')]);
        await researchCli(args);
        expect(JSON.parse(await readFile(join(dir, 'report.json'), 'utf8')).origin).toBe('harness');
        await expect(researchCli(args)).rejects.toThrow(/exist/i);
        await expect(researchCli(['--unknown', 'file'])).rejects.toThrow(/Usage/);
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    } });
});
