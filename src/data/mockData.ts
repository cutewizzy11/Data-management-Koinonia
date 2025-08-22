// Mock data for the data management for koinonia dashboard
export interface Person {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  image?: string;
  signature?: string;
  referees?: Person[];
  associates?: Person[];
  applicant?: Person;
}

// Base people without relations first
const basePeople = {
  // Applicants
  applicant1: {
    id: 'app1',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    role: 'Senior Software Engineer',
    image: '/images/drive_1WvCIeVjaZBbTuKPA2lHm2KV6h_UR0ZbD.jpg',
    signature: '/images/drive_1PnoTsItIu5DcGljRbZNOPr2eHBDPrF9u.jpg',
  },
  applicant2: {
    id: 'app2',
    name: 'Michael Rodriguez',
    email: 'michael.r@email.com',
    phone: '+1 (555) 234-5678',
    location: 'New York, NY',
    role: 'Product Manager',
    image: '/images/drive_1jw6wrxD_cwDyKOAidu7T6W4EAmjFlp_4.jpg',
    signature: '/images/drive_1S2P_rmxFSS1NjIIkjNrW4u3DWRZ8L76X.jpg',
  },
  applicant3: {
    id: 'app3',
    name: 'Emily Johnson',
    email: 'emily.johnson@email.com',
    phone: '+1 (555) 345-6789',
    location: 'Austin, TX',
    role: 'UX Designer',
    image: '/images/drive_1O_bZjMv3rhwkPioX-7pdunTa7UtO_NLH.jpg',
    signature: '/images/drive_1jw6wrxD_cwDyKOAidu7T6W4EAmjFlp_4.jpg',
  },
  
  // Referees
  referee1: {
    id: 'ref1',
    name: 'Dr. James Wilson',
    email: 'j.wilson@university.edu',
    phone: '+1 (555) 456-7890',
    location: 'Boston, MA',
    signature: '/images/drive_1S2P_rmxFSS1NjIIkjNrW4u3DWRZ8L76X.jpg',
  },
  referee2: {
    id: 'ref2',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@company.com',
    phone: '+1 (555) 567-8901',
    location: 'Seattle, WA',
    signature: '/images/drive_1b3im2GCotxEOYyzxlDd5V33wuoKOdRe6.jpg',
  },
  referee3: {
    id: 'ref3',
    name: 'David Park',
    email: 'david.park@tech.com',
    phone: '+1 (555) 678-9012',
    location: 'San Francisco, CA',
    signature: '/images/drive_1S2P_rmxFSS1NjIIkjNrW4u3DWRZ8L76X.jpg',
  },
  referee4: {
    id: 'ref4',
    name: 'Maria Garcia',
    email: 'maria.garcia@corp.com',
    phone: '+1 (555) 789-0123',
    location: 'Los Angeles, CA',
    signature: '/images/drive_1O_bZjMv3rhwkPioX-7pdunTa7UtO_NLH.jpg',
  },
  
  // Associates
  associate1: {
    id: 'assoc1',
    name: 'Alex Kumar',
    email: 'alex.kumar@partner.com',
    phone: '+1 (555) 890-1234',
    location: 'Chicago, IL',
    signature: '/images/drive_1PnoTsItIu5DcGljRbZNOPr2eHBDPrF9u.jpg',
  },
  associate2: {
    id: 'assoc2',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@firm.com',
    phone: '+1 (555) 901-2345',
    location: 'Denver, CO',
    signature: '/images/drive_1WvCIeVjaZBbTuKPA2lHm2KV6h_UR0ZbD.jpg',
  },
  associate3: {
    id: 'assoc3',
    name: 'Robert Brown',
    email: 'robert.brown@consulting.com',
    phone: '+1 (555) 012-3456',
    location: 'Miami, FL',
    signature: '/images/drive_1PnoTsItIu5DcGljRbZNOPr2eHBDPrF9u.jpg',
  },
  associate4: {
    id: 'assoc4',
    name: 'Anna Schmidt',
    email: 'anna.schmidt@advisory.com',
    phone: '+1 (555) 123-0987',
    location: 'Portland, OR',
    signature: '/images/drive_1b3im2GCotxEOYyzxlDd5V33wuoKOdRe6.jpg',
  },
};

// Now create the relationships
export const mockApplicants: Person[] = [
  {
    ...basePeople.applicant1,
    referees: [
      { ...basePeople.referee1, applicant: basePeople.applicant1 },
      { ...basePeople.referee2, applicant: basePeople.applicant1 },
    ],
    associates: [
      { ...basePeople.associate1, applicant: basePeople.applicant1 },
      { ...basePeople.associate2, applicant: basePeople.applicant1 },
    ],
  },
  {
    ...basePeople.applicant2,
    referees: [
      { ...basePeople.referee3, applicant: basePeople.applicant2 },
    ],
    associates: [
      { ...basePeople.associate3, applicant: basePeople.applicant2 },
    ],
  },
  {
    ...basePeople.applicant3,
    referees: [
      { ...basePeople.referee4, applicant: basePeople.applicant3 },
    ],
    associates: [
      { ...basePeople.associate4, applicant: basePeople.applicant3 },
    ],
  },
];

export const mockReferees: Person[] = [
  { ...basePeople.referee1, applicant: basePeople.applicant1 },
  { ...basePeople.referee2, applicant: basePeople.applicant1 },
  { ...basePeople.referee3, applicant: basePeople.applicant2 },
  { ...basePeople.referee4, applicant: basePeople.applicant3 },
];

export const mockAssociates: Person[] = [
  { ...basePeople.associate1, applicant: basePeople.applicant1 },
  { ...basePeople.associate2, applicant: basePeople.applicant1 },
  { ...basePeople.associate3, applicant: basePeople.applicant2 },
  { ...basePeople.associate4, applicant: basePeople.applicant3 },
];