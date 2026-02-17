
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, JobDetails, GeneratedEmail, JobListing, FoundEmail, StreamUpdate } from "../types";

// Initialize the Gemini API client using the API_KEY environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Searches for job listings using Google Search grounding.
 */
export const searchJobs = async (query: string): Promise<JobListing[]> => {
  const prompt = `
    Find 4-5 active job listings for: "${query}".
    
    Return the output strictly as a raw JSON array.
    Each object in the array must have these fields:
    - "company": (string) Company Name
    - "title": (string) Job Title
    - "location": (string) Location
    - "email": (string or null) Contact email if found
    - "snippet": (string) Short description of the role
    - "url": (string or null) Link to the job
    - "fullDescription": (string) Full, detailed job description
    - "sourceSite": (string) The name of the website where the job listing was found
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "[]";
    // Cleaning the response string in case the model wraps JSON in Markdown code blocks.
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const jobs = JSON.parse(cleanJson) as JobListing[];
      return jobs;
    } catch (parseError) {
      console.error("Failed to parse job search JSON", text);
      return [];
    }
  } catch (error: any) {
    console.error("Gemini search error:", error);
    throw error;
  }
};

/**
 * Streams contact emails by performing a Deep Search via Google Grounding.
 */
export async function* findContactEmailsStream(
  query: string, 
  strategy: 'recruiters' | 'decision_makers' | 'active_hiring' = 'recruiters',
  count: number = 15,
  location: string = '',
  exclude: string[] = []
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  // Construct a more aggressive search strategy based on the user's intent
  let searchFocus = '';
  switch (strategy) {
    case 'recruiters':
      searchFocus = 'Focus on Technical Recruiters, Talent Acquisition Heads, and HR Managers.';
      break;
    case 'decision_makers':
      searchFocus = 'Focus on CTOs, VPs of Engineering, Engineering Managers, and Founders.';
      break;
    case 'active_hiring':
      searchFocus = 'Focus on companies explicitly posting "We are hiring", "Job opening", or "Careers" for this role.';
      break;
  }

  const prompt = `
    DEEP SEARCH TASK: Find ~${count} high-quality professional contacts for: "${query}" ${location ? `in ${location}` : ''}.
    ${searchFocus}

    SEARCH STRATEGY:
    1. PRIORITIZE findings with direct EMAIL ADDRESSES (patterns like @company.com, or gmail/outlook for freelancers).
    2. If no direct email is visible, find the Decision Maker's Name and Company so we can guess the email later.
    3. Look into LinkedIn summaries, GitHub profiles, Twitter/X bios, and Company "About Us" / "Team" pages.
    4. ${exclude.length > 0 ? `CRITICAL: Do not include these previously found names/companies: ${exclude.slice(-50).join(', ')}.` : ''}

    Output Format:
    Return ONLY a stream of JSON objects, one per line. Do not wrap in a list.
    {
      "email": "string (The actual email found, or a highly probable format like firstname.lastname@company.com if confidence is high)",
      "type": "recruitment" | "personal" | "general",
      "name": "string (Full Name)",
      "role": "string (Job Title)",
      "company": "string",
      "snippet": "string (The exact text/context where you found this lead, e.g., 'Posted on LinkedIn: looking for flutter devs...')",
      "sourceUrl": "string (Link to profile/post)"
    }
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let buffer = '';
    for await (const chunk of responseStream) {
      const text = chunk.text || ''; 
      buffer += text;
      let lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Basic JSON validation to ensure we don't yield garbage
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const data = JSON.parse(trimmed) as FoundEmail;
            yield { type: 'result', data };
          } catch (e) {
            // Ignore malformed lines
          }
        } else {
             // Occasionally yield status updates if the model talks
             if (trimmed.length > 10 && trimmed.length < 100 && !trimmed.includes('{')) {
                 yield { type: 'log', message: trimmed };
             }
        }
      }
    }
  } catch (error: any) {
    throw error;
  }
}

/**
 * Generates a tailored cold email for a prospective employer using the pro model for better reasoning.
 */
export const generateColdEmail = async (
  profile: UserProfile,
  recipient: FoundEmail
): Promise<GeneratedEmail> => {
  const prompt = `
    Write a highly tailored and professional cold email application for a Flutter job.
    RECIPIENT: ${recipient.name} at ${recipient.company}.
    SENDER: ${profile.name}, ${profile.yearsExperience} yrs exp, Skills: ${profile