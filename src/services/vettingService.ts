// src/services/vettingService.ts
import { Person } from './apiService';

const VET_WEBHOOK_URL =
  import.meta.env.VITE_VET_WEBHOOK_URL || import.meta.env.REACT_APP_VET_WEBHOOK_URL;
const VET_FEED_URL =
  import.meta.env.VITE_VET_FEED_URL || import.meta.env.REACT_APP_VET_FEED_URL;

type PostResult = { ok: boolean; message?: string };

function buildPayload(applicant: Person, actor: string) {
  return {
    id: String(applicant.id),
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone,
    location: applicant.location,
    role: applicant.role || 'Applicant',
    timestamp: applicant.timestamp || new Date().toISOString(),

    occupation: applicant.occupation,
    formerEmployer: applicant.formerEmployer,
    currentEmployer: applicant.currentEmployer,
    reasonLeftFormerEmployer:
      (applicant as any).reasonLeftFormerEmployer ||
      (applicant as any).reasonForLeavingFormerEmployer,
    reasonForLeavingFormerEmployer:
      (applicant as any).reasonForLeavingFormerEmployer ||
      (applicant as any).reasonLeftFormerEmployer,

    nin: applicant.nin || applicant.nationalIdentificationNumber,
    vnin: applicant.vnin,

    vetted_by: actor,
    vetted_at: new Date().toISOString(),
    status: 'Vetted',
  };
}

export async function sendToVettedSheet(applicant: Person, actor: string): Promise<PostResult> {
  if (!VET_WEBHOOK_URL) {
    return { ok: false, message: 'Missing VET_WEBHOOK_URL in .env (VITE_VET_WEBHOOK_URL).' };
  }

  const json = JSON.stringify(buildPayload(applicant, actor));
  const body = `payload=${encodeURIComponent(json)}`;

  const resp = await fetch(VET_WEBHOOK_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  });

  let parsed: any = null;
  try { parsed = await resp.json(); } catch {
    try { const txt = await resp.text(); parsed = txt ? { message: txt } : null; } catch {}
  }

  if (!resp.ok) {
    const msg = (parsed && (parsed.error || parsed.message)) || `HTTP ${resp.status}`;
    return { ok: false, message: msg };
  }
  if (parsed && parsed.ok === false) {
    return { ok: false, message: parsed.error || 'Script reported failure' };
  }
  return { ok: true, message: (parsed && parsed.message) || 'Saved' };
}

export async function fetchVettedBriefs(): Promise<
  Array<{ id: string; name: string; nin_status?: string; vetted_at?: string }>
> {
  if (!VET_FEED_URL) return [];
  try {
    const resp = await fetch(VET_FEED_URL, { method: 'GET', mode: 'cors' });
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => null);
    if (data && Array.isArray(data.vetted)) return data.vetted; // from our doGet
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.records)) return data.records;
    if (data && Array.isArray(data.applicants)) {
      return data.applicants.map((x: any) => ({
        id: String(x.id || x.ID || ''),
        name: x.name || x.Name || '',
      }));
    }
    return [];
  } catch {
    return [];
  }
}
