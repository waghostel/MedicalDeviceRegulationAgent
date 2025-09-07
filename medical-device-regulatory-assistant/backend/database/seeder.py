"""
Database seeding functionality for sample data
"""

import asyncio
import logging
import json
from datetime import datetime, date
from typing import List

from .connection import get_database_manager

logger = logging.getLogger(__name__)


class DatabaseSeeder:
    """Database seeder for creating sample data"""
    
    def __init__(self):
        self.db_manager = get_database_manager()
    
    async def seed_all(self) -> None:
        """Seed all sample data"""
        async with self.db_manager.get_connection() as conn:
            await self.seed_users(conn)
            await self.seed_projects(conn)
            await self.seed_device_classifications(conn)
            await self.seed_predicate_devices(conn)
            await self.seed_agent_interactions(conn)
            await self.seed_project_documents(conn)
            await conn.commit()
            
        logger.info("Database seeding completed successfully")
    
    async def seed_users(self, conn) -> None:
        """Seed sample users"""
        users_data = [
            ("john.doe@medtech.com", "John Doe", "google_123456789"),
            ("jane.smith@deviceco.com", "Jane Smith", "google_987654321"),
            ("mike.johnson@startup.com", "Mike Johnson", "google_456789123")
        ]
        
        for email, name, google_id in users_data:
            await conn.execute(
                "INSERT OR IGNORE INTO users (email, name, google_id) VALUES (?, ?, ?)",
                (email, name, google_id)
            )
        
        logger.info(f"Seeded {len(users_data)} users")
    
    async def seed_projects(self, conn) -> None:
        """Seed sample projects"""
        # Get users first
        cursor = await conn.execute("SELECT id FROM users")
        user_rows = await cursor.fetchall()
        user_ids = [row[0] for row in user_rows]
        
        if not user_ids:
            logger.warning("No users found for project seeding")
            return
        
        projects_data = [
            (user_ids[0], "Cardiac Monitoring Device", "Wearable ECG monitor for continuous cardiac rhythm monitoring", "Class II Medical Device", "For continuous monitoring of cardiac rhythm in ambulatory patients", "IN_PROGRESS"),
            (user_ids[0], "Blood Glucose Meter", "Portable blood glucose monitoring system", "Class II Medical Device", "For quantitative measurement of glucose in capillary blood", "DRAFT"),
            (user_ids[1] if len(user_ids) > 1 else user_ids[0], "Surgical Navigation System", "Computer-assisted surgical navigation for orthopedic procedures", "Class II Medical Device", "To provide real-time guidance during orthopedic surgical procedures", "COMPLETED")
        ]
        
        for user_id, name, description, device_type, intended_use, status in projects_data:
            await conn.execute(
                "INSERT OR IGNORE INTO projects (user_id, name, description, device_type, intended_use, status) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, name, description, device_type, intended_use, status)
            )
        
        logger.info(f"Seeded {len(projects_data)} projects")
    
    async def seed_device_classifications(self, conn) -> None:
        """Seed sample device classifications"""
        # Get projects first
        cursor = await conn.execute("SELECT id FROM projects")
        project_rows = await cursor.fetchall()
        project_ids = [row[0] for row in project_rows]
        
        if not project_ids:
            logger.warning("No projects found for classification seeding")
            return
        
        classifications_data = [
            (
                project_ids[0], 
                "CLASS_II", 
                "DPS", 
                "FIVE_TEN_K", 
                json.dumps(["870.2300", "870.2340"]), 
                0.92,
                "Device classified as Class II based on intended use for cardiac monitoring. Product code DPS applies to electrocardiograph devices.",
                json.dumps([{
                    "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=870.2300",
                    "title": "21 CFR 870.2300 - Electrocardiograph",
                    "document_type": "CFR_SECTION"
                }])
            ),
            (
                project_ids[1] if len(project_ids) > 1 else project_ids[0], 
                "CLASS_II", 
                "NBW", 
                "FIVE_TEN_K", 
                json.dumps(["862.1345"]), 
                0.95,
                "Blood glucose meter classified as Class II. Product code NBW for glucose test systems.",
                json.dumps([{
                    "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=862.1345",
                    "title": "21 CFR 862.1345 - Glucose test system",
                    "document_type": "CFR_SECTION"
                }])
            )
        ]
        
        for project_id, device_class, product_code, regulatory_pathway, cfr_sections, confidence_score, reasoning, sources in classifications_data:
            await conn.execute(
                "INSERT OR IGNORE INTO device_classifications (project_id, device_class, product_code, regulatory_pathway, cfr_sections, confidence_score, reasoning, sources) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (project_id, device_class, product_code, regulatory_pathway, cfr_sections, confidence_score, reasoning, sources)
            )
        
        logger.info(f"Seeded {len(classifications_data)} device classifications")
    
    async def seed_predicate_devices(self, conn) -> None:
        """Seed sample predicate devices"""
        # Get projects first
        cursor = await conn.execute("SELECT id FROM projects")
        project_rows = await cursor.fetchall()
        project_ids = [row[0] for row in project_rows]
        
        if not project_ids:
            logger.warning("No projects found for predicate device seeding")
            return
        
        predicates_data = [
            (
                project_ids[0],
                "K193456",
                "CardioWatch Pro ECG Monitor",
                "Continuous monitoring of cardiac rhythm in ambulatory patients using wearable technology",
                "DPS",
                "2019-08-15",
                0.89,
                json.dumps({
                    "similarities": [
                        {"category": "Intended Use", "similarity": "identical"},
                        {"category": "Technology", "similarity": "similar"}
                    ],
                    "differences": [
                        {"category": "Form Factor", "impact": "low"},
                        {"category": "Battery Life", "impact": "low"}
                    ]
                }),
                1  # True
            ),
            (
                project_ids[0],
                "K182789",
                "HeartTrack Wireless ECG",
                "Remote cardiac monitoring for patients with arrhythmias",
                "DPS",
                "2018-12-03",
                0.76,
                json.dumps({
                    "similarities": [
                        {"category": "Intended Use", "similarity": "similar"},
                        {"category": "Signal Processing", "similarity": "identical"}
                    ],
                    "differences": [
                        {"category": "Connectivity", "impact": "medium"},
                        {"category": "Data Storage", "impact": "low"}
                    ]
                }),
                0  # False
            )
        ]
        
        for project_id, k_number, device_name, intended_use, product_code, clearance_date, confidence_score, comparison_data, is_selected in predicates_data:
            await conn.execute(
                "INSERT OR IGNORE INTO predicate_devices (project_id, k_number, device_name, intended_use, product_code, clearance_date, confidence_score, comparison_data, is_selected) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (project_id, k_number, device_name, intended_use, product_code, clearance_date, confidence_score, comparison_data, is_selected)
            )
        
        logger.info(f"Seeded {len(predicates_data)} predicate devices")
    
    async def seed_agent_interactions(self, conn) -> None:
        """Seed sample agent interactions"""
        # Get projects and users
        cursor = await conn.execute("SELECT id FROM projects")
        project_rows = await cursor.fetchall()
        project_ids = [row[0] for row in project_rows]
        
        cursor = await conn.execute("SELECT id FROM users")
        user_rows = await cursor.fetchall()
        user_ids = [row[0] for row in user_rows]
        
        if not project_ids or not user_ids:
            logger.warning("No projects or users found for agent interaction seeding")
            return
        
        interactions_data = [
            (
                project_ids[0],
                user_ids[0],
                "predicate_search",
                json.dumps({
                    "device_description": "Wearable ECG monitor",
                    "intended_use": "Continuous cardiac monitoring"
                }),
                json.dumps({
                    "predicates_found": 5,
                    "top_match": "K193456",
                    "confidence": 0.89
                }),
                0.89,
                json.dumps([{
                    "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K193456",
                    "title": "510(k) Summary K193456"
                }]),
                "Found 5 potential predicates based on intended use similarity. K193456 shows highest technological similarity.",
                2340
            ),
            (
                project_ids[0],
                user_ids[0],
                "device_classification",
                json.dumps({
                    "device_description": "Wearable ECG monitor for cardiac rhythm monitoring"
                }),
                json.dumps({
                    "device_class": "II",
                    "product_code": "DPS",
                    "regulatory_pathway": "510k"
                }),
                0.92,
                json.dumps([{
                    "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=870.2300",
                    "title": "21 CFR 870.2300"
                }]),
                "Device classified as Class II based on CFR 870.2300 for electrocardiograph devices.",
                1560
            )
        ]
        
        for project_id, user_id, agent_action, input_data, output_data, confidence_score, sources, reasoning, execution_time_ms in interactions_data:
            await conn.execute(
                "INSERT OR IGNORE INTO agent_interactions (project_id, user_id, agent_action, input_data, output_data, confidence_score, sources, reasoning, execution_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (project_id, user_id, agent_action, input_data, output_data, confidence_score, sources, reasoning, execution_time_ms)
            )
        
        logger.info(f"Seeded {len(interactions_data)} agent interactions")
    
    async def seed_project_documents(self, conn) -> None:
        """Seed sample project documents"""
        # Get projects first
        cursor = await conn.execute("SELECT id FROM projects")
        project_rows = await cursor.fetchall()
        project_ids = [row[0] for row in project_rows]
        
        if not project_ids:
            logger.warning("No projects found for document seeding")
            return
        
        documents_data = [
            (
                project_ids[0],
                "device_description.md",
                "/projects/cardiac_monitor/device_description.md",
                "device_specification",
                "# Cardiac Monitoring Device\n\n## Overview\nWearable ECG monitor for continuous cardiac rhythm monitoring...",
                json.dumps({
                    "version": "1.0",
                    "author": "John Doe",
                    "last_modified": "2024-01-15"
                })
            ),
            (
                project_ids[0],
                "predicate_analysis.md",
                "/projects/cardiac_monitor/predicate_analysis.md",
                "regulatory_analysis",
                "# Predicate Device Analysis\n\n## Selected Predicate: K193456\n\n### Similarities\n- Intended use...",
                json.dumps({
                    "version": "1.2",
                    "author": "John Doe",
                    "analysis_date": "2024-01-20"
                })
            )
        ]
        
        for project_id, filename, file_path, document_type, content_markdown, document_metadata in documents_data:
            await conn.execute(
                "INSERT OR IGNORE INTO project_documents (project_id, filename, file_path, document_type, content_markdown, document_metadata) VALUES (?, ?, ?, ?, ?, ?)",
                (project_id, filename, file_path, document_type, content_markdown, document_metadata)
            )
        
        logger.info(f"Seeded {len(documents_data)} project documents")
    
    async def clear_all_data(self) -> None:
        """Clear all data from database"""
        async with self.db_manager.get_connection() as conn:
            # Delete in reverse order of dependencies
            await conn.execute("DELETE FROM project_documents")
            await conn.execute("DELETE FROM agent_interactions")
            await conn.execute("DELETE FROM predicate_devices")
            await conn.execute("DELETE FROM device_classifications")
            await conn.execute("DELETE FROM projects")
            await conn.execute("DELETE FROM users")
            await conn.commit()
            
        logger.info("All data cleared from database")


async def seed_database() -> None:
    """Convenience function to seed the database"""
    seeder = DatabaseSeeder()
    await seeder.seed_all()


async def clear_database() -> None:
    """Convenience function to clear the database"""
    seeder = DatabaseSeeder()
    await seeder.clear_all_data()