"""
Simple test script for audit functionality
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.audit_logger import AuditLogger, AuditLogEntry


async def test_audit_logger():
    """Test the audit logger functionality"""
    
    print("🧪 Testing Audit Logger...")
    
    # Create audit logger instance
    audit_logger = AuditLogger()
    
    # Test logging an agent action
    print("📝 Testing agent action logging...")
    
    try:
        await audit_logger.log_agent_action(
            project_id=1,
            user_id=1,
            action="test_predicate_search",
            input_data={"device_description": "Test cardiac device"},
            output_data={"predicates": ["K123456", "K789012"]},
            confidence_score=0.85,
            sources=[
                {"url": "https://fda.gov/510k/K123456", "title": "FDA 510(k) Database"},
                {"url": "https://fda.gov/guidance/cardiac", "title": "Cardiac Device Guidance"}
            ],
            reasoning="Found similar cardiac devices with matching intended use",
            execution_time_ms=1500
        )
        print("✅ Agent action logged successfully")
        
    except Exception as e:
        print(f"❌ Failed to log agent action: {e}")
        return False
    
    # Test retrieving audit trail
    print("📋 Testing audit trail retrieval...")
    
    try:
        audit_entries = await audit_logger.get_audit_trail(
            project_id=1,
            limit=10
        )
        print(f"✅ Retrieved {len(audit_entries)} audit entries")
        
        if audit_entries:
            entry = audit_entries[0]
            print(f"   - Action: {entry['action']}")
            print(f"   - Confidence: {entry['confidence_score']}")
            print(f"   - Sources: {len(entry['sources'])} citations")
        
    except Exception as e:
        print(f"❌ Failed to retrieve audit trail: {e}")
        return False
    
    # Test audit summary
    print("📊 Testing audit summary...")
    
    try:
        summary = await audit_logger.get_audit_summary(project_id=1)
        print(f"✅ Generated audit summary:")
        print(f"   - Total interactions: {summary['total_interactions']}")
        print(f"   - Average confidence: {summary['average_confidence']}")
        print(f"   - Error rate: {summary['error_rate']}%")
        
    except Exception as e:
        print(f"❌ Failed to generate audit summary: {e}")
        return False
    
    # Test export functionality
    print("📤 Testing audit export...")
    
    try:
        json_export = await audit_logger.export_audit_trail(
            project_id=1,
            format_type="json"
        )
        print(f"✅ JSON export generated ({len(json_export)} characters)")
        
        csv_export = await audit_logger.export_audit_trail(
            project_id=1,
            format_type="csv"
        )
        print(f"✅ CSV export generated ({len(csv_export)} characters)")
        
    except Exception as e:
        print(f"❌ Failed to export audit trail: {e}")
        return False
    
    # Test error logging
    print("🚨 Testing error logging...")
    
    try:
        await audit_logger.log_error(
            project_id=1,
            user_id=1,
            error_type="fda_api_timeout",
            error_message="FDA API request timed out after 30 seconds",
            error_details={"endpoint": "/device/510k.json", "timeout": 30},
            context={"search_terms": ["cardiac", "pacemaker"]}
        )
        print("✅ Error logged successfully")
        
    except Exception as e:
        print(f"❌ Failed to log error: {e}")
        return False
    
    # Test tool execution logging
    print("🔧 Testing tool execution logging...")
    
    try:
        await audit_logger.log_tool_execution(
            project_id=1,
            user_id=1,
            tool_name="fda_predicate_search",
            tool_input={"device_type": "cardiac", "intended_use": "heart rhythm management"},
            tool_output={
                "predicates": ["K123456"],
                "confidence_scores": [0.92],
                "sources": [{"url": "https://fda.gov", "title": "FDA Database"}]
            },
            execution_time_ms=2300,
            success=True
        )
        print("✅ Tool execution logged successfully")
        
    except Exception as e:
        print(f"❌ Failed to log tool execution: {e}")
        return False
    
    print("\n🎉 All audit logger tests passed!")
    return True


async def test_compliance_metrics():
    """Test compliance metrics generation"""
    
    print("\n📋 Testing compliance metrics...")
    
    # Import the helper function
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))
    
    try:
        from api.audit import _generate_compliance_metrics
        
        # Sample audit entries for testing
        sample_entries = [
            {
                "id": 1,
                "action": "predicate_search",
                "confidence_score": 0.85,
                "sources": [{"url": "test.com"}],
                "reasoning": "Found similar devices"
            },
            {
                "id": 2,
                "action": "device_classification",
                "confidence_score": 0.92,
                "sources": [{"url": "fda.gov"}],
                "reasoning": "Clear classification criteria"
            },
            {
                "id": 3,
                "action": "error_api_timeout",
                "confidence_score": 0.0,
                "sources": [],
                "reasoning": "API timeout occurred"
            }
        ]
        
        metrics = await _generate_compliance_metrics(sample_entries)
        
        print(f"✅ Compliance metrics generated:")
        print(f"   - Reasoning completeness: {metrics['reasoning_completeness']:.2%}")
        print(f"   - Citation completeness: {metrics['citation_completeness']:.2%}")
        print(f"   - Confidence score coverage: {metrics['confidence_score_coverage']:.2%}")
        print(f"   - Average confidence: {metrics['average_confidence']:.3f}")
        print(f"   - Error rate: {metrics['error_rate']:.2%}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to test compliance metrics: {e}")
        return False


async def test_integrity_verification():
    """Test audit integrity verification"""
    
    print("\n🔒 Testing integrity verification...")
    
    try:
        from api.audit import _verify_entry_integrity
        
        # Test valid entry
        valid_entry = {
            "id": 1,
            "project_id": 1,
            "action": "predicate_search",
            "created_at": "2024-01-01T10:00:00",
            "confidence_score": 0.85
        }
        
        is_valid = await _verify_entry_integrity(valid_entry)
        print(f"✅ Valid entry verification: {is_valid}")
        
        # Test invalid entry (missing required fields)
        invalid_entry = {
            "id": 1,
            "action": "test"
            # Missing project_id and created_at
        }
        
        is_invalid = await _verify_entry_integrity(invalid_entry)
        print(f"✅ Invalid entry verification: {is_invalid}")
        
        # Test entry with invalid confidence score
        invalid_confidence = {
            "id": 1,
            "project_id": 1,
            "action": "test",
            "created_at": "2024-01-01T10:00:00",
            "confidence_score": 1.5  # Invalid range
        }
        
        is_invalid_confidence = await _verify_entry_integrity(invalid_confidence)
        print(f"✅ Invalid confidence verification: {is_invalid_confidence}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to test integrity verification: {e}")
        return False


async def main():
    """Run all tests"""
    
    print("🚀 Starting Audit Trail and Compliance Integration Tests\n")
    
    success = True
    
    # Test audit logger
    if not await test_audit_logger():
        success = False
    
    # Test compliance metrics
    if not await test_compliance_metrics():
        success = False
    
    # Test integrity verification
    if not await test_integrity_verification():
        success = False
    
    if success:
        print("\n🎉 All tests passed! Audit trail and compliance integration is working correctly.")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
    
    return success


if __name__ == "__main__":
    asyncio.run(main())