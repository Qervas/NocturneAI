# NocturneAI Terminal UI

Interactive Terminal User Interface for monitoring and managing NocturneAI agents and workflows in real-time.

## 🎯 Overview

The Terminal UI provides a beautiful, interactive interface built with [React Ink](https://github.com/vadimdemedes/ink) for managing the NocturneAI autonomous agent system. It features real-time updates, keyboard navigation, and multiple views for comprehensive system monitoring.

## ✨ Features

- **Dashboard View**: Overview of all active agents, workflows, and recent activity
- **Agent Status**: Detailed monitoring of agent states, tasks, and metrics
- **Workflow Progress**: Step-by-step visualization of workflow execution
- **Log Viewer**: Real-time log streaming with filtering by level
- **Keyboard Navigation**: Fast, intuitive keyboard shortcuts
- **Auto-Refresh**: Automatic updates every 5 seconds
- **Beautiful Design**: Color-coded status, progress bars, and icons

## 🚀 Quick Start

### Launch the UI

```bash
# Start with default dashboard view
nocturne ui

# Start with specific view
nocturne ui --view agents
nocturne ui --view workflows
nocturne ui --view logs

# Use subcommands
nocturne ui dashboard
nocturne ui agents
nocturne ui workflows
nocturne ui logs
```

### Options

- `-v, --view <type>`: Initial view (dashboard, agents, workflows, logs, help)
- `--no-auto-refresh`: Disable automatic refresh
- `--refresh-interval <ms>`: Set refresh interval in milliseconds (default: 5000)
- `--max-logs <count>`: Maximum number of logs to keep (default: 1000)

## ⌨️ Keyboard Shortcuts

### Navigation
- `d` - Dashboard view
- `a` - Agent status view
- `w` - Workflow progress view
- `l` - Logs view
- `h` - Help screen

### Actions
- `r` - Refresh current view
- `c` - Clear logs (in log view)
- `q` - Quit application
- `Ctrl+C` - Force quit

### Controls
- `↑/↓` - Navigate lists
- `Enter` - Select/Confirm
- `Esc` - Back/Cancel

## 📊 Views

### Dashboard View

The main overview screen showing:
- Active agents with current tasks
- Running workflows with progress
- Recent activity log
- Quick statistics

**Shortcut**: `d`

### Agent Status View

Detailed agent monitoring with:
- Agent name and ID
- Current status (idle, busy, error)
- Active task description
- Progress indicator
- Task metrics (completed, in progress, failed)
- Average execution time
- Uptime

**Shortcut**: `a`

**Status Indicators**:
- `○` Idle/Pending
- `◐` Running/Busy
- `●` Completed
- `✗` Failed/Error

### Workflow Progress View

Step-by-step workflow visualization:
- Workflow name and ID
- Overall status and progress
- Current step number
- Timeline of all steps
- Step durations
- Error messages for failed steps
- Start/end timestamps

**Shortcut**: `w`

### Log Viewer

Real-time log streaming with:
- Timestamp for each entry
- Log level (DEBUG, INFO, WARN, ERROR, SUCCESS)
- Source component
- Message content
- Metadata (when available)
- Level-based filtering
- Color-coded by severity

**Shortcut**: `l`

**Log Levels**:
- `◇` DEBUG (muted)
- `ℹ` INFO (blue)
- `⚠` WARN (yellow)
- `✗` ERROR (red)
- `✓` SUCCESS (green)

## 🏗️ Architecture

### Component Structure

```
src/presentation/ui/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard orchestrator
│   ├── Header.tsx       # Application header
│   ├── AgentStatus.tsx  # Agent display component
│   ├── WorkflowProgress.tsx  # Workflow visualization
│   ├── LogViewer.tsx    # Log display component
│   ├── Help.tsx         # Help screen
│   └── index.ts         # Component exports
├── hooks/               # Custom React hooks
│   ├── useUIState.ts    # State management hook
│   ├── useEventSubscription.ts  # Event handling
│   ├── useKeyBindings.ts  # Keyboard shortcuts
│   └── index.ts         # Hook exports
├── types.ts             # TypeScript type definitions
├── reducer.ts           # State reducer
├── index.tsx            # UI entry point
└── README.md            # This file
```

### State Management

The UI uses a **reducer pattern** for state management:

```typescript
interface UIState {
  currentView: ViewType;
  agents: AgentDisplay[];
  workflows: WorkflowDisplay[];
  logs: LogEntry[];
  selectedAgentId?: string;
  selectedWorkflowId?: string;
  isLoading: boolean;
  error?: string;
}
```

### Event System

The UI subscribes to events via an **EventEmitter**:

```typescript
enum UIEventType {
  AGENT_CREATED = 'agent:created',
  AGENT_UPDATED = 'agent:updated',
  AGENT_DELETED = 'agent:deleted',
  WORKFLOW_STARTED = 'workflow:started',
  WORKFLOW_UPDATED = 'workflow:updated',
  WORKFLOW_COMPLETED = 'workflow:completed',
  WORKFLOW_FAILED = 'workflow:failed',
  LOG_ENTRY = 'log:entry',
  ERROR = 'error'
}
```

## 🎨 Theme

The UI uses a customizable theme with color palette and symbols:

### Colors
- **Primary**: `#00D9FF` (Cyan)
- **Secondary**: `#A78BFA` (Purple)
- **Success**: `#10B981` (Green)
- **Warning**: `#F59E0B` (Orange)
- **Error**: `#EF4444` (Red)
- **Info**: `#3B82F6` (Blue)
- **Muted**: `#6B7280` (Gray)

### Symbols
- **Pending**: `○`
- **Running**: `◐`
- **Completed**: `●`
- **Failed**: `✗`
- **Arrow**: `→`
- **Bullet**: `•`

## 📝 Usage Examples

### Programmatic Usage

```typescript
import { startUI } from '@nocturne/ai/presentation/ui';
import { EventEmitter } from 'events';

// Create event bus
const eventBus = new EventEmitter();

// Start UI
const { waitUntilExit } = startUI({
  initialView: ViewType.DASHBOARD,
  eventBus,
  onExit: () => {
    console.log('UI closed');
  }
});

// Emit events to update UI
eventBus.emit(UIEventType.AGENT_CREATED, {
  id: 'agent-001',
  name: 'My Agent',
  status: 'idle',
  startTime: new Date()
});

// Wait for UI to exit
await waitUntilExit();
```

### Custom Components

```typescript
import { Dashboard } from '@nocturne/ai/presentation/ui';
import { useUIState } from '@nocturne/ai/presentation/ui/hooks';

function MyCustomUI() {
  const { state, dispatch } = useUIState();
  const eventBus = new EventEmitter();
  
  return (
    <Dashboard
      state={state}
      dispatch={dispatch}
      eventBus={eventBus}
      theme={DEFAULT_THEME}
    />
  );
}
```

## 🔧 Development

### Testing the UI

```bash
# Run in development mode
npm run dev

# Type check
npm run type-check

# Build
npm run build
```

### Adding Custom Views

1. Create a new view type in `types.ts`:
```typescript
export enum ViewType {
  // ... existing views
  CUSTOM = 'custom'
}
```

2. Create your component:
```typescript
// components/CustomView.tsx
export const CustomView: React.FC<Props> = (props) => {
  return (
    <Box>
      <Text>Custom View</Text>
    </Box>
  );
};
```

3. Add to Dashboard switch statement:
```typescript
case ViewType.CUSTOM:
  return <CustomView {...props} />;
```

4. Add keyboard shortcut in `useKeyBindings.ts`

### Custom Hooks

The UI provides reusable hooks:

- **useUIState**: State management with reducer
- **useEventSubscription**: Event handling
- **useKeyBindings**: Keyboard shortcuts
- **useViewNavigation**: View switching
- **useListNavigation**: List selection

## 🐛 Troubleshooting

### UI not updating

- Ensure events are being emitted to the event bus
- Check that auto-refresh is enabled
- Verify the refresh interval setting

### Logs not appearing

- Check log level filtering
- Ensure `maxLogs` is not too low
- Verify log entries have correct format

### Keyboard shortcuts not working

- Make sure the terminal has focus
- Check for conflicting terminal shortcuts
- Verify `isActive` flag in useInput

### Performance issues

- Reduce refresh interval
- Lower `maxLogs` limit
- Filter logs by level
- Use compact mode for workflows

## 📚 Additional Resources

- [React Ink Documentation](https://github.com/vadimdemedes/ink)
- [NocturneAI Main Documentation](../../README.md)
- [CLI Commands](../commands/README.md)

## 📄 License

MIT License - See LICENSE file for details