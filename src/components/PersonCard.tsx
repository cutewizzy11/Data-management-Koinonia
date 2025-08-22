import React, { useState } from 'react';
import { ChevronRight, Mail, Phone, MapPin, Eye, FileText, Users } from "lucide-react";
import { Person } from "../services/apiService";
import SignatureModal from './SignatureModal';
import PersonDetailsModal from './PersonDetailsModal';
import { useBestImageUrl } from '../hooks/useBestImageUrl';

interface PersonCardProps {
  person: Person;
  type: 'applicant' | 'referee' | 'associate';
  onClick: () => void;
  showRelations?: boolean;
}

const PersonCard = ({ person, type, onClick, showRelations = false }: PersonCardProps) => {
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Resolve best image URL with GCS prioritization
  const { resolvedUrl: imageUrl, isResolving } = useBestImageUrl(person.image);

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get background color based on type
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
    <div 
      className="card-interactive group animate-fade-in"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className={`avatar-circle ${getAvatarBg()} overflow-hidden`}>
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
              className={`w-full h-full flex items-center justify-center text-white font-semibold ${(imageUrl && !isResolving) ? 'hidden' : ''}`}
            >
              {getInitials(person.name)}
            </div>
          </div>
          
          {/* Person Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {person.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {getRoleLabel()}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-1">
              {person.email && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{person.email}</span>
                </div>
              )}
              {person.phone && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{person.phone}</span>
                </div>
              )}
              {person.location && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{person.location}</span>
                </div>
              )}
            </div>

            {/* Relations Summary */}
            {showRelations && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  {person.referees && person.referees.length > 0 && (
                    <span>{person.referees.length} Referee{person.referees.length !== 1 ? 's' : ''}</span>
                  )}
                  {person.associates && person.associates.length > 0 && (
                    <span>{person.associates.length} Associate{person.associates.length !== 1 ? 's' : ''}</span>
                  )}
                  {person.applicant && (
                    <span>Related to: {person.applicant.name}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* View Signature Button - Only for referees and associates */}
          {(type === 'referee' || type === 'associate') && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                setIsSignatureModalOpen(true);
              }}
              className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition-all duration-200 group/btn"
              title="View Signature"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          
          {/* View Full Details Button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              setIsDetailsModalOpen(true);
            }}
            className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition-all duration-200 group/btn"
            title="View Full Details"
          >
            <Users className="w-4 h-4" />
          </button>
          
          {/* View Details Button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              onClick();
            }}
            className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent-foreground transition-all duration-200 group/btn"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {/* Arrow Indicator */}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
        </div>
      </div>
      
      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        personName={person.name}
        signatureUrl={person.signature}
      />
      
      {/* Person Details Modal */}
      <PersonDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        person={person}
      />
    </div>
  );
};

export default PersonCard;