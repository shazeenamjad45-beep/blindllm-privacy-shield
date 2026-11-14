"""
AES-256-GCM Authenticated Encryption & Decryption.

Provides authenticated confidentiality for patient medical documents.
- Uses 256-bit Data Encryption Key derived from the finite field secret scalar.
- Generates a unique 96-bit CSPRNG nonce for every encryption.
- Binds metadata (record_id, patient_id, epoch) as Authenticated Associated Data (AAD).
- Produces a 128-bit authentication tag to detect any tampering or bit flips.
"""

import os
import json
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes


def derive_aes_key(secret_scalar: int, salt: bytes = b"medvault-aes-key-salt") -> bytes:
    """Derives a 256-bit AES key from the secret scalar using HKDF-SHA256."""
    scalar_bytes = secret_scalar.to_bytes(32, byteorder="big")
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=b"medvault-record-encryption-v1"
    )
    return hkdf.derive(scalar_bytes)


def encrypt_record(
    plaintext: bytes,
    secret_scalar: int,
    aad_dict: Dict[str, Any]
) -> Tuple[bytes, bytes, bytes]:
    """
    Encrypts medical document bytes using AES-256-GCM.
    Returns: (ciphertext_without_tag, nonce, tag)
    """
    aes_key = derive_aes_key(secret_scalar)
    aesgcm = AESGCM(aes_key)

    # 12-byte (96-bit) cryptographically secure random nonce
    nonce = os.urandom(12)

    # Serialize canonical AAD
    aad_bytes = json.dumps(aad_dict, sort_keys=True).encode("utf-8")

    # AESGCM in cryptography package appends the 16-byte tag to the ciphertext
    ct_with_tag = aesgcm.encrypt(nonce, plaintext, aad_bytes)
    ciphertext = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]

    return ciphertext, nonce, tag


def decrypt_record(
    ciphertext: bytes,
    nonce: bytes,
    tag: bytes,
    secret_scalar: int,
    aad_dict: Dict[str, Any]
) -> bytes:
    """
    Decrypts medical document bytes using AES-256-GCM.
    Raises InvalidTag exception if ciphertext, tag, nonce, or AAD was tampered with.
    """
    aes_key = derive_aes_key(secret_scalar)
    aesgcm = AESGCM(aes_key)

    aad_bytes = json.dumps(aad_dict, sort_keys=True).encode("utf-8")
    ct_with_tag = ciphertext + tag

    # Raises InvalidTag if verification fails
    return aesgcm.decrypt(nonce, ct_with_tag, aad_bytes)
