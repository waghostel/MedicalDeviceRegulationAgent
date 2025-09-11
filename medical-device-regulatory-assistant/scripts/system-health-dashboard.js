#!/usr/bin/env node

/**
 * System Health Dashboard
 * 
 * Comprehensive system health monitoring dashboard that shows test performance,
 * error rates, quality metrics, and provides real-time monitoring of all
 * critical system components with alerting for performance regressions.
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

/**
 * Health monitoring thresholds
 */
const HEALTH_THRESHOLDS = {
  response_time: 5000,      // 5 seconds
  memory_usage: 80,         // 80% of available memory
  cpu_usage: 85,            // 85% CPU usage
  disk_usage: 90,           // 90% disk usage
  error_rate: 5,            // 5% error rate
  test_success_rate: 95,    // 95% test success rate
  build_success_rate: 90,   // 90% build success rate
  uptime: 99.5              // 99.5% uptime
};

/**
 * System Health Dashboard
 */
class SystemHealthDashboard {
  constructor() {
    this.projectRoot = process.cwd();
    this.dashboardPort = process.env.DASHBOARD_PORT || 3001;
    this.refreshInterval = process.env.REFRESH_INTERVAL || 30000; // 30 seconds
    this.healthData = {
      timestamp: new Date().toISOString(),
      system: {},
      application: {},
      quality: {},
      performance: {},
      alerts: []
    };
    this.server = null;
    this.monitoringInterval = null;
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(70));
    this.log(`${COLORS.BOLD}${title}${COLORS.RESET}`, COLORS.BLUE);
    console.log('='.repeat(70));
  }

  /**
   * Collect system health metrics
   */
  async collectSystemMetrics() {
    try {
      const systemMetrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: await this.getCPUUsage(),
        disk: await this.getDiskUsage(),
        network: await this.getNetworkStatus(),
        processes: await this.getProcessStatus()
      };

      // Calculate health scores
      systemMetrics.health_score = this.calculateSystemHealthScore(systemMetrics);
      
      return systemMetrics;
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Collect application health metrics
   */
  async collectApplicationMetrics() {
    try {
      const appMetrics = {
        timestamp: new Date().toISOString(),
        frontend: await this.getFrontendHealth(),
        backend: await this.getBackendHealth(),
        database: await this.getDatabaseHealth(),
        cache: await this.getCacheHealth(),
        external_services: await this.getExternalServicesHealth()
      };

      // Calculate overall application health
      appMetrics.health_score = this.calculateApplicationHealthScore(appMetrics);
      
      return appMetrics;
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Collect quality metrics
   */
  async collectQualityMetrics() {
    try {
      const qualityMetrics = {
        timestamp: new Date().toISOString(),
        overall_score: await this.getOverallQualityScore(),
        test_coverage: await this.getTestCoverage(),
        code_quality: await this.getCodeQuality(),
        security: await this.getSecurityMetrics(),
        performance: await this.getPerformanceMetrics(),
        build_status: await this.getBuildStatus()
      };

      qualityMetrics.health_score = this.calculateQualityHealthScore(qualityMetrics);
      
      return qualityMetrics;
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    try {
      const perfMetrics = {
        timestamp: new Date().toISOString(),
        response_times: await this.getResponseTimes(),
        throughput: await this.getThroughput(),
        error_rates: await this.getErrorRates(),
        resource_usage: await this.getResourceUsage(),
        test_performance: await this.getTestPerformance()
      };

      perfMetrics.health_score = this.calculatePerformanceHealthScore(perfMetrics);
      
      return perfMetrics;
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Get CPU usage
   */
  async getCPUUsage() {
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        const output = execSync('top -l 1 -n 0 | grep "CPU usage"', { encoding: 'utf8' });
        const match = output.match(/(\d+\.\d+)%\s+user/);
        return match ? parseFloat(match[1]) : 0;
      } else {
        // Windows or other platforms
        return 0;
      }
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get disk usage
   */
  async getDiskUsage() {
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        const output = execSync('df -h .', { encoding: 'utf8' });
        const lines = output.split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          const usagePercent = parts[4];
          return parseFloat(usagePercent.replace('%', ''));
        }
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus() {
    try {
      // Test connectivity to common services
      const testUrls = [
        'https://google.com',
        'https://github.com',
        'https://npmjs.com'
      ];

      const results = await Promise.allSettled(
        testUrls.map(url => this.testConnection(url))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const connectivity = (successful / testUrls.length) * 100;

      return {
        connectivity_percent: connectivity,
        tested_urls: testUrls.length,
        successful_connections: successful
      };
    } catch (error) {
      return {
        connectivity_percent: 0,
        error: error.message
      };
    }
  }

  /**
   * Test connection to URL
   */
  async testConnection(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const request = require(url.startsWith('https') ? 'https' : 'http').get(url, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({ url, status: res.statusCode, responseTime });
      });

      request.on('error', reject);
      request.setTimeout(5000, () => {
        request.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  /**
   * Get process status
   */
  async getProcessStatus() {
    try {
      const processes = {
        node_processes: 0,
        total_processes: 0,
        memory_usage: process.memoryUsage()
      };

      if (process.platform === 'darwin' || process.platform === 'linux') {
        const output = execSync('ps aux | wc -l', { encoding: 'utf8' });
        processes.total_processes = parseInt(output.trim()) - 1; // Subtract header line

        const nodeOutput = execSync('ps aux | grep node | grep -v grep | wc -l', { encoding: 'utf8' });
        processes.node_processes = parseInt(nodeOutput.trim());
      }

      return processes;
    } catch (error) {
      return {
        error: error.message,
        memory_usage: process.memoryUsage()
      };
    }
  }

  /**
   * Get frontend health
   */
  async getFrontendHealth() {
    try {
      // Check if frontend server is running
      const isRunning = await this.checkPort(3000);
      
      let buildStatus = 'unknown';
      try {
        execSync('pnpm build', { stdio: 'pipe', cwd: this.projectRoot });
        buildStatus = 'success';
      } catch (error) {
        buildStatus = 'failed';
      }

      return {
        server_running: isRunning,
        build_status: buildStatus,
        health_score: isRunning && buildStatus === 'success' ? 100 : 50
      };
    } catch (error) {
      return {
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Get backend health
   */
  async getBackendHealth() {
    try {
      // Check if backend server is running
      const isRunning = await this.checkPort(8000);
      
      let healthCheck = false;
      if (isRunning) {
        try {
          const response = await this.testConnection('http://localhost:8000/health');
          healthCheck = response.status === 200;
        } catch (error) {
          healthCheck = false;
        }
      }

      return {
        server_running: isRunning,
        health_endpoint: healthCheck,
        health_score: isRunning && healthCheck ? 100 : isRunning ? 70 : 0
      };
    } catch (error) {
      return {
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Get database health
   */
  async getDatabaseHealth() {
    try {
      const dbPath = path.join(this.projectRoot, 'backend', 'medical_device_assistant.db');
      const dbExists = await this.pathExists(dbPath);
      
      let dbSize = 0;
      if (dbExists) {
        const stats = await fs.stat(dbPath);
        dbSize = stats.size;
      }

      return {
        database_exists: dbExists,
        database_size: dbSize,
        health_score: dbExists ? 100 : 0
      };
    } catch (error) {
      return {
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Get cache health
   */
  async getCacheHealth() {
    try {
      // Check Redis connection if available
      const redisRunning = await this.checkPort(6379);
      
      return {
        redis_running: redisRunning,
        health_score: redisRunning ? 100 : 50 // Cache is optional
      };
    } catch (error) {
      return {
        error: error.message,
        health_score: 50
      };
    }
  }

  /**
   * Get external services health
   */
  async getExternalServicesHealth() {
    try {
      const services = [
        { name: 'FDA API', url: 'https://api.fda.gov/device/510k.json?limit=1' },
        { name: 'GitHub', url: 'https://api.github.com' },
        { name: 'NPM Registry', url: 'https://registry.npmjs.org' }
      ];

      const results = await Promise.allSettled(
        services.map(async service => {
          try {
            const response = await this.testConnection(service.url);
            return {
              name: service.name,
              status: 'healthy',
              response_time: response.responseTime
            };
          } catch (error) {
            return {
              name: service.name,
              status: 'unhealthy',
              error: error.message
            };
          }
        })
      );

      const healthyServices = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 'healthy'
      ).length;

      return {
        services: results.map(r => r.status === 'fulfilled' ? r.value : r.reason),
        healthy_count: healthyServices,
        total_count: services.length,
        health_score: (healthyServices / services.length) * 100
      };
    } catch (error) {
      return {
        error: error.message,
        health_score: 0
      };
    }
  }

  /**
   * Get overall quality score
   */
  async getOverallQualityScore() {
    try {
      const reportPath = path.join(this.projectRoot, 'quality-reports');
      if (await this.pathExists(reportPath)) {
        const files = await fs.readdir(reportPath);
        const reportFiles = files
          .filter(f => f.startsWith('quality-metrics-') && f.endsWith('.json'))
          .sort()
          .reverse();

        if (reportFiles.length > 0) {
          const latestReport = path.join(reportPath, reportFiles[0]);
          const reportData = JSON.parse(await fs.readFile(latestReport, 'utf8'));
          return reportData.overall?.overall_score || 0;
        }
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get test coverage
   */
  async getTestCoverage() {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
      if (await this.pathExists(coveragePath)) {
        const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
        return {
          statements: coverageData.total.statements.pct,
          branches: coverageData.total.branches.pct,
          functions: coverageData.total.functions.pct,
          lines: coverageData.total.lines.pct
        };
      }
      return { statements: 0, branches: 0, functions: 0, lines: 0 };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get code quality metrics
   */
  async getCodeQuality() {
    try {
      // Run quick linting check
      let eslintScore = 100;
      try {
        execSync('pnpm lint', { stdio: 'pipe', cwd: this.projectRoot });
      } catch (error) {
        eslintScore = 70; // Deduct points for linting errors
      }

      let tscScore = 100;
      try {
        execSync('pnpm type-check', { stdio: 'pipe', cwd: this.projectRoot });
      } catch (error) {
        tscScore = 60; // Deduct points for type errors
      }

      return {
        eslint_score: eslintScore,
        typescript_score: tscScore,
        overall_score: (eslintScore + tscScore) / 2
      };
    } catch (error) {
      return {
        error: error.message,
        overall_score: 0
      };
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics() {
    try {
      let vulnerabilities = 0;
      try {
        const auditOutput = execSync('pnpm audit --json', { encoding: 'utf8', cwd: this.projectRoot });
        const auditData = JSON.parse(auditOutput);
        vulnerabilities = auditData.metadata?.vulnerabilities?.total || 0;
      } catch (error) {
        // Audit might fail if no vulnerabilities or other issues
      }

      return {
        vulnerabilities: vulnerabilities,
        security_score: vulnerabilities === 0 ? 100 : Math.max(0, 100 - vulnerabilities * 10)
      };
    } catch (error) {
      return {
        error: error.message,
        security_score: 50
      };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const startTime = Date.now();
      
      // Run quick test to measure performance
      try {
        execSync('pnpm test --passWithNoTests --silent', { stdio: 'pipe', cwd: this.projectRoot });
      } catch (error) {
        // Test might fail, but we still measure time
      }
      
      const testExecutionTime = Date.now() - startTime;
      
      return {
        test_execution_time: testExecutionTime,
        performance_score: testExecutionTime < 30000 ? 100 : Math.max(0, 100 - (testExecutionTime - 30000) / 1000)
      };
    } catch (error) {
      return {
        error: error.message,
        performance_score: 0
      };
    }
  }

  /**
   * Get build status
   */
  async getBuildStatus() {
    try {
      let frontendBuild = 'unknown';
      try {
        execSync('pnpm build', { stdio: 'pipe', cwd: this.projectRoot });
        frontendBuild = 'success';
      } catch (error) {
        frontendBuild = 'failed';
      }

      let backendBuild = 'unknown';
      try {
        execSync('poetry run python -c "import backend"', { 
          stdio: 'pipe', 
          cwd: path.join(this.projectRoot, 'backend') 
        });
        backendBuild = 'success';
      } catch (error) {
        backendBuild = 'failed';
      }

      return {
        frontend: frontendBuild,
        backend: backendBuild,
        overall: frontendBuild === 'success' && backendBuild === 'success' ? 'success' : 'failed'
      };
    } catch (error) {
      return {
        error: error.message,
        overall: 'failed'
      };
    }
  }

  /**
   * Get response times
   */
  async getResponseTimes() {
    const endpoints = [
      { name: 'Frontend', url: 'http://localhost:3000', port: 3000 },
      { name: 'Backend Health', url: 'http://localhost:8000/health', port: 8000 }
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        if (await this.checkPort(endpoint.port)) {
          const response = await this.testConnection(endpoint.url);
          results.push({
            name: endpoint.name,
            response_time: response.responseTime,
            status: 'healthy'
          });
        } else {
          results.push({
            name: endpoint.name,
            response_time: null,
            status: 'offline'
          });
        }
      } catch (error) {
        results.push({
          name: endpoint.name,
          response_time: null,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get throughput metrics
   */
  async getThroughput() {
    // This would typically come from application metrics
    // For now, return mock data
    return {
      requests_per_second: 0,
      transactions_per_minute: 0,
      concurrent_users: 0
    };
  }

  /**
   * Get error rates
   */
  async getErrorRates() {
    // This would typically come from application logs
    // For now, return mock data
    return {
      error_rate_percent: 0,
      total_requests: 0,
      failed_requests: 0
    };
  }

  /**
   * Get resource usage
   */
  async getResourceUsage() {
    const memory = process.memoryUsage();
    
    return {
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        usage_percent: (memory.heapUsed / memory.heapTotal) * 100
      },
      cpu: await this.getCPUUsage(),
      disk: await this.getDiskUsage()
    };
  }

  /**
   * Get test performance
   */
  async getTestPerformance() {
    try {
      const startTime = Date.now();
      
      // Run tests and measure performance
      const testResult = execSync('pnpm test --passWithNoTests --silent', { 
        stdio: 'pipe', 
        cwd: this.projectRoot 
      });
      
      const executionTime = Date.now() - startTime;
      
      return {
        execution_time: executionTime,
        status: 'passed',
        performance_score: executionTime < 30000 ? 100 : Math.max(0, 100 - (executionTime - 30000) / 1000)
      };
    } catch (error) {
      return {
        execution_time: null,
        status: 'failed',
        error: error.message,
        performance_score: 0
      };
    }
  }

  /**
   * Calculate system health score
   */
  calculateSystemHealthScore(metrics) {
    let score = 100;
    
    // Memory usage penalty
    const memoryUsage = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (memoryUsage > HEALTH_THRESHOLDS.memory_usage) {
      score -= (memoryUsage - HEALTH_THRESHOLDS.memory_usage) * 2;
    }
    
    // CPU usage penalty
    if (metrics.cpu > HEALTH_THRESHOLDS.cpu_usage) {
      score -= (metrics.cpu - HEALTH_THRESHOLDS.cpu_usage) * 2;
    }
    
    // Disk usage penalty
    if (metrics.disk > HEALTH_THRESHOLDS.disk_usage) {
      score -= (metrics.disk - HEALTH_THRESHOLDS.disk_usage) * 3;
    }
    
    // Network connectivity bonus/penalty
    if (metrics.network && metrics.network.connectivity_percent) {
      score += (metrics.network.connectivity_percent - 50) * 0.5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate application health score
   */
  calculateApplicationHealthScore(metrics) {
    const scores = [];
    
    if (metrics.frontend && metrics.frontend.health_score !== undefined) {
      scores.push(metrics.frontend.health_score);
    }
    
    if (metrics.backend && metrics.backend.health_score !== undefined) {
      scores.push(metrics.backend.health_score);
    }
    
    if (metrics.database && metrics.database.health_score !== undefined) {
      scores.push(metrics.database.health_score);
    }
    
    if (metrics.external_services && metrics.external_services.health_score !== undefined) {
      scores.push(metrics.external_services.health_score * 0.5); // External services are less critical
    }
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  /**
   * Calculate quality health score
   */
  calculateQualityHealthScore(metrics) {
    const weights = {
      overall_score: 0.3,
      test_coverage: 0.25,
      code_quality: 0.2,
      security: 0.15,
      performance: 0.1
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    if (metrics.overall_score) {
      totalScore += metrics.overall_score * weights.overall_score;
      totalWeight += weights.overall_score;
    }
    
    if (metrics.test_coverage && metrics.test_coverage.statements) {
      totalScore += metrics.test_coverage.statements * weights.test_coverage;
      totalWeight += weights.test_coverage;
    }
    
    if (metrics.code_quality && metrics.code_quality.overall_score) {
      totalScore += metrics.code_quality.overall_score * weights.code_quality;
      totalWeight += weights.code_quality;
    }
    
    if (metrics.security && metrics.security.security_score) {
      totalScore += metrics.security.security_score * weights.security;
      totalWeight += weights.security;
    }
    
    if (metrics.performance && metrics.performance.performance_score) {
      totalScore += metrics.performance.performance_score * weights.performance;
      totalWeight += weights.performance;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate performance health score
   */
  calculatePerformanceHealthScore(metrics) {
    let score = 100;
    
    // Response time penalties
    if (metrics.response_times) {
      metrics.response_times.forEach(rt => {
        if (rt.response_time && rt.response_time > HEALTH_THRESHOLDS.response_time) {
          score -= (rt.response_time - HEALTH_THRESHOLDS.response_time) / 1000;
        }
      });
    }
    
    // Error rate penalty
    if (metrics.error_rates && metrics.error_rates.error_rate_percent > HEALTH_THRESHOLDS.error_rate) {
      score -= (metrics.error_rates.error_rate_percent - HEALTH_THRESHOLDS.error_rate) * 5;
    }
    
    // Test performance penalty
    if (metrics.test_performance && metrics.test_performance.performance_score) {
      score = (score + metrics.test_performance.performance_score) / 2;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate alerts based on health data
   */
  generateAlerts() {
    const alerts = [];
    
    // System alerts
    if (this.healthData.system.health_score < 70) {
      alerts.push({
        type: 'system',
        severity: 'warning',
        message: 'System health score is below threshold',
        value: this.healthData.system.health_score,
        threshold: 70
      });
    }
    
    // Application alerts
    if (this.healthData.application.health_score < 80) {
      alerts.push({
        type: 'application',
        severity: 'warning',
        message: 'Application health score is below threshold',
        value: this.healthData.application.health_score,
        threshold: 80
      });
    }
    
    // Quality alerts
    if (this.healthData.quality.health_score < 75) {
      alerts.push({
        type: 'quality',
        severity: 'major',
        message: 'Quality health score is below threshold',
        value: this.healthData.quality.health_score,
        threshold: 75
      });
    }
    
    // Performance alerts
    if (this.healthData.performance.health_score < 85) {
      alerts.push({
        type: 'performance',
        severity: 'minor',
        message: 'Performance health score is below threshold',
        value: this.healthData.performance.health_score,
        threshold: 85
      });
    }
    
    return alerts;
  }

  /**
   * Update health data
   */
  async updateHealthData() {
    try {
      this.log('🔄 Updating health metrics...', COLORS.YELLOW);
      
      this.healthData = {
        timestamp: new Date().toISOString(),
        system: await this.collectSystemMetrics(),
        application: await this.collectApplicationMetrics(),
        quality: await this.collectQualityMetrics(),
        performance: await this.collectPerformanceMetrics(),
        alerts: []
      };
      
      // Generate alerts
      this.healthData.alerts = this.generateAlerts();
      
      // Calculate overall health score
      this.healthData.overall_health_score = (
        this.healthData.system.health_score * 0.25 +
        this.healthData.application.health_score * 0.3 +
        this.healthData.quality.health_score * 0.25 +
        this.healthData.performance.health_score * 0.2
      );
      
      this.log(`✅ Health data updated. Overall score: ${this.healthData.overall_health_score.toFixed(1)}`, COLORS.GREEN);
      
    } catch (error) {
      this.log(`❌ Failed to update health data: ${error.message}`, COLORS.RED);
    }
  }

  /**
   * Generate HTML dashboard
   */
  generateHTMLDashboard() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Health Dashboard - Medical Device Regulatory Assistant</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: #f5f7fa; 
            color: #333;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            text-align: center;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }
        .metric-card { 
            background: white; 
            border-radius: 12px; 
            padding: 20px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-left: 4px solid #007bff;
        }
        .metric-card.warning { border-left-color: #ffc107; }
        .metric-card.danger { border-left-color: #dc3545; }
        .metric-card.success { border-left-color: #28a745; }
        .metric-title { font-size: 1.1em; font-weight: 600; margin-bottom: 10px; }
        .metric-value { font-size: 2.5em; font-weight: bold; color: #007bff; }
        .metric-subtitle { color: #6c757d; margin-top: 5px; }
        .health-score { 
            display: inline-block; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-weight: bold; 
            color: white;
        }
        .health-excellent { background: #28a745; }
        .health-good { background: #17a2b8; }
        .health-warning { background: #ffc107; color: #333; }
        .health-danger { background: #dc3545; }
        .alerts { margin: 20px 0; }
        .alert { 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border-left: 4px solid;
        }
        .alert-warning { background: #fff3cd; border-left-color: #ffc107; }
        .alert-danger { background: #f8d7da; border-left-color: #dc3545; }
        .alert-info { background: #d1ecf1; border-left-color: #17a2b8; }
        .status-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
        }
        .status-item { 
            display: flex; 
            align-items: center; 
            padding: 10px; 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status-indicator { 
            width: 12px; 
            height: 12px; 
            border-radius: 50%; 
            margin-right: 10px; 
        }
        .status-healthy { background: #28a745; }
        .status-warning { background: #ffc107; }
        .status-error { background: #dc3545; }
        .status-offline { background: #6c757d; }
        .refresh-info { 
            text-align: center; 
            color: #6c757d; 
            margin: 20px 0; 
        }
        .chart-container { 
            height: 200px; 
            background: white; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
        }
    </style>
    <script>
        function refreshDashboard() {
            location.reload();
        }
        
        function getHealthScoreClass(score) {
            if (score >= 90) return 'health-excellent';
            if (score >= 75) return 'health-good';
            if (score >= 60) return 'health-warning';
            return 'health-danger';
        }
        
        // Auto-refresh every 30 seconds
        setTimeout(refreshDashboard, 30000);
    </script>
</head>
<body>
    <div class="header">
        <h1>🏥 System Health Dashboard</h1>
        <p>Medical Device Regulatory Assistant - Real-time Monitoring</p>
        <p>Last Updated: ${new Date(this.healthData.timestamp).toLocaleString()}</p>
        <div class="health-score ${this.getHealthScoreClass(this.healthData.overall_health_score)}">
            Overall Health: ${this.healthData.overall_health_score.toFixed(1)}%
        </div>
    </div>
    
    <div class="container">
        ${this.healthData.alerts.length > 0 ? `
        <div class="alerts">
            <h2>🚨 Active Alerts</h2>
            ${this.healthData.alerts.map(alert => `
                <div class="alert alert-${alert.severity === 'major' ? 'danger' : 'warning'}">
                    <strong>${alert.type.toUpperCase()}</strong>: ${alert.message}
                    ${alert.value !== undefined ? `(${alert.value} < ${alert.threshold})` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="metrics-grid">
            <div class="metric-card ${this.getCardClass(this.healthData.system.health_score)}">
                <div class="metric-title">🖥️ System Health</div>
                <div class="metric-value">${this.healthData.system.health_score.toFixed(1)}%</div>
                <div class="metric-subtitle">
                    CPU: ${this.healthData.system.cpu.toFixed(1)}% | 
                    Memory: ${((this.healthData.system.memory.heapUsed / this.healthData.system.memory.heapTotal) * 100).toFixed(1)}% |
                    Disk: ${this.healthData.system.disk.toFixed(1)}%
                </div>
            </div>
            
            <div class="metric-card ${this.getCardClass(this.healthData.application.health_score)}">
                <div class="metric-title">🚀 Application Health</div>
                <div class="metric-value">${this.healthData.application.health_score.toFixed(1)}%</div>
                <div class="metric-subtitle">
                    Frontend: ${this.healthData.application.frontend.health_score}% | 
                    Backend: ${this.healthData.application.backend.health_score}%
                </div>
            </div>
            
            <div class="metric-card ${this.getCardClass(this.healthData.quality.health_score)}">
                <div class="metric-title">✅ Quality Health</div>
                <div class="metric-value">${this.healthData.quality.health_score.toFixed(1)}%</div>
                <div class="metric-subtitle">
                    Overall Score: ${this.healthData.quality.overall_score} | 
                    Coverage: ${this.healthData.quality.test_coverage.statements || 0}%
                </div>
            </div>
            
            <div class="metric-card ${this.getCardClass(this.healthData.performance.health_score)}">
                <div class="metric-title">⚡ Performance Health</div>
                <div class="metric-value">${this.healthData.performance.health_score.toFixed(1)}%</div>
                <div class="metric-subtitle">
                    Test Time: ${this.healthData.performance.test_performance.execution_time || 0}ms
                </div>
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">🔗 Service Status</div>
            <div class="status-grid">
                <div class="status-item">
                    <div class="status-indicator ${this.healthData.application.frontend.server_running ? 'status-healthy' : 'status-offline'}"></div>
                    Frontend Server
                </div>
                <div class="status-item">
                    <div class="status-indicator ${this.healthData.application.backend.server_running ? 'status-healthy' : 'status-offline'}"></div>
                    Backend Server
                </div>
                <div class="status-item">
                    <div class="status-indicator ${this.healthData.application.database.database_exists ? 'status-healthy' : 'status-error'}"></div>
                    Database
                </div>
                <div class="status-item">
                    <div class="status-indicator ${this.healthData.application.cache.redis_running ? 'status-healthy' : 'status-warning'}"></div>
                    Cache (Redis)
                </div>
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">🌐 External Services</div>
            <div class="status-grid">
                ${this.healthData.application.external_services.services.map(service => `
                    <div class="status-item">
                        <div class="status-indicator ${service.status === 'healthy' ? 'status-healthy' : 'status-error'}"></div>
                        ${service.name} ${service.response_time ? `(${service.response_time}ms)` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="refresh-info">
            <p>🔄 Dashboard auto-refreshes every 30 seconds</p>
            <button onclick="refreshDashboard()" style="padding: 8px 16px; margin: 10px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
                Refresh Now
            </button>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Get health score CSS class
   */
  getHealthScoreClass(score) {
    if (score >= 90) return 'health-excellent';
    if (score >= 75) return 'health-good';
    if (score >= 60) return 'health-warning';
    return 'health-danger';
  }

  /**
   * Get card CSS class based on score
   */
  getCardClass(score) {
    if (score >= 90) return 'success';
    if (score >= 75) return '';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  /**
   * Start HTTP server for dashboard
   */
  startDashboardServer() {
    this.server = http.createServer(async (req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.generateHTMLDashboard());
      } else if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.healthData, null, 2));
      } else if (req.url === '/api/refresh') {
        await this.updateHealthData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'updated', timestamp: this.healthData.timestamp }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.server.listen(this.dashboardPort, () => {
      this.log(`🌐 Health dashboard server started on http://localhost:${this.dashboardPort}`, COLORS.GREEN);
      this.log(`📊 Dashboard URL: http://localhost:${this.dashboardPort}`, COLORS.BLUE);
      this.log(`🔗 API endpoint: http://localhost:${this.dashboardPort}/api/health`, COLORS.BLUE);
    });
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    // Initial health data collection
    this.updateHealthData();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.updateHealthData();
    }, this.refreshInterval);

    this.log(`🔄 Health monitoring started (refresh interval: ${this.refreshInterval / 1000}s)`, COLORS.GREEN);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.log('🛑 Health monitoring stopped', COLORS.YELLOW);
  }

  /**
   * Print console dashboard
   */
  printConsoleDashboard() {
    this.logSection('System Health Dashboard');
    
    const overallScore = this.healthData.overall_health_score;
    const scoreColor = overallScore >= 90 ? COLORS.GREEN : 
                      overallScore >= 75 ? COLORS.YELLOW : COLORS.RED;
    
    this.log(`Overall Health Score: ${overallScore.toFixed(1)}%`, scoreColor);
    
    // Health scores table
    console.log('\n📊 Health Metrics:');
    console.log('┌─────────────────────┬───────────┬─────────────┐');
    console.log('│ Component           │ Score     │ Status      │');
    console.log('├─────────────────────┼───────────┼─────────────┤');
    
    const components = [
      { name: 'System', score: this.healthData.system.health_score },
      { name: 'Application', score: this.healthData.application.health_score },
      { name: 'Quality', score: this.healthData.quality.health_score },
      { name: 'Performance', score: this.healthData.performance.health_score }
    ];
    
    components.forEach(component => {
      const score = component.score.toFixed(1) + '%';
      const status = component.score >= 90 ? '🟢 Excellent' :
                    component.score >= 75 ? '🟡 Good' :
                    component.score >= 60 ? '🟠 Warning' : '🔴 Critical';
      
      console.log(`│ ${component.name.padEnd(19)} │ ${score.padEnd(9)} │ ${status.padEnd(11)} │`);
    });
    
    console.log('└─────────────────────┴───────────┴─────────────┘');

    // Active alerts
    if (this.healthData.alerts.length > 0) {
      console.log('\n🚨 Active Alerts:');
      this.healthData.alerts.forEach(alert => {
        const severityColor = alert.severity === 'major' ? COLORS.RED : COLORS.YELLOW;
        this.log(`  • [${alert.severity.toUpperCase()}] ${alert.message}`, severityColor);
      });
    } else {
      this.log('\n✅ No active alerts', COLORS.GREEN);
    }

    this.log(`\n🔄 Last updated: ${new Date(this.healthData.timestamp).toLocaleString()}`, COLORS.BLUE);
  }

  /**
   * Helper methods
   */
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(false));
        server.close();
      });
      server.on('error', () => resolve(true)); // Port is in use
    });
  }

  /**
   * Main execution
   */
  async run() {
    try {
      this.log(`${COLORS.BOLD}🏥 System Health Dashboard - Medical Device Regulatory Assistant${COLORS.RESET}`, COLORS.BLUE);
      
      // Start monitoring
      this.startMonitoring();
      
      // Start web dashboard
      this.startDashboardServer();
      
      // Print initial console dashboard
      setTimeout(() => {
        this.printConsoleDashboard();
      }, 2000);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        this.log('\n🛑 Shutting down health dashboard...', COLORS.YELLOW);
        this.stopMonitoring();
        process.exit(0);
      });
      
      // Keep the process running
      this.log('\n📊 Health dashboard is running. Press Ctrl+C to stop.', COLORS.GREEN);
      
    } catch (error) {
      this.log(`\n💥 Health dashboard failed to start: ${error.message}`, COLORS.RED);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const dashboard = new SystemHealthDashboard();
  await dashboard.run();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SystemHealthDashboard;