## 1. Set up an empty project with a passing test
Goal: Establish a minimal React/Vite frontend and Node/Express backend workspace that can be installed and tested successfully.
Description: Create the empty project structure, package scripts, and test runner configuration for the client-heavy resume and cover-letter tailoring tool. Add one trivial test that verifies the test command works, and document the commands needed to install dependencies and run the test; do not implement product features.

## 2. Define the frontend application shell
Goal: Provide a navigable shell for the tailoring workflow without connecting any real data or AI services.
Description: Build the React layout with clear areas for profile/resume input, job description input, generated content, and settings/history. Add placeholder states and navigation or tabs so a user can understand the intended workflow, while keeping the placeholders intentionally non-functional.

## 3. Define shared domain types and validation rules
Goal: Create a single contract for profiles, resumes, parsed job descriptions, generations, and ATS reports.
Description: Define the TypeScript types or equivalent runtime schemas for the data objects described in the plan, including generation type and resume source values. Add validation rules for required fields, arrays, scores, and malformed provider responses so both browser code and server routes can rely on the same contract.

## 4. Build the IndexedDB persistence layer
Goal: Persist client-owned profile, resume, job-description history, and generation records in IndexedDB.
Description: Implement a small browser storage wrapper using the selected IndexedDB library and create stores for profiles, resumes, JD history, and generations. Include create, read, update, and delete operations where appropriate, profile-to-resume linking by profile ID, timestamps, and tests that exercise persistence behavior without a backend database.

## 5. Build the structured profile editor
Goal: Let a user create and edit reusable skills, work history, achievements, education, and basic profile details.
Description: Implement the structured profile form with repeatable fields for list-based information and validation for incomplete entries. Load an existing profile from IndexedDB when available and save changes back to the browser while showing success and validation states.

## 6. Add resume paste and text-file input
Goal: Let a user provide an existing resume as plain text and associate it with the active profile.
Description: Add a paste area and a plain-text file picker that normalize their content into one resume text representation. Save the text in the resumes store with the correct profile ID and source value, and show the user which source is currently active without sending data to the server.

## 7. Add PDF resume text extraction
Goal: Convert a user-selected text-based PDF resume into editable resume text in the browser.
Description: Integrate a client-side PDF text extraction library and connect it to the resume upload flow. Handle empty or image-only PDFs, extraction failures, large files, and cancellation with actionable messages; never upload or persist the original PDF on the server.

## 8. Implement provider and API-key settings
Goal: Let the user choose an LLM provider and manage the key or endpoint settings needed for requests.
Description: Build a settings panel covering OpenAI first, with a provider abstraction that can later support Anthropic, Gemini, Mistral, and OpenCode Go. Store provider preferences and API keys only in browser-managed storage or session state as appropriate, clearly warn that keys are user-supplied, and ensure keys are never logged or persisted by the backend.

## 9. Scaffold the stateless Express API
Goal: Provide a backend that accepts transient requests and returns structured responses without storing user data.
Description: Create the Express server, JSON parsing, environment configuration, health check, and consistent error response format for the three planned endpoints. Add request-size limits, basic input validation, and tests proving that requests are not written to a database or server-side file.

## 10. Create the provider adapter interface
Goal: Isolate provider-specific LLM request and response handling behind one backend interface.
Description: Define an adapter contract for structured parsing, content generation, and ATS analysis, including timeout and provider error behavior. Implement a stub adapter used by tests so API route behavior can be verified without making paid external calls, and document the expected normalized output.

## 11. Implement the OpenAI adapter
Goal: Support OpenAI as the first real LLM provider for all planned operations.
Description: Implement the OpenAI adapter using the server-side request path and environment-safe configuration, with prompts that request only the structured or generated output needed by each operation. Parse and validate the response, handle refusal, rate-limit, timeout, and malformed-JSON cases, and add mocked adapter tests without exposing a user API key.

## 12. Build the job-description input flow
Goal: Let a user paste a job description and submit it for parsing.
Description: Add the job-description textarea, character guidance, clear/reset behavior, loading state, and validation for empty or excessively large input. Keep the current JD in the client workflow and prepare the UI to display parsed results and errors returned by the backend.

## 13. Implement the `/api/parse-jd` endpoint
Goal: Return normalized required keywords, preferred keywords, industry, and seniority from a submitted job description.
Description: Implement the parse route using the provider adapter interface and validate the request fields before calling the provider. Validate the normalized response against the shared schema, return safe user-facing errors, and add route tests for valid input, invalid input, provider failure, and malformed provider output.

## 14. Display parsed job-description insights
Goal: Make the extracted requirements understandable and editable before generation.
Description: Render required and preferred keywords, inferred industry, and seniority level in the frontend after a successful parse. Provide clear empty/error states and let the user correct or remove inaccurate extracted values in the current session before those values are used downstream.

## 15. Save and restore job-description history
Goal: Preserve parsed job descriptions locally so users can return to previous applications.
Description: Save the job-description text and parsed result as a JD history record in IndexedDB after a successful parse. Add a history view that lists records by creation time, restores a selected record into the workflow, and supports deleting a local record with an explicit destructive-action confirmation.

## 16. Implement the `/api/generate` endpoint
Goal: Generate either tailored resume content or a tailored cover letter from the current inputs.
Description: Implement the generation route for the two allowed types, accepting the parsed JD, profile, resume text, and selected tone/format options as transient input. Route through the adapter, validate the generated response, reject unsupported types or missing context, and add tests for both generation modes and representative failures.

## 17. Build tailored resume generation
Goal: Let the user generate a resume tailored to the active job description.
Description: Connect the Generate Resume action to the generation endpoint and show progress, result, retry, and error states. Present the returned summary and bullet content in a readable editor or preview, while preserving the original profile and resume text so generation never overwrites source data.

## 18. Build tailored cover-letter generation
Goal: Let the user generate a cover letter tailored to the active job description.
Description: Connect the Generate Cover Letter action to the same generation endpoint with cover-letter-specific context and tone options. Display the result in an editable preview, support retrying a failed request, and keep the generated cover letter separate from generated resume records.

## 19. Persist and restore generated content
Goal: Keep successful resume and cover-letter generations available locally for later review.
Description: Save each successful generation with its profile ID, JD ID, type, content, ATS report when available, and creation timestamp in IndexedDB. Add a generation history view that can restore a result into the preview and distinguish resume generations from cover letters without exposing data to the server.

## 20. Implement the `/api/ats-check` endpoint
Goal: Return a structured match score and keyword-gap report for generated content.
Description: Implement the ATS route using the provider adapter, comparing generated content against the parsed JD and asking the LLM for inferred industry gaps without a static taxonomy. Validate score bounds and all gap arrays, handle missing inputs and provider failures, and add tests for complete, empty-gap, and malformed reports.

## 21. Build ATS gap analysis in the frontend
Goal: Show keyword coverage and missing critical, preferred, and inferred gaps for generated content.
Description: Add an on-demand and post-generation ATS analysis action that calls the ATS endpoint for the selected generated result. Render the match score and categorized gaps with clear labels, loading states, retry behavior, and an explanation that the analysis is advisory rather than a guarantee of ATS performance.

## 22. Add the critical-gap export warning
Goal: Require acknowledgment before exporting content that has missing critical keywords while still allowing an override.
Description: When the current ATS report contains missingCritical items, show a warning modal before any export begins. Include the missing terms, require an explicit acknowledgment, allow the user to cancel or continue, and ensure no warning appears when there are no critical gaps or no ATS report.

## 23. Add Markdown export
Goal: Let users download the selected generated resume or cover letter as Markdown.
Description: Convert the editable generated content into a deterministic Markdown document with appropriate headings and spacing. Add a download action that works entirely in the browser, uses a safe filename, and runs through the critical-gap warning flow when applicable.

## 24. Add PDF export
Goal: Let users download generated content as a readable PDF.
Description: Implement client-side PDF generation with predictable typography, page breaks, margins, and support for the content structures produced by both generation modes. Handle long documents and export errors gracefully, and reuse the same warning and filename behavior as Markdown export.

## 25. Add DOCX export
Goal: Let users download generated content as an editable DOCX document.
Description: Convert generated resume and cover-letter content into a DOCX with sensible paragraphs, headings, lists, and basic document metadata. Keep conversion client-side, test representative content and long documents, and reuse the ATS acknowledgment gate before downloading.

## 26. Add remaining LLM provider adapters
Goal: Support Anthropic, Google Gemini, Mistral, and OpenCode Go through the existing adapter interface.
Description: Implement one adapter per provider using the normalized parse, generation, and ATS contracts, including each provider's endpoint, authentication, response parsing, and failure mapping. Add mocked contract tests for every provider and make provider selection fail clearly when configuration is incomplete; do not change the stateless storage boundary.

## 27. Harden privacy and request safety
Goal: Ensure user profile, resume, and API-key data stay within the intended client-to-provider request boundary.
Description: Audit frontend logs, server logs, error responses, request payload handling, and dependency configuration for accidental sensitive-data exposure. Add redaction tests, enforce that the backend does not persist request bodies, and document the local-only storage and transient forwarding behavior in the settings UI.

## 28. Add end-to-end workflow coverage
Goal: Verify the main user journey from profile and JD input through generation, analysis, and export.
Description: Add browser-level tests using mocked API responses and IndexedDB that cover creating a profile, importing resume text, parsing a JD, generating both content types, running ATS analysis, acknowledging a critical-gap warning, and downloading each export format. Include failure and recovery cases without making real LLM calls.

## 29. Polish accessibility and responsive behavior
Goal: Make the tailoring workflow usable with keyboard navigation, assistive technology, and small screens.
Description: Audit labels, focus order, live regions, dialog focus trapping, color contrast, error announcements, and keyboard access for forms, previews, history, and export controls. Add responsive layouts for common phone and tablet widths and automated checks for the highest-risk accessibility regressions.

## 30. Document setup, privacy boundaries, and manual verification
Goal: Give a new contributor enough information to run and validate the complete tool safely.
Description: Update project documentation with install commands, test commands, provider configuration, local IndexedDB behavior, API route contracts, export limitations, and the manual acceptance checklist. Include the explicit non-goals—no accounts, no server-side user-data persistence, and no curated ATS taxonomy—so future work does not silently expand scope.