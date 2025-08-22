import { useState, useMemo, useEffect } from "react";
import { Search, Building2, MapPin, Mail, Phone, User, Filter, Grid, List, SortAsc, SortDesc, ExternalLink, Image as ImageIcon, Users, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { Person } from "../services/apiService";
import PersonDetailsModal from "./PersonDetailsModal";
import SignatureModal from "./SignatureModal";

interface AssociatesProps {
  associates: Person[];
  applicants: Person[];
  onPersonClick: (person: Person, type: 'applicant' | 'referee' | 'associate') => void;
  onNavigateToTab?: (tab: string, person: Person) => void;
  selectedPersonForNavigation?: Person | null;
}

type SortField = 'name' | 'email' | 'location' | 'applicantName';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'with-applicant' | 'without-applicant';

const Associates = ({ associates, applicants, onPersonClick, onNavigateToTab, selectedPersonForNavigation }: AssociatesProps) => {
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

  // Filter and sort associates with useMemo for performance
  const filteredAndSortedAssociates = useMemo(() => {
    return associates
      .filter(associate => {
        const matchesSearch = associate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             associate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             associate.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             associate.applicantName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;
        
        switch (filterType) {
          case 'with-applicant':
            return associate.applicantName && typeof associate.applicantName === 'string' && associate.applicantName.trim() !== '';
          case 'without-applicant':
            return !associate.applicantName || typeof associate.applicantName !== 'string' || associate.applicantName.trim() === '';
          default:
            return true;
        }
      })
      .sort((a, b) => {
        let aValue = '';
        let bValue = '';
        
        switch (sortField) {
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'email':
            aValue = a.email || '';
            bValue = b.email || '';
            break;
          case 'location':
            aValue = a.location || '';
            bValue = b.location || '';
            break;
          case 'applicantName':
            aValue = a.applicantName || '';
            bValue = b.applicantName || '';
            break;
        }
        
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [associates, searchTerm, filterType, sortField, sortOrder]);

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

  const getApplicantForAssociate = (associate: Person) => {
    if (!associate.applicantName) return null;
    return applicants.find(applicant => 
      applicant.name.toLowerCase().includes(associate.applicantName!.toLowerCase()) ||
      associate.applicantName!.toLowerCase().includes(applicant.name.toLowerCase())
    );
  };

  // Statistics with useMemo for performance
  const stats = useMemo(() => ({
    total: associates.length,
    withApplicant: associates.filter(a => a.applicantName && typeof a.applicantName === 'string' && a.applicantName.trim() !== '').length,
    withoutApplicant: associates.filter(a => !a.applicantName || typeof a.applicantName !== 'string' || a.applicantName.trim() === '').length,
    filtered: filteredAndSortedAssociates.length
  }), [associates, filteredAndSortedAssociates.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Modern Header Section */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Associates</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Manage associates and their linked applications
              </p>
            </div>
          </div>
          <div className="text-right bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.total}</div>
              <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">Total Associates</div>
          </div>
        </div>
      </div>

      {/* Modern Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Associates</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Linked</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.withApplicant}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Unlinked</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.withoutApplicant}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Filtered</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.filtered}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Controls */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search associates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Filters and Controls */}
          <div className="flex items-center space-x-4">
            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white font-medium"
            >
              <option value="all">All Associates</option>
              <option value="with-applicant">With Applicant</option>
              <option value="without-applicant">Without Applicant</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
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

      {/* Modern Results */}
      {filteredAndSortedAssociates.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAssociates.map((associate, index) => {
              const linkedApplicant = getApplicantForAssociate(associate);
              return (
                <div
                  key={associate.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-orange-300 dark:hover:border-orange-600 cursor-pointer animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    setSelectedPerson(associate);
                    onPersonClick(associate, 'associate');
                  }}
                >
                  {/* Header with status indicator */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(associate.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{associate.name}</h3>
                          {associate.applicantName ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Associate</p>
                      </div>
                    </div>
                    <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {associate.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-orange-500" />
                        <span className="truncate">{associate.email}</span>
                      </div>
                    )}
                    {associate.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-green-500" />
                        <span className="truncate">{associate.phone}</span>
                      </div>
                    )}
                    {associate.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                        <span className="truncate">{associate.location}</span>
                      </div>
                    )}
                    {associate.timestamp && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>Submitted: {new Date(associate.timestamp).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Signature Button */}
                  <div className="mb-4">
                    <button
                      onClick={(e) => handleViewSignature(associate, e)}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 text-sm font-medium w-full justify-center shadow-sm"
                      title="View Signature"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Signature</span>
                    </button>
                  </div>

                  {/* Linked Applicant Status */}
                  {associate.applicantName ? (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Supporting Applicant</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {associate.applicantName}
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
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Associate</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Supporting Applicant</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedAssociates.map((associate, index) => {
                    const linkedApplicant = getApplicantForAssociate(associate);
                    return (
                      <tr
                        key={associate.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedPerson(associate);
                          onPersonClick(associate, 'associate');
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(associate.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">{associate.name}</p>
                                {associate.applicantName ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500" />
                                )}
                              </div>
                              <p className="text-sm text-orange-600 dark:text-orange-400">Associate</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {associate.email && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="w-3 h-3 mr-2 text-orange-500" />
                                <span className="truncate">{associate.email}</span>
                              </div>
                            )}
                            {associate.phone && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-3 h-3 mr-2 text-green-500" />
                                <span className="truncate">{associate.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {associate.location && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3 mr-2 text-purple-500" />
                              <span className="truncate">{associate.location}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {associate.applicantName ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {associate.applicantName}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span className="text-sm text-gray-500 dark:text-gray-400">No applicant specified</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {associate.applicantName && linkedApplicant && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              ✓ Linked
                            </span>
                          )}
                          {associate.applicantName && !linkedApplicant && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              ⚠ Not found
                            </span>
                          )}
                          {!associate.applicantName && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              No applicant
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => handleViewSignature(associate, e)}
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
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-2xl flex items-center justify-center">
            <Building2 className="w-10 h-10 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'No associates found' : 'No associates available'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            {searchTerm
              ? 'No associates match your search criteria. Try adjusting your search terms.'
              : 'There are currently no associates in the system.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium shadow-sm"
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

export default Associates;