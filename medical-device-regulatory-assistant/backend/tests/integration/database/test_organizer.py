#!/usr/bin/env python3
"""
Test File Organizer for Medical Device Regulatory Assistant Backend

This script analyzes and reorganizes test files to improve maintainability
and reduce redundancy in the test suite.
"""

import ast
import re
import os
import shutil
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass
from collections import defaultdict
import json


@dataclass
class TestFileInfo:
    path: Path
    category: str  # unit, integration, performance, fixtures, obsolete
    functionality: str  # database, api, services, auth, health, etc.
    dependencies: Set[str]
    test_count: int
    is_duplicate: bool
    duplicate_of: Optional[str] = None
    file_size: int = 0
    last_modified: float = 0


class TestFileOrganizer:
    """Organizes and consolidates test files"""

    def __init__(self, test_root: Path):
        self.test_root = test_root
        self.file_info: Dict[str, TestFileInfo] = {}
        self.target_structure = {
            "unit": ["models", "services", "utils", "core", "tools"],
            "integration": ["api", "database", "services", "auth", "health", "agents"],
            "fixtures": ["database", "auth", "services", "mock_data"],
            "utils": ["test_data_factory", "mock_services", "performance_monitor"],
            "performance": ["load_testing", "optimization", "monitoring"]
        }
        
        # Patterns for identifying test types
        self.integration_patterns = [
            'integration', 'api', 'endpoint', 'fastapi', 'client', 'complete',
            'full', 'e2e', 'end_to_end', 'workflow'
        ]
        
        self.performance_patterns = [
            'performance', 'load', 'benchmark', 'optimization', 'speed',
            'timing', 'monitor'
        ]
        
        self.fixture_patterns = [
            'fixture', 'factory', 'mock', 'conftest', 'setup', 'data_factory'
        ]
        
        # Functionality patterns
        self.functionality_patterns = {
            'database': ['database', 'db', 'connection', 'migration', 'schema', 'sql'],
            'api': ['api', 'endpoint', 'route', 'fastapi', 'client', 'http'],
            'auth': ['auth', 'authentication', 'login', 'token', 'jwt', 'oauth'],
            'health': ['health', 'check', 'monitor', 'status', 'ping'],
            'services': ['service', 'business', 'logic', 'manager'],
            'models': ['model', 'schema', 'validation', 'pydantic'],
            'tools': ['tool', 'agent', 'fda', 'document', 'classification'],
            'core': ['core', 'exception', 'error', 'config', 'middleware'],
            'audit': ['audit', 'log', 'tracking', 'trace'],
            'export': ['export', 'report', 'output'],
            'startup': ['startup', 'lifespan', 'initialization'],
            'redis': ['redis', 'cache', 'session']
        }

    def audit_test_files(self) -> Dict[str, List[TestFileInfo]]:
        """Audit all test files and categorize them"""
        test_files = list(self.test_root.rglob("test_*.py"))
        categorized = {
            "unit": [], "integration": [], "performance": [], 
            "fixtures": [], "obsolete": [], "duplicates": []
        }

        print(f"Found {len(test_files)} test files to analyze...")

        for file_path in test_files:
            try:
                info = self._analyze_test_file(file_path)
                self.file_info[str(file_path)] = info
                
                if info.is_duplicate:
                    categorized["duplicates"].append(info)
                else:
                    categorized[info.category].append(info)
                    
            except Exception as e:
                print(f"Error analyzing {file_path}: {e}")
                continue

        # Identify duplicates after all files are analyzed
        self._identify_duplicates()
        
        return categorized

    def _analyze_test_file(self, file_path: Path) -> TestFileInfo:
        """Analyze a single test file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Could not read {file_path}: {e}")
            content = ""

        # Get file stats
        stat = file_path.stat()
        file_size = stat.st_size
        last_modified = stat.st_mtime

        # Parse AST to count tests and analyze imports
        test_count = 0
        dependencies = set()
        
        try:
            tree = ast.parse(content)
            test_count = len([node for node in ast.walk(tree)
                            if isinstance(node, ast.FunctionDef) and node.name.startswith('test_')])

            # Analyze imports to determine dependencies
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        dependencies.add(alias.name.split('.')[0])
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        dependencies.add(node.module.split('.')[0])
        except SyntaxError:
            # Fallback to regex if AST parsing fails
            test_count = len(re.findall(r'def test_\w+', content))
            # Simple import extraction
            import_matches = re.findall(r'(?:from|import)\s+(\w+)', content)
            dependencies.update(import_matches)

        # Categorize based on file name and content
        category = self._categorize_test_file(file_path, content, dependencies)
        functionality = self._determine_functionality(file_path, content)

        return TestFileInfo(
            path=file_path,
            category=category,
            functionality=functionality,
            dependencies=dependencies,
            test_count=test_count,
            is_duplicate=False,  # Will be determined later
            file_size=file_size,
            last_modified=last_modified
        )

    def _categorize_test_file(self, file_path: Path, content: str, dependencies: Set[str]) -> str:
        """Categorize test file based on content and dependencies"""
        file_name = file_path.name.lower()
        content_lower = content.lower()

        # Performance tests
        if any(pattern in file_name for pattern in self.performance_patterns):
            return "performance"

        # Fixture files
        if any(pattern in file_name for pattern in self.fixture_patterns):
            return "fixtures"

        # Integration tests (multiple services, database + API, etc.)
        if (any(pattern in file_name for pattern in self.integration_patterns) or
            'fastapi' in dependencies or
            'testclient' in content_lower or
            ('database' in content_lower and 'api' in content_lower) or
            'integration' in file_name):
            return "integration"

        # Unit tests (single component) - default
        return "unit"

    def _determine_functionality(self, file_path: Path, content: str) -> str:
        """Determine functionality based on file name and content"""
        file_name = file_path.name.lower()
        content_lower = content.lower()

        # Check each functionality pattern
        for functionality, patterns in self.functionality_patterns.items():
            if any(pattern in file_name for pattern in patterns):
                return functionality
            # Also check content for some key patterns
            if functionality in ['database', 'api', 'auth'] and any(pattern in content_lower for pattern in patterns):
                return functionality

        return "general"

    def _identify_duplicates(self) -> None:
        """Identify duplicate or overlapping test files"""
        # Group files by functionality and category
        groups = defaultdict(list)
        
        for file_path, info in self.file_info.items():
            if not info.is_duplicate:  # Don't group already marked duplicates
                key = (info.category, info.functionality)
                groups[key].append((file_path, info))

        # Within each group, look for duplicates
        for group_key, files in groups.items():
            if len(files) <= 1:
                continue
                
            # Sort by file size and modification time (larger, newer files preferred)
            files.sort(key=lambda x: (x[1].file_size, x[1].last_modified), reverse=True)
            
            # Check for similar names or overlapping functionality
            for i, (file_path1, info1) in enumerate(files):
                for j, (file_path2, info2) in enumerate(files[i+1:], i+1):
                    if self._are_duplicates(info1, info2):
                        # Mark the smaller/older file as duplicate
                        info2.is_duplicate = True
                        info2.duplicate_of = file_path1
                        print(f"Identified duplicate: {info2.path.name} -> {info1.path.name}")

    def _are_duplicates(self, info1: TestFileInfo, info2: TestFileInfo) -> bool:
        """Check if two test files are duplicates"""
        name1 = info1.path.stem.lower()
        name2 = info2.path.stem.lower()
        
        # Check for similar names
        similarity_patterns = [
            ('simple', 'basic'),
            ('enhanced', 'advanced'),
            ('complete', 'full'),
            ('integration', 'complete'),
            ('mock', 'simple')
        ]
        
        # Remove common suffixes/prefixes for comparison
        clean_name1 = re.sub(r'_(simple|basic|enhanced|advanced|complete|full|mock|integration)$', '', name1)
        clean_name2 = re.sub(r'_(simple|basic|enhanced|advanced|complete|full|mock|integration)$', '', name2)
        
        # If base names are the same, they're likely duplicates
        if clean_name1 == clean_name2:
            return True
            
        # Check for very similar functionality and low test count in one file
        if (info1.functionality == info2.functionality and 
            (info1.test_count < 3 or info2.test_count < 3)):
            return True
            
        return False

    def create_organization_plan(self) -> Dict[str, str]:
        """Create plan for reorganizing test files"""
        plan = {}
        
        # Create target directories
        for category, subcategories in self.target_structure.items():
            category_path = self.test_root / "tests" / category
            plan[f"CREATE_DIR:{category_path}"] = "CREATE_DIRECTORY"
            
            for subcategory in subcategories:
                subcat_path = category_path / subcategory
                plan[f"CREATE_DIR:{subcat_path}"] = "CREATE_DIRECTORY"

        # Plan file moves and deletions
        for file_path, info in self.file_info.items():
            if info.is_duplicate:
                plan[file_path] = "DELETE"
            else:
                new_path = self._determine_new_path(info)
                if new_path != file_path:
                    plan[file_path] = new_path

        return plan

    def _determine_new_path(self, info: TestFileInfo) -> str:
        """Determine new path for a test file"""
        # Base path for organized tests
        base_path = self.test_root / "tests" / info.category
        
        # Add functionality subdirectory if it exists in target structure
        if info.functionality in self.target_structure.get(info.category, []):
            base_path = base_path / info.functionality
        elif info.functionality != "general":
            # Create a subdirectory for the functionality
            base_path = base_path / info.functionality

        return str(base_path / info.path.name)

    def execute_reorganization(self, plan: Dict[str, str], dry_run: bool = True) -> None:
        """Execute the reorganization plan"""
        print(f"\n{'DRY RUN: ' if dry_run else ''}Executing reorganization plan...")
        
        # Create directories first
        for key, action in plan.items():
            if key.startswith("CREATE_DIR:") and action == "CREATE_DIRECTORY":
                dir_path = Path(key.replace("CREATE_DIR:", ""))
                if not dry_run:
                    dir_path.mkdir(parents=True, exist_ok=True)
                print(f"{'Would create' if dry_run else 'Created'} directory: {dir_path}")

        # Handle file operations
        deleted_count = 0
        moved_count = 0
        
        for file_path, action in plan.items():
            if file_path.startswith("CREATE_DIR:"):
                continue
                
            source_path = Path(file_path)
            
            if action == "DELETE":
                if not dry_run:
                    source_path.unlink()
                print(f"{'Would delete' if dry_run else 'Deleted'}: {source_path.name}")
                deleted_count += 1
                
            elif action != "DELETE":
                target_path = Path(action)
                if not dry_run:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(source_path), str(target_path))
                print(f"{'Would move' if dry_run else 'Moved'}: {source_path.name} -> {target_path}")
                moved_count += 1

        print(f"\nSummary:")
        print(f"  Files to delete: {deleted_count}")
        print(f"  Files to move: {moved_count}")
        print(f"  Total files processed: {deleted_count + moved_count}")

    def generate_report(self, categorized: Dict[str, List[TestFileInfo]]) -> str:
        """Generate a detailed report of the analysis"""
        report = []
        report.append("# Test File Organization Analysis Report")
        report.append(f"Generated on: {Path.cwd()}")
        report.append("")
        
        # Summary statistics
        total_files = sum(len(files) for files in categorized.values())
        report.append("## Summary Statistics")
        report.append(f"- Total test files analyzed: {total_files}")
        
        for category, files in categorized.items():
            report.append(f"- {category.title()}: {len(files)} files")
        
        report.append("")
        
        # Detailed breakdown by category
        for category, files in categorized.items():
            if not files:
                continue
                
            report.append(f"## {category.title()} Tests ({len(files)} files)")
            report.append("")
            
            # Group by functionality
            by_functionality = defaultdict(list)
            for file_info in files:
                by_functionality[file_info.functionality].append(file_info)
            
            for functionality, func_files in by_functionality.items():
                report.append(f"### {functionality.title()} ({len(func_files)} files)")
                for file_info in func_files:
                    test_info = f"{file_info.test_count} tests" if file_info.test_count > 0 else "no tests"
                    size_kb = file_info.file_size / 1024
                    report.append(f"- `{file_info.path.name}` ({test_info}, {size_kb:.1f}KB)")
                    if file_info.is_duplicate and file_info.duplicate_of:
                        report.append(f"  - **DUPLICATE** of {Path(file_info.duplicate_of).name}")
                report.append("")
        
        # Recommendations
        report.append("## Recommendations")
        report.append("")
        
        duplicate_count = len(categorized.get("duplicates", []))
        if duplicate_count > 0:
            report.append(f"1. **Remove {duplicate_count} duplicate files** to reduce maintenance overhead")
        
        report.append("2. **Reorganize files** into the proposed directory structure:")
        report.append("   ```")
        report.append("   tests/")
        for category, subcategories in self.target_structure.items():
            report.append(f"   ├── {category}/")
            for subcat in subcategories:
                report.append(f"   │   ├── {subcat}/")
        report.append("   ```")
        
        report.append("")
        report.append("3. **Establish naming conventions** for future test files")
        report.append("4. **Create shared fixtures** to reduce code duplication")
        
        return "\n".join(report)


def main():
    """Main execution function"""
    backend_path = Path(".")
    organizer = TestFileOrganizer(backend_path)
    
    print("Starting test file organization analysis...")
    
    # Audit existing files
    categorized = organizer.audit_test_files()
    
    # Generate report
    report = organizer.generate_report(categorized)
    
    # Save report
    report_path = backend_path / "test_organization_report.md"
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"\nAnalysis complete! Report saved to: {report_path}")
    
    # Create reorganization plan
    plan = organizer.create_organization_plan()
    
    # Save plan as JSON for review
    plan_path = backend_path / "test_reorganization_plan.json"
    with open(plan_path, 'w') as f:
        json.dump(plan, f, indent=2, default=str)
    
    print(f"Reorganization plan saved to: {plan_path}")
    
    # Show summary
    print(f"\nSummary:")
    for category, files in categorized.items():
        print(f"  {category.title()}: {len(files)} files")
    
    # Ask for confirmation before executing
    print(f"\nTo execute the reorganization plan, run:")
    print(f"python -c \"")
    print(f"from test_organizer import TestFileOrganizer")
    print(f"import json")
    print(f"from pathlib import Path")
    print(f"organizer = TestFileOrganizer(Path('.'))") 
    print(f"with open('test_reorganization_plan.json') as f:")
    print(f"    plan = json.load(f)")
    print(f"organizer.execute_reorganization(plan, dry_run=False)\"")


if __name__ == "__main__":
    main()