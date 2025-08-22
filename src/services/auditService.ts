
export interface AuditEntry {
  id: string;
  action: string; // e.g., 'VETTED', 'NIN_VERIFY'
  actor: string; // user id / email
  timestamp: string; // ISO
  subjectId?: string;
  details?: Record<string, unknown>;
}

const LS_KEY = 'audit.log';
const WEBHOOK_URL = import.meta.env.VITE_WRITE_WEBHOOK_URL as string | undefined;

function saveLocal(entry: AuditEntry) {
  const raw = localStorage.getItem(LS_KEY);
  const list: AuditEntry[] = raw ? JSON.parse(raw) : [];
  list.unshift(entry);
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 1000)));
}

export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'> & { timestamp?: string }) {
  const full: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: entry.timestamp || new Date().toISOString(),
    action: entry.action,
    actor: entry.actor,
    subjectId: entry.subjectId,
    details: entry.details || {},
  };
  saveLocal(full);
  try {
    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'AUDIT_LOG', payload: full }) });
    }
  } catch { /* no-op */ }
  return full;
}

export function getAuditLog(): AuditEntry[] {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : [];
}
