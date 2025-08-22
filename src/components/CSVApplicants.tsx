import { useState } from "react";
import { Search, Users, Eye, Mail, Phone, MapPin, Briefcase, Grid, List, RefreshCw } from "lucide-react";
import { Person } from "../services/apiService";
import DetailView from "./DetailView";

interface CSVApplicantsProps {
  sheetId: string;
}

// Development logger utility
const logger = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[CSVApplicants] ${message}`, data || '');
    }
  }
};

const CSVApplicants = ({ sheetId }: CSVApplicantsProps) => {
  logger.info('Component rendered with sheetId:', sheetId);
  
  // Simple demo data for testing
  const demoApplicants: Person[] = [
    {
      id: 'demo-1',
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '+1234567890',
      location: 'New York',
      role: 'Software Engineer',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 'demo-2',
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      phone: '+0987654321',
      location: 'California',
      role: 'Product Manager',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 'demo-3',
      name: 'Mike Johnson',
      email: 'mike.j@email.com',
      phone: '+1122334455',
      location: 'Texas',
      role: 'Designer',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    }
  ];
  
  const applicants = demoApplicants;
  const loading = false;
  const error = 'Using demo data for testing';
  const refetch = () => logger.info('Refetch clicked');
  const [selectedApplicant, setSelectedApplicant] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'location'>('name');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleApplicantClick = (applicant: Person) => {
    setSelectedApplicant(applicant);
  };

  const handleCloseDetail = () => {
    setSelectedApplicant(null);
  };

  const handleImageError = (applicantId: string) => {
    setImageErrors(prev => new Set([...prev, applicantId]));
  };

  const getFilteredAndSortedApplicants = () => {
    let filtered = applicants;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(applicant => 
        applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      return aValue.localeCompare(bValue);
    });

    return filtered;
  };

  const filteredApplicants = getFilteredAndSortedApplicants();
  const applicantsWithImages = filteredApplicants.filter(applicant => applicant.image && !imageErrors.has(applicant.id));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Loading CSV Data</h3>
            <p className="text-muted-foreground">Fetching applicant data from Google Sheets...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show warning banner if using demo data, but still render the component
  const isUsingDemoData = error && error.includes('demo data');
  const hasRealError = error && !isUsingDemoData;

  if (hasRealError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading CSV Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">To fix this issue:</p>
              <ol className="text-sm text-left text-muted-foreground max-w-md mx-auto space-y-1">
                <li>1. Open your Google Sheet</li>
                <li>2. Click "Share" button</li>
                <li>3. Change access to "Anyone with the link"</li>
                <li>4. Set permission to "Viewer"</li>
                <li>5. Click "Done" and try again</li>
              </ol>
            </div>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Demo Data Warning Banner */}
      {isUsingDemoData && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5">
              ⚠️
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Using Demo Data
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                {error}
              </p>
              <button
                onClick={refetch}
                className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
              >
                Retry with Your Sheet
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">CSV Applicants</h1>
              <p className="text-lg text-muted-foreground">Applicant data from Google Sheets with images</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{applicants.length}</div>
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-lg font-semibold text-green-600 mt-1">{applicantsWithImages.length}</div>
            <div className="text-xs text-muted-foreground">With Images</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search applicants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="location">Sort by Location</option>
            </select>

            {/* View Mode */}
            <div className="flex bg-card border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={refetch}
              className="p-2 bg-card border border-border rounded-lg hover:bg-accent hover:text-white transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Info */}
        {searchTerm ? (
          <div className="mt-4">
            <p className="text-muted-foreground">
              Showing {filteredApplicants.length} of {applicants.length} applicants matching "{searchTerm}"
            </p>
          </div>
        ) : null}
      </div>

      {/* Applicants Grid/List */}
      {filteredApplicants.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
          {filteredApplicants.map((applicant, index) => {
            const hasImage = applicant.image && !imageErrors.has(applicant.id);
            
            return (
              <div
                key={applicant.id}
                className={`bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer group ${
                  viewMode === 'list' ? 'flex items-center space-x-6' : ''
                } ${hasImage ? 'ring-2 ring-green-200 dark:ring-green-800' : ''}`}
                onClick={() => handleApplicantClick(applicant)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Avatar */}
                <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'mb-4'} relative`}>
                  {applicant.image && !imageErrors.has(applicant.id) ? (
                    <div className="relative">
                      <img
                        src={applicant.image}
                        alt={applicant.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-green-200 dark:border-green-800 shadow-lg"
                        onError={() => handleImageError(applicant.id)}
                        loading="lazy"
                      />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Eye className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center border-2 border-border">
                      <span className="text-white font-semibold text-lg">
                        {applicant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className={`${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                        {applicant.name}
                        {hasImage && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                            📷 Image
                          </span>
                        )}
                      </h3>
                      {applicant.role && (
                        <p className="text-muted-foreground flex items-center mt-1">
                          <Briefcase className="w-4 h-4 mr-1" />
                          {applicant.role}
                        </p>
                      )}
                    </div>

                    {viewMode === 'list' && (
                      <div className="flex items-center space-x-4">
                        <Eye className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className={`${viewMode === 'list' ? 'mt-2' : 'mt-3 space-y-2'}`}>
                    {applicant.email && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        {applicant.email}
                      </p>
                    )}
                    {applicant.phone && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {applicant.phone}
                      </p>
                    )}
                    {applicant.location && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {applicant.location}
                      </p>
                    )}
                  </div>

                  {/* View Button (Grid view only) */}
                  {viewMode === 'grid' && (
                    <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {hasImage ? (
                          <span className="text-green-600 font-medium">✓ Has Image</span>
                        ) : (
                          <span className="text-gray-500">No Image</span>
                        )}
                      </div>
                      <Eye className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchTerm ? 'No applicants found' : 'No applicants available'}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchTerm
              ? 'Try adjusting your search criteria.'
              : 'There are currently no applicants in the CSV data.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Detail View Modal */}
      {selectedApplicant && (
        <DetailView
          person={selectedApplicant}
          type="applicant"
          onClose={handleCloseDetail}
          onPersonClick={(person, type) => {
            if (type === 'applicant') {
              setSelectedApplicant(person);
            }
          }}
        />
      )}
    </div>
  );
};

export default CSVApplicants;