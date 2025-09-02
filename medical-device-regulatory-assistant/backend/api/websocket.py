"""
WebSocket endpoints for real-time updates.
"""

import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from services.auth import get_current_user_ws, TokenData

logger = logging.getLogger(__name__)

router = APIRouter()

# Connection manager for WebSocket connections
class ConnectionManager:
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store project subscriptions by user_id -> set of project_ids
        self.project_subscriptions: Dict[str, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
            self.project_subscriptions[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            # Clean up empty sets
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.project_subscriptions:
                    del self.project_subscriptions[user_id]
        
        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to all connections for a specific user."""
        if user_id in self.active_connections:
            disconnected = set()
            
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Clean up disconnected websockets
            for websocket in disconnected:
                self.active_connections[user_id].discard(websocket)

    async def send_project_update(self, message: dict, project_id: int, user_id: str):
        """Send a project-specific update to subscribed users."""
        if (user_id in self.project_subscriptions and 
            project_id in self.project_subscriptions[user_id]):
            
            message['project_id'] = project_id
            await self.send_personal_message(message, user_id)

    def subscribe_to_project(self, user_id: str, project_id: int):
        """Subscribe a user to project updates."""
        if user_id not in self.project_subscriptions:
            self.project_subscriptions[user_id] = set()
        
        self.project_subscriptions[user_id].add(project_id)
        logger.info(f"User {user_id} subscribed to project {project_id}")

    def unsubscribe_from_project(self, user_id: str, project_id: int):
        """Unsubscribe a user from project updates."""
        if user_id in self.project_subscriptions:
            self.project_subscriptions[user_id].discard(project_id)
            logger.info(f"User {user_id} unsubscribed from project {project_id}")

    async def broadcast_to_all(self, message: dict):
        """Broadcast a message to all connected users."""
        for user_id in self.active_connections:
            await self.send_personal_message(message, user_id)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates.
    
    Expects authentication token as query parameter: ?token=jwt_token
    """
    try:
        # Get token from query parameters
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=4001, reason="Authentication token required")
            return

        # Validate token and get user info
        try:
            user_data = await get_current_user_ws(token)
            user_id = user_data.sub
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {e}")
            await websocket.close(code=4001, reason="Invalid authentication token")
            return

        # Accept connection
        await manager.connect(websocket, user_id)
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "user_id": user_id,
            "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
        }))

        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                await handle_websocket_message(message, user_id)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Internal server error"
                }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if 'user_id' in locals():
            manager.disconnect(websocket, user_id)


async def handle_websocket_message(message: dict, user_id: str):
    """Handle incoming WebSocket messages from clients."""
    message_type = message.get("type")
    
    if message_type == "subscribe":
        project_id = message.get("project_id")
        if project_id:
            manager.subscribe_to_project(user_id, project_id)
    
    elif message_type == "unsubscribe":
        project_id = message.get("project_id")
        if project_id:
            manager.unsubscribe_from_project(user_id, project_id)
    
    elif message_type == "ping":
        # Respond to ping with pong
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
        }, user_id)
    
    else:
        logger.warning(f"Unknown message type: {message_type}")


# Functions to be called from other parts of the application
async def notify_project_updated(project_id: int, user_id: str, data: dict):
    """Notify clients about project updates."""
    message = {
        "type": "project_updated",
        "data": data,
        "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
    }
    await manager.send_project_update(message, project_id, user_id)


async def notify_classification_completed(project_id: int, user_id: str, classification_data: dict):
    """Notify clients about completed device classification."""
    message = {
        "type": "classification_completed",
        "data": classification_data,
        "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
    }
    await manager.send_project_update(message, project_id, user_id)


async def notify_predicate_search_completed(project_id: int, user_id: str, search_results: dict):
    """Notify clients about completed predicate search."""
    message = {
        "type": "predicate_search_completed",
        "data": search_results,
        "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
    }
    await manager.send_project_update(message, project_id, user_id)


async def notify_agent_interaction(project_id: int, user_id: str, interaction_data: dict):
    """Notify clients about agent interactions."""
    message = {
        "type": "agent_interaction",
        "data": interaction_data,
        "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
    }
    await manager.send_project_update(message, project_id, user_id)


async def notify_dashboard_update(project_id: int, user_id: str, update_type: str, data: dict):
    """Notify clients about dashboard updates."""
    message = {
        "type": "dashboard_update",
        "update_type": update_type,
        "data": data,
        "project_id": project_id,
        "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
    }
    await manager.send_project_update(message, project_id, user_id)


async def notify_progress_updated(project_id: int, user_id: str, progress_data: dict):
    """Notify clients about progress updates."""
    message = {
        "type": "progress_updated",
        "data": progress_data,
        "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
    }
    await manager.send_project_update(message, project_id, user_id)


async def notify_activity_added(project_id: int, user_id: str, activity_data: dict):
    """Notify clients about new activity."""
    message = {
        "type": "activity_added",
        "data": activity_data,
        "timestamp": "2024-01-01T00:00:00Z"  # This would be actual timestamp
    }
    await manager.send_project_update(message, project_id, user_id)


# Export the manager for use in other modules
__all__ = [
    "router",
    "manager",
    "notify_project_updated",
    "notify_classification_completed", 
    "notify_predicate_search_completed",
    "notify_agent_interaction",
    "notify_dashboard_update",
    "notify_progress_updated",
    "notify_activity_added"
]