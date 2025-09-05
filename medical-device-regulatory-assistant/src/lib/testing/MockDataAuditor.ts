/**
 * MockDataAuditor - Component analysis system for identifying mock data usage
 * 
 * This class provides static analysis tools to:
 * - Scan components for mock data imports and dependencies
 * - Generate dependency graphs mapping mock data flow
 * - Calculate migration priorities based on complexity and usage
 * - Generate comprehensive audit reports
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@typescript-eslint/parser';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/types';

export interface MockDataImport {
  importPath: string;
  importedFunctions: string[];
  usageCount: number;
  lineNumber: number;
}

export interface MockDataUsage {
  functionName: string;
  usageContext: 'direct' | 'hook' | 'context' | 'prop';
  frequency: number;
  locations: Array<{
    line: number;
    column: number;
    context: string;
  }>;
}

export interface ComponentDependency {
  componentPath: string;
  dependsOn: string[];
  dependents: string[];
  depth: number;
}

export interface HookUsage {
  hookName: string;
  usageCount: number;
  mockDataDependencies: string[];
}

export interface ContextUsage {
  contextName: string;
  providesData: string[];
  consumesData: string[];
}

export interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  testFiles: number;
}

export interface MigrationReadiness {
  score: number; // 0-1
  blockers: string[];
  recommendations: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ComponentAnalysis {
  componentPath: string;
  componentName: string;
  
  // Mock data usage
  mockDataImports: MockDataImport[];
  mockDataUsage: MockDataUsage[];
  
  // Dependencies
  dependencies: ComponentDependency[];
  hooks: HookUsage[];
  contextUsage: ContextUsage[];
  
  // Test coverage
  testFiles: string[];
  coverageMetrics: CoverageMetrics;
  
  // Migration readiness
  migrationReadiness: MigrationReadiness;
}

export interface ComponentMockUsage {
  componentPath: string;
  mockDataUsed: string[];
  migrationPriority: 'high' | 'medium' | 'low';
  dependencies: string[];
  testCoverage: number;
}

export interface MigrationPhase {
  name: string;
  components: string[];
  dependencies: string[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MigrationPlan {
  phases: MigrationPhase[];
  estimatedEffort: number;
  riskAssessment: 'low' | 'medium' | 'high';
  totalComponents: number;
  migrationOrder: string[];
}

export interface AuditReport {
  summary: {
    totalComponents: number;
    componentsWithMockData: number;
    mockDataFunctions: string[];
    migrationReadiness: number;
  };
  componentAnalysis: ComponentAnalysis[];
  dependencyGraph: Map<string, string[]>;
  migrationPlan: MigrationPlan;
  recommendations: string[];
  generatedAt: Date;
}

export class MockDataAuditor {
  private srcPath: string;
  private mockDataPath: string;
  private componentCache: Map<string, ComponentAnalysis> = new Map();
  
  constructor(srcPath: string = 'src', mockDataPath: string = 'src/lib/mock-data.ts') {
    this.srcPath = srcPath;
    this.mockDataPath = mockDataPath;
  }

  /**
   * Scan all components for mock data usage
   */
  public async scanComponents(): Promise<ComponentMockUsage[]> {
    const components = await this.findAllComponents();
    const mockDataFunctions = await this.extractMockDataFunctions();
    
    const results: ComponentMockUsage[] = [];
    
    for (const componentPath of components) {
      const analysis = await this.analyzeComponent(componentPath, mockDataFunctions);
      
      if (analysis.mockDataImports.length > 0 || analysis.mockDataUsage.length > 0) {
        results.push({
          componentPath: analysis.componentPath,
          mockDataUsed: analysis.mockDataUsage.map(usage => usage.functionName),
          migrationPriority: this.calculateMigrationPriority(analysis),
          dependencies: analysis.dependencies.map(dep => dep.componentPath),
          testCoverage: analysis.coverageMetrics.lines,
        });
      }
    }
    
    return results.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.migrationPriority] - priorityOrder[a.migrationPriority];
    });
  }

  /**
   * Generate dependency graph mapping mock data flow through components
   */
  public async generateDependencyGraph(): Promise<Map<string, string[]>> {
    const components = await this.scanComponents();
    const dependencyGraph = new Map<string, string[]>();
    
    for (const component of components) {
      dependencyGraph.set(component.componentPath, component.dependencies);
    }
    
    return dependencyGraph;
  }

  /**
   * Calculate migration priority based on component complexity and usage
   */
  public calculateMigrationPriority(analysis: ComponentAnalysis): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Factor 1: Number of mock data dependencies (0-3 points)
    const mockDataCount = analysis.mockDataUsage.length;
    if (mockDataCount >= 5) score += 3;
    else if (mockDataCount >= 3) score += 2;
    else if (mockDataCount >= 1) score += 1;
    
    // Factor 2: Component complexity (0-3 points)
    const dependencyCount = analysis.dependencies.length;
    if (dependencyCount >= 10) score += 3;
    else if (dependencyCount >= 5) score += 2;
    else if (dependencyCount >= 1) score += 1;
    
    // Factor 3: Test coverage (0-2 points, inverted - lower coverage = higher priority)
    const coverage = analysis.coverageMetrics.lines;
    if (coverage < 50) score += 2;
    else if (coverage < 80) score += 1;
    
    // Factor 4: Usage frequency (0-2 points)
    const totalUsage = analysis.mockDataUsage.reduce((sum, usage) => sum + usage.frequency, 0);
    if (totalUsage >= 10) score += 2;
    else if (totalUsage >= 5) score += 1;
    
    // Determine priority based on total score
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Generate comprehensive audit report
   */
  public async generateAuditReport(): Promise<AuditReport> {
    const componentUsage = await this.scanComponents();
    const dependencyGraph = await this.generateDependencyGraph();
    const mockDataFunctions = await this.extractMockDataFunctions();
    
    const componentAnalysis: ComponentAnalysis[] = [];
    for (const usage of componentUsage) {
      const analysis = this.componentCache.get(usage.componentPath);
      if (analysis) {
        componentAnalysis.push(analysis);
      }
    }
    
    const migrationPlan = this.generateMigrationPlan(componentUsage);
    
    return {
      summary: {
        totalComponents: componentAnalysis.length,
        componentsWithMockData: componentUsage.length,
        mockDataFunctions,
        migrationReadiness: this.calculateOverallMigrationReadiness(componentAnalysis),
      },
      componentAnalysis,
      dependencyGraph,
      migrationPlan,
      recommendations: this.generateRecommendations(componentAnalysis),
      generatedAt: new Date(),
    };
  }

  /**
   * Find all React components in the src directory
   */
  private async findAllComponents(): Promise<string[]> {
    const components: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (file.match(/\.(tsx|jsx)$/)) {
          components.push(filePath);
        }
      }
    };
    
    scanDirectory(this.srcPath);
    return components;
  }

  /**
   * Extract all mock data function names from mock-data.ts
   */
  private async extractMockDataFunctions(): Promise<string[]> {
    try {
      const content = fs.readFileSync(this.mockDataPath, 'utf-8');
      const ast = parse(content, {
        loc: true,
        range: true,
        ecmaVersion: 2020,
        sourceType: 'module',
      });

      const functions: string[] = [];
      
      const traverse = (node: any) => {
        if (node.type === AST_NODE_TYPES.ExportNamedDeclaration) {
          if (node.declaration?.type === AST_NODE_TYPES.FunctionDeclaration) {
            functions.push(node.declaration.id.name);
          } else if (node.declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
            for (const declarator of node.declaration.declarations) {
              if (declarator.id.name) {
                functions.push(declarator.id.name);
              }
            }
          }
        }
        
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(traverse);
            } else {
              traverse(node[key]);
            }
          }
        }
      };
      
      traverse(ast);
      return functions;
    } catch (error) {
      console.warn(`Could not parse mock data file: ${error}`);
      return [];
    }
  }

  /**
   * Analyze a single component for mock data usage
   */
  private async analyzeComponent(componentPath: string, mockDataFunctions: string[]): Promise<ComponentAnalysis> {
    if (this.componentCache.has(componentPath)) {
      return this.componentCache.get(componentPath)!;
    }

    try {
      const content = fs.readFileSync(componentPath, 'utf-8');
      const ast = parse(content, {
        loc: true,
        range: true,
        ecmaVersion: 2020,
        sourceType: 'module',
      });

      const analysis: ComponentAnalysis = {
        componentPath,
        componentName: path.basename(componentPath, path.extname(componentPath)),
        mockDataImports: [],
        mockDataUsage: [],
        dependencies: [],
        hooks: [],
        contextUsage: [],
        testFiles: [],
        coverageMetrics: { statements: 0, branches: 0, functions: 0, lines: 0, testFiles: 0 },
        migrationReadiness: {
          score: 0,
          blockers: [],
          recommendations: [],
          estimatedEffort: 'low',
          riskLevel: 'low',
        },
      };

      // Analyze AST for mock data usage
      this.analyzeAST(ast, analysis, mockDataFunctions);
      
      // Calculate migration readiness
      analysis.migrationReadiness = this.calculateMigrationReadiness(analysis);
      
      this.componentCache.set(componentPath, analysis);
      return analysis;
    } catch (error) {
      console.warn(`Could not analyze component ${componentPath}: ${error}`);
      return {
        componentPath,
        componentName: path.basename(componentPath, path.extname(componentPath)),
        mockDataImports: [],
        mockDataUsage: [],
        dependencies: [],
        hooks: [],
        contextUsage: [],
        testFiles: [],
        coverageMetrics: { statements: 0, branches: 0, functions: 0, lines: 0, testFiles: 0 },
        migrationReadiness: {
          score: 0,
          blockers: ['Parse error'],
          recommendations: ['Fix syntax errors'],
          estimatedEffort: 'high',
          riskLevel: 'high',
        },
      };
    }
  }

  /**
   * Analyze AST for mock data usage patterns
   */
  private analyzeAST(ast: any, analysis: ComponentAnalysis, mockDataFunctions: string[]): void {
    const usageMap = new Map<string, MockDataUsage>();
    
    const traverse = (node: any, parent?: any) => {
      // Check for imports from mock-data
      if (node.type === AST_NODE_TYPES.ImportDeclaration) {
        if (node.source.value.includes('mock-data')) {
          const importedFunctions: string[] = [];
          
          for (const specifier of node.specifiers) {
            if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
              importedFunctions.push(specifier.imported.name);
            }
          }
          
          analysis.mockDataImports.push({
            importPath: node.source.value,
            importedFunctions,
            usageCount: 0,
            lineNumber: node.loc?.start.line || 0,
          });
        }
      }
      
      // Check for function calls to mock data functions
      if (node.type === AST_NODE_TYPES.CallExpression) {
        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          const functionName = node.callee.name;
          
          if (mockDataFunctions.includes(functionName)) {
            if (!usageMap.has(functionName)) {
              usageMap.set(functionName, {
                functionName,
                usageContext: this.determineUsageContext(node, parent),
                frequency: 0,
                locations: [],
              });
            }
            
            const usage = usageMap.get(functionName)!;
            usage.frequency++;
            usage.locations.push({
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0,
              context: this.getContextString(node, parent),
            });
          }
        }
      }
      
      // Recursively traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child, node));
          } else {
            traverse(node[key], node);
          }
        }
      }
    };
    
    traverse(ast);
    analysis.mockDataUsage = Array.from(usageMap.values());
  }

  /**
   * Determine the context in which mock data is being used
   */
  private determineUsageContext(node: any, parent?: any): 'direct' | 'hook' | 'context' | 'prop' {
    if (!parent) return 'direct';
    
    // Check if used in a hook
    if (parent.type === AST_NODE_TYPES.CallExpression && 
        parent.callee.name && parent.callee.name.startsWith('use')) {
      return 'hook';
    }
    
    // Check if used in context provider
    if (parent.type === AST_NODE_TYPES.JSXExpressionContainer) {
      return 'context';
    }
    
    // Check if passed as prop
    if (parent.type === AST_NODE_TYPES.JSXAttribute) {
      return 'prop';
    }
    
    return 'direct';
  }

  /**
   * Get context string for better understanding of usage
   */
  private getContextString(node: any, parent?: any): string {
    if (!parent) return 'direct call';
    
    if (parent.type === AST_NODE_TYPES.VariableDeclarator) {
      return `assigned to ${parent.id.name}`;
    }
    
    if (parent.type === AST_NODE_TYPES.JSXAttribute) {
      return `passed as prop ${parent.name.name}`;
    }
    
    return 'function call';
  }

  /**
   * Calculate migration readiness for a component
   */
  private calculateMigrationReadiness(analysis: ComponentAnalysis): MigrationReadiness {
    let score = 1.0;
    const blockers: string[] = [];
    const recommendations: string[] = [];
    
    // Reduce score based on mock data dependencies
    const mockDataCount = analysis.mockDataUsage.length;
    if (mockDataCount > 5) {
      score -= 0.3;
      blockers.push('High number of mock data dependencies');
      recommendations.push('Refactor to reduce mock data dependencies');
    } else if (mockDataCount > 2) {
      score -= 0.1;
      recommendations.push('Consider consolidating mock data usage');
    }
    
    // Reduce score based on test coverage
    if (analysis.testFiles.length === 0) {
      score -= 0.2;
      blockers.push('No test files found');
      recommendations.push('Add unit tests before migration');
    }
    
    // Reduce score based on complexity
    if (analysis.dependencies.length > 10) {
      score -= 0.2;
      recommendations.push('High complexity - plan migration carefully');
    }
    
    score = Math.max(0, Math.min(1, score));
    
    let estimatedEffort: 'low' | 'medium' | 'high' = 'low';
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (score < 0.4) {
      estimatedEffort = 'high';
      riskLevel = 'high';
    } else if (score < 0.7) {
      estimatedEffort = 'medium';
      riskLevel = 'medium';
    }
    
    return {
      score,
      blockers,
      recommendations,
      estimatedEffort,
      riskLevel,
    };
  }

  /**
   * Generate migration plan with phases
   */
  private generateMigrationPlan(components: ComponentMockUsage[]): MigrationPlan {
    const phases: MigrationPhase[] = [];
    
    // Phase 1: Low priority, low risk components
    const phase1Components = components.filter(c => c.migrationPriority === 'low');
    if (phase1Components.length > 0) {
      phases.push({
        name: 'Phase 1: Low-Risk Components',
        components: phase1Components.map(c => c.componentPath),
        dependencies: [],
        estimatedDuration: phase1Components.length * 2, // 2 hours per component
        riskLevel: 'low',
      });
    }
    
    // Phase 2: Medium priority components
    const phase2Components = components.filter(c => c.migrationPriority === 'medium');
    if (phase2Components.length > 0) {
      phases.push({
        name: 'Phase 2: Medium-Priority Components',
        components: phase2Components.map(c => c.componentPath),
        dependencies: phase1Components.map(c => c.componentPath),
        estimatedDuration: phase2Components.length * 4, // 4 hours per component
        riskLevel: 'medium',
      });
    }
    
    // Phase 3: High priority, high impact components
    const phase3Components = components.filter(c => c.migrationPriority === 'high');
    if (phase3Components.length > 0) {
      phases.push({
        name: 'Phase 3: High-Priority Components',
        components: phase3Components.map(c => c.componentPath),
        dependencies: [...phase1Components, ...phase2Components].map(c => c.componentPath),
        estimatedDuration: phase3Components.length * 8, // 8 hours per component
        riskLevel: 'high',
      });
    }
    
    const totalEffort = phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);
    const overallRisk = phase3Components.length > 0 ? 'high' : 
                       phase2Components.length > 0 ? 'medium' : 'low';
    
    return {
      phases,
      estimatedEffort: totalEffort,
      riskAssessment: overallRisk,
      totalComponents: components.length,
      migrationOrder: components.map(c => c.componentPath),
    };
  }

  /**
   * Calculate overall migration readiness score
   */
  private calculateOverallMigrationReadiness(analyses: ComponentAnalysis[]): number {
    if (analyses.length === 0) return 1.0;
    
    const totalScore = analyses.reduce((sum, analysis) => sum + analysis.migrationReadiness.score, 0);
    return totalScore / analyses.length;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analyses: ComponentAnalysis[]): string[] {
    const recommendations = new Set<string>();
    
    const highRiskComponents = analyses.filter(a => a.migrationReadiness.riskLevel === 'high');
    if (highRiskComponents.length > 0) {
      recommendations.add('Focus on high-risk components first - add comprehensive tests');
      recommendations.add('Consider refactoring complex components before migration');
    }
    
    const noTestComponents = analyses.filter(a => a.testFiles.length === 0);
    if (noTestComponents.length > 0) {
      recommendations.add(`${noTestComponents.length} components lack tests - prioritize test coverage`);
    }
    
    const heavyMockUsage = analyses.filter(a => a.mockDataUsage.length > 5);
    if (heavyMockUsage.length > 0) {
      recommendations.add('Components with heavy mock data usage should be refactored for easier migration');
    }
    
    recommendations.add('Start migration with display-only components');
    recommendations.add('Implement feature flags for gradual rollout');
    recommendations.add('Set up monitoring for post-migration validation');
    
    return Array.from(recommendations);
  }
}