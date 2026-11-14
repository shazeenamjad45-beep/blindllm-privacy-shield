import pytest
from backend.crypto.field import generate_random_scalar, Q, G
from backend.crypto.vandermonde import generate_vandermonde_shares, Share
from backend.crypto.lagrange import reconstruct_secret
from backend.crypto.feldman_vss import compute_commitments, verify_share
from backend.crypto.aes_gcm import encrypt_record, decrypt_record
from backend.crypto.zeroize import zeroize_bytearray, constant_time_compare

def test_vandermonde_3_of_4_reconstruction():
    secret = generate_random_scalar()
    shares, _ = generate_vandermonde_shares(secret, t=3, n=4, epoch=1)
    
    # Any 3 shares reconstruct
    recon_123 = reconstruct_secret([shares[0], shares[1], shares[2]], threshold=3)
    recon_234 = reconstruct_secret([shares[1], shares[2], shares[3]], threshold=3)
    recon_134 = reconstruct_secret([shares[0], shares[2], shares[3]], threshold=3)
    
    assert recon_123 == secret
    assert recon_234 == secret
    assert recon_134 == secret

def test_two_shares_fail_threshold():
    secret = generate_random_scalar()
    shares, _ = generate_vandermonde_shares(secret, t=3, n=4, epoch=1)
    
    with pytest.raises(ValueError):
        reconstruct_secret([shares[0], shares[1]], threshold=3)

def test_feldman_vss_genuine_and_tampered():
    secret = generate_random_scalar()
    shares, coeffs = generate_vandermonde_shares(secret, t=3, n=4, epoch=1)
    commitments = compute_commitments(coeffs)
    
    # Genuine share passes
    assert verify_share(shares[0], commitments) is True
    
    # Tampered share fails
    forged_share = Share(index=shares[0].index, value=(shares[0].value + 999) % Q, epoch=1)
    assert verify_share(forged_share, commitments) is False

def test_aes_gcm_authenticated_encryption():
    secret = generate_random_scalar()
    plaintext = b"Confidential Budget: $500,000"
    aad = {"origin": "BlindLLM-Test"}
    
    ct, nonce, tag = encrypt_record(plaintext, secret, aad)
    decrypted = decrypt_record(ct, nonce, tag, secret, aad)
    assert decrypted == plaintext

def test_zeroization():
    buf = bytearray(b"super_secret_key_material_123456")
    zeroize_bytearray(buf)
    assert buf == bytearray(len(buf))
    assert constant_time_compare(b"hash1", b"hash1") is True
    assert constant_time_compare(b"hash1", b"hash2") is False
