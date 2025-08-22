export interface VetPayload {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  nin?: string;
  vnin?: string;
  occupation?: string;
  formerEmployer?: string;
  currentEmployer?: string;
  reasonLeftFormerEmployer?: string;
  status: 'Vetted';
  vetted_at: string;
}

const VET_SHEET_WEBHOOK_URL = import.meta.env.VITE_VET_SHEET_WEBHOOK_URL as string | undefined;

export async function sendVettedToSheet(payload: VetPayload): Promise<{ ok: boolean; status: number }> {
  if (!VET_SHEET_WEBHOOK_URL) return { ok: true, status: 204 };
  const resp = await fetch(VET_SHEET_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'VETTED_APPLICANT', payload })
  });
  return { ok: resp.ok, status: resp.status };
}