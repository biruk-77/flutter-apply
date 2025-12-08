
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, JobDetails, GeneratedEmail, JobListing, FoundEmail, StreamUpdate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchJobs = async (query: string): Promise<JobListing[]> => {
  const prompt = `
    Find 4-5 active or recent job listings for: "${query}".
    
    Your task is to extract job details, specifically looking for a contact email address for applications.
    
    Return the output strictly as a raw JSON array (no markdown code blocks, no backticks, just the JSON string).
    Each object in the array must have these fields:
    - "company": (string) Company Name
    - "title": (string) Job Title
    - "location": (string) Location or Remote
    - "email": (string or null) The application email address if found (e.g. jobs@company.com), otherwise null.
    - "snippet": (string) A short summary of the job.
    - "url": (string or null) The URL to the job post.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    if (error.message?.includes('429') || error.status === 429) {
       throw new Error("Daily search quota exceeded. Please try again later.");
    }
    throw error;
  }
};

/**
 * Standard batch search (Legacy, kept for Load More fallback if needed, but Stream is preferred)
 */
export const findContactEmails = async (
  query: string, 
  strategy: 'recruiters' | 'decision_makers' | 'active_hiring' = 'recruiters',
  count: number = 10,
  location: string = ''
): Promise<FoundEmail[]> => {
  // Reuse the stream logic but collect all results
  const results: FoundEmail[] = [];
  const generator = findContactEmailsStream(query, strategy, count, location, []);
  
  for await (const update of generator) {
    if (update.type === 'result') {
      results.push(update.data);
    }
  }
  return results;
};

/**
 * Streaming search that yields Logs and Results in real-time.
 */
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
      - Look for recent social posts (LinkedIn/Twitter/X) containing "Hiring", "Looking for ${query}", "Urgent".
      - Find the specific person who posted (e.g. "Posted by John Doe 2 days ago").
      - The 'snippet' field MUST contain the proof (e.g. "Posted on LinkedIn: We need a ${query} dev ASAP").
    `;
  } else if (strategy === 'decision_makers') {
    roleFocus = "Focus on: CEOs, Founders, CTOs.";
  } else {
    roleFocus = "Focus on: Recruiters, Talent Acquisition, Engineering Managers.";
  }

  const excludeContext = exclude.length > 0 
    ? `EXCLUDE these names/companies (already found): ${exclude.join(', ')}.`
    : '';

  const prompt = `
    You are a real-time high-speed Lead Generation Engine.
    
    QUERY: "${query}"
    LOCATION: "${location || 'Anywhere'}"
    TARGET: Find approximately ${count} NEW valid contacts. 
    ${roleFocus}
    ${excludeContext}
    
    PROTOCOL:
    You must output data in a continuous stream.
    
    1. STATUS logs: When you are performing an action (searching, analyzing, verifying), output a line starting with "LOG:".
       Example: LOG: Searching LinkedIn for Flutter Recruiters in London...
       Example: LOG: Analyzing Cheesecakelabs website for contact info...
       
    2. RESULTS: When you find a contact, output the JSON object immediately on a single line. 
       Do NOT wrap in an array []. Do NOT use markdown code blocks.
       Just one JSON object per line.
       
       JSON Schema:
       {
         "email": "string",
         "type": "recruitment" | "personal" | "general",
         "name": "string",
         "role": "string",
         "company": "string",
         "industry": "string",
         "snippet": "string",
         "source": "string"
       }
       
       Instructions for fields:
       - "industry": A short tag for the company sector (e.g. "Fintech", "Healthcare AI", "E-commerce").
       - "snippet": A very brief sentence about why this result is relevant or a company highlight (e.g. "Recently raised Series B", "Hiring for mobile roles", "Top Flutter Agency").

    STRATEGY:
    - Prioritize ACCURACY. If a direct email isn't found, look for the company's verified careers email (jobs@domain.com).
    - If you are inferring an email based on a pattern (firstname.lastname@company.com), you MUST set "source" to "AI Pattern Match".
    - Avoid duplicates.
    
    Start streaming immediately.
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType: "text/plain" is default
      },
    });

    let buffer = '';

    for await (const chunk of responseStream) {
      // FIX: chunk.text is a property, not a function in the latest SDK
      const text = chunk.text || ''; 
      buffer += text;

      // Split by newlines to handle line-by-line protocol
      let lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for LOG prefix
        if (trimmed.startsWith('LOG:')) {
          yield { type: 'log', message: trimmed.substring(4).trim() };
        } 
        // Attempt to parse as JSON Result
        else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            // Sometimes Gemini puts a comma at the end if it thinks it's making an array
            const jsonStr = trimmed.replace(/,$/, ''); 
            const data = JSON.parse(jsonStr) as FoundEmail;
            
            // Normalize type
            data.type = (data.type?.toLowerCase() || 'unknown') as any;
            
            yield { type: 'result', data };
          } catch (e) {
            // If it fails, it might be a partial line or hallucinated text, just log it as a message
            console.debug("Failed to parse JSON line:", trimmed);
            yield { type: 'log', message: `Analyzing: ${trimmed.substring(0, 50)}...` };
          }
        }
        else {
           // Treat random text as logs if it looks like a sentence
           if (trimmed.length > 5 && !trimmed.includes('```')) {
             yield { type: 'log', message: trimmed };
           }
        }
      }
    }
    
    // Process any remaining buffer
    if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('{')) {
             try {
                const data = JSON.parse(trimmed.replace(/,$/, '')) as FoundEmail;
                data.type = (data.type?.toLowerCase() || 'unknown') as any;
                yield { type: 'result', data };
             } catch (e) {}
        }
    }

  } catch (error: any) {
    console.error("Gemini stream error:", error);
    
    // Check for 429 / Quota Errors
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota exceeded')) {
        let retryTime = "later";
        // Try to extract the time from "Please retry in 2h15m..."
        const match = error.message?.match(/retry in (.*?)\./);
        if (match && match[1]) {
            retryTime = match[1];
        }
        
        const friendlyMsg = `Daily Search Limit Reached (Google API). Reset in: ${retryTime}`;
        yield { type: 'log', message: `CRITICAL: ${friendlyMsg}` };
        throw new Error(friendlyMsg);
    }

    yield { type: 'log', message: "Error: Connection interrupted." };
    throw error;
  }
}

export const generateColdEmail = async (
  profile: UserProfile,
  recipient: FoundEmail
): Promise<GeneratedEmail> => {
  const prompt = `
    Act as a professional career coach. Write a "Cold Email" for a job opportunity.
    
    SENDER: ${profile.name} (Flutter Developer, ${profile.yearsExperience} yrs exp)
    Skills: ${profile.skills}
    Portfolio: ${profile.portfolioUrl}
    Bio: ${profile.bio}
    
    RECIPIENT:
    Name: ${recipient.name}
    Role: ${recipient.role}
    Company: ${recipient.company}
    Industry: ${recipient.industry}
    Type: ${recipient.type}

    Goal: politely ask about potential Flutter/Mobile engineering roles or a quick chat.
    Tone: Short, respectful, high-impact. NOT salesy. 
    
    Output JSON with "subject" and "body".
    The body should be plain text, ready to send.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    
    const jsonText = response.text;
    if (!jsonText) throw new Error("No content generated");
    return JSON.parse(jsonText) as GeneratedEmail;
  } catch (error) {
    console.error("Gemini cold email error:", error);
    throw error;
  }
};

export const generateApplicationEmail = async (
  profile: UserProfile,
  job: JobDetails
): Promise<GeneratedEmail> => {
  
  const systemInstruction = `
    You are an expert technical career coach. Write a job application email.
    Tone: Professional, enthusiastic, confident.
  `;

  const prompt = `
    CANDIDATE: ${profile.name}, ${profile.yearsExperience} yrs exp, Skills: ${profile.skills}.
    JOB: ${job.companyName}, ${job.jobTitle}.
    DESC: ${job.jobDescription}

    Generate a JSON object with 'subject' and 'body'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
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

    const jsonText = response.text;
    if (!jsonText) throw new Error("No content generated");
    return JSON.parse(jsonText) as GeneratedEmail;
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};
