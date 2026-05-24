"""Optional, flag-gated, backward-compatible PII field encryption.

This module is a strict NO-OP when the env var ``PII_ENC_KEY`` is unset:
all functions return their input unchanged and the ``cryptography``
package is never imported. When ``PII_ENC_KEY`` is set (a urlsafe
base64-encoded 32-byte Fernet key), the six sensitive person fields are
encrypted at rest. Reads tolerate BOTH plaintext (legacy) and encrypted
values, so rollout and rollback need no data migration.

Pure functions only; no FastAPI imports.
"""

import logging
import os

logger = logging.getLogger(__name__)

# Sentinel prefix lets us cheaply tell ciphertext apart from legacy plaintext.
_PREFIX = "enc::"

# Person dict keys that hold sensitive PII. Everything else is left untouched.
_PII_KEYS = ("full_name", "tax_id", "document_number", "phone", "email", "address")

# Module-global cache so the Fernet instance is built at most once.
# Sentinel object distinguishes "not yet computed" from "computed as None".
_UNSET = object()
_fernet_cache = _UNSET


def _fernet():
    """Return a cached Fernet instance, or None if PII_ENC_KEY is unset.

    ``cryptography`` is imported lazily so the package need not even be
    installed when the key is unset.
    """
    global _fernet_cache
    if _fernet_cache is not _UNSET:
        return _fernet_cache

    key = os.environ.get("PII_ENC_KEY")
    if not key:
        _fernet_cache = None
        return None

    from cryptography.fernet import Fernet  # lazy import

    _fernet_cache = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet_cache


def _pii_enabled() -> bool:
    return bool(os.environ.get("PII_ENC_KEY"))


# Expose as a module attribute; recomputed via __getattr__ so tests/processes
# that set the env var after import still see the correct value.
def __getattr__(name):
    if name == "PII_ENABLED":
        return _pii_enabled()
    raise AttributeError(name)


PII_ENABLED = _pii_enabled()


def encrypt(value):
    """Encrypt a single string value.

    Returns the value unchanged if it is None/empty or encryption is
    disabled; otherwise returns a sentinel-prefixed Fernet token (str).
    """
    if value is None or value == "" or not _pii_enabled():
        return value
    f = _fernet()
    if f is None:
        return value
    try:
        token = f.encrypt(value.encode("utf-8")).decode("ascii")
        return _PREFIX + token
    except Exception as exc:
        logger.error("PII encryption failed — recusando guardar dados em plaintext: %s", exc)
        raise RuntimeError("Falha ao encriptar dados PII") from exc


def decrypt(value):
    """Decrypt a single value.

    Legacy plaintext (no sentinel prefix) passes through unchanged. On
    any decryption error the original value is returned (never raises
    into the request path).
    """
    if value is None or not isinstance(value, str) or not value.startswith(_PREFIX):
        return value
    f = _fernet()
    if f is None:
        return value
    token = value[len(_PREFIX):]
    try:
        from cryptography.fernet import InvalidToken  # lazy import
    except Exception:
        return value
    try:
        return f.decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken:
        return value
    except Exception:
        return value


def encrypt_person(d):
    """Return a shallow copy of a person dict with PII fields encrypted.

    Never mutates the input. Non-PII keys are left untouched.
    """
    if not isinstance(d, dict) or not _pii_enabled():
        return d
    out = dict(d)
    for k in _PII_KEYS:
        if k in out:
            out[k] = encrypt(out[k])
    return out


def decrypt_person(d):
    """Return a shallow copy of a person dict with PII fields decrypted.

    Never mutates the input. Tolerates legacy plaintext values.
    """
    if not isinstance(d, dict):
        return d
    out = dict(d)
    for k in _PII_KEYS:
        if k in out:
            out[k] = decrypt(out[k])
    return out
