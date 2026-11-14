"""
Security and memory hygiene utilities:
- Constant-time comparison
- Buffer wiping / zeroization
"""

import hmac
import ctypes


def constant_time_compare(val1: bytes, val2: bytes) -> bool:
    """Performs constant-time byte string comparison to prevent timing attacks."""
    return hmac.compare_digest(val1, val2)


def zeroize_bytearray(buf: bytearray) -> None:
    """Overwrites sensitive bytearray memory with zeros."""
    if isinstance(buf, (bytearray, memoryview)):
        for i in range(len(buf)):
            buf[i] = 0
