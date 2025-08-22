import { useState, useMemo, useEffect } from "react";
import { Search, UserCheck, MapPin, Mail, Phone, User, Filter, Grid, List, SortAsc, SortDesc, ExternalLink, Image as ImageIcon, Users, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { Person } from "../services/apiService";
import PersonDetailsModal from "./PersonDetailsModal";
import SignatureModal from "./SignatureModal";

interface RefereesProps {
  referees: Person[];
  applicants: Person[];
  onPersonClick: (person: Person, type: 'applicant' | 'referee' | 'associate') => void;
  onNavigateToTab?: (tab: string, person: Person) => void;
  selectedPersonForNavigation?: Person | null;
}

type SortField = 'name' | 'email' | 'location' | 'applicantName';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'with-applicant' | 'without-applicant';

const Referees = ({ referees, applicants, onPersonClick, onNavigateToTab, selectedPersonForNavigation }: RefereesProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<{ url?: string; name: string } | null>(null);

  // Handle navigation from other components
  useEffect(() => {
    if (selectedPersonForNavigation) {
      setSelectedPerson(selectedPersonForNavigation);
    }
  }, [selectedPersonForNavigation]);

  // Handle signature view
  const handleViewSignature = (person: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSignature({ url: person.signature, name: person.name });
    setSignatureModalOpen(true);
  };

  // Memoized filtered and sorted referees for better performance
  const filteredAndSortedReferees = useMemo(() => {
    return referees
      .filter(referee => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || (
          referee.name.toLowerCase().includes(searchLower) ||
          referee.email?.toLowerCase().includes(searchLower) ||
          referee.location?.toLowerCase().includes(searchLower) ||
          referee.applicantName?.toLowerCase().includes(searchLower)
        );
        
        if (!matchesSearch) return false;
        
        switch (filterType) {
          case 'with-applicant':
            return referee.applicantName && typeof referee.applicantName === 'string' && referee.applicantName.trim() !== '';
          case 'without-applicant':
            return !referee.applicantName || typeof referee.applicantName !== 'string' || referee.applicantName.trim() === '';
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const getValue = (person: Person, field: SortField) => {
          switch (field) {
            case 'name': return person.name || '';
            case 'email': return person.email || '';
            case 'location': return person.location || '';
            case 'applicantName': return person.applicantName || '';
            default: return '';
          }
        };
        
        const aValue = getValue(a, sortField);
        const bValue = getValue(b, sortField);
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [referees, searchTerm, filterType, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getApplicantForReferee = (referee: Person) => {
    if (!referee.applicantName) return null;
    return applicants.find(applicant => 
      applicant.name.toLowerCase().includes(referee.applicantName!.toLowerCase()) ||
      referee.applicantName!.toLowerCase().includes(applicant.name.toLowerCase())
    );
  };

  // Memoized statistics for better performance
  const stats = useMemo(() => ({
    total: referees.length,
    withApplicant: referees.filter(r => r.applicantName && typeof r.applicantName === 'string' && r.applicantName.trim() !== '').length,
    withoutApplicant: referees.filter(r => !r.applicantName || typeof r.applicantName !== 'string' || r.applicantName.trim() === '').length,
    filtered: filteredAndSortedReferees.length
  }), [referees, filteredAndSortedReferees.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Modern Header Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Referees</h1>
              <p className="text-muted-foreground">
                Manage and review all referee submissions
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.withApplicant}</div>
              <div className="text-sm text-muted-foreground">Linked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.withoutApplicant}</div>
              <div className="text-sm text-muted-foreground">Unlinked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Referees</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Linked to Applicants</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.withApplicant}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unlinked</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.withoutApplicant}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Showing Results</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.filtered}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Controls */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search referees by name, email, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Filters and Controls */}
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
              >
                <option value="all">All Referees</option>
                <option value="with-applicant">Linked to Applicants</option>
                <option value="without-applicant">Unlinked</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Sort Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">Sort by:</span>
        {[
          { field: 'name' as SortField, label: 'Name' },
          { field: 'email' as SortField, label: 'Email' },
          { field: 'location' as SortField, label: 'Location' },
          { field: 'applicantName' as SortField, label: 'Applicant' },
        ].map(({ field, label }) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all font-medium text-sm ${
              sortField === field
                ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span>{label}</span>
            {sortField === field && (
              sortOrder === 'asc' ? 
                <SortAsc className="w-4 h-4" /> : 
                <SortDesc className="w-4 h-4" />
            )}
          </button>
        ))}
      </div>

      {/* Results */}
      {filteredAndSortedReferees.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedReferees.map((referee, index) => {
              const linkedApplicant = getApplicantForReferee(referee);
              return (
                <div
                  key={referee.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-orange-300 dark:hover:border-orange-600 cursor-pointer animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    setSelectedPerson(referee);
                    onPersonClick(referee, 'referee');
                  }}
                >
                  {/* Header with status indicator */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(referee.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{referee.name}</h3>
                          {referee.applicantName ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Referee</p>
                      </div>
                    </div>
                    <UserCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {referee.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-orange-500" />
                        <span className="truncate">{referee.email}</span>
                      </div>
                    )}
                    {referee.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-green-500" />
                        <span className="truncate">{referee.phone}</span>
                      </div>
                    )}
                    {referee.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                        <span className="truncate">{referee.location}</span>
                      </div>
                    )}
                    {referee.timestamp && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">Submitted: {new Date(referee.timestamp).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Signature Button */}
                  <div className="mb-4">
                    <button
                      onClick={(e) => handleViewSignature(referee, e)}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 text-sm font-medium w-full justify-center shadow-sm"
                      title="View Signature"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Signature</span>
                    </button>
                  </div>

                  {/* Linked Applicant Status */}
                  {referee.applicantName ? (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Supporting Applicant</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {referee.applicantName}
                          </p>
                          {linkedApplicant ? (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Linked</p>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Not found</p>
                          )}
                        </div>
                        {linkedApplicant && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPersonClick(linkedApplicant, 'applicant');
                            }}
                            className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-all"
                            title="View Applicant"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm font-medium">
                          Not linked to any applicant
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Referee</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Supporting Applicant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedReferees.map((referee, index) => {
                    const linkedApplicant = getApplicantForReferee(referee);
                    return (
                      <tr
                        key={referee.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedPerson(referee);
                          onPersonClick(referee, 'referee');
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(referee.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">{referee.name}</p>
                                {referee.applicantName ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500" />
                                )}
                              </div>
                              <p className="text-sm text-orange-600 dark:text-orange-400">Referee</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {referee.email && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="w-3 h-3 mr-1 text-orange-500" />
                                <span className="truncate">{referee.email}</span>
                              </div>
                            )}
                            {referee.phone && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-3 h-3 mr-1 text-green-500" />
                                <span className="truncate">{referee.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {referee.location && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3 mr-1 text-purple-500" />
                              <span className="truncate">{referee.location}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {referee.applicantName ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {referee.applicantName}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No applicant specified</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {referee.applicantName && linkedApplicant && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              ✓ Linked
                            </span>
                          )}
                          {referee.applicantName && !linkedApplicant && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                              ⚠ Not found
                            </span>
                          )}
                          {!referee.applicantName && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              No applicant
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => handleViewSignature(referee, e)}
                              className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-all"
                              title="View Signature"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {linkedApplicant && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPersonClick(linkedApplicant, 'applicant');
                                }}
                                className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-all"
                                title="View Applicant"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCheck className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'No referees found' : 'No referees available'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            {searchTerm
              ? 'No referees match your search criteria. Try adjusting your search terms.'
              : 'There are currently no referees in the system.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPerson && (
        <PersonDetailsModal
          person={selectedPerson}
          isOpen={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* Signature Modal */}
      {selectedSignature && (
        <SignatureModal
          isOpen={signatureModalOpen}
          onClose={() => {
            setSignatureModalOpen(false);
            setSelectedSignature(null);
          }}
          signatureUrl={selectedSignature.url}
          personName={selectedSignature.name}
        />
      )}
    </div>
  );
};

export default Referees;