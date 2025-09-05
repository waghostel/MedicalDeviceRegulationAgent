/**
 * Migration Timeline and Resource Allocation Generator
 * Comprehensive timeline planning with resource allocation and dependency management
 */

export interface ResourceAllocation {
  id: string;
  name: string;
  type: 'developer' | 'tester' | 'devops' | 'designer' | 'product_manager' | 'tech_lead';
  availability: number; // 0-1 (percentage of time available)
  skills: string[];
  hourlyRate?: number;
  assignments: TaskAssignment[];
}

export interface TaskAssignment {
  taskId: string;
  phaseId: string;
  startDate: string;
  endDate: string;
  hoursAllocated: number;
  role: string;
  dependencies: string[];
}

export interface TimelinePhase {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number; // hours
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  tasks: TimelineTask[];
  dependencies: string[];
  resources: ResourceRequirement[];
  milestones: PhaseMilestone[];
  risks: PhaseRisk[];
  deliverables: Deliverable[];
}

export interface TimelineTask {
  id: string;
  name: string;
  description: string;
  type: 'development' | 'testing' | 'deployment' | 'documentation' | 'review';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedHours: number;
  actualHours?: number;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  assignedTo: string[];
  dependencies: TaskDependency[];
  subtasks: SubTask[];
  progress: number; // 0-100
  blockers: Blocker[];
}

export interface SubTask {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
  actualHours?: number;
  status: 'not_started' | 'in_progress' | 'completed';
  assignedTo: string;
}

export interface TaskDependency {
  taskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag: number; // hours
}

export interface ResourceRequirement {
  role: string;
  hoursRequired: number;
  skillsRequired: string[];
  startDate: string;
  endDate: string;
}

export interface PhaseMilestone {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  actualDate?: string;
  status: 'pending' | 'achieved' | 'missed' | 'at_risk';
  criteria: string[];
  deliverables: string[];
}

export interface PhaseRisk {
  id: string;
  description: string;
  probability: number; // 0-1
  impact: number; // 1-10
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated' | 'closed';
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  type: 'code' | 'documentation' | 'test' | 'deployment' | 'report';
  dueDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  owner: string;
  reviewers: string[];
  location: string;
}

export interface Blocker {
  id: string;
  description: string;
  type: 'technical' | 'resource' | 'external' | 'decision';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedDate: string;
  resolvedDate?: string;
  owner: string;
  resolution?: string;
}

export interface ProjectTimeline {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  totalDuration: number; // hours
  phases: TimelinePhase[];
  resources: ResourceAllocation[];
  criticalPath: string[];
  bufferTime: number; // hours
  contingencyPlan: ContingencyPlan;
  reportingSchedule: ReportingSchedule;
}

export interface ContingencyPlan {
  scenarios: ContingencyScenario[];
  escalationProcedure: EscalationStep[];
  emergencyContacts: EmergencyContact[];
}

export interface ContingencyScenario {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  impactAssessment: string;
  timelineAdjustment: number; // hours
}

export interface EscalationStep {
  level: number;
  triggerConditions: string[];
  contacts: string[];
  actions: string[];
  timeframe: number; // hours
}

export interface EmergencyContact {
  name: string;
  role: string;
  email: string;
  phone: string;
  availability: string;
}

export interface ReportingSchedule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recipients: string[];
  format: 'email' | 'dashboard' | 'meeting' | 'document';
  metrics: string[];
  escalationThresholds: Record<string, number>;
}

/**
 * Migration Timeline Generator
 * Creates detailed project timelines with resource allocation
 */
export class MigrationTimelineGenerator {
  static generateComprehensiveTimeline(
    startDate: Date = new Date(),
    teamSize: number = 4,
    workingHoursPerDay: number = 8
  ): ProjectTimeline {
    const resources = this.generateResourceAllocation(teamSize);
    const phases = this.generateTimelinePhases(startDate, workingHoursPerDay);
    const criticalPath = this.calculateCriticalPath(phases);
    
    return {
      id: 'migration-timeline-v1',
      name: 'Frontend Migration Timeline',
      description: 'Comprehensive timeline for migrating from mock data to real backend connections',
      startDate: startDate.toISOString(),
      endDate: this.calculateEndDate(phases).toISOString(),
      totalDuration: this.calculateTotalDuration(phases),
      phases,
      resources,
      criticalPath,
      bufferTime: 40, // 5 days buffer
      contingencyPlan: this.generateContingencyPlan(),
      reportingSchedule: this.generateReportingSchedule()
    };
  }

  private static generateResourceAllocation(teamSize: number): ResourceAllocation[] {
    const baseResources: ResourceAllocation[] = [
      {
        id: 'tech-lead-1',
        name: 'Senior Frontend Developer (Tech Lead)',
        type: 'tech_lead',
        availability: 0.8, // 80% available (20% for other responsibilities)
        skills: ['React', 'TypeScript', 'Testing', 'Architecture', 'Migration Planning'],
        hourlyRate: 85,
        assignments: []
      },
      {
        id: 'frontend-dev-1',
        name: 'Frontend Developer',
        type: 'developer',
        availability: 1.0,
        skills: ['React', 'TypeScript', 'Jest', 'Playwright', 'Component Testing'],
        hourlyRate: 70,
        assignments: []
      },
      {
        id: 'backend-dev-1',
        name: 'Backend Developer',
        type: 'developer',
        availability: 0.6, // 60% available for migration support
        skills: ['FastAPI', 'Python', 'Database', 'API Design', 'SQLite'],
        hourlyRate: 75,
        assignments: []
      },
      {
        id: 'qa-engineer-1',
        name: 'QA Engineer',
        type: 'tester',
        availability: 1.0,
        skills: ['Manual Testing', 'Automated Testing', 'Accessibility Testing', 'Performance Testing'],
        hourlyRate: 60,
        assignments: []
      },
      {
        id: 'devops-engineer-1',
        name: 'DevOps Engineer',
        type: 'devops',
        availability: 0.4, // 40% available for migration infrastructure
        skills: ['CI/CD', 'Database Migration', 'Monitoring', 'Feature Flags', 'Rollback Procedures'],
        hourlyRate: 80,
        assignments: []
      }
    ];

    // Scale resources based on team size
    if (teamSize > 5) {
      baseResources.push({
        id: 'frontend-dev-2',
        name: 'Junior Frontend Developer',
        type: 'developer',
        availability: 1.0,
        skills: ['React', 'TypeScript', 'Basic Testing'],
        hourlyRate: 50,
        assignments: []
      });
    }

    return baseResources;
  }

  private static generateTimelinePhases(startDate: Date, workingHoursPerDay: number): TimelinePhase[] {
    let currentDate = new Date(startDate);

    const phases: TimelinePhase[] = [
      {
        id: 'phase-1-planning',
        name: 'Planning and Infrastructure Setup',
        description: 'Initial planning, infrastructure setup, and team preparation',
        startDate: currentDate.toISOString(),
        endDate: this.addWorkingHours(currentDate, 32, workingHoursPerDay).toISOString(),
        duration: 32,
        status: 'not_started',
        tasks: [
          {
            id: 'task-1-1',
            name: 'Migration Strategy Finalization',
            description: 'Finalize migration strategy and component priority matrix',
            type: 'documentation',
            priority: 'critical',
            estimatedHours: 8,
            startDate: currentDate.toISOString(),
            endDate: this.addWorkingHours(currentDate, 8, workingHoursPerDay).toISOString(),
            status: 'not_started',
            assignedTo: ['tech-lead-1'],
            dependencies: [],
            subtasks: [
              {
                id: 'subtask-1-1-1',
                name: 'Review component analysis',
                description: 'Review existing component mock data usage analysis',
                estimatedHours: 3,
                status: 'not_started',
                assignedTo: 'tech-lead-1'
              },
              {
                id: 'subtask-1-1-2',
                name: 'Update priority matrix',
                description: 'Update component migration priority matrix',
                estimatedHours: 3,
                status: 'not_started',
                assignedTo: 'tech-lead-1'
              },
              {
                id: 'subtask-1-1-3',
                name: 'Create rollback procedures',
                description: 'Document detailed rollback procedures',
                estimatedHours: 2,
                status: 'not_started',
                assignedTo: 'tech-lead-1'
              }
            ],
            progress: 0,
            blockers: []
          },
          {
            id: 'task-1-2',
            name: 'Database Infrastructure Setup',
            description: 'Set up test databases and seeding infrastructure',
            type: 'development',
            priority: 'critical',
            estimatedHours: 16,
            startDate: this.addWorkingHours(currentDate, 8, workingHoursPerDay).toISOString(),
            endDate: this.addWorkingHours(currentDate, 24, workingHoursPerDay).toISOString(),
            status: 'not_started',
            assignedTo: ['backend-dev-1', 'devops-engineer-1'],
            dependencies: [
              { taskId: 'task-1-1', type: 'finish_to_start', lag: 0 }
            ],
            subtasks: [
              {
                id: 'subtask-1-2-1',
                name: 'Create test database schema',
                description: 'Set up SQLite test database schema',
                estimatedHours: 6,
                status: 'not_started',
                assignedTo: 'backend-dev-1'
              },
              {
                id: 'subtask-1-2-2',
                name: 'Implement database seeding',
                description: 'Create database seeding scripts from mock data',
                estimatedHours: 8,
                status: 'not_started',
                assignedTo: 'backend-dev-1'
              },
              {
                id: 'subtask-1-2-3',
                name: 'Set up CI/CD database tasks',
                description: 'Configure CI/CD for database operations',
                estimatedHours: 2,
                status: 'not_started',
                assignedTo: 'devops-engineer-1'
              }
            ],
            progress: 0,
            blockers: []
          },
          {
            id: 'task-1-3',
            name: 'Feature Flag System Setup',
            description: 'Implement feature flag system for gradual rollout',
            type: 'development',
            priority: 'high',
            estimatedHours: 8,
            startDate: this.addWorkingHours(currentDate, 16, workingHoursPerDay).toISOString(),
            endDate: this.addWorkingHours(currentDate, 24, workingHoursPerDay).toISOString(),
            status: 'not_started',
            assignedTo: ['frontend-dev-1'],
            dependencies: [],
            subtasks: [
              {
                id: 'subtask-1-3-1',
                name: 'Implement feature flag provider',
                description: 'Create React context for feature flags',
                estimatedHours: 4,
                status: 'not_started',
                assignedTo: 'frontend-dev-1'
              },
              {
                id: 'subtask-1-3-2',
                name: 'Add feature flag hooks',
                description: 'Create custom hooks for feature flag usage',
                estimatedHours: 2,
                status: 'not_started',
                assignedTo: 'frontend-dev-1'
              },
              {
                id: 'subtask-1-3-3',
                name: 'Configure flag management',
                description: 'Set up feature flag configuration system',
                estimatedHours: 2,
                status: 'not_started',
                assignedTo: 'frontend-dev-1'
              }
            ],
            progress: 0,
            blockers: []
          }
        ],
        dependencies: [],
        resources: [
          {
            role: 'tech_lead',
            hoursRequired: 16,
            skillsRequired: ['Architecture', 'Planning'],
            startDate: currentDate.toISOString(),
            endDate: this.addWorkingHours(currentDate, 32, workingHoursPerDay).toISOString()
          },
          {
            role: 'developer',
            hoursRequired: 24,
            skillsRequired: ['React', 'Database'],
            startDate: currentDate.toISOString(),
            endDate: this.addWorkingHours(currentDate, 32, workingHoursPerDay).toISOString()
          },
          {
            role: 'devops',
            hoursRequired: 8,
            skillsRequired: ['CI/CD', 'Database'],
            startDate: currentDate.toISOString(),
            endDate: this.addWorkingHours(currentDate, 32, workingHoursPerDay).toISOString()
          }
        ],
        milestones: [
          {
            id: 'milestone-1-1',
            name: 'Infrastructure Ready',
            description: 'All infrastructure components are set up and tested',
            targetDate: this.addWorkingHours(currentDate, 32, workingHoursPerDay).toISOString(),
            status: 'pending',
            criteria: [
              'Database schema created and tested',
              'Feature flag system operational',
              'CI/CD pipeline configured',
              'Rollback procedures documented'
            ],
            deliverables: [
              'Database setup scripts',
              'Feature flag implementation',
              'Migration strategy document',
              'Rollback procedures'
            ]
          }
        ],
        risks: [
          {
            id: 'risk-1-1',
            description: 'Database schema changes may require additional time',
            probability: 0.3,
            impact: 6,
            mitigation: 'Start with simple schema, iterate as needed',
            owner: 'backend-dev-1',
            status: 'open'
          }
        ],
        deliverables: [
          {
            id: 'deliverable-1-1',
            name: 'Migration Strategy Document',
            description: 'Comprehensive migration strategy with timelines and procedures',
            type: 'documentation',
            dueDate: this.addWorkingHours(currentDate, 8, workingHoursPerDay).toISOString(),
            status: 'not_started',
            owner: 'tech-lead-1',
            reviewers: ['frontend-dev-1', 'qa-engineer-1'],
            location: 'docs/migration-strategy.md'
          },
          {
            id: 'deliverable-1-2',
            name: 'Database Infrastructure',
            description: 'Test database setup with seeding capabilities',
            type: 'code',
            dueDate: this.addWorkingHours(currentDate, 24, workingHoursPerDay).toISOString(),
            status: 'not_started',
            owner: 'backend-dev-1',
            reviewers: ['tech-lead-1'],
            location: 'src/lib/database/'
          }
        ]
      }
    ];

    // Update currentDate for next phase
    currentDate = this.addWorkingHours(currentDate, 32, workingHoursPerDay);

    // Add remaining phases (Phase 2-5)
    phases.push(...this.generateRemainingPhases(currentDate, workingHoursPerDay));

    return phases;
  }

  private static generateRemainingPhases(startDate: Date, workingHoursPerDay: number): TimelinePhase[] {
    let currentDate = new Date(startDate);
    const phases: TimelinePhase[] = [];

    // Phase 2: Display Components Migration
    phases.push({
      id: 'phase-2-display-components',
      name: 'Display Components Migration',
      description: 'Migrate display-only components to use real data',
      startDate: currentDate.toISOString(),
      endDate: this.addWorkingHours(currentDate, 48, workingHoursPerDay).toISOString(),
      duration: 48,
      status: 'not_started',
      tasks: [
        {
          id: 'task-2-1',
          name: 'Classification Widget Migration',
          description: 'Migrate ClassificationWidget to use real FDA API data',
          type: 'development',
          priority: 'critical',
          estimatedHours: 16,
          startDate: currentDate.toISOString(),
          endDate: this.addWorkingHours(currentDate, 16, workingHoursPerDay).toISOString(),
          status: 'not_started',
          assignedTo: ['frontend-dev-1'],
          dependencies: [],
          subtasks: [
            {
              id: 'subtask-2-1-1',
              name: 'Create useClassification hook',
              description: 'Create custom hook for real classification data',
              estimatedHours: 6,
              status: 'not_started',
              assignedTo: 'frontend-dev-1'
            },
            {
              id: 'subtask-2-1-2',
              name: 'Update ClassificationWidget component',
              description: 'Update component to use real data hook',
              estimatedHours: 6,
              status: 'not_started',
              assignedTo: 'frontend-dev-1'
            },
            {
              id: 'subtask-2-1-3',
              name: 'Update component tests',
              description: 'Update tests to work with real data',
              estimatedHours: 4,
              status: 'not_started',
              assignedTo: 'frontend-dev-1'
            }
          ],
          progress: 0,
          blockers: []
        }
      ],
      dependencies: ['phase-1-planning'],
      resources: [
        {
          role: 'developer',
          hoursRequired: 32,
          skillsRequired: ['React', 'TypeScript', 'Testing'],
          startDate: currentDate.toISOString(),
          endDate: this.addWorkingHours(currentDate, 48, workingHoursPerDay).toISOString()
        },
        {
          role: 'tester',
          hoursRequired: 16,
          skillsRequired: ['Manual Testing', 'Automated Testing'],
          startDate: currentDate.toISOString(),
          endDate: this.addWorkingHours(currentDate, 48, workingHoursPerDay).toISOString()
        }
      ],
      milestones: [
        {
          id: 'milestone-2-1',
          name: 'Display Components Migrated',
          description: 'All display-only components successfully migrated',
          targetDate: this.addWorkingHours(currentDate, 48, workingHoursPerDay).toISOString(),
          status: 'pending',
          criteria: [
            'ClassificationWidget uses real data',
            'ProgressWidget uses real data',
            'All tests pass',
            'Performance benchmarks met'
          ],
          deliverables: [
            'Migrated components',
            'Updated tests',
            'Performance report'
          ]
        }
      ],
      risks: [
        {
          id: 'risk-2-1',
          description: 'API response format may differ from mock data',
          probability: 0.4,
          impact: 7,
          mitigation: 'Create data transformation layer',
          owner: 'frontend-dev-1',
          status: 'open'
        }
      ],
      deliverables: [
        {
          id: 'deliverable-2-1',
          name: 'Migrated Display Components',
          description: 'All display components using real data',
          type: 'code',
          dueDate: this.addWorkingHours(currentDate, 48, workingHoursPerDay).toISOString(),
          status: 'not_started',
          owner: 'frontend-dev-1',
          reviewers: ['tech-lead-1', 'qa-engineer-1'],
          location: 'src/components/dashboard/'
        }
      ]
    });

    // Continue with remaining phases...
    currentDate = this.addWorkingHours(currentDate, 48, workingHoursPerDay);

    // Phase 3: Interactive Components (simplified for brevity)
    phases.push({
      id: 'phase-3-interactive-components',
      name: 'Interactive Components Migration',
      description: 'Migrate interactive components with user interactions',
      startDate: currentDate.toISOString(),
      endDate: this.addWorkingHours(currentDate, 64, workingHoursPerDay).toISOString(),
      duration: 64,
      status: 'not_started',
      tasks: [], // Tasks would be defined similarly
      dependencies: ['phase-2-display-components'],
      resources: [],
      milestones: [],
      risks: [],
      deliverables: []
    });

    currentDate = this.addWorkingHours(currentDate, 64, workingHoursPerDay);

    // Phase 4: Complex Workflows (simplified for brevity)
    phases.push({
      id: 'phase-4-complex-workflows',
      name: 'Complex Workflows Migration',
      description: 'Migrate complex workflows and agent interactions',
      startDate: currentDate.toISOString(),
      endDate: this.addWorkingHours(currentDate, 80, workingHoursPerDay).toISOString(),
      duration: 80,
      status: 'not_started',
      tasks: [],
      dependencies: ['phase-3-interactive-components'],
      resources: [],
      milestones: [],
      risks: [],
      deliverables: []
    });

    currentDate = this.addWorkingHours(currentDate, 80, workingHoursPerDay);

    // Phase 5: Optimization and Cleanup (simplified for brevity)
    phases.push({
      id: 'phase-5-optimization',
      name: 'Optimization and Cleanup',
      description: 'Final optimization, cleanup, and documentation',
      startDate: currentDate.toISOString(),
      endDate: this.addWorkingHours(currentDate, 32, workingHoursPerDay).toISOString(),
      duration: 32,
      status: 'not_started',
      tasks: [],
      dependencies: ['phase-4-complex-workflows'],
      resources: [],
      milestones: [],
      risks: [],
      deliverables: []
    });

    return phases;
  }

  private static calculateCriticalPath(phases: TimelinePhase[]): string[] {
    // Simplified critical path calculation
    // In a real implementation, this would use proper critical path method (CPM)
    return phases
      .filter(phase => phase.tasks.some(task => task.priority === 'critical'))
      .map(phase => phase.id);
  }

  private static calculateEndDate(phases: TimelinePhase[]): Date {
    const lastPhase = phases[phases.length - 1];
    return new Date(lastPhase.endDate);
  }

  private static calculateTotalDuration(phases: TimelinePhase[]): number {
    return phases.reduce((total, phase) => total + phase.duration, 0);
  }

  private static addWorkingHours(startDate: Date, hours: number, workingHoursPerDay: number): Date {
    const workingDays = Math.ceil(hours / workingHoursPerDay);
    const result = new Date(startDate);
    result.setDate(result.getDate() + workingDays);
    return result;
  }

  private static generateContingencyPlan(): ContingencyPlan {
    return {
      scenarios: [
        {
          id: 'scenario-1',
          name: 'API Integration Delays',
          description: 'Backend API development is delayed',
          triggers: ['API endpoints not ready', 'Backend team blocked'],
          actions: [
            'Continue with enhanced mock data',
            'Implement API client with mock responses',
            'Adjust timeline by 1 week'
          ],
          impactAssessment: 'Low to medium impact, can continue with mock data',
          timelineAdjustment: 40
        },
        {
          id: 'scenario-2',
          name: 'Critical Team Member Unavailable',
          description: 'Key team member becomes unavailable',
          triggers: ['Illness', 'Emergency leave', 'Resignation'],
          actions: [
            'Redistribute tasks among remaining team',
            'Bring in contractor if needed',
            'Prioritize critical path tasks'
          ],
          impactAssessment: 'Medium to high impact, may require timeline extension',
          timelineAdjustment: 80
        }
      ],
      escalationProcedure: [
        {
          level: 1,
          triggerConditions: ['Task delayed by > 2 days', 'Blocker identified'],
          contacts: ['tech-lead-1'],
          actions: ['Assess impact', 'Reallocate resources', 'Update timeline'],
          timeframe: 4
        },
        {
          level: 2,
          triggerConditions: ['Phase delayed by > 1 week', 'Critical blocker'],
          contacts: ['product-manager', 'engineering-manager'],
          actions: ['Executive review', 'Resource augmentation', 'Scope adjustment'],
          timeframe: 8
        }
      ],
      emergencyContacts: [
        {
          name: 'John Smith',
          role: 'Tech Lead',
          email: 'john.smith@medtech.com',
          phone: '+1-555-0101',
          availability: '24/7'
        },
        {
          name: 'Sarah Johnson',
          role: 'Engineering Manager',
          email: 'sarah.johnson@medtech.com',
          phone: '+1-555-0102',
          availability: 'Business hours + on-call'
        }
      ]
    };
  }

  private static generateReportingSchedule(): ReportingSchedule {
    return {
      frequency: 'weekly',
      recipients: [
        'team@medtech.com',
        'engineering-manager@medtech.com',
        'product-manager@medtech.com'
      ],
      format: 'email',
      metrics: [
        'Tasks completed vs planned',
        'Hours spent vs estimated',
        'Blockers identified and resolved',
        'Risk status updates',
        'Milestone progress'
      ],
      escalationThresholds: {
        'tasks_behind_schedule': 20, // percentage
        'budget_overrun': 15, // percentage
        'critical_blockers': 1, // count
        'milestone_delay': 3 // days
      }
    };
  }
}

/**
 * Resource Optimization Calculator
 * Optimizes resource allocation across timeline
 */
export class ResourceOptimizationCalculator {
  static optimizeResourceAllocation(timeline: ProjectTimeline): ResourceAllocation[] {
    const optimizedResources = [...timeline.resources];

    // Calculate resource utilization
    for (const resource of optimizedResources) {
      const totalAssignedHours = this.calculateTotalAssignedHours(resource, timeline);
      const availableHours = this.calculateAvailableHours(resource, timeline);
      
      if (totalAssignedHours > availableHours) {
        console.warn(`Resource ${resource.name} is over-allocated by ${totalAssignedHours - availableHours} hours`);
        // In real implementation, would suggest reallocation strategies
      }
    }

    return optimizedResources;
  }

  private static calculateTotalAssignedHours(resource: ResourceAllocation, timeline: ProjectTimeline): number {
    return resource.assignments.reduce((total, assignment) => total + assignment.hoursAllocated, 0);
  }

  private static calculateAvailableHours(resource: ResourceAllocation, timeline: ProjectTimeline): number {
    const startDate = new Date(timeline.startDate);
    const endDate = new Date(timeline.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const workingDays = totalDays * (5/7); // Assuming 5-day work week
    return workingDays * 8 * resource.availability; // 8 hours per day
  }
}

/**
 * Timeline Progress Tracker
 * Tracks and reports on timeline progress
 */
export class TimelineProgressTracker {
  static generateProgressReport(timeline: ProjectTimeline): TimelineProgressReport {
    const completedTasks = this.getCompletedTasks(timeline);
    const totalTasks = this.getTotalTasks(timeline);
    const overallProgress = (completedTasks / totalTasks) * 100;

    const phaseProgress = timeline.phases.map(phase => ({
      phaseId: phase.id,
      name: phase.name,
      progress: this.calculatePhaseProgress(phase),
      status: phase.status,
      onTrack: this.isPhaseOnTrack(phase)
    }));

    return {
      overallProgress,
      completedTasks,
      totalTasks,
      phaseProgress,
      upcomingMilestones: this.getUpcomingMilestones(timeline),
      blockers: this.getActiveBlockers(timeline),
      recommendations: this.generateRecommendations(timeline)
    };
  }

  private static getCompletedTasks(timeline: ProjectTimeline): number {
    return timeline.phases.reduce((total, phase) => 
      total + phase.tasks.filter(task => task.status === 'completed').length, 0
    );
  }

  private static getTotalTasks(timeline: ProjectTimeline): number {
    return timeline.phases.reduce((total, phase) => total + phase.tasks.length, 0);
  }

  private static calculatePhaseProgress(phase: TimelinePhase): number {
    if (phase.tasks.length === 0) return 0;
    const totalProgress = phase.tasks.reduce((sum, task) => sum + task.progress, 0);
    return totalProgress / phase.tasks.length;
  }

  private static isPhaseOnTrack(phase: TimelinePhase): boolean {
    const now = new Date();
    const phaseStart = new Date(phase.startDate);
    const phaseEnd = new Date(phase.endDate);
    
    if (now < phaseStart) return true; // Not started yet
    if (now > phaseEnd && phase.status !== 'completed') return false; // Overdue
    
    const expectedProgress = ((now.getTime() - phaseStart.getTime()) / 
                             (phaseEnd.getTime() - phaseStart.getTime())) * 100;
    const actualProgress = this.calculatePhaseProgress(phase);
    
    return actualProgress >= expectedProgress * 0.9; // 10% tolerance
  }

  private static getUpcomingMilestones(timeline: ProjectTimeline): PhaseMilestone[] {
    const now = new Date();
    const upcomingMilestones: PhaseMilestone[] = [];

    for (const phase of timeline.phases) {
      for (const milestone of phase.milestones) {
        const milestoneDate = new Date(milestone.targetDate);
        if (milestoneDate > now && milestone.status === 'pending') {
          upcomingMilestones.push(milestone);
        }
      }
    }

    return upcomingMilestones.sort((a, b) => 
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ).slice(0, 5); // Next 5 milestones
  }

  private static getActiveBlockers(timeline: ProjectTimeline): Blocker[] {
    const activeBlockers: Blocker[] = [];

    for (const phase of timeline.phases) {
      for (const task of phase.tasks) {
        activeBlockers.push(...task.blockers.filter(blocker => !blocker.resolvedDate));
      }
    }

    return activeBlockers.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private static generateRecommendations(timeline: ProjectTimeline): string[] {
    const recommendations: string[] = [];
    const activeBlockers = this.getActiveBlockers(timeline);

    if (activeBlockers.length > 0) {
      recommendations.push(`Address ${activeBlockers.length} active blockers, prioritizing critical and high severity items`);
    }

    const overdueTasks = timeline.phases.flatMap(phase => 
      phase.tasks.filter(task => 
        new Date(task.endDate) < new Date() && task.status !== 'completed'
      )
    );

    if (overdueTasks.length > 0) {
      recommendations.push(`${overdueTasks.length} tasks are overdue and need immediate attention`);
    }

    return recommendations;
  }
}

export interface TimelineProgressReport {
  overallProgress: number;
  completedTasks: number;
  totalTasks: number;
  phaseProgress: PhaseProgressInfo[];
  upcomingMilestones: PhaseMilestone[];
  blockers: Blocker[];
  recommendations: string[];
}

export interface PhaseProgressInfo {
  phaseId: string;
  name: string;
  progress: number;
  status: string;
  onTrack: boolean;
}

export default MigrationTimelineGenerator;