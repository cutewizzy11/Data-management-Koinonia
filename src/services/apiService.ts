// API service for fetching data from Google Apps Script
export interface ApiResponse {
  applicants: any[];
  referees: any[];
  associates: any[];
}

const norm = (s?: string) => String(s ?? '').trim().toLowerCase();

export interface Person {
  // Employment / new fields
  occupation?: string;
  formerEmployer?: string;
  currentEmployer?: string;
  reasonLeftFormerEmployer?: string;

  // Associate-specific extra
  associateDate?: string;

  // Vetting & NIN fields
  vetting_status?: 'PENDING' | 'VETTED' | 'REJECTED';
  vetted_by?: string;
  vetted_at?: string;
  nin_status?: 'PENDING' | 'MATCH' | 'MISMATCH' | 'ERROR';
  nin_checked_at?: string;
  provider_reference?: string;
  nin_compare_summary?: string;

  nin?: string;
  vnin?: string;

  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  image?: string;
  signature?: string;

  applicantName?: string;
  referees?: Person[];
  associates?: Person[];
  applicant?: Person;

  // Extended sheet fields
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

// Google Apps Script feed
const GOOGLE_APPS_SCRIPT_URL = import.meta.env.DEV
  ? '/gs-api/macros/s/AKfycbw9Nqqbd0uxeXhNV3Bt4EZppM6ib7DD1knuvPjZIQZBxsEpBQ0jQCRXZU1iAOFbbPjEsg/exec'
  : 'https://script.google.com/macros/s/AKfycbw9Nqqbd0uxeXhNV3Bt4EZppM6ib7DD1knuvPjZIQZBxsEpBQ0jQCRXZU1iAOFbbPjEsg/exec';

const USE_MOCK_DATA = false;

const logger = {
  info: (m: string, d?: any) => import.meta.env.DEV && console.log(`[API] ${m}`, d ?? ''),
  warn: (m: string, d?: any) => import.meta.env.DEV && console.warn(`[API] ${m}`, d ?? ''),
  error: (m: string, d?: any) => import.meta.env.DEV && console.error(`[API] ${m}`, d ?? ''),
};

const DRIVE_ID = /\/d\/([a-zA-Z0-9-_]+)/;
const DRIVE_OPEN = /[?&]id=([a-zA-Z0-9-_]+)/;

const convertGoogleDriveUrlToLocal = (url: string) => {
  if (!url || !url.includes('drive.google.com')) return url;
  const m = url.match(DRIVE_ID) || url.match(DRIVE_OPEN);
  return m ? `/images/drive_${m[1]}.jpg` : url;
};

function getApplicantPhotoUrl(applicant: any): string {
  const keys = [
    '  Upload a recent passport photo  ',
    'Upload a recent passport photo',
    'photourl', 'photo', 'image', 'Image URL', 'Photo URL', 'Picture',
  ];
  for (const k of keys) if (k in applicant && applicant[k]) return String(applicant[k]);
  return '';
}

function getSignatureUrl(record: any): string {
  const keys = ['Upload a scanned copy of your Signature', 'Signature', 'signature'];
  for (const k of keys) if (k in record && record[k]) return String(record[k]);
  return '';
}

/** Utility: read first non-empty value from candidate keys */
function pickFirst(obj: any, candidates: string[]): string {
  for (const key of candidates) {
    if (key in obj && obj[key] != null && String(obj[key]).trim() !== '') {
      return String(obj[key]).trim();
    }
  }
  return '';
}

export const fetchSheetData = async (): Promise<ApiResponse> => {
  if (USE_MOCK_DATA) {
    const { mockApplicants, mockReferees, mockAssociates } = await import('../data/mockData');
    return { applicants: mockApplicants, referees: mockReferees, associates: mockAssociates };
  }
  const resp = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: 'GET', mode: 'cors' });
  if (!resp.ok) throw new Error(`Feed ${resp.status}`);
  return await resp.json();
};

function mapApplicant(applicant: any, idx: number): Person {
  const photoUrl = getApplicantPhotoUrl(applicant);
  const signatureUrl = getSignatureUrl(applicant);

  // Names
  const firstName  = pickFirst(applicant, ['\nFirst Name','First Name','firstname']);
  const surname    = pickFirst(applicant, ['Surname','surname']);
  const otherNames = pickFirst(applicant, ['\nOther Names','Other Names','othernames']);
  const name = [firstName, otherNames, surname].filter(Boolean).join(' ').trim();

  // Employment (wide header coverage)
  const occupation = pickFirst(applicant, [
    'Occupation',
    'What is your occupation?',
    'Your Occupation',
    'Current Occupation',
    'Occupation (Optional)',
    'occupation',
  ]);

  const formerEmployer = pickFirst(applicant, [
    'Former employer',
    'Former Employer',
    'Previous Employer',
    'Previous employer',
    'formerEmployer',
  ]);

  const currentEmployer = pickFirst(applicant, [
    'Current employer',
    'Current Employer',
    'Present Employer',
    'presentEmployer',
    'currentEmployer',
  ]);

  const reasonLeftFormerEmployer = pickFirst(applicant, [
    'Reason why you left your former employer',
    'Reason for leaving former employer',
    'Reason Left Former Employer',
    'Why did you leave your former employer?',
    'reasonForLeavingFormerEmployer',
    'reasonLeftFormerEmployer',
  ]);

  // NIN / VNIN
  const nin = pickFirst(applicant, [
    '\nNational Identification Number (NIN)',
    'National Identification Number (NIN)',
    'NIN',
    'nin',
  ]);
  const vnin = pickFirst(applicant, ['VNIN', 'vnin']);

  return {
    id: applicant.id || `person-${idx + 1}`,
    name: name || applicant.name || `Applicant ${idx + 1}`,
    email: pickFirst(applicant, ['Email Address','email','Email']),
    phone: pickFirst(applicant, ['\nPhone Numbers','Phone Numbers','phone','Phone']),
    role: 'Applicant',
    location: pickFirst(applicant, ['\nResidential Address','Residential Address','location','Location']),
    image: convertGoogleDriveUrlToLocal(photoUrl),
    signature: convertGoogleDriveUrlToLocal(signatureUrl),

    timestamp: applicant['Timestamp'] || '',
    surname,
    firstName,
    otherNames,
    stateOfOrigin: pickFirst(applicant, ['\nState of Origin','State of Origin']),
    localGovernmentArea: pickFirst(applicant, ['\nLocal Government Area','Local Government Area']),
    dateOfBirth: pickFirst(applicant, ['\nDate of Birth','Date of Birth']),
    placeOfBirth: pickFirst(applicant, ['\nPlace of Birth','Place of Birth']),
    maritalStatus: pickFirst(applicant, ['\nMarital Status','Marital Status']),
    nationalIdentificationNumber: nin,
    nationality: pickFirst(applicant, ['  Nationality  ','Nationality','nationality']),
    residentialAddress: pickFirst(applicant, ['\nResidential Address','Residential Address']),
    phoneNumbers: pickFirst(applicant, ['\nPhone Numbers','Phone Numbers']),
    socialMediaHandles: pickFirst(applicant, ['\nSocial Media Handles (Facebook, X, Instagram, Tiktok)','Social Media','Social Media Handles']),
    nickNameOrAlias: pickFirst(applicant, ['\nNick Name or Elias','Nick Name or Elias','Nickname or Alias']),
    nextOfKin: pickFirst(applicant, ['\nNext of Kin (NOK)','Next of Kin (NOK)','Next of Kin']),
    localAssembly: pickFirst(applicant, ['Local Assembly?','Local Assembly']),
    koinoniaFollowingDuration: pickFirst(applicant, ['How long have you been actively following Koinonia?','Following Koinonia Duration']),
    criminalRecord: pickFirst(applicant, ['Do you have any Criminal Record?','Criminal Record']),

    referee1Name: applicant['Referee 1 Name '] || '',
    referee1Email: applicant['Referee 1 Email '] || '',
    referee2Name: applicant['Referee 2 Name '] || '',
    referee2Email: applicant['Referee 2 Email '] || '',
    associate1Name: applicant['Associate 1 Name '] || '',
    associate1Email: applicant['Associate 1 Email '] || '',
    associate2Name: applicant['Associate 2 Name '] || '',
    associate2Email: applicant['Associate 2 Email '] || '',

    // New fields
    occupation,
    formerEmployer,
    currentEmployer,
    reasonLeftFormerEmployer,
    nin,
    vnin,

    referees: [],
    associates: [],
  };
}

function mapReferee(r: any, idx: number): Person {
  return {
    id: r.id || `ref_${idx}`,
    name: r['Your Full Name '] || r['  Your Full Name  '] || r['Your Full Name'] || r.name || `Referee ${idx + 1}`,
    email: r['Email Address'] || r.email || '',
    phone: r['  Your Mobile Number(s)  '] || r['Your Mobile Number(s)'] || r.phone || '',
    location: r['  Your Address  '] || r['Your Address'] || r.location || '',
    role: 'Referee',
    applicantName: r['Name of Applicant you are attesting for  '] || r['Name of Applicant you are attesting for'] || r['Applicant Name'] || r.applicantname || '',
    signature: convertGoogleDriveUrlToLocal(r['Upload a scanned copy of your Signature'] || r.signature || ''),
    timestamp: r['Timestamp'] || r.timestamp || '',
  };
}

function mapAssociate(a: any, idx: number): Person {
  return {
    id: a.id || `assoc_${idx}`,
    name: a['Your Full Name '] || a['  Your Full Name  '] || a['Your Full Name'] || a.name || `Associate ${idx + 1}`,
    email: a['Email Address'] || a.email || '',
    phone: a['  Your Mobile Number(s)  '] || a['Your Mobile Number(s)'] || a.phone || '',
    location: a['  Your Address  '] || a['Your Address'] || a.location || '',
    role: 'Associate',
    applicantName: a['  Name of Applicant You Are Attesting For  '] || a['Name of Applicant You Are Attesting For'] || a['Applicant Name'] || a.applicantname || '',
    signature: convertGoogleDriveUrlToLocal(a['Upload a scanned copy of your Signature'] || a.signature || ''),
    timestamp: a['Timestamp'] || a.timestamp || '',
    associateDate: a['Date'] || a['Submission Date'] || a.date || '',
  };
}

export const processSheetData = (apiData: ApiResponse) => {
  const applicants = (apiData.applicants || []).map(mapApplicant);
  const referees   = (apiData.referees   || []).map(mapReferee);
  const associates = (apiData.associates || []).map(mapAssociate);

  // Link by (lowercased, trimmed) name to be resilient to case/spacing
  const byName = new Map<string, Person>();
  for (const a of applicants) byName.set(norm(a.name), a);

  for (const r of referees) {
    if (r.applicantName) {
      const app = byName.get(norm(r.applicantName));
      if (app) {
        r.applicant = app;
        (app.referees ||= []).push(r);
      }
    }
  }
  for (const a of associates) {
    if (a.applicantName) {
      const app = byName.get(norm(a.applicantName));
      if (app) {
        a.applicant = app;
        (app.associates ||= []).push(a);
      }
    }
  }

  return { applicants, referees, associates };
};

export const getAllData = async () => {
  try {
    const raw = await fetchSheetData();
    const data = processSheetData(raw);
    data.applicants = data.applicants.map(applyVettingDefaults);
    return data;
  } catch (e) {
    logger.error('getAllData failed', e);
    return { applicants: [], referees: [], associates: [] };
  }
};

function applyVettingDefaults(p: Person): Person {
  return { ...p, vetting_status: p.vetting_status || 'PENDING', nin_status: p.nin_status || 'PENDING' };
}

export const findRefereeByEmail = async (email: string) => {
  const d = await getAllData();
  return d.referees.find(r => norm(r.email) === norm(email)) || null;
};

export const findAssociateByEmail = async (email: string) => {
  const d = await getAllData();
  return d.associates.find(a => norm(a.email) === norm(email)) || null;
};

/**
 * ✅ Re-introduced for DetailView
 * Fetch applicant’s current referees/associates from the processed data.
 */
export const fetchApplicantDetails = async (
  applicantName: string
): Promise<{ referees: Person[]; associates: Person[] }> => {
  const data = await getAllData();
  const app = data.applicants.find(a => norm(a.name) === norm(applicantName));
  if (!app) return { referees: [], associates: [] };
  return {
    referees: app.referees || [],
    associates: app.associates || [],
  };
};
