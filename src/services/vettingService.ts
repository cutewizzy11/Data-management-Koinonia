import { Person } from './apiService';

const VET_WEBHOOK_URL = import.meta.env.VITE_VET_WEBHOOK_URL || import.meta.env.REACT_APP_VET_WEBHOOK_URL;
const VET_FEED_URL = import.meta.env.VITE_VET_FEED_URL || import.meta.env.REACT_APP_VET_FEED_URL;

/**
 * Send vetted applicant to Google Sheet (Apps Script Web App)
 * Expects the endpoint to accept JSON body and append to a sheet.
 */
export async function sendToVettedSheet(applicant: Person, actor: string): Promise<{ ok: boolean; message?: string }> {
  if (!VET_WEBHOOK_URL) {
    return { ok: false, message: 'Missing VET_WEBHOOK_URL in env. Please set VITE_VET_WEBHOOK_URL.' };
  }
  try {
    const payload = {
      id: applicant.id,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      location: applicant.location,
      role: applicant.role || 'Applicant',
      timestamp: applicant.timestamp || new Date().toISOString(),
      occupation: (applicant as any).occupation,
      formerEmployer: (applicant as any).formerEmployer,
      currentEmployer: (applicant as any).currentEmployer,
      reasonForLeavingFormerEmployer: (applicant as any).reasonForLeavingFormerEmployer,
      nin: (applicant as any).nin,
      vnin: (applicant as any).vnin,
      vetted_by: actor,
      vetted_at: new Date().toISOString(),
      status: 'Vetted',
    };
    const resp = await fetch(VET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return { ok: false, message: `Webhook responded ${resp.status}: ${text}` };
    }
    return { ok: true };
  } catch (e:any) {
    return { ok: false, message: String(e?.message || e) };
  }
}

/**
 * Fetch vetted applicants brief list from Google Sheet feed (Apps Script doGet)
 */
export async function fetchVettedBriefs(): Promise<Array<{ id: string; name: string; nin_status?: string; vetted_at?: string }>> {
  if (!VET_FEED_URL) return [];
  const resp = await fetch(VET_FEED_URL);
  if (!resp.ok) return [];
  const data = await resp.json().catch(()=>null);
  // Expect either [{id,name,nin_status,vetted_at}, ...] or a sheet-like object
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.records)) return data.records;
  return [];
}
