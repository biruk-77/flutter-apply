
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
 * Streams contact email findings by querying professional networks via Google Search.
 */
export async function* findContactEmailsStream(
  query: string, 
  strategy: 'recruiters' | 'decision_makers' | 'active_hiring' = 'recruiters',
  count: number = 10,
  location: string = '',
  exclude: string[] = []
): AsyncGenerator<StreamUpdate, void, unknown> {
  
  const prompt = `
    Find ~${count} professional contacts related to: "${query}" in "${location || 'Anywhere'}".
    Focus: ${strategy}.
    Return JSON objects, one per line.
    {
      "email": "string",
      "type": "recruitment" | "personal" | "general",
      "name": "string",
      "role": "string",
      "company": "string",
      "snippet": "string (Context found)",
      "sourceUrl": "string"
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
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const data = JSON.parse(trimmed) as FoundEmail;
            yield { type: 'result', data };
          } catch (e) {}
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
    SENDER: ${profile.name}, ${profile.yearsExperience} yrs exp, Skills: ${profile.skills}. Bio: ${profile.bio}.
    Output JSON with "subject" and "body".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
    return JSON.parse(response.text || '{}') as GeneratedEmail;
  } catch (error) {
    throw error;
  }
};

/**
 * Generates an application email based on specific job details and candidate profile.
 */
export const generateApplicationEmail = async (
  profile: UserProfile,
  job: JobDetails
): Promise<GeneratedEmail> => {
  const prompt = `
    Generate a high-converting, personalized application email based on the following details.
    CANDIDATE: ${profile.name}, ${profile.yearsExperience} yrs exp, Skills: ${profile.skills}.
    JOB: ${job.companyName}, ${job.jobTitle}.
    DESCRIPTION: ${job.jobDescription}
    Output JSON with 'subject' and 'body'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
    return JSON.parse(response.text || '{}') as GeneratedEmail;
  } catch (error) {
    throw error;
  }
};
