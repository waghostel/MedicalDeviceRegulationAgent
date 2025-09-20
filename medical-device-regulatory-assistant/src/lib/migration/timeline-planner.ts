/**
 * Migration Timeline and Resource Allocation Planner
 * Creates detailed timeline and resource allocation for migration project
 */

export interface TimelinePlan {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  totalDuration: number; // days
  phases: TimelinePhase[];
  milestones: Milestone[];
  dependencies: Dependency[];
  resources: ResourceAllocation;
  risks: TimelineRisk[];
  buffers: BufferAllocation[];
  criticalPath: CriticalPathAnalysis;
}

export interface TimelinePhase {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number; // days
  effort: number; // person-days
  tasks: TimelineTask[];
  dependencies: string[];
  resources: PhaseResourceRequirement[];
  deliverables: Deliverable[];
  successCriteria: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: PhaseStatus;
}

export enum PhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export interface TimelineTask {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number; // days
  effort: number; // person-days
  assignee?: string;
  skills: SkillRequirement[];
  dependencies: string[];
  components: string[];
  priority: TaskPriority;
  complexity: TaskComplexity;
  status: TaskStatus;
  progress: number; // 0-100
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TaskComplexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex',
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  DELAYED = 'delayed',
}

export interface SkillRequirement {
  skill: string;
  level: 'junior' | 'mid' | 'senior' | 'expert';
  required: boolean;
  duration: number; // days
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  date: string;
  type: MilestoneType;
  deliverables: string[];
  successCriteria: string[];
  dependencies: string[];
  stakeholders: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export enum MilestoneType {
  PHASE_START = 'phase_start',
  PHASE_END = 'phase_end',
  DELIVERABLE = 'deliverable',
  DECISION_POINT = 'decision_point',
  EXTERNAL_DEPENDENCY = 'external_dependency',
  RISK_CHECKPOINT = 'risk_checkpoint',
}

export interface Dependency {
  id: string;
  name: string;
  type: DependencyType;
  from: string;
  to: string;
  relationship: DependencyRelationship;
  lag: number; // days
  critical: boolean;
  description: string;
}

export enum DependencyType {
  TASK_TO_TASK = 'task_to_task',
  PHASE_TO_PHASE = 'phase_to_phase',
  EXTERNAL = 'external',
  RESOURCE = 'resource',
  TECHNICAL = 'technical',
}

export enum DependencyRelationship {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish',
}

export interface ResourceAllocation {
  team: TeamMember[];
  roles: RoleAllocation[];
  skills: SkillAllocation[];
  capacity: CapacityPlan[];
  costs: CostEstimate;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: string[];
  availability: number; // percentage
  hourlyRate: number;
  startDate: string;
  endDate: string;
}

export interface RoleAllocation {
  role: string;
  required: number;
  allocated: number;
  skills: string[];
  phases: string[];
  utilization: number; // percentage
}

export interface SkillAllocation {
  skill: string;
  required: number; // person-days
  available: number; // person-days
  gap: number; // person-days (negative = surplus, positive = shortage)
  phases: string[];
}

export interface CapacityPlan {
  date: string;
  totalCapacity: number; // person-days
  allocatedCapacity: number; // person-days
  utilization: number; // percentage
  bottlenecks: string[];
}

export interface CostEstimate {
  labor: LaborCost;
  infrastructure: InfrastructureCost;
  tools: ToolCost;
  training: TrainingCost;
  contingency: ContingencyCost;
  total: number;
}

export interface LaborCost {
  developers: number;
  testers: number;
  devops: number;
  projectManagement: number;
  total: number;
}

export interface InfrastructureCost {
  development: number;
  testing: number;
  staging: number;
  monitoring: number;
  total: number;
}

export interface ToolCost {
  licenses: number;
  subscriptions: number;
  oneTime: number;
  total: number;
}

export interface TrainingCost {
  internal: number;
  external: number;
  materials: number;
  total: number;
}

export interface ContingencyCost {
  percentage: number;
  amount: number;
  justification: string;
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  type: DeliverableType;
  dueDate: string;
  owner: string;
  status: DeliverableStatus;
  acceptanceCriteria: string[];
  dependencies: string[];
}

export enum DeliverableType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  TEST_SUITE = 'test_suite',
  DEPLOYMENT = 'deployment',
  TRAINING = 'training',
  REPORT = 'report',
}

export enum DeliverableStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface PhaseResourceRequirement {
  role: string;
  skill: string;
  level: 'junior' | 'mid' | 'senior' | 'expert';
  duration: number; // days
  utilization: number; // percentage
  critical: boolean;
}

export interface TimelineRisk {
  id: string;
  name: string;
  description: string;
  category: RiskCategory;
  probability: number; // 0-1
  impact: RiskImpact;
  severity: 'low' | 'medium' | 'high' | 'critical';
  phases: string[];
  mitigation: RiskMitigation;
  contingency: RiskContingency;
}

export enum RiskCategory {
  SCHEDULE = 'schedule',
  RESOURCE = 'resource',
  TECHNICAL = 'technical',
  EXTERNAL = 'external',
  QUALITY = 'quality',
}

export interface RiskImpact {
  schedule: number; // days delay
  cost: number; // additional cost
  quality: string; // impact description
  scope: string; // scope impact
}

export interface RiskMitigation {
  strategy: string;
  actions: string[];
  owner: string;
  timeline: string;
  cost: number;
  effectiveness: number; // 0-1
}

export interface RiskContingency {
  trigger: string;
  response: string;
  actions: string[];
  resources: string[];
  timeline: string;
}

export interface BufferAllocation {
  type: BufferType;
  phase: string;
  duration: number; // days
  justification: string;
  conditions: string[];
}

export enum BufferType {
  SCHEDULE = 'schedule',
  RESOURCE = 'resource',
  QUALITY = 'quality',
  INTEGRATION = 'integration',
}

export interface CriticalPathAnalysis {
  path: string[];
  duration: number; // days
  slack: CriticalPathSlack[];
  bottlenecks: Bottleneck[];
  optimizations: PathOptimization[];
}

export interface CriticalPathSlack {
  taskId: string;
  totalSlack: number; // days
  freeSlack: number; // days
  critical: boolean;
}

export interface Bottleneck {
  resource: string;
  phases: string[];
  overallocation: number; // percentage
  impact: string;
  solutions: string[];
}

export interface PathOptimization {
  type: 'parallel' | 'fast-track' | 'resource-leveling' | 'scope-reduction';
  description: string;
  impact: number; // days saved
  cost: number;
  risk: string;
}

/**
 * Timeline Planner
 * Creates comprehensive timeline and resource allocation plans
 */
export class TimelinePlanner {
  private baseDate: Date;

  private workingDaysPerWeek: number = 5;

  private hoursPerDay: number = 8;

  constructor(startDate?: Date) {
    this.baseDate = startDate || new Date();
  }

  /**
   * Create comprehensive timeline plan
   */
  createTimelinePlan(
    components: string[],
    priorities: { [component: string]: 'high' | 'medium' | 'low' },
    teamSize: number = 3
  ): TimelinePlan {
    const phases = this.createPhases(components, priorities);
    const tasks = this.createTasks(phases, components);
    const dependencies = this.analyzeDependencies(tasks);
    const resources = this.allocateResources(phases, teamSize);
    const milestones = this.createMilestones(phases);
    const risks = this.identifyRisks(phases);
    const buffers = this.calculateBuffers(phases, risks);
    const criticalPath = this.analyzeCriticalPath(tasks, dependencies);

    const startDate = this.baseDate.toISOString();
    const totalDuration = phases.reduce(
      (sum, phase) => sum + phase.duration,
      0
    );
    const endDate = this.addWorkingDays(
      this.baseDate,
      totalDuration
    ).toISOString();

    return {
      id: `timeline_${Date.now()}`,
      name: 'Frontend Migration Timeline',
      description:
        'Comprehensive timeline for migrating frontend components from mock data to real backend',
      startDate,
      endDate,
      totalDuration,
      phases,
      milestones,
      dependencies,
      resources,
      risks,
      buffers,
      criticalPath,
    };
  }

  /**
   * Create migration phases
   */
  private createPhases(
    components: string[],
    priorities: { [component: string]: 'high' | 'medium' | 'low' }
  ): TimelinePhase[] {
    const highPriorityComponents = components.filter(
      (c) => priorities[c] === 'high'
    );
    const mediumPriorityComponents = components.filter(
      (c) => priorities[c] === 'medium'
    );
    const lowPriorityComponents = components.filter(
      (c) => priorities[c] === 'low'
    );

    const phases: TimelinePhase[] = [];
    let currentDate = new Date(this.baseDate);

    // Phase 1: Infrastructure and High Priority Components
    const phase1Duration = Math.max(10, highPriorityComponents.length * 2);
    const phase1 = this.createPhase(
      'phase-1',
      'Infrastructure Setup and Critical Components',
      'Set up migration infrastructure and migrate critical components',
      currentDate,
      phase1Duration,
      highPriorityComponents,
      'high'
    );
    phases.push(phase1);
    currentDate = this.addWorkingDays(currentDate, phase1Duration);

    // Phase 2: Medium Priority Components
    const phase2Duration = Math.max(8, mediumPriorityComponents.length * 1.5);
    const phase2 = this.createPhase(
      'phase-2',
      'High Impact Components',
      'Migrate high impact components with established patterns',
      currentDate,
      phase2Duration,
      mediumPriorityComponents,
      'medium'
    );
    phase2.dependencies = ['phase-1'];
    phases.push(phase2);
    currentDate = this.addWorkingDays(currentDate, phase2Duration);

    // Phase 3: Low Priority Components and Cleanup
    const phase3Duration = Math.max(5, lowPriorityComponents.length * 1);
    const phase3 = this.createPhase(
      'phase-3',
      'Remaining Components and Cleanup',
      'Complete migration of remaining components and cleanup',
      currentDate,
      phase3Duration,
      lowPriorityComponents,
      'low'
    );
    phase3.dependencies = ['phase-2'];
    phases.push(phase3);

    return phases;
  }

  /**
   * Create individual phase
   */
  private createPhase(
    id: string,
    name: string,
    description: string,
    startDate: Date,
    duration: number,
    components: string[],
    riskLevel: 'low' | 'medium' | 'high'
  ): TimelinePhase {
    const endDate = this.addWorkingDays(startDate, duration);
    const effort = duration * 2; // Assume 2 person-days per day

    return {
      id,
      name,
      description,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration,
      effort,
      tasks: [], // Will be populated by createTasks
      dependencies: [],
      resources: this.createPhaseResourceRequirements(components.length),
      deliverables: this.createPhaseDeliverables(id, components),
      successCriteria: [
        'All components in phase migrated successfully',
        'Tests passing for all migrated components',
        'Performance benchmarks met',
        'No critical issues identified',
      ],
      riskLevel,
      status: PhaseStatus.NOT_STARTED,
    };
  }

  /**
   * Create phase resource requirements
   */
  private createPhaseResourceRequirements(
    componentCount: number
  ): PhaseResourceRequirement[] {
    const baseRequirements: PhaseResourceRequirement[] = [
      {
        role: 'Frontend Developer',
        skill: 'React/TypeScript',
        level: 'senior',
        duration: Math.max(5, componentCount * 1.5),
        utilization: 80,
        critical: true,
      },
      {
        role: 'Backend Developer',
        skill: 'FastAPI/Python',
        level: 'mid',
        duration: Math.max(3, componentCount * 1),
        utilization: 60,
        critical: true,
      },
      {
        role: 'QA Engineer',
        skill: 'Test Automation',
        level: 'mid',
        duration: Math.max(3, componentCount * 0.8),
        utilization: 70,
        critical: false,
      },
    ];

    return baseRequirements;
  }

  /**
   * Create phase deliverables
   */
  private createPhaseDeliverables(
    phaseId: string,
    components: string[]
  ): Deliverable[] {
    return [
      {
        id: `${phaseId}-code`,
        name: 'Migrated Components',
        description: `All components in ${phaseId} migrated from mock data to real API`,
        type: DeliverableType.CODE,
        dueDate: '', // Will be set based on phase end date
        owner: 'Frontend Developer',
        status: DeliverableStatus.NOT_STARTED,
        acceptanceCriteria: [
          'Components render without errors',
          'Data loads from real API',
          'Error handling implemented',
          'Loading states functional',
        ],
        dependencies: [],
      },
      {
        id: `${phaseId}-tests`,
        name: 'Test Suite',
        description: `Comprehensive test suite for migrated components`,
        type: DeliverableType.TEST_SUITE,
        dueDate: '',
        owner: 'QA Engineer',
        status: DeliverableStatus.NOT_STARTED,
        acceptanceCriteria: [
          'Unit tests for all components',
          'Integration tests for API calls',
          'E2E tests for critical workflows',
          'Test coverage > 85%',
        ],
        dependencies: [`${phaseId}-code`],
      },
      {
        id: `${phaseId}-docs`,
        name: 'Documentation',
        description: `Updated documentation for migrated components`,
        type: DeliverableType.DOCUMENTATION,
        dueDate: '',
        owner: 'Frontend Developer',
        status: DeliverableStatus.NOT_STARTED,
        acceptanceCriteria: [
          'Component documentation updated',
          'API integration documented',
          'Migration notes recorded',
          'Troubleshooting guide created',
        ],
        dependencies: [`${phaseId}-code`],
      },
    ];
  }

  /**
   * Create detailed tasks for phases
   */
  private createTasks(
    phases: TimelinePhase[],
    components: string[]
  ): TimelineTask[] {
    const tasks: TimelineTask[] = [];
    let taskCounter = 1;

    for (const phase of phases) {
      const phaseComponents = this.getPhaseComponents(phase.id, components);

      // Infrastructure tasks for first phase
      if (phase.id === 'phase-1') {
        tasks.push(...this.createInfrastructureTasks(phase, taskCounter));
        taskCounter += 3;
      }

      // Component migration tasks
      for (const component of phaseComponents) {
        tasks.push(...this.createComponentTasks(phase, component, taskCounter));
        taskCounter += 4;
      }

      // Phase completion tasks
      tasks.push(...this.createPhaseCompletionTasks(phase, taskCounter));
      taskCounter += 2;
    }

    return tasks;
  }

  /**
   * Get components for specific phase
   */
  private getPhaseComponents(
    phaseId: string,
    allComponents: string[]
  ): string[] {
    // This would be based on the actual component allocation logic
    // For now, distribute evenly
    const componentsPerPhase = Math.ceil(allComponents.length / 3);
    const startIndex =
      phaseId === 'phase-1'
        ? 0
        : phaseId === 'phase-2'
          ? componentsPerPhase
          : componentsPerPhase * 2;
    const endIndex = startIndex + componentsPerPhase;

    return allComponents.slice(startIndex, endIndex);
  }

  /**
   * Create infrastructure setup tasks
   */
  private createInfrastructureTasks(
    phase: TimelinePhase,
    startCounter: number
  ): TimelineTask[] {
    const phaseStart = new Date(phase.startDate);

    return [
      {
        id: `task-${startCounter}`,
        name: 'Set up Database Integration',
        description: 'Configure database connections and seeding for tests',
        startDate: phaseStart.toISOString(),
        endDate: this.addWorkingDays(phaseStart, 2).toISOString(),
        duration: 2,
        effort: 3,
        skills: [
          {
            skill: 'Database Design',
            level: 'mid',
            required: true,
            duration: 2,
          },
          { skill: 'SQLite', level: 'mid', required: true, duration: 2 },
        ],
        dependencies: [],
        components: [],
        priority: TaskPriority.CRITICAL,
        complexity: TaskComplexity.MODERATE,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
      {
        id: `task-${startCounter + 1}`,
        name: 'Create API Endpoints',
        description: 'Implement real API endpoints for migrated components',
        startDate: phaseStart.toISOString(),
        endDate: this.addWorkingDays(phaseStart, 3).toISOString(),
        duration: 3,
        effort: 5,
        skills: [
          { skill: 'FastAPI', level: 'senior', required: true, duration: 3 },
          { skill: 'Python', level: 'senior', required: true, duration: 3 },
        ],
        dependencies: [`task-${startCounter}`],
        components: [],
        priority: TaskPriority.CRITICAL,
        complexity: TaskComplexity.COMPLEX,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
      {
        id: `task-${startCounter + 2}`,
        name: 'Set up Feature Flags',
        description: 'Implement feature flag system for safe rollback',
        startDate: this.addWorkingDays(phaseStart, 1).toISOString(),
        endDate: this.addWorkingDays(phaseStart, 3).toISOString(),
        duration: 2,
        effort: 3,
        skills: [
          {
            skill: 'Frontend Development',
            level: 'mid',
            required: true,
            duration: 2,
          },
          {
            skill: 'Configuration Management',
            level: 'mid',
            required: true,
            duration: 1,
          },
        ],
        dependencies: [],
        components: [],
        priority: TaskPriority.HIGH,
        complexity: TaskComplexity.MODERATE,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
    ];
  }

  /**
   * Create component-specific migration tasks
   */
  private createComponentTasks(
    phase: TimelinePhase,
    component: string,
    startCounter: number
  ): TimelineTask[] {
    const componentName =
      component.split('/').pop()?.replace('.tsx', '') || 'component';
    const phaseStart = new Date(phase.startDate);
    const taskStartDate = this.addWorkingDays(
      phaseStart,
      Math.floor(Math.random() * 3)
    );

    return [
      {
        id: `task-${startCounter}`,
        name: `Analyze ${componentName}`,
        description: `Analyze current mock data usage and plan migration approach`,
        startDate: taskStartDate.toISOString(),
        endDate: this.addWorkingDays(taskStartDate, 1).toISOString(),
        duration: 1,
        effort: 1,
        skills: [
          { skill: 'Code Analysis', level: 'mid', required: true, duration: 1 },
        ],
        dependencies: [],
        components: [component],
        priority: TaskPriority.HIGH,
        complexity: TaskComplexity.SIMPLE,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
      {
        id: `task-${startCounter + 1}`,
        name: `Migrate ${componentName}`,
        description: `Replace mock data with real API integration`,
        startDate: this.addWorkingDays(taskStartDate, 1).toISOString(),
        endDate: this.addWorkingDays(taskStartDate, 3).toISOString(),
        duration: 2,
        effort: 3,
        skills: [
          { skill: 'React', level: 'senior', required: true, duration: 2 },
          { skill: 'TypeScript', level: 'mid', required: true, duration: 2 },
          {
            skill: 'API Integration',
            level: 'mid',
            required: true,
            duration: 1,
          },
        ],
        dependencies: [`task-${startCounter}`],
        components: [component],
        priority: TaskPriority.HIGH,
        complexity: this.getComponentComplexity(component),
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
      {
        id: `task-${startCounter + 2}`,
        name: `Test ${componentName}`,
        description: `Create and run comprehensive tests for migrated component`,
        startDate: this.addWorkingDays(taskStartDate, 2).toISOString(),
        endDate: this.addWorkingDays(taskStartDate, 4).toISOString(),
        duration: 2,
        effort: 2,
        skills: [
          {
            skill: 'Test Automation',
            level: 'mid',
            required: true,
            duration: 2,
          },
          { skill: 'Jest', level: 'mid', required: true, duration: 1 },
          { skill: 'Playwright', level: 'mid', required: false, duration: 1 },
        ],
        dependencies: [`task-${startCounter + 1}`],
        components: [component],
        priority: TaskPriority.MEDIUM,
        complexity: TaskComplexity.MODERATE,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
      {
        id: `task-${startCounter + 3}`,
        name: `Validate ${componentName}`,
        description: `Validate component performance and functionality`,
        startDate: this.addWorkingDays(taskStartDate, 4).toISOString(),
        endDate: this.addWorkingDays(taskStartDate, 5).toISOString(),
        duration: 1,
        effort: 1,
        skills: [
          {
            skill: 'Quality Assurance',
            level: 'mid',
            required: true,
            duration: 1,
          },
        ],
        dependencies: [`task-${startCounter + 2}`],
        components: [component],
        priority: TaskPriority.MEDIUM,
        complexity: TaskComplexity.SIMPLE,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
    ];
  }

  /**
   * Get component complexity based on name/path
   */
  private getComponentComplexity(component: string): TaskComplexity {
    const componentName = component.toLowerCase();

    if (
      componentName.includes('classification') ||
      componentName.includes('predicate')
    ) {
      return TaskComplexity.VERY_COMPLEX;
    }

    if (
      componentName.includes('dashboard') ||
      componentName.includes('agent')
    ) {
      return TaskComplexity.COMPLEX;
    }

    if (
      componentName.includes('project') ||
      componentName.includes('citation')
    ) {
      return TaskComplexity.MODERATE;
    }

    return TaskComplexity.SIMPLE;
  }

  /**
   * Create phase completion tasks
   */
  private createPhaseCompletionTasks(
    phase: TimelinePhase,
    startCounter: number
  ): TimelineTask[] {
    const phaseEnd = new Date(phase.endDate);
    const validationStart = this.addWorkingDays(phaseEnd, -2);

    return [
      {
        id: `task-${startCounter}`,
        name: `${phase.name} Integration Testing`,
        description: `Run integration tests for all components in ${phase.name}`,
        startDate: validationStart.toISOString(),
        endDate: this.addWorkingDays(validationStart, 1).toISOString(),
        duration: 1,
        effort: 2,
        skills: [
          {
            skill: 'Integration Testing',
            level: 'mid',
            required: true,
            duration: 1,
          },
        ],
        dependencies: [], // Will be set to all component tasks in phase
        components: [],
        priority: TaskPriority.HIGH,
        complexity: TaskComplexity.MODERATE,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
      {
        id: `task-${startCounter + 1}`,
        name: `${phase.name} Sign-off`,
        description: `Final validation and sign-off for ${phase.name}`,
        startDate: this.addWorkingDays(validationStart, 1).toISOString(),
        endDate: phaseEnd.toISOString(),
        duration: 1,
        effort: 1,
        skills: [
          {
            skill: 'Project Management',
            level: 'mid',
            required: true,
            duration: 1,
          },
        ],
        dependencies: [`task-${startCounter}`],
        components: [],
        priority: TaskPriority.CRITICAL,
        complexity: TaskComplexity.SIMPLE,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
      },
    ];
  }

  /**
   * Analyze task dependencies
   */
  private analyzeDependencies(tasks: TimelineTask[]): Dependency[] {
    const dependencies: Dependency[] = [];
    let depCounter = 1;

    for (const task of tasks) {
      for (const depTaskId of task.dependencies) {
        dependencies.push({
          id: `dep-${depCounter++}`,
          name: `${depTaskId} -> ${task.id}`,
          type: DependencyType.TASK_TO_TASK,
          from: depTaskId,
          to: task.id,
          relationship: DependencyRelationship.FINISH_TO_START,
          lag: 0,
          critical: task.priority === TaskPriority.CRITICAL,
          description: `${task.name} depends on completion of ${depTaskId}`,
        });
      }
    }

    return dependencies;
  }

  /**
   * Allocate resources across phases
   */
  private allocateResources(
    phases: TimelinePhase[],
    teamSize: number
  ): ResourceAllocation {
    const team = this.createTeam(teamSize);
    const roles = this.analyzeRoleRequirements(phases);
    const skills = this.analyzeSkillRequirements(phases);
    const capacity = this.calculateCapacityPlan(phases, team);
    const costs = this.estimateCosts(phases, team);

    return {
      team,
      roles,
      skills,
      capacity,
      costs,
    };
  }

  /**
   * Create team members
   */
  private createTeam(teamSize: number): TeamMember[] {
    const team: TeamMember[] = [];
    const startDate = this.baseDate.toISOString();
    const endDate = this.addWorkingDays(this.baseDate, 60).toISOString(); // 3 months

    // Create team based on typical roles
    const roles = [
      {
        role: 'Senior Frontend Developer',
        skills: ['React', 'TypeScript', 'Testing'],
        rate: 120,
      },
      {
        role: 'Frontend Developer',
        skills: ['React', 'JavaScript', 'CSS'],
        rate: 90,
      },
      {
        role: 'Backend Developer',
        skills: ['Python', 'FastAPI', 'Database'],
        rate: 100,
      },
      {
        role: 'QA Engineer',
        skills: ['Testing', 'Automation', 'Playwright'],
        rate: 80,
      },
      {
        role: 'DevOps Engineer',
        skills: ['CI/CD', 'Infrastructure', 'Monitoring'],
        rate: 110,
      },
    ];

    for (let i = 0; i < Math.min(teamSize, roles.length); i++) {
      const role = roles[i];
      team.push({
        id: `member-${i + 1}`,
        name: `${role.role} ${i + 1}`,
        role: role.role,
        skills: role.skills,
        availability: 100,
        hourlyRate: role.rate,
        startDate,
        endDate,
      });
    }

    return team;
  }

  /**
   * Analyze role requirements across phases
   */
  private analyzeRoleRequirements(phases: TimelinePhase[]): RoleAllocation[] {
    const roleMap = new Map<string, RoleAllocation>();

    for (const phase of phases) {
      for (const requirement of phase.resources) {
        const existing = roleMap.get(requirement.role) || {
          role: requirement.role,
          required: 0,
          allocated: 0,
          skills: [],
          phases: [],
          utilization: 0,
        };

        existing.required += requirement.duration;
        existing.phases.push(phase.id);
        if (!existing.skills.includes(requirement.skill)) {
          existing.skills.push(requirement.skill);
        }

        roleMap.set(requirement.role, existing);
      }
    }

    return Array.from(roleMap.values());
  }

  /**
   * Analyze skill requirements across phases
   */
  private analyzeSkillRequirements(phases: TimelinePhase[]): SkillAllocation[] {
    const skillMap = new Map<string, SkillAllocation>();

    for (const phase of phases) {
      for (const requirement of phase.resources) {
        const existing = skillMap.get(requirement.skill) || {
          skill: requirement.skill,
          required: 0,
          available: 0,
          gap: 0,
          phases: [],
        };

        existing.required += requirement.duration;
        existing.phases.push(phase.id);

        skillMap.set(requirement.skill, existing);
      }
    }

    // Calculate gaps (simplified)
    for (const allocation of skillMap.values()) {
      allocation.available = allocation.required * 0.8; // Assume 80% availability
      allocation.gap = allocation.required - allocation.available;
    }

    return Array.from(skillMap.values());
  }

  /**
   * Calculate capacity plan
   */
  private calculateCapacityPlan(
    phases: TimelinePhase[],
    team: TeamMember[]
  ): CapacityPlan[] {
    const plan: CapacityPlan[] = [];
    const totalDuration = phases.reduce(
      (sum, phase) => sum + phase.duration,
      0
    );
    const dailyCapacity = team.length * this.hoursPerDay;

    for (let day = 0; day < totalDuration; day++) {
      const date = this.addWorkingDays(this.baseDate, day);
      const allocatedCapacity = dailyCapacity * 0.85; // Assume 85% utilization

      plan.push({
        date: date.toISOString(),
        totalCapacity: dailyCapacity,
        allocatedCapacity,
        utilization: (allocatedCapacity / dailyCapacity) * 100,
        bottlenecks:
          allocatedCapacity > dailyCapacity * 0.9 ? ['High utilization'] : [],
      });
    }

    return plan;
  }

  /**
   * Estimate project costs
   */
  private estimateCosts(
    phases: TimelinePhase[],
    team: TeamMember[]
  ): CostEstimate {
    const totalEffort = phases.reduce((sum, phase) => sum + phase.effort, 0);
    const avgHourlyRate =
      team.reduce((sum, member) => sum + member.hourlyRate, 0) / team.length;

    const labor: LaborCost = {
      developers: totalEffort * 0.6 * avgHourlyRate * this.hoursPerDay,
      testers: totalEffort * 0.2 * avgHourlyRate * this.hoursPerDay,
      devops: totalEffort * 0.1 * avgHourlyRate * this.hoursPerDay,
      projectManagement: totalEffort * 0.1 * avgHourlyRate * this.hoursPerDay,
      total: 0,
    };
    labor.total =
      labor.developers + labor.testers + labor.devops + labor.projectManagement;

    const infrastructure: InfrastructureCost = {
      development: 500,
      testing: 300,
      staging: 200,
      monitoring: 150,
      total: 1150,
    };

    const tools: ToolCost = {
      licenses: 1000,
      subscriptions: 500,
      oneTime: 200,
      total: 1700,
    };

    const training: TrainingCost = {
      internal: 2000,
      external: 1000,
      materials: 300,
      total: 3300,
    };

    const contingency: ContingencyCost = {
      percentage: 20,
      amount:
        (labor.total + infrastructure.total + tools.total + training.total) *
        0.2,
      justification: 'Buffer for unexpected issues and scope changes',
    };

    const total =
      labor.total +
      infrastructure.total +
      tools.total +
      training.total +
      contingency.amount;

    return {
      labor,
      infrastructure,
      tools,
      training,
      contingency,
      total,
    };
  }

  /**
   * Create project milestones
   */
  private createMilestones(phases: TimelinePhase[]): Milestone[] {
    const milestones: Milestone[] = [];
    let milestoneCounter = 1;

    // Project start milestone
    milestones.push({
      id: `milestone-${milestoneCounter++}`,
      name: 'Project Kickoff',
      description: 'Migration project officially starts',
      date: this.baseDate.toISOString(),
      type: MilestoneType.PHASE_START,
      deliverables: [
        'Project plan approved',
        'Team assembled',
        'Infrastructure ready',
      ],
      successCriteria: [
        'All team members onboarded',
        'Development environment set up',
      ],
      dependencies: [],
      stakeholders: ['Development Team', 'Project Manager', 'Product Owner'],
      riskLevel: 'low',
    });

    // Phase milestones
    for (const phase of phases) {
      milestones.push({
        id: `milestone-${milestoneCounter++}`,
        name: `${phase.name} Complete`,
        description: `All deliverables for ${phase.name} completed and validated`,
        date: phase.endDate,
        type: MilestoneType.PHASE_END,
        deliverables: phase.deliverables.map((d) => d.name),
        successCriteria: phase.successCriteria,
        dependencies: [phase.id],
        stakeholders: ['Development Team', 'QA Team', 'Product Owner'],
        riskLevel: phase.riskLevel,
      });
    }

    // Project completion milestone
    const lastPhase = phases[phases.length - 1];
    milestones.push({
      id: `milestone-${milestoneCounter++}`,
      name: 'Migration Complete',
      description: 'All components migrated and system fully operational',
      date: lastPhase.endDate,
      type: MilestoneType.DELIVERABLE,
      deliverables: [
        'All components migrated',
        'Mock data removed',
        'Documentation updated',
        'Performance validated',
      ],
      successCriteria: [
        'Zero critical issues',
        'Performance targets met',
        'User acceptance achieved',
        'Rollback procedures tested',
      ],
      dependencies: phases.map((p) => p.id),
      stakeholders: ['All Teams', 'Executive Sponsor'],
      riskLevel: 'medium',
    });

    return milestones;
  }

  /**
   * Identify project risks
   */
  private identifyRisks(phases: TimelinePhase[]): TimelineRisk[] {
    return [
      {
        id: 'risk-1',
        name: 'Technical Complexity Underestimated',
        description: 'Migration complexity may be higher than estimated',
        category: RiskCategory.TECHNICAL,
        probability: 0.3,
        impact: {
          schedule: 5, // 5 days delay
          cost: 10000,
          quality: 'Potential for bugs and performance issues',
          scope: 'May need to reduce scope or extend timeline',
        },
        severity: 'medium',
        phases: ['phase-1', 'phase-2'],
        mitigation: {
          strategy: 'Thorough analysis and prototyping',
          actions: [
            'Conduct detailed technical analysis',
            'Create proof of concept for complex components',
            'Add buffer time for complex tasks',
          ],
          owner: 'Technical Lead',
          timeline: 'Before phase start',
          cost: 5000,
          effectiveness: 0.7,
        },
        contingency: {
          trigger: 'Tasks taking 50% longer than estimated',
          response: 'Activate contingency plan',
          actions: [
            'Bring in additional senior developer',
            'Reduce scope of non-critical features',
            'Extend timeline with stakeholder approval',
          ],
          resources: ['Senior Developer', 'Project Manager'],
          timeline: 'Within 2 days of trigger',
        },
      },
      {
        id: 'risk-2',
        name: 'Resource Availability',
        description: 'Key team members may become unavailable',
        category: RiskCategory.RESOURCE,
        probability: 0.2,
        impact: {
          schedule: 10, // 10 days delay
          cost: 15000,
          quality: 'Knowledge transfer issues',
          scope: 'May need to adjust deliverables',
        },
        severity: 'high',
        phases: ['phase-1', 'phase-2', 'phase-3'],
        mitigation: {
          strategy: 'Cross-training and documentation',
          actions: [
            'Cross-train team members on critical skills',
            'Document all processes and decisions',
            'Identify backup resources',
          ],
          owner: 'Project Manager',
          timeline: 'Ongoing',
          cost: 3000,
          effectiveness: 0.8,
        },
        contingency: {
          trigger: 'Key team member unavailable for >3 days',
          response: 'Activate backup resources',
          actions: [
            'Bring in backup developer',
            'Redistribute workload',
            'Adjust timeline if necessary',
          ],
          resources: ['Backup Developer', 'Team Lead'],
          timeline: 'Within 1 day of trigger',
        },
      },
    ];
  }

  /**
   * Calculate buffer allocations
   */
  private calculateBuffers(
    phases: TimelinePhase[],
    risks: TimelineRisk[]
  ): BufferAllocation[] {
    const buffers: BufferAllocation[] = [];

    for (const phase of phases) {
      // Schedule buffer based on phase risk level
      const scheduleBufferDays =
        phase.riskLevel === 'high' ? 3 : phase.riskLevel === 'medium' ? 2 : 1;

      buffers.push({
        type: BufferType.SCHEDULE,
        phase: phase.id,
        duration: scheduleBufferDays,
        justification: `Schedule buffer for ${phase.riskLevel} risk phase`,
        conditions: [
          'Tasks taking longer than estimated',
          'Unexpected technical challenges',
          'Resource availability issues',
        ],
      });

      // Quality buffer for testing and validation
      if (phase.id === 'phase-1') {
        buffers.push({
          type: BufferType.QUALITY,
          phase: phase.id,
          duration: 2,
          justification:
            'Additional time for thorough testing of critical components',
          conditions: [
            'Quality issues discovered',
            'Performance problems identified',
            'Integration issues found',
          ],
        });
      }
    }

    return buffers;
  }

  /**
   * Analyze critical path
   */
  private analyzeCriticalPath(
    tasks: TimelineTask[],
    dependencies: Dependency[]
  ): CriticalPathAnalysis {
    // Simplified critical path analysis
    // In a real implementation, this would use proper CPM algorithms

    const criticalTasks = tasks
      .filter((task) => task.priority === TaskPriority.CRITICAL)
      .map((task) => task.id);

    const totalDuration = tasks.reduce((max, task) => {
      const taskEnd = new Date(task.endDate).getTime();
      return Math.max(max, taskEnd);
    }, 0);

    const projectStart = new Date(this.baseDate).getTime();
    const durationDays = Math.ceil(
      (totalDuration - projectStart) / (24 * 60 * 60 * 1000)
    );

    return {
      path: criticalTasks,
      duration: durationDays,
      slack: tasks.map((task) => ({
        taskId: task.id,
        totalSlack: task.priority === TaskPriority.CRITICAL ? 0 : 2,
        freeSlack: task.priority === TaskPriority.CRITICAL ? 0 : 1,
        critical: task.priority === TaskPriority.CRITICAL,
      })),
      bottlenecks: [
        {
          resource: 'Senior Frontend Developer',
          phases: ['phase-1', 'phase-2'],
          overallocation: 110,
          impact: 'May delay critical component migration',
          solutions: [
            'Add additional senior developer',
            'Redistribute some tasks to mid-level developers',
            'Extend timeline for non-critical tasks',
          ],
        },
      ],
      optimizations: [
        {
          type: 'parallel',
          description: 'Run some component migrations in parallel',
          impact: 3, // 3 days saved
          cost: 5000,
          risk: 'Increased coordination complexity',
        },
        {
          type: 'fast-track',
          description:
            'Fast-track critical components with additional resources',
          impact: 5, // 5 days saved
          cost: 10000,
          risk: 'Higher cost and resource pressure',
        },
      ],
    };
  }

  /**
   * Add working days to a date (excluding weekends)
   */
  private addWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);

      // Skip weekends (Saturday = 6, Sunday = 0)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }

    return result;
  }
}

/**
 * Export utility function for creating timeline plan
 */
export function createMigrationTimeline(
  components: string[],
  priorities: { [component: string]: 'high' | 'medium' | 'low' },
  options?: {
    startDate?: Date;
    teamSize?: number;
    workingDaysPerWeek?: number;
  }
): TimelinePlan {
  const planner = new TimelinePlanner(options?.startDate);
  return planner.createTimelinePlan(components, priorities, options?.teamSize);
}
