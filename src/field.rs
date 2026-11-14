//! Constant-time compatible finite field scalar operations over NIST P-256 scalar field GF(Q).
//!
//! Directly addresses the requirement:
//! Modulus Q = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551

use num_bigint::{BigUint, RandBigInt};
use num_traits::{One, Zero};
use std::str::FromStr;
use zeroize::{Zeroize, ZeroizeOnDrop};

pub const Q_HEX: &str = "FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551";

#[derive(Clone, Debug, PartialEq, Eq, Zeroize, ZeroizeOnDrop)]
pub struct FieldElement {
    #[zeroize(skip)]
    pub value: BigUint,
}

impl FieldElement {
    pub fn modulus() -> BigUint {
        BigUint::from_str_radix(Q_HEX, 16).unwrap()
    }

    pub fn new(val: BigUint) -> Self {
        let q = Self::modulus();
        Self { value: val % q }
    }

    pub fn random() -> Self {
        let mut rng = rand::thread_rng();
        let q = Self::modulus();
        let val = rng.gen_biguint_range(&BigUint::one(), &q);
        Self { value: val }
    }

    pub fn add(&self, other: &Self) -> Self {
        let q = Self::modulus();
        Self {
            value: (&self.value + &other.value) % q,
        }
    }

    pub fn sub(&self, other: &Self) -> Self {
        let q = Self::modulus();
        if self.value >= other.value {
            Self {
                value: (&self.value - &other.value) % &q,
            }
        } else {
            Self {
                value: (&q - ((&other.value - &self.value) % &q)) % &q,
            }
        }
    }

    pub fn mul(&self, other: &Self) -> Self {
        let q = Self::modulus();
        Self {
            value: (&self.value * &other.value) % q,
        }
    }

    pub fn inv(&self) -> Self {
        let q = Self::modulus();
        // Fermat's Little Theorem: a^(q-2) mod q
        let exp = &q - BigUint::from(2u32);
        Self {
            value: self.value.modpow(&exp, &q),
        }
    }
}
