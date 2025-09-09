# Mock Data Configuration System

This directory contains the JSON schema validation system for mock data configuration in the Medical Device Regulatory Assistant.

## Overview

The mock data configuration system allows you to define realistic test data for the application using JSON files that are validated against a comprehensive schema. This ensures data consistency and helps catch configuration errors early.

## Files Structure

```
mock_data/
├── schemas/
│   └── mock_data_schema.json                    # JSON schema definition
├── sample_mock_data_config.json                 # Original sample configuration (6 projects)
├── comprehensive_mock_data_config.json          # Comprehensive dataset (20+ projects)
├── edge_cases_mock_data_config.json            # Edge cases and error scenarios
├── minimal_test_config.json                    # Minimal dataset (2 projects)
├── performance_test_config.json                # Base performance testing config
├── generate_performance_data.py                # High-volume data generator script
├── json_validator.py                           # Validation utility classes
├── validate_config.py                          # CLI validation tool
└── README.md                                   # This file
```

## Quick Start

### 1. Choose Your Configuration

Select the appropriate configuration for your needs:

- **`minimal_test_config.json`** - Quick testing with 2 simple projects
- **`sample_mock_data_config.json`** - Original sample with 6 basic projects  
- **`comprehensive_mock_data_config.json`** - Full dataset with 20+ diverse projects
- **`edge_cases_mock_data_config.json`** - Edge cases and error scenarios

### 2. Validate Configuration

```bash
cd medical-device-regulatory-assistant/backend/mock_data
python validate_config.py comprehensive_mock_data_config.json
```

### 3. Generate Performance Data (Optional)

For high-volume testing:

```bash
python generate_performance_data.py
# This creates high_volume_small_config.json, high_volume_medium_config.json, high_volume_large_config.json
```

### 4. Create Custom Configuration

Copy an existing configuration and modify it:

```bash
cp comprehensive_mock_data_config.json my_config.json
# Edit my_config.json with your data
python validate_config.py my_config.json
```

### 3. Use in Python Code

```python
from mock_data.json_validator import MockDataValidator

validator = MockDataValidator()
is_valid, errors = validator.validate_config("my_config.json")

if is_valid:
    print("Configuration is valid!")
else:
    for error in errors:
        print(f"Error: {error}")
```

## Available Configurations

### Core Configurations

#### `comprehensive_mock_data_config.json`
- **20+ diverse medical device projects** covering various device classes
- **Multiple device types**: Cardiac monitors, glucose meters, surgical systems, AI software, implantable devices
- **All regulatory pathways**: 510(k), PMA, De Novo
- **Complete related data**: Classifications, predicates, agent interactions
- **Use case**: Full feature testing, demonstrations, comprehensive development

#### `sample_mock_data_config.json`  
- **6 basic medical device projects** with standard configurations
- **Common device types**: Cardiac monitor, glucose meter, surgical navigation, wound dressing, pulse oximeter, insulin pump
- **Standard pathways**: Primarily 510(k) with some PMA
- **Use case**: Basic testing, getting started, simple demonstrations

#### `minimal_test_config.json`
- **2 simple projects** for quick testing
- **Basic device types**: Cardiac monitor, glucose meter
- **Standard 510(k) pathway** only
- **Use case**: Quick development cycles, CI/CD testing, minimal setup

### Specialized Testing Configurations

#### `edge_cases_mock_data_config.json`
- **Edge case scenarios** for robust testing
- **Data validation testing**: Empty fields, extremely long text, special characters, Unicode
- **Error scenarios**: Invalid K-numbers, malformed data, API timeouts
- **Orphaned data**: Projects with missing relationships
- **Use case**: Error handling validation, UI stress testing, data validation

#### Performance Testing Configurations
- **`performance_test_config.json`** - Base configuration for performance testing
- **Generated configurations** via `generate_performance_data.py`:
  - `high_volume_small_config.json` - 5 projects, 100 predicates, 50 interactions
  - `high_volume_medium_config.json` - 10 projects, 500 predicates, 200 interactions  
  - `high_volume_large_config.json` - 25 projects, 2500 predicates, 1250 interactions
- **Use case**: Load testing, performance validation, stress testing

## Device Types Covered

The comprehensive configuration includes:

### Cardiovascular (Class II & III)
- Cardiac Monitoring Device, Pacemaker, Defibrillator

### Diabetes Management (Class II)  
- Blood Glucose Meter, Insulin Pump, Continuous Glucose Monitor

### Surgical Systems (Class II)
- Surgical Navigation System, Robotic Surgical System, Surgical Mesh

### Diagnostic Imaging (Class II)
- Pulse Oximeter, Ultrasound System, AI Diagnostic Software

### Implantable Devices (Class II & III)
- Neural Stimulator, Intraocular Lens, Dental Implant System

### Critical Care (Class II & III)
- Ventilator, Hemodialysis Machine

### Specialty Devices (Class II)
- Wound Care Dressing, Bone Graft Substitute, Contact Lens

## Configuration File Format

The configuration file must contain the following top-level sections:

### Required Sections

- **`users`**: Array of user objects for authentication
- **`projects`**: Array of medical device projects

### Optional Sections

- **`device_classifications`**: FDA device classification results
- **`predicate_devices`**: 510(k) predicate device search results
- **`agent_interactions`**: AI agent interaction logs for audit trail

### Example Configuration

```json
{
  "users": [
    {
      "google_id": "user_123456789",
      "email": "john.doe@medtech.com",
      "name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  ],
  "projects": [
    {
      "name": "Cardiac Monitoring Device",
      "description": "A wearable device for continuous cardiac rhythm monitoring",
      "device_type": "Cardiac Monitor",
      "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
      "status": "in_progress",
      "priority": "high",
      "tags": ["cardiac", "wearable", "monitoring"],
      "user_email": "john.doe@medtech.com"
    }
  ],
  "device_classifications": [
    {
      "project_name": "Cardiac Monitoring Device",
      "device_class": "II",
      "product_code": "DPS",
      "regulatory_pathway": "510k",
      "confidence_score": 0.92,
      "reasoning": "Device is substantially equivalent to existing cardiac monitors"
    }
  ],
  "predicate_devices": [
    {
      "project_name": "Cardiac Monitoring Device",
      "k_number": "K193456",
      "device_name": "CardioWatch Pro",
      "intended_use": "Continuous cardiac rhythm monitoring",
      "product_code": "DPS",
      "clearance_date": "2019-08-15",
      "confidence_score": 0.89,
      "is_selected": true
    }
  ]
}
```

## Validation Features

### Schema Validation

- **Data Types**: Ensures all fields have correct types (string, number, boolean, array, object)
- **Required Fields**: Validates that all required fields are present
- **Format Validation**: Checks email formats, date formats, URI formats, and regex patterns
- **Enum Validation**: Ensures enum fields contain only allowed values
- **Array Constraints**: Validates array length limits and uniqueness where required

### Business Rule Validation

- **Referential Integrity**: Ensures all references between entities are valid
  - Projects must reference existing users
  - Classifications must reference existing projects
  - Predicate devices must reference existing projects
  - Agent interactions must reference existing projects and users
- **Uniqueness Constraints**: Prevents duplicate values where required
  - User emails must be unique
  - User Google IDs must be unique
  - Project names must be unique
  - K-numbers must be unique

### Medical Device Specific Validation

- **FDA Product Codes**: Validates 3-letter FDA product code format
- **K-Numbers**: Validates FDA 510(k) number format (K followed by 6 digits)
- **Device Classes**: Ensures device classes are I, II, or III
- **Regulatory Pathways**: Validates FDA regulatory pathways (510k, PMA, De Novo)
- **CFR Sections**: Validates Code of Federal Regulations section format

## CLI Tool Usage

### Basic Validation

```bash
python validate_config.py config.json
```

### Quiet Mode (Only Show Errors)

```bash
python validate_config.py config.json --quiet
```

### Custom Schema

```bash
python validate_config.py config.json --schema custom_schema.json
```

### Help

```bash
python validate_config.py --help
```

## Python API

### MockDataValidator Class

```python
from mock_data.json_validator import MockDataValidator

# Initialize with default schema
validator = MockDataValidator()

# Initialize with custom schema
validator = MockDataValidator("path/to/custom_schema.json")

# Validate a configuration file
is_valid, errors = validator.validate_config("config.json")

# Validate data directly
data = {"users": [...], "projects": [...]}
is_valid, errors = validator.validate_data(data)

# Get schema information
schema_info = validator.get_schema_info()
```

### Convenience Function

```python
from mock_data.json_validator import validate_mock_data_file

# Validate and print results
validate_mock_data_file("config.json")
```

## Error Messages

The validator provides detailed error messages with:

- **Path Information**: Shows exactly where in the JSON structure the error occurred
- **Clear Descriptions**: Explains what went wrong and what was expected
- **Business Rule Context**: Explains referential integrity violations

Example error output:
```
❌ Configuration is INVALID
Found 3 error(s):
  1. Path 'users -> 0 -> email': 'invalid-email' is not a 'email'
  2. Path 'projects -> 0 -> status': 'invalid_status' is not one of ['draft', 'in_progress', 'completed']
  3. Project 'Test Project' references non-existent user email: nonexistent@example.com
```

## Integration with Database Seeder

This validation system is designed to work with the enhanced database seeder (task 2.2). The seeder will use these validated configuration files to populate the database with consistent, realistic test data.

## Testing

Run the comprehensive test suite:

```bash
cd medical-device-regulatory-assistant/backend
poetry run python test_json_schema_validation.py
```

This tests:
- Schema validation functionality
- Sample data validation
- Error handling for invalid data
- Business rule enforcement
- Data completeness checks

## Best Practices

1. **Always Validate**: Run validation before using configuration files
2. **Use Realistic Data**: Include varied device types, statuses, and scenarios
3. **Maintain Relationships**: Ensure all references between entities are valid
4. **Include Edge Cases**: Add data that tests boundary conditions
5. **Version Control**: Keep configuration files in version control
6. **Document Changes**: Update this README when adding new validation rules

## Troubleshooting

### Common Issues

1. **Invalid Email Format**: Ensure emails follow standard format (user@domain.com)
2. **Missing References**: Check that all user_email and project_name references exist
3. **Invalid Dates**: Use YYYY-MM-DD format for dates
4. **Invalid K-Numbers**: Use format K followed by 6 digits (e.g., K123456)
5. **Invalid Product Codes**: Use 3-letter uppercase codes (e.g., DPS, NBW)

### Getting Help

1. Run validation with full output to see detailed error messages
2. Check the sample configuration for correct format examples
3. Review the JSON schema file for complete field specifications
4. Run the test suite to ensure the validation system is working correctly

## Future Enhancements

- Support for additional medical device types
- Integration with FDA databases for real-time validation
- Export validation for different formats (CSV, Excel)
- Custom validation rules for specific device categories
- Integration with CI/CD pipelines for automated testing