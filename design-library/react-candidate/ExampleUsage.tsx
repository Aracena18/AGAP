import { useState } from 'react';
import { Badge, Button, Card, GabayHelp, Notice, SegmentedControl, StepProgress, TextField } from './AGAPComponents';

/** For example only. Use real AGAP data, contracts, and persisted server commands in production. */
export function DesignSystemExample() {
  const [name, setName] = useState('');
  const [term, setTerm] = useState<'3' | '6' | '12'>('6');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  return <div style={{ display: 'grid', gap: 20, maxWidth: 800 }}>
    <Card eyebrow="Proposed member portal" title="Review your details">
      <div style={{ display: 'grid', gap: 16 }}>
        <TextField label="Member name" value={name} onChange={e=>setName(e.target.value)}
          error={touched && !name.trim() ? 'Please enter your name.' : undefined} required />
        <SegmentedControl label="Repayment term" value={term} onChange={setTerm} options={[
          { label: '3 months', value: '3' }, { label: '6 months', value: '6' }, { label: '12 months', value: '12' }
        ]} />
        <Button onClick={()=>{setTouched(true);if(name.trim())setSaved(true)}}>Save example</Button>
        {saved && <Notice title="Example details saved" tone="success">No loan has been approved or submitted.</Notice>}
      </div>
    </Card>
    <Card title="Application progress"><Badge tone="info">In progress</Badge>
      <StepProgress label="Review application" activeIndex={2} steps={['Details','Documents','Review','Submit']} />
    </Card>
    <GabayHelp imageSrc="/assets/gabay-welcome.webp" title="Need help with this step?"
      actionLabel="View guidance" onAction={()=>alert('Show a real accessible help panel here.')}>
      <p>Take your time. You can review the information before submitting.</p>
    </GabayHelp>
  </div>;
}
