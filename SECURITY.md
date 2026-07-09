# Security Policy

We take the security of **SemanticVault** very seriously. If you believe you have found a security vulnerability in this project, please report it to us as outlined below.

## Supported Versions
Only the latest major version of SemanticVault receives security patches:

| Version | Supported |
| ------- | --------- |
| v1.0.x  | Yes       |

## Reporting a Vulnerability
*Please do not report security vulnerabilities through public GitHub issues.*

Instead, please report security vulnerabilities directly by emailing `security@semanticvault.org`.
To help us resolve the issue quickly, please include:
- A clear description of the vulnerability, including its potential impact.
- Step-by-step instructions (or a proof-of-concept script) to reproduce it.
- Details of the environment used.

We will acknowledge receipt of your report within 48 hours and work with you to coordinate a timely patch release.

## Secure Architecture Highlights
SemanticVault enforces a high-security posture:
1. **No Client-Exposed API Keys**: The Gemini API key remains server-side at all times.
2. **Robust Password Hashing**: Utilizes Node's cryptographic PBKDF2 function with unique salts and 1000 iterations.
3. **Stateless JWT Signatures**: Sessions are protected with high-entropy HMAC-SHA256 tokens.
4. **Prompt Injection Guardrails**: All incoming requests are filtered to detect and block malicious prompt overrides.
5. **Rate Limiting**: Integrated middleware protects endpoints from brute force and denial of service.
