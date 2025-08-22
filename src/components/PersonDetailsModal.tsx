import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, User, Mail, Phone, MapPin, Calendar, Shield, Heart, Home, 
  Building, Clock, FileText, Users, UserCheck, Globe, Hash, 
  ExternalLink, CheckCircle, AlertCircle, Eye 
} from 'lucide-react';
import { Person, findRefereeByEmail, findAssociateByEmail, getAllData } from '../services/apiService';
import { NinBadge, VetBadge } from './common/StatusBadges';
import { VetButton } from './VetButton';
import { useVetting } from '@/context/VettingContext';
import { useRole } from '@/context/RoleContext';
import { verifyNIN } from '@/services/ninService';
import { toast } from '@/components/ui/sonner';

interface PersonDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  onNavigateToTab?: (tab: string, person: Person) => void;
}

interface InfoRowProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string | undefined;
}

interface SectionTitleProps {
  title: string;
  icon: React.ComponentType<any>;
}

const PersonDetailsModal: React.FC<PersonDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  person,
  onNavigateToTab 
}) => {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedReferees, setSubmittedReferees] = useState<Person[]>([]);
  const [submittedAssociates, setSubmittedAssociates] = useState<Person[]>([]);
  const [fetchingSubmissions, setFetchingSubmissions] = useState(false);

  if (!isOpen) return null;

  const displayPerson = useMemo(() => selectedPerson || person, [selectedPerson, person]);

  // ---- UPDATED: match submitted forms by applicant name only (normalized) ----
  useEffect(() => {
    const fetchSubmittedForms = async () => {
      if (person.role !== 'Applicant') return;
      setFetchingSubmissions(true);
      try {
        const allData = await getAllData();
        const me = (s: string) => String(s || '').trim().toLowerCase();
        const appName = me(person.name);

        const applicantReferees = allData.referees.filter(r => me(r.applicantName) === appName);
        const applicantAssociates = allData.associates.filter(a => me(a.applicantName) === appName);

        setSubmittedReferees(applicantReferees);
        setSubmittedAssociates(applicantAssociates);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[PersonDetailsModal] Error fetching submitted forms:', error);
        }
      } finally {
        setFetchingSubmissions(false);
      }
    };

    fetchSubmittedForms();
  }, [person]);

  useEffect(() => {
    if (isOpen) {
      const modalContent = document.querySelector('[data-modal-content]');
      if (modalContent) modalContent.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isOpen, selectedPerson]);

  const handleBackToOriginal = () => setSelectedPerson(null);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleViewRefereeDetails = async (email: string): Promise<void> => {
    if (!email) return;
    setIsLoading(true);
    try {
      const referee = await findRefereeByEmail(email);
      if (referee) {
        if (onNavigateToTab) {
          onClose();
          onNavigateToTab('referees', referee);
        } else {
          setSelectedPerson(referee);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('[PersonDetailsModal] Error fetching referee details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAssociateDetails = async (email: string): Promise<void> => {
    if (!email) return;
    setIsLoading(true);
    try {
      const associate = await findAssociateByEmail(email);
      if (associate) {
        if (onNavigateToTab) {
          onClose();
          onNavigateToTab('associates', associate);
        } else {
          setSelectedPerson(associate);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('[PersonDetailsModal] Error fetching associate details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const InfoRow: React.FC<InfoRowProps> = ({ icon: Icon, label, value }) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) return null;
    const displayValue = typeof value === 'string' ? value : String(value);
    return (
      <div className="flex items-start space-x-3 py-3 px-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
        <Icon className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-semibold text-gray-700">{label}:</span>
          <span className="ml-2 text-sm text-gray-900">{displayValue}</span>
        </div>
      </div>
    );
  };

  const SectionTitle: React.FC<SectionTitleProps> = ({ title, icon: Icon }) => (
    <div className="flex items-center space-x-2 mb-4 mt-6 first:mt-0">
      <Icon className="w-6 h-6 text-orange-600" />
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    </div>
  );

  const ReferenceCard: React.FC<{
    title: string;
    name?: string;
    email?: string;
    colorScheme: 'blue' | 'green';
  }> = ({ title, name, email, colorScheme }) => {
    if (!name) return null;
    const colors = {
      blue:  { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800' },
      green: { bg: 'bg-green-50',  border: 'border-green-200',  title: 'text-green-800'  },
    };
    const scheme = colors[colorScheme];
    return (
      <div className={`${scheme.bg} p-4 rounded-lg border ${scheme.border} mt-2 first:mt-0`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-semibold ${scheme.title}`}>{title}</h4>
        </div>
        <InfoRow icon={User} label="Name" value={name} />
        <InfoRow icon={Mail} label="Email" value={email} />
      </div>
    );
  };

  const Avatar: React.FC<{ person: Person }> = ({ person }) => {
    const getImageUrl = (url?: string) => {
      if (!url) return url;
      if (url.startsWith('/images/')) return url;
      return url;
    };
    return (
      <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
        {person.image ? (
          <img 
            src={getImageUrl(person.image)} 
            alt={person.name}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center text-white font-bold text-xl ${person.image ? 'hidden' : ''}`}>
          {person.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center p-4 pt-8 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {selectedPerson && (
                <button
                  onClick={handleBackToOriginal}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  title="Back to original person"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <Avatar person={displayPerson} />
              <div>
                <h2 className="text-2xl font-bold">{displayPerson.name}</h2>
                <p className="text-orange-100">{displayPerson.role || 'Person Details'}</p>
                {selectedPerson && (
                  <p className="text-orange-200 text-sm">Viewing {selectedPerson.role} details</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {displayPerson.image && (
                <button
                  onClick={() => window.open(displayPerson.image, '_blank')}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors flex items-center space-x-1"
                  title="View Original Picture"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">View Picture</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-gray-50" data-modal-content>
          <div className="space-y-1">
            {/* Personal Information */}
            <SectionTitle title="Personal Information" icon={User} />
            <InfoRow icon={User} label="Full Name" value={displayPerson.name} />
            {displayPerson.role === 'Applicant' && (
              <>
                <InfoRow icon={User} label="First Name" value={displayPerson.firstName} />
                <InfoRow icon={User} label="Surname" value={displayPerson.surname} />
                <InfoRow icon={User} label="Other Names" value={displayPerson.otherNames} />
                <InfoRow icon={User} label="Surname at Birth" value={displayPerson.surnameAtBirth} />
                <InfoRow icon={User} label="Nick Name/Alias" value={displayPerson.nickNameOrAlias} />
                <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(displayPerson.dateOfBirth || '')} />
                <InfoRow icon={Home} label="Place of Birth" value={displayPerson.placeOfBirth} />
                <InfoRow icon={Heart} label="Marital Status" value={displayPerson.maritalStatus} />
                <InfoRow icon={Hash} label="National ID (NIN)" value={displayPerson.nationalIdentificationNumber} />
                <InfoRow icon={Globe} label="Nationality" value={displayPerson.nationality} />
              </>
            )}

            {/* Contact Information */}
            <SectionTitle title="Contact Information" icon={Mail} />
            <InfoRow icon={Mail} label="Email" value={displayPerson.email} />
            <InfoRow icon={Phone} label="Phone Numbers" value={displayPerson.phoneNumbers || displayPerson.phone} />
            <InfoRow icon={MapPin} label="Residential Address" value={displayPerson.residentialAddress || displayPerson.location} />
            <InfoRow icon={Globe} label="Social Media" value={displayPerson.socialMediaHandles} />

            {/* Location Information */}
            {displayPerson.role === 'Applicant' && (
              <>
                <SectionTitle title="Location Details" icon={MapPin} />
                <InfoRow icon={MapPin} label="State of Origin" value={displayPerson.stateOfOrigin} />
                <InfoRow icon={MapPin} label="Local Government Area" value={displayPerson.localGovernmentArea} />
              </>
            )}

            {/* Religious/Organization Information */}
            {displayPerson.role === 'Applicant' && (
              <>
                <SectionTitle title="Religious & Organization" icon={Building} />
                <InfoRow icon={Building} label="Local Assembly" value={displayPerson.localAssembly} />
                <InfoRow icon={Clock} label="Following Koinonia Duration" value={displayPerson.koinoniaFollowingDuration} />
              </>
            )}

            {/* Family Information */}
            {displayPerson.role === 'Applicant' && (
              <>
                <SectionTitle title="Family Information" icon={Users} />
                <InfoRow icon={Users} label="Next of Kin" value={displayPerson.nextOfKin} />
              </>
            )}

            {/* Background Check */}
            {displayPerson.role === 'Applicant' && (
              <>
                <SectionTitle title="Background Information" icon={Shield} />
                <InfoRow icon={Shield} label="Criminal Record" value={displayPerson.criminalRecord} />
              </>
            )}

            {/* Employment (NEW fields) */}
            {displayPerson.role === 'Applicant' && (
              <>
                <SectionTitle title="Employment" icon={Building} />
                <InfoRow icon={Building} label="Occupation" value={displayPerson.occupation} />
                <InfoRow icon={Building} label="Former Employer" value={displayPerson.formerEmployer} />
                <InfoRow icon={Building} label="Current Employer" value={displayPerson.currentEmployer} />
                <InfoRow icon={FileText} label="Reason Left Former Employer" value={displayPerson.reasonLeftFormerEmployer} />
              </>
            )}
            
            {(displayPerson.role === 'Referee' || displayPerson.role === 'Associate') && displayPerson.applicantName && (
              <>
                <SectionTitle title="Applicant Connection" icon={UserCheck} />
                <InfoRow icon={User} label="Attesting For" value={displayPerson.applicantName} />
              </>
            )}

            {(displayPerson.role === 'Referee' || displayPerson.role === 'Associate') && displayPerson.signature && (
              <>
                <SectionTitle title="Signature" icon={FileText} />
                <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                  <img 
                    src={displayPerson.signature.startsWith('/images/') ? displayPerson.signature : displayPerson.signature} 
                    alt="Signature" 
                    className="max-w-xs h-auto border border-gray-300 rounded"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </>
            )}

            {(displayPerson.role === 'Referee' || displayPerson.role === 'Associate') && displayPerson.timestamp && (
              <>
                <SectionTitle title="Submission Information" icon={Clock} />
                <InfoRow icon={Calendar} label="Submitted Date" value={new Date(displayPerson.timestamp).toLocaleDateString()} />
                <InfoRow icon={Clock} label="Submitted Time" value={new Date(displayPerson.timestamp).toLocaleTimeString()} />
              </>
            )}

            {!selectedPerson && (
              <>
                {person.role === 'Applicant' && (person.referee1Name || person.referee2Name) && (
                  <>
                    <SectionTitle title="References" icon={UserCheck} />
                    <ReferenceCard title="Referee 1" name={person.referee1Name} email={person.referee1Email} colorScheme="blue" />
                    <ReferenceCard title="Referee 2" name={person.referee2Name} email={person.referee2Email} colorScheme="blue" />
                  </>
                )}

                {person.role === 'Applicant' && (person.associate1Name || person.associate2Name) && (
                  <>
                    <SectionTitle title="Associates" icon={Users} />
                    <ReferenceCard title="Associate 1" name={person.associate1Name} email={person.associate1Email} colorScheme="green" />
                    <ReferenceCard title="Associate 2" name={person.associate2Name} email={person.associate2Email} colorScheme="green" />
                  </>
                )}

                {person.role === 'Applicant' && (
                  <>
                    <SectionTitle title="Submitted Forms Status" icon={CheckCircle} />
                    {fetchingSubmissions ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                        <span className="ml-2 text-gray-600">Loading submission status...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Referees Who Have Submitted</h4>
                          {submittedReferees.length > 0 ? (
                            <div className="space-y-2">
                              {submittedReferees.map((referee, index) => (
                                <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                      <div>
                                        <p className="font-medium text-green-800">{referee.name}</p>
                                        <p className="text-sm text-green-600">{referee.email}</p>
                                        {referee.timestamp && (
                                          <p className="text-xs text-green-500">Submitted: {formatDate(referee.timestamp)}</p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setSelectedPerson(referee)}
                                      className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors duration-200 text-sm"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span>View Details</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <p className="text-yellow-800">No referee forms submitted yet</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Associates Who Have Submitted</h4>
                          {submittedAssociates.length > 0 ? (
                            <div className="space-y-2">
                              {submittedAssociates.map((associate, index) => (
                                <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                      <div>
                                        <p className="font-medium text-green-800">{associate.name}</p>
                                        <p className="text-sm text-green-600">{associate.email}</p>
                                        {associate.timestamp && (
                                          <p className="text-xs text-green-500">Submitted: {formatDate(associate.timestamp)}</p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setSelectedPerson(associate)}
                                      className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors duration-200 text-sm"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span>View Details</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <p className="text-yellow-800">No associate forms submitted yet</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {person.role === 'Applicant' && person.timestamp && (
                  <>
                    <SectionTitle title="Submission Information" icon={FileText} />
                    <InfoRow icon={Calendar} label="Submission Date" value={formatDate(person.timestamp || '')} />
                    <InfoRow icon={Clock} label="Submitted Time" value={new Date(person.timestamp || '').toLocaleTimeString()} />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonDetailsModal;
