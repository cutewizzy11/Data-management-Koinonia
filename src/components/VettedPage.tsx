import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, Search } from 'lucide-react';
import { Person } from '@/services/apiService';
import { fetchVettedBriefs } from '@/services/vettingService';
import { useVetting } from '@/context/VettingContext';
import { VetBadge, NinBadge } from '@/components/common/StatusBadges';

interface Props {
  applicants: Person[];
  onPersonClick: (p: Person) => void;
}

export default function VettedPage({ applicants, onPersonClick }: Props) {
  const { state } = useVetting();

  // Optional external feed (Apps Script doGet returning JSON)
  const [feed, setFeed] = useState<Array<{ id: string; name: string; nin_status?: string; vetted_at?: string }>>([]);

  useEffect(() => {
    (async () => {
      const items = await fetchVettedBriefs();
      setFeed(items || []);
    })();
  }, []);

  // Filters
  const [q, setQ] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // Base list of vetted people, with optional feed merge
  const baseVetted = useMemo(() => {
    const local = applicants.filter(a => state[a.id]?.vetting_status === 'VETTED');

    if (feed && feed.length > 0) {
      const byId = new Map(applicants.map(a => [String(a.id), a]));
      return feed.map(item => {
        const match = byId.get(String(item.id)) || ({ id: item.id, name: item.name } as Person);
        const s = state[(match as any).id as string] || {};
        return {
          ...match,
          name: item.name || match.name,
          // carry status/time if present
          vetted_at: item.vetted_at || (s as any).vetted_at,
          nin_status: (item as any).nin_status || (s as any).nin_status,
        } as Person;
      });
    }

    return local;
  }, [applicants, state, feed]);

  // Apply text + date filters + sort
  const vettedApplicants = useMemo(() => {
    const qLower = q.trim().toLowerCase();

    const withinDate = (iso?: string) => {
      if (!iso) return true;
      const t = new Date(iso).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86400000 - 1) return false;
      return true;
    };

    return baseVetted
      .filter(a => !qLower || (a.name || '').toLowerCase().includes(qLower))
      .filter(a => withinDate(state[a.id]?.vetted_at))
      .sort((a, b) => {
        const sa = state[a.id]?.vetted_at || '';
        const sb = state[b.id]?.vetted_at || '';
        return sb.localeCompare(sa); // newest first
      });
  }, [baseVetted, state, q, from, to]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">NIN</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vetted At</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vettedApplicants.map(a => (
              <tr
                key={a.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onPersonClick(a)}
              >
                <td className="px-6 py-3">
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-gray-500">
                    <VetBadge status={state[a.id]?.vetting_status as any} />
                  </div>
                </td>
                <td className="px-6 py-3">
                  <NinBadge status={state[a.id]?.nin_status as any} />
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {state[a.id]?.vetted_at
                    ? new Date(state[a.id]!.vetted_at!).toLocaleString()
                    : '-'}
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onPersonClick(a); }}
                    className="text-orange-600 hover:text-orange-900"
                    title="View details"
                  >
                    {/* eye icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {vettedApplicants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500">
                  No vetted applicants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
