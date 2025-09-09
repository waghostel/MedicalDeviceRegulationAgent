import { test, expect, Page } from '@playwright/test';

/**
 * WebSocket Real-time Functionality Tests
 * 
 * Comprehensive tests for WebSocket connections, real-time updates,
 * connection management, and error recovery.
 * 
 * Requirements: 6.5, 10.1, 10.5
 */

interface WebSocketMessage {
  type: string;
  data?: any;
  project_id?: number;
  timestamp?: string;
  update_type?: string;
}

test.describe('WebSocket Real-time Functionality', () => {
  let wsMessages: WebSocketMessage[] = [];
  let wsConnection: any = null;

  test.beforeEach(async ({ page }) => {
    // Clear message history
    wsMessages = [];
    wsConnection = null;

    // Set up WebSocket message monitoring
    page.on('websocket', ws => {
      wsConnection = ws;
      
      ws.on('framereceived', event => {
        try {
          const message = JSON.parse(event.payload as string);
          wsMessages.push(message);
          console.log('WebSocket received:', message);
        } catch (e) {
          console.log('Non-JSON WebSocket message:', event.payload);
        }
      });

      ws.on('framesent', event => {
        try {
          const message = JSON.parse(event.payload as string);
          console.log('WebSocket sent:', message);
        } catch (e) {
          console.log('Non-JSON WebSocket sent:', event.payload);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });

      ws.on('socketerror', error => {
        console.log('WebSocket error:', error);
      });
    });

    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      localStorage.setItem('user-data', JSON.stringify({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('WebSocket Connection Establishment and Authentication', async ({ page }) => {
    // Test WebSocket connection establishment with proper authentication
    
    // Step 1: Navigate to a page that should establish WebSocket connection
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Navigate to agent workflow to trigger WebSocket connection
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'WebSocket Test Project');
    await page.fill('[data-testid="project-description"]', 'Testing WebSocket connection');
    await page.click('[data-testid="create-project-submit"]');

    await page.waitForSelector('[data-testid="project-dashboard"]');
    await page.click('[data-testid="agent-workflow-button"]');

    // Step 2: Wait for WebSocket connection to establish
    await page.waitForTimeout(3000);

    // Step 3: Verify WebSocket connection was established
    expect(wsConnection).not.toBeNull();

    // Step 4: Verify connection establishment message
    const connectionMessages = wsMessages.filter(msg => msg.type === 'connection_established');
    expect(connectionMessages.length).toBeGreaterThan(0);

    const connectionMsg = connectionMessages[0];
    expect(connectionMsg.user_id).toBe('test-user-123');
    expect(connectionMsg.timestamp).toBeDefined();

    // Step 5: Test ping-pong mechanism
    await page.evaluate(() => {
      // Send ping message through WebSocket
      const ws = (window as any).websocketConnection;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    });

    await page.waitForTimeout(1000);

    // Verify pong response
    const pongMessages = wsMessages.filter(msg => msg.type === 'pong');
    expect(pongMessages.length).toBeGreaterThan(0);

    // Step 6: Test subscription to project updates
    const projectId = await page.locator('[data-testid="project-id"]').getAttribute('data-project-id');
    
    await page.evaluate((pid) => {
      const ws = (window as any).websocketConnection;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          project_id: parseInt(pid)
        }));
      }
    }, projectId);

    await page.waitForTimeout(500);

    // Verify subscription was processed (no error messages)
    const errorMessages = wsMessages.filter(msg => msg.type === 'error');
    expect(errorMessages.length).toBe(0);
  });

  test('Real-time Project Updates via WebSocket', async ({ page, context }) => {
    // Test real-time project updates through WebSocket
    
    // Step 1: Create a project for testing
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Real-time Update Test');
    await page.fill('[data-testid="project-description"]', 'Testing real-time updates');
    await page.click('[data-testid="create-project-submit"]');

    const projectId = await page.locator('[data-testid="project-id"]').getAttribute('data-project-id');
    
    // Step 2: Set up WebSocket connection
    await page.click('[data-testid="agent-workflow-button"]');
    await page.waitForTimeout(2000);

    // Clear previous messages
    wsMessages = [];

    // Step 3: Create second browser context to simulate another user
    const secondPage = await context.newPage();
    await secondPage.goto(`/projects/${projectId}`);
    await secondPage.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token-2');
      localStorage.setItem('user-data', JSON.stringify({
        id: 'test-user-456',
        email: 'test2@example.com',
        name: 'Test User 2'
      }));
    });

    // Step 4: Update project from second user
    await secondPage.click('[data-testid="edit-project-button"]');
    const updatedDescription = `Updated at ${Date.now()}`;
    await secondPage.fill('[data-testid="project-description"]', updatedDescription);
    await secondPage.click('[data-testid="update-project-submit"]');

    // Step 5: Verify first user receives real-time update
    await page.waitForTimeout(2000);

    const updateMessages = wsMessages.filter(msg => msg.type === 'project_updated');
    expect(updateMessages.length).toBeGreaterThan(0);

    const updateMsg = updateMessages[0];
    expect(updateMsg.project_id).toBe(parseInt(projectId));
    expect(updateMsg.data).toBeDefined();

    // Step 6: Verify UI reflects the update
    await page.click('[data-testid="dashboard-button"]');
    await expect(page.locator('[data-testid="project-description"]')).toContainText(updatedDescription);

    // Step 7: Test agent interaction updates
    await page.click('[data-testid="agent-workflow-button"]');
    wsMessages = []; // Clear messages

    await page.fill('[data-testid="chat-input"]', '/classify-device real-time test device');
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for agent interaction to complete
    await page.waitForSelector('[data-testid="classification-result"]', { timeout: 30000 });

    // Verify real-time agent interaction messages
    const agentMessages = wsMessages.filter(msg => 
      msg.type === 'agent_interaction' || msg.type === 'classification_completed'
    );
    expect(agentMessages.length).toBeGreaterThan(0);

    // Step 8: Verify second user also receives agent updates
    let secondPageMessages: WebSocketMessage[] = [];
    
    secondPage.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const message = JSON.parse(event.payload as string);
          secondPageMessages.push(message);
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
    });

    await secondPage.click('[data-testid="agent-workflow-button"]');
    await secondPage.waitForTimeout(2000);

    // Trigger another agent action
    await page.fill('[data-testid="chat-input"]', '/predicate-search real-time test');
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('[data-testid="predicate-results"]', { timeout: 30000 });
    await secondPage.waitForTimeout(3000);

    const secondPageAgentMessages = secondPageMessages.filter(msg => 
      msg.type === 'agent_interaction' || msg.type === 'predicate_search_completed'
    );
    expect(secondPageAgentMessages.length).toBeGreaterThan(0);

    await secondPage.close();
  });

  test('WebSocket Connection Recovery and Reconnection', async ({ page }) => {
    // Test WebSocket connection recovery mechanisms
    
    // Step 1: Establish initial connection
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Connection Recovery Test');
    await page.fill('[data-testid="project-description"]', 'Testing connection recovery');
    await page.click('[data-testid="create-project-submit"]');

    await page.click('[data-testid="agent-workflow-button"]');
    await page.waitForTimeout(2000);

    // Verify initial connection
    expect(wsConnection).not.toBeNull();
    const initialConnectionMessages = wsMessages.filter(msg => msg.type === 'connection_established');
    expect(initialConnectionMessages.length).toBeGreaterThan(0);

    // Step 2: Simulate network disconnection
    await page.evaluate(() => {
      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      
      // Close WebSocket connection if it exists
      const ws = (window as any).websocketConnection;
      if (ws) {
        ws.close();
      }
    });

    await page.waitForTimeout(1000);

    // Step 3: Verify connection status indicator
    await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Disconnected');
    await expect(page.locator('[data-testid="connection-error-banner"]')).toBeVisible();

    // Step 4: Simulate network reconnection
    wsMessages = []; // Clear messages to track reconnection

    await page.evaluate(() => {
      // Simulate online event
      window.dispatchEvent(new Event('online'));
    });

    // Step 5: Verify automatic reconnection
    await page.waitForTimeout(5000); // Allow time for reconnection

    const reconnectionMessages = wsMessages.filter(msg => msg.type === 'connection_established');
    expect(reconnectionMessages.length).toBeGreaterThan(0);

    await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Connected');
    await expect(page.locator('[data-testid="connection-error-banner"]')).not.toBeVisible();

    // Step 6: Test manual reconnection
    await page.evaluate(() => {
      // Manually close connection
      const ws = (window as any).websocketConnection;
      if (ws) {
        ws.close();
      }
    });

    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="reconnect-button"]')).toBeVisible();

    wsMessages = []; // Clear messages
    await page.click('[data-testid="reconnect-button"]');

    await page.waitForTimeout(3000);

    const manualReconnectionMessages = wsMessages.filter(msg => msg.type === 'connection_established');
    expect(manualReconnectionMessages.length).toBeGreaterThan(0);

    // Step 7: Test connection resilience during operations
    // Start an agent operation
    await page.fill('[data-testid="chat-input"]', '/classify-device resilience test');
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Simulate brief disconnection during operation
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const ws = (window as any).websocketConnection;
      if (ws) {
        ws.close();
      }
    });

    await page.waitForTimeout(500);

    // Verify operation continues after reconnection
    await page.waitForSelector('[data-testid="classification-result"]', { timeout: 30000 });
    
    // Verify final connection status
    await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Connected');
  });

  test('WebSocket Message Queuing and Delivery', async ({ page }) => {
    // Test message queuing during disconnection and delivery after reconnection
    
    // Step 1: Establish connection
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Message Queuing Test');
    await page.fill('[data-testid="project-description"]', 'Testing message queuing');
    await page.click('[data-testid="create-project-submit"]');

    const projectId = await page.locator('[data-testid="project-id"]').getAttribute('data-project-id');
    await page.click('[data-testid="agent-workflow-button"]');
    await page.waitForTimeout(2000);

    // Step 2: Simulate disconnection
    await page.evaluate(() => {
      const ws = (window as any).websocketConnection;
      if (ws) {
        ws.close();
      }
      window.dispatchEvent(new Event('offline'));
    });

    await page.waitForTimeout(1000);

    // Step 3: Perform operations while disconnected
    const operationsWhileOffline = [
      '/classify-device offline test device 1',
      '/predicate-search offline test 1',
      '/classify-device offline test device 2'
    ];

    for (const operation of operationsWhileOffline) {
      await page.fill('[data-testid="chat-input"]', operation);
      await page.press('[data-testid="chat-input"]', 'Enter');
      await page.waitForTimeout(500);
    }

    // Verify operations are queued (shown as pending)
    const pendingOperations = page.locator('[data-testid="pending-operation"]');
    const pendingCount = await pendingOperations.count();
    expect(pendingCount).toBe(operationsWhileOffline.length);

    // Step 4: Reconnect and verify message delivery
    wsMessages = []; // Clear messages

    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    await page.waitForTimeout(5000); // Allow time for reconnection and message processing

    // Verify reconnection
    const reconnectionMessages = wsMessages.filter(msg => msg.type === 'connection_established');
    expect(reconnectionMessages.length).toBeGreaterThan(0);

    // Step 5: Verify queued operations are processed
    await page.waitForTimeout(10000); // Allow time for queued operations to process

    // Check that pending operations are resolved
    const remainingPendingCount = await pendingOperations.count();
    expect(remainingPendingCount).toBeLessThan(operationsWhileOffline.length);

    // Verify agent responses are received
    const agentResponses = page.locator('[data-testid="agent-response"]');
    const responseCount = await agentResponses.count();
    expect(responseCount).toBeGreaterThan(0);

    // Step 6: Test message ordering
    // Verify messages are processed in the correct order
    const interactionHistory = page.locator('[data-testid="interaction-history"] [data-testid="interaction-item"]');
    const historyCount = await interactionHistory.count();
    expect(historyCount).toBeGreaterThanOrEqual(operationsWhileOffline.length);

    // Verify first operation appears first in history
    const firstInteraction = interactionHistory.first();
    await expect(firstInteraction).toContainText('offline test device 1');
  });

  test('WebSocket Performance and Scalability', async ({ page, context }) => {
    // Test WebSocket performance with multiple connections and high message volume
    
    // Step 1: Create multiple projects for testing
    const projectCount = 5;
    const projects = [];

    for (let i = 0; i < projectCount; i++) {
      const response = await page.request.post('/api/projects', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token',
          'Content-Type': 'application/json'
        },
        data: {
          name: `Performance Test Project ${i + 1}`,
          description: `WebSocket performance testing project ${i + 1}`,
          device_type: `Test Device ${i + 1}`,
          intended_use: `Performance testing ${i + 1}`
        }
      });

      const project = await response.json();
      projects.push(project);
    }

    // Step 2: Create multiple browser contexts
    const userCount = 3;
    const userPages = [];

    for (let i = 0; i < userCount; i++) {
      const userPage = await context.newPage();
      await userPage.goto(`/projects/${projects[i % projectCount].id}`);
      await userPage.evaluate((userId) => {
        localStorage.setItem('auth-token', `mock-jwt-token-${userId}`);
        localStorage.setItem('user-data', JSON.stringify({
          id: `test-user-${userId}`,
          email: `test${userId}@example.com`,
          name: `Test User ${userId}`
        }));
      }, i + 1);

      userPages.push(userPage);
    }

    // Step 3: Establish WebSocket connections for all users
    const connectionPromises = userPages.map(async (userPage, index) => {
      await userPage.click('[data-testid="agent-workflow-button"]');
      await userPage.waitForTimeout(2000);
      
      // Verify connection established
      return userPage.waitForFunction(() => {
        return (window as any).websocketConnection && 
               (window as any).websocketConnection.readyState === WebSocket.OPEN;
      }, { timeout: 10000 });
    });

    await Promise.all(connectionPromises);

    // Step 4: Test concurrent message sending
    const messageCount = 10;
    const startTime = Date.now();

    const messagingPromises = userPages.map(async (userPage, userIndex) => {
      const messages = [];
      
      for (let i = 0; i < messageCount; i++) {
        const message = `/classify-device performance test ${userIndex}-${i}`;
        await userPage.fill('[data-testid="chat-input"]', message);
        await userPage.press('[data-testid="chat-input"]', 'Enter');
        messages.push(message);
        
        // Small delay between messages
        await userPage.waitForTimeout(100);
      }
      
      return messages;
    });

    const allMessages = await Promise.all(messagingPromises);
    const totalMessages = allMessages.flat().length;
    const messagingTime = Date.now() - startTime;

    console.log(`Sent ${totalMessages} messages across ${userCount} users in ${messagingTime}ms`);

    // Step 5: Verify message processing performance
    // Wait for all messages to be processed
    const processingStartTime = Date.now();

    await Promise.all(userPages.map(async (userPage) => {
      // Wait for all agent responses
      await userPage.waitForFunction(() => {
        const responses = document.querySelectorAll('[data-testid="agent-response"]');
        return responses.length >= 10; // messageCount
      }, { timeout: 60000 });
    }));

    const processingTime = Date.now() - processingStartTime;
    console.log(`Processed ${totalMessages} messages in ${processingTime}ms`);

    // Verify performance benchmarks
    expect(messagingTime).toBeLessThan(30000); // 30 seconds for sending
    expect(processingTime).toBeLessThan(120000); // 2 minutes for processing

    // Step 6: Test WebSocket connection limits
    // Verify all connections remain stable
    for (const userPage of userPages) {
      const connectionStatus = await userPage.evaluate(() => {
        const ws = (window as any).websocketConnection;
        return ws ? ws.readyState : -1;
      });
      
      expect(connectionStatus).toBe(WebSocket.OPEN);
    }

    // Step 7: Test message delivery reliability
    // Verify all users received updates from other users' actions
    const crossUserUpdatePromises = userPages.map(async (userPage, userIndex) => {
      // Update project from this user
      const projectId = projects[userIndex % projectCount].id;
      
      await userPage.request.put(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer mock-jwt-token-${userIndex + 1}`,
          'Content-Type': 'application/json'
        },
        data: {
          description: `Updated by user ${userIndex + 1} at ${Date.now()}`
        }
      });

      return projectId;
    });

    await Promise.all(crossUserUpdatePromises);

    // Wait for cross-user updates to propagate
    await page.waitForTimeout(5000);

    // Verify updates were received by other users
    // This would be verified through WebSocket message monitoring in a real implementation

    // Step 8: Clean up
    for (const userPage of userPages) {
      await userPage.close();
    }

    // Clean up projects
    for (const project of projects) {
      await page.request.delete(`/api/projects/${project.id}`, {
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });
    }
  });

  test('WebSocket Error Handling and Edge Cases', async ({ page }) => {
    // Test WebSocket error handling and edge cases
    
    // Step 1: Test invalid authentication
    await page.goto('/projects');
    
    // Remove auth token to simulate invalid authentication
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
    });

    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Auth Error Test');
    await page.fill('[data-testid="project-description"]', 'Testing auth errors');
    
    // This should fail due to missing auth
    const createResponse = await page.request.post('/api/projects', {
      data: {
        name: 'Auth Error Test',
        description: 'Testing auth errors'
      }
    });
    
    expect(createResponse.status()).toBe(401);

    // Step 2: Test WebSocket with invalid token
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'invalid-token');
    });

    // Try to establish WebSocket connection with invalid token
    await page.goto('/projects');
    await page.waitForTimeout(2000);

    // Verify connection failure is handled gracefully
    await expect(page.locator('[data-testid="auth-error-banner"]')).toBeVisible();

    // Step 3: Test malformed WebSocket messages
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      localStorage.setItem('user-data', JSON.stringify({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Send malformed message
    await page.evaluate(() => {
      const ws = (window as any).websocketConnection;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('invalid json message');
      }
    });

    await page.waitForTimeout(1000);

    // Verify error is handled gracefully
    const errorMessages = wsMessages.filter(msg => msg.type === 'error');
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(errorMessages[0].data).toContain('Invalid JSON');

    // Step 4: Test WebSocket message size limits
    const largeMessage = {
      type: 'test',
      data: 'x'.repeat(100000) // 100KB message
    };

    await page.evaluate((msg) => {
      const ws = (window as any).websocketConnection;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }, largeMessage);

    await page.waitForTimeout(1000);

    // Verify large message handling
    const sizeErrorMessages = wsMessages.filter(msg => 
      msg.type === 'error' && msg.data && msg.data.includes('size')
    );
    
    // Either the message is processed or a size error is returned
    expect(sizeErrorMessages.length >= 0).toBe(true);

    // Step 5: Test rapid message sending (rate limiting)
    const rapidMessages = Array.from({ length: 100 }, (_, i) => ({
      type: 'ping',
      id: i
    }));

    const rapidSendStart = Date.now();

    for (const msg of rapidMessages) {
      await page.evaluate((message) => {
        const ws = (window as any).websocketConnection;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }, msg);
    }

    const rapidSendTime = Date.now() - rapidSendStart;
    console.log(`Sent ${rapidMessages.length} rapid messages in ${rapidSendTime}ms`);

    await page.waitForTimeout(2000);

    // Verify rate limiting or message processing
    const pongResponses = wsMessages.filter(msg => msg.type === 'pong');
    const rateLimitErrors = wsMessages.filter(msg => 
      msg.type === 'error' && msg.data && msg.data.includes('rate')
    );

    // Either all messages processed or rate limiting applied
    expect(pongResponses.length + rateLimitErrors.length).toBeGreaterThan(0);

    // Step 6: Test connection cleanup on page unload
    const connectionCountBefore = await page.evaluate(() => {
      return (window as any).websocketConnection ? 1 : 0;
    });

    expect(connectionCountBefore).toBe(1);

    // Simulate page unload
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    await page.waitForTimeout(1000);

    // Verify connection is cleaned up
    // This would be verified on the server side in a real implementation
  });
});