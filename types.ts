
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
  // Added optional fields used in GeneratorTab.tsx to satisfy the compiler and hold additional job data
  fullDescription?: string;
  sourceSite?: string;
}

export interface FoundEmail {
  email: string;
  type: 'recruitment' | 'personal' | 'general' | 'unknown';
  name?: string; 
  role?: string; 
  company?: string; 
  industry?: string; 
  snippet?: string; 
  source?: string; 
  sourceUrl?: string; 
}

export type StreamUpdate = 
  | { type: 'log'; message: string }
  | { type: 'result'; data: FoundEmail };

export enum AppTab {
  GENERATOR = 'GENERATOR',
  PROFILE = 'PROFILE',
  EMAIL_FINDER = 'EMAIL_FINDER',
}
