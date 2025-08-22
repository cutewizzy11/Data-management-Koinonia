import React, { useState, useMemo } from 'react';
import {
  Search, Users, Eye, SortAsc, SortDesc, Grid, List,
  MapPin, Calendar, Building, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { Person } from '../services/apiService';
import { NinBadge, VetBadge } from './common/StatusBadges';
import { useVetting } from '@/context/VettingContext';
import { useRole } from '@/context/RoleContext';
import PersonDetailsModal from './PersonDetailsModal';
import { toast } from "@/components/ui/sonner";
import { useBestImageUrls } from '../hooks/useBestImageUrl';

interface TableViewProps {
  applicants: Person[];
  referees: Person[];
  associates: Person[];
  onPersonClick: (person: Person, type: 'applicant' | 'referee' | 'associate') => void;
  onRefetch?: () => Promise<void>;
}

type ViewMode = 'grid' | 'table';
type SortField = 'name' | 'email' | 'role' | 'type' | 'location' | 'timestamp';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'applicant' | 'referee' | 'associate';

const TableView: React.FC<TableViewProps> = ({
  applicants, referees, associates, onPersonClick, onRefetch
}) => {
  const { state } = useVetting();
  const { role } = useRole();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isDownloadingImages, setIsDownloadingImages] = useState(false);
  const [isLocalDownloading, setIsLocalDownloading] = useState(false);

  const isLocalHost =
    ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.');
  const showDownloadButton = isLocalHost || import.meta.env.DEV;

  // Combine all people with their types
  const allPeople = useMemo(() => {
    return [
      ...applicants.map(person => ({ ...person, type: 'applicant' as const })),
      ...referees.map(person => ({ ...person, type: 'referee' as const })),
      ...associates.map(person => ({ ...person, type: 'associate' as const })),
    ];
  }, [applicants, referees, associates]);

  // Filter + sort
  const filteredAndSortedPeople = useMemo(() => {
    let filtered = allPeople;

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.email?.toLowerCase().includes(s) ||
        p.role?.toLowerCase().includes(s) ||
        p.location?.toLowerCase().includes(s) ||
        (p as any).stateOfOrigin?.toLowerCase().includes(s) ||
        (p as any).nationality?.toLowerCase().includes(s)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }

    filtered.sort((a: any, b: any) => {
      let aValue = '';
      let bValue = '';

      switch (sortField) {
        case 'name': aValue = a.name || ''; bValue = b.name || ''; break;
        case 'email': aValue = a.email || ''; bValue = b.email || ''; break;
        case 'role': aValue = a.role || a.type; bValue = b.role || b.type; break;
        case 'type': aValue = a.type; bValue = b.type; break;
        case 'location':
          aValue = a.location || a.stateOfOrigin || '';
          bValue = b.location || b.stateOfOrigin || '';
          break;
        case 'timestamp':
          aValue = a.timestamp || '';
          bValue = b.timestamp || '';
          break;
        default:
          aValue = ''; bValue = '';
      }

      const cmp = String(aValue).localeCompare(String(bValue));
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [allPeople, searchTerm, filterType, sortField, sortOrder]);

  // Resolve images
  const imageUrlsToResolve = useMemo(
    () => filteredAndSortedPeople.map((p: any) => ({
      key: String(p.id),
      url: p.image,
      metadata: { personId: String(p.id), personName: p.name, type: p.type }
    })), [filteredAndSortedPeople]
  );
  const { resolvedUrls: resolvedImageUrls } = useBestImageUrls(imageUrlsToResolve);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handlePersonClick = (person: Person & { type: 'applicant' | 'referee' | 'associate' }) => {
    setSelectedPerson(person);
    setIsModalOpen(true);
    onPersonClick(person, person.type);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'applicant': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'referee': return 'bg-green-100 text-green-800 border-green-200';
      case 'associate': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'N/A'; }
  };

  // ----- Data refresh & images (unchanged) -----
  const getErrorMessage = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    try { return JSON.stringify(e); } catch { return 'Unknown error'; }
  };

  const findPeopleWithMissingImages = async () => {
    const candidates: any[] = allPeople as any;
    const results: any[] = [];

    const quickMissing = candidates.filter(p =>
      !p.image || p.image.trim() === '' || p.image.includes('placeholder') || p.image === '/images/default-avatar.png'
    );
    results.push(...quickMissing);

    const toCheck = candidates.filter(p => p.image && p.image.startsWith('/images/'));
    await Promise.allSettled(
      toCheck.map(async (p) => {
        try {
          const r = await fetch(p.image + (p.image.includes('?') ? `&cb=${Date.now()}` : `?cb=${Date.now()}`), { method: 'GET', cache: 'no-store' });
          if (!r.ok) results.push(p);
        } catch { results.push(p); }
      })
    );

    const seen = new Set<string>();
    return results.filter(p => {
      const key = (p as any).id || `${p.name}-${p.email}-${p.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleUpdateImages = async () => {
    if (import.meta.env.PROD) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_hard', String(Date.now()));
        window.location.replace(url.toString());
        return;
      } catch { window.location.reload(); return; }
    }

    if (!onRefetch) return;
    setIsDownloadingImages(true);
    try {
      toast('Refreshing data...', { description: 'Updating the data store and forcing image reload.' });
      await onRefetch();

      let peopleWithMissingImages: any[] = [];
      try { peopleWithMissingImages = await findPeopleWithMissingImages(); } catch {}

      if (peopleWithMissingImages.length > 0) {
        try {
          const missingTypes = new Set(peopleWithMissingImages.map((p: any) => (p as any).type + 's'));
          const onlyParam = Array.from(missingTypes).join(',');
          const resp = await fetch(`/download-images?only=${onlyParam}&force=true`, { method: 'POST' });
          const data = await resp.json().catch(() => ({} as any));
          if (resp.ok && data?.ok) {
            toast.success('Images ensured', { description: `${data.ensured || 0}/${data.total || 0} files ensured locally. Reloading...` });
            setTimeout(() => window.location.reload(), 600);
          }
        } catch {}
      }

      const images = document.querySelectorAll('img[src*="/images/drive_"]');
      images.forEach((img: any) => {
        const src = img.src;
        const cacheBuster = `?t=${Date.now()}`;
        img.src = src.includes('?') ? src.split('?')[0] + cacheBuster : src + cacheBuster;
      });

      toast.success('Data refreshed', { description: 'All data and images have been updated.' });
    } catch (e) {
      toast.error('Failed to refresh data', { description: getErrorMessage(e) });
    } finally {
      setIsDownloadingImages(false);
    }
  };

  const handleLocalDownloadImages = async () => {
    setIsLocalDownloading(true);
    try {
      toast('Forcing download of all images...', {
        description: 'Using Google Drive thumbnails (screenshots) to refresh every picture.'
      });
      const url = `/download-images?force=true`;
      const resp = await fetch(url, { method: 'POST' });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || `Download failed with status ${resp.status}`);
      }
      const ensured = Number(data.ensured) || 0;
      const total = Number(data.total) || 0;
      const outputDir = typeof data.outputDir === 'string' ? data.outputDir : 'dist/images';

      toast.success('Images refreshed', {
        description: `${ensured}/${total} files ensured locally (${outputDir}). Reloading to show updates...`
      });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast.error('Local download not available', {
        description: `${getErrorMessage(e)}. This action works when running the packaged standalone app (serving /download-images).`
      });
    } finally {
      setIsLocalDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All People</h1>
              <p className="text-lg text-gray-600">Comprehensive view of all applicants, referees, and associates</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{allPeople.length}</div>
              <div className="text-sm text-gray-500">Total People</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleUpdateImages}
              disabled={isDownloadingImages}
              className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
              title={import.meta.env.PROD ? 'Hard refresh the page (production)' : 'Refresh data from source (no image download)'}
            >
              <RefreshCw className={`w-5 h-5 ${isDownloadingImages ? 'animate-spin' : ''}`} />
              <span>{isDownloadingImages ? 'Updating...' : 'Refresh Data'}</span>
            </button>

            {showDownloadButton && (
              <button
                onClick={handleLocalDownloadImages}
                disabled={isLocalDownloading}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                title="Force download all images locally via Google Drive screenshot (standalone app or dev server)"
              >
                <ImageIcon className={`w-5 h-5 ${isLocalDownloading ? 'animate-spin' : ''}`} />
                <span>{isLocalDownloading ? 'Downloading...' : 'Download Images (local)'}</span>
              </button>
            )}

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="applicant">Applicants</option>
              <option value="referee">Referees</option>
              <option value="associate">Associates</option>
            </select>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="type">Sort by Type</option>
              <option value="location">Sort by Location</option>
              <option value="timestamp">Sort by Timestamp</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600'} hover:bg-gray-50`}
                title="Grid View"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg border ${viewMode === 'table' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600'} hover:bg-gray-50`}
                title="Table View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {(searchTerm || filterType !== 'all') && (
        <div className="mt-4 px-6">
          <p className="text-gray-600">
            Showing {filteredAndSortedPeople.length} of {allPeople.length} people
            {searchTerm && ` matching "${searchTerm}"`}
            {filterType !== 'all' && ` (${filterType}s only)`}
          </p>
        </div>
      )}

      {filteredAndSortedPeople.length > 0 ? (
        viewMode === 'grid' ? (
          // GRID VIEW
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedPeople.map((person: any, index) => (
              <div
                key={person.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer group"
                onClick={() => handlePersonClick(person)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getTypeColor(person.type)}`}>
                    {person.type.charAt(0).toUpperCase() + person.type.slice(1)}
                  </span>
                  <div className="flex items-center gap-2">
                    {person.type === 'applicant' && <VetBadge status={state[String(person.id)]?.vetting_status as any} />}
                    {person.type === 'applicant' && <NinBadge status={state[String(person.id)]?.nin_status as any} />}
                  </div>
                </div>

                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center">
                    {person.image ? (
                      <img
                        src={resolvedImageUrls[String(person.id)] ?? person.image}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center text-white font-bold text-lg ${(resolvedImageUrls[String(person.id)] || person.image) ? 'hidden' : ''}`}>
                      {getInitials(person.name)}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                    {person.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {person.role || person.type.charAt(0).toUpperCase() + person.type.slice(1)}
                  </p>
                  {person.email && (
                    <p className="text-xs text-gray-500 truncate">
                      {person.email}
                    </p>
                  )}
                </div>

                {/* Meta */}
                <div className="space-y-2 text-xs text-gray-500">
                  {person.location && (
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="truncate">{person.location}</span>
                    </div>
                  )}
                  {person.stateOfOrigin && (
                    <div className="flex items-center">
                      <Building className="w-3 h-3 mr-1" />
                      <span className="truncate">{person.stateOfOrigin}</span>
                    </div>
                  )}
                  {person.timestamp && (
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{formatDate(person.timestamp)}</span>
                    </div>
                  )}
                </div>

                {/* Actions – ONLY view (no Vet/Verify NIN on Table tab) */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // TABLE VIEW
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Person</span>
                        {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => handleSort('type')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Type</span>
                        {sortField === 'type' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => handleSort('email')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Contact</span>
                        {sortField === 'email' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => handleSort('location')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Location</span>
                        {sortField === 'location' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => handleSort('timestamp')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Date</span>
                        {sortField === 'timestamp' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredAndSortedPeople.map((person: any) => (
                    <tr
                      key={person.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handlePersonClick(person)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                            {person.image ? (
                              <img
                                src={resolvedImageUrls[String(person.id)] ?? person.image}
                                alt={person.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-white font-semibold text-sm ${(resolvedImageUrls[String(person.id)] || person.image) ? 'hidden' : ''}`}>
                              {getInitials(person.name)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{person.name}</div>
                            <div className="text-sm text-gray-500">{person.role || person.type}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(person.type)}`}>
                          {person.type.charAt(0).toUpperCase() + person.type.slice(1)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{person.email || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{person.phone || 'N/A'}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{person.location || person.stateOfOrigin || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{person.nationality || 'N/A'}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(person.timestamp || '')}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {person.type === 'applicant' ? (
                          <div className="flex items-center gap-2">
                            <VetBadge status={state[String(person.id)]?.vetting_status as any} />
                            <NinBadge status={state[String(person.id)]?.nin_status as any} />
                          </div>
                        ) : null}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-3 justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePersonClick(person); }}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Intentionally NO Vet / Verify NIN buttons here */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' ? 'No people found' : 'No people available'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
              : 'There are currently no people in the system.'}
          </p>
          {(searchTerm || filterType !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {selectedPerson && (
        <PersonDetailsModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedPerson(null); }}
          person={selectedPerson}
        />
      )}
    </div>
  );
};

export default TableView;
