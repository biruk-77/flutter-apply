
export interface UserProfile {
  name: string;
  email: string;
  yearsExperience: string;
  portfolioUrl: string;
  skills: string;
  bio: string;
  linkedinUrl: string;
}

export interface JobDetails {
  companyName: string;
  jobTitle: string;
  hiringManagerName?: string;
  recruiterEmail: string;
  jobDescription: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export interface JobListing {
  company: string;
  title: string;
  location: string;
  email: string | null;
  snippet: string;
  url: string | null;
}

export interface FoundEmail {
  email: string;
  type: 'recruitment' | 'personal' | 'general' | 'unknown';
  name?: string; // The person's name or department name
  role?: string; // e.g., CEO, Founder, Recruiter, CTO
  company?: string; // The company name
  industry?: string; // e.g. Fintech, Healthcare
  snippet?: string; // Short context about why they are relevant or where found
  source?: string; // Where it might have been found (context)
}

export type StreamUpdate = 
  | { type: 'log'; message: string }
  | { type: 'result'; data: FoundEmail };

export enum AppTab {
  GENERATOR = 'GENERATOR',
  PROFILE = 'PROFILE',
  EMAIL_FINDER = 'EMAIL_FINDER',
}
