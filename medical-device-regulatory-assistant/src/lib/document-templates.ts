/**
 * Document Templates Library - Predefined templates for regulatory documents
 * Provides templates for common regulatory documents with placeholder substitution
 */

import { DocumentTemplate, TemplatePlaceholder } from '@/types/document';

/**
 * Predefined document templates for regulatory submissions
 */
export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'device-description',
    name: 'Device Description',
    category: 'Technical Documentation',
    description: 'Comprehensive device description for regulatory submissions',
    placeholders: [
      {
        key: 'device_name',
        label: 'Device Name',
        type: 'text',
        required: true,
        description: 'Official name of the medical device',
      },
      {
        key: 'intended_use',
        label: 'Intended Use',
        type: 'textarea',
        required: true,
        description: 'Detailed intended use statement',
      },
      {
        key: 'device_class',
        label: 'Device Class',
        type: 'select',
        required: true,
        options: ['Class I', 'Class II', 'Class III'],
        description: 'FDA device classification',
      },
      {
        key: 'product_code',
        label: 'Product Code',
        type: 'text',
        required: false,
        description: 'FDA product code (if known)',
      },
    ],
    template: `# Device Description

## Device Information
**Device Name:** {{device_name}}
**Product Code:** {{product_code}}
**Device Class:** {{device_class}}

## Intended Use
{{intended_use}}

## Device Description
[Provide detailed technical description of the device, including:]

### Physical Characteristics
- Dimensions: [Length x Width x Height]
- Weight: [Weight in appropriate units]
- Materials: [List all materials in contact with patient/user]
- Power Source: [Battery, AC power, etc.]

### Technological Characteristics
- Operating Principle: [How the device works]
- Key Components: [List major components and their functions]
- Software: [If applicable, describe software components]
- Connectivity: [Network capabilities, if any]

### Performance Specifications
- Accuracy: [Measurement accuracy specifications]
- Range: [Operating range/measurement range]
- Environmental Conditions: [Operating temperature, humidity, etc.]
- Safety Features: [Built-in safety mechanisms]

## Regulatory Classification Rationale
Based on the intended use and technological characteristics, this device is classified as {{device_class}} under FDA regulations.

[Provide justification for classification based on:]
- Risk level to patient/user
- Degree of control necessary
- Comparison to existing device types
`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'predicate-comparison',
    name: 'Predicate Device Comparison',
    category: '510(k) Submission',
    description:
      'Side-by-side comparison with predicate devices for substantial equivalence',
    placeholders: [
      {
        key: 'device_name',
        label: 'Your Device Name',
        type: 'text',
        required: true,
        description: 'Name of your device',
      },
      {
        key: 'predicate_name',
        label: 'Predicate Device Name',
        type: 'text',
        required: true,
        description: 'Name of the predicate device',
      },
      {
        key: 'predicate_k_number',
        label: 'Predicate K-Number',
        type: 'text',
        required: true,
        description: 'FDA 510(k) number of predicate device',
      },
      {
        key: 'clearance_date',
        label: 'Predicate Clearance Date',
        type: 'date',
        required: true,
        description: 'Date when predicate was cleared by FDA',
      },
    ],
    template: `# Predicate Device Comparison

## Device Information
**Subject Device:** {{device_name}}
**Predicate Device:** {{predicate_name}} ({{predicate_k_number}})
**Predicate Clearance Date:** {{clearance_date}}

## Substantial Equivalence Comparison

### Intended Use Comparison
| Aspect | {{device_name}} | {{predicate_name}} |
|--------|-----------------|-------------------|
| Intended Use | [Your device intended use] | [Predicate intended use] |
| Patient Population | [Target patient population] | [Predicate patient population] |
| Clinical Application | [Clinical use context] | [Predicate clinical context] |

### Technological Characteristics Comparison
| Characteristic | {{device_name}} | {{predicate_name}} | Similarity |
|----------------|-----------------|-------------------|------------|
| Operating Principle | [Your device principle] | [Predicate principle] | [Identical/Similar/Different] |
| Materials | [Your device materials] | [Predicate materials] | [Identical/Similar/Different] |
| Energy Source | [Your energy source] | [Predicate energy source] | [Identical/Similar/Different] |
| Software | [Your software features] | [Predicate software] | [Identical/Similar/Different] |
| User Interface | [Your interface] | [Predicate interface] | [Identical/Similar/Different] |

## Substantial Equivalence Assessment

### Similarities
[List all similarities between your device and the predicate:]
1. [Similarity 1 with justification]
2. [Similarity 2 with justification]
3. [Similarity 3 with justification]

### Differences
[List all differences and their impact:]
1. **[Difference 1]**
   - Impact on Safety: [Assessment]
   - Impact on Effectiveness: [Assessment]
   - Mitigation: [How difference is addressed]

2. **[Difference 2]**
   - Impact on Safety: [Assessment]
   - Impact on Effectiveness: [Assessment]
   - Mitigation: [How difference is addressed]

## Testing Requirements
Based on the identified differences, the following testing is recommended:
- [Test 1]: [Rationale]
- [Test 2]: [Rationale]
- [Test 3]: [Rationale]

## Conclusion
Based on this comparison, {{device_name}} is substantially equivalent to {{predicate_name}} because [provide clear rationale for substantial equivalence determination].
`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fda-guidance-summary',
    name: 'FDA Guidance Summary',
    category: 'Regulatory Research',
    description: 'Summary of relevant FDA guidance documents',
    placeholders: [
      {
        key: 'device_type',
        label: 'Device Type',
        type: 'text',
        required: true,
        description: 'Type of medical device',
      },
      {
        key: 'guidance_title',
        label: 'Guidance Document Title',
        type: 'text',
        required: true,
        description: 'Title of the FDA guidance document',
      },
      {
        key: 'guidance_date',
        label: 'Guidance Date',
        type: 'date',
        required: true,
        description: 'Publication date of the guidance',
      },
      {
        key: 'guidance_url',
        label: 'Guidance URL',
        type: 'text',
        required: false,
        description: 'Link to the FDA guidance document',
      },
    ],
    template: `# FDA Guidance Summary

## Guidance Document Information
**Title:** {{guidance_title}}
**Publication Date:** {{guidance_date}}
**Device Type:** {{device_type}}
**URL:** {{guidance_url}}

## Executive Summary
[Provide a brief overview of the guidance document and its relevance to your device]

## Key Requirements
[Extract and summarize the key regulatory requirements from the guidance:]

### 1. [Requirement Category 1]
- [Specific requirement 1]
- [Specific requirement 2]
- [Specific requirement 3]

### 2. [Requirement Category 2]
- [Specific requirement 1]
- [Specific requirement 2]
- [Specific requirement 3]

### 3. [Requirement Category 3]
- [Specific requirement 1]
- [Specific requirement 2]
- [Specific requirement 3]

## Testing and Documentation Requirements
[List specific testing and documentation requirements mentioned in the guidance:]

### Performance Testing
- [Test 1]: [Description and standards]
- [Test 2]: [Description and standards]
- [Test 3]: [Description and standards]

### Safety Testing
- [Safety test 1]: [Description and standards]
- [Safety test 2]: [Description and standards]

### Clinical Requirements
- [Clinical requirement 1]
- [Clinical requirement 2]

## Special Controls (if applicable)
[If the guidance mentions special controls, list them here:]
1. [Special control 1]
2. [Special control 2]
3. [Special control 3]

## Submission Recommendations
[Based on the guidance, provide recommendations for regulatory submission:]
- [Recommendation 1]
- [Recommendation 2]
- [Recommendation 3]

## Compliance Checklist
- [ ] [Requirement 1 met]
- [ ] [Requirement 2 met]
- [ ] [Requirement 3 met]
- [ ] [Testing completed per guidance]
- [ ] [Documentation prepared per guidance]

## References
- {{guidance_title}} ({{guidance_date}}). Available at: {{guidance_url}}
- [Additional relevant references]
`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'submission-checklist',
    name: '510(k) Submission Checklist',
    category: '510(k) Submission',
    description: 'Comprehensive checklist for 510(k) submission preparation',
    placeholders: [
      {
        key: 'device_name',
        label: 'Device Name',
        type: 'text',
        required: true,
        description: 'Name of the medical device',
      },
      {
        key: 'submission_type',
        label: 'Submission Type',
        type: 'select',
        required: true,
        options: ['Traditional 510(k)', 'Special 510(k)', 'Abbreviated 510(k)'],
        description: 'Type of 510(k) submission',
      },
    ],
    template: `# 510(k) Submission Checklist

## Device Information
**Device Name:** {{device_name}}
**Submission Type:** {{submission_type}}
**Preparation Date:** [Current Date]

## Pre-Submission Requirements
- [ ] Device classification confirmed
- [ ] Predicate device(s) identified
- [ ] Substantial equivalence assessment completed
- [ ] FDA guidance documents reviewed
- [ ] Testing requirements identified

## Required Documentation

### Administrative Information
- [ ] FDA Form 3514 (510(k) Summary) or FDA Form 3515 (510(k) Statement)
- [ ] Cover letter with submission overview
- [ ] Device name and classification information
- [ ] Substantial equivalence comparison
- [ ] Truthful and accuracy statement

### Device Description
- [ ] Comprehensive device description
- [ ] Intended use statement
- [ ] Indications for use
- [ ] Device labeling (proposed)
- [ ] Substantial equivalence comparison table

### Performance Data
- [ ] Performance testing data
- [ ] Software documentation (if applicable)
- [ ] Biocompatibility testing (if applicable)
- [ ] Electrical safety testing (if applicable)
- [ ] Electromagnetic compatibility testing (if applicable)
- [ ] Shelf life/sterility testing (if applicable)

### Clinical Data (if required)
- [ ] Clinical study protocol
- [ ] Clinical study report
- [ ] Statistical analysis
- [ ] Institutional Review Board (IRB) approval

### Quality System Information
- [ ] Manufacturing information
- [ ] Quality control procedures
- [ ] Risk analysis documentation

## Special Controls Compliance (if applicable)
- [ ] [Special control 1]
- [ ] [Special control 2]
- [ ] [Special control 3]

## Submission Preparation
- [ ] All documents reviewed for completeness
- [ ] Electronic submission prepared (eCopy)
- [ ] Submission fee calculated
- [ ] FDA submission portal account ready

## Post-Submission Tracking
- [ ] Submission tracking number recorded
- [ ] FDA acknowledgment received
- [ ] Response to FDA questions prepared (if needed)
- [ ] Clearance letter received

## Notes
[Add any specific notes or considerations for this submission]

---
**Prepared by:** [Name]
**Date:** [Date]
**Review Status:** [Draft/Under Review/Final]
`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

/**
 * Render a template with provided placeholder values
 */
export function renderTemplate(
  template: DocumentTemplate,
  placeholderValues: Record<string, string>
): string {
  let renderedContent = template.template;

  // Replace all placeholders with provided values
  template.placeholders.forEach((placeholder) => {
    const value =
      placeholderValues[placeholder.key] || `[${placeholder.label}]`;
    const regex = new RegExp(`{{${placeholder.key}}}`, 'g');
    renderedContent = renderedContent.replace(regex, value);
  });

  // Replace any remaining placeholders with their labels
  const remainingPlaceholders = renderedContent.match(/{{([^}]+)}}/g);
  if (remainingPlaceholders) {
    remainingPlaceholders.forEach((match) => {
      const key = match.replace(/[{}]/g, '');
      const placeholder = template.placeholders.find((p) => p.key === key);
      if (placeholder) {
        renderedContent = renderedContent.replace(
          match,
          `[${placeholder.label}]`
        );
      }
    });
  }

  return renderedContent;
}

/**
 * Get template by ID
 */
export function getTemplateById(
  templateId: string
): DocumentTemplate | undefined {
  return documentTemplates.find((template) => template.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): DocumentTemplate[] {
  return documentTemplates.filter((template) => template.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  const categories = documentTemplates.map((template) => template.category);
  return Array.from(new Set(categories));
}

/**
 * Validate placeholder values against template requirements
 */
export function validatePlaceholderValues(
  template: DocumentTemplate,
  values: Record<string, string>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  template.placeholders.forEach((placeholder) => {
    if (placeholder.required && !values[placeholder.key]) {
      errors.push(`${placeholder.label} is required`);
    }

    if (
      placeholder.type === 'select' &&
      placeholder.options &&
      values[placeholder.key]
    ) {
      if (!placeholder.options.includes(values[placeholder.key])) {
        errors.push(
          `${placeholder.label} must be one of: ${placeholder.options.join(', ')}`
        );
      }
    }

    if (placeholder.type === 'date' && values[placeholder.key]) {
      const dateValue = new Date(values[placeholder.key]);
      if (isNaN(dateValue.getTime())) {
        errors.push(`${placeholder.label} must be a valid date`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
