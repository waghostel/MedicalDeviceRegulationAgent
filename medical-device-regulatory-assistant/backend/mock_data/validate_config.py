#!/usr/bin/env python3
"""
CLI tool for validating mock data configuration files

Usage:
    python validate_config.py <config_file>
    python validate_config.py --help
"""

import argparse
import sys
from pathlib import Path

from json_validator import validate_mock_data_file


def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description="Validate mock data configuration files for Medical Device Regulatory Assistant",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python validate_config.py sample_mock_data_config.json
    python validate_config.py ../custom_config.json
    python validate_config.py config.json --schema custom_schema.json
        """
    )
    
    parser.add_argument(
        "config_file",
        help="Path to the mock data configuration file to validate"
    )
    
    parser.add_argument(
        "--schema",
        help="Path to custom JSON schema file (optional)",
        default=None
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Only show errors, suppress success messages"
    )
    
    args = parser.parse_args()
    
    # Check if config file exists
    config_path = Path(args.config_file)
    if not config_path.exists():
        print(f"❌ Error: Configuration file not found: {args.config_file}")
        sys.exit(1)
    
    # Validate the configuration
    try:
        if args.quiet:
            # For quiet mode, capture output and only show errors
            from json_validator import MockDataValidator
            validator = MockDataValidator(args.schema)
            is_valid, errors = validator.validate_config(str(config_path))
            
            if is_valid:
                if not args.quiet:
                    print("✅ Configuration is valid")
                sys.exit(0)
            else:
                print(f"❌ Configuration is invalid ({len(errors)} errors):")
                for i, error in enumerate(errors, 1):
                    print(f"  {i}. {error}")
                sys.exit(1)
        else:
            # Normal mode with full output
            validate_mock_data_file(str(config_path), args.schema)
            sys.exit(0)
            
    except Exception as e:
        print(f"❌ Error during validation: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()