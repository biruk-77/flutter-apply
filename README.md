
# 🚀 FlutterApply AI - Pro 

**Automate your job search. Land your dream Flutter role.**

FlutterApply AI is a professional-grade assistant designed for Flutter developers. It combines powerful web-scraping agents with high-reasoning Gemini 3 models to find hidden opportunities, extract recruiter contact details, and generate hyper-personalized application emails that actually get opened.

---

## 🌟 Key Features

### 1. Direct Job Generator
Scan the web for live Flutter job listings. Our AI doesn't just find links; it analyzes the job requirements to help you decide if it's the right fit.
- **AI Analysis:** Automatically summarizes complex job descriptions.
- **One-Click Drafting:** Transfer job details directly into the email composer.
- **Source Grounding:** All results are grounded in real Google Search data.

### 2. Lead Prospector & Email Finder
Target the right people. Skip generic HR portals and find direct contact information for hiring managers and technical recruiters.
- **Infinity Mode:** An autonomous agent that continuously crawls professional networks to build a massive lead list while you sleep.
- **Strategy Selection:** Target specifically for "Active Hiring," "Recruiters," or "Decision Makers."
- **Full Context:** View the original source snippet (LinkedIn, Portfolios, Twitter) to understand where the contact came from.

### 3. AI Cold-Pitch Engine
Stop sending generic resumes. Our engine uses your **Developer Profile** to craft unique pitches.
- **Skills Matching:** Highlights your specific expertise (e.g., BLoC, Riverpod, Firebase) based on the job requirements.
- **Gmail Integration:** One click to open a pre-filled compose window in your browser.
- **Bulk Export:** Select multiple leads and copy all details or just emails for BCC campaigns.

---

## 🛠 Technical Architecture

- **Frontend:** React 19 + TypeScript + Tailwind CSS.
- **Icons:** Lucide-React.
- **Intelligence:** Google Gemini 3 (Pro & Flash) for high-speed search and deep reasoning.
- **Backend:** Firebase (Authentication & Firestore) for persistent developer profiles.
- **Search:** Google Search Grounding for real-time web access.

---

## 🚀 Getting Started

### Prerequisites
1. **Gemini API Key:** Ensure your environment has access to the Google Generative AI API.
2. **Firebase Setup:** 
   - Enable **Google Auth** and **Email/Password** in your Firebase console.
   - Set up a **Firestore** database to save profiles.

### Usage Flow
1. **Guest Access:** You can search for jobs and leads immediately without an account.
2. **Personalization:** Sign in and head to **My Profile** to input your years of experience, bio, and technical stack.
3. **Generate:** Use the **Job Generator** for specific roles, or **Email Finder** for broader prospecting.
4. **Deploy:** Copy the generated AI draft or send it directly via the Gmail integration.

---

## 🔒 Security & Privacy
- **Direct Keys:** Your API keys are handled securely via environment variables.
- **Local Persistence:** Profile data is mirrored in LocalStorage for offline-first resilience.
- **Permissions:** The app requests zero unnecessary permissions (No camera or location required).

---

## 📈 Future Roadmap
- [ ] **Resume Parsing:** Upload a PDF to auto-fill your developer profile.
- [ ] **Application Tracking:** A built-in CRM to track which leads you've already emailed.
- [ ] **Scheduled Follow-ups:** AI-reminders to follow up on unanswered pitches.

---
*Created with ❤️ for the Flutter Community.*
