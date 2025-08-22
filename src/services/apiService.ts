// API service for fetching data from Google Apps Script
export interface ApiResponse {
  applicants: any[];
  referees: any[];
  associates: any[];
}

export interface Person {
  // === New applicant fields ===
  occupation?: string;
  formerEmployer?: string;
  currentEmployer?: string;
  reasonForLeavingFormerEmployer?: string;
  // Associate-specific
  associateDate?: string;

  // === Vetting & NIN fields (extended) ===
  vetting_status?: 'PENDING' | 'VETTED' | 'REJECTED';
  vetted_by?: string;
  vetted_at?: string;
  nin_status?: 'PENDING' | 'MATCH' | 'MISMATCH' | 'ERROR';
  nin_checked_at?: string;
  provider_reference?: string;
  nin_compare_summary?: string;

  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  image?: string; // URL to applicant's photo
  signature?: string; // URL to signature image
  applicantName?: string; // For linking referees and associates to applicants
  referees?: Person[];
  associates?: Person[];
  applicant?: Person;
  
  // Extended fields from Google Sheets
  timestamp?: string;
  surname?: string;
  surnameAtBirth?: string;
  firstName?: string;
  otherNames?: string;
  stateOfOrigin?: string;
  localGovernmentArea?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  maritalStatus?: string;
  nationalIdentificationNumber?: string;
  nationality?: string;
  residentialAddress?: string;
  phoneNumbers?: string;
  socialMediaHandles?: string;
  nickNameOrAlias?: string;
  nextOfKin?: string;
  localAssembly?: string;
  koinoniaFollowingDuration?: string;
  criminalRecord?: string;
  referee1Name?: string;
  referee1Email?: string;
  referee2Name?: string;
  referee2Email?: string;
  associate1Name?: string;
  associate1Email?: string;
  associate2Name?: string;
  associate2Email?: string;
}

// Google Apps Script API endpoint
const GOOGLE_APPS_SCRIPT_URL = import.meta.env.DEV
  ? '/gs-api/macros/s/AKfycbw9Nqqbd0uxeXhNV3Bt4EZppM6ib7DD1knuvPjZIQZBxsEpBQ0jQCRXZU1iAOFbbPjEsg/exec'
  : 'https://script.google.com/macros/s/AKfycbw9Nqqbd0uxeXhNV3Bt4EZppM6ib7DD1knuvPjZIQZBxsEpBQ0jQCRXZU1iAOFbbPjEsg/exec';

// Development mode flag - set to true to use mock data, false to try real API
const USE_MOCK_DATA = false;

// Logging utility for development
const logger = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[API] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.warn(`[API] ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    if (import.meta.env.DEV) {
      console.error(`[API] ${message}`, error || '');
    }
  }
};

/**
 * Convert Google Drive URL to local image path
 * @param googleDriveUrl - The Google Drive sharing URL
 * @returns Local image path or original URL if not a Google Drive URL
 */
const convertGoogleDriveUrlToLocal = (googleDriveUrl: string): string => {
  console.log('[DEBUG] Converting image URL:', googleDriveUrl);
  
  if (!googleDriveUrl || !googleDriveUrl.includes('drive.google.com')) {
    console.log('[DEBUG] Not a Google Drive URL, returning as-is:', googleDriveUrl);
    return googleDriveUrl;
  }
  
  // Extract file ID from Google Drive URL (handles both /d/ and open?id= formats)
  let fileIdMatch = googleDriveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!fileIdMatch) {
    // Try the open?id= format
    fileIdMatch = googleDriveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  }
  
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    const localImagePath = `/images/drive_${fileId}.jpg`;
    console.log('[DEBUG] Converted to local path:', localImagePath);
    logger.info(`Converting Google Drive URL to local path: ${localImagePath}`);
    return localImagePath;
  }
  
  console.log('[DEBUG] Could not extract file ID, returning original URL:', googleDriveUrl);
  return googleDriveUrl;
};

/**
 * Convert Google Drive URL to the best available image URL (GCS, local, or fallback)
 * This function triggers GCS backup if needed and returns the best URL
 */
export const convertGoogleDriveUrlToBestUrl = async (
  googleDriveUrl: string, 
  metadata?: {
    personId?: string;
    personName?: string;
    type?: 'applicant' | 'referee' | 'associate';
  }
): Promise<string> => {
  console.log('[DEBUG] Converting to best URL:', googleDriveUrl);
  
  if (!googleDriveUrl || !googleDriveUrl.includes('drive.google.com')) {
    return googleDriveUrl;
  }

  try {
    // Import the GCS backup service dynamically to avoid circular dependencies
    const { getBestImageUrl } = await import('./gcsBackupService');
    const bestUrl = await getBestImageUrl(googleDriveUrl, metadata);
    console.log('[DEBUG] Best URL found:', bestUrl);
    return bestUrl;
  } catch (error) {
    console.warn('[DEBUG] Failed to get best URL, falling back to local:', error);
    return convertGoogleDriveUrlToLocal(googleDriveUrl);
  }
};

/**
 * Fetch real-time data for a specific applicant from Google Apps Script API
 */
export const fetchApplicantDetails = async (applicantName: string): Promise<{ referees: Person[], associates: Person[] }> => {
  // Use mock data in development mode
  if (USE_MOCK_DATA) {
    logger.info('Using mock data for applicant details:', applicantName);
    
    try {
      const { mockApplicants } = await import('../data/mockData');
      const applicant = mockApplicants.find(app => app.name === applicantName);
      
      if (applicant) {
        return {
          referees: applicant.referees || [],
          associates: applicant.associates || []
        };
      }
    } catch (error) {
      logger.error('Error loading mock data:', error);
    }
    
    return { referees: [], associates: [] };
  }

  try {
    logger.info('Fetching real-time data for applicant:', applicantName);
    
    // For now, use the same fallback approach as fetchSheetData
    // This will be updated when backend Google Sheets integration is configured
    logger.info('Using fallback data for applicant details - Google Sheets API not yet configured');
    const fallbackData = await getDevelopmentFallbackData();
    const targetApplicant = fallbackData.applicants.find(app => app.name === applicantName);
    
    if (targetApplicant) {
      return {
        referees: targetApplicant.referees || [],
        associates: targetApplicant.associates || []
      };
    }
    
    return { referees: [], associates: [] };
  } catch (error) {
    logger.error('Error fetching applicant details:', error);
    
    // Fallback to default data
    return {
      referees: [
        {
          id: 'ref_1',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          role: 'Referee'
        },
        {
          id: 'ref_2', 
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          role: 'Referee'
        }
      ],
      associates: [
        {
          id: 'assoc_1',
          name: 'Alice Brown', 
          email: 'alice.brown@example.com',
          role: 'Associate'
        },
        {
          id: 'assoc_2',
          name: 'Charlie Wilson',
          email: 'charlie.wilson@example.com', 
          role: 'Associate'
        }
      ]
    };
  }
};

/**
 * Fetch data from Google Apps Script API
 */
export const fetchSheetData = async (): Promise<ApiResponse> => {
  // Use mock data in development mode or when explicitly enabled
  if (USE_MOCK_DATA) {
    logger.info('Using mock data for development');
    try {
      const { mockApplicants, mockReferees, mockAssociates } = await import('../data/mockData');
      return {
        applicants: mockApplicants,
        referees: mockReferees,
        associates: mockAssociates
      };
    } catch (error) {
      logger.error('Error loading mock data:', error);
      return { applicants: [], referees: [], associates: [] };
    }
  }

  logger.info('Attempting to fetch real data from Google Apps Script');
  
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'GET',
      // Avoid setting Content-Type on GET to prevent CORS preflight
      mode: 'cors',
    });
    
    if (response.ok) {
      const rawData = await response.json();
      logger.info('Successfully fetched data from Google Apps Script');
      
      const transformedData = transformRawData(rawData);
      logger.info('Data transformation completed', {
        applicants: transformedData.applicants.length,
        referees: transformedData.referees.length,
        associates: transformedData.associates.length
      });
      return transformedData;
    } else {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Failed to fetch from Google Apps Script, falling back to mock data:', error);
    
    try {
      const { mockApplicants, mockReferees, mockAssociates } = await import('../data/mockData');
      return {
        applicants: mockApplicants,
        referees: mockReferees,
        associates: mockAssociates
      };
    } catch (mockError) {
      logger.error('Error loading fallback mock data:', mockError);
      return { applicants: [], referees: [], associates: [] };
    }
  }
};

/**
 * Get photo URL from applicant record using same logic as downloadimages.js
 */
function getApplicantPhotoUrl(applicant: any): string {
  const candidateKeys = [
    '  Upload a recent passport photo  ',
    'Upload a recent passport photo',
    'photourl', 'photo', 'image', 'Image URL', 'Photo URL', 'Picture',
  ];
  
  for (const key of candidateKeys) {
    if (key in applicant && applicant[key]) {
      return applicant[key];
    }
  }
  return '';
}

/**
 * Get signature URL from record using same logic as downloadimages.js
 */
function getSignatureUrl(record: any): string {
  const candidateKeys = [
    'Upload a scanned copy of your Signature',
    'Signature', 'signature'
  ];
  
  for (const key of candidateKeys) {
    if (key in record && record[key]) {
      return record[key];
    }
  }
  return '';
}

/**
 * Transform raw form data from Google Apps Script into expected structure
 */
function transformRawData(rawData: any): ApiResponse {
  logger.info('Transforming raw data from Google Apps Script');
  
  // If rawData is already in the expected format, return it
  if (rawData && rawData.applicants && rawData.referees && rawData.associates) {
    logger.info('Data already in expected format');
    return rawData;
  }

  // Handle the actual Google Apps Script response format
  if (rawData && rawData.applicants && Array.isArray(rawData.applicants)) {
    logger.info('Processing Google Apps Script applicants data');
    const applicants: Person[] = [];
    const referees: Person[] = [];
    const associates: Person[] = [];

    rawData.applicants.forEach((applicant: any, index: number) => {
      // Get photo URL using same logic as download script
      const photoUrl = getApplicantPhotoUrl(applicant);
      const signatureUrl = getSignatureUrl(applicant);
      
      console.log(`[DEBUG] Applicant ${index + 1} photo processing:`, {
        name: `${applicant['\nFirst Name'] || ''} ${applicant.Surname || ''}`.trim(),
        photoUrl,
        hasPhotoField: '  Upload a recent passport photo  ' in applicant,
        photoFieldValue: applicant['  Upload a recent passport photo  '],
        convertedImage: convertGoogleDriveUrlToLocal(photoUrl)
      });

      const person: Person = {
        id: `person-${index + 1}`,
        timestamp: applicant.Timestamp || '',
        surname: applicant.Surname || '',
        firstName: applicant['\nFirst Name'] || '',
        name: `${applicant['\nFirst Name'] || ''} ${applicant.Surname || ''}`.trim(),
        email: applicant['Email Address'] || '',
        phone: applicant['\nPhone Numbers'] || '',
        location: `${applicant['\nState of Origin'] || ''}, ${applicant['\nLocal Government Area'] || ''}`.replace(', ', '').trim(),
        stateOfOrigin: applicant['\nState of Origin'] || '',
        localGovernmentArea: applicant['\nLocal Government Area'] || '',
        dateOfBirth: applicant['\nDate of Birth'] || '',
        placeOfBirth: applicant['\nPlace of Birth'] || '',
        maritalStatus: applicant['\nMarital Status'] || '',
        nationalIdentificationNumber: applicant['\nNational Identification Number (NIN)'] || '',
        nationality: applicant['  Nationality  '] || '',
        residentialAddress: applicant['\nResidential Address'] || '',
        phoneNumbers: applicant['\nPhone Numbers'] || '',
        socialMediaHandles: applicant['\nSocial Media Handles (Facebook, X, Instagram, Tiktok)'] || '',
        nickNameOrAlias: applicant['\nNick Name or Elias'] || '',
        nextOfKin: applicant['\nNext of Kin (NOK)'] || '',
        localAssembly: applicant['Local Assembly?'] || '',
        koinoniaFollowingDuration: applicant['How long have you been actively following Koinonia?'] || '',
        criminalRecord: applicant['Do you have any Criminal Record?'] || '',
        image: convertGoogleDriveUrlToLocal(photoUrl),
        signature: convertGoogleDriveUrlToLocal(signatureUrl),
        referee1Name: applicant['Referee 1 Name '] || '',
        referee1Email: applicant['Referee 1 Email '] || '',
        referee2Name: applicant['Referee 2 Name '] || '',
        referee2Email: applicant['Referee 2 Email '] || '',
        associate1Name: applicant['Associate 1 Name '] || '',
        associate1Email: applicant['Associate 1 Email '] || '',
        associate2Name: applicant['Associate 2 Name '] || '',
        associate2Email: applicant['Associate 2 Email '] || '',
      };

      applicants.push(person);
      
      // Create referee entries if referee information exists
      if (person.referee1Name && person.referee1Email) {
        referees.push({
          id: `referee-${index + 1}-1`,
          name: person.referee1Name,
          email: person.referee1Email,
          applicantName: person.name,
          role: 'referee'
        });
      }
      
      if (person.referee2Name && person.referee2Email) {
        referees.push({
          id: `referee-${index + 1}-2`,
          name: person.referee2Name,
          email: person.referee2Email,
          applicantName: person.name,
          role: 'referee'
        });
      }
      
      // Create associate entries if associate information exists
      if (person.associate1Name && person.associate1Email) {
        associates.push({
          id: `associate-${index + 1}-1`,
          name: person.associate1Name,
          email: person.associate1Email,
          applicantName: person.name,
          role: 'associate'
        });
      }
      
      if (person.associate2Name && person.associate2Email) {
        associates.push({
          id: `associate-${index + 1}-2`,
          name: person.associate2Name,
          email: person.associate2Email,
          applicantName: person.name,
          role: 'associate'
        });
      }
    });

    logger.info(`Transformed data: ${applicants.length} applicants, ${referees.length} referees, ${associates.length} associates`);
    
    return {
      applicants,
      referees,
      associates
    };
  }

  // If rawData is an array (legacy format), transform it
  if (Array.isArray(rawData)) {
    logger.info('Processing legacy array format');
    return {
      applicants: [],
      referees: [],
      associates: []
    };
  }

  logger.warn('Unknown data format, returning empty structure');
  return {
    applicants: [],
    referees: [],
    associates: []
  };
}

/**
 * Get development fallback data
 */
const getDevelopmentFallbackData = async (): Promise<ApiResponse> => {
  logger.info('Using development fallback data');
  try {
    const { mockApplicants, mockReferees, mockAssociates } = await import('../data/mockData');
    return {
      applicants: mockApplicants,
      referees: mockReferees,
      associates: mockAssociates
    };
  } catch (error) {
    logger.error('Error loading fallback data:', error);
    return { applicants: [], referees: [], associates: [] };
  }
};

/**
 * Process and link the data from the API response
 */
export const processSheetData = (apiData: ApiResponse) => {
  const { applicants: rawApplicants, referees: rawReferees, associates: rawAssociates } = apiData;

  // Create a map of applicants by name for easy lookup
  const applicantMap = new Map<string, Person>();
  
  // Process applicants first
  const processedApplicants: Person[] = rawApplicants.map((applicant, index) => {
    // Check if this is already processed data (has name field) or raw data
    let processed: Person;
    
    if (applicant.name && applicant.id) {
      // Already processed in transformRawData, just ensure it has empty arrays
      processed = {
        ...applicant,
        referees: applicant.referees || [],
        associates: applicant.associates || [],
      };
    } else {
      // Handle different field name formats from Google Sheets (for raw data)
      const firstName = applicant.firstname || applicant['firstname'] || applicant['First Name'] || applicant['\nFirst Name'] || '';
      const surname = applicant.surname || applicant['surname'] || applicant['Surname'] || '';
      const otherNames = applicant.othernames || applicant['othernames'] || applicant['Other Names'] || applicant['\nOther Names'] || '';
      const fullName = [firstName, otherNames, surname].filter(Boolean).join(' ').trim();
      
      processed = {
        id: applicant.id || `app_${index}`,
        name: fullName || applicant.name || applicant.Name || `Applicant ${index + 1}`,
        email: applicant.emailaddress || applicant['emailaddress'] || applicant['Email Address'] || applicant.email || applicant.Email || '',
        phone: applicant.phonenumbers || applicant['phonenumbers'] || applicant['Phone Numbers'] || applicant['\nPhone Numbers'] || applicant.phone || applicant.Phone || '',
        location: applicant.residentialaddress || applicant['residentialaddress'] || applicant['Residential Address'] || applicant['\nResidential Address'] || applicant.location || applicant.Location || '',
        role: applicant.role || applicant.Role || 'Applicant',
        image: convertGoogleDriveUrlToLocal(applicant['  Upload a recent passport photo  '] || applicant.photourl || applicant['photourl'] || applicant['Photo URL'] || applicant['Image URL'] || applicant['Picture'] || applicant.image || applicant.photo || ''),
        signature: convertGoogleDriveUrlToLocal(applicant['Upload a scanned copy of your Signature'] || ''),
        referees: [],
        associates: [],
        
        // Extended fields
        timestamp: applicant['Timestamp'] || '',
        surname: applicant['Surname'] || '',
        surnameAtBirth: applicant['\nSurname at Birth (if different)'] || '',
        firstName: applicant['\nFirst Name'] || '',
        otherNames: applicant['\nOther Names'] || '',
        stateOfOrigin: applicant['\nState of Origin'] || '',
        localGovernmentArea: applicant['\nLocal Government Area'] || '',
        dateOfBirth: applicant['\nDate of Birth'] || '',
        placeOfBirth: applicant['\nPlace of Birth'] || '',
        maritalStatus: applicant['\nMarital Status'] || '',
        nationalIdentificationNumber: applicant['\nNational Identification Number (NIN)'] || '',
        nationality: applicant['  Nationality  '] || '',
        residentialAddress: applicant['\nResidential Address'] || '',
        phoneNumbers: applicant['\nPhone Numbers'] || '',
        socialMediaHandles: applicant['\nSocial Media Handles (Facebook, X, Instagram, Tiktok)'] || '',
        nickNameOrAlias: applicant['\nNick Name or Elias'] || '',
        nextOfKin: applicant['\nNext of Kin (NOK)'] || '',
        localAssembly: applicant['Local Assembly?'] || '',
        koinoniaFollowingDuration: applicant['How long have you been actively following Koinonia?'] || '',
        criminalRecord: applicant['Do you have any Criminal Record?'] || '',
        referee1Name: applicant['Referee 1 Name '] || '',
        referee1Email: applicant['Referee 1 Email '] || '',
        referee2Name: applicant['Referee 2 Name '] || '',
        referee2Email: applicant['Referee 2 Email '] || '',
        associate1Name: applicant['Associate 1 Name '] || '',
        associate1Email: applicant['Associate 1 Email '] || '',
        associate2Name: applicant['Associate 2 Name '] || '',
        associate2Email: applicant['Associate 2 Email '] || '',
      };
    }
    
    applicantMap.set(processed.name, processed);
    return processed;
  });

  // Process referees from separate Referees tab
  const processedReferees: Person[] = rawReferees.map((referee, index) => {
    const processed: Person = {
      id: referee.id || `ref_${index}`,
      name: referee['  Your Full Name  '] || referee['Your Full Name '] || referee['Your Full Name'] || referee.name || referee.Name || `Referee ${index + 1}`,
      email: referee['Email Address'] || referee.email || referee.Email || '',
      phone: referee['  Your Mobile Number(s)  '] || referee['Your Mobile Number(s)'] || referee.phone || referee.Phone || '',
      location: referee['  Your Address  '] || referee['Your Address'] || referee.location || referee.Location || '',
      role: 'Referee',
      applicantName: referee['Name of Applicant you are attesting for  '] || referee['Name of Applicant you are attesting for'] || referee.applicantname || referee['applicantname'] || referee['Applicant Name'] || referee.applicant || '',
      signature: convertGoogleDriveUrlToLocal(referee['Upload a scanned copy of your Signature'] || referee.signature || ''),
      timestamp: referee['Timestamp'] || referee.timestamp || '',
    };
    
    // Link to applicant if applicantName is provided
    if (processed.applicantName) {
      const applicant = applicantMap.get(processed.applicantName);
      if (applicant) {
        processed.applicant = applicant;
        applicant.referees?.push(processed);
      }
    }
    
    return processed;
  });

  // Process associates from separate Associates tab
  const processedAssociates: Person[] = rawAssociates.map((associate, index) => {
    const processed: Person = {
      id: associate.id || `assoc_${index}`,
      name: associate['Your Full Name '] || associate['  Your Full Name  '] || associate['Your Full Name'] || associate.name || associate.Name || `Associate ${index + 1}`,
      email: associate['Email Address'] || associate.email || associate.Email || '',
      phone: associate['  Your Mobile Number(s)  '] || associate['Your Mobile Number(s)'] || associate.phone || associate.Phone || '',
      location: associate['  Your Address  '] || associate['Your Address'] || associate.location || associate.Location || '',
      role: 'Associate',
      applicantName: associate['  Name of Applicant You Are Attesting For  '] || associate['Name of Applicant You Are Attesting For'] || associate.applicantname || associate['applicantname'] || associate['Applicant Name'] || associate.applicant || '',
      signature: convertGoogleDriveUrlToLocal(associate['Upload a scanned copy of your Signature'] || associate.signature || ''),
      timestamp: associate['Timestamp'] || associate.timestamp || '',
    };
    
    // Link to applicant if applicantName is provided
    if (processed.applicantName) {
      const applicant = applicantMap.get(processed.applicantName);
      if (applicant) {
        processed.applicant = applicant;
        applicant.associates?.push(processed);
      }
    }
    
    return processed;
  });

  logger.info('Processed data', {
    applicants: processedApplicants.length,
    referees: processedReferees.length,
    associates: processedAssociates.length
  });

  return {
    applicants: processedApplicants,
    referees: processedReferees,
    associates: processedAssociates,
  };
};

/**
 * Find a referee by email address
 */
export const findRefereeByEmail = async (email: string): Promise<Person | null> => {
  try {
    const data = await getAllData();
    const referee = data.referees.find(ref => ref.email === email);
    return referee || null;
  } catch (error) {
    logger.error('Error finding referee by email:', error);
    return null;
  }
};

/**
 * Find an associate by email address
 */
export const findAssociateByEmail = async (email: string): Promise<Person | null> => {
  try {
    const data = await getAllData();
    const associate = data.associates.find(assoc => assoc.email === email);
    return associate || null;
  } catch (error) {
    logger.error('Error finding associate by email:', error);
    return null;
  }
};

/**
 * Get all data with relationships established
 */
export const getAllData = async () => {
  try {
    console.log('[DEBUG] Starting getAllData...');
    const rawData = await fetchSheetData();
    console.log('[DEBUG] Raw data received:', {
      applicants: rawData.applicants?.length || 0,
      referees: rawData.referees?.length || 0,
      associates: rawData.associates?.length || 0,
      sampleApplicant: rawData.applicants?.[0] ? {
        name: rawData.applicants[0].name,
        imageField: rawData.applicants[0]['  Upload a recent passport photo  '],
        email: rawData.applicants[0]['Email Address'],
        firstName: rawData.applicants[0]['\nFirst Name'],
        surname: rawData.applicants[0]['Surname']
      } : null
    });
    
    const processedData = processSheetData(rawData);
    console.log('[DEBUG] Processed data sample:', {
      applicants: processedData.applicants?.length || 0,
      sampleApplicant: processedData.applicants?.[0] ? {
        name: processedData.applicants[0].name,
        image: processedData.applicants[0].image,
        email: processedData.applicants[0].email,
        id: processedData.applicants[0].id
      } : null,
      allApplicantNames: processedData.applicants?.map(a => a.name)
    });
    
    processedData.applicants = (processedData.applicants || []).map(applyVettingDefaults);
    return processedData;
  } catch (error) {
    logger.error('Error getting all data:', error);
    return {
      applicants: [],
      referees: [],
      associates: [],
    };
  }
};

// Ensure defaults for vetting/nin fields across applicants
function applyVettingDefaults(p: Person): Person {
  return {
    ...p,
    vetting_status: p.vetting_status || 'PENDING',
    nin_status: p.nin_status || 'PENDING',
  };
}
