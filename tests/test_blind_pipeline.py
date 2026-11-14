import pytest
from backend.blind_llm.pipeline import BlindLLMPipeline
from backend.blind_llm.entity_detector import EntityDetector

def test_entity_detection():
    prompt = "CEO Alice salary is $450,000 and project Apollo launches on Dec 12 with sk-test1234567890abcdef123456."
    entities, blinded = EntityDetector.scan(prompt)
    
    assert len(entities) >= 3
    # Ensure raw financial figure is blinded
    assert "$450,000" not in blinded
    assert "sk-test" not in blinded
    assert "[FINANCIAL_1]" in blinded or "[CREDENTIAL_" in blinded

def test_blind_llm_pipeline_execution():
    pipeline = BlindLLMPipeline()
    prompt = "The acquisition price is $12,500,000 and contact is legal@venture.com. Summarize key risks."
    
    res = pipeline.process_prompt(prompt, threshold=3, num_shares=4)
    
    assert res["security_telemetry"]["master_key_bits_leaked_to_provider"] == 0
    assert res["security_telemetry"]["plaintext_secrets_leaked_to_provider"] == 0
    assert "$12,500,000" not in res["blinded_wire_prompt"]
    assert "legal@venture.com" not in res["blinded_wire_prompt"]
    assert len(res["cryptographic_proof"]["commitments_hex"]) == 3
    assert len(res["cryptographic_proof"]["shares_preview"]) == 4
    assert res["llm_execution"]["unmasked_client_response"] is not None

def test_document_extraction():
    from backend.blind_llm.doc_extractor import extract_text_from_file
    text, units = extract_text_from_file("report.txt", b"Q3 Revenue is $5,000,000 for Acme Corp.")
    assert "Revenue is $5,000,000" in text
    assert units >= 1
