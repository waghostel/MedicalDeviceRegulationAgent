-- Production database initialization script
-- Medical Device Regulatory Assistant

-- Create database if not exists (handled by Docker)
-- CREATE DATABASE IF NOT EXISTS medical_device_assistant;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_type VARCHAR(100),
    intended_use TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create device_classifications table
CREATE TABLE IF NOT EXISTS device_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    device_class VARCHAR(10),
    product_code VARCHAR(10),
    regulatory_pathway VARCHAR(50),
    cfr_sections JSONB,
    confidence_score DECIMAL(3,2),
    reasoning TEXT,
    sources JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create predicate_devices table
CREATE TABLE IF NOT EXISTS predicate_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    k_number VARCHAR(20) NOT NULL,
    device_name VARCHAR(500),
    intended_use TEXT,
    product_code VARCHAR(10),
    clearance_date DATE,
    confidence_score DECIMAL(3,2),
    comparison_data JSONB,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create agent_interactions table (audit trail)
CREATE TABLE IF NOT EXISTS agent_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_action VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    confidence_score DECIMAL(3,2),
    sources JSONB,
    reasoning TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create project_documents table
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    document_type VARCHAR(50),
    content_markdown TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_device_classifications_project_id ON device_classifications(project_id);
CREATE INDEX IF NOT EXISTS idx_predicate_devices_project_id ON predicate_devices(project_id);
CREATE INDEX IF NOT EXISTS idx_predicate_devices_k_number ON predicate_devices(k_number);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_project_id ON agent_interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_user_id ON agent_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_created_at ON agent_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON project_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (for testing)
INSERT INTO users (email, name, google_id) 
VALUES ('admin@example.com', 'Admin User', 'admin_google_id')
ON CONFLICT (email) DO NOTHING;