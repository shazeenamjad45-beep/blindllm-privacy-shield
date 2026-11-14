"""
Feldman Verifiable Secret Sharing (VSS).

Allows each custodian or the verification boundary to verify that a share
is valid and consistent with the committed polynomial BEFORE attempting reconstruction.

Commitments:
C_j = a_j * G for j in 0..t-1

Verification equation for share (x_i, y_i):
y_i * G == Sum_{j=0}^{t-1} (x_i^j mod q) * C_j
"""

from typing import List, Tuple
from .field import Q, G, ECPoint, point_add, point_mul
from .vandermonde import Share


def compute_commitments(coefficients: List[int]) -> List[ECPoint]:
    """Computes public commitments C_j = a_j * G for each polynomial coefficient."""
    return [point_mul(a % Q, G) for a in coefficients]


def verify_share(share: Share, commitments: List[ECPoint]) -> bool:
    """
    Verifies that share (x_i, y_i) satisfies the Feldman VSS commitment:
    y_i * G == C_0 + (x_i)*C_1 + (x_i^2)*C_2 + ...
    """
    x = share.index
    y = share.value % Q

    # Left-hand side: y_i * G
    lhs = point_mul(y, G)

    # Right-hand side: Sum_{j=0}^{t-1} (x_i^j) * C_j
    rhs = None
    x_pow = 1
    for C_j in commitments:
        term = point_mul(x_pow, C_j)
        if rhs is None:
            rhs = term
        else:
            rhs = point_add(rhs, term)
        x_pow = (x_pow * x) % Q

    # Compare points: (lhs.x == rhs.x and lhs.y == rhs.y)
    if lhs.is_infinity and rhs.is_infinity:
        return True
    if lhs.is_infinity or rhs.is_infinity:
        return False
    return (lhs.x == rhs.x) and (lhs.y == rhs.y)
