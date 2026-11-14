//! MedVault Cryptographic Core Library
//!
//! Provides:
//! - Finite field GF(Q) scalar operations
//! - Vandermonde 3-of-4 share generation
//! - Lagrange interpolation reconstruction
//! - Feldman Verifiable Secret Sharing commitments
//! - Proactive share refresh
//! - PyO3 Python bindings (optional feature)

pub mod field;
pub mod vss;

pub use field::FieldElement;
pub use vss::{RustShare, Vandermonde3of4};

#[cfg(feature = "python")]
use pyo3::prelude::*;

#[cfg(feature = "python")]
#[pymodule]
fn medvault_crypto(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add("__version__", "0.1.0")?;
    Ok(())
}
