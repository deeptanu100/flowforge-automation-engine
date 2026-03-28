"""Fernet-based encryption service for securing API keys at rest."""

from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def _ensure_key() -> bytes:
    """Load or generate the master encryption key using .env."""
    dotenv_path = os.path.join(os.getcwd(), ".env")
    key = os.environ.get("MASTER_ENCRYPTION_KEY")
    
    if key:
        return key.encode()
        
    # Generate new key if not found
    print("Generating new MASTER_ENCRYPTION_KEY...")
    new_key = Fernet.generate_key()
    
    # Save to .env
    env_content = ""
    if os.path.exists(dotenv_path):
        with open(dotenv_path, "r") as f:
            env_content = f.read()
            
    with open(dotenv_path, "a" if env_content else "w") as f:
        if env_content and not env_content.endswith("\n"):
            f.write("\n")
        f.write(f"MASTER_ENCRYPTION_KEY={new_key.decode()}\n")
        
    return new_key

_fernet = Fernet(_ensure_key())

def encrypt_credential(plain_text: str) -> str:
    """Encrypt an API key for storage in the DB."""
    return _fernet.encrypt(plain_text.encode()).decode()

def decrypt_credential(cipher_text: str) -> str:
    """Decrypt an API key for in-memory use only."""
    return _fernet.decrypt(cipher_text.encode()).decode()

def mask_credential(plain_text: str) -> str:
    """Return a masked version of the key (e.g. sk-***abcd) for the UI."""
    if not plain_text:
        return ""
    if len(plain_text) <= 8:
        return "sk-***" + plain_text[-2:] if len(plain_text) > 2 else "****"
    
    # Prefix usually has sk-, we'll just show first 3 and last 4
    return f"{plain_text[:3]}***{plain_text[-4:]}"
