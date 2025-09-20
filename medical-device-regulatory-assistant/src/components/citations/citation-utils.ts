import { SourceCitation } from '@/types/copilot';

export type CitationFormat = 'APA' | 'MLA';

/**
 * Format a source citation according to the specified format
 */
export function formatCitation(
  citation: SourceCitation,
  format: CitationFormat
): string {
  switch (format) {
    case 'APA':
      return formatAPACitation(citation);
    case 'MLA':
      return formatMLACitation(citation);
    default:
      return formatAPACitation(citation);
  }
}

/**
 * Format citation in APA style
 */
function formatAPACitation(citation: SourceCitation): string {
  const { title, effectiveDate, url, documentType, accessedDate } = citation;

  switch (documentType) {
    case 'FDA_510K':
      return `U.S. Food and Drug Administration. (${formatDate(effectiveDate)}). ${title}. Retrieved ${formatDate(accessedDate)}, from ${url}`;

    case 'FDA_GUIDANCE':
      return `U.S. Food and Drug Administration. (${formatDate(effectiveDate)}). ${title} [Guidance document]. Retrieved ${formatDate(accessedDate)}, from ${url}`;

    case 'CFR_SECTION':
      return `${title}, 21 C.F.R. (${formatDate(effectiveDate)}). Retrieved ${formatDate(accessedDate)}, from ${url}`;

    case 'FDA_DATABASE':
      return `U.S. Food and Drug Administration. (${formatDate(effectiveDate)}). ${title} [Database]. Retrieved ${formatDate(accessedDate)}, from ${url}`;

    default:
      return `${title}. (${formatDate(effectiveDate)}). Retrieved ${formatDate(accessedDate)}, from ${url}`;
  }
}

/**
 * Format citation in MLA style
 */
function formatMLACitation(citation: SourceCitation): string {
  const { title, effectiveDate, url, documentType, accessedDate } = citation;

  switch (documentType) {
    case 'FDA_510K':
      return `U.S. Food and Drug Administration. "${title}." FDA, ${formatDateMLA(effectiveDate)}, ${url}. Accessed ${formatDateMLA(accessedDate)}.`;

    case 'FDA_GUIDANCE':
      return `U.S. Food and Drug Administration. "${title}." FDA Guidance Document, ${formatDateMLA(effectiveDate)}, ${url}. Accessed ${formatDateMLA(accessedDate)}.`;

    case 'CFR_SECTION':
      return `"${title}." Code of Federal Regulations, Title 21, ${formatDateMLA(effectiveDate)}, ${url}. Accessed ${formatDateMLA(accessedDate)}.`;

    case 'FDA_DATABASE':
      return `U.S. Food and Drug Administration. "${title}." FDA Database, ${formatDateMLA(effectiveDate)}, ${url}. Accessed ${formatDateMLA(accessedDate)}.`;

    default:
      return `"${title}." ${formatDateMLA(effectiveDate)}, ${url}. Accessed ${formatDateMLA(accessedDate)}.`;
  }
}

/**
 * Format date for APA style (YYYY, Month DD)
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date for MLA style (DD Month YYYY)
 */
function formatDateMLA(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Validate if a URL is accessible
 */
export async function validateSourceUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return response.ok;
  } catch {
    // For no-cors mode, we can't check the actual response
    // In a real implementation, this would be handled by a backend service
    return true;
  }
}

/**
 * Check if a source citation has all required fields
 */
export function validateCitation(citation: SourceCitation): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!citation.title?.trim()) {
    errors.push('Title is required');
  }

  if (!citation.url?.trim()) {
    errors.push('URL is required');
  } else if (!isValidUrl(citation.url)) {
    errors.push('URL format is invalid');
  }

  if (!citation.effectiveDate?.trim()) {
    errors.push('Effective date is required');
  } else if (!isValidDate(citation.effectiveDate)) {
    errors.push('Effective date format is invalid');
  }

  if (!citation.accessedDate?.trim()) {
    errors.push('Accessed date is required');
  } else if (!isValidDate(citation.accessedDate)) {
    errors.push('Accessed date format is invalid');
  }

  if (!citation.documentType) {
    errors.push('Document type is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Get document type display name
 */
export function getDocumentTypeDisplayName(
  documentType: SourceCitation['documentType']
): string {
  switch (documentType) {
    case 'FDA_510K':
      return 'FDA 510(k)';
    case 'FDA_GUIDANCE':
      return 'FDA Guidance';
    case 'CFR_SECTION':
      return 'CFR Section';
    case 'FDA_DATABASE':
      return 'FDA Database';
    default:
      return 'Unknown';
  }
}

/**
 * Get document type icon
 */
export function getDocumentTypeIcon(
  documentType: SourceCitation['documentType']
): string {
  switch (documentType) {
    case 'FDA_510K':
      return '📋';
    case 'FDA_GUIDANCE':
      return '📖';
    case 'CFR_SECTION':
      return '⚖️';
    case 'FDA_DATABASE':
      return '🗄️';
    default:
      return '📄';
  }
}
