import { useState } from "react";
import { Search, Users, UserCheck, Building2, AlertCircle, Loader2, Table } from "lucide-react";
import PersonCard from "./PersonCard";
import DetailView from "./DetailView";
import TableView from "./TableView";
import { Person } from "../services/apiService";

interface DashboardProps {
  activeSection: string;
  applicants: Person[];
  referees: Person[];
  associates: Person[];
  loading: boolean;
  error: string | null;
  onRefetch: () => Promise<void>;
  onNavigateToTab?: (tab: string, person: Person) => void;
}

const Dashboard = ({ activeSection, applicants, referees, associates, loading, error, onRefetch, onNavigateToTab }: DashboardProps) => {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedType, setSelectedType] = useState<'applicant' | 'referee' | 'associate' | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handlePersonClick = (person: Person, type: 'applicant' | 'referee' | 'associate') => {
    setSelectedPerson(person);
    setSelectedType(type);
  };

  const handleCloseDetail = () => {
    setSelectedPerson(null);
    setSelectedType(null);
  };

  const getCurrentData = () => {
    switch (activeSection) {
      case 'referees': return referees;
      case 'associates': return associates;
      default: return applicants;
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchTerm) return data;
    
    return data.filter(person => 
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getSectionInfo = () => {
    switch (activeSection) {
      case 'referees':
        return {
          title: 'Referees',
          description: 'Browse all referees and see which applicants they support',
          icon: UserCheck,
          count: referees.length,
        };
      case 'associates':
        return {
          title: 'Associates',
          description: 'Explore associates and their related applications',
          icon: Building2,
          count: associates.length,
        };
      case 'table':
        return {
          title: 'Table View',
          description: 'Browse applicants in card format with quick access to associates and referees',
          icon: Table,
          count: applicants.length,
        };
      default:
        return {
          title: 'Table View',
          description: 'Browse applicants in card format with quick access to associates and referees',
          icon: Table,
          count: applicants.length,
        };
    }
  };

  const sectionInfo = getSectionInfo();
  const SectionIcon = sectionInfo.icon;
  const filteredData = getFilteredData();

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Loading Data</h3>
            <p className="text-muted-foreground">Fetching data from Google Sheets...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={onRefetch}
              className="btn-accent"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If table view is active, render TableView component
  if (activeSection === 'table') {
    return (
      <TableView
        applicants={applicants}
        referees={referees}
        associates={associates}
        onPersonClick={handlePersonClick}
        onRefetch={onRefetch}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Section Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center">
              <SectionIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {sectionInfo.title}
              </h2>
              <p className="text-lg text-muted-foreground">
                {sectionInfo.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{sectionInfo.count}</div>
            <div className="text-sm text-muted-foreground">Total {sectionInfo.title}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8 animate-slide-in">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${sectionInfo.title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Results Count */}
      {searchTerm && (
        <div className="mb-6 animate-fade-in">
          <p className="text-muted-foreground">
            Showing {filteredData.length} of {sectionInfo.count} {sectionInfo.title.toLowerCase()}
          </p>
        </div>
      )}

      {/* Grid Layout */}
      {filteredData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((person, index) => (
            <div key={person.id} style={{ animationDelay: `${index * 50}ms` }}>
              <PersonCard
                person={person}
                type={activeSection as 'applicant' | 'referee' | 'associate'}
                onClick={() => handlePersonClick(person, activeSection as 'applicant' | 'referee' | 'associate')}
                showRelations={true}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 animate-fade-in">
          <SectionIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchTerm ? 'No results found' : `No ${sectionInfo.title.toLowerCase()} available`}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchTerm 
              ? `No ${sectionInfo.title.toLowerCase()} match your search criteria. Try adjusting your search terms.`
              : `There are currently no ${sectionInfo.title.toLowerCase()} in the system.`
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="btn-accent mt-4"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Detail View Modal */}
      {selectedPerson && selectedType && (
        <DetailView
          person={selectedPerson}
          type={selectedType}
          onClose={handleCloseDetail}
          onPersonClick={handlePersonClick}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};

export default Dashboard;