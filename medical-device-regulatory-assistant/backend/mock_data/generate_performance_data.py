#!/usr/bin/env python3
"""
Script to generate large volumes of mock data for performance testing.
This script creates JSON configuration files with high-volume data scenarios.
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any

class PerformanceDataGenerator:
    """Generate large volumes of mock data for performance testing"""
    
    def __init__(self):
        self.device_types = [
            "Cardiac Monitor", "Glucose Meter", "Pulse Oximeter", "Blood Pressure Monitor",
            "Thermometer", "Stethoscope", "Ultrasound System", "X-Ray System",
            "MRI Scanner", "CT Scanner", "Defibrillator", "Ventilator",
            "Infusion Pump", "Dialysis Machine", "Surgical Robot", "Endoscope"
        ]
        
        self.product_codes = [
            "DPS", "NBW", "DQA", "BPN", "FLL", "DRG", "IYN", "JAK",
            "LNH", "JAA", "MKJ", "BYG", "LZG", "KDI", "IYE", "GAG"
        ]
        
        self.priorities = ["high", "medium", "low"]
        self.statuses = ["draft", "in_progress", "completed"]
        
        self.base_k_numbers = [
            "K19", "K20", "K21", "K18", "K17", "K16", "K15", "K14"
        ]
    
    def generate_k_number(self) -> str:
        """Generate a realistic K-number"""
        base = random.choice(self.base_k_numbers)
        suffix = str(random.randint(1000, 9999))
        return f"{base}{suffix}"
    
    def generate_clearance_date(self) -> str:
        """Generate a realistic clearance date"""
        start_date = datetime(2015, 1, 1)
        end_date = datetime(2023, 12, 31)
        random_date = start_date + timedelta(
            days=random.randint(0, (end_date - start_date).days)
        )
        return random_date.strftime("%Y-%m-%d")
    
    def generate_predicate_devices(self, project_name: str, count: int = 50) -> List[Dict[str, Any]]:
        """Generate multiple predicate devices for a project"""
        predicates = []
        
        for i in range(count):
            predicate = {
                "project_name": project_name,
                "k_number": self.generate_k_number(),
                "device_name": f"Predicate Device {i+1} for {project_name[:20]}",
                "intended_use": f"Similar intended use for predicate device {i+1}",
                "product_code": random.choice(self.product_codes),
                "clearance_date": self.generate_clearance_date(),
                "confidence_score": round(random.uniform(0.6, 0.98), 2),
                "is_selected": i < 3,  # Select top 3 predicates
                "comparison_data": {
                    "similarities": [
                        f"Similar technology approach {i+1}",
                        f"Comparable intended use {i+1}",
                        f"Same regulatory classification {i+1}"
                    ],
                    "differences": [
                        f"Enhanced feature set {i+1}",
                        f"Improved performance metrics {i+1}",
                        f"Updated design approach {i+1}"
                    ],
                    "risk_assessment": random.choice(["low", "medium", "high"]),
                    "testing_recommendations": [
                        f"Validation testing {i+1}",
                        f"Performance comparison {i+1}",
                        f"Safety assessment {i+1}"
                    ]
                }
            }
            predicates.append(predicate)
        
        return predicates
    
    def generate_agent_interactions(self, project_name: str, user_email: str, count: int = 20) -> List[Dict[str, Any]]:
        """Generate multiple agent interactions for a project"""
        interactions = []
        
        actions = [
            "device_classification", "predicate_search", "predicate_comparison",
            "fda_guidance_search", "regulatory_pathway_analysis", "testing_requirements",
            "biocompatibility_assessment", "clinical_evaluation", "risk_analysis",
            "submission_checklist"
        ]
        
        for i in range(count):
            action = random.choice(actions)
            interaction = {
                "project_name": project_name,
                "user_email": user_email,
                "agent_action": action,
                "input_data": {
                    "device_description": f"Input data for {action} interaction {i+1}",
                    "parameters": f"Additional parameters for interaction {i+1}"
                },
                "output_data": {
                    "result": f"Output result for {action} interaction {i+1}",
                    "details": f"Detailed results for interaction {i+1}",
                    "recommendations": [f"Recommendation {j+1}" for j in range(3)]
                },
                "confidence_score": round(random.uniform(0.5, 0.95), 2),
                "reasoning": f"Detailed reasoning for {action} interaction {i+1} with comprehensive analysis",
                "execution_time_ms": random.randint(1000, 10000)
            }
            interactions.append(interaction)
        
        return interactions
    
    def generate_high_volume_config(self, 
                                   num_projects: int = 10,
                                   predicates_per_project: int = 50,
                                   interactions_per_project: int = 20) -> Dict[str, Any]:
        """Generate high-volume configuration for performance testing"""
        
        config = {
            "users": [
                {
                    "google_id": "perf_user_high_volume",
                    "email": "high.volume@performance.test",
                    "name": "High Volume Performance Test User",
                    "avatar_url": "https://example.com/high-volume-avatar.jpg"
                }
            ],
            "projects": [],
            "device_classifications": [],
            "predicate_devices": [],
            "agent_interactions": []
        }
        
        # Generate projects
        for i in range(num_projects):
            project = {
                "name": f"High Volume Performance Project {i+1}",
                "description": f"Performance testing project {i+1} with extensive data for load testing and performance validation",
                "device_type": random.choice(self.device_types),
                "intended_use": f"Intended use for performance testing project {i+1} with detailed requirements",
                "status": random.choice(self.statuses),
                "priority": random.choice(self.priorities),
                "tags": [f"performance-{i+1}", "high-volume", "load-test", random.choice(["cardiac", "glucose", "surgical"])],
                "user_email": "high.volume@performance.test"
            }
            config["projects"].append(project)
            
            # Generate classification
            classification = {
                "project_name": project["name"],
                "device_class": random.choice(["I", "II", "III"]),
                "product_code": random.choice(self.product_codes),
                "regulatory_pathway": random.choice(["510k", "PMA", "De Novo"]),
                "cfr_sections": [f"21 CFR {random.randint(800, 899)}.{random.randint(1000, 9999)}"],
                "confidence_score": round(random.uniform(0.7, 0.98), 2),
                "reasoning": f"Classification reasoning for high volume project {i+1}"
            }
            config["device_classifications"].append(classification)
            
            # Generate predicate devices
            predicates = self.generate_predicate_devices(project["name"], predicates_per_project)
            config["predicate_devices"].extend(predicates)
            
            # Generate agent interactions
            interactions = self.generate_agent_interactions(
                project["name"], 
                "high.volume@performance.test", 
                interactions_per_project
            )
            config["agent_interactions"].extend(interactions)
        
        return config
    
    def save_config(self, config: Dict[str, Any], filename: str) -> None:
        """Save configuration to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print(f"Generated configuration saved to {filename}")
        print(f"  - Projects: {len(config['projects'])}")
        print(f"  - Predicate Devices: {len(config['predicate_devices'])}")
        print(f"  - Agent Interactions: {len(config['agent_interactions'])}")

def main():
    """Generate performance test configurations"""
    generator = PerformanceDataGenerator()
    
    # Generate small high-volume config (for CI/testing)
    small_config = generator.generate_high_volume_config(
        num_projects=5,
        predicates_per_project=20,
        interactions_per_project=10
    )
    generator.save_config(small_config, "high_volume_small_config.json")
    
    # Generate medium high-volume config (for development testing)
    medium_config = generator.generate_high_volume_config(
        num_projects=10,
        predicates_per_project=50,
        interactions_per_project=20
    )
    generator.save_config(medium_config, "high_volume_medium_config.json")
    
    # Generate large high-volume config (for stress testing)
    large_config = generator.generate_high_volume_config(
        num_projects=25,
        predicates_per_project=100,
        interactions_per_project=50
    )
    generator.save_config(large_config, "high_volume_large_config.json")

if __name__ == "__main__":
    main()