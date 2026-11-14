"""
MedVault Cryptographic Engine:
- 3-of-4 Vandermonde Secret Sharing
- Feldman Verifiable Secret Sharing (VSS) over NIST P-256 scalar field GF(Q)
- Lagrange Interpolation
- Proactive Share Refresh
- AES-256-GCM Authenticated Encryption
- Memory Zeroization
"""

from .field import Q, P, G, ECPoint, generate_random_scalar
from .vandermonde import Share, generate_vandermonde_shares
from .feldman_vss import compute_commitments, verify_share
from .lagrange import reconstruct_secret
from .proactive_refresh import refresh_shares
from .aes_gcm import encrypt_record, decrypt_record, derive_aes_key
from .zeroize import constant_time_compare, zeroize_bytearray

__all__ = [
    "Q",
    "P",
    "G",
    "ECPoint",
    "generate_random_scalar",
    "Share",
    "generate_vandermonde_shares",
    "compute_commitments",
    "verify_share",
    "reconstruct_secret",
    "refresh_shares",
    "encrypt_record",
    "decrypt_record",
    "derive_aes_key",
    "constant_time_compare",
    "zeroize_bytearray",
]
