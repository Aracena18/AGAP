import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateResearch } from './evaluate.js';
export async function researchCli(args: string[]) {
    const flags = ['--protocol', '--cohort', '--ebm', '--logistic', '--out'];
    if (args.length !== 10 || args.some((arg, i) => i % 2 === 0 && !flags.includes(arg)) || new Set(args.filter((_, i) => i % 2 === 0)).size !== 5)
        throw new Error('Usage: cli.ts --protocol FILE --cohort FILE --ebm FILE --logistic FILE --out NEW_FILE');
    const options = new Map(flags.map(flag => [flag, args[args.indexOf(flag) + 1]]));
    const read = async (flag: string) => JSON.parse(await readFile(options.get(flag)!, 'utf8')) as unknown;
    const [protocol, cohort, ebm, logistic] = await Promise.all([read('--protocol'), read('--cohort'), read('--ebm'), read('--logistic')]);
    const report = evaluateResearch(protocol, cohort, ebm, logistic);
    await writeFile(options.get('--out')!, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    researchCli(process.argv.slice(2)).then(() => console.log('Research export report written; review its provenance and limitations.')).catch(error => { console.error(error instanceof Error ? error.message : 'Research evaluation failed.'); process.exitCode = 1; });
}
