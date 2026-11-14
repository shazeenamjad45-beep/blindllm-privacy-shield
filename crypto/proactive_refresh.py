"""
Proactive Share Refresh.

Allows custodians to refresh their shares periodically without changing
the underlying secret key s = f(0).

Mathematical foundation:
1. Generate a zero-constant blinding polynomial r(x) = b1*x + b2*x^2 mod Q.
   Notice r(0) = 0.
2. For each custodian i in {1, 2, 3, 4}:
   y_i(new) = (y_i(old) + r(x_i)) mod Q.
3. Update commitments:
   C_0(new) = C_0(old)             [since b0 = 0]
   C_j(new) = C_j(old) + b_j * G   [for j in {1, 2}]
4. The underlying secret s remains unchanged:
   f_new(0) = f_old(0) + r(0) = s.
5. Mixing shares from different epochs will fail to reconstruct the secret!
"""

from typing import List, Tuple
from .field import Q, G, ECPoint, generate_random_scalar, point_add, point_mul
from .vandermonde import Share


def refresh_shares(
    current_shares: List[Share],
    current_commitments: List[ECPoint]
) -> Tuple[List[Share], List[ECPoint], int]:
    """
    Refreshes the given shares and commitments for the next epoch.
    Returns (new_shares, new_commitments, next_epoch).
    """
    if not current_shares:
        raise ValueError("Cannot refresh empty share list")

    current_epoch = current_shares[0].epoch
    next_epoch = current_epoch + 1

    # Blinding coefficients for r(x) with r(0) = 0
    b1 = generate_random_scalar()
    b2 = generate_random_scalar()

    # Update shares
    refreshed_shares: List[Share] = []
    for s in current_shares:
        x = s.index
        # r(x) = b1*x + b2*x^2 mod Q
        rx = (b1 * x + b2 * (x * x)) % Q
        new_val = (s.value + rx) % Q
        refreshed_shares.append(Share(index=x, value=new_val, epoch=next_epoch))

    # Update commitments:
    # C_0 remains unchanged
    # C_1_new = C_1_old + b1 * G
    # C_2_new = C_2_old + b2 * G
    c0 = current_commitments[0]
    c1 = point_add(current_commitments[1], point_mul(b1, G))
    c2 = point_add(current_commitments[2], point_mul(b2, G))
    refreshed_commitments = [c0, c1, c2]

    return refreshed_shares, refreshed_commitments, next_epoch
