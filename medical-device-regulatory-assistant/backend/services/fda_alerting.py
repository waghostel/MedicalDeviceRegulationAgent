"""
FDA API Alerting System

This service provides comprehensive alerting for FDA API integration:
- Real-time alert processing
- Multiple notification channels (email, Slack, PagerDuty)
- Alert escalation and de-escalation
- Alert correlation and grouping
- Notification rate limiting
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set, Callable
from dataclasses import dataclass, field
from enum import Enum
try:
    import smtplib
    from email.mime.text import MimeText
    from email.mime.multipart import MimeMultipart
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False

import structlog
import httpx

try:
    from .fda_monitoring import AlertType, AlertRule
except ImportError:
    # Fallback for testing
    from enum import Enum
    
    class AlertType(Enum):
        HIGH_ERROR_RATE = "high_error_rate"
        RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    
    class AlertRule:
        def __init__(self, name, alert_type, threshold, time_window_minutes, severity, notification_channels):
            self.name = name
            self.alert_type = alert_type
            self.threshold = threshold
            self.time_window_minutes = time_window_minutes
            self.severity = severity
            self.notification_channels = notification_channels

try:
    from .error_tracking import AlertSeverity
except ImportError:
    from enum import Enum
    
    class AlertSeverity(Enum):
        CRITICAL = "critical"
        HIGH = "high"
        MEDIUM = "medium"
        LOW = "low"

logger = structlog.get_logger(__name__)


class NotificationChannel(Enum):
    """Notification channel types"""
    EMAIL = "email"
    SLACK = "slack"
    PAGERDUTY = "pagerduty"
    WEBHOOK = "webhook"
    SMS = "sms"


class AlertStatus(Enum):
    """Alert status states"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class Alert:
    """Alert data structure"""
    id: str
    rule_name: str
    alert_type: AlertType
    severity: AlertSeverity
    status: AlertStatus
    title: str
    description: str
    triggered_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_by: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    notification_channels: List[NotificationChannel] = field(default_factory=list)
    escalation_level: int = 0
    correlation_id: Optional[str] = None


@dataclass
class NotificationConfig:
    """Notification channel configuration"""
    channel: NotificationChannel
    enabled: bool = True
    config: Dict[str, Any] = field(default_factory=dict)
    rate_limit_minutes: int = 5
    last_sent: Optional[datetime] = None


class FDAAlertingService:
    """
    Comprehensive alerting service for FDA API monitoring
    """
    
    def __init__(
        self,
        enable_notifications: bool = True,
        max_alerts_per_hour: int = 100,
        correlation_window_minutes: int = 5
    ):
        self.enable_notifications = enable_notifications
        self.max_alerts_per_hour = max_alerts_per_hour
        self.correlation_window_minutes = correlation_window_minutes
        
        # Alert storage
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.max_history_size = 10000
        
        # Notification configuration
        self.notification_configs: Dict[NotificationChannel, NotificationConfig] = {}
        self._init_default_notification_configs()
        
        # Rate limiting
        self.notification_counts: Dict[str, List[datetime]] = {}
        
        # Alert correlation
        self.correlation_groups: Dict[str, List[str]] = {}
        
        # Background tasks
        self._cleanup_task: Optional[asyncio.Task] = None
        self._escalation_task: Optional[asyncio.Task] = None
        self._running = False
        
        logger.info("FDA Alerting Service initialized")
    
    def _init_default_notification_configs(self):
        """Initialize default notification configurations"""
        self.notification_configs = {
            NotificationChannel.EMAIL: NotificationConfig(
                channel=NotificationChannel.EMAIL,
                enabled=True,
                config={
                    "smtp_server": "localhost",
                    "smtp_port": 587,
                    "username": "",
                    "password": "",
                    "from_email": "alerts@medical-device-assistant.com",
                    "to_emails": ["admin@medical-device-assistant.com"]
                },
                rate_limit_minutes=5
            ),
            NotificationChannel.SLACK: NotificationConfig(
                channel=NotificationChannel.SLACK,
                enabled=False,
                config={
                    "webhook_url": "",
                    "channel": "#alerts",
                    "username": "FDA API Monitor"
                },
                rate_limit_minutes=2
            ),
            NotificationChannel.PAGERDUTY: NotificationConfig(
                channel=NotificationChannel.PAGERDUTY,
                enabled=False,
                config={
                    "integration_key": "",
                    "service_name": "FDA API"
                },
                rate_limit_minutes=1
            ),
            NotificationChannel.WEBHOOK: NotificationConfig(
                channel=NotificationChannel.WEBHOOK,
                enabled=False,
                config={
                    "url": "",
                    "headers": {},
                    "timeout_seconds": 10
                },
                rate_limit_minutes=1
            )
        }
    
    async def start_background_tasks(self) -> None:
        """Start background alerting tasks"""
        if self._running:
            return
        
        self._running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        self._escalation_task = asyncio.create_task(self._escalation_loop())
        
        logger.info("FDA alerting background tasks started")
    
    async def stop_background_tasks(self) -> None:
        """Stop background alerting tasks"""
        self._running = False
        
        for task in [self._cleanup_task, self._escalation_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        logger.info("FDA alerting background tasks stopped")
    
    async def trigger_alert(
        self,
        rule: AlertRule,
        trigger_data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> str:
        """
        Trigger a new alert
        
        Args:
            rule: Alert rule that was triggered
            trigger_data: Data that triggered the alert
            user_id: Optional user ID associated with the trigger
        
        Returns:
            Alert ID
        """
        # Generate alert ID
        alert_id = f"fda_alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{rule.name.replace(' ', '_').lower()}"
        
        # Check for correlation with existing alerts
        correlation_id = await self._find_correlation(rule, trigger_data)
        
        # Create alert
        alert = Alert(
            id=alert_id,
            rule_name=rule.name,
            alert_type=rule.alert_type,
            severity=rule.severity,
            status=AlertStatus.ACTIVE,
            title=self._generate_alert_title(rule, trigger_data),
            description=self._generate_alert_description(rule, trigger_data),
            triggered_at=datetime.now(),
            metadata={
                "trigger_data": trigger_data,
                "user_id": user_id,
                "rule_config": {
                    "threshold": rule.threshold,
                    "time_window_minutes": rule.time_window_minutes
                }
            },
            notification_channels=[
                NotificationChannel(channel) for channel in rule.notification_channels
                if channel in [nc.value for nc in NotificationChannel]
            ],
            correlation_id=correlation_id
        )
        
        # Store alert
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Trim history if needed
        if len(self.alert_history) > self.max_history_size:
            self.alert_history = self.alert_history[-self.max_history_size:]
        
        # Handle correlation
        if correlation_id:
            if correlation_id not in self.correlation_groups:
                self.correlation_groups[correlation_id] = []
            self.correlation_groups[correlation_id].append(alert_id)
        
        # Send notifications
        if self.enable_notifications:
            await self._send_alert_notifications(alert)
        
        logger.info(
            "FDA alert triggered",
            alert_id=alert_id,
            rule_name=rule.name,
            alert_type=rule.alert_type.value,
            severity=rule.severity.value,
            correlation_id=correlation_id
        )
        
        return alert_id
    
    async def acknowledge_alert(
        self,
        alert_id: str,
        acknowledged_by: str,
        notes: Optional[str] = None
    ) -> bool:
        """
        Acknowledge an active alert
        
        Args:
            alert_id: Alert ID to acknowledge
            acknowledged_by: User who acknowledged the alert
            notes: Optional acknowledgment notes
        
        Returns:
            True if alert was acknowledged, False if not found or already acknowledged
        """
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        
        if alert.status != AlertStatus.ACTIVE:
            return False
        
        # Update alert
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = datetime.now()
        alert.acknowledged_by = acknowledged_by
        
        if notes:
            alert.metadata["acknowledgment_notes"] = notes
        
        # Send acknowledgment notifications
        if self.enable_notifications:
            await self._send_acknowledgment_notifications(alert)
        
        logger.info(
            "FDA alert acknowledged",
            alert_id=alert_id,
            acknowledged_by=acknowledged_by,
            notes=notes
        )
        
        return True
    
    async def resolve_alert(
        self,
        alert_id: str,
        resolved_by: str,
        resolution_notes: Optional[str] = None
    ) -> bool:
        """
        Resolve an alert
        
        Args:
            alert_id: Alert ID to resolve
            resolved_by: User who resolved the alert
            resolution_notes: Optional resolution notes
        
        Returns:
            True if alert was resolved, False if not found
        """
        if alert_id not in self.active_alerts:
            return False
        
        alert = self.active_alerts[alert_id]
        
        # Update alert
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.now()
        alert.resolved_by = resolved_by
        
        if resolution_notes:
            alert.metadata["resolution_notes"] = resolution_notes
        
        # Remove from active alerts
        del self.active_alerts[alert_id]
        
        # Send resolution notifications
        if self.enable_notifications:
            await self._send_resolution_notifications(alert)
        
        logger.info(
            "FDA alert resolved",
            alert_id=alert_id,
            resolved_by=resolved_by,
            resolution_notes=resolution_notes
        )
        
        return True
    
    async def get_active_alerts(
        self,
        severity_filter: Optional[AlertSeverity] = None,
        alert_type_filter: Optional[AlertType] = None
    ) -> List[Dict[str, Any]]:
        """
        Get active alerts with optional filtering
        
        Args:
            severity_filter: Optional severity filter
            alert_type_filter: Optional alert type filter
        
        Returns:
            List of active alerts
        """
        alerts = []
        
        for alert in self.active_alerts.values():
            # Apply filters
            if severity_filter and alert.severity != severity_filter:
                continue
            if alert_type_filter and alert.alert_type != alert_type_filter:
                continue
            
            alerts.append({
                "id": alert.id,
                "rule_name": alert.rule_name,
                "alert_type": alert.alert_type.value,
                "severity": alert.severity.value,
                "status": alert.status.value,
                "title": alert.title,
                "description": alert.description,
                "triggered_at": alert.triggered_at.isoformat(),
                "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                "acknowledged_by": alert.acknowledged_by,
                "escalation_level": alert.escalation_level,
                "correlation_id": alert.correlation_id,
                "metadata": alert.metadata
            })
        
        # Sort by severity and trigger time
        severity_order = {
            AlertSeverity.CRITICAL: 0,
            AlertSeverity.HIGH: 1,
            AlertSeverity.MEDIUM: 2,
            AlertSeverity.LOW: 3
        }
        
        alerts.sort(key=lambda x: (severity_order.get(AlertSeverity(x["severity"]), 4), x["triggered_at"]))
        
        return alerts
    
    async def get_alert_history(
        self,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get alert history
        
        Args:
            hours: Time window in hours
            limit: Maximum number of alerts to return
        
        Returns:
            List of historical alerts
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        filtered_alerts = [
            alert for alert in self.alert_history
            if alert.triggered_at > cutoff_time
        ]
        
        # Sort by trigger time (most recent first)
        filtered_alerts.sort(key=lambda x: x.triggered_at, reverse=True)
        
        # Limit results
        filtered_alerts = filtered_alerts[:limit]
        
        return [
            {
                "id": alert.id,
                "rule_name": alert.rule_name,
                "alert_type": alert.alert_type.value,
                "severity": alert.severity.value,
                "status": alert.status.value,
                "title": alert.title,
                "description": alert.description,
                "triggered_at": alert.triggered_at.isoformat(),
                "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
                "acknowledged_by": alert.acknowledged_by,
                "resolved_by": alert.resolved_by,
                "correlation_id": alert.correlation_id,
                "metadata": alert.metadata
            }
            for alert in filtered_alerts
        ]
    
    async def get_alert_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get alert statistics
        
        Args:
            hours: Time window in hours
        
        Returns:
            Alert statistics and metrics
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Filter alerts in time window
        recent_alerts = [
            alert for alert in self.alert_history
            if alert.triggered_at > cutoff_time
        ]
        
        if not recent_alerts:
            return {
                "time_window_hours": hours,
                "total_alerts": 0,
                "active_alerts": 0,
                "resolved_alerts": 0,
                "acknowledged_alerts": 0,
                "by_severity": {},
                "by_type": {},
                "avg_resolution_time_minutes": 0,
                "escalated_alerts": 0
            }
        
        # Calculate statistics
        total_alerts = len(recent_alerts)
        active_alerts = len([a for a in recent_alerts if a.status == AlertStatus.ACTIVE])
        resolved_alerts = len([a for a in recent_alerts if a.status == AlertStatus.RESOLVED])
        acknowledged_alerts = len([a for a in recent_alerts if a.status == AlertStatus.ACKNOWLEDGED])
        
        # Group by severity
        by_severity = {}
        for alert in recent_alerts:
            severity = alert.severity.value
            by_severity[severity] = by_severity.get(severity, 0) + 1
        
        # Group by type
        by_type = {}
        for alert in recent_alerts:
            alert_type = alert.alert_type.value
            by_type[alert_type] = by_type.get(alert_type, 0) + 1
        
        # Calculate average resolution time
        resolved_with_times = [
            a for a in recent_alerts 
            if a.status == AlertStatus.RESOLVED and a.resolved_at
        ]
        
        if resolved_with_times:
            resolution_times = [
                (alert.resolved_at - alert.triggered_at).total_seconds() / 60
                for alert in resolved_with_times
            ]
            avg_resolution_time = sum(resolution_times) / len(resolution_times)
        else:
            avg_resolution_time = 0
        
        # Count escalated alerts
        escalated_alerts = len([a for a in recent_alerts if a.escalation_level > 0])
        
        return {
            "time_window_hours": hours,
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "resolved_alerts": resolved_alerts,
            "acknowledged_alerts": acknowledged_alerts,
            "by_severity": by_severity,
            "by_type": by_type,
            "avg_resolution_time_minutes": avg_resolution_time,
            "escalated_alerts": escalated_alerts,
            "correlation_groups": len(self.correlation_groups)
        }
    
    async def configure_notification_channel(
        self,
        channel: NotificationChannel,
        config: Dict[str, Any],
        enabled: bool = True
    ) -> None:
        """
        Configure notification channel
        
        Args:
            channel: Notification channel to configure
            config: Channel configuration
            enabled: Whether channel is enabled
        """
        if channel not in self.notification_configs:
            self.notification_configs[channel] = NotificationConfig(channel=channel)
        
        notification_config = self.notification_configs[channel]
        notification_config.enabled = enabled
        notification_config.config.update(config)
        
        logger.info(
            "Notification channel configured",
            channel=channel.value,
            enabled=enabled
        )
    
    # Private methods
    
    async def _find_correlation(
        self,
        rule: AlertRule,
        trigger_data: Dict[str, Any]
    ) -> Optional[str]:
        """Find correlation with existing alerts"""
        # Simple correlation based on alert type and recent timing
        correlation_window = datetime.now() - timedelta(minutes=self.correlation_window_minutes)
        
        for alert in self.active_alerts.values():
            if (alert.alert_type == rule.alert_type and 
                alert.triggered_at > correlation_window):
                return alert.correlation_id or alert.id
        
        return None
    
    def _generate_alert_title(self, rule: AlertRule, trigger_data: Dict[str, Any]) -> str:
        """Generate alert title"""
        endpoint = trigger_data.get("endpoint", "Unknown")
        
        if rule.alert_type == AlertType.HIGH_ERROR_RATE:
            return f"High Error Rate Detected - {endpoint}"
        elif rule.alert_type == AlertType.RATE_LIMIT_EXCEEDED:
            return f"FDA API Rate Limit Exceeded - {endpoint}"
        elif rule.alert_type == AlertType.SLOW_RESPONSE:
            return f"Slow Response Time Detected - {endpoint}"
        elif rule.alert_type == AlertType.CIRCUIT_BREAKER_OPEN:
            return f"Circuit Breaker Opened - {endpoint}"
        elif rule.alert_type == AlertType.API_UNAVAILABLE:
            return f"FDA API Unavailable - {endpoint}"
        else:
            return f"FDA API Alert - {rule.name}"
    
    def _generate_alert_description(self, rule: AlertRule, trigger_data: Dict[str, Any]) -> str:
        """Generate alert description"""
        base_description = f"Alert rule '{rule.name}' was triggered.\n\n"
        
        # Add trigger details
        if "endpoint" in trigger_data:
            base_description += f"Endpoint: {trigger_data['endpoint']}\n"
        if "status_code" in trigger_data:
            base_description += f"Status Code: {trigger_data['status_code']}\n"
        if "response_time_ms" in trigger_data:
            base_description += f"Response Time: {trigger_data['response_time_ms']}ms\n"
        if "error_type" in trigger_data:
            base_description += f"Error Type: {trigger_data['error_type']}\n"
        
        base_description += f"\nThreshold: {rule.threshold}\n"
        base_description += f"Time Window: {rule.time_window_minutes} minutes\n"
        base_description += f"Severity: {rule.severity.value}\n"
        
        return base_description
    
    async def _send_alert_notifications(self, alert: Alert) -> None:
        """Send notifications for new alert"""
        for channel in alert.notification_channels:
            try:
                if not await self._check_rate_limit(channel, alert):
                    continue
                
                await self._send_notification(channel, alert, "triggered")
                
            except Exception as e:
                logger.error(
                    "Failed to send alert notification",
                    channel=channel.value,
                    alert_id=alert.id,
                    error=str(e)
                )
    
    async def _send_acknowledgment_notifications(self, alert: Alert) -> None:
        """Send notifications for alert acknowledgment"""
        for channel in alert.notification_channels:
            try:
                await self._send_notification(channel, alert, "acknowledged")
            except Exception as e:
                logger.error(
                    "Failed to send acknowledgment notification",
                    channel=channel.value,
                    alert_id=alert.id,
                    error=str(e)
                )
    
    async def _send_resolution_notifications(self, alert: Alert) -> None:
        """Send notifications for alert resolution"""
        for channel in alert.notification_channels:
            try:
                await self._send_notification(channel, alert, "resolved")
            except Exception as e:
                logger.error(
                    "Failed to send resolution notification",
                    channel=channel.value,
                    alert_id=alert.id,
                    error=str(e)
                )
    
    async def _send_notification(
        self,
        channel: NotificationChannel,
        alert: Alert,
        action: str
    ) -> None:
        """Send notification to specific channel"""
        if channel not in self.notification_configs:
            return
        
        config = self.notification_configs[channel]
        if not config.enabled:
            return
        
        if channel == NotificationChannel.EMAIL:
            await self._send_email_notification(alert, action, config)
        elif channel == NotificationChannel.SLACK:
            await self._send_slack_notification(alert, action, config)
        elif channel == NotificationChannel.PAGERDUTY:
            await self._send_pagerduty_notification(alert, action, config)
        elif channel == NotificationChannel.WEBHOOK:
            await self._send_webhook_notification(alert, action, config)
    
    async def _send_email_notification(
        self,
        alert: Alert,
        action: str,
        config: NotificationConfig
    ) -> None:
        """Send email notification"""
        try:
            # Create email message
            msg = MimeMultipart()
            msg['From'] = config.config.get('from_email', 'alerts@medical-device-assistant.com')
            msg['To'] = ', '.join(config.config.get('to_emails', []))
            msg['Subject'] = f"[FDA API Alert {action.upper()}] {alert.title}"
            
            # Email body
            body = f"""
FDA API Alert {action.title()}

Alert ID: {alert.id}
Rule: {alert.rule_name}
Type: {alert.alert_type.value}
Severity: {alert.severity.value}
Status: {alert.status.value}

{alert.description}

Triggered: {alert.triggered_at.isoformat()}
"""
            
            if alert.acknowledged_at:
                body += f"Acknowledged: {alert.acknowledged_at.isoformat()} by {alert.acknowledged_by}\n"
            
            if alert.resolved_at:
                body += f"Resolved: {alert.resolved_at.isoformat()} by {alert.resolved_by}\n"
            
            msg.attach(MimeText(body, 'plain'))
            
            # Send email (would need actual SMTP configuration)
            logger.info(
                "Email notification sent",
                alert_id=alert.id,
                action=action,
                to_emails=config.config.get('to_emails', [])
            )
            
        except Exception as e:
            logger.error("Failed to send email notification", error=str(e))
    
    async def _send_slack_notification(
        self,
        alert: Alert,
        action: str,
        config: NotificationConfig
    ) -> None:
        """Send Slack notification"""
        try:
            webhook_url = config.config.get('webhook_url')
            if not webhook_url:
                return
            
            # Determine color based on severity
            color_map = {
                AlertSeverity.CRITICAL: "#FF0000",
                AlertSeverity.HIGH: "#FF8C00",
                AlertSeverity.MEDIUM: "#FFD700",
                AlertSeverity.LOW: "#32CD32"
            }
            
            color = color_map.get(alert.severity, "#808080")
            
            # Create Slack message
            payload = {
                "channel": config.config.get('channel', '#alerts'),
                "username": config.config.get('username', 'FDA API Monitor'),
                "attachments": [
                    {
                        "color": color,
                        "title": f"FDA API Alert {action.title()}",
                        "text": alert.title,
                        "fields": [
                            {"title": "Alert ID", "value": alert.id, "short": True},
                            {"title": "Rule", "value": alert.rule_name, "short": True},
                            {"title": "Type", "value": alert.alert_type.value, "short": True},
                            {"title": "Severity", "value": alert.severity.value, "short": True},
                            {"title": "Status", "value": alert.status.value, "short": True},
                            {"title": "Triggered", "value": alert.triggered_at.isoformat(), "short": True}
                        ],
                        "footer": "FDA API Monitor",
                        "ts": int(alert.triggered_at.timestamp())
                    }
                ]
            }
            
            # Send to Slack
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
            
            logger.info("Slack notification sent", alert_id=alert.id, action=action)
            
        except Exception as e:
            logger.error("Failed to send Slack notification", error=str(e))
    
    async def _send_pagerduty_notification(
        self,
        alert: Alert,
        action: str,
        config: NotificationConfig
    ) -> None:
        """Send PagerDuty notification"""
        try:
            integration_key = config.config.get('integration_key')
            if not integration_key:
                return
            
            # Map action to PagerDuty event action
            event_action_map = {
                "triggered": "trigger",
                "acknowledged": "acknowledge", 
                "resolved": "resolve"
            }
            
            event_action = event_action_map.get(action, "trigger")
            
            # Create PagerDuty event
            payload = {
                "routing_key": integration_key,
                "event_action": event_action,
                "dedup_key": alert.id,
                "payload": {
                    "summary": alert.title,
                    "source": "FDA API Monitor",
                    "severity": alert.severity.value.lower(),
                    "component": "FDA API",
                    "group": alert.alert_type.value,
                    "class": "api_monitoring",
                    "custom_details": {
                        "rule_name": alert.rule_name,
                        "alert_type": alert.alert_type.value,
                        "triggered_at": alert.triggered_at.isoformat(),
                        "metadata": alert.metadata
                    }
                }
            }
            
            # Send to PagerDuty
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=payload
                )
                response.raise_for_status()
            
            logger.info("PagerDuty notification sent", alert_id=alert.id, action=action)
            
        except Exception as e:
            logger.error("Failed to send PagerDuty notification", error=str(e))
    
    async def _send_webhook_notification(
        self,
        alert: Alert,
        action: str,
        config: NotificationConfig
    ) -> None:
        """Send webhook notification"""
        try:
            webhook_url = config.config.get('url')
            if not webhook_url:
                return
            
            # Create webhook payload
            payload = {
                "alert_id": alert.id,
                "action": action,
                "rule_name": alert.rule_name,
                "alert_type": alert.alert_type.value,
                "severity": alert.severity.value,
                "status": alert.status.value,
                "title": alert.title,
                "description": alert.description,
                "triggered_at": alert.triggered_at.isoformat(),
                "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
                "metadata": alert.metadata
            }
            
            headers = config.config.get('headers', {})
            timeout = config.config.get('timeout_seconds', 10)
            
            # Send webhook
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=timeout
                )
                response.raise_for_status()
            
            logger.info("Webhook notification sent", alert_id=alert.id, action=action)
            
        except Exception as e:
            logger.error("Failed to send webhook notification", error=str(e))
    
    async def _check_rate_limit(self, channel: NotificationChannel, alert: Alert) -> bool:
        """Check if notification is rate limited"""
        config = self.notification_configs.get(channel)
        if not config:
            return False
        
        now = datetime.now()
        rate_limit_key = f"{channel.value}_{alert.severity.value}"
        
        # Initialize if not exists
        if rate_limit_key not in self.notification_counts:
            self.notification_counts[rate_limit_key] = []
        
        # Clean old entries
        cutoff_time = now - timedelta(minutes=config.rate_limit_minutes)
        self.notification_counts[rate_limit_key] = [
            timestamp for timestamp in self.notification_counts[rate_limit_key]
            if timestamp > cutoff_time
        ]
        
        # Check rate limit (max 1 per rate_limit_minutes for same severity)
        if self.notification_counts[rate_limit_key]:
            return False
        
        # Add current notification
        self.notification_counts[rate_limit_key].append(now)
        return True
    
    async def _cleanup_loop(self) -> None:
        """Background cleanup loop"""
        while self._running:
            try:
                await self._cleanup_old_alerts()
                await asyncio.sleep(3600)  # Run every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Alert cleanup failed", error=str(e))
                await asyncio.sleep(300)  # Wait 5 minutes before retry
    
    async def _escalation_loop(self) -> None:
        """Background escalation loop"""
        while self._running:
            try:
                await self._check_escalations()
                await asyncio.sleep(300)  # Check every 5 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Alert escalation check failed", error=str(e))
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def _cleanup_old_alerts(self) -> None:
        """Clean up old resolved alerts"""
        cutoff_time = datetime.now() - timedelta(days=30)
        
        # Remove old alerts from history
        self.alert_history = [
            alert for alert in self.alert_history
            if alert.triggered_at > cutoff_time or alert.status == AlertStatus.ACTIVE
        ]
        
        # Clean up correlation groups
        active_alert_ids = set(self.active_alerts.keys())
        for correlation_id, alert_ids in list(self.correlation_groups.items()):
            # Keep only active alerts in correlation groups
            active_in_group = [aid for aid in alert_ids if aid in active_alert_ids]
            if active_in_group:
                self.correlation_groups[correlation_id] = active_in_group
            else:
                del self.correlation_groups[correlation_id]
    
    async def _check_escalations(self) -> None:
        """Check for alerts that need escalation"""
        now = datetime.now()
        
        for alert in self.active_alerts.values():
            # Skip if already acknowledged or resolved
            if alert.status != AlertStatus.ACTIVE:
                continue
            
            # Check if alert should be escalated (unacknowledged for 30 minutes)
            if (now - alert.triggered_at).total_seconds() > 1800:  # 30 minutes
                if alert.escalation_level == 0:
                    alert.escalation_level = 1
                    # Send escalation notification
                    logger.warning(
                        "Alert escalated - unacknowledged for 30 minutes",
                        alert_id=alert.id,
                        rule_name=alert.rule_name
                    )


# Global alerting service instance
_alerting_service: Optional[FDAAlertingService] = None


def get_fda_alerting_service() -> FDAAlertingService:
    """Get the global FDA alerting service instance"""
    global _alerting_service
    if _alerting_service is None:
        _alerting_service = FDAAlertingService()
    return _alerting_service


async def init_fda_alerting_service(
    enable_notifications: bool = True,
    max_alerts_per_hour: int = 100
) -> FDAAlertingService:
    """Initialize FDA alerting service"""
    global _alerting_service
    _alerting_service = FDAAlertingService(
        enable_notifications=enable_notifications,
        max_alerts_per_hour=max_alerts_per_hour
    )
    await _alerting_service.start_background_tasks()
    return _alerting_service