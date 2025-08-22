import { useState, useEffect } from 'react';
import { getAllData, Person } from '../services/apiService';

export interface UseSheetDataReturn {
  applicants: Person[];
  referees: Person[];
  associates: Person[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage Google Sheets data
 */
export const useSheetData = (): UseSheetDataReturn => {
  const [applicants, setApplicants] = useState<Person[]>([]);
  const [referees, setReferees] = useState<Person[]>([]);
  const [associates, setAssociates] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAllData();
      
      setApplicants(data.applicants);
      setReferees(data.referees);
      setAssociates(data.associates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[useSheetData] Error fetching sheet data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    applicants,
    referees,
    associates,
    loading,
    error,
    refetch: fetchData,
  };
};