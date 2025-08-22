// API service for fetching data from Google Apps Script
export interface ApiResponse {
  applicants: any[];
  referees: any[];
  associates: any[];
}

const norm = (s?: string) => String(s ?? '').trim().toLowerCase();

export interface Person {
  occupation?: string;
  formerEmployer?: string;
  currentEmployer?: string;
  reasonLeftFormerEmployer?: string;

  associateDate?: string;

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

  const firstName  = applicant['\nFirst Name'] || applicant['First Name'] || applicant.firstname || '';
  const surname    = applicant['Surname'] || applicant.surname || '';
  const otherNames = applicant['\nOther Names'] || applicant['Other Names'] || applicant.othernames || '';
  const name = [firstName, otherNames, surname].filter(Boolean).join(' ').trim();

  const occupation      = applicant['Occupation'] || applicant.occupation || '';
  const formerEmployer  = applicant['Former employer'] || applicant['Former Employer'] || applicant.formerEmployer || '';
  const currentEmployer = applicant['Current employer'] || applicant['Current Employer'] || applicant.currentEmployer || '';
  const reasonLeftFormerEmployer =
    applicant['Reason why you left your former employer'] ||
    applicant['Reason for leaving former employer'] ||
    applicant.reasonForLeavingFormerEmployer || applicant.reasonLeftFormerEmployer || '';

  const nin  = applicant['\nNational Identification Number (NIN)'] || applicant['National Identification Number (NIN)'] || applicant.nin || '';
  const vnin = applicant['VNIN'] || applicant.vnin || '';

  return {
    id: applicant.id || `person-${idx + 1}`,
    name: name || applicant.name || `Applicant ${idx + 1}`,
    email: applicant['Email Address'] || applicant.email || '',
    phone: applicant['\nPhone Numbers'] || applicant.phone || '',
    role: 'Applicant',
    location: applicant['\nResidential Address'] || applicant.location || '',
    image: convertGoogleDriveUrlToLocal(photoUrl),
    signature: convertGoogleDriveUrlToLocal(signatureUrl),

    timestamp: applicant['Timestamp'] || '',
    surname,
    firstName,
    otherNames,
    stateOfOrigin: applicant['\nState of Origin'] || '',
    localGovernmentArea: applicant['\nLocal Government Area'] || '',
    dateOfBirth: applicant['\nDate of Birth'] || '',
    placeOfBirth: applicant['\nPlace of Birth'] || '',
    maritalStatus: applicant['\nMarital Status'] || '',
    nationalIdentificationNumber: nin,
    nationality: applicant['  Nationality  '] || applicant.nationality || '',
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

  // Link by normalized applicantName
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
