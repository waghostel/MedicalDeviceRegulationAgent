"""
Database seeding functionality for sample data
"""

import asyncio
import logging
from datetime import datetime, date
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    User, Project, DeviceClassification, PredicateDevice, 
    AgentInteraction, ProjectDocument
)
from models.project import ProjectStatus
from models.device_classification import DeviceClass, RegulatoryPathway
from .connection import get_database_manager

logger = logging.getLogger(__name__)


class DatabaseSeeder:
    """Database seeder for creating sample data"""
    
    def __init__(self):
        self.db_manager = get_database_manager()
    
    async def seed_all(self) -> None:
        """Seed all sample data"""
        async with self.db_manager.get_session() as session:
            await self.seed_users(session)
            await self.seed_projects(session)
            await self.seed_device_classifications(session)
            await self.seed_predicate_devices(session)
            await self.seed_agent_interactions(session)
            await self.seed_project_documents(session)
            
        logger.info("Database seeding completed successfully")
    
    async def seed_users(self, session: AsyncSession) -> List[User]:
        """Seed sample users"""
        users_data = [
            {
                "email": "john.doe@medtech.com",
                "name": "John Doe",
                "google_id": "google_123456789"
            },
            {
                "email": "jane.smith@deviceco.com", 
                "name": "Jane Smith",
                "google_id": "google_987654321"
            },
            {
                "email": "mike.johnson@startup.com",
                "name": "Mike Johnson", 
                "google_id": "google_456789123"
            }
        ]
        
        users = []
        for user_data in users_data:
            user = User(**user_data)
            session.add(user)
            users.append(user)
        
        await session.flush()  # Get IDs without committing
        logger.info(f"Seeded {len(users)} users")
        return users
    
    async def seed_projects(self, session: AsyncSession) -> List[Project]:
        """Seed sample projects"""
        from sqlalchemy import select
        # Get users first
        result = await session.execute(select(User.id))
        user_ids = [row[0] for row in result.fetchall()]
        
        if not user_ids:
            logger.warning("No users found for project seeding")
            return []
        
        projects_data = [
            {
                "user_id": user_ids[0],
                "name": "Cardiac Monitoring Device",
                "description": "Wearable ECG monitor for continuous cardiac rhythm monitoring",
                "device_type": "Class II Medical Device",
                "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
                "status": ProjectStatus.IN_PROGRESS
            },
            {
                "user_id": user_ids[0],
                "name": "Blood Glucose Meter",
                "description": "Portable blood glucose monitoring system",
                "device_type": "Class II Medical Device", 
                "intended_use": "For quantitative measurement of glucose in capillary blood",
                "status": ProjectStatus.DRAFT
            },
            {
                "user_id": user_ids[1] if len(user_ids) > 1 else user_ids[0],
                "name": "Surgical Navigation System",
                "description": "Computer-assisted surgical navigation for orthopedic procedures",
                "device_type": "Class II Medical Device",
                "intended_use": "To provide real-time guidance during orthopedic surgical procedures",
                "status": ProjectStatus.COMPLETED
            }
        ]
        
        projects = []
        for project_data in projects_data:
            project = Project(**project_data)
            session.add(project)
            projects.append(project)
        
        await session.flush()
        logger.info(f"Seeded {len(projects)} projects")
        return projects
    
    async def seed_device_classifications(self, session: AsyncSession) -> List[DeviceClassification]:
        """Seed sample device classifications"""
        from sqlalchemy import select
        # Get projects first
        result = await session.execute(select(Project.id))
        project_ids = [row[0] for row in result.fetchall()]
        
        if not project_ids:
            logger.warning("No projects found for classification seeding")
            return []
        
        classifications_data = [
            {
                "project_id": project_ids[0],
                "device_class": DeviceClass.CLASS_II,
                "product_code": "DPS",
                "regulatory_pathway": RegulatoryPathway.FIVE_TEN_K,
                "cfr_sections": ["870.2300", "870.2340"],
                "confidence_score": 0.92,
                "reasoning": "Device classified as Class II based on intended use for cardiac monitoring. Product code DPS applies to electrocardiograph devices.",
                "sources": [
                    {
                        "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=870.2300",
                        "title": "21 CFR 870.2300 - Electrocardiograph",
                        "document_type": "CFR_SECTION"
                    }
                ]
            },
            {
                "project_id": project_ids[1] if len(project_ids) > 1 else project_ids[0],
                "device_class": DeviceClass.CLASS_II,
                "product_code": "NBW",
                "regulatory_pathway": RegulatoryPathway.FIVE_TEN_K,
                "cfr_sections": ["862.1345"],
                "confidence_score": 0.95,
                "reasoning": "Blood glucose meter classified as Class II. Product code NBW for glucose test systems.",
                "sources": [
                    {
                        "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=862.1345",
                        "title": "21 CFR 862.1345 - Glucose test system",
                        "document_type": "CFR_SECTION"
                    }
                ]
            }
        ]
        
        classifications = []
        for classification_data in classifications_data:
            classification = DeviceClassification(**classification_data)
            session.add(classification)
            classifications.append(classification)
        
        await session.flush()
        logger.info(f"Seeded {len(classifications)} device classifications")
        return classifications
    
    async def seed_predicate_devices(self, session: AsyncSession) -> List[PredicateDevice]:
        """Seed sample predicate devices"""
        from sqlalchemy import select
        # Get projects first
        result = await session.execute(select(Project.id))
        project_ids = [row[0] for row in result.fetchall()]
        
        if not project_ids:
            logger.warning("No projects found for predicate device seeding")
            return []
        
        predicates_data = [
            {
                "project_id": project_ids[0],
                "k_number": "K193456",
                "device_name": "CardioWatch Pro ECG Monitor",
                "intended_use": "Continuous monitoring of cardiac rhythm in ambulatory patients using wearable technology",
                "product_code": "DPS",
                "clearance_date": date(2019, 8, 15),
                "confidence_score": 0.89,
                "comparison_data": {
                    "similarities": [
                        {"category": "Intended Use", "similarity": "identical"},
                        {"category": "Technology", "similarity": "similar"}
                    ],
                    "differences": [
                        {"category": "Form Factor", "impact": "low"},
                        {"category": "Battery Life", "impact": "low"}
                    ]
                },
                "is_selected": True
            },
            {
                "project_id": project_ids[0],
                "k_number": "K182789",
                "device_name": "HeartTrack Wireless ECG",
                "intended_use": "Remote cardiac monitoring for patients with arrhythmias",
                "product_code": "DPS", 
                "clearance_date": date(2018, 12, 3),
                "confidence_score": 0.76,
                "comparison_data": {
                    "similarities": [
                        {"category": "Intended Use", "similarity": "similar"},
                        {"category": "Signal Processing", "similarity": "identical"}
                    ],
                    "differences": [
                        {"category": "Connectivity", "impact": "medium"},
                        {"category": "Data Storage", "impact": "low"}
                    ]
                },
                "is_selected": False
            }
        ]
        
        predicates = []
        for predicate_data in predicates_data:
            predicate = PredicateDevice(**predicate_data)
            session.add(predicate)
            predicates.append(predicate)
        
        await session.flush()
        logger.info(f"Seeded {len(predicates)} predicate devices")
        return predicates
    
    async def seed_agent_interactions(self, session: AsyncSession) -> List[AgentInteraction]:
        """Seed sample agent interactions"""
        from sqlalchemy import select
        # Get projects and users
        result = await session.execute(select(Project.id))
        project_ids = [row[0] for row in result.fetchall()]
        
        result = await session.execute(select(User.id))
        user_ids = [row[0] for row in result.fetchall()]
        
        if not project_ids or not user_ids:
            logger.warning("No projects or users found for agent interaction seeding")
            return []
        
        interactions_data = [
            {
                "project_id": project_ids[0],
                "user_id": user_ids[0],
                "agent_action": "predicate_search",
                "input_data": {
                    "device_description": "Wearable ECG monitor",
                    "intended_use": "Continuous cardiac monitoring"
                },
                "output_data": {
                    "predicates_found": 5,
                    "top_match": "K193456",
                    "confidence": 0.89
                },
                "confidence_score": 0.89,
                "sources": [
                    {
                        "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K193456",
                        "title": "510(k) Summary K193456"
                    }
                ],
                "reasoning": "Found 5 potential predicates based on intended use similarity. K193456 shows highest technological similarity.",
                "execution_time_ms": 2340
            },
            {
                "project_id": project_ids[0],
                "user_id": user_ids[0],
                "agent_action": "device_classification",
                "input_data": {
                    "device_description": "Wearable ECG monitor for cardiac rhythm monitoring"
                },
                "output_data": {
                    "device_class": "II",
                    "product_code": "DPS",
                    "regulatory_pathway": "510k"
                },
                "confidence_score": 0.92,
                "sources": [
                    {
                        "url": "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=870.2300",
                        "title": "21 CFR 870.2300"
                    }
                ],
                "reasoning": "Device classified as Class II based on CFR 870.2300 for electrocardiograph devices.",
                "execution_time_ms": 1560
            }
        ]
        
        interactions = []
        for interaction_data in interactions_data:
            interaction = AgentInteraction(**interaction_data)
            session.add(interaction)
            interactions.append(interaction)
        
        await session.flush()
        logger.info(f"Seeded {len(interactions)} agent interactions")
        return interactions
    
    async def seed_project_documents(self, session: AsyncSession) -> List[ProjectDocument]:
        """Seed sample project documents"""
        from sqlalchemy import select
        # Get projects first
        result = await session.execute(select(Project.id))
        project_ids = [row[0] for row in result.fetchall()]
        
        if not project_ids:
            logger.warning("No projects found for document seeding")
            return []
        
        documents_data = [
            {
                "project_id": project_ids[0],
                "filename": "device_description.md",
                "file_path": "/projects/cardiac_monitor/device_description.md",
                "document_type": "device_specification",
                "content_markdown": "# Cardiac Monitoring Device\n\n## Overview\nWearable ECG monitor for continuous cardiac rhythm monitoring...",
                "metadata": {
                    "version": "1.0",
                    "author": "John Doe",
                    "last_modified": "2024-01-15"
                }
            },
            {
                "project_id": project_ids[0],
                "filename": "predicate_analysis.md",
                "file_path": "/projects/cardiac_monitor/predicate_analysis.md",
                "document_type": "regulatory_analysis",
                "content_markdown": "# Predicate Device Analysis\n\n## Selected Predicate: K193456\n\n### Similarities\n- Intended use...",
                "metadata": {
                    "version": "1.2",
                    "author": "John Doe",
                    "analysis_date": "2024-01-20"
                }
            }
        ]
        
        documents = []
        for document_data in documents_data:
            document = ProjectDocument(**document_data)
            session.add(document)
            documents.append(document)
        
        await session.flush()
        logger.info(f"Seeded {len(documents)} project documents")
        return documents
    
    async def clear_all_data(self) -> None:
        """Clear all data from database"""
        from sqlalchemy import text
        async with self.db_manager.get_session() as session:
            # Delete in reverse order of dependencies
            await session.execute(text("DELETE FROM project_documents"))
            await session.execute(text("DELETE FROM agent_interactions"))
            await session.execute(text("DELETE FROM predicate_devices"))
            await session.execute(text("DELETE FROM device_classifications"))
            await session.execute(text("DELETE FROM projects"))
            await session.execute(text("DELETE FROM users"))
            
        logger.info("All data cleared from database")


async def seed_database() -> None:
    """Convenience function to seed the database"""
    seeder = DatabaseSeeder()
    await seeder.seed_all()


async def clear_database() -> None:
    """Convenience function to clear the database"""
    seeder = DatabaseSeeder()
    await seeder.clear_all_data()