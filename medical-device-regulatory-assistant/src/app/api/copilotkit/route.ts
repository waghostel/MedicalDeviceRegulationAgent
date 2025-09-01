import { NextRequest } from 'next/server';
import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/runtime';

// Initialize the CopilotKit runtime with OpenAI
const copilotKit = new CopilotRuntime({
  actions: [
    {
      name: 'predicate_search',
      description: 'Search for FDA 510(k) predicate devices based on device description and intended use',
      parameters: {
        type: 'object',
        properties: {
          deviceDescription: {
            type: 'string',
            description: 'Description of the medical device'
          },
          intendedUse: {
            type: 'string',
            description: 'Intended use statement for the device'
          },
          productCode: {
            type: 'string',
            description: 'FDA product code if known (optional)'
          }
        },
        required: ['deviceDescription', 'intendedUse']
      },
      handler: async ({ deviceDescription, intendedUse, productCode }) => {
        // This will be implemented when we connect to the backend
        // For now, return a mock response
        return {
          predicates: [
            {
              kNumber: 'K123456',
              deviceName: 'Similar Device Example',
              intendedUse: 'Similar indication for testing',
              productCode: productCode || 'ABC',
              clearanceDate: '2023-01-15',
              confidenceScore: 0.85
            }
          ],
          confidence: 0.85,
          reasoning: `Found potential predicates based on device description: "${deviceDescription}" and intended use: "${intendedUse}"`,
          sources: [
            {
              url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
              title: 'FDA 510(k) Database - K123456',
              effectiveDate: '2023-01-15',
              documentType: 'FDA_510K' as const,
              accessedDate: new Date().toISOString()
            }
          ]
        };
      }
    },
    {
      name: 'classify_device',
      description: 'Classify a medical device and determine FDA product code and regulatory pathway',
      parameters: {
        type: 'object',
        properties: {
          deviceDescription: {
            type: 'string',
            description: 'Description of the medical device'
          },
          intendedUse: {
            type: 'string',
            description: 'Intended use statement for the device'
          },
          technologyType: {
            type: 'string',
            description: 'Technology type (e.g., active, passive, software)'
          }
        },
        required: ['deviceDescription', 'intendedUse']
      },
      handler: async ({ deviceDescription, intendedUse, technologyType }) => {
        // Mock classification response
        return {
          deviceClass: 'II',
          productCode: 'ABC',
          regulatoryPathway: '510(k)',
          cfrSections: ['21 CFR 880.1234'],
          confidence: 0.78,
          reasoning: `Based on the device description and intended use, this appears to be a Class II device requiring 510(k) clearance.`,
          sources: [
            {
              url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm',
              title: 'FDA CFR Database',
              effectiveDate: '2024-01-01',
              documentType: 'CFR_SECTION' as const,
              accessedDate: new Date().toISOString()
            }
          ]
        };
      }
    },
    {
      name: 'compare_predicate',
      description: 'Compare user device with a specific predicate device',
      parameters: {
        type: 'object',
        properties: {
          userDevice: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              intendedUse: { type: 'string' }
            }
          },
          predicateKNumber: {
            type: 'string',
            description: 'K-number of the predicate device to compare against'
          }
        },
        required: ['userDevice', 'predicateKNumber']
      },
      handler: async ({ userDevice, predicateKNumber }) => {
        // Mock comparison response
        return {
          similarities: [
            {
              category: 'Intended Use',
              userDevice: userDevice.intendedUse,
              predicateDevice: 'Similar therapeutic indication',
              similarity: 'similar' as const,
              impact: 'low' as const,
              justification: 'Both devices target similar patient populations'
            }
          ],
          differences: [
            {
              category: 'Materials',
              userDevice: 'New biocompatible polymer',
              predicateDevice: 'Traditional stainless steel',
              similarity: 'different' as const,
              impact: 'medium' as const,
              justification: 'Material difference may require biocompatibility testing'
            }
          ],
          riskAssessment: 'medium' as const,
          testingRecommendations: [
            'Biocompatibility testing per ISO 10993',
            'Mechanical testing comparison'
          ],
          confidence: 0.82,
          sources: [
            {
              url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${predicateKNumber}`,
              title: `FDA 510(k) Database - ${predicateKNumber}`,
              effectiveDate: '2023-01-15',
              documentType: 'FDA_510K' as const,
              accessedDate: new Date().toISOString()
            }
          ]
        };
      }
    },
    {
      name: 'find_guidance',
      description: 'Search for relevant FDA guidance documents',
      parameters: {
        type: 'object',
        properties: {
          deviceType: {
            type: 'string',
            description: 'Type of medical device'
          },
          topic: {
            type: 'string',
            description: 'Specific topic or area of interest'
          }
        },
        required: ['deviceType']
      },
      handler: async ({ deviceType, topic }) => {
        // Mock guidance search response
        return {
          guidanceDocuments: [
            {
              title: 'Guidance for Industry: 510(k) Submissions',
              url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/510k-submissions',
              effectiveDate: '2023-01-01',
              summary: 'General guidance for 510(k) submission requirements',
              relevanceScore: 0.9
            }
          ],
          confidence: 0.88,
          sources: [
            {
              url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents',
              title: 'FDA Guidance Documents Database',
              effectiveDate: '2024-01-01',
              documentType: 'FDA_GUIDANCE' as const,
              accessedDate: new Date().toISOString()
            }
          ]
        };
      }
    }
  ]
});

export async function POST(req: NextRequest) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    return new Response('OpenAI API key not configured', { status: 500 });
  }

  try {
    const { handleRequest } = copilotKit;
    return handleRequest(req, new OpenAIAdapter({ apiKey: openaiApiKey }));
  } catch (error) {
    console.error('CopilotKit API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}