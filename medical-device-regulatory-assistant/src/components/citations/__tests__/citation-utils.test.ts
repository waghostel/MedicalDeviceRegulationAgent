import { SourceCitation } from '@/types/copilot';

import {
  formatCitation,
  validateCitation,
  validateSourceUrl,
  getDocumentTypeDisplayName,
  getDocumentTypeIcon,
  CitationFormat,
} from '../citation-utils';

// Mock fetch for URL validation tests
global.fetch = jest.fn();

describe('Citation Utils', () => {
  const mockCitation: SourceCitation = {
    url: 'https://www.fda.gov/medical-devices/510k-clearances/k123456',
    title: 'Test Medical Device 510(k) Summary',
    effectiveDate: '2023-01-15',
    documentType: 'FDA_510K',
    accessedDate: '2024-01-15',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatCitation', () => {
    it('should format FDA 510(k) citation in APA style', () => {
      const result = formatCitation(mockCitation, 'APA');
      expect(result).toContain('U.S. Food and Drug Administration');
      expect(result).toContain('January 15, 2023');
      expect(result).toContain('Retrieved January 15, 2024');
      expect(result).toContain(mockCitation.url);
    });

    it('should format FDA 510(k) citation in MLA style', () => {
      const result = formatCitation(mockCitation, 'MLA');
      expect(result).toContain('U.S. Food and Drug Administration');
      expect(result).toContain('15 January 2023');
      expect(result).toContain('Accessed 15 January 2024');
      expect(result).toContain(mockCitation.url);
    });

    it('should format FDA Guidance citation correctly', () => {
      const guidanceCitation: SourceCitation = {
        ...mockCitation,
        documentType: 'FDA_GUIDANCE',
        title: 'Guidance for Industry: 510(k) Device Modifications',
      };

      const apaResult = formatCitation(guidanceCitation, 'APA');
      expect(apaResult).toContain('[Guidance document]');

      const mlaResult = formatCitation(guidanceCitation, 'MLA');
      expect(mlaResult).toContain('FDA Guidance Document');
    });

    it('should format CFR Section citation correctly', () => {
      const cfrCitation: SourceCitation = {
        ...mockCitation,
        documentType: 'CFR_SECTION',
        title: '21 CFR 820.30 - Design Controls',
      };

      const apaResult = formatCitation(cfrCitation, 'APA');
      expect(apaResult).toContain('21 C.F.R.');

      const mlaResult = formatCitation(cfrCitation, 'MLA');
      expect(mlaResult).toContain('Code of Federal Regulations');
    });

    it('should format FDA Database citation correctly', () => {
      const dbCitation: SourceCitation = {
        ...mockCitation,
        documentType: 'FDA_DATABASE',
        title: 'FDA 510(k) Premarket Notification Database',
      };

      const apaResult = formatCitation(dbCitation, 'APA');
      expect(apaResult).toContain('[Database]');

      const mlaResult = formatCitation(dbCitation, 'MLA');
      expect(mlaResult).toContain('FDA Database');
    });

    it('should default to APA format for unknown format', () => {
      const result = formatCitation(mockCitation, 'UNKNOWN' as CitationFormat);
      expect(result).toContain('U.S. Food and Drug Administration');
      expect(result).toContain('Retrieved');
    });
  });

  describe('validateCitation', () => {
    it('should validate a complete citation as valid', () => {
      const result = validateCitation(mockCitation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing title', () => {
      const invalidCitation = { ...mockCitation, title: '' };
      const result = validateCitation(invalidCitation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should identify missing URL', () => {
      const invalidCitation = { ...mockCitation, url: '' };
      const result = validateCitation(invalidCitation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL is required');
    });

    it('should identify invalid URL format', () => {
      const invalidCitation = { ...mockCitation, url: 'not-a-url' };
      const result = validateCitation(invalidCitation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL format is invalid');
    });

    it('should identify missing effective date', () => {
      const invalidCitation = { ...mockCitation, effectiveDate: '' };
      const result = validateCitation(invalidCitation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Effective date is required');
    });

    it('should identify invalid date format', () => {
      const invalidCitation = { ...mockCitation, effectiveDate: 'not-a-date' };
      const result = validateCitation(invalidCitation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Effective date format is invalid');
    });

    it('should identify missing document type', () => {
      const invalidCitation = {
        ...mockCitation,
        documentType: undefined as any,
      };
      const result = validateCitation(invalidCitation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Document type is required');
    });
  });

  describe('validateSourceUrl', () => {
    it('should return true for accessible URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const result = await validateSourceUrl('https://www.fda.gov');
      expect(result).toBe(true);
    });

    it('should return true for inaccessible URL (no-cors limitation)', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await validateSourceUrl('https://invalid-url.com');
      // Due to no-cors mode limitation, this returns true
      expect(result).toBe(true);
    });
  });

  describe('getDocumentTypeDisplayName', () => {
    it('should return correct display names', () => {
      expect(getDocumentTypeDisplayName('FDA_510K')).toBe('FDA 510(k)');
      expect(getDocumentTypeDisplayName('FDA_GUIDANCE')).toBe('FDA Guidance');
      expect(getDocumentTypeDisplayName('CFR_SECTION')).toBe('CFR Section');
      expect(getDocumentTypeDisplayName('FDA_DATABASE')).toBe('FDA Database');
    });

    it('should return Unknown for invalid type', () => {
      expect(getDocumentTypeDisplayName('INVALID' as any)).toBe('Unknown');
    });
  });

  describe('getDocumentTypeIcon', () => {
    it('should return correct icons', () => {
      expect(getDocumentTypeIcon('FDA_510K')).toBe('📋');
      expect(getDocumentTypeIcon('FDA_GUIDANCE')).toBe('📖');
      expect(getDocumentTypeIcon('CFR_SECTION')).toBe('⚖️');
      expect(getDocumentTypeIcon('FDA_DATABASE')).toBe('🗄️');
    });

    it('should return default icon for invalid type', () => {
      expect(getDocumentTypeIcon('INVALID' as any)).toBe('📄');
    });
  });
});
