
import { logAudit } from './auditService';

export type NinStatus = 'PENDING' | 'MATCH' | 'MISMATCH' | 'ERROR';

export interface NinInput {
  nin?: string; // raw NIN (avoid if possible)
  vnin?: string; // virtual NIN token (preferred)
  firstName?: string;
  surname?: string;
  otherNames?: string;
  dob?: string; // ISO date yyyy-mm-dd
}

export interface NinResult {
  status: NinStatus;
  provider: string;
  provider_reference?: string;
  compare_summary?: string;
  raw?: unknown;
}

const PROVIDER = (import.meta.env.VITE_NIN_PROVIDER as string) || 'MOCK';
const KEY = import.meta.env.VITE_NIN_API_KEY as string | undefined;
const BASE_URL = import.meta.env.VITE_NIN_API_BASE as string | undefined;

export async function verifyNIN(applicantId: string, actor: string, input: NinInput): Promise<NinResult> {
  const provider = PROVIDER.toUpperCase();

  try {
    if (provider === 'MOCK') {
      const match = !!(input.firstName && input.surname);
      const res: NinResult = {
        status: match ? 'MATCH' : 'MISMATCH',
        provider: 'MOCK',
        provider_reference: 'MOCK-' + Math.random().toString(36).slice(2, 10),
        compare_summary: `Compared name + DOB${input.dob ? '' : ' (no DOB provided)'}: ${match ? 'MATCH' : 'MISMATCH'}`,
      };
      await logAudit({ action: 'NIN_VERIFY', actor, subjectId: applicantId, details: { provider: 'MOCK', input: { ...input, nin: input.nin ? '***' : undefined } } });
      return res;
    }

    if (!KEY || !BASE_URL) {
      await logAudit({ action: 'NIN_VERIFY', actor, subjectId: applicantId, details: { provider, error: 'Missing API key/base url' } });
      return { status: 'ERROR', provider, compare_summary: 'Missing API credentials' };
    }

    // Minimal example—real providers differ. Expect a 200 JSON with match info.
    const resp = await fetch(`${BASE_URL}/nin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ vnin: input.vnin || undefined, nin: input.vnin ? undefined : input.nin, first_name: input.firstName, last_name: input.surname, other_names: input.otherNames, dob: input.dob })
    });
    const data = await resp.json().catch(() => ({}));
    const ok = (resp.ok && (data.match === true || data.status === 'match'));
    const status: NinStatus = ok ? 'MATCH' : (resp.ok ? 'MISMATCH' : 'ERROR');
    const result: NinResult = {
      status,
      provider,
      provider_reference: data.reference || data.request_id,
      compare_summary: data.reason || data.message || (ok ? 'Match' : 'No match'),
      raw: data,
    };
    await logAudit({ action: 'NIN_VERIFY', actor, subjectId: applicantId, details: { provider, response_status: resp.status } });
    return result;
  } catch (e) {
    await logAudit({ action: 'NIN_VERIFY', actor, subjectId: applicantId, details: { provider, error: String(e) } });
    return { status: 'ERROR', provider, compare_summary: 'Unexpected error' };
  }
}
