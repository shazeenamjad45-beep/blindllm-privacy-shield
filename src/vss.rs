//! Feldman Verifiable Secret Sharing and Vandermonde evaluation in Rust.

use crate::field::FieldElement;
use num_bigint::BigUint;
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Clone, Debug, Zeroize, ZeroizeOnDrop)]
pub struct RustShare {
    pub index: usize,
    pub value: FieldElement,
    pub epoch: usize,
}

pub struct Vandermonde3of4;

impl Vandermonde3of4 {
    /// Generates 4 shares with threshold 3 from secret s.
    pub fn split(secret: &FieldElement, epoch: usize) -> (Vec<RustShare>, Vec<FieldElement>) {
        let a0 = secret.clone();
        let a1 = FieldElement::random();
        let a2 = FieldElement::random();
        let coefficients = vec![a0, a1.clone(), a2.clone()];

        let mut shares = Vec::with_capacity(4);
        for x in 1..=4 {
            let x_fe = FieldElement::new(BigUint::from(x as u32));
            let x2_fe = x_fe.mul(&x_fe);

            // f(x) = a0 + a1*x + a2*x^2
            let term1 = a1.mul(&x_fe);
            let term2 = a2.mul(&x2_fe);
            let y = coefficients[0].add(&term1).add(&term2);

            shares.push(RustShare {
                index: x,
                value: y,
                epoch,
            });
        }

        (shares, coefficients)
    }

    /// Reconstructs secret s = f(0) from at least 3 valid shares using Lagrange interpolation.
    pub fn reconstruct(shares: &[RustShare]) -> Result<FieldElement, &'static str> {
        if shares.len() < 3 {
            return Err("Threshold violation: at least 3 shares required");
        }

        let first_epoch = shares[0].epoch;
        if shares.iter().take(3).any(|s| s.epoch != first_epoch) {
            return Err("Mixed epoch violation: all shares must belong to identical epoch");
        }

        let mut secret = FieldElement::new(BigUint::from(0u32));

        for i in 0..3 {
            let xi = FieldElement::new(BigUint::from(shares[i].index as u32));
            let yi = &shares[i].value;

            let mut num = FieldElement::new(BigUint::from(1u32));
            let mut den = FieldElement::new(BigUint::from(1u32));

            for j in 0..3 {
                if i != j {
                    let xj = FieldElement::new(BigUint::from(shares[j].index as u32));
                    // (0 - xj)
                    let neg_xj = FieldElement::new(BigUint::from(0u32)).sub(&xj);
                    num = num.mul(&neg_xj);

                    // (xi - xj)
                    let diff = xi.sub(&xj);
                    den = den.mul(&diff);
                }
            }

            let lambda = num.mul(&den.inv());
            let term = yi.mul(&lambda);
            secret = secret.add(&term);
        }

        Ok(secret)
    }
}
