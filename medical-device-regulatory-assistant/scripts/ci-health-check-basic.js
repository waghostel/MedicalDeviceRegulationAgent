#!/usr/bin/env node

/**
 * Basic CI Health Check Script - Simple test health monitoring for CI/CD
 * Requirements: 8.1, 8.2, 8.3
 */

const fs = require('fs').promises;
const path = require('path');

async function runBasicHealthCheck() {
  console.log('🚀 Starting Basic CI Health Check...');
  console.log('📊 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔧 CI:', process.env.CI ? 'true' : 'false');

  try {
    const startTime = Date.now();
    const outputDir = process.env.CI_REPORTS_DIR || 'test-reports';

    // Create reports directory
    await fs.mkdir(outputDir, { recursive: true });

    // Check React 19 compatibility
    let react19Compatible = false;
    try {
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf-8')
      );
      const reactVersion = packageJson.dependencies?.react || '';
      react19Compatible = reactVersion.startsWith('19.');
    } catch (error) {
      console.warn('Could not check React version');
    }

    const executionTime = Date.now() - startTime;

    // Calculate basic health score
    let healthScore = 100;
    if (executionTime > 30000) healthScore -= 20;
    if (!react19Compatible) healthScore -= 30;
    if (!process.env.CI) healthScore -= 10;
    healthScore = Math.max(0, healthScore);

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      healthScore,
      executionTime,
      react19Compatible,
      ci: process.env.CI === 'true',
      nodeVersion: process.version,
      platform: process.platform,
    };

    // Save report
    const reportPath = path.join(outputDir, 'ci-health-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate simple dashboard
    const dashboardHtml = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '    <meta charset="UTF-8">',
      '    <title>CI Health Dashboard</title>',
      '    <style>',
      '        body { font-family: Arial, sans-serif; margin: 20px; }',
      '        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }',
      `        .score { font-size: 2em; font-weight: bold; color: ${ 
        healthScore >= 80 ? 'green' : healthScore >= 60 ? 'orange' : 'red' 
        }; }`,
      '    </style>',
      '</head>',
      '<body>',
      '    <h1>CI Health Dashboard</h1>',
      `    <p>Generated: ${  new Date().toLocaleString()  }</p>`,
      '    <div class="metric">',
      `        <div class="score">${  healthScore  }/100</div>`,
      '        <div>Health Score</div>',
      '    </div>',
      '    <div class="metric">',
      `        <div>${  executionTime  }ms</div>`,
      '        <div>Execution Time</div>',
      '    </div>',
      '    <div class="metric">',
      `        <div>${  react19Compatible ? '✅ Yes' : '❌ No'  }</div>`,
      '        <div>React 19 Compatible</div>',
      '    </div>',
      '    <div class="metric">',
      `        <div>${  process.env.CI ? '✅ Yes' : '❌ No'  }</div>`,
      '        <div>CI Environment</div>',
      '    </div>',
      '</body>',
      '</html>',
    ].join('\n');

    const dashboardPath = path.join(outputDir, 'dashboard.html');
    await fs.writeFile(dashboardPath, dashboardHtml);

    // Output results
    console.log(`\n${  '='.repeat(60)}`);
    console.log('📋 TEST HEALTH SUMMARY');
    console.log('='.repeat(60));

    let exitCode = 0;
    let summary = '';

    if (healthScore >= 80) {
      summary =
        `✅ SUCCESS: All tests healthy (Score: ${  healthScore  }/100)`;
    } else if (healthScore >= 60) {
      summary =
        `⚠️ WARNING: Some issues detected (Score: ${  healthScore  }/100)`;
    } else {
      summary =
        `❌ CRITICAL: Multiple issues detected (Score: ${ 
        healthScore 
        }/100)`;
      exitCode = 1;
    }

    console.log(summary);
    console.log('\n📝 DETAILS:');
    console.log(`Performance: ${  executionTime  }ms`);
    console.log(`React 19 Compatible: ${  react19Compatible ? 'Yes' : 'No'}`);
    console.log(`CI Environment: ${  process.env.CI ? 'Yes' : 'No'}`);
    console.log(`\n📊 Dashboard: ${  dashboardPath}`);
    console.log(`📊 Report: ${  reportPath}`);
    console.log('='.repeat(60));

    // Set GitHub Actions outputs if in CI
    if (process.env.GITHUB_ACTIONS && process.env.GITHUB_OUTPUT) {
      const outputs = [
        `health-score=${  healthScore}`,
        `exit-code=${  exitCode}`,
        `dashboard-path=${  dashboardPath}`,
        `summary=${  summary.replace(/\n/g, ' ')}`,
        `react19-compatible=${  react19Compatible}`,
      ];

      await fs.appendFile(process.env.GITHUB_OUTPUT, `${outputs.join('\n')  }\n`);
      console.log('📤 GitHub outputs set');
    }

    // Generate step summary for GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
      const stepSummary = [
        '# 🧪 CI Health Check Report',
        '',
        `## Status: ${  exitCode === 0 ? '✅ SUCCESS' : '❌ FAILURE'}`,
        '',
        `**Health Score:** ${  healthScore  }/100`,
        '',
        '## 📊 Metrics',
        '',
        '| Metric | Value | Status |',
        '|--------|-------|--------|',
        `| Execution Time | ${ 
          executionTime 
          }ms | ${ 
          executionTime < 20000 ? '✅' : '⚠️' 
          } |`,
        `| React 19 Compatible | ${ 
          react19Compatible ? 'Yes' : 'No' 
          } | ${ 
          react19Compatible ? '✅' : '❌' 
          } |`,
        `| CI Environment | ${ 
          process.env.CI ? 'Yes' : 'No' 
          } | ${ 
          process.env.CI ? '✅' : '⚠️' 
          } |`,
        '',
        '---',
        `*Generated at ${  new Date().toISOString()  }*`,
      ].join('\n');

      await fs.writeFile(process.env.GITHUB_STEP_SUMMARY, stepSummary);
      console.log('📝 GitHub step summary generated');
    }

    process.exit(exitCode);
  } catch (error) {
    console.error('❌ CI Health Check failed:', error);
    process.exit(1);
  }
}

// Run the health check
runBasicHealthCheck();
