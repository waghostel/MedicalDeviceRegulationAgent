#!/usr/bin/env python3
"""
Backend Quality Check System

Comprehensive quality validation system for Python backend code that includes:
- Code quality analysis (Black, isort, flake8, mypy)
- Test coverage analysis
- Performance metrics
- Security vulnerability scanning
- Anti-pattern detection
- Dependency analysis
"""

import asyncio
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import ast
import importlib.util


@dataclass
class QualityIssue:
    """Represents a quality issue found during analysis"""
    type: str
    severity: str  # 'error', 'warning', 'info'
    message: str
    details: str = ""
    file: str = ""
    line: int = 0


@dataclass
class QualityResult:
    """Represents the result of a quality check"""
    passed: bool
    score: float = 0.0
    issues: List[QualityIssue] = None
    metrics: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.issues is None:
            self.issues = []
        if self.metrics is None:
            self.metrics = {}


class BackendQualityChecker:
    """Comprehensive quality checker for Python backend code"""
    
    # Quality thresholds
    THRESHOLDS = {
        'coverage': {
            'statements': 85,
            'branches': 80,
            'functions': 85,
            'lines': 85
        },
        'performance': {
            'max_test_execution_time': 30.0,  # seconds
            'max_memory_usage': 100,  # MB
            'max_complexity': 10,
            'max_lines_per_function': 50
        },
        'code_quality': {
            'max_line_length': 88,
            'max_function_parameters': 5,
            'max_nesting_depth': 4
        }
    }
    
    # Anti-patterns to detect
    ANTI_PATTERNS = [
        {
            'name': 'Print statements in production code',
            'pattern': r'\bprint\s*\(',
            'severity': 'warning',
            'exclude_files': ['test_*.py', '*_test.py', 'conftest.py']
        },
        {
            'name': 'TODO comments',
            'pattern': r'#\s*TODO',
            'severity': 'info',
            'exclude_files': []
        },
        {
            'name': 'FIXME comments',
            'pattern': r'#\s*FIXME',
            'severity': 'warning',
            'exclude_files': []
        },
        {
            'name': 'Hardcoded credentials',
            'pattern': r'(password|secret|key|token)\s*=\s*["\'][^"\']+["\']',
            'severity': 'error',
            'exclude_files': ['test_*.py', '*_test.py', 'mock_*.py']
        },
        {
            'name': 'Bare except clauses',
            'pattern': r'except\s*:',
            'severity': 'warning',
            'exclude_files': []
        },
        {
            'name': 'Missing docstrings in public functions',
            'pattern': r'def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*:\s*(?!""")',
            'severity': 'info',
            'exclude_files': ['test_*.py', '*_test.py']
        }
    ]

    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.backend_root = self.project_root / "backend"
        self.results = {
            'code_quality': QualityResult(False),
            'test_coverage': QualityResult(False),
            'performance': QualityResult(False),
            'anti_patterns': QualityResult(False),
            'security': QualityResult(False),
            'dependencies': QualityResult(False)
        }
        self.start_time = time.time()

    async def run_command(self, command: str, cwd: Optional[Path] = None, 
                         capture_output: bool = True) -> Tuple[bool, str]:
        """Run a shell command and return success status and output"""
        try:
            if cwd is None:
                cwd = self.backend_root
                
            process = await asyncio.create_subprocess_shell(
                command,
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE if capture_output else None,
                stderr=asyncio.subprocess.PIPE if capture_output else None
            )
            
            stdout, stderr = await process.communicate()
            
            output = ""
            if stdout:
                output += stdout.decode()
            if stderr:
                output += stderr.decode()
                
            return process.returncode == 0, output.strip()
            
        except Exception as e:
            return False, str(e)

    async def check_code_quality(self) -> bool:
        """Check code quality using Black, isort, flake8, and mypy"""
        print("🔍 Checking code quality...")
        issues = []
        score = 100.0

        # Black formatting check
        print("  Running Black formatting check...")
        success, output = await self.run_command("poetry run black --check .")
        if not success:
            issues.append(QualityIssue(
                type='formatting',
                severity='warning',
                message='Code formatting issues found',
                details='Run `poetry run black .` to fix formatting'
            ))
            score -= 10

        # isort import sorting check
        print("  Running isort import sorting check...")
        success, output = await self.run_command("poetry run isort --check-only .")
        if not success:
            issues.append(QualityIssue(
                type='import_sorting',
                severity='warning',
                message='Import sorting issues found',
                details='Run `poetry run isort .` to fix import sorting'
            ))
            score -= 5

        # Flake8 linting
        print("  Running Flake8 linting...")
        success, output = await self.run_command("poetry run flake8 .")
        if not success:
            flake8_issues = self._parse_flake8_output(output)
            issues.extend(flake8_issues)
            score -= min(30, len(flake8_issues) * 2)

        # MyPy type checking
        print("  Running MyPy type checking...")
        success, output = await self.run_command("poetry run mypy .")
        if not success:
            mypy_issues = self._parse_mypy_output(output)
            issues.extend(mypy_issues)
            score -= min(25, len(mypy_issues) * 3)

        # Code complexity analysis
        await self._analyze_code_complexity(issues)

        self.results['code_quality'] = QualityResult(
            passed=score >= 80,
            score=max(0, score),
            issues=issues
        )

        print(f"  Code Quality Score: {score:.1f}/100")
        return self.results['code_quality'].passed

    async def analyze_test_coverage(self) -> bool:
        """Analyze test coverage using pytest-cov"""
        print("📊 Analyzing test coverage...")
        issues = []

        # Run tests with coverage
        success, output = await self.run_command(
            "poetry run python -m pytest tests/ --cov=backend --cov-report=json --cov-report=html -q"
        )

        if not success:
            issues.append(QualityIssue(
                type='test_execution',
                severity='error',
                message='Test execution failed',
                details=output
            ))
            self.results['test_coverage'] = QualityResult(False, issues=issues)
            return False

        # Parse coverage report
        coverage_file = self.backend_root / "coverage.json"
        if coverage_file.exists():
            try:
                with open(coverage_file) as f:
                    coverage_data = json.load(f)
                
                total_coverage = coverage_data.get('totals', {})
                coverage_metrics = {
                    'statements': total_coverage.get('percent_covered', 0),
                    'lines': total_coverage.get('percent_covered', 0),
                    'branches': total_coverage.get('percent_covered', 0),
                    'functions': total_coverage.get('percent_covered', 0)
                }

                # Check coverage thresholds
                for metric, threshold in self.THRESHOLDS['coverage'].items():
                    if coverage_metrics.get(metric, 0) < threshold:
                        issues.append(QualityIssue(
                            type=f'coverage_{metric}',
                            severity='warning',
                            message=f'{metric.title()} coverage below threshold',
                            details=f'{coverage_metrics[metric]:.1f}% < {threshold}%'
                        ))

                self.results['test_coverage'] = QualityResult(
                    passed=len([i for i in issues if i.severity == 'error']) == 0,
                    metrics=coverage_metrics,
                    issues=issues
                )

                print(f"  Coverage: {coverage_metrics['statements']:.1f}%")
                return self.results['test_coverage'].passed

            except Exception as e:
                issues.append(QualityIssue(
                    type='coverage_parsing',
                    severity='error',
                    message='Failed to parse coverage report',
                    details=str(e)
                ))

        self.results['test_coverage'] = QualityResult(False, issues=issues)
        return False

    async def detect_anti_patterns(self) -> bool:
        """Detect anti-patterns and common code issues"""
        print("🔍 Detecting anti-patterns...")
        detected_patterns = []
        issues = []

        for anti_pattern in self.ANTI_PATTERNS:
            print(f"  Checking for: {anti_pattern['name']}...")
            
            matches = await self._find_pattern_in_files(anti_pattern)
            
            if matches:
                detected_patterns.append({
                    'name': anti_pattern['name'],
                    'severity': anti_pattern['severity'],
                    'matches': len(matches),
                    'files': matches
                })

                issues.append(QualityIssue(
                    type='anti_pattern',
                    severity=anti_pattern['severity'],
                    message=f"{anti_pattern['name']} detected",
                    details=f"Found {len(matches)} occurrences"
                ))

        passed = len([i for i in issues if i.severity == 'error']) == 0

        self.results['anti_patterns'] = QualityResult(
            passed=passed,
            metrics={'patterns': detected_patterns},
            issues=issues
        )

        return passed

    async def check_performance_metrics(self) -> bool:
        """Check performance metrics"""
        print("⚡ Checking performance metrics...")
        metrics = {}
        issues = []

        # Test execution time
        start_time = time.time()
        success, output = await self.run_command(
            "poetry run python -m pytest tests/ -q --tb=no"
        )
        execution_time = time.time() - start_time
        
        metrics['test_execution_time'] = execution_time

        if execution_time > self.THRESHOLDS['performance']['max_test_execution_time']:
            issues.append(QualityIssue(
                type='performance_test_time',
                severity='warning',
                message='Test execution time exceeds threshold',
                details=f'{execution_time:.1f}s > {self.THRESHOLDS["performance"]["max_test_execution_time"]}s'
            ))

        # Memory usage analysis
        await self._analyze_memory_usage(metrics, issues)

        # Code complexity metrics
        await self._analyze_performance_complexity(metrics, issues)

        passed = len([i for i in issues if i.severity == 'error']) == 0

        self.results['performance'] = QualityResult(
            passed=passed,
            metrics=metrics,
            issues=issues
        )

        print(f"  Test execution time: {execution_time:.1f}s")
        return passed

    async def check_security(self) -> bool:
        """Check for security vulnerabilities"""
        print("🔒 Checking security vulnerabilities...")
        vulnerabilities = []
        issues = []

        # Check for safety (Python security linter)
        try:
            success, output = await self.run_command("poetry run safety check --json")
            
            if not success:
                try:
                    safety_data = json.loads(output)
                    for vuln in safety_data:
                        vulnerabilities.append({
                            'package': vuln.get('package', 'unknown'),
                            'severity': vuln.get('severity', 'unknown'),
                            'title': vuln.get('advisory', 'Unknown vulnerability'),
                            'id': vuln.get('id', '')
                        })
                except json.JSONDecodeError:
                    # Safety output might not be JSON
                    if 'vulnerabilities found' in output.lower():
                        issues.append(QualityIssue(
                            type='security_vulnerabilities',
                            severity='warning',
                            message='Security vulnerabilities found',
                            details=output
                        ))

        except Exception as e:
            print(f"  Safety check skipped: {e}")

        # Check for hardcoded secrets
        await self._check_hardcoded_secrets(issues)

        passed = len([v for v in vulnerabilities if v['severity'] in ['high', 'critical']]) == 0

        self.results['security'] = QualityResult(
            passed=passed,
            metrics={'vulnerabilities': vulnerabilities},
            issues=issues
        )

        return passed

    async def check_dependencies(self) -> bool:
        """Check dependency status"""
        print("📦 Checking dependencies...")
        outdated = []
        issues = []

        # Check for outdated packages
        success, output = await self.run_command("poetry show --outdated")
        
        if success and output:
            lines = output.split('\n')
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 3:
                        outdated.append({
                            'package': parts[0],
                            'current': parts[1],
                            'latest': parts[2] if len(parts) > 2 else 'unknown'
                        })

        # Check for critical outdated packages
        critical_outdated = [
            dep for dep in outdated 
            if self._is_version_significantly_outdated(dep.get('current', ''), dep.get('latest', ''))
        ]

        if critical_outdated:
            issues.append(QualityIssue(
                type='dependencies_outdated',
                severity='warning',
                message=f'{len(critical_outdated)} dependencies are significantly outdated',
                details=', '.join([f"{d['package']}: {d['current']} -> {d['latest']}" for d in critical_outdated])
            ))

        self.results['dependencies'] = QualityResult(
            passed=len([i for i in issues if i.severity == 'error']) == 0,
            metrics={'outdated': outdated},
            issues=issues
        )

        return self.results['dependencies'].passed

    async def _find_pattern_in_files(self, anti_pattern: Dict) -> List[Dict]:
        """Find pattern occurrences in Python files"""
        matches = []
        pattern = re.compile(anti_pattern['pattern'], re.IGNORECASE)
        
        for py_file in self.backend_root.rglob("*.py"):
            # Skip excluded files
            if any(py_file.match(exclude) for exclude in anti_pattern.get('exclude_files', [])):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                file_matches = []
                for line_num, line in enumerate(content.split('\n'), 1):
                    if pattern.search(line):
                        file_matches.append(line_num)
                
                if file_matches:
                    matches.append({
                        'file': str(py_file.relative_to(self.backend_root)),
                        'matches': len(file_matches),
                        'lines': file_matches
                    })
                    
            except Exception:
                continue
                
        return matches

    async def _analyze_code_complexity(self, issues: List[QualityIssue]):
        """Analyze code complexity metrics"""
        for py_file in self.backend_root.rglob("*.py"):
            if py_file.name.startswith('test_') or py_file.name.endswith('_test.py'):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        # Check function length
                        func_lines = node.end_lineno - node.lineno + 1
                        if func_lines > self.THRESHOLDS['code_quality']['max_lines_per_function']:
                            issues.append(QualityIssue(
                                type='function_length',
                                severity='warning',
                                message=f'Function {node.name} is too long',
                                details=f'{func_lines} lines > {self.THRESHOLDS["code_quality"]["max_lines_per_function"]}',
                                file=str(py_file.relative_to(self.backend_root)),
                                line=node.lineno
                            ))
                        
                        # Check parameter count
                        param_count = len(node.args.args)
                        if param_count > self.THRESHOLDS['code_quality']['max_function_parameters']:
                            issues.append(QualityIssue(
                                type='parameter_count',
                                severity='warning',
                                message=f'Function {node.name} has too many parameters',
                                details=f'{param_count} parameters > {self.THRESHOLDS["code_quality"]["max_function_parameters"]}',
                                file=str(py_file.relative_to(self.backend_root)),
                                line=node.lineno
                            ))
                            
            except Exception:
                continue

    async def _analyze_memory_usage(self, metrics: Dict, issues: List[QualityIssue]):
        """Analyze memory usage during tests"""
        try:
            import psutil
            process = psutil.Process()
            
            # Get initial memory
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Run tests
            await self.run_command("poetry run python -m pytest tests/ -q --tb=no")
            
            # Get final memory
            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_diff = final_memory - initial_memory
            
            metrics['memory_usage'] = memory_diff
            
            if memory_diff > self.THRESHOLDS['performance']['max_memory_usage']:
                issues.append(QualityIssue(
                    type='memory_usage',
                    severity='warning',
                    message='Memory usage exceeds threshold',
                    details=f'{memory_diff:.1f}MB > {self.THRESHOLDS["performance"]["max_memory_usage"]}MB'
                ))
                
        except ImportError:
            print("  psutil not available, skipping memory analysis")
        except Exception as e:
            print(f"  Memory analysis failed: {e}")

    async def _analyze_performance_complexity(self, metrics: Dict, issues: List[QualityIssue]):
        """Analyze performance-related complexity metrics"""
        total_complexity = 0
        function_count = 0
        
        for py_file in self.backend_root.rglob("*.py"):
            if py_file.name.startswith('test_'):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        complexity = self._calculate_cyclomatic_complexity(node)
                        total_complexity += complexity
                        function_count += 1
                        
                        if complexity > self.THRESHOLDS['performance']['max_complexity']:
                            issues.append(QualityIssue(
                                type='cyclomatic_complexity',
                                severity='warning',
                                message=f'Function {node.name} has high complexity',
                                details=f'Complexity: {complexity} > {self.THRESHOLDS["performance"]["max_complexity"]}',
                                file=str(py_file.relative_to(self.backend_root)),
                                line=node.lineno
                            ))
                            
            except Exception:
                continue
        
        if function_count > 0:
            metrics['average_complexity'] = total_complexity / function_count

    def _calculate_cyclomatic_complexity(self, node: ast.FunctionDef) -> int:
        """Calculate cyclomatic complexity of a function"""
        complexity = 1  # Base complexity
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
                
        return complexity

    async def _check_hardcoded_secrets(self, issues: List[QualityIssue]):
        """Check for hardcoded secrets and credentials"""
        secret_patterns = [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']',
            r'token\s*=\s*["\'][^"\']+["\']',
        ]
        
        for py_file in self.backend_root.rglob("*.py"):
            if py_file.name.startswith('test_') or 'mock' in py_file.name:
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                for pattern in secret_patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        line_num = content[:match.start()].count('\n') + 1
                        issues.append(QualityIssue(
                            type='hardcoded_secret',
                            severity='error',
                            message='Potential hardcoded secret found',
                            details=f'Pattern: {pattern}',
                            file=str(py_file.relative_to(self.backend_root)),
                            line=line_num
                        ))
                        
            except Exception:
                continue

    def _parse_flake8_output(self, output: str) -> List[QualityIssue]:
        """Parse flake8 output into quality issues"""
        issues = []
        lines = output.split('\n')
        
        for line in lines:
            if ':' in line and any(code in line for code in ['E', 'W', 'F']):
                parts = line.split(':', 3)
                if len(parts) >= 4:
                    file_path = parts[0]
                    line_num = int(parts[1]) if parts[1].isdigit() else 0
                    message = parts[3].strip()
                    
                    severity = 'error' if message.startswith('E') else 'warning'
                    
                    issues.append(QualityIssue(
                        type='flake8',
                        severity=severity,
                        message=message,
                        file=file_path,
                        line=line_num
                    ))
                    
        return issues

    def _parse_mypy_output(self, output: str) -> List[QualityIssue]:
        """Parse mypy output into quality issues"""
        issues = []
        lines = output.split('\n')
        
        for line in lines:
            if ':' in line and ('error:' in line or 'warning:' in line):
                parts = line.split(':', 3)
                if len(parts) >= 4:
                    file_path = parts[0]
                    line_num = int(parts[1]) if parts[1].isdigit() else 0
                    message = parts[3].strip()
                    
                    severity = 'error' if 'error:' in line else 'warning'
                    
                    issues.append(QualityIssue(
                        type='mypy',
                        severity=severity,
                        message=message,
                        file=file_path,
                        line=line_num
                    ))
                    
        return issues

    def _is_version_significantly_outdated(self, current: str, latest: str) -> bool:
        """Check if version is significantly outdated"""
        try:
            current_parts = [int(x) for x in current.split('.') if x.isdigit()]
            latest_parts = [int(x) for x in latest.split('.') if x.isdigit()]
            
            if len(current_parts) >= 2 and len(latest_parts) >= 2:
                # Major version difference
                if latest_parts[0] > current_parts[0]:
                    return True
                    
                # Minor version difference > 5
                if (latest_parts[0] == current_parts[0] and 
                    latest_parts[1] - current_parts[1] > 5):
                    return True
                    
        except (ValueError, IndexError):
            pass
            
        return False

    def calculate_overall_score(self) -> float:
        """Calculate overall quality score"""
        weights = {
            'code_quality': 0.3,
            'test_coverage': 0.25,
            'performance': 0.2,
            'anti_patterns': 0.15,
            'security': 0.1
        }

        total_score = 0.0
        total_weight = 0.0

        for check, weight in weights.items():
            if check in self.results:
                result = self.results[check]
                score = 100.0 if result.passed else result.score
                total_score += score * weight
                total_weight += weight

        return total_score / total_weight if total_weight > 0 else 0.0

    def generate_quality_report(self) -> Dict[str, Any]:
        """Generate comprehensive quality report"""
        duration = time.time() - self.start_time
        overall_score = self.calculate_overall_score()
        
        # Count issues by severity
        all_issues = []
        for result in self.results.values():
            all_issues.extend(result.issues)
            
        critical_issues = [i for i in all_issues if i.severity == 'error']
        warnings = [i for i in all_issues if i.severity == 'warning']
        
        report = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'duration': duration,
            'summary': {
                'overall_score': overall_score,
                'passed_checks': sum(1 for r in self.results.values() if r.passed),
                'total_checks': len(self.results),
                'critical_issues': len(critical_issues),
                'warnings': len(warnings)
            },
            'results': {
                name: {
                    'passed': result.passed,
                    'score': result.score,
                    'metrics': result.metrics,
                    'issues': [asdict(issue) for issue in result.issues]
                }
                for name, result in self.results.items()
            },
            'recommendations': self._generate_recommendations()
        }
        
        return report

    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on results"""
        recommendations = []
        
        if not self.results['code_quality'].passed:
            recommendations.append('Fix code quality issues by running Black, isort, flake8, and mypy')
            recommendations.append('Consider refactoring complex functions to improve maintainability')
            
        if not self.results['test_coverage'].passed:
            recommendations.append('Increase test coverage by adding more unit and integration tests')
            recommendations.append('Focus on testing critical business logic and error paths')
            
        if not self.results['performance'].passed:
            recommendations.append('Optimize test execution time and memory usage')
            recommendations.append('Consider reducing cyclomatic complexity of functions')
            
        if not self.results['anti_patterns'].passed:
            recommendations.append('Remove print statements and address TODO/FIXME comments')
            recommendations.append('Add proper error handling and docstrings')
            
        if not self.results['security'].passed:
            recommendations.append('Update dependencies with security vulnerabilities')
            recommendations.append('Remove hardcoded secrets and use environment variables')
            
        return recommendations

    def print_quality_summary(self) -> bool:
        """Print quality summary to console"""
        report = self.generate_quality_report()
        
        print("\n" + "=" * 70)
        print("BACKEND QUALITY CHECK SYSTEM - SUMMARY REPORT")
        print("=" * 70)
        
        overall_score = report['summary']['overall_score']
        print(f"\nOverall Quality Score: {overall_score:.1f}/100")
        print(f"Checks Passed: {report['summary']['passed_checks']}/{report['summary']['total_checks']}")
        print(f"Critical Issues: {report['summary']['critical_issues']}")
        print(f"Warnings: {report['summary']['warnings']}")
        print(f"Duration: {report['duration']:.1f}s")

        # Detailed results
        print("\n📊 Detailed Results:")
        print("┌─────────────────────┬─────────┬───────┬─────────────┐")
        print("│ Check               │ Status  │ Score │ Issues      │")
        print("├─────────────────────┼─────────┼───────┼─────────────┤")
        
        for check_name, result_data in report['results'].items():
            display_name = check_name.replace('_', ' ').title()
            status = '✅ PASS' if result_data['passed'] else '❌ FAIL'
            score = f"{result_data['score']:.0f}/100" if result_data['score'] else 'N/A'
            issues = len(result_data['issues'])
            
            print(f"│ {display_name:<19} │ {status:<7} │ {score:<5} │ {issues:<11} │")
        
        print("└─────────────────────┴─────────┴───────┴─────────────┘")

        # Recommendations
        if report['recommendations']:
            print("\n🔧 Recommendations:")
            for i, rec in enumerate(report['recommendations'], 1):
                print(f"{i}. {rec}")

        # Save report
        report_path = self.backend_root / "quality-report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Detailed report saved to: {report_path}")

        return overall_score >= 70

    async def run_quality_checks(self) -> bool:
        """Run comprehensive quality checks"""
        print("🔍 Backend Quality Check System - Medical Device Regulatory Assistant")
        print("=" * 70)
        
        try:
            await self.check_code_quality()
            await self.analyze_test_coverage()
            await self.detect_anti_patterns()
            await self.check_performance_metrics()
            await self.check_security()
            await self.check_dependencies()
            
            passed = self.print_quality_summary()
            
            if passed:
                print("\n🎉 Quality checks passed! Backend code is ready for production.")
                return True
            else:
                print("\n❌ Quality checks failed. Please address the issues above.")
                return False
                
        except Exception as e:
            print(f"\n💥 Quality check system failed: {e}")
            return False


async def main():
    """Main entry point"""
    checker = BackendQualityChecker()
    success = await checker.run_quality_checks()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())