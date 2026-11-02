import type { PostedReceipt } from '../loans/loan-gateway';
import { Badge, Button, Money } from '../../shared/ui';
import { dateLabel } from '../../domain/format';
import styles from '../loans/loans.module.css';
export function ReceiptBrief({ receipt }: { receipt: PostedReceipt }) {
  if (receipt.kind !== 'repayment' || !receipt.receiptId) return null;
  return <section className={`panel ${styles.receipt}`}><div className="panel-header no-print"><h2>Saved repayment receipt</h2><Button variant="secondary" onClick={() => window.print()}>Print selected receipt</Button></div>
    <article className="panel-body" aria-label="Saved repayment receipt"><p className="eyebrow">AGAP · Fictional repayment receipt</p><h2>Receipt {receipt.receiptId}</h2><Badge>Posted simulation</Badge>
      <dl><div><dt>Loan</dt><dd>{receipt.loanId}</dd></div><div><dt>Amount received</dt><dd><Money value={receipt.amountCentavos}/></dd></div>
        <div><dt>Payment date</dt><dd>{dateLabel(receipt.effectiveDate)}</dd></div><div><dt>Recorded posting</dt><dd>{dateLabel(receipt.postedAt)}</dd></div>
        <div><dt>Principal remaining after this payment</dt><dd><Money value={receipt.principalAfterCentavos}/></dd></div></dl>
      <p>Journal {receipt.journalId} · Event {receipt.eventId}</p><p>This saved receipt preserves the posted transaction. It does not change the original loan terms.</p>
    </article></section>;
}
