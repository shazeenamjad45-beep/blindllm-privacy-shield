"""
Lagrange Interpolation over GF(q) for 3-of-4 Secret Reconstruction.

Given any subset of t=3 distinct valid shares S_i = (x_i, y_i):
s = f(0) = Sum_{i in I} y_i * lambda_i(0) mod Q

where lambda_i(0) = Prod_{j in I, j != i} (-x_j) / (x_i - x_j) mod Q
"""

from typing import List
from .field import Q, mod_inverse
from .vandermonde import Share


def reconstruct_secret(shares: List[Share], threshold: int = 3) -> int:
    """
    Reconstructs the constant term secret f(0) from at least `threshold` shares.
    Strictly verifies that at least `threshold` distinct shares are present.
    """
    if len(shares) < threshold:
        raise ValueError(f"Insufficient shares: got {len(shares)}, threshold is {threshold}")

    # Ensure shares have distinct indices
    seen_indices = set()
    unique_shares = []
    for s in shares:
        if s.index not in seen_indices:
            seen_indices.add(s.index)
            unique_shares.append(s)

    if len(unique_shares) < threshold:
        raise ValueError("Shares must correspond to distinct custodian indices")

    # Ensure all shares belong to the same epoch
    epochs = {s.epoch for s in unique_shares[:threshold]}
    if len(epochs) > 1:
        raise ValueError("Cannot reconstruct secret from mixed epoch shares (Proactive Refresh violation)")

    selected_shares = unique_shares[:threshold]
    secret = 0

    for i, s_i in enumerate(selected_shares):
        xi = s_i.index
        yi = s_i.value % Q

        # Compute Lagrange basis polynomial lambda_i(0)
        numerator = 1
        denominator = 1

        for j, s_j in enumerate(selected_shares):
            if i != j:
                xj = s_j.index
                # (0 - xj) = -xj mod Q
                numerator = (numerator * (-xj)) % Q
                # (xi - xj) mod Q
                diff = (xi - xj) % Q
                denominator = (denominator * diff) % Q

        inv_den = mod_inverse(denominator, Q)
        lagrange_coeff = (numerator * inv_den) % Q

        term = (yi * lagrange_coeff) % Q
        secret = (secret + term) % Q

    return secret
