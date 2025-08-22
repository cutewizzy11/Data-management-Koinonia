
import React from 'react';

export const Badge: React.FC<{ color: string; children: React.ReactNode; title?: string }> = ({ color, children, title }) => (
  <span title={title} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
    {children}
  </span>
);

export const NinBadge: React.FC<{ status?: 'PENDING' | 'MATCH' | 'MISMATCH' | 'ERROR' }> = ({ status }) => {
  switch (status) {
    case 'MATCH': return <Badge color="bg-green-50 text-green-700 border-green-200">NIN: MATCH</Badge>;
    case 'MISMATCH': return <Badge color="bg-red-50 text-red-700 border-red-200">NIN: MISMATCH</Badge>;
    case 'ERROR': return <Badge color="bg-amber-50 text-amber-700 border-amber-200">NIN: ERROR</Badge>;
    default: return <Badge color="bg-gray-100 text-gray-700 border-gray-200">NIN: PENDING</Badge>;
  }
};

export const VetBadge: React.FC<{ status?: 'PENDING' | 'VETTED' | 'REJECTED' }> = ({ status }) => {
  switch (status) {
    case 'VETTED': return <Badge color="bg-indigo-50 text-indigo-700 border-indigo-200">VETTED</Badge>;
    case 'REJECTED': return <Badge color="bg-red-50 text-red-700 border-red-200">REJECTED</Badge>;
    default: return <Badge color="bg-gray-100 text-gray-700 border-gray-200">PENDING</Badge>;
  }
};
