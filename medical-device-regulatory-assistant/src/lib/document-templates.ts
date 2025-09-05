import { DocumentTemplate } from '@/types/document';

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'predicate-analysis',
    name: 'Predicate Device Analysis',
    description: 'Template for analyzing predicate devices for 510(k) submissions',
    type: 'predicate-analysis',
    template: `# Predicate Device Analysis

## Device Information
- **Device Name**: {{deviceName}}
- **K-Number**: {{kNumber}}
- **Clearance Date**: {{clearanceDate}}
- **Product Code**: {{productCode}}

## Intended Use
{{intendedUse}}

## Technological Characteristics

### Similarities
{{similarities}}

### Differences
{{differences}}

## Substantial Equivalence Assessment
{{substantialEquivalence}}

## Testing Recommendations
{{testingRecommendations}}

## Sources
- FDA 510(k) Database: [{{kNumber}}](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID={{kNumber}})
- Analysis Date: {{analysisDate}}
`,
    placeholders: [
      { key: 'deviceName', label: 'Device Name', type: 'text', required: true },
      { key: 'kNumber', label: 'K-Number', type: 'text', required: true },
      { key: 'clearanceDate', label: 'Clearance Date', type: 'date', required: true },
      { key: 'productCode', label: 'Product Code', type: 'text', required: true },
      { key: 'intendedUse', label: 'Intended Use', type: 'textarea', required: true },
      { key: 'similarities', label: 'Similarities', type: 'textarea', required: true },
      { key: 'differences', label: 'Differences', type: 'textarea', required: true },
      { key: 'substantialEquivalence', label: 'Substantial Equivalence Assessment', type: 'textarea', required: true },
      { key: 'testingRecommendations', label: 'Testing Recommendations', type: 'textarea', required: true },
      { key: 'analysisDate', label: 'Analysis Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] }
    ]
  },
  {
    id: 'device-classification',
    name: 'Device Classification Report',
    description: 'Template for documenting device classification analysis',
    type: 'device-classification',
    template: `# Device Classification Report

## Device Information
- **Device Name**: {{deviceName}}
- **Device Description**: {{deviceDescription}}
- **Intended Use**: {{intendedUse}}

## Classification Results
- **Device Class**: {{deviceClass}}
- **Product Code**: {{productCode}}
- **Regulatory Pathway**: {{regulatoryPathway}}
- **Confidence Score**: {{confidenceScore}}

## Applicable Regulations
{{applicableRegulations}}

## Justification
{{justification}}

## Next Steps
{{nextSteps}}

## Sources
{{sources}}

---
*Classification Date*: {{classificationDate}}
*Analyst*: {{analyst}}
`,
    placeholders: [
      { key: 'deviceName', label: 'Device Name', type: 'text', required: true },
      { key: 'deviceDescription', label: 'Device Description', type: 'textarea', required: true },
      { key: 'intendedUse', label: 'Intended Use', type: 'textarea', required: true },
      { key: 'deviceClass', label: 'Device Class', type: 'select', required: true, options: ['Class I', 'Class II', 'Class III'] },
      { key: 'productCode', label: 'Product Code', type: 'text', required: true },
      { key: 'regulatoryPathway', label: 'Regulatory Pathway', type: 'select', required: true, options: ['510(k)', 'PMA', 'De Novo'] },
      { key: 'confidenceScore', label: 'Confidence Score', type: 'text', required: true },
      { key: 'applicableRegulations', label: 'Applicable Regulations', type: 'textarea', required: true },
      { key: 'justification', label: 'Justification', type: 'textarea', required: true },
      { key: 'nextSteps', label: 'Next Steps', type: 'textarea', required: true },
      { key: 'sources', label: 'Sources', type: 'textarea', required: true },
      { key: 'classificationDate', label: 'Classification Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] },
      { key: 'analyst', label: 'Analyst', type: 'text', required: true }
    ]
  },
  {
    id: 'submission-checklist',
    name: '510(k) Submission Checklist',
    description: 'Template for 510(k) submission preparation checklist',
    type: 'submission-checklist',
    template: `# 510(k) Submission Checklist

## Device Information
- **Device Name**: {{deviceName}}
- **Product Code**: {{productCode}}
- **Submission Type**: {{submissionType}}

## Required Documents

### Administrative Information
- [ ] FDA Form 3514 (510(k) Summary)
- [ ] FDA Form 3601 (Indications for Use)
- [ ] Cover Letter
- [ ] 510(k) Summary or Statement
- [ ] Truthful and Accuracy Statement

### Device Information
- [ ] Device Description
- [ ] Intended Use Statement
- [ ] Substantial Equivalence Comparison
- [ ] Performance Standards
- [ ] Labeling (proposed and predicate)

### Testing and Validation
{{testingRequirements}}

### Special Controls (if applicable)
{{specialControls}}

## Predicate Device Information
- **Predicate K-Number**: {{predicateKNumber}}
- **Predicate Device Name**: {{predicateDeviceName}}

## Submission Timeline
- **Target Submission Date**: {{targetSubmissionDate}}
- **Expected Review Time**: 90 days (standard)

## Notes
{{notes}}

---
*Checklist Created*: {{checklistDate}}
*Last Updated*: {{lastUpdated}}
`,
    placeholders: [
      { key: 'deviceName', label: 'Device Name', type: 'text', required: true },
      { key: 'productCode', label: 'Product Code', type: 'text', required: true },
      { key: 'submissionType', label: 'Submission Type', type: 'select', required: true, options: ['Traditional 510(k)', 'Special 510(k)', 'Abbreviated 510(k)'] },
      { key: 'testingRequirements', label: 'Testing Requirements', type: 'textarea', required: true },
      { key: 'specialControls', label: 'Special Controls', type: 'textarea', required: false },
      { key: 'predicateKNumber', label: 'Predicate K-Number', type: 'text', required: true },
      { key: 'predicateDeviceName', label: 'Predicate Device Name', type: 'text', required: true },
      { key: 'targetSubmissionDate', label: 'Target Submission Date', type: 'date', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea', required: false },
      { key: 'checklistDate', label: 'Checklist Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] },
      { key: 'lastUpdated', label: 'Last Updated', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] }
    ]
  },
  {
    id: 'guidance-summary',
    name: 'FDA Guidance Summary',
    description: 'Template for summarizing FDA guidance documents',
    type: 'guidance-summary',
    template: `# FDA Guidance Summary

## Document Information
- **Title**: {{guidanceTitle}}
- **Document Number**: {{documentNumber}}
- **Effective Date**: {{effectiveDate}}
- **Document Type**: {{documentType}}

## Applicability
{{applicability}}

## Key Requirements
{{keyRequirements}}

## Recommendations
{{recommendations}}

## Impact on Our Device
{{deviceImpact}}

## Action Items
{{actionItems}}

## Source
- **URL**: {{guidanceUrl}}
- **Reviewed Date**: {{reviewDate}}
- **Reviewer**: {{reviewer}}
`,
    placeholders: [
      { key: 'guidanceTitle', label: 'Guidance Title', type: 'text', required: true },
      { key: 'documentNumber', label: 'Document Number', type: 'text', required: false },
      { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
      { key: 'documentType', label: 'Document Type', type: 'select', required: true, options: ['Final Guidance', 'Draft Guidance', 'Industry Guidance', 'Recognition List'] },
      { key: 'applicability', label: 'Applicability', type: 'textarea', required: true },
      { key: 'keyRequirements', label: 'Key Requirements', type: 'textarea', required: true },
      { key: 'recommendations', label: 'Recommendations', type: 'textarea', required: true },
      { key: 'deviceImpact', label: 'Impact on Our Device', type: 'textarea', required: true },
      { key: 'actionItems', label: 'Action Items', type: 'textarea', required: true },
      { key: 'guidanceUrl', label: 'Guidance URL', type: 'text', required: true },
      { key: 'reviewDate', label: 'Review Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] },
      { key: 'reviewer', label: 'Reviewer', type: 'text', required: true }
    ]
  }
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return documentTemplates.find(template => template.id === id);
}

export function getTemplatesByType(type: string): DocumentTemplate[] {
  return documentTemplates.filter(template => template.type === type);
}

export function renderTemplate(template: DocumentTemplate, values: Record<string, string>): string {
  let content = template.template;
  
  template.placeholders.forEach(placeholder => {
    const value = values[placeholder.key] || placeholder.defaultValue || '';
    const regex = new RegExp(`{{${placeholder.key}}}`, 'g');
    content = content.replace(regex, value);
  });
  
  return content;
}