# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow.spec.ts >> the complete Ana review can be performed with the keyboard
- Location: tests/workflow.spec.ts:23:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Supporting source', { exact: true })
Expected: "payslip"
Received: "old-worksheet"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Supporting source', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Supporting source', { exact: true })
    13 × locator resolved to <select aria-invalid="false" id="correction-income-sourceId">…</select>
       - unexpected value "old-worksheet"

```

```yaml
- combobox "Supporting source":
  - option "Choose a source"
  - option "Current payslip"
  - option "Previous assessment worksheet" [selected]
  - option "Member circumstances discussion"
  - option "Existing obligation record"
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   |
  4   | async function resolveAna(page: Page) {
  5   |   await page.goto('/#/applications/AG-001/evidence');
  6   |   await page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' }).click();
  7   |   await page.getByLabel('Supporting source', { exact: true }).selectOption('payslip');
  8   |   await page.getByLabel('Evidence status', { exact: true }).selectOption('document-supported');
  9   |   await expect(page.getByLabel('Amount (PHP)', { exact: true })).toHaveValue('24000');
  10  |   await page.getByLabel('Reason for correction').fill('Current payslip checked with the member; prior worksheet is outdated.');
  11  |   await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  12  |   await expect(page.getByRole('status')).toContainText('Correction saved');
  13  | }
  14  |
  15  | async function tabTo(page: Page, target: Locator) {
  16  |   for (let step = 0; step < 100; step += 1) {
  17  |     if (await target.evaluate(element => element === document.activeElement)) return;
  18  |     await page.keyboard.press('Tab');
  19  |   }
  20  |   await expect(target).toBeFocused();
  21  | }
  22  |
  23  | test('the complete Ana review can be performed with the keyboard', async ({ page }) => {
  24  |   await page.goto('/#/applications/AG-001/evidence');
  25  |   const resolve = page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' });
  26  |   await resolve.waitFor();
  27  |   await tabTo(page, resolve); await page.keyboard.press('Enter');
  28  |   const source = page.getByLabel('Supporting source', { exact: true });
  29  |   await tabTo(page, source); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
> 30  |   await expect(source).toHaveValue('payslip');
      |                        ^ Error: expect(locator).toHaveValue(expected) failed
  31  |   const evidenceStatus = page.getByLabel('Evidence status', { exact: true });
  32  |   await tabTo(page, evidenceStatus); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  33  |   await tabTo(page, page.getByLabel('Reason for correction')); await page.keyboard.type('Current payslip confirmed with the member.');
  34  |   await tabTo(page, page.getByRole('button', { name: 'Save correction', exact: true })); await page.keyboard.press('Enter');
  35  |   await expect(page.getByRole('status')).toContainText('Correction saved');
  36  |   await tabTo(page, page.getByRole('link', { name: 'Repayment comparison', exact: true })); await page.keyboard.press('Enter');
  37  |   await page.getByRole('heading', { name: 'Repayment comparison', exact: true }).waitFor();
  38  |   await tabTo(page, page.getByRole('radio', { name: /Requested schedule/ })); await page.keyboard.press('ArrowRight');
  39  |   await expect(page.getByRole('radio', { name: /After-payday schedule/ })).toBeChecked();
  40  |   await tabTo(page, page.getByLabel('Recommendation reason')); await page.keyboard.type('Date follows payday and the cost remains the same.');
  41  |   await tabTo(page, page.getByRole('button', { name: 'Save recommendation' })); await page.keyboard.press('Enter');
  42  |   await expect(page.getByRole('status')).toContainText('Recommendation saved');
  43  |   await tabTo(page, page.getByRole('link', { name: /Continue to decision/ })); await page.keyboard.press('Enter');
  44  |   await page.getByRole('heading', { name: 'Decision and explanation' }).waitFor();
  45  |   await tabTo(page, page.getByLabel('Demo role')); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  46  |   await tabTo(page, page.getByLabel('Decision rationale', { exact: true })); await page.keyboard.type('Checked evidence, full costs and household cash timing.');
  47  |   await tabTo(page, page.getByText('Read the explanation to be recorded', { exact: true })); await page.keyboard.press('Enter');
  48  |   await tabTo(page, page.getByLabel(/I reviewed the template explanation/)); await page.keyboard.press('Space');
  49  |   await tabTo(page, page.getByRole('button', { name: 'Record decision', exact: true })); await page.keyboard.press('Enter');
  50  |   await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('application approved');
  51  | });
  52  |
  53  | test('Ana: correct evidence, compare timing, hand off and preserve a printed decision through edits', async ({ page }, testInfo) => {
  54  |   const errors: string[] = [];
  55  |   page.on('pageerror', error => errors.push(error.message));
  56  |   await resolveAna(page);
  57  |   await page.reload();
  58  |   await expect(page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' })).toHaveCount(0);
  59  |   await page.getByRole('link', { name: 'Repayment comparison', exact: true }).click();
  60  |   await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toContainText('₱2,000');
  61  |   await expect(page.getByRole('region', { name: 'Lowest dated cash balance', exact: true })).toContainText('−₱2,000');
  62  |   await page.getByRole('radio', { name: /After-payday schedule/ }).check();
  63  |   await expect(page.getByRole('region', { name: 'Lowest dated cash balance', exact: true })).toContainText('₱1,000');
  64  |   await expect(page.getByRole('table', { name: /Full offer costs/ })).toContainText('₱36,000');
  65  |   await page.getByRole('button', { name: 'View dated movements' }).click();
  66  |   await expect(page).toHaveURL(/AG-001\/comparison$/);
  67  |   await page.getByRole('button', { name: 'Fictional offer schedule' }).click();
  68  |   await expect(page).toHaveURL(/AG-001\/comparison$/);
  69  |   await page.getByLabel('Recommendation reason').fill('The after-payday schedule keeps the same full cost and avoids the modeled timing gap.');
  70  |   await page.getByRole('button', { name: 'Save recommendation' }).click();
  71  |   await expect(page.getByRole('status')).toContainText('Recommendation saved');
  72  |   await page.getByRole('link', { name: /Continue to decision/ }).click();
  73  |   await page.getByLabel('Demo role').selectOption('reviewer');
  74  |   await page.getByLabel('Decision rationale', { exact: true }).fill('Reviewed current payslip, essentials, full costs and remaining uncertainty with the member.');
  75  |   await page.getByLabel('Review date', { exact: true }).fill('2026-12-01');
  76  |   await page.getByText('Read the explanation to be recorded', { exact: true }).click();
  77  |   await page.getByLabel(/I reviewed the template explanation/).check();
  78  |   await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  79  |   const brief = page.getByRole('article', { name: 'Saved member brief' });
  80  |   await expect(brief).toContainText('₱36,000');
  81  |   await expect(brief).toContainText('₱6,000');
  82  |   await expect(brief).toContainText('monthly remaining money is ₱2,000');
  83  |   await expect(brief).toContainText('Current payslip');
  84  |   await expect(brief).toContainText('Dec 1, 2026');
  85  |   await page.emulateMedia({ media: 'print' });
  86  |   await expect(page.getByRole('banner')).toBeHidden();
  87  |   await expect(brief).toBeVisible();
  88  |   await page.pdf({ path: testInfo.outputPath('ana-member-brief.pdf'), format: 'A4', printBackground: true });
  89  |   await page.emulateMedia({ media: 'screen' });
  90  |   await page.reload();
  91  |   await expect(brief).toContainText('₱36,000');
  92  |   await page.getByLabel('Demo role').selectOption('officer');
  93  |   await page.getByRole('link', { name: 'Evidence', exact: true }).click();
  94  |   await page.getByRole('button', { name: 'Correct Monthly take-home pay', exact: true }).click();
  95  |   await page.getByLabel('Amount (PHP)', { exact: true }).fill('23000');
  96  |   await page.getByLabel('Reason for correction').fill('Fictional updated circumstances reported for renewed review.');
  97  |   await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  98  |   await expect(page.getByText('Review again', { exact: true })).toBeVisible();
  99  |   await page.getByRole('link', { name: 'Decision & explanation', exact: true }).click();
  100 |   await expect(brief).toContainText('Historical decision');
  101 |   await expect(brief).toContainText('monthly remaining money is ₱2,000');
  102 |   expect(errors).toEqual([]);
  103 | });
  104 |
  105 | test('Ben retains the monthly shortfall after a date change; Cora can be returned without invented figures', async ({ page }) => {
  106 |   await page.goto('/#/applications/AG-002/comparison');
  107 |   await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toContainText('−₱4,000');
  108 |   await page.getByRole('radio', { name: /After-payday schedule/ }).check();
  109 |   await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toContainText('−₱4,000');
  110 |   await page.getByRole('link', { name: 'Decision & explanation', exact: true }).click();
  111 |   await page.getByLabel('Demo role').selectOption('reviewer');
  112 |   await page.getByLabel('Clarification needed and next step').fill('Discuss the monthly shortfall and clarify household circumstances.');
  113 |   await page.getByLabel(/I reviewed the template explanation/).check();
  114 |   await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  115 |   await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('−₱4,000');
  116 |   await page.goto('/#/applications/AG-003/comparison');
  117 |   await expect(page.getByRole('heading', { name: 'Evidence needs clarification' })).toBeVisible();
  118 |   await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toHaveCount(0);
  119 |   await page.getByRole('link', { name: 'Decision & explanation', exact: true }).click();
  120 |   await page.getByLabel('Demo role').selectOption('reviewer');
  121 |   await page.getByLabel('Clarification needed and next step').fill('Confirm take-home income with a dated member statement or document.');
  122 |   await page.getByLabel(/I reviewed the template explanation/).check();
  123 |   await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  124 |   await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('returned for clarification');
  125 | });
  126 |
  127 | test('source tracing, keyboard entry and reset work with hash routing', async ({ page }) => {
  128 |   await resolveAna(page);
  129 |   await page.getByRole('link', { name: 'Repayment comparison', exact: true }).click();
  130 |   await page.getByRole('button', { name: 'View dated movements' }).click();
```
