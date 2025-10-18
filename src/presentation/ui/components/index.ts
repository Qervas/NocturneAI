/**
 * Terminal UI Components
 *
 * React components for building the interactive Terminal UI.
 * Includes dashboard, status displays, progress viewers, help screens,
 * interactive forms, wizards, configuration viewer, template gallery,
 * and loading indicators.
 */

export { Header } from "./Header.js";
export type { HeaderProps } from "./Header.js";

export { AgentStatus } from "./AgentStatus.js";

export { WorkflowProgress } from "./WorkflowProgress.js";

export { LogViewer } from "./LogViewer.js";

export { Dashboard } from "./Dashboard.js";

export { Help } from "./Help.js";

export { TaskInput } from "./TaskInput.js";

export { AgentWizard } from "./AgentWizard.js";
export type { AgentWizardProps } from "./AgentWizard.js";

export {
  Spinner,
  FullScreenSpinner,
  InlineSpinner,
  LoadingBox,
} from "./Spinner.js";
export type {
  SpinnerProps,
  SpinnerType,
  FullScreenSpinnerProps,
  InlineSpinnerProps,
  LoadingBoxProps,
} from "./Spinner.js";

export { ConfigViewer } from "./ConfigViewer.js";
export type { ConfigViewerProps } from "./ConfigViewer.js";

export { TemplateGallery } from "./TemplateGallery.js";
export type { TemplateGalleryProps, Template } from "./TemplateGallery.js";

export { UnifiedChat } from "./UnifiedChat.js";

export { ChatInput } from "./ChatInput.js";

export { ChatMessageComponent } from "./ChatMessage.js";

export { ConfirmationDialog } from "./ConfirmationDialog.js";

export { Sidebar } from "./Sidebar.js";

export { ChatLayout } from "./ChatLayout.js";
