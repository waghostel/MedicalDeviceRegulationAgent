#!/usr/bin/env python3
"""
Conservative Test File Organizer for Medical Device Regulatory Assistant Backend

This script analyzes and reorganizes test files with a conservative approach to
duplicate detection, focusing on organization rather than aggressive deletion.
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
    category: str  # unit, integration, performance, fixtures
    functionality: str  # database, api, services, auth, health, etc.
    dependencies: Set[str]
    test_count: int
    is_duplicate: bool
    duplicate_of: Optional[str] = None
    file_size: int = 0
    last_modified: float = 0


class ConservativeTestFileOrganizer:
    """Conservative organizer that focuses on organization over deletion"""

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

        # Conservative duplicate patterns - only very obvious duplicates
        self.obvious_duplicate_patterns = [
            # Files that are clearly just different versions
            ('_simple', '_basic'),
            ('_enhanced', '_advanced'),
            ('_complete', '_full'),
            # Files with minimal or no tests that duplicate functionality
            ('_mock', '_simple'),
        ]

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
                categorized[info.category].append(info)
                    
            except Exception as e:
                print(f"Error analyzing {file_path}: {e}")
                continue

        # Conservative duplicate identification
        self._identify_obvious_duplicates()
        
        # Move duplicates to separate category
        for file_path, info in self.file_info.items():
            if info.is_duplicate:
                # Remove from original category
                for category_files in categorized.values():
                    category_files[:] = [f for f in category_files if f.path != info.path]
                categorized["duplicates"].append(info)
        
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

    def _identify_obvious_duplicates(self) -> None:
        """Identify only obvious duplicates with conservative approach"""
        # Group files by functionality and category
        groups = defaultdict(list)
        
        for file_path, info in self.file_info.items():
            if not info.is_duplicate:  # Don't group already marked duplicates
                key = (info.category, info.functionality)
                groups[key].append((file_path, info))

        # Within each group, look for obvious duplicates
        for group_key, files in groups.items():
            if len(files) <= 1:
                continue
                
            # Sort by file size and modification time (larger, newer files preferred)
            files.sort(key=lambda x: (x[1].test_count, x[1].file_size, x[1].last_modified), reverse=True)
            
            # Only mark files as duplicates if they meet strict criteria
            for i, (file_path1, info1) in enumerate(files):
                for j, (file_path2, info2) in enumerate(files[i+1:], i+1):
                    if self._are_obvious_duplicates(info1, info2):
                        # Mark the file with fewer tests as duplicate
                        if info1.test_count >= info2.test_count:
                            info2.is_duplicate = True
                            info2.duplicate_of = file_path1
                            print(f"Identified obvious duplicate: {info2.path.name} -> {info1.path.name}")
                        else:
                            info1.is_duplicate = True
                            info1.duplicate_of = file_path2
                            print(f"Identified obvious duplicate: {info1.path.name} -> {info2.path.name}")

    def _are_obvious_duplicates(self, info1: TestFileInfo, info2: TestFileInfo) -> bool:
        """Check if two test files are obvious duplicates using conservative criteria"""
        name1 = info1.path.stem.lower()
        name2 = info2.path.stem.lower()
        
        # Only consider files duplicates if:
        # 1. One has no tests and the other has tests
        # 2. Names are very similar with obvious version suffixes
        # 3. File sizes are very similar (within 10%) and one has no tests
        
        # Check for obvious naming patterns
        for pattern1, pattern2 in self.obvious_duplicate_patterns:
            if ((pattern1 in name1 and pattern2 in name2) or 
                (pattern2 in name1 and pattern1 in name2)):
                # If one has no tests and the other has tests, it's likely a duplicate
                if (info1.test_count == 0 and info2.test_count > 0) or \
                   (info2.test_count == 0 and info1.test_count > 0):
                    return True
        
        # Check for files with identical base names but different suffixes
        clean_name1 = re.sub(r'_(simple|basic|enhanced|advanced|complete|full|mock|integration|unit)$', '', name1)
        clean_name2 = re.sub(r'_(simple|basic|enhanced|advanced|complete|full|mock|integration|unit)$', '', name2)
        
        if clean_name1 == clean_name2 and clean_name1 != name1 and clean_name2 != name2:
            # Only mark as duplicate if one has significantly fewer tests
            if (info1.test_count == 0 and info2.test_count > 2) or \
               (info2.test_count == 0 and info1.test_count > 2):
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

        # Plan file moves and deletions (only for obvious duplicates)
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
        report.append("# Conservative Test File Organization Analysis Report")
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
            report.append(f"1. **Remove {duplicate_count} obvious duplicate files** to reduce maintenance overhead")
        else:
            report.append("1. **No obvious duplicates found** - conservative approach preserved all files")
        
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
        report.append("5. **Review files with 0 tests** - they may need test implementation or removal")
        
        return "\n".join(report)


def main():
    """Main execution function"""
    backend_path = Path(".")
    organizer = ConservativeTestFileOrganizer(backend_path)
    
    print("Starting conservative test file organization analysis...")
    
    # Audit existing files
    categorized = organizer.audit_test_files()
    
    # Generate report
    report = organizer.generate_report(categorized)
    
    # Save report
    report_path = backend_path / "test_organization_report_conservative.md"
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"\nAnalysis complete! Report saved to: {report_path}")
    
    # Create reorganization plan
    plan = organizer.create_organization_plan()
    
    # Save plan as JSON for review
    plan_path = backend_path / "test_reorganization_plan_conservative.json"
    with open(plan_path, 'w') as f:
        json.dump(plan, f, indent=2, default=str)
    
    print(f"Reorganization plan saved to: {plan_path}")
    
    # Show summary
    print(f"\nSummary:")
    for category, files in categorized.items():
        print(f"  {category.title()}: {len(files)} files")
    
    return organizer, plan


if __name__ == "__main__":
    organizer, plan = main()