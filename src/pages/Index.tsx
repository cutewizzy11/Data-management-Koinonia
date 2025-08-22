import { useState } from "react";
import Header from "../components/Header";
import Dashboard from "../components/Dashboard";
import Applicants from "../components/Applicants";
import Referees from "../components/Referees";
import Associates from "../components/Associates";
import CSVApplicants from "../components/CSVApplicants";
import StatisticsPanel from "../components/StatisticsPanel";
import VettedPage from "../components/VettedPage";
import PersonDetailsModal from "../components/PersonDetailsModal";
import { useSheetData } from "../hooks/useSheetData";
import { Person } from "../services/apiService";

const Index = () => {
  const [activeSection, setActiveSection] = useState('table');
  const [selectedPersonForNavigation, setSelectedPersonForNavigation] = useState<Person | null>(null);
  const { applicants, referees, associates, loading, error, refetch } = useSheetData();
  
  // Google Sheet ID for CSV data
  const GOOGLE_SHEET_ID = '1EAzsQlu5HaCUElcXfcjYdjAOZIPnVmblD_azOfdfkho';
  
  // Handler for navigating to a specific tab with a person
  const handleNavigateToTab = (tab: string, person: Person) => {
    setActiveSection(tab);
    setSelectedPersonForNavigation(person);
    // Clear the selected person after a short delay to allow the component to mount
    setTimeout(() => setSelectedPersonForNavigation(null), 100);
  };
  
  // Debug logging (dev only)
  if (import.meta.env.DEV) {
    console.log('[Index] Current activeSection:', activeSection);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      {activeSection === 'applicants' ? (
        <Applicants 
          applicants={applicants}
          referees={referees}
          associates={associates}
          onPersonClick={(person, type) => {
            if (import.meta.env.DEV) {
              console.log('[Index] Person clicked:', person, 'Type:', type);
            }
          }}
          onNavigateToTab={handleNavigateToTab}
        />
      ) : activeSection === 'referees' ? (
        <Referees 
          referees={referees}
          applicants={applicants}
          onPersonClick={(person, type) => {
            if (import.meta.env.DEV) {
              console.log('[Index] Person clicked:', person, 'Type:', type);
            }
          }}
          onNavigateToTab={handleNavigateToTab}
          selectedPersonForNavigation={selectedPersonForNavigation}
        />
      ) : activeSection === 'associates' ? (
        <Associates 
          associates={associates}
          applicants={applicants}
          onPersonClick={(person, type) => {
            if (import.meta.env.DEV) {
              console.log('[Index] Person clicked:', person, 'Type:', type);
            }
          }}
          onNavigateToTab={handleNavigateToTab}
          selectedPersonForNavigation={selectedPersonForNavigation}
        />
      ) : activeSection === 'vetted' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Vetted Applicants</h1>
          <VettedPage 
            applicants={applicants}
            onPersonClick={(p)=> setSelectedPersonForNavigation(p)}
          />
        </div>
      ) : activeSection === 'statistics' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Statistics</h1>
            <p className="text-lg text-muted-foreground">Comprehensive insights from all applicant, referee, and associate data</p>
          </div>
          <StatisticsPanel 
            applicants={applicants}
            referees={referees}
            associates={associates}
          />
        </div>
      ) : activeSection === 'csv-data' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">CSV Data Section</h1>
          <p className="text-lg text-muted-foreground mb-8">This is the CSV Data section - Sheet ID: {GOOGLE_SHEET_ID}</p>
          <div className="bg-card border border-border rounded-lg p-6">
             <h2 className="text-xl font-semibold mb-4">CSV Component Test</h2>
             <p className="mb-4">If you can see this, the routing is working!</p>
             <CSVApplicants 
               sheetId={GOOGLE_SHEET_ID}
             />
           </div>
        </div>
      ) : (
        <Dashboard 
          activeSection={activeSection}
          applicants={applicants}
          referees={referees}
          associates={associates}
          loading={loading}
          error={error}
          onRefetch={refetch}
          onNavigateToTab={handleNavigateToTab}
        />
      )}
    
      {/* Modal for Vetted/Navigation selections */}
      {selectedPersonForNavigation && (
        <PersonDetailsModal
          isOpen={true}
          onClose={() => setSelectedPersonForNavigation(null)}
          person={selectedPersonForNavigation}
          onNavigateToTab={handleNavigateToTab}
        />
      )}
</div>
  );
};

export default Index;
