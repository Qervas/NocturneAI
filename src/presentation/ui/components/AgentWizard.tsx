/**
 * AgentWizard Component
 *
 * Interactive wizard for creating new agents with step-by-step guidance.
 * Collects agent configuration including name, role, model, and capabilities.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { UITheme } from "../types.js";

/**
 * Wizard step enumeration
 */
enum WizardStep {
  NAME = "name",
  ROLE = "role",
  MODEL = "model",
  CAPABILITIES = "capabilities",
  CONFIRM = "confirm",
}

/**
 * Role options
 */
const ROLE_OPTIONS = [
  { value: "coder", label: "Coder", description: "Write and modify code" },
  { value: "analyst", label: "Analyst", description: "Analyze data and provide insights" },
  { value: "researcher", label: "Researcher", description: "Research and gather information" },
  { value: "planner", label: "Planner", description: "Plan and organize tasks" },
  { value: "reviewer", label: "Reviewer", description: "Review and validate work" },
  { value: "general", label: "General", description: "General purpose assistant" },
] as const;

/**
 * Model options
 */
const MODEL_OPTIONS = [
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", description: "Best overall (recommended)" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus", description: "Most capable" },
  { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet", description: "Balanced" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku", description: "Fast and efficient" },
] as const;

/**
 * Capability options
 */
const CAPABILITY_OPTIONS = [
  { value: "file_operations", label: "File Operations", description: "Read and write files" },
  { value: "code_execution", label: "Code Execution", description: "Execute code snippets" },
  { value: "web_search", label: "Web Search", description: "Search the internet" },
  { value: "data_analysis", label: "Data Analysis", description: "Analyze datasets" },
  { value: "git_operations", label: "Git Operations", description: "Use git commands" },
] as const;

/**
 * Agent configuration
 */
interface AgentConfig {
  name: string;
  role: string;
  model: string;
  capabilities: string[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Component props
 */
export interface AgentWizardProps {
  theme: UITheme;
  onComplete: (config: AgentConfig) => void;
  onCancel: () => void;
}

/**
 * AgentWizard component
 *
 * Step-by-step wizard for creating new agents.
 *
 * @param props - Component props
 * @returns Rendered wizard component
 */
export const AgentWizard: React.FC<AgentWizardProps> = ({
  theme,
  onComplete,
  onCancel,
}) => {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.NAME);
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState(0);
  const [selectedModel, setSelectedModel] = useState(0);
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<number>>(
    new Set()
  );

  // Get current step index
  const steps = Object.values(WizardStep);
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Navigation
  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  }, [currentStepIndex, steps]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  }, [currentStepIndex, steps]);

  // Handle completion
  const handleComplete = useCallback(() => {
    const config: AgentConfig = {
      name: name.trim(),
      role: ROLE_OPTIONS[selectedRole].value,
      model: MODEL_OPTIONS[selectedModel].value,
      capabilities: Array.from(selectedCapabilities).map(
        (i) => CAPABILITY_OPTIONS[i].value
      ),
      temperature: 0.7,
      maxTokens: 4096,
    };

    onComplete(config);
  }, [name, selectedRole, selectedModel, selectedCapabilities, onComplete]);

  // Keyboard navigation
  useInput(
    (input, key) => {
      // Escape: Cancel
      if (key.escape) {
        onCancel();
        return;
      }

      // Handle role selection
      if (currentStep === WizardStep.ROLE) {
        if (key.upArrow && selectedRole > 0) {
          setSelectedRole(selectedRole - 1);
          return;
        }
        if (key.downArrow && selectedRole < ROLE_OPTIONS.length - 1) {
          setSelectedRole(selectedRole + 1);
          return;
        }
        if (key.return) {
          goToNextStep();
          return;
        }
      }

      // Handle model selection
      if (currentStep === WizardStep.MODEL) {
        if (key.upArrow && selectedModel > 0) {
          setSelectedModel(selectedModel - 1);
          return;
        }
        if (key.downArrow && selectedModel < MODEL_OPTIONS.length - 1) {
          setSelectedModel(selectedModel + 1);
          return;
        }
        if (key.return) {
          goToNextStep();
          return;
        }
      }

      // Handle capabilities selection
      if (currentStep === WizardStep.CAPABILITIES) {
        if (key.upArrow) {
          const capabilities = Array.from(selectedCapabilities);
          const maxCapability = Math.max(...capabilities, -1);
          if (maxCapability > 0) {
            const newCap = maxCapability - 1;
            const newSet = new Set(selectedCapabilities);
            newSet.delete(maxCapability);
            newSet.add(newCap);
            setSelectedCapabilities(newSet);
          }
          return;
        }
        if (key.downArrow) {
          const capabilities = Array.from(selectedCapabilities);
          const maxCapability = Math.max(...capabilities, -1);
          if (maxCapability < CAPABILITY_OPTIONS.length - 1) {
            const newCap = maxCapability + 1;
            const newSet = new Set(selectedCapabilities);
            if (capabilities.length === 0 || maxCapability >= 0) {
              newSet.add(newCap);
            }
            setSelectedCapabilities(newSet);
          }
          return;
        }
        if (input === " ") {
          // Spacebar toggles the current highest selected capability
          const capabilities = Array.from(selectedCapabilities).sort((a, b) => b - a);
          if (capabilities.length > 0) {
            const highest = capabilities[0];
            const newSet = new Set(selectedCapabilities);
            if (newSet.has(highest)) {
              newSet.delete(highest);
            } else {
              newSet.add(highest);
            }
            setSelectedCapabilities(newSet);
          } else {
            setSelectedCapabilities(new Set([0]));
          }
          return;
        }
        if (key.return) {
          goToNextStep();
          return;
        }
      }

      // Handle confirmation
      if (currentStep === WizardStep.CONFIRM) {
        if (key.return) {
          handleComplete();
          return;
        }
      }

      // Backspace/Delete: Go back
      if (key.backspace || key.delete) {
        if (currentStep !== WizardStep.NAME) {
          goToPreviousStep();
          return;
        }
      }
    },
    { isActive: true }
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          ⚡ Create New Agent
        </Text>
      </Box>

      {/* Progress Bar */}
      <Box marginBottom={1}>
        <Text color={theme.colors.muted}>Progress: </Text>
        <Box width={40}>
          <Text color={theme.colors.success}>
            {"█".repeat(Math.round((progress / 100) * 40))}
          </Text>
          <Text color={theme.colors.muted}>
            {"░".repeat(40 - Math.round((progress / 100) * 40))}
          </Text>
        </Box>
        <Text color={theme.colors.muted}>
          {" "}
          {currentStepIndex + 1}/{steps.length}
        </Text>
      </Box>

      {/* Current Step */}
      <Box flexDirection="column" marginBottom={2}>
        {currentStep === WizardStep.NAME && (
          <StepName
            name={name}
            setName={setName}
            onNext={goToNextStep}
            theme={theme}
          />
        )}

        {currentStep === WizardStep.ROLE && (
          <StepRole
            selectedRole={selectedRole}
            roleOptions={ROLE_OPTIONS}
            theme={theme}
          />
        )}

        {currentStep === WizardStep.MODEL && (
          <StepModel
            selectedModel={selectedModel}
            modelOptions={MODEL_OPTIONS}
            theme={theme}
          />
        )}

        {currentStep === WizardStep.CAPABILITIES && (
          <StepCapabilities
            selectedCapabilities={selectedCapabilities}
            setSelectedCapabilities={setSelectedCapabilities}
            capabilityOptions={CAPABILITY_OPTIONS}
            theme={theme}
          />
        )}

        {currentStep === WizardStep.CONFIRM && (
          <StepConfirm
            name={name}
            role={ROLE_OPTIONS[selectedRole]}
            model={MODEL_OPTIONS[selectedModel]}
            capabilities={Array.from(selectedCapabilities).map(
              (i) => CAPABILITY_OPTIONS[i]
            )}
            theme={theme}
          />
        )}
      </Box>

      {/* Navigation Help */}
      <Box borderStyle="single" borderColor={theme.colors.muted} paddingX={1}>
        <Text color={theme.colors.muted}>
          {currentStep === WizardStep.NAME && "[Enter] Next"}
          {currentStep === WizardStep.ROLE && "[↑↓] Select • [Enter] Next"}
          {currentStep === WizardStep.MODEL && "[↑↓] Select • [Enter] Next"}
          {currentStep === WizardStep.CAPABILITIES &&
            "[↑↓] Navigate • [Space] Toggle • [Enter] Next"}
          {currentStep === WizardStep.CONFIRM && "[Enter] Create Agent"}
          {" • "}
          {currentStepIndex > 0 && "[Backspace] Back • "}
          [Esc] Cancel
        </Text>
      </Box>
    </Box>
  );
};

/**
 * Step 1: Name Input
 */
interface StepNameProps {
  name: string;
  setName: (name: string) => void;
  onNext: () => void;
  theme: UITheme;
}

const StepName: React.FC<StepNameProps> = ({ name, setName, onNext, theme }) => {
  return (
    <Box flexDirection="column">
      <Text bold color={theme.colors.secondary}>
        Step 1: Agent Name
      </Text>
      <Box marginTop={1} marginLeft={2}>
        <Text color={theme.colors.muted}>Enter a unique name for your agent:</Text>
      </Box>
      <Box marginTop={1} marginLeft={2}>
        <TextInput
          value={name}
          onChange={setName}
          placeholder="my-agent"
          onSubmit={onNext}
        />
      </Box>
    </Box>
  );
};

/**
 * Step 2: Role Selection
 */
interface StepRoleProps {
  selectedRole: number;
  roleOptions: typeof ROLE_OPTIONS;
  theme: UITheme;
}

const StepRole: React.FC<StepRoleProps> = ({ selectedRole, roleOptions, theme }) => {
  return (
    <Box flexDirection="column">
      <Text bold color={theme.colors.secondary}>
        Step 2: Select Role
      </Text>
      <Box marginTop={1} marginLeft={2} flexDirection="column">
        {roleOptions.map((role, index) => {
          const isSelected = index === selectedRole;
          return (
            <Box key={role.value} marginBottom={0}>
              <Text color={isSelected ? theme.colors.primary : theme.colors.muted} bold={isSelected}>
                {isSelected ? "▶" : " "} {role.label}
              </Text>
              <Text color={theme.colors.muted} dimColor>
                {" "}
                - {role.description}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/**
 * Step 3: Model Selection
 */
interface StepModelProps {
  selectedModel: number;
  modelOptions: typeof MODEL_OPTIONS;
  theme: UITheme;
}

const StepModel: React.FC<StepModelProps> = ({ selectedModel, modelOptions, theme }) => {
  return (
    <Box flexDirection="column">
      <Text bold color={theme.colors.secondary}>
        Step 3: Select AI Model
      </Text>
      <Box marginTop={1} marginLeft={2} flexDirection="column">
        {modelOptions.map((model, index) => {
          const isSelected = index === selectedModel;
          return (
            <Box key={model.value} marginBottom={0}>
              <Text color={isSelected ? theme.colors.primary : theme.colors.muted} bold={isSelected}>
                {isSelected ? "▶" : " "} {model.label}
              </Text>
              <Text color={theme.colors.muted} dimColor>
                {" "}
                - {model.description}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/**
 * Step 4: Capabilities Selection
 */
interface StepCapabilitiesProps {
  selectedCapabilities: Set<number>;
  setSelectedCapabilities: (caps: Set<number>) => void;
  capabilityOptions: typeof CAPABILITY_OPTIONS;
  theme: UITheme;
}

const StepCapabilities: React.FC<StepCapabilitiesProps> = ({
  selectedCapabilities,
  setSelectedCapabilities,
  capabilityOptions,
  theme,
}) => {
  const handleToggle = (index: number) => {
    const newSet = new Set(selectedCapabilities);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedCapabilities(newSet);
  };

  return (
    <Box flexDirection="column">
      <Text bold color={theme.colors.secondary}>
        Step 4: Select Capabilities
      </Text>
      <Box marginTop={1} marginLeft={2}>
        <Text color={theme.colors.muted} dimColor>
          Choose the capabilities this agent should have:
        </Text>
      </Box>
      <Box marginTop={1} marginLeft={2} flexDirection="column">
        {capabilityOptions.map((capability, index) => {
          const isSelected = selectedCapabilities.has(index);
          return (
            <Box key={capability.value} marginBottom={0}>
              <Text
                color={isSelected ? theme.colors.success : theme.colors.muted}
                bold={isSelected}
              >
                {isSelected ? "☑" : "☐"} {capability.label}
              </Text>
              <Text color={theme.colors.muted} dimColor>
                {" "}
                - {capability.description}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/**
 * Step 5: Confirmation
 */
interface StepConfirmProps {
  name: string;
  role: { value: string; label: string; description: string };
  model: { value: string; label: string; description: string };
  capabilities: Array<{ value: string; label: string; description: string }>;
  theme: UITheme;
}

const StepConfirm: React.FC<StepConfirmProps> = ({
  name,
  role,
  model,
  capabilities,
  theme,
}) => {
  return (
    <Box flexDirection="column">
      <Text bold color={theme.colors.secondary}>
        Step 5: Confirm Configuration
      </Text>
      <Box
        marginTop={1}
        marginLeft={2}
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.colors.success}
        paddingX={1}
      >
        <Box marginBottom={0}>
          <Text color={theme.colors.muted}>Name: </Text>
          <Text bold color={theme.colors.primary}>
            {name}
          </Text>
        </Box>
        <Box marginBottom={0}>
          <Text color={theme.colors.muted}>Role: </Text>
          <Text color={theme.colors.foreground}>{role.label}</Text>
        </Box>
        <Box marginBottom={0}>
          <Text color={theme.colors.muted}>Model: </Text>
          <Text color={theme.colors.foreground}>{model.label}</Text>
        </Box>
        <Box marginBottom={0}>
          <Text color={theme.colors.muted}>Capabilities: </Text>
          <Text color={theme.colors.foreground}>
            {capabilities.length > 0
              ? capabilities.map((c) => c.label).join(", ")
              : "None"}
          </Text>
        </Box>
      </Box>
      <Box marginTop={1} marginLeft={2}>
        <Text color={theme.colors.success} bold>
          Press Enter to create this agent
        </Text>
      </Box>
    </Box>
  );
};

export default AgentWizard;
