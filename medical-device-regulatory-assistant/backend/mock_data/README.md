# Mock Data Configuration System

This directory contains the JSON schema validation system for mock data configuration in the Medical Device Regulatory Assistant.

## Overview

The mock data configuration system allows you to define realistic test data for the application using JSON files that are validated against a comprehensive schema. This ensures data consistency and helps catch configuration errors early.

## Files Structure

```
mock_data/
├── schemas/
│   └── mock_data_schema.json          # JSON schema definition
├── sample_mock_data_config.json       # Sample configuration file
├── json_validator.py                  # Validation utility classes
├── validate_config.py                 # CLI validation tool
└── README.md                          # This file
```

## Quick Start

### 1. Validate the Sample Configuration

```bash
cd medical-device-regulatory-assistant/backend/mock_data
python validate_config.py sample_mock_data_config.json
```

### 2. Create Your Own Configuration

Copy the sample configuration and modify it:

```bash
cp sample_mock_data_config.json my_config.json
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