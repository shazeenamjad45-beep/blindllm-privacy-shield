"""
Vandermonde-based 3-of-4 Threshold Secret Sharing over GF(q).

Matrix formulation:
[y1]   [1  x1  x1^2] [s ]
[y2] = [1  x2  x2^2] [a1]  (mod q)
[y3]   [1  x3  x3^2] [a2]
[y4]   [1  x4  x4^2]

Here:
- s = f(0) is the secret (data encryption key scalar)
- a1, a2 are degree-1 and degree-2 polynomial coefficients
- x_i in {1, 2, 3, 4} are distinct evaluation points for the 4 custodians:
  1: Patient
  2: Hospital Administration
  3: Family Doctor
  4: Security / Compliance Custodian
"""

from typing import List, Tuple
from dataclasses import dataclass
from .field import Q, generate_random_scalar


@dataclass
class Share:
    index: int      # x_i in {1, 2, 3, 4}
    value: int      # y_i = f(x_i) mod Q
    epoch: int = 1  # Epoch version for proactive refresh

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "value_hex": hex(self.value),
            "epoch": self.epoch
        }


def generate_vandermonde_shares(
    secret: int,
    t: int = 3,
    n: int = 4,
    epoch: int = 1
) -> Tuple[List[Share], List[int]]:
    """
    Generates n shares with threshold t using a polynomial f(x) over GF(q).
    Returns (shares, coefficients) where coefficients = [s, a1, a2, ...].
    """
    if t != 3 or n != 4:
        raise ValueError("MedVault standard profile enforces t=3, n=4")

    # s is constant term a_0
    a0 = secret % Q
    a1 = generate_random_scalar()
    a2 = generate_random_scalar()
    coefficients = [a0, a1, a2]

    # Evaluate polynomial at x = 1, 2, 3, 4
    shares: List[Share] = []
    for x in range(1, n + 1):
        # f(x) = a0 + a1*x + a2*x^2 mod Q
        y = (a0 + a1 * x + a2 * (x * x)) % Q
        shares.append(Share(index=x, value=y, epoch=epoch))

    return shares, coefficients
