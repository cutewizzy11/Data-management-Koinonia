// React hook for handling Google Cloud Storage backup operations
import { useState, useCallback } from 'react';
import { backupGoogleDriveToGCS, batchBackupGoogleDriveImages, GCSBackupResult } from '../services/gcsBackupService';
import { Person } from '../services/apiService';

interface UseGCSBackupReturn {
  isBackingUp: boolean;
  backupSingle: (url: string, metadata: any) => Promise<GCSBackupResult>;
  backupPersonImages: (person: Person) => Promise<GCSBackupResult[]>;
  backupAllApplicantImages: (applicants: Person[]) => Promise<GCSBackupResult[]>;
}

export const useGCSBackup = (): UseGCSBackupReturn => {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const backupSingle = useCallback(async (url: string, metadata: any): Promise<GCSBackupResult> => {
    setIsBackingUp(true);
    try {
      const result = await backupGoogleDriveToGCS(url, metadata);
      return result;
    } finally {
      setIsBackingUp(false);
    }
  }, []);

  const backupPersonImages = useCallback(async (person: Person): Promise<GCSBackupResult[]> => {
    setIsBackingUp(true);
    try {
      const urlsToBackup: Array<{ url: string; metadata: any }> = [];

      // Add person's image if it's a Google Drive URL
      if (person.image && person.image.includes('drive.google.com')) {
        urlsToBackup.push({
          url: person.image,
          metadata: {
            personId: person.id,
            personName: person.name,
            type: person.role === 'Applicant' ? 'applicant' : 
                  person.role === 'Referee' ? 'referee' : 'associate',
            fieldType: 'image'
          }
        });
      }

      // Add person's signature if it's a Google Drive URL
      if (person.signature && person.signature.includes('drive.google.com')) {
        urlsToBackup.push({
          url: person.signature,
          metadata: {
            personId: person.id,
            personName: person.name,
            type: person.role === 'Applicant' ? 'applicant' : 
                  person.role === 'Referee' ? 'referee' : 'associate',
            fieldType: 'signature'
          }
        });
      }

      if (urlsToBackup.length === 0) {
        return [];
      }

      const results = await batchBackupGoogleDriveImages(urlsToBackup);
      return results;
    } finally {
      setIsBackingUp(false);
    }
  }, []);

  const backupAllApplicantImages = useCallback(async (applicants: Person[]): Promise<GCSBackupResult[]> => {
    setIsBackingUp(true);
    try {
      const allResults: GCSBackupResult[] = [];
      
      // Process applicants in smaller batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < applicants.length; i += batchSize) {
        const batch = applicants.slice(i, i + batchSize);
        const batchPromises = batch.map(person => backupPersonImages(person));
        const batchResults = await Promise.all(batchPromises);
        
        // Flatten results
        batchResults.forEach(results => allResults.push(...results));
        
        // Small delay between batches
        if (i + batchSize < applicants.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return allResults;
    } finally {
      setIsBackingUp(false);
    }
  }, [backupPersonImages]);

  return {
    isBackingUp,
    backupSingle,
    backupPersonImages,
    backupAllApplicantImages
  };
};