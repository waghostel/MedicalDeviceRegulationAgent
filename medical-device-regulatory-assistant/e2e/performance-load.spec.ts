import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Performance and Load Testing for Project Workflows
 *
 * Tests system performance under various load conditions,
 * including large datasets, concurrent operations, and stress testing.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.5
 */

interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  operationsPerSecond?: number;
  memoryUsage?: number;
  networkRequests?: number;
}

test.describe('Performance and Load Testing', () => {
  let performanceMetrics: PerformanceMetrics[] = [];

  test.beforeEach(async ({ page }) => {
    // Clear performance metrics
    performanceMetrics = [];

    // Set up performance monitoring
    await page.addInitScript(() => {
      (window as any).performanceData = {
        navigationStart: performance.now(),
        requests: [],
        memoryUsage: [],
      };

      // Monitor network requests
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = performance.now();
        const response = await originalFetch(...args);
        const end = performance.now();

        (window as any).performanceData.requests.push({
          url: args[0],
          duration: end - start,
          status: response.status,
        });

        return response;
      };

      // Monitor memory usage
      if ('memory' in performance) {
        setInterval(() => {
          (window as any).performanceData.memoryUsage.push({
            timestamp: performance.now(),
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
          });
        }, 1000);
      }
    });

    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      localStorage.setItem(
        'user-data',
        JSON.stringify({
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });
  });

  test.afterEach(async ({ page }) => {
    // Collect final performance data
    const finalMetrics = await page.evaluate(() => (window as any).performanceData);

    console.log('Performance Summary:', {
      totalRequests: finalMetrics.requests?.length || 0,
      averageRequestTime:
        finalMetrics.requests?.length > 0
          ? finalMetrics.requests.reduce(
              (sum: number, req: any) => sum + req.duration,
              0
            ) / finalMetrics.requests.length
          : 0,
      memoryPeakUsage:
        finalMetrics.memoryUsage?.length > 0
          ? Math.max(...finalMetrics.memoryUsage.map((m: any) => m.used))
          : 0,
    });

    // Clean up
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Large Dataset Performance - Project List Loading', async ({ page }) => {
    // Test performance with large number of projects

    const projectCount = 100;
    const batchSize = 10;

    console.log(`Creating ${projectCount} projects for performance testing...`);

    // Step 1: Create large dataset
    const creationStart = Date.now();
    const projects = [];

    for (let batch = 0; batch < projectCount / batchSize; batch++) {
      const batchPromises = [];

      for (let i = 0; i < batchSize; i++) {
        const projectIndex = batch * batchSize + i;
        const projectData = {
          name: `Performance Test Project ${projectIndex + 1}`,
          description: `Large dataset performance testing project with detailed description ${projectIndex + 1}. This description contains multiple sentences to simulate real-world data. It includes various keywords like cardiac, monitoring, device, regulatory, FDA, 510k, predicate, classification, and testing.`,
          device_type: `Device Type ${(projectIndex % 10) + 1}`,
          intended_use: `Intended use for performance testing project ${projectIndex + 1}. This is a comprehensive intended use statement that describes the purpose and application of the medical device in detail.`,
          priority: ['high', 'medium', 'low'][projectIndex % 3],
          tags: [
            `tag${projectIndex % 5}`,
            `category${projectIndex % 3}`,
            'performance-test',
          ],
        };

        const promise = page.request
          .post('/api/projects', {
            headers: {
              Authorization: 'Bearer mock-jwt-token',
              'Content-Type': 'application/json',
            },
            data: projectData,
          })
          .then((response) => response.json());

        batchPromises.push(promise);
      }

      const batchResults = await Promise.all(batchPromises);
      projects.push(...batchResults);

      console.log(
        `Created batch ${batch + 1}/${Math.ceil(projectCount / batchSize)}`
      );
    }

    const creationTime = Date.now() - creationStart;
    console.log(`Created ${projectCount} projects in ${creationTime}ms`);

    // Step 2: Test initial page load performance
    const loadStart = Date.now();

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - loadStart;
    console.log(`Initial page load: ${loadTime}ms`);

    // Verify performance benchmarks
    expect(loadTime).toBeLessThan(10000); // 10 seconds max for initial load
    expect(creationTime).toBeLessThan(60000); // 1 minute max for creation

    // Step 3: Test project list rendering performance
    const renderStart = Date.now();

    await page.waitForSelector('[data-testid="project-card"]');
    const displayedProjects = await page
      .locator('[data-testid="project-card"]')
      .count();

    const renderTime = Date.now() - renderStart;
    console.log(`Rendered ${displayedProjects} projects in ${renderTime}ms`);

    expect(displayedProjects).toBeGreaterThan(0);
    expect(renderTime).toBeLessThan(5000); // 5 seconds max for rendering

    // Step 4: Test search performance with large dataset
    const searchTerms = ['Performance', 'Device Type 1', 'cardiac', 'tag0'];

    for (const searchTerm of searchTerms) {
      const searchStart = Date.now();

      await page.fill('[data-testid="search-input"]', searchTerm);

      // Wait for search results to update
      await page.waitForFunction((term) => {
        const searchInput = document.querySelector(
          '[data-testid="search-input"]'
        ) as HTMLInputElement;
        const cards = document.querySelectorAll('[data-testid="project-card"]');
        return searchInput?.value === term && cards.length > 0;
      }, searchTerm);

      const searchTime = Date.now() - searchStart;
      const resultCount = await page
        .locator('[data-testid="project-card"]')
        .count();

      console.log(
        `Search "${searchTerm}": ${resultCount} results in ${searchTime}ms`
      );

      expect(searchTime).toBeLessThan(3000); // 3 seconds max for search
      expect(resultCount).toBeGreaterThan(0);

      // Clear search
      await page.fill('[data-testid="search-input"]', '');
      await page.waitForTimeout(500);
    }

    // Step 5: Test pagination performance
    const paginationStart = Date.now();

    // Navigate through multiple pages
    for (let page_num = 1; page_num <= 3; page_num++) {
      if (await page.locator('[data-testid="next-page-button"]').isVisible()) {
        await page.click('[data-testid="next-page-button"]');
        await page.waitForLoadState('networkidle');

        const pageProjects = await page
          .locator('[data-testid="project-card"]')
          .count();
        expect(pageProjects).toBeGreaterThan(0);
      }
    }

    const paginationTime = Date.now() - paginationStart;
    console.log(`Pagination through 3 pages: ${paginationTime}ms`);

    expect(paginationTime).toBeLessThan(10000); // 10 seconds max for pagination

    // Step 6: Test filtering performance
    const filterStart = Date.now();

    // Test status filter
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="status-option-draft"]');

    await page.waitForLoadState('networkidle');
    const filteredCount = await page
      .locator('[data-testid="project-card"]')
      .count();

    const filterTime = Date.now() - filterStart;
    console.log(
      `Status filtering: ${filteredCount} results in ${filterTime}ms`
    );

    expect(filterTime).toBeLessThan(3000); // 3 seconds max for filtering
    expect(filteredCount).toBeGreaterThan(0);

    // Step 7: Clean up test data
    console.log('Cleaning up test data...');
    const cleanupStart = Date.now();

    const cleanupPromises = projects.map((project) =>
      page.request.delete(`/api/projects/${project.id}`, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      })
    );

    await Promise.all(cleanupPromises);

    const cleanupTime = Date.now() - cleanupStart;
    console.log(`Cleanup completed in ${cleanupTime}ms`);
  });

  test('Concurrent Operations Performance', async ({ page, context }) => {
    // Test performance under concurrent operations

    const concurrentUsers = 5;
    const operationsPerUser = 10;

    // Step 1: Create test projects
    const baseProjects = [];
    for (let i = 0; i < concurrentUsers; i++) {
      const response = await page.request.post('/api/projects', {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'Content-Type': 'application/json',
        },
        data: {
          name: `Concurrent Test Project ${i + 1}`,
          description: `Project for concurrent operations testing ${i + 1}`,
          device_type: `Concurrent Device ${i + 1}`,
          intended_use: `Concurrent testing ${i + 1}`,
        },
      });

      const project = await response.json();
      baseProjects.push(project);
    }

    // Step 2: Create multiple browser contexts for concurrent users
    const userContexts = [];
    for (let i = 0; i < concurrentUsers; i++) {
      const userPage = await context.newPage();
      await userPage.goto(`/projects/${baseProjects[i].id}`);
      await userPage.evaluate((userId) => {
        localStorage.setItem('auth-token', `mock-jwt-token-${userId}`);
        localStorage.setItem(
          'user-data',
          JSON.stringify({
            id: `concurrent-user-${userId}`,
            email: `concurrent${userId}@example.com`,
            name: `Concurrent User ${userId}`,
          })
        );
      }, i + 1);

      userContexts.push(userPage);
    }

    // Step 3: Test concurrent project creation
    console.log(
      `Testing concurrent project creation with ${concurrentUsers} users...`
    );

    const creationStart = Date.now();

    const creationPromises = userContexts.map(async (userPage, userIndex) => {
      const userProjects = [];

      for (let i = 0; i < operationsPerUser; i++) {
        const projectData = {
          name: `Concurrent Created Project U${userIndex + 1}-${i + 1}`,
          description: `Created concurrently by user ${userIndex + 1}, operation ${i + 1}`,
          device_type: `Concurrent Device U${userIndex + 1}`,
          intended_use: `Concurrent creation testing U${userIndex + 1}-${i + 1}`,
        };

        const response = await userPage.request.post('/api/projects', {
          headers: {
            Authorization: `Bearer mock-jwt-token-${userIndex + 1}`,
            'Content-Type': 'application/json',
          },
          data: projectData,
        });

        expect(response.status()).toBe(201);
        const project = await response.json();
        userProjects.push(project);
      }

      return userProjects;
    });

    const creationResults = await Promise.all(creationPromises);
    const creationTime = Date.now() - creationStart;
    const totalCreated = creationResults.flat().length;

    console.log(
      `Created ${totalCreated} projects concurrently in ${creationTime}ms`
    );
    console.log(
      `Average: ${(creationTime / totalCreated).toFixed(2)}ms per project`
    );

    expect(creationTime).toBeLessThan(60000); // 1 minute max
    expect(totalCreated).toBe(concurrentUsers * operationsPerUser);

    // Step 4: Test concurrent project updates
    console.log('Testing concurrent project updates...');

    const updateStart = Date.now();

    const updatePromises = creationResults.map(
      async (userProjects, userIndex) => {
        const updateResults = [];

        for (const project of userProjects) {
          const updateData = {
            description: `Updated concurrently by user ${userIndex + 1} at ${Date.now()}`,
          };

          const response = await userContexts[userIndex].request.put(
            `/api/projects/${project.id}`,
            {
              headers: {
                Authorization: `Bearer mock-jwt-token-${userIndex + 1}`,
                'Content-Type': 'application/json',
              },
              data: updateData,
            }
          );

          updateResults.push({
            projectId: project.id,
            status: response.status(),
            success: response.status() === 200,
          });
        }

        return updateResults;
      }
    );

    const updateResults = await Promise.all(updatePromises);
    const updateTime = Date.now() - updateStart;
    const totalUpdates = updateResults.flat().length;
    const successfulUpdates = updateResults
      .flat()
      .filter((r) => r.success).length;

    console.log(
      `Updated ${successfulUpdates}/${totalUpdates} projects in ${updateTime}ms`
    );
    console.log(
      `Success rate: ${((successfulUpdates / totalUpdates) * 100).toFixed(1)}%`
    );

    expect(updateTime).toBeLessThan(45000); // 45 seconds max
    expect(successfulUpdates / totalUpdates).toBeGreaterThan(0.8); // 80% success rate minimum

    // Step 5: Test concurrent agent operations
    console.log('Testing concurrent agent operations...');

    const agentStart = Date.now();

    const agentPromises = userContexts.map(async (userPage, userIndex) => {
      await userPage.click('[data-testid="agent-workflow-button"]');
      await userPage.waitForSelector('[data-testid="chat-interface"]');

      const operations = [
        `/classify-device concurrent test device ${userIndex + 1}`,
        `/predicate-search concurrent test ${userIndex + 1}`,
        `/find-guidance concurrent device ${userIndex + 1}`,
      ];

      const results = [];

      for (const operation of operations) {
        await userPage.fill('[data-testid="chat-input"]', operation);
        await userPage.press('[data-testid="chat-input"]', 'Enter');

        try {
          await userPage.waitForSelector('[data-testid="agent-response"]', {
            timeout: 30000,
          });
          results.push({ operation, success: true });
        } catch (error) {
          results.push({ operation, success: false, error: error.message });
        }
      }

      return results;
    });

    const agentResults = await Promise.all(agentPromises);
    const agentTime = Date.now() - agentStart;
    const totalAgentOps = agentResults.flat().length;
    const successfulAgentOps = agentResults
      .flat()
      .filter((r) => r.success).length;

    console.log(
      `Completed ${successfulAgentOps}/${totalAgentOps} agent operations in ${agentTime}ms`
    );
    console.log(
      `Agent success rate: ${((successfulAgentOps / totalAgentOps) * 100).toFixed(1)}%`
    );

    expect(agentTime).toBeLessThan(120000); // 2 minutes max
    expect(successfulAgentOps / totalAgentOps).toBeGreaterThan(0.7); // 70% success rate minimum

    // Step 6: Test concurrent data export
    console.log('Testing concurrent data export...');

    const exportStart = Date.now();

    const exportPromises = baseProjects.map(async (project, index) => {
      const response = await userContexts[index].request.get(
        `/api/projects/${project.id}/export`,
        {
          headers: {
            Authorization: `Bearer mock-jwt-token-${index + 1}`,
          },
          params: {
            format: 'json',
          },
        }
      );

      return {
        projectId: project.id,
        status: response.status(),
        success: response.status() === 200,
        size: response.headers()['content-length'] || 0,
      };
    });

    const exportResults = await Promise.all(exportPromises);
    const exportTime = Date.now() - exportStart;
    const successfulExports = exportResults.filter((r) => r.success).length;

    console.log(
      `Exported ${successfulExports}/${exportResults.length} projects in ${exportTime}ms`
    );

    expect(exportTime).toBeLessThan(30000); // 30 seconds max
    expect(successfulExports / exportResults.length).toBeGreaterThan(0.9); // 90% success rate

    // Step 7: Clean up
    console.log('Cleaning up concurrent test data...');

    const allProjects = [...baseProjects, ...creationResults.flat()];
    const cleanupPromises = allProjects.map((project) =>
      page.request.delete(`/api/projects/${project.id}`, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      })
    );

    await Promise.all(cleanupPromises);

    for (const userPage of userContexts) {
      await userPage.close();
    }
  });

  test('Memory Usage and Resource Management', async ({ page }) => {
    // Test memory usage and resource management during intensive operations

    // Step 1: Establish baseline memory usage
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const baselineMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    console.log('Baseline memory usage:', baselineMemory);

    // Step 2: Create projects and monitor memory growth
    const projectCount = 50;
    const memorySnapshots = [];

    for (let i = 0; i < projectCount; i++) {
      const response = await page.request.post('/api/projects', {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'Content-Type': 'application/json',
        },
        data: {
          name: `Memory Test Project ${i + 1}`,
          description: `Memory usage testing project ${i + 1} with extensive description containing multiple paragraphs and detailed information about the medical device, its intended use, regulatory pathway, and technical specifications.`,
          device_type: `Memory Test Device ${i + 1}`,
          intended_use: `Comprehensive intended use statement for memory testing project ${i + 1}`,
        },
      });

      expect(response.status()).toBe(201);

      // Take memory snapshot every 10 projects
      if (i % 10 === 9) {
        await page.reload();
        await page.waitForLoadState('networkidle');

        const memoryUsage = await page.evaluate(() => {
          if ('memory' in performance) {
            return {
              used: (performance as any).memory.usedJSHeapSize,
              total: (performance as any).memory.totalJSHeapSize,
              projectCount: document.querySelectorAll(
                '[data-testid="project-card"]'
              ).length,
            };
          }
          return null;
        });

        memorySnapshots.push({
          projectsCreated: i + 1,
          memory: memoryUsage,
        });

        console.log(`Memory after ${i + 1} projects:`, memoryUsage);
      }
    }

    // Step 3: Analyze memory growth
    if (memorySnapshots.length > 1 && baselineMemory) {
      const memoryGrowth =
        memorySnapshots[memorySnapshots.length - 1].memory.used -
        baselineMemory.used;
      const memoryGrowthPerProject = memoryGrowth / projectCount;

      console.log(
        `Total memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(
        `Memory growth per project: ${(memoryGrowthPerProject / 1024).toFixed(2)} KB`
      );

      // Verify memory growth is reasonable (less than 100KB per project)
      expect(memoryGrowthPerProject).toBeLessThan(100 * 1024);

      // Verify no memory leaks (growth should be roughly linear)
      const growthRates = [];
      for (let i = 1; i < memorySnapshots.length; i++) {
        const prevSnapshot = memorySnapshots[i - 1];
        const currentSnapshot = memorySnapshots[i];
        const projectDiff =
          currentSnapshot.projectsCreated - prevSnapshot.projectsCreated;
        const memoryDiff =
          currentSnapshot.memory.used - prevSnapshot.memory.used;
        growthRates.push(memoryDiff / projectDiff);
      }

      const avgGrowthRate =
        growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      const maxDeviation = Math.max(
        ...growthRates.map((rate) => Math.abs(rate - avgGrowthRate))
      );

      console.log(
        `Average memory growth rate: ${(avgGrowthRate / 1024).toFixed(2)} KB/project`
      );
      console.log(`Max deviation: ${(maxDeviation / 1024).toFixed(2)} KB`);

      // Verify consistent growth (no major memory leaks)
      expect(maxDeviation).toBeLessThan(avgGrowthRate * 2);
    }

    // Step 4: Test memory cleanup after operations
    console.log('Testing memory cleanup...');

    // Perform intensive operations
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'Memory Cleanup Test');
    await page.fill(
      '[data-testid="project-description"]',
      'Testing memory cleanup'
    );
    await page.click('[data-testid="create-project-submit"]');

    await page.click('[data-testid="agent-workflow-button"]');

    // Perform multiple agent operations
    const operations = [
      '/classify-device memory test device',
      '/predicate-search memory test',
      '/find-guidance memory device',
    ];

    for (const operation of operations) {
      await page.fill('[data-testid="chat-input"]', operation);
      await page.press('[data-testid="chat-input"]', 'Enter');
      await page.waitForSelector('[data-testid="agent-response"]', {
        timeout: 30000,
      });
    }

    const afterOperationsMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    // Navigate away and trigger garbage collection
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Force garbage collection if possible
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(2000);

    const afterCleanupMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (afterOperationsMemory && afterCleanupMemory) {
      const memoryReduction = afterOperationsMemory - afterCleanupMemory;
      console.log(
        `Memory cleanup: ${(memoryReduction / 1024 / 1024).toFixed(2)} MB freed`
      );

      // Verify some memory was freed (indicating proper cleanup)
      expect(memoryReduction).toBeGreaterThan(0);
    }

    // Step 5: Test resource cleanup on page navigation
    const resourceCountBefore = await page.evaluate(() => ({
        eventListeners: (window as any).getEventListeners
          ? Object.keys((window as any).getEventListeners(document)).length
          : 0,
        timers: (window as any).activeTimers || 0,
        websockets: (window as any).websocketConnection ? 1 : 0,
      }));

    // Navigate to different pages
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const resourceCountAfter = await page.evaluate(() => ({
        eventListeners: (window as any).getEventListeners
          ? Object.keys((window as any).getEventListeners(document)).length
          : 0,
        timers: (window as any).activeTimers || 0,
        websockets: (window as any).websocketConnection ? 1 : 0,
      }));

    console.log('Resource cleanup:', {
      before: resourceCountBefore,
      after: resourceCountAfter,
    });

    // Verify resources are properly cleaned up
    // (In a real application, you'd want to ensure no resource leaks)

    // Step 6: Clean up test data
    const projects = await page.request.get('/api/projects', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
      },
    });

    const projectList = await projects.json();
    const testProjects = projectList.filter((p: any) =>
      p.name.includes('Memory Test')
    );

    const cleanupPromises = testProjects.map((project: any) =>
      page.request.delete(`/api/projects/${project.id}`, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      })
    );

    await Promise.all(cleanupPromises);
  });

  test('Network Performance and Optimization', async ({ page }) => {
    // Test network performance and optimization features

    // Step 1: Monitor network requests during page load
    const networkRequests: any[] = [];

    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        startTime: Date.now(),
      });
    });

    page.on('response', (response) => {
      const request = networkRequests.find((req) => req.url === response.url());
      if (request) {
        request.endTime = Date.now();
        request.duration = request.endTime - request.startTime;
        request.status = response.status();
        request.size = parseInt(response.headers()['content-length'] || '0');
      }
    });

    // Step 2: Test initial page load performance
    const loadStart = Date.now();

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - loadStart;

    // Analyze network requests
    const apiRequests = networkRequests.filter((req) =>
      req.url.includes('/api/')
    );
    const staticRequests = networkRequests.filter(
      (req) =>
        req.resourceType === 'stylesheet' ||
        req.resourceType === 'script' ||
        req.resourceType === 'image'
    );

    console.log('Network Performance Analysis:', {
      totalRequests: networkRequests.length,
      apiRequests: apiRequests.length,
      staticRequests: staticRequests.length,
      totalLoadTime: loadTime,
      averageApiResponseTime:
        apiRequests.length > 0
          ? apiRequests.reduce((sum, req) => sum + (req.duration || 0), 0) /
            apiRequests.length
          : 0,
    });

    // Verify performance benchmarks
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    expect(apiRequests.length).toBeLessThan(10); // Reasonable number of API calls

    if (apiRequests.length > 0) {
      const avgApiTime =
        apiRequests.reduce((sum, req) => sum + (req.duration || 0), 0) /
        apiRequests.length;
      expect(avgApiTime).toBeLessThan(2000); // 2 seconds average API response
    }

    // Step 3: Test caching effectiveness
    console.log('Testing caching effectiveness...');

    // Clear network request log
    networkRequests.length = 0;

    // Reload page to test caching
    await page.reload();
    await page.waitForLoadState('networkidle');

    const cachedRequests = networkRequests.filter(
      (req) =>
        req.status === 304 ||
        req.resourceType === 'stylesheet' ||
        req.resourceType === 'script'
    );

    console.log(
      `Cached requests: ${cachedRequests.length}/${networkRequests.length}`
    );

    // Verify caching is working (some requests should be cached)
    expect(cachedRequests.length).toBeGreaterThan(0);

    // Step 4: Test API response compression
    const largeDataRequest = await page.request.get('/api/projects', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    const contentEncoding = largeDataRequest.headers()['content-encoding'];
    const contentLength = largeDataRequest.headers()['content-length'];

    console.log('API Response Compression:', {
      encoding: contentEncoding,
      size: contentLength,
    });

    // Verify compression is enabled for API responses
    expect(contentEncoding).toBeDefined();

    // Step 5: Test pagination and lazy loading performance
    console.log('Testing pagination performance...');

    // Create enough projects to trigger pagination
    const paginationProjects = [];
    for (let i = 0; i < 25; i++) {
      const response = await page.request.post('/api/projects', {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'Content-Type': 'application/json',
        },
        data: {
          name: `Pagination Test ${i + 1}`,
          description: `Pagination performance test project ${i + 1}`,
          device_type: `Pagination Device ${i + 1}`,
          intended_use: `Pagination testing ${i + 1}`,
        },
      });

      const project = await response.json();
      paginationProjects.push(project);
    }

    // Clear network log and test pagination
    networkRequests.length = 0;

    await page.reload();
    await page.waitForLoadState('networkidle');

    const initialRequests = networkRequests.filter((req) =>
      req.url.includes('/api/projects')
    ).length;

    // Navigate to next page
    if (await page.locator('[data-testid="next-page-button"]').isVisible()) {
      networkRequests.length = 0;

      const paginationStart = Date.now();
      await page.click('[data-testid="next-page-button"]');
      await page.waitForLoadState('networkidle');
      const paginationTime = Date.now() - paginationStart;

      const paginationRequests = networkRequests.filter((req) =>
        req.url.includes('/api/projects')
      ).length;

      console.log('Pagination Performance:', {
        time: paginationTime,
        requests: paginationRequests,
      });

      expect(paginationTime).toBeLessThan(3000); // 3 seconds max
      expect(paginationRequests).toBeLessThanOrEqual(2); // Should be minimal requests
    }

    // Step 6: Test search debouncing
    console.log('Testing search debouncing...');

    networkRequests.length = 0;

    // Type search query character by character
    const searchQuery = 'Pagination';
    for (let i = 0; i < searchQuery.length; i++) {
      await page.fill(
        '[data-testid="search-input"]',
        searchQuery.substring(0, i + 1)
      );
      await page.waitForTimeout(100); // Fast typing
    }

    // Wait for debounced search
    await page.waitForTimeout(1000);

    const searchRequests = networkRequests.filter(
      (req) => req.url.includes('/api/projects') && req.url.includes('search')
    ).length;

    console.log(
      `Search requests: ${searchRequests} (should be minimal due to debouncing)`
    );

    // Verify debouncing is working (should be much fewer requests than characters typed)
    expect(searchRequests).toBeLessThan(searchQuery.length);
    expect(searchRequests).toBeGreaterThan(0);

    // Clean up
    const cleanupPromises = paginationProjects.map((project) =>
      page.request.delete(`/api/projects/${project.id}`, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      })
    );

    await Promise.all(cleanupPromises);
  });
});
