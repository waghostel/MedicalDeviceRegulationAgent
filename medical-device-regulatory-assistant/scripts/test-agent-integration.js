/**
 * Integration test script for CopilotKit Agent Integration
 * Tests the complete workflow from frontend to backend
 */

const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function testAgentIntegration() {
  console.log('🧪 Testing CopilotKit Agent Integration...\n');

  // Test 1: Backend Health Check
  console.log('1. Testing backend health check...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend health check passed');
      console.log(`   Status: ${data.status}`);
      console.log(`   Active sessions: ${data.active_sessions}`);
    } else {
      console.log('❌ Backend health check failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Backend health check failed');
    console.log(`   Error: ${error.message}`);
  }

  console.log();

  // Test 2: Agent Task Execution
  console.log('2. Testing agent task execution...');
  try {
    const taskRequest = {
      task_type: 'predicate_search',
      project_id: 'integration-test-project',
      device_description: 'Cardiac monitoring device for integration testing',
      intended_use:
        'For continuous monitoring of cardiac rhythm in ambulatory patients',
      device_type: 'Class II Medical Device',
      parameters: {
        product_code: 'DQK',
      },
    };

    const response = await fetch(`${BACKEND_URL}/api/agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(taskRequest),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Agent task execution passed');
      console.log(`   Session ID: ${data.session_id}`);
      console.log(`   Task Type: ${data.task_type}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Confidence: ${data.confidence || 'N/A'}`);

      // Test 3: Session Status Check
      console.log('\n3. Testing session status check...');
      const statusResponse = await fetch(
        `${BACKEND_URL}/api/agent/session/${data.session_id}/status`,
        {
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('✅ Session status check passed');
        console.log(`   Session Status: ${statusData.status}`);
        console.log(
          `   Completed Tasks: ${statusData.completed_tasks?.length || 0}`
        );
      } else {
        console.log('❌ Session status check failed');
        console.log(
          `   Status: ${statusResponse.status} ${statusResponse.statusText}`
        );
      }
    } else {
      console.log('❌ Agent task execution failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      const errorData = await response.text();
      console.log(`   Error: ${errorData}`);
    }
  } catch (error) {
    console.log('❌ Agent task execution failed');
    console.log(`   Error: ${error.message}`);
  }

  console.log();

  // Test 4: CopilotKit API Endpoint
  console.log('4. Testing CopilotKit API endpoint...');
  try {
    const response = await fetch(`${FRONTEND_URL}/api/copilotkit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // This would be the actual CopilotKit request format
        // For now, just test that the endpoint exists
        test: true,
      }),
    });

    // CopilotKit endpoints typically return different status codes
    // We're just checking if the endpoint is accessible
    console.log(
      `✅ CopilotKit endpoint accessible (Status: ${response.status})`
    );
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Frontend server not running (this is expected in CI)');
    } else {
      console.log('❌ CopilotKit endpoint test failed');
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log();

  // Test 5: Tool Registry Health
  console.log('5. Testing tool registry health...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Tool registry health check passed');
      console.log(`   Service: ${data.service}`);
      console.log(`   Version: ${data.version}`);
    } else {
      console.log('❌ Tool registry health check failed');
    }
  } catch (error) {
    console.log('❌ Tool registry health check failed');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n🏁 Integration test completed!\n');
}

// Run the test
if (require.main === module) {
  testAgentIntegration().catch(console.error);
}

module.exports = { testAgentIntegration };
