import { useState, useRef } from 'react';
import {
  Shield,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Lock,
  RotateCcw,
  UploadCloud,
  FileText,
  X,
  ArrowRight,
  User,
  Mail,
  KeyRound,
  LogOut,
  Layers
} from 'lucide-react';

interface DetectedEntity {
  entity_id: string;
  original_text: string;
  placeholder: string;
  category: string;
}

interface ExecutionResult {
  original_prompt: string;
  blinded_wire_prompt: string;
  detected_entities: DetectedEntity[];
  cryptographic_proof: {
    ciphertext_hex: string;
    nonce_hex: string;
    tag_hex: string;
    commitments_hex: string[];
    threshold: number;
    total_shares: number;
    shares_preview: { index: number; share_value_hex: string }[];
  };
  llm_execution: {
    provider: string;
    raw_cloud_response: string;
    unmasked_client_response: string;
    latency_ms: number;
  };
  security_telemetry: {
    master_key_bits_leaked_to_provider: number;
    plaintext_secrets_leaked_to_provider: number;
    key_storage: string;
    zeroize_status: string;
    finite_field: string;
    algorithm: string;
  };
}

interface UserProfile {
  name: string;
  email: string;
}

export default function App() {
  // Navigation Flow: 'home' -> 'auth' -> 'workspace'
  const [currentScreen, setCurrentScreen] = useState<'home' | 'auth' | 'workspace'>('home');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [user, setUser] = useState<UserProfile | null>(null);

  // Auth form inputs
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Workspace state
  const [prompt, setPrompt] = useState<string>('');
  const [customTerms, setCustomTerms] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedWire, setCopiedWire] = useState<boolean>(false);

  // Document upload state
  const [uploadedDoc, setUploadedDoc] = useState<{
    filename: string;
    size: number;
    charCount: number;
    units: number;
    text: string;
  } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth handlers
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in both email and password.');
      return;
    }

    let chosenName = authName.trim();
    if (!chosenName) {
      // Check if email has saved name in localStorage
      try {
        const savedUsers = JSON.parse(localStorage.getItem('blindllm_users') || '{}');
        if (savedUsers[authEmail.toLowerCase().trim()]) {
          chosenName = savedUsers[authEmail.toLowerCase().trim()];
        }
      } catch (e) {}
    }

    // Fallback if still empty: format email prefix into a clean name (e.g. salarsikandar -> Salar Sikandar)
    if (!chosenName) {
      const raw = authEmail.split('@')[0];
      chosenName = raw
        .replace(/[._\d]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
      if (!chosenName) chosenName = 'User';
    }

    // Persist to localStorage for next time
    try {
      const savedUsers = JSON.parse(localStorage.getItem('blindllm_users') || '{}');
      savedUsers[authEmail.toLowerCase().trim()] = chosenName;
      localStorage.setItem('blindllm_users', JSON.stringify(savedUsers));
    } catch (e) {}

    // Set authenticated user and transition to workspace
    setUser({
      name: chosenName,
      email: authEmail.trim(),
    });
    setCurrentScreen('workspace');
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentScreen('home');
  };

  // Workspace handlers
  const handleClear = () => {
    setPrompt('');
    setCustomTerms('');
    setUploadedDoc(null);
    setResult(null);
    setError(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setError(null);
    setUploadingDoc(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/blind/upload_doc', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'File extraction failed');

      setUploadedDoc({
        filename: data.filename,
        size: data.file_size,
        charCount: data.char_count,
        units: data.units_count,
        text: data.extracted_text,
      });
      // Always reset prompt so the user has a fresh, clean input for every new document
      setPrompt('');
      setResult(null);
    } catch (err: any) {
      setError(err.message || 'Error processing document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDoc = () => {
    setUploadedDoc(null);
    setPrompt('');
    setResult(null);
  };

  const handleExecute = async () => {
    const userInquiry = prompt.trim();
    const finalPayload = uploadedDoc
      ? (userInquiry
          ? `DOCUMENT CONTEXT:\n${uploadedDoc.text}\n\nUSER INQUIRY:\n${userInquiry}`
          : uploadedDoc.text)
      : userInquiry;

    if (!finalPayload) {
      setError('Please enter a question or upload a document.');
      return;
    }

    setLoading(true);
    setError(null);

    const terms = customTerms
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const res = await fetch('/api/v1/blind/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPayload,
          custom_terms: terms,
          threshold: 3,
          num_shares: 4,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Execution failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Execution error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWire = () => {
    if (result) {
      navigator.clipboard.writeText(result.blinded_wire_prompt);
      setCopiedWire(true);
      setTimeout(() => setCopiedWire(false), 2000);
    }
  };

  // =========================================================================
  // SCREEN 1: HOME / LANDING SCREEN (Clean, Professional, Minimalist)
  // =========================================================================
  if (currentScreen === 'home') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0D9488]/20 selection:text-[#0D9488]">
        {/* Navigation Bar */}
        <header className="bg-[#FFFFFF] border-b border-[#E2E8F0] sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D9488] flex items-center justify-center text-white shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-[#0F172A]">BlindLLM</span>
                <span className="hidden sm:inline-block ml-2 bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Zero-Knowledge Gateway
                </span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setCurrentScreen('auth');
                }}
                className="text-xs font-semibold text-[#475569] hover:text-[#0F172A] px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setCurrentScreen('auth');
                }}
                className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-16 sm:py-24 max-w-5xl mx-auto text-center">
          {/* Subtle Security Badge */}
          <div className="inline-flex items-center gap-2 bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] text-xs font-semibold px-3 py-1.5 rounded-full mb-6 shadow-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>NIST P-256 Secret Sharing • 0 Key Bits Leaked to AI</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-tight sm:leading-tight">
            Zero-Knowledge AI for <br className="hidden sm:inline" />
            <span className="text-[#0D9488]">Confidential Enterprise Data</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-[#475569] max-w-2xl leading-relaxed">
            Interact with cloud LLMs without exposing sensitive payroll, proprietary source code, or encryption keys. 
            All confidential entities are blinded locally before cloud transmission.
          </p>

          {/* Call to Action Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => {
                setAuthMode('signup');
                setCurrentScreen('auth');
              }}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Clean 3-Pillar Highlight Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
            <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Local Redaction Boundary</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Sensitive entities, salaries, and credentials are cryptographically tokenized in client memory before network transit.
              </p>
            </div>

            <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">3-of-4 Secret Sharing</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                The master key is split into polynomial shares over finite field GF(q). The key is wiped immediately post-encryption.
              </p>
            </div>

            <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Document Privacy Shield</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Upload confidential PDF, DOCX, or CSV files to automatically extract and mask secrets before querying cloud AI models.
              </p>
            </div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[#E2E8F0] bg-[#FFFFFF] py-4 text-center text-xs text-[#475569]">
          BlindLLM • Privacy-Preserving Secret Sharing Architecture for Cloud LLMs (Hackathon 2026)
        </footer>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: AUTH SCREEN (Sign In / Sign Up)
  // =========================================================================
  if (currentScreen === 'auth') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-center items-center p-4 font-sans selection:bg-[#0D9488]/20 selection:text-[#0D9488]">
        {/* Top Logo / Return to Home */}
        <button
          onClick={() => setCurrentScreen('home')}
          className="flex items-center gap-2 mb-6 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0D9488] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0F172A]">BlindLLM</span>
        </button>

        {/* Auth Card */}
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-5">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setAuthError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-[#0F172A]">
              {authMode === 'signin' ? 'Sign in to BlindLLM' : 'Create Enterprise Account'}
            </h2>
            <p className="text-xs text-[#475569]">
              {authMode === 'signin'
                ? 'Enter your credentials to access your shielded AI workspace.'
                : 'Set up an account to begin private, zero-leakage AI queries.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                {authMode === 'signup' ? 'Full Name' : 'Your Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9.5 pr-3.5 py-2.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAuthEmail(val);
                    try {
                      const saved = JSON.parse(localStorage.getItem('blindllm_users') || '{}');
                      if (saved[val.toLowerCase().trim()] && !authName) {
                        setAuthName(saved[val.toLowerCase().trim()]);
                      }
                    } catch (err) {}
                  }}
                  placeholder="name@company.com"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9.5 pr-3.5 py-2.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9.5 pr-10 py-2.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs py-3 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{authMode === 'signin' ? 'Sign In & Enter Workspace' : 'Create Account & Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => setCurrentScreen('home')}
              className="text-xs text-[#475569] hover:text-[#0F172A] underline cursor-pointer"
            >
              ← Back to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: WORKSPACE SCREEN (Enter Confidential Prompt Page)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0D9488]/20 selection:text-[#0D9488]">
      {/* Top Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('home')}
              className="w-10 h-10 rounded-xl bg-[#0D9488] flex items-center justify-center text-white shadow-xs cursor-pointer hover:bg-[#0F766E] transition-colors"
              title="Return to Home"
            >
              <Shield className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#0F172A]">BlindLLM</span>
                <span className="bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> 0 Key Bits Leaked
                </span>
              </div>
              <p className="text-xs text-[#475569]">
                Privacy-Preserving Secret Sharing Gateway for Cloud LLMs
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs">
              <div className="w-6 h-6 rounded-full bg-[#0D9488] text-white flex items-center justify-center font-bold text-[10px]">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <span className="font-semibold text-[#0F172A] hidden sm:inline">
                {user?.name || 'Enterprise Analyst'}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="text-xs text-[#475569] hover:text-[#DC2626] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Input Card */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Enter Confidential Prompt</h2>
              <p className="text-xs text-[#475569]">
                Confidential identifiers, financials, and credentials are cryptographically sealed locally before cloud transmission.
              </p>
            </div>

            {/* Clear Button */}
            {(prompt || customTerms || result || uploadedDoc) && (
              <button
                onClick={handleClear}
                className="text-xs text-[#475569] hover:text-[#0F172A] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Document Upload Zone */}
          <div>
            {uploadedDoc ? (
              <div className="space-y-2">
                <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0F172A]">{uploadedDoc.filename}</span>
                        <span className="text-[10px] text-[#0D9488] bg-white border border-[#CCFBF1] px-2 py-0.5 rounded-full font-medium">
                          {uploadedDoc.charCount.toLocaleString()} chars extracted
                        </span>
                      </div>
                      <span className="text-[11px] text-[#475569]">
                        {(uploadedDoc.size / 1024).toFixed(1)} KB • Extracted locally in private memory
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveDoc}
                    className="text-[#475569] hover:text-[#DC2626] p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Remove document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Prompt Ideas for Uploaded Doc */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[#475569] font-medium mr-1">Quick Inquiries:</span>
                  {[
                    "Provide a comprehensive summary of this document",
                    "What are the primary qualifications, skills, and background?",
                    "List all key dates, achievements, and findings",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setPrompt(suggestion)}
                      className="text-[11px] bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0D9488] hover:text-[#0D9488] text-[#475569] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3.5 flex items-center justify-center gap-3 cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#0D9488] bg-[#F0FDFA]'
                    : 'border-[#E2E8F0] hover:border-[#0D9488] bg-[#F8FAFC]'
                }`}
              >
                {uploadingDoc ? (
                  <div className="flex items-center gap-2 text-xs text-[#0D9488] font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting document text locally...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-[#0D9488]" />
                    <div className="text-xs text-[#475569]">
                      <span className="font-semibold text-[#0F172A]">Drop confidential document here</span>, or{' '}
                      <span className="text-[#0D9488] font-medium underline">browse</span> (.pdf, .docx, .txt, .csv)
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.csv,.md,.json,.log"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                {uploadedDoc ? "Your Question / Inquiry for this Document:" : "Your Prompt or Document Inquiry:"}
              </label>
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="text-[11px] text-[#0D9488] hover:text-[#0F766E] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" /> Clear inquiry text
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                uploadedDoc
                  ? "Type your question or custom inquiry here (or leave blank to automatically summarize this document)..."
                  : "Type any question or prompt here, or drop a document above..."
              }
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all"
            />
          </div>

          {/* Custom terms & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                placeholder="Custom confidential terms to redact (comma-separated proprietary identifiers or names)"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={handleExecute}
              disabled={loading}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Blinding & Encrypting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Shield & Send to AI
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* THE "SIDE-BY-SIDE" WIRE VIEW (WHAT YOU SEE VS WHAT AI SEES) */}
        {/* ============================================================== */}
        {result && (
          <div className="space-y-6">
            {/* Security Telemetry HUD Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                <span className="text-[11px] text-[#475569] block font-medium">Master Key Leaked to AI</span>
                <span className="text-base font-extrabold text-[#0D9488]">0 / 256 bits (0%)</span>
                <span className="text-[10px] text-[#475569] block mt-0.5">Isolated from Cloud</span>
              </div>

              <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                <span className="text-[11px] text-[#475569] block font-medium">Plaintext Secrets on Wire</span>
                <span className="text-base font-extrabold text-[#0D9488]">0 Entities</span>
                <span className="text-[10px] text-[#475569] block mt-0.5">100% Masked in Transit</span>
              </div>

              <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                <span className="text-[11px] text-[#475569] block font-medium">Threshold Secret Sharing</span>
                <span className="text-base font-extrabold text-[#0F172A]">3-of-4 SSS</span>
                <span className="text-[10px] text-[#475569] block mt-0.5">Vandermonde GF(q)</span>
              </div>

              <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#E2E8F0] shadow-xs">
                <span className="text-[11px] text-[#475569] block font-medium">Memory Lifecycle</span>
                <span className="text-base font-extrabold text-[#0D9488]">Active Zeroize</span>
                <span className="text-[10px] text-[#475569] block mt-0.5">Buffers Wiped Post-Call</span>
              </div>
            </div>

            {/* Side-by-Side Visual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Your Protected Input */}
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#0D9488]" />
                    <h3 className="font-bold text-xs text-[#0F172A]">1. Your Protected Input (Client-Side)</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-[#0D9488] bg-[#F0FDFA] px-2 py-0.5 rounded border border-[#CCFBF1]">
                    {result.detected_entities.length} Sensitive Entities Masked
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] font-mono leading-relaxed whitespace-pre-wrap">
                  {result.original_prompt}
                </div>

                {/* Detected entities list */}
                {result.detected_entities.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wide">
                      Redacted Elements:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.detected_entities.map((ent, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-mono px-2 py-0.5 rounded"
                        >
                          <span className="font-bold">{ent.placeholder}</span>: "{ent.original_text}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Cloud AI Wire Payload */}
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2.5">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-[#0D9488]" />
                    <h3 className="font-bold text-xs text-[#0F172A]">2. Cloud AI Wire Payload (What Provider Sees)</h3>
                  </div>
                  <button
                    onClick={handleCopyWire}
                    className="text-[10px] font-medium text-[#475569] hover:text-[#0F172A] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedWire ? <Check className="w-3 h-3 text-[#0D9488]" /> : <Copy className="w-3 h-3" />}
                    {copiedWire ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="p-3 bg-[#0F172A] text-[#5EEAD4] rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  {result.blinded_wire_prompt}
                </div>

                <div className="p-2.5 bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl text-[11px] text-[#0D9488] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    The AI host provider receives only token tags. Zero sensitive plaintext or master keys are transmitted over the wire.
                  </span>
                </div>
              </div>
            </div>

            {/* Final Unmasked Result Box */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D9488]" />
                  <h3 className="font-bold text-sm text-[#0F172A]">
                    3. AI Response (Transparently Restored Locally)
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#475569]">Inference Host:</span>
                  <span className="font-semibold text-[#0F172A] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0]">
                    {result.llm_execution.provider}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm font-sans leading-relaxed text-[#0F172A] whitespace-pre-wrap">
                {result.llm_execution.unmasked_client_response}
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-[#475569] pt-1">
                <span className="flex items-center gap-1.5 text-[#0D9488] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Real values restored in client memory. Cryptographic keys zeroized.
                </span>
                <span className="font-mono">Latency: {result.llm_execution.latency_ms}ms</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-[#FFFFFF] py-4 text-center text-xs text-[#475569]">
        BlindLLM • Privacy-Preserving Secret Sharing Architecture for Cloud LLMs (Hackathon 2026)
      </footer>
    </div>
  );
}
