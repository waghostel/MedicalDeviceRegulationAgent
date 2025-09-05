import { test, expect } from '@playwright/test';

test.describe('Agent Workflow and AI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            name: 'Test User',
            email: 'test@example.com'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      });
    });

    // Mock agent conversation API
    await page.route('**/api/agent/chat', async (route) => {
      const requestBody = await route.request().postDataJSON();
      const message = requestBody.message.toLowerCase();
      
      let response;
      
      if (message.includes('/predicate-search') || message.includes('predicate')) {
        response = {
          id: 'msg-' + Date.now(),
          content: `I'll help you search for predicate devices. Based on your device description, I found several potential predicates:

## Predicate Search Results

### 1. CardioMonitor Pro (K123456)
- **Intended Use**: Continuous cardiac rhythm monitoring
- **Confidence Score**: 89%
- **Clearance Date**: June 15, 2023
- **Similarities**: Same intended use, similar technology
- **Key Differences**: Different electrode configuration

### 2. HeartTracker Elite (K789012)  
- **Intended Use**: Cardiac arrhythmia detection
- **Confidence Score**: 85%
- **Clearance Date**: August 22, 2023
- **Similarities**: Cardiac monitoring, real-time analysis
- **Key Differences**: Focus on arrhythmia vs general monitoring

Would you like me to perform a detailed comparison with any of these predicates?`,
          type: 'agent_response',
          confidence: 0.87,
          sources: [
            {
              title: 'FDA 510(k) Database - K123456',
              url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
              type: 'FDA_510K'
            },
            {
              title: 'FDA 510(k) Database - K789012', 
              url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K789012',
              type: 'FDA_510K'
            }
          ],
          timestamp: new Date().toISOString()
        };
      } else if (message.includes('/classify-device') || message.includes('classify')) {
        response = {
          id: 'msg-' + Date.now(),
          content: `I'll analyze your device classification. Based on the device description and intended use:

## Device Classification Analysis

### Classification Result
- **Device Class**: Class II
- **Product Code**: DQK (Electrocardiograph)
- **Regulatory Pathway**: 510(k) Premarket Notification
- **Confidence Score**: 92%

### Reasoning
Your device falls under Class II because it:
1. Performs continuous cardiac monitoring (moderate risk)
2. Uses established technology with known safety profile
3. Requires special controls for safety and effectiveness

### Applicable Regulations
- **21 CFR 870.2300** - Electrocardiograph
- **FDA Guidance**: "Clinical Evaluation of ECG Devices"

### Next Steps
1. Identify predicate devices for 510(k) submission
2. Review special controls requirements
3. Plan clinical evaluation strategy

Would you like me to search for predicate devices or provide more details about the regulatory requirements?`,
          type: 'agent_response',
          confidence: 0.92,
          sources: [
            {
              title: '21 CFR 870.2300 - Electrocardiograph',
              url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=870.2300',
              type: 'CFR_SECTION'
            }
          ],
          timestamp: new Date().toISOString()
        };
      } else if (message.includes('/find-guidance') || message.includes('guidance')) {
        response = {
          id: 'msg-' + Date.now(),
          content: `I'll help you find relevant FDA guidance documents:

## Relevant FDA Guidance Documents

### 1. Clinical Evaluation of Electrocardiographs
- **Document Type**: Final Guidance
- **Effective Date**: March 2019
- **Relevance**: Directly applicable to cardiac monitoring devices
- **Key Topics**: Clinical study design, performance testing

### 2. Cybersecurity in Medical Devices
- **Document Type**: Final Guidance  
- **Effective Date**: October 2022
- **Relevance**: If your device has connectivity features
- **Key Topics**: Risk assessment, security controls

### 3. Software as Medical Device (SaMD)
- **Document Type**: Final Guidance
- **Effective Date**: December 2021
- **Relevance**: If your device includes software components
- **Key Topics**: Software classification, validation

Would you like me to provide more details about any of these guidance documents or search for additional ones?`,
          type: 'agent_response',
          confidence: 0.88,
          sources: [
            {
              title: 'Clinical Evaluation of Electrocardiographs - FDA Guidance',
              url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-evaluation-electrocardiographs',
              type: 'FDA_GUIDANCE'
            }
          ],
          timestamp: new Date().toISOString()
        };
      } else {
        response = {
          id: 'msg-' + Date.now(),
          content: `I'm here to help with your medical device regulatory questions. I can assist with:

- **/predicate-search** - Find similar devices for 510(k) submissions
- **/classify-device** - Determine device class and regulatory pathway  
- **/find-guidance** - Locate relevant FDA guidance documents
- **/compare-predicate** - Detailed predicate comparison analysis

What would you like help with today?`,
          type: 'agent_response',
          confidence: 0.95,
          sources: [],
          timestamp: new Date().toISOString()
        };
      }
      
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Mock file upload API
    await page.route('**/api/agent/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'file-' + Date.now(),
          filename: 'test-document.pdf',
          size: 1024000,
          type: 'application/pdf',
          status: 'uploaded',
          analysis: {
            document_type: 'Technical Specification',
            key_findings: [
              'Device operates at 12V DC',
              'Wireless connectivity via Bluetooth 5.0',
              'FDA Class II device classification mentioned'
            ]
          }
        })
      });
    });
  });

  test('Complete agent conversation flow with mock AI responses', async ({ page }) => {
    await page.goto('/projects/test-project/agent');
    
    // Verify agent interface loads
    await expect(page.locator('[data-testid="agent-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Take screenshot of initial agent interface
    await page.screenshot({ 
      path: 'test-results/screenshots/25-agent-interface-initial.png',
      fullPage: true 
    });

    // Test basic conversation
    await page.fill('[data-testid="chat-input"]', 'Hello, I need help with my medical device');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Verify typing indicator appears
    const typingIndicator = page.locator('[data-testid="typing-indicator"]');
    if (await typingIndicator.isVisible({ timeout: 1000 })) {
      await expect(typingIndicator).toBeVisible();
      
      // Take screenshot of typing indicator
      await page.screenshot({ 
        path: 'test-results/screenshots/26-typing-indicator.png',
        fullPage: true 
      });
    }
    
    // Wait for agent response
    await expect(page.locator('[data-testid="agent-message"]')).toBeVisible({ timeout: 10000 });
    
    // Verify response contains expected content
    const agentResponse = page.locator('[data-testid="agent-message"]').last();
    await expect(agentResponse).toContainText('help with');
    
    // Take screenshot of conversation
    await page.screenshot({ 
      path: 'test-results/screenshots/27-agent-conversation.png',
      fullPage: true 
    });

    // Test device classification workflow
    await page.fill('[data-testid="chat-input"]', '/classify-device cardiac monitoring device for continuous rhythm analysis');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Wait for classification response
    await expect(page.locator('[data-testid="agent-message"]').last()).toBeVisible({ timeout: 10000 });
    
    // Verify classification content
    const classificationResponse = page.locator('[data-testid="agent-message"]').last();
    await expect(classificationResponse).toContainText('Class II');
    await expect(classificationResponse).toContainText('510(k)');
    await expect(classificationResponse).toContainText('Confidence Score');
    
    // Take screenshot of classification response
    await page.screenshot({ 
      path: 'test-results/screenshots/28-classification-response.png',
      fullPage: true 
    });
  });

  test('Slash command functionality and quick action buttons', async ({ page }) => {
    await page.goto('/projects/test-project/agent');
    
    // Test predicate search slash command
    await page.fill('[data-testid="chat-input"]', '/predicate-search');
    
    // Check if autocomplete or command suggestions appear
    const commandSuggestions = page.locator('[data-testid="command-suggestions"]');
    if (await commandSuggestions.isVisible({ timeout: 1000 })) {
      await expect(commandSuggestions).toBeVisible();
      
      // Take screenshot of command suggestions
      await page.screenshot({ 
        path: 'test-results/screenshots/29-command-suggestions.png',
        fullPage: true 
      });
    }
    
    // Complete the command
    await page.fill('[data-testid="chat-input"]', '/predicate-search cardiac monitor continuous monitoring');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Wait for predicate search results
    await expect(page.locator('[data-testid="agent-message"]').last()).toBeVisible({ timeout: 10000 });
    
    const predicateResponse = page.locator('[data-testid="agent-message"]').last();
    await expect(predicateResponse).toContainText('Predicate Search Results');
    await expect(predicateResponse).toContainText('K123456');
    await expect(predicateResponse).toContainText('Confidence Score');
    
    // Take screenshot of predicate results
    await page.screenshot({ 
      path: 'test-results/screenshots/30-predicate-search-results.png',
      fullPage: true 
    });

    // Test other slash commands
    const slashCommands = [
      '/classify-device medical device for patient monitoring',
      '/find-guidance electrocardiograph guidance documents'
    ];
    
    for (const command of slashCommands) {
      await page.fill('[data-testid="chat-input"]', command);
      await page.press('[data-testid="chat-input"]', 'Enter');
      
      // Wait for response
      await page.waitForSelector('[data-testid="agent-message"]', { timeout: 10000 });
      
      // Verify response appears
      const responses = page.locator('[data-testid="agent-message"]');
      const responseCount = await responses.count();
      expect(responseCount).toBeGreaterThan(0);
    }

    // Test quick action buttons if present
    const quickActionButtons = [
      'quick-classify',
      'quick-predicate-search',
      'quick-guidance-search',
      'quick-export'
    ];
    
    for (const buttonId of quickActionButtons) {
      const button = page.locator(`[data-testid="${buttonId}"]`);
      if (await button.isVisible()) {
        await button.click();
        
        // Verify action triggered (could be modal, input population, etc.)
        await page.waitForTimeout(1000);
        
        // Take screenshot of quick action result
        await page.screenshot({ 
          path: `test-results/screenshots/31-quick-action-${buttonId}.png`,
          fullPage: true 
        });
        
        // Close any modals that opened
        const closeButton = page.locator('[data-testid="close-modal"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('Citation panel updates and external link navigation', async ({ page }) => {
    await page.goto('/projects/test-project/agent');
    
    // Trigger a response that includes citations
    await page.fill('[data-testid="chat-input"]', '/classify-device');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Wait for response with citations
    await expect(page.locator('[data-testid="agent-message"]').last()).toBeVisible({ timeout: 10000 });
    
    // Check if citation panel appears
    const citationPanel = page.locator('[data-testid="citation-panel"]');
    if (await citationPanel.isVisible()) {
      await expect(citationPanel).toBeVisible();
      
      // Take screenshot of citation panel
      await page.screenshot({ 
        path: 'test-results/screenshots/32-citation-panel.png',
        fullPage: true 
      });
      
      // Test citation panel expansion/collapse
      const expandButton = page.locator('[data-testid="expand-citations"]');
      if (await expandButton.isVisible()) {
        await expandButton.click();
        
        // Verify expanded state
        await expect(page.locator('[data-testid="citation-details"]')).toBeVisible();
        
        // Take screenshot of expanded citations
        await page.screenshot({ 
          path: 'test-results/screenshots/33-expanded-citations.png',
          fullPage: true 
        });
      }
      
      // Test individual citation links
      const citationLinks = page.locator('[data-testid="citation-link"]');
      const linkCount = await citationLinks.count();
      
      if (linkCount > 0) {
        // Test first citation link
        const firstLink = citationLinks.first();
        
        // Verify link has proper attributes
        await expect(firstLink).toHaveAttribute('href');
        await expect(firstLink).toHaveAttribute('target', '_blank');
        
        // Get the href to verify it's a valid FDA URL
        const href = await firstLink.getAttribute('href');
        expect(href).toMatch(/fda\.gov|accessdata\.fda\.gov/);
        
        // Test link click (opens in new tab)
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page'),
          firstLink.click()
        ]);
        
        // Verify new page opened
        expect(newPage.url()).toContain('fda.gov');
        
        // Close the new tab
        await newPage.close();
      }
    }
    
    // Test inline citations in message content
    const messageWithCitations = page.locator('[data-testid="agent-message"]').last();
    const inlineCitations = messageWithCitations.locator('[data-testid="inline-citation"]');
    const inlineCitationCount = await inlineCitations.count();
    
    if (inlineCitationCount > 0) {
      // Test inline citation hover/click
      await inlineCitations.first().hover();
      
      // Check if citation tooltip appears
      const citationTooltip = page.locator('[data-testid="citation-tooltip"]');
      if (await citationTooltip.isVisible({ timeout: 2000 })) {
        await expect(citationTooltip).toBeVisible();
        
        // Take screenshot of citation tooltip
        await page.screenshot({ 
          path: 'test-results/screenshots/34-citation-tooltip.png',
          fullPage: true 
        });
      }
    }
  });

  test('File upload and document processing workflows', async ({ page }) => {
    await page.goto('/projects/test-project/agent');
    
    // Test file upload functionality
    const fileUploadButton = page.locator('[data-testid="file-upload-button"]');
    const fileInput = page.locator('[data-testid="file-input"]');
    
    if (await fileUploadButton.isVisible()) {
      // Create a test file
      const testFileContent = 'Test document content for medical device specification';
      
      // Set up file chooser
      const fileChooserPromise = page.waitForEvent('filechooser');
      await fileUploadButton.click();
      const fileChooser = await fileChooserPromise;
      
      // Create a temporary file for testing
      await fileChooser.setFiles({
        name: 'test-device-spec.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(testFileContent)
      });
      
      // Verify upload progress
      const uploadProgress = page.locator('[data-testid="upload-progress"]');
      if (await uploadProgress.isVisible({ timeout: 2000 })) {
        await expect(uploadProgress).toBeVisible();
        
        // Take screenshot of upload progress
        await page.screenshot({ 
          path: 'test-results/screenshots/35-file-upload-progress.png',
          fullPage: true 
        });
      }
      
      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
      
      // Verify file appears in chat
      await expect(page.locator('[data-testid="uploaded-file"]')).toBeVisible();
      await expect(page.locator('[data-testid="uploaded-file"]')).toContainText('test-device-spec.pdf');
      
      // Take screenshot of uploaded file
      await page.screenshot({ 
        path: 'test-results/screenshots/36-uploaded-file.png',
        fullPage: true 
      });
      
      // Test document analysis
      const analyzeButton = page.locator('[data-testid="analyze-document"]');
      if (await analyzeButton.isVisible()) {
        await analyzeButton.click();
        
        // Wait for analysis results
        await expect(page.locator('[data-testid="document-analysis"]')).toBeVisible({ timeout: 15000 });
        
        // Verify analysis content
        const analysisResult = page.locator('[data-testid="document-analysis"]');
        await expect(analysisResult).toContainText('Technical Specification');
        
        // Take screenshot of document analysis
        await page.screenshot({ 
          path: 'test-results/screenshots/37-document-analysis.png',
          fullPage: true 
        });
      }
    }
    
    // Test drag and drop file upload
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    if (await dropZone.isVisible()) {
      // Simulate drag and drop
      await dropZone.hover();
      
      // Create drag over effect
      await page.dispatchEvent('[data-testid="file-drop-zone"]', 'dragover', {
        dataTransfer: {
          files: [{
            name: 'dragged-file.pdf',
            type: 'application/pdf'
          }]
        }
      });
      
      // Verify drop zone highlights
      await expect(dropZone).toHaveClass(/drag-over|highlighted/);
      
      // Take screenshot of drag over state
      await page.screenshot({ 
        path: 'test-results/screenshots/38-drag-over-state.png',
        fullPage: true 
      });
    }
  });

  test('Conversation history persistence and context maintenance', async ({ page }) => {
    await page.goto('/projects/test-project/agent');
    
    // Start a conversation
    await page.fill('[data-testid="chat-input"]', 'I have a cardiac monitoring device');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Wait for response
    await expect(page.locator('[data-testid="agent-message"]')).toBeVisible({ timeout: 10000 });
    
    // Continue conversation with context
    await page.fill('[data-testid="chat-input"]', '/classify-device');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Wait for classification response
    await expect(page.locator('[data-testid="agent-message"]').nth(1)).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of conversation history
    await page.screenshot({ 
      path: 'test-results/screenshots/39-conversation-history.png',
      fullPage: true 
    });
    
    // Test page refresh - conversation should persist
    await page.reload();
    
    // Verify conversation history is restored
    await expect(page.locator('[data-testid="agent-message"]')).toHaveCount(2);
    
    // Verify messages contain expected content
    const messages = page.locator('[data-testid="agent-message"]');
    await expect(messages.first()).toContainText('help with');
    await expect(messages.nth(1)).toContainText('Class II');
    
    // Test conversation export if available
    const exportButton = page.locator('[data-testid="export-conversation"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Verify export modal or download
      const exportModal = page.locator('[data-testid="export-modal"]');
      if (await exportModal.isVisible()) {
        await expect(exportModal).toBeVisible();
        
        // Take screenshot of export options
        await page.screenshot({ 
          path: 'test-results/screenshots/40-export-conversation.png',
          fullPage: true 
        });
        
        // Test different export formats
        const exportFormats = ['pdf', 'markdown', 'json'];
        for (const format of exportFormats) {
          const formatButton = page.locator(`[data-testid="export-${format}"]`);
          if (await formatButton.isVisible()) {
            await formatButton.click();
            
            // Wait for download or processing
            await page.waitForTimeout(2000);
          }
        }
        
        // Close export modal
        await page.click('[data-testid="close-export-modal"]');
      }
    }
    
    // Test conversation search if available
    const searchInput = page.locator('[data-testid="conversation-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('cardiac');
      
      // Verify search highlights
      const searchResults = page.locator('[data-testid="search-highlight"]');
      if (await searchResults.count() > 0) {
        await expect(searchResults.first()).toBeVisible();
        
        // Take screenshot of search results
        await page.screenshot({ 
          path: 'test-results/screenshots/41-conversation-search.png',
          fullPage: true 
        });
      }
      
      // Clear search
      await searchInput.clear();
    }
    
    // Test conversation context in new messages
    await page.fill('[data-testid="chat-input"]', 'What predicates would work for this device?');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Wait for contextual response
    await expect(page.locator('[data-testid="agent-message"]').nth(2)).toBeVisible({ timeout: 10000 });
    
    // Verify response shows understanding of context
    const contextualResponse = page.locator('[data-testid="agent-message"]').nth(2);
    await expect(contextualResponse).toContainText('predicate');
    
    // Take screenshot of final conversation
    await page.screenshot({ 
      path: 'test-results/screenshots/42-contextual-conversation.png',
      fullPage: true 
    });
  });

  test('Agent performance and response time testing', async ({ page }) => {
    await page.goto('/projects/test-project/agent');
    
    // Test response times for different types of queries
    const testQueries = [
      { query: '/classify-device', expectedTime: 5000, type: 'classification' },
      { query: '/predicate-search cardiac monitor', expectedTime: 8000, type: 'predicate_search' },
      { query: '/find-guidance', expectedTime: 3000, type: 'guidance_search' },
      { query: 'What is a 510(k)?', expectedTime: 2000, type: 'general_question' }
    ];
    
    for (const testQuery of testQueries) {
      const startTime = Date.now();
      
      await page.fill('[data-testid="chat-input"]', testQuery.query);
      await page.press('[data-testid="chat-input"]', 'Enter');
      
      // Wait for response
      await expect(page.locator('[data-testid="agent-message"]').last()).toBeVisible({ timeout: testQuery.expectedTime });
      
      const responseTime = Date.now() - startTime;
      
      // Verify response time is within acceptable limits
      expect(responseTime).toBeLessThan(testQuery.expectedTime);
      
      console.log(`${testQuery.type} response time: ${responseTime}ms`);
      
      // Wait a bit before next query
      await page.waitForTimeout(1000);
    }
    
    // Test concurrent message handling
    const concurrentQueries = [
      'What is FDA?',
      'Tell me about Class II devices',
      'How do I submit a 510(k)?'
    ];
    
    // Send multiple messages quickly
    for (const query of concurrentQueries) {
      await page.fill('[data-testid="chat-input"]', query);
      await page.press('[data-testid="chat-input"]', 'Enter');
      await page.waitForTimeout(100); // Small delay between sends
    }
    
    // Verify all responses eventually appear
    await expect(page.locator('[data-testid="agent-message"]')).toHaveCount(testQueries.length + concurrentQueries.length, { timeout: 15000 });
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/43-performance-testing.png',
      fullPage: true 
    });
  });
});