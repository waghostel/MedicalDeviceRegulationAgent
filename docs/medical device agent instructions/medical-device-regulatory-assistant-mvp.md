# Medical Device Regulatory Assistant MVP - Steering Document

## Project Overview

You are working on an **Agentic AI Regulatory Assistant** designed specifically for medical device regulatory pathway discovery. This is a specialized AI-powered platform that streamlines the regulatory process for medical device companies, with an initial focus on the US FDA market.

## Primary User Persona

**Target User**: Regulatory Affairs Managers at medical device startups (10-50 employees)

- Have budget authority but lack extensive resources
- Need to navigate complex FDA regulations efficiently
- Primary pain point: 510(k) predicate search and comparison workflow
- Success metric: Reduce time to identify suitable predicates from 2-3 days to <2 hours

## Core MVP Capabilities (US FDA Focus Only)

### 1. Auto-Classification with FDA Product Codes

- Classify devices based on intended use
- Automatically suggest specific FDA product codes and CFR sections
- Critical for 510(k) submissions
- Must provide confidence scores and reasoning traces

### 2. Predicate Search & Analysis with Comparison Tables

- Automate search for predicate devices in FDA databases
- Generate ranked lists of potential predicates
- Create side-by-side technological characteristic comparisons
- Highlight similarities and differences requiring justification
- **This is the #1 priority feature** - 15% of submissions fail due to incorrect predicate selection

### 3. FDA Guidance Document Mapping

- Automatically identify relevant FDA guidance documents
- Based on device type and technology characteristics
- Include cybersecurity guidance for connected devices
- Always cite sources with URLs and effective dates

### 4. Real-time FDA Database Integration

- Direct API integration with openFDA
- Live predicate searches (not static data)
- Device classification lookups
- Adverse event monitoring capabilities

### 5. 510(k) Submission Checklist Generator

- Generate market-specific checklists
- Based on device classification and predicate analysis
- Tailored specifically for FDA submissions
- Include required testing based on predicate differences

## Technical Architecture Guidelines

### Core Technologies

- **Frontend**: React, Next.js, Shadcn UI, Tailwind CSS
- **Backend**: Next.js (full-stack), FastAPI (Python AI integration)
- **AI Framework**: LangGraph (Agent Architecture), CopilotKit (UI)
- **Database**: SQLite for local development
- **Authentication**: Google OAuth 2.0

### Project Structure

- **Project-Based System**: Each medical device gets its own workspace
- **Markdown-First**: All reports stored as markdown for LLM processing
- **Structured Data Store**: JSON files for extracted data (device specs, K-numbers)
- **Agent Guidance System**: instruction.md files for AI behavior templates

### Key Agent Tools

- **openFDA API Integration**: Robust wrapper with rate limiting and error handling
- **Document Processing Pipeline**: OCR and NLP for PDF guidance documents
- **FDA-Specific Tools**: Parse product codes, CFR sections, generate comparison tables
- **Background Job Processing**: Queue system for long-running predicate searches

## User Interface Requirements

### Core Pages

1. **Regulatory Strategy Dashboard**: Project homepage with AI-powered overview
2. **Agent Workflow Page**: Universal conversational UI with slash commands for:
   - 510(k) Predicate Search
   - Predicate Comparison Analysis
   - Device Classification
   - FDA Guidance Searching
3. **AI Chat Interface**: Built with CopilotKit, maintains project context
4. **Citation and Source Panel**: Expandable sidebar with all sources and dates
5. **Quick Actions Toolbar**: One-click access to common tasks

### Instruction Templates (instruction.md)

Create specific templates for:

- 510(k) Predicate Search workflows
- Predicate Comparison Analysis procedures
- Device Classification methodologies
- FDA Guidance searching strategies

## Compliance and Safety Requirements

### Human-in-the-Loop Philosophy

- AI is always an assistant, never the final authority
- Human RA professionals must review all critical outputs
- "Suggest, but humans decide" approach
- Required approval before use in formal submissions

### Auditable Traceability

- Every AI action must be logged transparently
- Full reasoning traces for all conclusions
- Always cite source URLs and effective dates
- Exportable audit trails for regulatory inspections

### Confidence and Citation Model

- Every AI output includes confidence score (0-1)
- Clear reasoning traces explaining conclusions
- Direct citations to source documents
- Version tracking for all regulations and guidance

## Development Priorities

### Phase 1: Core Classification and Search

1. Device classification engine with FDA product codes
2. openFDA API integration for predicate searches
3. Basic comparison table generation

### Phase 2: Enhanced Analysis

1. Technological characteristic extraction
2. Substantial equivalence justification
3. FDA guidance document mapping

### Phase 3: Submission Support

1. 510(k) checklist generation
2. Evidence gap analysis
3. Submission readiness validation

## Success Metrics for MVP

- **Time Efficiency**: Reduce predicate identification time from 2-3 days to <2 hours
- **Classification Accuracy**: >90% accuracy when validated against FDA decisions
- **User Satisfaction**: >4.5/5 rating for predicate search functionality
- **Submission Success**: Reduce predicate-related submission failures

## Regulatory Constraints

### What the System CANNOT Do

- Provide legal advice
- Handle Protected Health Information (PHI)
- Reproduce paywalled content (ISO standards, etc.)
- Make final regulatory decisions
- Guarantee submission approval

### What the System MUST Do

- Maintain complete audit trails
- Cite all sources with dates
- Provide confidence scores
- Enable human oversight
- Respect data privacy and licensing

## Key Terminology

- **510(k)**: FDA premarket notification pathway for Class II devices
- **Predicate Device**: Legally marketed device used for substantial equivalence comparison
- **Substantial Equivalence (SE)**: FDA concept for 510(k) pathway approval
- **Product Code**: FDA's classification system identifier
- **CFR**: Code of Federal Regulations sections
- **openFDA**: FDA's public API for accessing regulatory data

## Implementation Notes

- Focus exclusively on US FDA market for MVP
- Do not implement EU, global, or other market features yet
- Prioritize predicate search workflow above all other features
- Ensure all AI outputs are explainable and auditable
- Build for regulatory professionals, not general users
- Emphasize speed and accuracy over feature breadth

## Future Considerations (Not for MVP)

- EU MDR support
- Global regulatory strategy planning
- Advanced AI features (confidence scoring UI, change impact analysis)
- Collaboration features (multi-user, comments, version control)
- Integration with QMS systems

Remember: This MVP is specifically designed to solve the most critical pain point for regulatory affairs managers at medical device startups - the time-consuming and error-prone process of finding and analyzing predicate devices for 510(k) submissions.