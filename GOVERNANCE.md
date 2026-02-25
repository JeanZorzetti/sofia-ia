# Sofia AI — Governance

> Last updated: 2026-02-25

## Overview

Sofia AI follows the **Benevolent Dictator for Life (BDFL)** model, common in successful open-source projects like Python and Django. The founder and primary maintainer has final say on all decisions, while actively seeking community input through RFCs and discussions.

## Decision-Making Structure

### Benevolent Dictator (BDFL)
- **Role**: Final decision authority on all matters including roadmap, architecture, and community standards
- **Current BDFL**: The ROI Labs founding team
- **Responsibilities**: Maintaining project vision, resolving disputes, approving major changes

### Core Maintainers
Trusted contributors with merge rights and release management privileges. Currently appointed by the BDFL.

**How to become a maintainer:**
1. Consistently contribute high-quality PRs over 3+ months
2. Demonstrate understanding of project architecture and goals
3. Show good judgment in code reviews and community interactions
4. Be nominated by an existing maintainer and approved by the BDFL

### Community Contributors
Anyone who submits issues, PRs, or participates in discussions. All contributions are valued and reviewed.

## Contribution Process

### Bug Fixes and Small Improvements
1. Open an issue (use the bug report template)
2. Fork the repository and create a branch
3. Submit a PR referencing the issue
4. Maintainer reviews and merges (or requests changes)

### New Features (medium scope)
1. Open a Feature Request issue first
2. Discuss approach with maintainers
3. Implement after getting a green light
4. Submit PR with tests and documentation

### Major Changes (architecture, breaking changes, new subsystems)
1. Open a GitHub Discussion or RFC (see [RFC Process](docs/RFC-PROCESS.md))
2. Community discussion period: minimum 7 days
3. BDFL decision (may accept, modify, or reject)
4. Implementation only after approval

## RFC Process

For significant changes that affect the public API, architecture, or user experience, an RFC (Request for Comments) is required. See [docs/RFC-PROCESS.md](docs/RFC-PROCESS.md) for the full process.

## Code of Conduct

All participants are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). In summary:
- Be respectful and inclusive
- Focus on constructive feedback
- No harassment, discrimination, or personal attacks
- Report violations to conduct@roilabs.com.br

## Conflict Resolution

1. **Technical disagreements**: Open a GitHub Discussion; maintainers vote; BDFL has final say
2. **Community conduct**: Report to conduct@roilabs.com.br; maintainers investigate
3. **Roadmap disputes**: RFC process with community input; BDFL decides

## Releases

- **Patch releases** (x.x.N): Bug fixes, can be released by any core maintainer
- **Minor releases** (x.N.0): New features, requires maintainer consensus
- **Major releases** (N.0.0): Breaking changes, requires RFC + BDFL approval

## Governance Changes

Changes to this document require:
1. An RFC opened for community review
2. 14-day discussion period
3. BDFL approval

---

Questions? Join our [Discord](https://discord.gg/sofiaia) or open a [GitHub Discussion](https://github.com/JeanZorzetti/sofia-ia/discussions).
