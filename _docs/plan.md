Resume & Cover Letter Tailoring Tool — Project Plan
Overview
A client-heavy web app that helps a user tailor resume sections and cover letters to a specific job description (JD), using AI to extract keywords/requirements from the JD, match them against the user's profile/resume, generate tailored content, and flag ATS keyword gaps. No backend database — all user data persists locally in the browser via IndexedDB. The backend is a stateless pass-through to the user's chosen LLM provider.

Tech Stack
Frontend: React (Vite recommended for Replit speed)

Backend: Node.js + Express — stateless API proxy only (no persistence, no user accounts)

Storage: IndexedDB (client-side only), via a lightweight wrapper such as Dexie.js or localForage

LLM Providers (pluggable, user supplies own API key):

OpenAI

Anthropic

Google Gemini

Mistral

OpenCode Go (OpenAI-compatible endpoint, OPENCODE_API_KEY)

Export: Markdown (native), PDF (jsPDF or react-pdf), DOCX (docx npm package)

Core Features
1. JD Parser
User pastes a job description into a textarea.

Backend forwards JD text to the selected LLM with a prompt instructing it to extract:

Required keywords/skills

Preferred/"nice to have" keywords

Inferred industry/domain and seniority level

Output stored in-session (and optionally in IndexedDB as JD history) as structured JSON:

json
{
  "requiredKeywords": [],
  "preferredKeywords": [],
  "industry": "",
  "seniorityLevel": ""
}
2. Profile & Resume Input (dual mode)
Mode A — Structured Profile: One-time form covering skills, work history, achievements, education. Saved to IndexedDB, reusable across JDs.

Mode B — Resume Upload/Paste: User pastes or uploads an existing resume (plain text/PDF-to-text). Used as-is or merged with structured profile if both exist.

Both modes stored under a single "profile" object in IndexedDB; resume text stored separately, linked by profile ID.

No server-side storage — profile data is sent to the backend only transiently, as part of a generation request payload, and never persisted server-side.

3. Tailored Generation
Two independent action buttons:

Generate Resume — rewrites/tailors resume bullets and summary to match the parsed JD, prioritizing required keywords naturally.

Generate Cover Letter — drafts a full cover letter referencing the JD, company context if provided, and the user's profile/resume content.

Each generation call sends: JD parse result + user profile/resume + selected tone/format options to the LLM.

Export options: dropdown or per-format buttons for Markdown, PDF, DOCX. Export logic runs client-side after generation (no backend involvement).

4. ATS Gap Analysis
After generation (or on-demand before generation), the LLM is prompted to:

Compare the tailored resume/cover letter against the parsed JD's required/preferred keywords.

Infer additional industry-standard/expected keywords not explicitly listed in the JD (using its own knowledge, not a stored taxonomy).

Return a structured gap report:

json
{
  "matchScore": 0,
  "missingCritical": [],
  "missingPreferred": [],
  "inferredIndustryGaps": []
}
Blocking behavior: if missingCritical is non-empty, show a warning modal before allowing export, requiring user acknowledgment (not a hard block — user can override and export anyway).

Data Model (IndexedDB)
text
profiles: {
  id, name, skills[], workHistory[], achievements[], education[], createdAt, updatedAt
}
resumes: {
  id, profileId, rawText, source ("upload" | "paste"), createdAt
}
jdHistory: {
  id, jdText, parsedResult, createdAt
}
generations: {
  id, profileId, jdId, type ("resume" | "coverLetter"), content, atsReport, createdAt
}
Backend API (stateless)
POST /api/parse-jd — { jdText, provider, apiKey } → parsed JD JSON

POST /api/generate — { type, profile, resumeText, parsedJD, provider, apiKey } → generated content

POST /api/ats-check — { generatedContent, parsedJD, provider, apiKey } → gap report

All endpoints are provider-agnostic; a single adapter layer routes to the correct LLM SDK/API based on provider.

Suggested Build Order
Scaffold React + Node/Express project structure.

Build IndexedDB wrapper and profile/resume input forms (Feature 2).

Build JD parser flow + backend /api/parse-jd with one provider (start with OpenAI) (Feature 1).

Add generation flow (Feature 3) — resume and cover letter buttons, single provider first.

Add ATS gap analysis (Feature 4) with warning modal.

Add export (Markdown → PDF → DOCX, in that order of complexity).

Generalize backend adapter layer to support Anthropic, Gemini, Mistral, OpenCode Go.

Polish: provider/API key settings panel, JD/generation history view.

Explicit Non-Goals (out of scope)
No user authentication or accounts.

No server-side database or persistent storage of user data.

No static/curated ATS keyword taxonomy — all keyword intelligence is inferred live by the LLM.