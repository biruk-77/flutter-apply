
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, JobDetails, GeneratedEmail, JobListing, FoundEmail, StreamUpdate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchJobs = async (query: string): Promise<JobListing[]> => {
  const prompt = `
    Find 4-5 active or recent job listings for: "${query}".
    
    Your task is to extract job details, specifically looking for a contact email address and the FULL job description.
    
    Return the output strictly as a raw JSON array.
    Each object in the array must have these fields:
    - "company": (string) Company Name
    - "title": (string) Job Title
    - "location": (string) Location or Remote
    - "email": (string or null) The application email address if found, otherwise null.
    - "snippet": (string) A very short 1-sentence summary.
    - "fullDescription": (string) The MOST DETAILED version of the job description you can find or synthesize from the search results.
    - "url": (string or null) The direct URL to the job post.
    - "sourceSite": (string) The name of the site where this was found (e.g. "LinkedIn", "Indeed", "Glassdoor").
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

export async function* findContactEmailsStream(
  query: string, 
  strategy: 'recruiters' | 'decision_makers' | 'active_hiring' = 'recruiters',
  count: number = 10,
  location: string = '',
  exclude: string[] = []
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  let roleFocus = "";
  
  if (strategy === 'active_hiring') {
    roleFocus = `
      CRITICAL FOCUS: Find individuals who are ACTIVELY HIRING NOW.
      - Look for recent posts (LinkedIn/X), job boards, or university portals.
      - You MUST provide the direct URL to the posting in the "sourceUrl" field.
      - The 'snippet' field MUST contain the context of the hire (e.g. the full post content or requirements).
    `;
  } else if (strategy === 'decision_makers') {
    roleFocus = "Focus on: CEOs, Founders, CTOs. Provide their profile link and any hire-related context.";
  } else {
    roleFocus = "Focus on: Recruiters, Talent Acquisition. Provide the specific job post link.";
  }

  const excludeContext = exclude.length > 0 
    ? `EXCLUDE these names/companies: ${exclude.join(', ')}.`
    : '';

  const prompt = `
    You are a Lead Generation Engine.
    QUERY: "${query}"
    LOCATION: "${location || 'Anywhere'}"
    TARGET: ~${count} contacts. 
    ${roleFocus}
    ${excludeContext}
    
    1. LOGS: "LOG: [Action description]"
    2. RESULTS: One JSON object per line.
       {
         "email": "string",
         "type": "recruitment" | "personal" | "general",
         "name": "string",
         "role": "string",
         "company": "string",
         "industry": "string",
         "snippet": "string (FULL CONTEXT/DESCRIPTION FOUND)",
         "source": "string (e.g. LinkedIn)",
         "sourceUrl": "string (LINK TO APPLY/SOURCE)"
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
        if (trimmed.startsWith('LOG:')) {
          yield { type: 'log', message: trimmed.substring(4).trim() };
        } 
        else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const data = JSON.parse(trimmed.replace(/,$/, '')) as FoundEmail;
            data.type = (data.type?.toLowerCase() || 'unknown') as any;
            yield { type: 'result', data };
          } catch (e) {}
        }
      }
    }
  } catch (error: any) {
    yield { type: 'log', message: "Search interrupted." };
    throw error;
  }
}

export const generateColdEmail = async (
  profile: UserProfile,
  recipient: FoundEmail
): Promise<GeneratedEmail> => {
  const prompt = `
    Write a cold email to ${recipient.name} at ${recipient.company}.
    SENDER: ${profile.name}, ${profile.yearsExperience} yrs exp, Skills: ${profile.skills}.
    CONTEXT FOUND: ${recipient.snippet}
    Output JSON with "subject" and "body".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
          },
          required: ["subject", "body"],
        },
      },
    });
    return JSON.parse(response.text) as GeneratedEmail;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const generateApplicationEmail = async (
  profile: UserProfile,
  job: JobDetails
): Promise<GeneratedEmail> => {
  const prompt = `
    CANDIDATE: ${profile.name}, ${profile.yearsExperience} yrs exp, Skills: ${profile.skills}.
    JOB: ${job.companyName}, ${job.jobTitle}.
    DESCRIPTION: ${job.jobDescription}
    Generate a JSON object with 'subject' and 'body'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
          },
          required: ["subject", "body"],
        },
      },
    });
    return JSON.parse(response.text) as GeneratedEmail;
  } catch (error) {
    throw error;
  }
};
