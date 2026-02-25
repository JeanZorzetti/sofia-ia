# RFC Process — Sofia AI

> RFC = Request for Comments

## What is an RFC?

An RFC is a document describing a significant change to Sofia AI — whether architectural, product-level, or behavioral. The RFC process allows the community to review and discuss major decisions before implementation begins.

## When to Write an RFC

You MUST open an RFC for:
- New public API endpoints or breaking changes to existing ones
- Changes to the agent execution model or tool system
- New major integrations (new OAuth provider, new AI model)
- Significant changes to the data model (Prisma schema)
- Breaking changes to the plugin/extension system
- Major UI/UX overhauls affecting core workflows
- Changes to billing or plan limits

You do NOT need an RFC for:
- Bug fixes
- Performance improvements without behavioral changes
- Documentation improvements
- Minor UI tweaks (spacing, colors, copy)
- New blog articles or SEO content

If you're unsure, open a GitHub Discussion first and ask the core team.

## RFC Lifecycle

```
Draft → Discussion → Final Comment Period → Decision → Implementation
```

### 1. Draft

1. Fork the repository
2. Copy the [RFC Template](#rfc-template) below
3. Create a file: `docs/rfcs/RFC-NNNN-short-title.md` (use the next available number)
4. Fill in the template with your proposal
5. Open a **GitHub Discussion** in the "RFC Proposals" category
   - Title: `[RFC] Your Proposal Title`
   - Link to your draft PR or paste the content

### 2. Discussion (7-14 days)

- Community members comment, ask questions, suggest alternatives
- Author responds and updates the RFC based on feedback
- Core team may request clarifications

### 3. Final Comment Period (FCP)

- A core team member announces "FCP: 5 days" in the discussion
- A final window for remaining concerns
- No new fundamental objections should be raised at this stage

### 4. Decision

Core team makes one of:
- **Accepted**: RFC proceeds to implementation
- **Accepted with modifications**: RFC accepted with requested changes
- **Rejected**: RFC is not suitable; reason is documented
- **Postponed**: Good idea, wrong timing; revisit later

### 5. Implementation

- Accepted RFC is linked to the implementing PR(s)
- The PR description must reference: `RFC-NNNN`
- Implementation can be done by the RFC author or by the community

## RFC Template

```markdown
# RFC-NNNN: Title

**Status**: Draft | Discussion | FCP | Accepted | Rejected | Postponed
**Author**: @github-username
**Date**: YYYY-MM-DD
**Related issues**: #123

## Summary

One paragraph describing the proposal in plain language.

## Motivation

Why are we doing this? What problem does it solve?
What happens if we don't do this?

## Detailed Design

The technical details of the change. Include:
- API changes (endpoints, request/response shapes)
- Data model changes (Prisma schema)
- UI changes (with mockups if possible)
- Algorithm changes
- Configuration changes

## Drawbacks

What are the potential downsides of this change?
Performance implications? Complexity? Breaking changes?

## Alternatives

What other approaches were considered?
Why was this approach chosen over alternatives?

## Unresolved Questions

What open questions remain?
What can be figured out during implementation?
What requires community consensus?

## Implementation Plan

How will this be implemented?
Can it be done incrementally?
What's the estimated effort?

## References

Links to relevant discussions, issues, external resources.
```

## RFC Numbering

RFCs are numbered sequentially. Check the `docs/rfcs/` directory for existing RFCs and use the next available number.

| RFC | Title | Status |
|-----|-------|--------|
| RFC-0001 | *(template)* | Reserved |

## Questions?

Open a [GitHub Discussion](https://github.com/JeanZorzetti/sofia-ia/discussions) or join our [Discord](https://discord.gg/sofiaia).
