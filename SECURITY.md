# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | Yes                |
| < 1.0   | Best effort        |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

### How to Report

Send an email to **security@roilabs.com.br** with:

1. **Description**: Clear description of the vulnerability
2. **Steps to reproduce**: Detailed reproduction steps
3. **Impact**: What an attacker could do with this vulnerability
4. **Affected versions**: Which versions are affected
5. **Suggested fix** (optional): If you have a proposed solution

### What to Expect

| Timeline | Action |
|----------|--------|
| 24 hours | Acknowledge receipt of your report |
| 72 hours | Initial assessment and severity classification |
| 7 days   | Status update and estimated fix timeline |
| 30 days  | Target resolution for Critical/High severity |
| 90 days  | Target resolution for Medium/Low severity |

### Severity Classification

- **Critical**: Remote code execution, authentication bypass, full data exposure
- **High**: Privilege escalation, significant data leakage, persistent XSS
- **Medium**: Limited data exposure, CSRF, reflected XSS
- **Low**: Information disclosure, minor configuration issues

### Responsible Disclosure

We follow the principle of **coordinated disclosure**:
- We will work with you to understand and fix the issue
- We will credit you in the security advisory (unless you prefer anonymity)
- We ask that you give us reasonable time to fix before public disclosure
- We will notify you when the fix is released

### Bug Bounty

We do not currently offer a formal bug bounty program. However, we deeply appreciate security researchers and will:
- Publicly credit responsible reporters (with permission)
- Offer free Pro subscription as a token of appreciation for Critical/High findings
- Prioritize your feature requests

### Security Best Practices for Integrators

When using Sofia AI:
- Rotate API keys regularly
- Use the minimum required OAuth scopes
- Enable SSO and require MFA for enterprise deployments
- Review the audit log regularly for suspicious activity
- Do not expose your Sofia AI API keys in client-side code

### Scope

The following are in scope:
- Sofia AI platform (sofiaia.roilabs.com.br)
- Sofia AI API (sofiaia.roilabs.com.br/api/*)
- This GitHub repository

The following are out of scope:
- Third-party services (Vercel, Neon, Resend, etc.)
- Social engineering attacks
- Physical attacks

---

Thank you for helping keep Sofia AI and our users safe.
