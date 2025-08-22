import React, { useState, useMemo } from 'react';
import {
  Search, Users, Eye, Filter, SortAsc, SortDesc, Grid, List,
  MapPin, Calendar, Shield, Building, UserCheck, UserPlus, TrendingUp
} from 'lucide-react';
import { Person } from '../services/apiService';
import PersonDetailsModal from './PersonDetailsModal';
import { VetButton } from './VetButton';
import { useVetting } from '@/context/VettingContext';
import { useRole } from '@/context/RoleContext';
import { verifyNIN } from '@/services/ninService';
import { toast } from '@/components/ui/sonner';

interface ApplicantsProps {
  applicants: Person[];
  referees: Person[];
  associates: Person[];
  onPersonClick: (person: Person, type: 'applicant' | 'referee' | 'associate') => void;
  onNavigateToTab?: (tab: string, person: Person) => void;
}

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'email' | 'role' | 'location' | 'timestamp' | 'referees' | 'associates';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'with_referees' | 'with_associates' | 'complete_profile';

const Applicants: React.FC<ApplicantsProps> = ({ applicants, referees, associates, onPersonClick, onNavigateToTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<Person | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Add NIN status updates
  const { setNinStatus } = useVetting();
  const { role } = useRole();

  const handleVerifyNIN = async (person: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (role === 'viewer') {
      toast('Permission denied', { description: 'You need reviewer or admin role to verify NIN.' });
      return;
    }
    const actor = localStorage.getItem('app.user') || 'reviewer@local';
    const res = await verifyNIN(String(person.id), actor, {
      vnin: (person as any).vnin,
      nin: (person as any).nin,
      firstName: (person as any).firstName,
      surname: (person as any).surname,
      otherNames: (person as any).otherNames,
      dob: (person as any).dateOfBirth,
    });
    setNinStatus(String(person.id), {
      nin_status: res.status as any,
      provider_reference: res.provider_reference,
      nin_checked_at: new Date().toISOString(),
      nin_compare_summary: res.compare_summary,
    });
    toast('NIN check complete', { description: res.compare_summary || res.status });
  };

  // Enhanced applicants with computed props
  const enhancedApplicants = useMemo(() => {
    return applicants.map(applicant => ({
      ...applicant,
      refereeCount: applicant.referees?.length || 0,
      associateCount: applicant.associates?.length || 0,
      hasCompleteProfile: !!(applicant.name && applicant.email && applicant.role && applicant.location),
      totalConnections: (applicant.referees?.length || 0) + (applicant.associates?.length || 0)
    }));
  }, [applicants]);

  // Filter + sort
  const filteredAndSortedApplicants = useMemo(() => {
    let filtered = enhancedApplicants;

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name?.toLowerCase().includes(s) ||
        a.email?.toLowerCase().includes(s) ||
        a.role?.toLowerCase().includes(s) ||
        a.location?.toLowerCase().includes(s) ||
        a.stateOfOrigin?.toLowerCase().includes(s) ||
        a.nationality?.toLowerCase().includes(s)
      );
    }

    switch (filterType) {
      case 'with_referees':
        filtered = filtered.filter(a => a.refereeCount > 0);
        break;
      case 'with_associates':
        filtered = filtered.filter(a => a.associateCount > 0);
        break;
      case 'complete_profile':
        filtered = filtered.filter(a => a.hasCompleteProfile);
        break;
    }

    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'name': aValue = a.name || ''; bValue = b.name || ''; break;
        case 'email': aValue = a.email || ''; bValue = b.email || ''; break;
        case 'role': aValue = a.role || ''; bValue = b.role || ''; break;
        case 'location': aValue = a.location || a.stateOfOrigin || ''; bValue = b.location || b.stateOfOrigin || ''; break;
        case 'timestamp': aValue = a.timestamp || ''; bValue = b.timestamp || ''; break;
        case 'referees': aValue = a.refereeCount; bValue = b.refereeCount; break;
        case 'associates': aValue = a.associateCount; bValue = b.associateCount; break;
      }

      let cmp = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') cmp = aValue.localeCompare(bValue);
      else cmp = (aValue as number) - (bValue as number);

      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [enhancedApplicants, searchTerm, filterType, sortField, sortOrder]);

  // Stats
  const statistics = useMemo(() => {
    const totalApplicants = applicants.length;
    const withReferees = applicants.filter(a => a.referees && a.referees.length > 0).length;
    const withAssociates = applicants.filter(a => a.associates && a.associates.length > 0).length;
    const completeProfiles = applicants.filter(a => a.name && a.email && a.role && a.location).length;
    const totalReferees = applicants.reduce((sum, a) => sum + (a.referees?.length || 0), 0);
    const totalAssociates = applicants.reduce((sum, a) => sum + (a.associates?.length || 0), 0);
    return {
      totalApplicants,
      withReferees,
      withAssociates,
      completeProfiles,
      totalReferees,
      totalAssociates,
      averageConnections: totalApplicants > 0 ? ((totalReferees + totalAssociates) / totalApplicants).toFixed(1) : '0'
    };
  }, [applicants]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handleApplicantClick = (applicant: Person) => {
    setSelectedApplicant(applicant);
    setIsModalOpen(true);
    onPersonClick(applicant, 'applicant');
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'N/A'; }
  };

  const getProfileCompleteness = (applicant: Person) => {
    const fields = ['name', 'email', 'role', 'location', 'phone', 'stateOfOrigin', 'nationality'];
    const completed = fields.filter(f => applicant[f as keyof Person]);
    return Math.round((completed.length / fields.length) * 100);
  };

  const getProfileCompletenessColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 bg-green-100';
    if (pct >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Applicants</h1>
              <p className="text-lg text-gray-600">Manage and review all job applicants</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-orange-600">{statistics.totalApplicants}</div>
            <div className="text-sm text-gray-500">Total Applicants</div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Referees</p>
                <p className="text-2xl font-bold text-green-600">{statistics.withReferees}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Associates</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.withAssociates}</p>
              </div>
              <UserPlus className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Complete Profiles</p>
                <p className="text-2xl font-bold text-indigo-600">{statistics.completeProfiles}</p>
              </div>
              <Shield className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Connections</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.averageConnections}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search applicants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Applicants</option>
              <option value="with_referees">With Referees</option>
              <option value="with_associates">With Associates</option>
              <option value="complete_profile">Complete Profiles</option>
            </select>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="location">Sort by Location</option>
              <option value="timestamp">Sort by Date</option>
              <option value="referees">Sort by Referees</option>
              <option value="associates">Sort by Associates</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            </button>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600 hover:text-gray-900'} transition-all`}
                title="Grid View"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600 hover:text-gray-900'} transition-all`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {(searchTerm || filterType !== 'all') && (
          <div className="mt-4 px-6">
            <p className="text-gray-600">
              Showing {filteredAndSortedApplicants.length} of {statistics.totalApplicants} applicants
              {searchTerm && ` matching "${searchTerm}"`}
              {filterType !== 'all' && ` (${filterType.replace('_', ' ')} only)`}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      {filteredAndSortedApplicants.length > 0 ? (
        viewMode === 'grid' ? (
          // GRID VIEW (now includes Vet + Verify NIN)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedApplicants.map((applicant, index) => {
              const completeness = getProfileCompleteness(applicant);
              return (
                <div
                  key={applicant.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-orange-300 transition-all duration-200 cursor-pointer group"
                  onClick={() => handleApplicantClick(applicant)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Completeness */}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getProfileCompletenessColor(completeness)}`}>
                      {completeness}% Complete
                    </span>
                    {applicant.totalConnections > 0 && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {applicant.totalConnections} connections
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                      {applicant.image ? (
                        <img
                          src={applicant.image}
                          alt={applicant.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-white font-bold text-lg ${applicant.image ? 'hidden' : ''}`}>
                        {getInitials(applicant.name)}
                      </div>
                    </div>
                  </div>

                  {/* Main text */}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                      {applicant.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {applicant.role || 'Applicant'}
                    </p>
                    {applicant.email && (
                      <p className="text-xs text-gray-500 truncate">
                        {applicant.email}
                      </p>
                    )}
                  </div>

                  {/* Quick Info */}
                  <div className="space-y-2 text-xs text-gray-500 mb-4">
                    {applicant.location && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate">{applicant.location}</span>
                      </div>
                    )}
                    {applicant.stateOfOrigin && (
                      <div className="flex items-center">
                        <Building className="w-3 h-3 mr-1" />
                        <span className="truncate">{applicant.stateOfOrigin}</span>
                      </div>
                    )}
                    {applicant.timestamp && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{formatDate(applicant.timestamp)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions: Vet + Verify NIN */}
                  <div className="mb-3">
                    <div className="flex items-center justify-center gap-3">
                      <VetButton applicantId={String(applicant.id)} applicantName={applicant.name} />
                      {role !== 'viewer' && (
                        <button
                          onClick={(e) => handleVerifyNIN(applicant, e)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          Verify NIN
                        </button>
                      )}
                    </div>
                  </div>

                  {/* View Details */}
                  <div className="pt-3 border-t border-gray-200">
                    <button className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition-all duration-200">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // LIST VIEW (already had Vet + Verify NIN)
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Applicant</span>
                        {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <button onClick={() => handleSort('role')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Role</span>
                        {sortField === 'role' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
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
                      <button onClick={() => handleSort('referees')} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                        <span>Connections</span>
                        {sortField === 'referees' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Profile
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSortedApplicants.map((applicant) => {
                    const completeness = getProfileCompleteness(applicant);
                    return (
                      <tr
                        key={applicant.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleApplicantClick(applicant)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                              {applicant.image ? (
                                <img
                                  src={applicant.image}
                                  alt={applicant.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center text-white font-semibold text-sm ${applicant.image ? 'hidden' : ''}`}>
                                {getInitials(applicant.name)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">{applicant.name}</div>
                              <div className="text-sm text-gray-500">{formatDate(applicant.timestamp || '')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{applicant.role || 'Applicant'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{applicant.email || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{applicant.phone || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{applicant.location || applicant.stateOfOrigin || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{applicant.nationality || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-4 h-4 mr-1" />
                              <span>{applicant.refereeCount}</span>
                            </div>
                            <div className="flex items-center text-orange-600">
                              <UserPlus className="w-4 h-4 mr-1" />
                              <span>{applicant.associateCount}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getProfileCompletenessColor(completeness)}`}>
                            {completeness}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApplicantClick(applicant); }}
                            className="text-orange-600 hover:text-orange-900 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <span className="mx-1">|</span>
                          <VetButton applicantId={String(applicant.id)} applicantName={applicant.name} />
                          {role !== 'viewer' && (
                            <button
                              onClick={(e) => handleVerifyNIN(applicant, e)}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 ml-2"
                            >
                              Verify NIN
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // Empty state
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' ? 'No applicants found' : 'No applicants available'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
              : 'There are currently no applicants in the system.'}
          </p>
          {(searchTerm || filterType !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {selectedApplicant && (
        <PersonDetailsModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedApplicant(null); }}
          person={selectedApplicant}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};

export default Applicants;
