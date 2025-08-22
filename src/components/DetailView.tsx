import { X, Users, UserCheck, Building2, ArrowLeft, Loader2, RefreshCw, Mail, Phone, MapPin } from "lucide-react";
import PersonCard from "./PersonCard";
import { Person, fetchApplicantDetails } from "../services/apiService";
import { useState, useEffect } from "react";
import { useBestImageUrl } from '../hooks/useBestImageUrl';

interface DetailViewProps {
  person: Person;
  type: 'applicant' | 'referee' | 'associate';
  onClose: () => void;
  onPersonClick: (person: Person, type: 'applicant' | 'referee' | 'associate') => void;
  onNavigateToTab?: (tab: string, person: Person) => void;
}

const DetailView = ({ person, type, onClose, onPersonClick, onNavigateToTab }: DetailViewProps) => {
  const [realTimeData, setRealTimeData] = useState<{ referees: Person[], associates: Person[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Resolve best image URL with GCS prioritization
  const { resolvedUrl: imageUrl, isResolving } = useBestImageUrl(person.image);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchRealTimeData = async () => {
    if (type !== 'applicant') return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchApplicantDetails(person.name);
      setRealTimeData(data);
    } catch (err) {
      setError('Failed to fetch real-time data');
      if (import.meta.env.DEV) {
        console.error('[DetailView] Error fetching real-time data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (type === 'applicant') {
      fetchRealTimeData();
    }
  }, [person.name, type]);

  // Use real-time data if available, otherwise fall back to existing data
  const displayData = realTimeData || {
    referees: person.referees || [],
    associates: person.associates || []
  };

  const getAvatarBg = () => {
    switch (type) {
      case 'applicant': return 'bg-gradient-accent';
      case 'referee': return 'bg-gradient-success';
      case 'associate': return 'bg-primary';
      default: return 'bg-gradient-accent';
    }
  };

  const getRoleLabel = () => {
    switch (type) {
      case 'applicant': return person.role || 'Applicant';
      case 'referee': return 'Referee';
      case 'associate': return 'Associate';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-card rounded-xl shadow-strong max-w-6xl w-full max-h-[95vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-subtle border-b border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="nav-item flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              {type === 'applicant' && (
                <button
                  onClick={fetchRealTimeData}
                  disabled={loading}
                  className="p-2 hover:bg-secondary/50 rounded-md transition-colors disabled:opacity-50"
                  title="Refresh real-time data"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary/50 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Main Person Profile */}
          <div className="flex items-start space-x-6">
            {/* Large Avatar with Image */}
            <div className={`w-32 h-32 rounded-2xl ${getAvatarBg()} overflow-hidden flex-shrink-0 shadow-lg`}>
              {imageUrl && !isResolving ? (
                <img 
                  src={imageUrl} 
                  alt={person.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-full h-full flex items-center justify-center text-white font-bold text-2xl ${imageUrl && !isResolving ? 'hidden' : ''}`}
              >
                {getInitials(person.name)}
              </div>
            </div>
            
            {/* Person Details */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {person.name}
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                {getRoleLabel()}
              </p>
              
              {/* Contact Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {person.email && (
                  <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-lg">
                    <Mail className="w-5 h-5 text-accent flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium text-foreground">{person.email}</p>
                    </div>
                  </div>
                )}
                {person.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-lg">
                    <Phone className="w-5 h-5 text-accent flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                      <p className="text-sm font-medium text-foreground">{person.phone}</p>
                    </div>
                  </div>
                )}
                {person.location && (
                  <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-lg">
                    <MapPin className="w-5 h-5 text-accent flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
                      <p className="text-sm font-medium text-foreground">{person.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <X className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
                <button
                  onClick={fetchRealTimeData}
                  className="ml-auto text-red-600 hover:text-red-800 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* For Applicants - show their Referees and Associates */}
          {type === 'applicant' && (
            <div className="space-y-8">
              {loading && !realTimeData && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
                    <p className="text-lg text-muted-foreground">Fetching real-time data...</p>
                  </div>
                </div>
              )}
              
              {/* Associates Section */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <Building2 className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">
                    Associates ({displayData.associates?.length || 0})
                  </h3>
                  {realTimeData && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                      Live Data
                    </span>
                  )}
                </div>
                
                {displayData.associates && displayData.associates.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {displayData.associates.map((associate, index) => (
                      <PersonCard
                        key={associate.id || index}
                        person={associate}
                        type="associate"
                        onClick={() => {
                          if (onNavigateToTab) {
                            onNavigateToTab('associates', associate);
                          } else {
                            onPersonClick(associate, 'associate');
                          }
                        }}
                        showRelations={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-secondary/20 rounded-lg">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {loading ? 'Loading associates...' : 'No associates found'}
                    </p>
                  </div>
                )}
              </div>

              {/* Referees Section */}
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <UserCheck className="w-6 h-6 text-success" />
                  <h3 className="text-2xl font-bold text-foreground">
                    Referees ({displayData.referees?.length || 0})
                  </h3>
                  {realTimeData && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                      Live Data
                    </span>
                  )}
                </div>
                
                {displayData.referees && displayData.referees.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {displayData.referees.map((referee, index) => (
                      <PersonCard
                        key={referee.id || index}
                        person={referee}
                        type="referee"
                        onClick={() => {
                          if (onNavigateToTab) {
                            onNavigateToTab('referees', referee);
                          } else {
                            onPersonClick(referee, 'referee');
                          }
                        }}
                        showRelations={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-secondary/20 rounded-lg">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {loading ? 'Loading referees...' : 'No referees found'}
                    </p>
                  </div>
                )}
              </div>

              {/* Empty State */}
              {!loading && (!displayData.referees || displayData.referees.length === 0) && 
               (!displayData.associates || displayData.associates.length === 0) && (
                <div className="text-center py-12 bg-secondary/10 rounded-xl">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">No Connections Found</h4>
                  <p className="text-muted-foreground">This applicant has no referees or associates.</p>
                  {realTimeData && (
                    <p className="text-sm text-muted-foreground mt-2">Data fetched in real-time from Google Sheets</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* For Referees and Associates - show their related Applicant */}
          {(type === 'referee' || type === 'associate') && person.applicant && (
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-6 h-6 text-accent" />
                <h3 className="text-2xl font-bold text-foreground">
                  Related Applicant
                </h3>
              </div>
              <div className="max-w-2xl">
                <PersonCard
                  person={person.applicant}
                  type="applicant"
                  onClick={() => onPersonClick(person.applicant!, 'applicant')}
                  showRelations={true}
                />
              </div>
            </div>
          )}
        </div>
      
        {/* Applicant Extra Fields */}
        {type === 'applicant' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Occupation</div>
              <div className="font-medium">{(person as any).occupation || '—'}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Current Employer</div>
              <div className="font-medium">{(person as any).currentEmployer || '—'}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Former Employer</div>
              <div className="font-medium">{(person as any).formerEmployer || '—'}</div>
            </div>
            <div className="p-4 rounded-lg border md:col-span-2">
              <div className="text-sm text-gray-500">Reason for leaving former employer</div>
              <div className="font-medium">{(person as any).reasonForLeavingFormerEmployer || '—'}</div>
            </div>
          </div>
        )}
        {/* Associate Date */}
        {type === 'associate' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Date</div>
              <div className="font-medium">{(person as any).associateDate || (person as any).date || '—'}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DetailView;