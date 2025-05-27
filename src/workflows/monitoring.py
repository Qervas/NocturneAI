"""
Workflow monitoring and visualization.

This module provides tools for monitoring workflow execution,
collecting metrics, and visualizing workflow progress.
"""

from typing import Dict, List, Any, Optional, Set, Union
from datetime import datetime, timezone
import logging
import json
import asyncio
from enum import Enum, auto
import uuid
from .base import WorkflowStatus, WorkflowContext, BaseWorkflow, WorkflowStep

logger = logging.getLogger(__name__)

class MetricType(Enum):
    """Types of metrics that can be collected during workflow execution"""
    EXECUTION_TIME = auto()     # Time taken to execute a workflow or step
    COMPLETION_RATE = auto()    # Percentage of steps completed
    ERROR_RATE = auto()         # Percentage of steps that failed
    TOKEN_USAGE = auto()        # Number of tokens used by LLM calls
    TOOL_USAGE = auto()         # Number of tool calls made
    MEMORY_USAGE = auto()       # Memory used during execution
    
class WorkflowEvent(Enum):
    """Types of events that can occur during workflow execution"""
    WORKFLOW_STARTED = auto()
    WORKFLOW_COMPLETED = auto()
    WORKFLOW_FAILED = auto()
    WORKFLOW_PAUSED = auto()
    WORKFLOW_RESUMED = auto()
    STEP_STARTED = auto()
    STEP_COMPLETED = auto()
    STEP_FAILED = auto()
    LLM_CALL_STARTED = auto()
    LLM_CALL_COMPLETED = auto()
    TOOL_CALL_STARTED = auto()
    TOOL_CALL_COMPLETED = auto()

class WorkflowMetric:
    """A metric collected during workflow execution"""
    
    def __init__(self, 
                 metric_type: MetricType, 
                 value: Any, 
                 workflow_id: str, 
                 step_name: Optional[str] = None,
                 timestamp: Optional[datetime] = None):
        self.metric_type = metric_type
        self.value = value
        self.workflow_id = workflow_id
        self.step_name = step_name
        self.timestamp = timestamp or datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the metric to a dictionary"""
        return {
            "metric_type": self.metric_type.name,
            "value": self.value,
            "workflow_id": self.workflow_id,
            "step_name": self.step_name,
            "timestamp": self.timestamp.isoformat()
        }

class WorkflowEventRecord:
    """A record of an event that occurred during workflow execution"""
    
    def __init__(self, 
                 event_type: WorkflowEvent, 
                 workflow_id: str, 
                 step_name: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None,
                 timestamp: Optional[datetime] = None):
        self.id = str(uuid.uuid4())
        self.event_type = event_type
        self.workflow_id = workflow_id
        self.step_name = step_name
        self.details = details or {}
        self.timestamp = timestamp or datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the event to a dictionary"""
        return {
            "id": self.id,
            "event_type": self.event_type.name,
            "workflow_id": self.workflow_id,
            "step_name": self.step_name,
            "details": self.details,
            "timestamp": self.timestamp.isoformat()
        }

class WorkflowMonitor:
    """
    Monitor for tracking workflow execution.
    
    This class provides methods for tracking workflow progress, collecting
    metrics, and visualizing workflow execution.
    """
    
    def __init__(self):
        """Initialize the workflow monitor"""
        self.events: List[WorkflowEventRecord] = []
        self.metrics: List[WorkflowMetric] = []
        self.active_workflows: Dict[str, Dict[str, Any]] = {}
        self.subscribers: Dict[str, List[callable]] = {}
        self.event_queue = asyncio.Queue()
        self.is_running = False
    
    async def start(self):
        """Start the event processing loop"""
        if self.is_running:
            return
            
        self.is_running = True
        asyncio.create_task(self._event_loop())
    
    async def stop(self):
        """Stop the event processing loop"""
        self.is_running = False
    
    async def _event_loop(self):
        """Process events from the queue"""
        while self.is_running:
            try:
                event = await self.event_queue.get()
                self._process_event(event)
                self.event_queue.task_done()
            except Exception as e:
                logger.error(f"Error processing workflow event: {str(e)}", exc_info=True)
                await asyncio.sleep(0.1)
    
    def _process_event(self, event: WorkflowEventRecord):
        """Process a workflow event"""
        # Add to events list
        self.events.append(event)
        
        # Update active workflows
        if event.event_type == WorkflowEvent.WORKFLOW_STARTED:
            self.active_workflows[event.workflow_id] = {
                "start_time": event.timestamp,
                "status": "running",
                "details": event.details
            }
        elif event.event_type == WorkflowEvent.WORKFLOW_COMPLETED:
            if event.workflow_id in self.active_workflows:
                self.active_workflows[event.workflow_id]["status"] = "completed"
                self.active_workflows[event.workflow_id]["end_time"] = event.timestamp
        elif event.event_type == WorkflowEvent.WORKFLOW_FAILED:
            if event.workflow_id in self.active_workflows:
                self.active_workflows[event.workflow_id]["status"] = "failed"
                self.active_workflows[event.workflow_id]["end_time"] = event.timestamp
                self.active_workflows[event.workflow_id]["error"] = event.details.get("error")
        
        # Notify subscribers
        self._notify_subscribers(event)
    
    def record_event(self, 
                    event_type: WorkflowEvent, 
                    workflow_id: str, 
                    step_name: Optional[str] = None,
                    details: Optional[Dict[str, Any]] = None):
        """Record a workflow event"""
        event = WorkflowEventRecord(
            event_type=event_type,
            workflow_id=workflow_id,
            step_name=step_name,
            details=details
        )
        
        asyncio.create_task(self._queue_event(event))
        return event.id
    
    async def _queue_event(self, event: WorkflowEventRecord):
        """Add an event to the queue"""
        await self.event_queue.put(event)
    
    def record_metric(self, 
                     metric_type: MetricType, 
                     value: Any, 
                     workflow_id: str, 
                     step_name: Optional[str] = None):
        """Record a workflow metric"""
        metric = WorkflowMetric(
            metric_type=metric_type,
            value=value,
            workflow_id=workflow_id,
            step_name=step_name
        )
        
        self.metrics.append(metric)
        return metric
    
    def get_workflow_events(self, workflow_id: str) -> List[WorkflowEventRecord]:
        """Get all events for a specific workflow"""
        return [event for event in self.events if event.workflow_id == workflow_id]
    
    def get_workflow_metrics(self, workflow_id: str) -> List[WorkflowMetric]:
        """Get all metrics for a specific workflow"""
        return [metric for metric in self.metrics if metric.workflow_id == workflow_id]
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get the current status of a workflow"""
        return self.active_workflows.get(workflow_id)
    
    def get_active_workflows(self) -> Dict[str, Dict[str, Any]]:
        """Get all active workflows"""
        return self.active_workflows
    
    def subscribe(self, event_type: WorkflowEvent, callback: callable):
        """Subscribe to a specific event type"""
        if event_type.name not in self.subscribers:
            self.subscribers[event_type.name] = []
            
        self.subscribers[event_type.name].append(callback)
    
    def _notify_subscribers(self, event: WorkflowEventRecord):
        """Notify subscribers of an event"""
        if event.event_type.name in self.subscribers:
            for callback in self.subscribers[event.event_type.name]:
                try:
                    callback(event)
                except Exception as e:
                    logger.error(f"Error in event subscriber callback: {str(e)}", exc_info=True)
    
    def generate_workflow_summary(self, workflow_id: str) -> Dict[str, Any]:
        """Generate a summary of a workflow execution"""
        events = self.get_workflow_events(workflow_id)
        metrics = self.get_workflow_metrics(workflow_id)
        
        if not events:
            return {"workflow_id": workflow_id, "status": "unknown"}
        
        # Find start and end events
        start_event = next((e for e in events if e.event_type == WorkflowEvent.WORKFLOW_STARTED), None)
        end_event = next((e for e in events if e.event_type in [WorkflowEvent.WORKFLOW_COMPLETED, WorkflowEvent.WORKFLOW_FAILED]), None)
        
        # Calculate duration
        duration = None
        if start_event and end_event:
            duration = (end_event.timestamp - start_event.timestamp).total_seconds()
        
        # Count step events
        step_started = sum(1 for e in events if e.event_type == WorkflowEvent.STEP_STARTED)
        step_completed = sum(1 for e in events if e.event_type == WorkflowEvent.STEP_COMPLETED)
        step_failed = sum(1 for e in events if e.event_type == WorkflowEvent.STEP_FAILED)
        
        # Create summary
        summary = {
            "workflow_id": workflow_id,
            "status": "completed" if end_event and end_event.event_type == WorkflowEvent.WORKFLOW_COMPLETED else "failed" if end_event else "running",
            "start_time": start_event.timestamp.isoformat() if start_event else None,
            "end_time": end_event.timestamp.isoformat() if end_event else None,
            "duration_seconds": duration,
            "steps_total": step_started,
            "steps_completed": step_completed,
            "steps_failed": step_failed,
            "completion_rate": step_completed / step_started if step_started > 0 else 0,
            "error_rate": step_failed / step_started if step_started > 0 else 0
        }
        
        # Add metrics
        for metric_type in MetricType:
            matching_metrics = [m for m in metrics if m.metric_type == metric_type]
            if matching_metrics:
                # For simplicity, just use the last value
                summary[f"metric_{metric_type.name.lower()}"] = matching_metrics[-1].value
        
        return summary
    
    def visualize_workflow(self, workflow_id: str) -> str:
        """
        Generate a text-based visualization of workflow execution.
        
        This is a simple implementation that creates a timeline of workflow events.
        In a real implementation, this would generate a more sophisticated
        visualization, such as a Gantt chart or a graph.
        """
        events = sorted(self.get_workflow_events(workflow_id), key=lambda e: e.timestamp)
        
        if not events:
            return f"No events found for workflow {workflow_id}"
        
        # Calculate the total duration
        start_time = events[0].timestamp
        end_time = events[-1].timestamp if events else start_time
        total_duration = (end_time - start_time).total_seconds()
        
        # Generate the visualization
        visualization = [f"Workflow: {workflow_id}", "=" * 50, ""]
        visualization.append(f"Start: {start_time.isoformat()}")
        visualization.append(f"End: {end_time.isoformat()}")
        visualization.append(f"Duration: {total_duration:.2f} seconds")
        visualization.append("")
        visualization.append("Timeline:")
        visualization.append("-" * 50)
        
        for event in events:
            relative_time = (event.timestamp - start_time).total_seconds()
            percent = int((relative_time / total_duration) * 40) if total_duration > 0 else 0
            timeline = "[" + "=" * percent + ">" + " " * (40 - percent) + "]"
            
            # Format the event
            if event.step_name:
                event_str = f"{event.event_type.name} - {event.step_name}"
            else:
                event_str = f"{event.event_type.name}"
                
            visualization.append(f"{relative_time:6.2f}s {timeline} {event_str}")
        
        return "\n".join(visualization)

class MonitoredWorkflowMixin:
    """
    Mixin for adding monitoring capabilities to workflows.
    
    This mixin can be added to BaseWorkflow subclasses to automatically
    record events and metrics during workflow execution.
    """
    
    def __init__(self, monitor: Optional[WorkflowMonitor] = None, *args, **kwargs):
        """Initialize the monitored workflow mixin"""
        super().__init__(*args, **kwargs)
        self.monitor = monitor
    
    async def execute(self, context: Optional[WorkflowContext] = None) -> WorkflowContext:
        """Execute the workflow with monitoring"""
        # Create a new context if none provided
        if context is None:
            context = WorkflowContext(workflow_name=self.name)
        
        # Record the start event
        if self.monitor:
            self.monitor.record_event(
                event_type=WorkflowEvent.WORKFLOW_STARTED,
                workflow_id=context.workflow_id,
                details={
                    "workflow_name": self.name,
                    "description": self.description
                }
            )
        
        start_time = datetime.now(timezone.utc)
        
        # Execute the workflow
        try:
            result_context = await super().execute(context)
            
            # Record completion metrics
            if self.monitor:
                # Record execution time
                end_time = datetime.now(timezone.utc)
                execution_time = (end_time - start_time).total_seconds()
                
                self.monitor.record_metric(
                    metric_type=MetricType.EXECUTION_TIME,
                    value=execution_time,
                    workflow_id=context.workflow_id
                )
                
                # Record completion rate
                total_steps = len(self.steps)
                completed_steps = len([s for s in context.step_history if s in self.steps])
                
                self.monitor.record_metric(
                    metric_type=MetricType.COMPLETION_RATE,
                    value=completed_steps / total_steps if total_steps > 0 else 1.0,
                    workflow_id=context.workflow_id
                )
                
                # Record the completion event
                if result_context.status == WorkflowStatus.COMPLETED:
                    self.monitor.record_event(
                        event_type=WorkflowEvent.WORKFLOW_COMPLETED,
                        workflow_id=context.workflow_id,
                        details={
                            "execution_time": execution_time,
                            "steps_completed": completed_steps,
                            "total_steps": total_steps
                        }
                    )
                else:
                    # Record the failure event
                    self.monitor.record_event(
                        event_type=WorkflowEvent.WORKFLOW_FAILED,
                        workflow_id=context.workflow_id,
                        details={
                            "execution_time": execution_time,
                            "steps_completed": completed_steps,
                            "total_steps": total_steps,
                            "error": result_context.errors[0] if result_context.errors else "Unknown error"
                        }
                    )
            
            return result_context
            
        except Exception as e:
            logger.error(f"Error in monitored workflow {self.name}: {str(e)}", exc_info=True)
            
            # Record the error
            if self.monitor:
                end_time = datetime.now(timezone.utc)
                execution_time = (end_time - start_time).total_seconds()
                
                self.monitor.record_event(
                    event_type=WorkflowEvent.WORKFLOW_FAILED,
                    workflow_id=context.workflow_id,
                    details={
                        "execution_time": execution_time,
                        "error": str(e)
                    }
                )
            
            # Mark the context as failed
            context.fail(f"Error in workflow: {str(e)}")
            return context
    
    async def execute_step(self, step_name: str, context: WorkflowContext) -> bool:
        """Execute a specific step with monitoring"""
        step = self.get_step(step_name)
        if not step:
            logger.error(f"Step {step_name} not found in workflow {self.name}")
            context.fail(f"Step {step_name} not found")
            return False
        
        # Record the step start event
        if self.monitor:
            self.monitor.record_event(
                event_type=WorkflowEvent.STEP_STARTED,
                workflow_id=context.workflow_id,
                step_name=step_name,
                details={
                    "step_description": step.description
                }
            )
        
        start_time = datetime.now(timezone.utc)
        
        # Execute the step
        try:
            success = await super().execute_step(step_name, context)
            
            # Record step metrics
            if self.monitor:
                # Record execution time
                end_time = datetime.now(timezone.utc)
                execution_time = (end_time - start_time).total_seconds()
                
                self.monitor.record_metric(
                    metric_type=MetricType.EXECUTION_TIME,
                    value=execution_time,
                    workflow_id=context.workflow_id,
                    step_name=step_name
                )
                
                # Record the completion event
                if success:
                    self.monitor.record_event(
                        event_type=WorkflowEvent.STEP_COMPLETED,
                        workflow_id=context.workflow_id,
                        step_name=step_name,
                        details={
                            "execution_time": execution_time
                        }
                    )
                else:
                    # Record the failure event
                    self.monitor.record_event(
                        event_type=WorkflowEvent.STEP_FAILED,
                        workflow_id=context.workflow_id,
                        step_name=step_name,
                        details={
                            "execution_time": execution_time,
                            "error": context.errors[-1] if context.errors else "Unknown error"
                        }
                    )
            
            return success
            
        except Exception as e:
            logger.error(f"Error in step {step_name}: {str(e)}", exc_info=True)
            
            # Record the error
            if self.monitor:
                end_time = datetime.now(timezone.utc)
                execution_time = (end_time - start_time).total_seconds()
                
                self.monitor.record_event(
                    event_type=WorkflowEvent.STEP_FAILED,
                    workflow_id=context.workflow_id,
                    step_name=step_name,
                    details={
                        "execution_time": execution_time,
                        "error": str(e)
                    }
                )
            
            return False

class MonitoredWorkflow(MonitoredWorkflowMixin, BaseWorkflow):
    """A workflow that automatically records events and metrics during execution"""
    pass
