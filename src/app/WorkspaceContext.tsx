import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { CaseRecord, CaseRepository, DemoActor, DemoRole } from '../domain/types';
import { createBrowserRepository } from '../demo/persistence';

interface WorkspaceValue {
  records: CaseRecord[];
  ready: boolean;
  role: DemoRole;
  actor: DemoActor;
  setRole: (role: DemoRole) => void;
  saveCase: (record: CaseRecord) => Promise<void>;
  resetDemo: () => Promise<void>;
  storageWarning: string;
}
const WorkspaceContext = createContext<WorkspaceValue | null>(null);
function reducer(records: CaseRecord[], action: { type: 'load'; records: CaseRecord[] } | { type: 'save'; record: CaseRecord }) {
  return action.type === 'load' ? action.records : records.map(record => record.id === action.record.id ? action.record : record);
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [records, dispatch] = useReducer(reducer, []);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<DemoRole>('officer');
  const [storageWarning, setStorageWarning] = useState('');
  const repository = useRef<CaseRepository | null>(null);
  useEffect(() => {
    const repo = createBrowserRepository(undefined, setStorageWarning);
    repository.current = repo;
    let mounted = true;
    void repo.list().then(items => { if (mounted) { dispatch({ type: 'load', records: items }); setReady(true); } });
    return () => { mounted = false; };
  }, []);
  async function saveCase(record: CaseRecord) {
    if (!repository.current) return;
    await repository.current.save(record);
    dispatch({ type: 'save', record: structuredClone(record) });
  }
  async function resetDemo() {
    if (!repository.current) return;
    setStorageWarning('');
    const items = await repository.current.reset();
    dispatch({ type: 'load', records: items });
    setRole('officer');
  }
  const actor: DemoActor = { name: role === 'officer' ? 'Mara Santos' : 'Luis Reyes', role };
  return <WorkspaceContext.Provider value={{ records, ready, role, actor, setRole, saveCase, resetDemo, storageWarning }}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is required');
  return context;
}
