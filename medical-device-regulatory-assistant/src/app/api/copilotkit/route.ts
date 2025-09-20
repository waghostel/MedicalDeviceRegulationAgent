import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/runtime';
import { NextRequest } from 'next/server';

// Backend API configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Helper function to call backend agent API
async function callBackendAgent(
  taskType: string,
  parameters: Record<string, any>,
  projectContext?: {
    projectId: string;
    deviceDescription: string;
    intendedUse: string;
    deviceType?: string;
  }
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In production, you'd include authentication headers here
      },
      body: JSON.stringify({
        task_type: taskType,
        project_id: projectContext?.projectId || 'default-project',
        device_description:
          projectContext?.deviceDescription || parameters.deviceDescription,
        intended_use: projectContext?.intendedUse || parameters.intendedUse,
        device_type: projectContext?.deviceType || parameters.deviceType,
        parameters,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Backend API call failed:', error);
    // Return fallback response
    return {
      error: `Backend unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fallback: true,
    };
  }
}

// Initialize the CopilotKit runtime with OpenAI
const copilotKit = new CopilotRuntime({
  actions: [
    {
      name: 'predicate_search',
      description:
        'Search for FDA 510(k) predicate devices based on device description and intended use',
      parameters: {
        type: 'object',
        properties: {
          deviceDescription: {
            type: 'string',
            description: 'Description of the medical device',
          },
          intendedUse: {
            type: 'string',
            description: 'Intended use statement for the device',
          },
          productCode: {
            type: 'string',
            description: 'FDA product code if known (optional)',
          },
          projectId: {
            type: 'string',
            description: 'Project ID for context (optional)',
          },
        },
        required: ['deviceDescription', 'intendedUse'],
      },
      handler: async ({
        deviceDescription,
        intendedUse,
        productCode,
        projectId,
      }) => {
        const result = await callBackendAgent(
          'predicate_search',
          { productCode },
          {
            projectId: projectId || 'copilot-session',
            deviceDescription,
            intendedUse,
          }
        );

        if (result.fallback) {
          // Return mock data if backend is unavailable
          return {
            predicates: [
              {
                kNumber: 'K123456',
                deviceName: 'Similar Device Example (Fallback)',
                intendedUse: 'Similar indication for testing',
                productCode: productCode || 'ABC',
                clearanceDate: '2023-01-15',
                confidenceScore: 0.85,
              },
            ],
            confidence: 0.85,
            reasoning: `Backend unavailable. Mock response for device: "${deviceDescription}" and intended use: "${intendedUse}"`,
            sources: [
              {
                url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
                title: 'FDA 510(k) Database - K123456 (Mock)',
                effectiveDate: '2023-01-15',
                documentType: 'FDA_510K' as const,
                accessedDate: new Date().toISOString(),
              },
            ],
            warning: result.error,
          };
        }

        // Format backend response for CopilotKit
        const backendResult = result.result || {};
        return {
          predicates: backendResult.predicates || [],
          confidence: result.confidence || 0.0,
          reasoning: result.reasoning || 'Analysis completed',
          sources: result.sources || [],
          executionTime: result.execution_time_ms,
          sessionId: result.session_id,
        };
      },
    },
    {
      name: 'classify_device',
      description:
        'Classify a medical device and determine FDA product code and regulatory pathway',
      parameters: {
        type: 'object',
        properties: {
          deviceDescription: {
            type: 'string',
            description: 'Description of the medical device',
          },
          intendedUse: {
            type: 'string',
            description: 'Intended use statement for the device',
          },
          technologyType: {
            type: 'string',
            description: 'Technology type (e.g., active, passive, software)',
          },
          projectId: {
            type: 'string',
            description: 'Project ID for context (optional)',
          },
        },
        required: ['deviceDescription', 'intendedUse'],
      },
      handler: async ({
        deviceDescription,
        intendedUse,
        technologyType,
        projectId,
      }) => {
        const result = await callBackendAgent(
          'device_classification',
          { technologyType },
          {
            projectId: projectId || 'copilot-session',
            deviceDescription,
            intendedUse,
            deviceType: technologyType,
          }
        );

        if (result.fallback) {
          // Return mock data if backend is unavailable
          return {
            deviceClass: 'II',
            productCode: 'ABC',
            regulatoryPathway: '510(k)',
            cfrSections: ['21 CFR 880.1234'],
            confidence: 0.78,
            reasoning: `Backend unavailable. Mock classification for device: "${deviceDescription}"`,
            sources: [
              {
                url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm',
                title: 'FDA CFR Database (Mock)',
                effectiveDate: '2024-01-01',
                documentType: 'CFR_SECTION' as const,
                accessedDate: new Date().toISOString(),
              },
            ],
            warning: result.error,
          };
        }

        // Format backend response for CopilotKit
        const backendResult = result.result || {};
        return {
          deviceClass: backendResult.device_class || 'Unknown',
          productCode: backendResult.product_code || 'Unknown',
          regulatoryPathway: backendResult.regulatory_pathway || 'Unknown',
          cfrSections: backendResult.cfr_sections || [],
          confidence: result.confidence || 0.0,
          reasoning: result.reasoning || 'Classification completed',
          sources: result.sources || [],
          executionTime: result.execution_time_ms,
          sessionId: result.session_id,
        };
      },
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
              intendedUse: { type: 'string' },
            },
          },
          predicateKNumber: {
            type: 'string',
            description: 'K-number of the predicate device to compare against',
          },
          projectId: {
            type: 'string',
            description: 'Project ID for context (optional)',
          },
        },
        required: ['userDevice', 'predicateKNumber'],
      },
      handler: async ({ userDevice, predicateKNumber, projectId }) => {
        const result = await callBackendAgent(
          'predicate_comparison',
          {
            predicate_k_number: predicateKNumber,
            user_device: userDevice,
          },
          {
            projectId: projectId || 'copilot-session',
            deviceDescription: userDevice.description,
            intendedUse: userDevice.intendedUse,
          }
        );

        if (result.fallback) {
          // Return mock data if backend is unavailable
          return {
            similarities: [
              {
                category: 'Intended Use',
                userDevice: userDevice.intendedUse,
                predicateDevice: 'Similar therapeutic indication',
                similarity: 'similar' as const,
                impact: 'low' as const,
                justification:
                  'Both devices target similar patient populations',
              },
            ],
            differences: [
              {
                category: 'Materials',
                userDevice: 'New biocompatible polymer',
                predicateDevice: 'Traditional stainless steel',
                similarity: 'different' as const,
                impact: 'medium' as const,
                justification:
                  'Material difference may require biocompatibility testing',
              },
            ],
            riskAssessment: 'medium' as const,
            testingRecommendations: [
              'Biocompatibility testing per ISO 10993',
              'Mechanical testing comparison',
            ],
            confidence: 0.82,
            sources: [
              {
                url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${predicateKNumber}`,
                title: `FDA 510(k) Database - ${predicateKNumber} (Mock)`,
                effectiveDate: '2023-01-15',
                documentType: 'FDA_510K' as const,
                accessedDate: new Date().toISOString(),
              },
            ],
            warning: result.error,
          };
        }

        // Format backend response for CopilotKit
        const backendResult = result.result || {};
        return {
          similarities: backendResult.similarities || [],
          differences: backendResult.differences || [],
          riskAssessment: backendResult.risk_assessment || 'unknown',
          testingRecommendations: backendResult.testing_recommendations || [],
          confidence: result.confidence || 0.0,
          reasoning: result.reasoning || 'Comparison completed',
          sources: result.sources || [],
          executionTime: result.execution_time_ms,
          sessionId: result.session_id,
        };
      },
    },
    {
      name: 'find_guidance',
      description: 'Search for relevant FDA guidance documents',
      parameters: {
        type: 'object',
        properties: {
          deviceType: {
            type: 'string',
            description: 'Type of medical device',
          },
          topic: {
            type: 'string',
            description: 'Specific topic or area of interest',
          },
          deviceDescription: {
            type: 'string',
            description: 'Description of the medical device (optional)',
          },
          intendedUse: {
            type: 'string',
            description: 'Intended use statement (optional)',
          },
          projectId: {
            type: 'string',
            description: 'Project ID for context (optional)',
          },
        },
        required: ['deviceType'],
      },
      handler: async ({
        deviceType,
        topic,
        deviceDescription,
        intendedUse,
        projectId,
      }) => {
        const result = await callBackendAgent(
          'guidance_search',
          {
            device_type: deviceType,
            topic,
          },
          {
            projectId: projectId || 'copilot-session',
            deviceDescription: deviceDescription || `${deviceType} device`,
            intendedUse: intendedUse || `Medical device of type: ${deviceType}`,
            deviceType,
          }
        );

        if (result.fallback) {
          // Return mock data if backend is unavailable
          return {
            guidanceDocuments: [
              {
                title: 'Guidance for Industry: 510(k) Submissions',
                url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/510k-submissions',
                effectiveDate: '2023-01-01',
                summary: 'General guidance for 510(k) submission requirements',
                relevanceScore: 0.9,
              },
            ],
            confidence: 0.88,
            sources: [
              {
                url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents',
                title: 'FDA Guidance Documents Database (Mock)',
                effectiveDate: '2024-01-01',
                documentType: 'FDA_GUIDANCE' as const,
                accessedDate: new Date().toISOString(),
              },
            ],
            warning: result.error,
          };
        }

        // Format backend response for CopilotKit
        const backendResult = result.result || {};
        return {
          guidanceDocuments: backendResult.guidance_documents || [],
          confidence: result.confidence || 0.0,
          reasoning: result.reasoning || 'Guidance search completed',
          sources: result.sources || [],
          executionTime: result.execution_time_ms,
          sessionId: result.session_id,
        };
      },
    },
  ],
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
