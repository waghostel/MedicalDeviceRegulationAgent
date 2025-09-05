"""
Session Manager for Agent Integration
Manages agent sessions, conversation history, and context persistence
"""

import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import aiosqlite

from agents.regulatory_agent import RegulatoryAgent


@dataclass
class SessionMetadata:
    """Metadata for an agent session"""
    session_id: str
    user_id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
    status: str
    device_description: str
    intended_use: str
    device_type: Optional[str] = None


class SessionManager:
    """
    Manages agent sessions with persistence and cleanup
    """
    
    def __init__(self, db_path: str = "medical_device_assistant.db"):
        self.db_path = db_path
        self.active_sessions: Dict[str, RegulatoryAgent] = {}
        self.session_metadata: Dict[str, SessionMetadata] = {}
        self.cleanup_interval = 3600  # 1 hour
        self.session_timeout = 86400  # 24 hours
        self._cleanup_task = None
        
        # Initialize database on first use
        self._db_initialized = False
    
    async def initialize_database(self):
        """Initialize database tables for session management"""
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS agent_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    status TEXT NOT NULL,
                    device_description TEXT NOT NULL,
                    intended_use TEXT NOT NULL,
                    device_type TEXT,
                    session_data TEXT,
                    conversation_history TEXT
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_user_id 
                ON agent_sessions(user_id)
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_project_id 
                ON agent_sessions(project_id)
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_updated_at 
                ON agent_sessions(updated_at)
            """)
            
            await db.commit()
    
    async def store_session(
        self,
        session_id: str,
        agent: RegulatoryAgent,
        metadata: Optional[SessionMetadata] = None
    ) -> None:
        """Store an agent session"""
        
        # Store in memory
        self.active_sessions[session_id] = agent
        
        if metadata:
            self.session_metadata[session_id] = metadata
            
            # Persist to database
            await self._persist_session(session_id, metadata, agent)
    
    async def get_session(self, session_id: str) -> Optional[RegulatoryAgent]:
        """Get an agent session by ID"""
        
        # Check memory first
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]
        
        # Try to load from database
        agent = await self._load_session_from_db(session_id)
        if agent:
            self.active_sessions[session_id] = agent
            return agent
        
        return None
    
    async def get_user_sessions(self, user_id: str) -> Dict[str, RegulatoryAgent]:
        """Get all sessions for a user"""
        
        user_sessions = {}
        
        # Get from memory
        for session_id, agent in self.active_sessions.items():
            metadata = self.session_metadata.get(session_id)
            if metadata and metadata.user_id == user_id:
                user_sessions[session_id] = agent
        
        # Load additional sessions from database
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT session_id FROM agent_sessions WHERE user_id = ? AND updated_at > ?",
                (user_id, (datetime.utcnow() - timedelta(hours=24)).isoformat())
            ) as cursor:
                async for row in cursor:
                    session_id = row[0]
                    if session_id not in user_sessions:
                        agent = await self._load_session_from_db(session_id)
                        if agent:
                            user_sessions[session_id] = agent
        
        return user_sessions
    
    async def get_project_sessions(self, project_id: str) -> Dict[str, RegulatoryAgent]:
        """Get all sessions for a project"""
        
        project_sessions = {}
        
        # Get from memory
        for session_id, agent in self.active_sessions.items():
            metadata = self.session_metadata.get(session_id)
            if metadata and metadata.project_id == project_id:
                project_sessions[session_id] = agent
        
        # Load additional sessions from database
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT session_id FROM agent_sessions WHERE project_id = ? AND updated_at > ?",
                (project_id, (datetime.utcnow() - timedelta(hours=24)).isoformat())
            ) as cursor:
                async for row in cursor:
                    session_id = row[0]
                    if session_id not in project_sessions:
                        agent = await self._load_session_from_db(session_id)
                        if agent:
                            project_sessions[session_id] = agent
        
        return project_sessions
    
    async def update_session(
        self,
        session_id: str,
        agent: RegulatoryAgent,
        metadata: Optional[SessionMetadata] = None
    ) -> None:
        """Update an existing session"""
        
        if session_id in self.active_sessions:
            self.active_sessions[session_id] = agent
            
            if metadata:
                metadata.updated_at = datetime.utcnow()
                self.session_metadata[session_id] = metadata
                await self._persist_session(session_id, metadata, agent)
    
    async def remove_session(self, session_id: str) -> bool:
        """Remove a session from memory and database"""
        
        # Remove from memory
        removed = False
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            removed = True
        
        if session_id in self.session_metadata:
            del self.session_metadata[session_id]
        
        # Remove from database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM agent_sessions WHERE session_id = ?",
                (session_id,)
            )
            await db.commit()
        
        return removed
    
    async def get_active_session_count(self) -> int:
        """Get count of active sessions"""
        return len(self.active_sessions)
    
    async def get_session_metadata(self, session_id: str) -> Optional[SessionMetadata]:
        """Get metadata for a session"""
        
        # Check memory first
        if session_id in self.session_metadata:
            return self.session_metadata[session_id]
        
        # Initialize database if needed
        if not self._db_initialized:
            await self.initialize_database()
            self._db_initialized = True
        
        # Load from database
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT session_id, user_id, project_id, created_at, updated_at, 
                   status, device_description, intended_use, device_type
                   FROM agent_sessions WHERE session_id = ?""",
                (session_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    metadata = SessionMetadata(
                        session_id=row[0],
                        user_id=row[1],
                        project_id=row[2],
                        created_at=datetime.fromisoformat(row[3]),
                        updated_at=datetime.fromisoformat(row[4]),
                        status=row[5],
                        device_description=row[6],
                        intended_use=row[7],
                        device_type=row[8]
                    )
                    self.session_metadata[session_id] = metadata
                    return metadata
        
        return None
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions"""
        
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.session_timeout)
        expired_sessions = []
        
        # Find expired sessions in memory
        for session_id, metadata in self.session_metadata.items():
            if metadata.updated_at < cutoff_time:
                expired_sessions.append(session_id)
        
        # Remove expired sessions
        for session_id in expired_sessions:
            await self.remove_session(session_id)
        
        # Clean up database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM agent_sessions WHERE updated_at < ?",
                (cutoff_time.isoformat(),)
            )
            await db.commit()
        
        return len(expired_sessions)
    
    async def get_conversation_history(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get conversation history for a session"""
        
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT conversation_history FROM agent_sessions WHERE session_id = ?",
                (session_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row and row[0]:
                    try:
                        history = json.loads(row[0])
                        if limit:
                            return history[-limit:]
                        return history
                    except json.JSONDecodeError:
                        return []
        
        return []
    
    async def add_conversation_message(
        self,
        session_id: str,
        message: Dict[str, Any]
    ) -> None:
        """Add a message to conversation history"""
        
        # Get current history
        history = await self.get_conversation_history(session_id)
        
        # Add new message
        message["timestamp"] = datetime.utcnow().isoformat()
        history.append(message)
        
        # Keep only last 100 messages
        if len(history) > 100:
            history = history[-100:]
        
        # Update database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE agent_sessions SET conversation_history = ?, updated_at = ? WHERE session_id = ?",
                (json.dumps(history), datetime.utcnow().isoformat(), session_id)
            )
            await db.commit()
    
    async def _persist_session(
        self,
        session_id: str,
        metadata: SessionMetadata,
        agent: RegulatoryAgent
    ) -> None:
        """Persist session to database"""
        
        try:
            # Get session state for serialization
            session_state = await agent.get_session_state(session_id)
            session_data = json.dumps(session_state)
        except Exception:
            session_data = "{}"
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT OR REPLACE INTO agent_sessions 
                   (session_id, user_id, project_id, created_at, updated_at, 
                    status, device_description, intended_use, device_type, 
                    session_data, conversation_history)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    metadata.session_id,
                    metadata.user_id,
                    metadata.project_id,
                    metadata.created_at.isoformat(),
                    metadata.updated_at.isoformat(),
                    metadata.status,
                    metadata.device_description,
                    metadata.intended_use,
                    metadata.device_type,
                    session_data,
                    "[]"  # Initialize empty conversation history
                )
            )
            await db.commit()
    
    async def _load_session_from_db(self, session_id: str) -> Optional[RegulatoryAgent]:
        """Load session from database"""
        
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT user_id, project_id, device_description, intended_use, 
                   device_type, session_data, status, created_at, updated_at
                   FROM agent_sessions WHERE session_id = ?""",
                (session_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                
                try:
                    # Create new agent instance
                    agent = RegulatoryAgent()
                    
                    # Restore session state if available
                    if row[5]:  # session_data
                        session_data = json.loads(row[5])
                        # Here you would restore the agent state
                        # This is simplified - in practice you'd need to properly
                        # deserialize the LangGraph state
                    
                    # Store metadata
                    metadata = SessionMetadata(
                        session_id=session_id,
                        user_id=row[0],
                        project_id=row[1],
                        device_description=row[2],
                        intended_use=row[3],
                        device_type=row[4],
                        status=row[6],
                        created_at=datetime.fromisoformat(row[7]),
                        updated_at=datetime.fromisoformat(row[8])
                    )
                    
                    self.session_metadata[session_id] = metadata
                    
                    return agent
                    
                except Exception as e:
                    print(f"Failed to load session {session_id}: {e}")
                    return None
    
    async def start_cleanup_task(self) -> None:
        """Start the periodic cleanup task"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
    
    async def stop_cleanup_task(self) -> None:
        """Stop the periodic cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
    
    async def _periodic_cleanup(self) -> None:
        """Periodic cleanup of expired sessions"""
        
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                cleaned_count = await self.cleanup_expired_sessions()
                if cleaned_count > 0:
                    print(f"Cleaned up {cleaned_count} expired sessions")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error during session cleanup: {e}")
    
    async def get_session_stats(self) -> Dict[str, Any]:
        """Get session statistics"""
        
        active_count = len(self.active_sessions)
        
        # Get database stats
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT COUNT(*) FROM agent_sessions") as cursor:
                total_count = (await cursor.fetchone())[0]
            
            async with db.execute(
                "SELECT COUNT(*) FROM agent_sessions WHERE updated_at > ?",
                ((datetime.utcnow() - timedelta(hours=24)).isoformat(),)
            ) as cursor:
                recent_count = (await cursor.fetchone())[0]
        
        return {
            "active_sessions": active_count,
            "total_sessions": total_count,
            "recent_sessions": recent_count,
            "cleanup_interval": self.cleanup_interval,
            "session_timeout": self.session_timeout
        }