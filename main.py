import sys
import subprocess
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.blind_llm.pipeline import BlindLLMPipeline
from backend.blind_llm.entity_detector import EntityDetector
from backend.blind_llm.doc_extractor import extract_text_from_file
from backend.crypto.field import generate_random_scalar, Q, G
from backend.crypto.vandermonde import generate_vandermonde_shares, Share
from backend.crypto.feldman_vss import compute_commitments, verify_share
from backend.crypto.lagrange import reconstruct_secret

app = FastAPI(
    title="BlindLLM API",
    description="Privacy-Preserving Secret Sharing Architecture for Cloud LLMs (Hackathon 2026)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = BlindLLMPipeline()


class PromptInspectRequest(BaseModel):
    prompt: str
    custom_terms: Optional[List[str]] = None


class PromptExecuteRequest(BaseModel):
    prompt: str
    custom_terms: Optional[List[str]] = None
    threshold: int = 3
    num_shares: int = 4


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BlindLLM Security Engine",
        "algorithm": "3-of-4 Shamir's Secret Sharing (NIST P-256 GF(q)) + AES-256-GCM",
        "master_key_leakage": "0 bits"
    }


@app.post("/api/v1/blind/upload_doc")
async def upload_document(file: UploadFile = File(...)):
    """
    Extracts text locally from PDF, DOCX, TXT, CSV, MD documents.
    """
    try:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        extracted_text, units = extract_text_from_file(file.filename, contents)
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract readable text from document. Ensure it contains text, not just scanned images.")

        return {
            "filename": file.filename,
            "file_size": len(contents),
            "char_count": len(extracted_text),
            "units_count": units,
            "extracted_text": extracted_text
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document extraction error: {str(e)}")


@app.post("/api/v1/blind/inspect")
def inspect_prompt(req: PromptInspectRequest):
    """
    Client-side privacy scanner: detects sensitive entities without any cloud LLM calls.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    entities, blinded_prompt = EntityDetector.scan(req.prompt, req.custom_terms)
    return {
        "original_prompt": req.prompt,
        "blinded_preview": blinded_prompt,
        "detected_entities_count": len(entities),
        "entities": [
            {
                "entity_id": e.entity_id,
                "original_text": e.original_text,
                "placeholder": e.placeholder,
                "category": e.category
            } for e in entities
        ]
    }


@app.post("/api/v1/blind/execute")
def execute_blind_pipeline(req: PromptExecuteRequest):
    """
    Executes the full BlindLLM cryptographic pipeline:
    1. Entities detected and blinded.
    2. Master key K generated in GF(q) and split into threshold shares.
    3. Dictionary encrypted with AES-256-GCM.
    4. Master key zeroized.
    5. Cloud LLM receives ONLY blinded tokens (0 key bits sent).
    6. Local key reconstruction and transparent restoration.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        result = pipeline.process_prompt(
            prompt=req.prompt,
            custom_terms=req.custom_terms,
            threshold=req.threshold,
            num_shares=req.num_shares
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/crypto/verify_vss")
def test_vss_verification(tamper: bool = False):
    """
    Interactive test console for Hackathon Judges:
    Generates genuine shares + commitments, tests verification vs. simulated forgery.
    """
    secret = generate_random_scalar()
    shares, coeffs = generate_vandermonde_shares(secret, t=3, n=4, epoch=1)
    commitments = compute_commitments(coeffs)

    test_share = shares[0]
    if tamper:
        # Corrupt share by adding +42 in GF(q)
        test_share = Share(index=test_share.index, value=(test_share.value + 42) % Q, epoch=1)

    is_valid = verify_share(test_share, commitments)

    return {
        "share_index": test_share.index,
        "is_tampered": tamper,
        "feldman_vss_valid": is_valid,
        "status": "VERIFICATION_PASSED" if is_valid else "VERIFICATION_FAILED_CORRUPT_SHARE_DETECTED",
        "math_proof": "y_i * G == sum(x_i^j * C_j)"
    }


@app.get("/api/v1/crypto/test_suite")
def run_crypto_test_suite():
    """
    Runs automated cryptographic pytest suite for the judges.
    """
    t0 = time.time()
    res = subprocess.run(
        [sys.executable, "-m", "pytest", "backend/tests/", "-v"],
        capture_output=True,
        text=True
    )
    elapsed = time.time() - t0

    return {
        "exit_code": res.returncode,
        "success": (res.returncode == 0),
        "duration_seconds": round(elapsed, 3),
        "stdout": res.stdout,
        "stderr": res.stderr
    }
