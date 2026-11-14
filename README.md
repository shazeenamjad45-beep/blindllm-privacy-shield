# BlindLLM — Zero-Knowledge Privacy Shield & Secret Sharing Gateway for Cloud LLMs

We built and launched **BlindLLM**, a zero-knowledge privacy gateway and secret sharing architecture for cloud AI models. Designed for the **Mathematics for Systems Security: AI Pipeline Secret Sharing Track**, our team created a system that cryptographically seals sensitive data locally before transmission, allowing users and enterprises to query cloud LLMs (like Google Gemini) with mathematically proven **zero key bits and zero plaintext secrets leaked**.

---

## 👥 How Our Team Divided the Work

* **Cryptographic Core & Mathematical Security Lead ([Aima Azhar](https://github.com/Aima-Azhar  )):**
  * **Core Responsibilities:** Engineered the finite field mathematics over Galois Field $\mathbb{F}_q$ (NIST P-256 prime curve order), $(3, 4)$ Shamir's Secret Sharing using a Vandermonde polynomial matrix, discrete log commitments for Feldman's Verifiable Secret Sharing (VSS), Lagrange threshold reconstruction, proactive secret sharing refresh, AES-256-GCM authenticated encryption, and constant-time RAM zeroization.

* **Cloud AI Pipeline & Backend Architecture Lead ([Shazeen Amjad](https://github.com/shazeenamjad45-beep)):**
  * **Core Responsibilities:** Built the local entity detection engine that classifies and blinds personal names, financial numbers, credentials, and contact info into token tags (`[PERSON_1]`, `[FINANCIAL_1]`). Constructed client-side document parsers (`.pdf`, `.docx`, `.txt`, `.csv`), the live Google Gemini API pipeline with token retention constraints, the client-side transparent unmasking engine, and FastAPI REST endpoints.

* **Frontend Security & Cryptographic Telemetry Lead ([Kinza Khalid](https://github.com/Kinzakhalid593)):**
  * **Core Responsibilities:** Designed and developed the React 19 + TypeScript + Tailwind CSS application. Built the live Side-by-Side Wire Transparency View (What You See vs. What Cloud AI Sees), the real-time Cryptographic Telemetry HUD (displaying 0/256 bits leakage, 3-of-4 share hex previews, Feldman commitments, and Active Zeroize status), document drag-and-drop workspace, client authentication, and Vercel cloud deployment routing.

---

## 🚀 Key Features & How It Works

* **Automated Sensitive Entity Blinding:** Automatically scans documents and inquiries locally in your browser. Replaces sensitive personal names, corporate financials, passwords, API keys, and contact details with cryptographic placeholders before anything leaves your machine.
* **3-of-4 Shamir's Secret Sharing & Feldman VSS:** The master encryption key is split into 4 polynomial mathematical fragments. Mathematically proven that any 2 or fewer shares reveal exactly **0 bits** of the key. Feldman discrete log commitments ($C_j = a_j \cdot G$) ensure shares can be verified without compromising confidentiality.
* **Side-by-Side Wire Transparency:** A real-time audit view showing exactly what was kept private on your machine versus the blinded tokenized payload sent to Google Gemini—proving zero private data ever touches cloud servers.
* **Universal Document Intelligence & Live Gemini Integration:** Ingests resumes, financial audits, medical records, or source code. Google Gemini reasons accurately over placeholder tokens, and your local client transparently restores the real values in private RAM in ~1.5 seconds.
* **Active Defense-in-Depth Memory Zeroization:** Temporary memory buffers holding plaintext secrets and intermediate polynomials are actively purged and zeroed out immediately post-execution to protect against cold-boot RAM attacks.

---

## 🎯 Final Outcome

A fully working, enterprise-grade privacy-preserving gateway that allows individuals and organizations to harness the full intelligence of cloud LLMs on their most confidential documents—with information-theoretic mathematical guarantees that their secrets and encryption keys are never exposed.

---

🌐 **Visit our live web application:** [https://blindllm-privacy-shield.vercel.app](https://blindllm-privacy-shield.vercel.app)
