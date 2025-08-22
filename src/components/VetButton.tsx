import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useVetting } from '@/context/VettingContext';
import { useRole } from '@/context/RoleContext';
import { toast } from '@/components/ui/sonner';
import { logAudit } from '@/services/auditService';
import { sendToVettedSheet } from '@/services/vettingService';
import { Person } from '@/services/apiService';

export const VetButton: React.FC<{ applicantId: string; applicantName?: string }> = ({
  applicantId,
  applicantName
}) => {
  const { markVetted, undoVetted, state } = useVetting();
  const { role } = useRole();

  const isVetted = state[applicantId]?.vetting_status === 'VETTED';

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (role === 'viewer') {
      toast('Permission denied', {
        description: 'You need reviewer or admin role to vet applicants.',
      });
      return;
    }

    const actor = localStorage.getItem('app.user') || 'reviewer@local';

    // If already vetted -> undo
    if (isVetted) {
      await undoVetted(applicantId);
      await logAudit({ action: 'VET_UNDO', actor, subjectId: applicantId, details: { applicantName } });
      toast('Vetting undone', { description: `Marked ${applicantName || 'applicant'} as pending.` });
      return;
    }

    // Not vetted -> send to sheet (non-fatal), then mark vetted locally
    try {
      const person: any =
        (window as any).__APP__?.people?.find?.((p: any) => String(p.id) === String(applicantId));
      const res = await sendToVettedSheet(
        (person || ({ id: applicantId, name: applicantName } as unknown as Person)),
        actor
      );
      if (!res.ok) {
        toast('Vetting recorded locally', { description: res.message || 'Sheet webhook not configured' });
      } else {
        toast('Vetted & sent to sheet', { description: `${applicantName || 'Applicant'} added to vetted sheet` });
      }
    } catch {
      // ignore; continue to local mark
    }

    await markVetted(applicantId);
    await logAudit({ action: 'VET_MARK', actor, subjectId: applicantId, details: { applicantName } });
  };

  return (
    <button
      onClick={onClick}
      aria-pressed={isVetted}
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isVetted ? 'text-green-700 hover:text-green-900' : 'text-indigo-700 hover:text-indigo-900'
      }`}
      title={isVetted ? 'Undo vet' : 'Mark as vetted'}
    >
      <CheckCircle className="w-4 h-4" />
      <span>{isVetted ? 'Undo Vet' : 'Mark Vetted'}</span>
    </button>
  );
};
