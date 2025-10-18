/**
 * TaskInput Component
 *
 * Interactive form for submitting tasks to agents.
 * Provides input fields for task description, priority, agent selection,
 * and optional parameters with real-time validation.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { TaskInputProps, TaskInputData } from "../types.js";

/**
 * Form field enumeration
 */
enum FormField {
  DESCRIPTION = "description",
  PRIORITY = "priority",
  AGENT = "agent",
  PARAMETERS = "parameters",
}

/**
 * Priority options
 */
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"] as const;

/**
 * TaskInput component
 *
 * Multi-field form for creating and submitting agent tasks.
 *
 * @param props - Component props
 * @returns Rendered task input component
 */
export const TaskInput: React.FC<TaskInputProps> = ({
  onSubmit,
  onCancel,
  agents,
  theme,
}) => {
  // Form state
  const [currentField, setCurrentField] = useState<FormField>(
    FormField.DESCRIPTION,
  );
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<number>(1); // Index in PRIORITY_OPTIONS
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [parameters, setParameters] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!description.trim()) {
      newErrors.description = "Task description is required";
    }

    if (agents.length === 0) {
      newErrors.agent = "No agents available";
    }

    // Validate parameters JSON if provided
    if (parameters.trim()) {
      try {
        JSON.parse(parameters);
      } catch {
        newErrors.parameters = "Parameters must be valid JSON";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [description, parameters, agents.length]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    const task: TaskInputData = {
      description: description.trim(),
      priority: PRIORITY_OPTIONS[priority],
      agentId: agents[selectedAgentIndex]?.id,
      parameters: parameters.trim() ? JSON.parse(parameters) : undefined,
    };

    onSubmit(task);
  }, [
    validateForm,
    description,
    priority,
    selectedAgentIndex,
    parameters,
    agents,
    onSubmit,
  ]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      // Tab: Move to next field
      if (key.tab && !key.shift) {
        const fields = Object.values(FormField);
        const currentIndex = fields.indexOf(currentField);
        const nextIndex = (currentIndex + 1) % fields.length;
        setCurrentField(fields[nextIndex]);
        return;
      }

      // Shift+Tab: Move to previous field
      if (key.tab && key.shift) {
        const fields = Object.values(FormField);
        const currentIndex = fields.indexOf(currentField);
        const prevIndex = (currentIndex - 1 + fields.length) % fields.length;
        setCurrentField(fields[prevIndex]);
        return;
      }

      // Handle priority selection with arrow keys
      if (currentField === FormField.PRIORITY) {
        if (key.leftArrow && priority > 0) {
          setPriority(priority - 1);
          return;
        }
        if (key.rightArrow && priority < PRIORITY_OPTIONS.length - 1) {
          setPriority(priority + 1);
          return;
        }
      }

      // Handle agent selection with arrow keys
      if (currentField === FormField.AGENT) {
        if (key.upArrow && selectedAgentIndex > 0) {
          setSelectedAgentIndex(selectedAgentIndex - 1);
          return;
        }
        if (key.downArrow && selectedAgentIndex < agents.length - 1) {
          setSelectedAgentIndex(selectedAgentIndex + 1);
          return;
        }
      }

      // Enter: Submit form
      if (
        key.return &&
        currentField !== FormField.DESCRIPTION &&
        currentField !== FormField.PARAMETERS
      ) {
        handleSubmit();
        return;
      }

      // Escape: Cancel
      if (key.escape) {
        onCancel();
        return;
      }

      // Ctrl+S: Submit
      if (key.ctrl && input === "s") {
        handleSubmit();
        return;
      }
    },
    { isActive: true },
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Submit New Task
        </Text>
      </Box>

      {/* Instructions */}
      <Box marginBottom={1}>
        <Text color={theme.colors.muted} dimColor>
          Use Tab to navigate fields, Enter/Ctrl+S to submit, Esc to cancel
        </Text>
      </Box>

      {/* Form Fields */}
      <Box flexDirection="column" marginBottom={1}>
        {/* Description Field */}
        <Box
          flexDirection="column"
          marginBottom={1}
          borderStyle={
            currentField === FormField.DESCRIPTION ? "round" : undefined
          }
          borderColor={
            currentField === FormField.DESCRIPTION
              ? theme.colors.primary
              : undefined
          }
          paddingX={currentField === FormField.DESCRIPTION ? 1 : 0}
        >
          <Box>
            <Text
              bold={currentField === FormField.DESCRIPTION}
              color={theme.colors.secondary}
            >
              Task Description:
            </Text>
            {errors.description && <Text color={theme.colors.error}> *</Text>}
          </Box>
          <Box marginLeft={2}>
            {currentField === FormField.DESCRIPTION ? (
              <TextInput
                value={description}
                onChange={setDescription}
                placeholder="Enter task description..."
                onSubmit={() => setCurrentField(FormField.PRIORITY)}
              />
            ) : (
              <Text
                color={
                  description ? theme.colors.foreground : theme.colors.muted
                }
              >
                {description || "(empty)"}
              </Text>
            )}
          </Box>
          {errors.description && (
            <Box marginLeft={2}>
              <Text color={theme.colors.error} dimColor>
                {errors.description}
              </Text>
            </Box>
          )}
        </Box>

        {/* Priority Field */}
        <Box
          flexDirection="column"
          marginBottom={1}
          borderStyle={
            currentField === FormField.PRIORITY ? "round" : undefined
          }
          borderColor={
            currentField === FormField.PRIORITY
              ? theme.colors.primary
              : undefined
          }
          paddingX={currentField === FormField.PRIORITY ? 1 : 0}
        >
          <Box>
            <Text
              bold={currentField === FormField.PRIORITY}
              color={theme.colors.secondary}
            >
              Priority:
            </Text>
            {currentField === FormField.PRIORITY && (
              <Text color={theme.colors.muted} dimColor>
                {" "}
                (Use ← → to change)
              </Text>
            )}
          </Box>
          <Box marginLeft={2}>
            {PRIORITY_OPTIONS.map((option, index) => {
              const isSelected = index === priority;
              const isCurrent = currentField === FormField.PRIORITY;
              return (
                <Box key={option} marginRight={2}>
                  <Text
                    color={
                      isSelected ? theme.colors.warning : theme.colors.muted
                    }
                    bold={isSelected && isCurrent}
                  >
                    {isSelected ? "●" : "○"} {option.toUpperCase()}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Agent Selection Field */}
        <Box
          flexDirection="column"
          marginBottom={1}
          borderStyle={currentField === FormField.AGENT ? "round" : undefined}
          borderColor={
            currentField === FormField.AGENT ? theme.colors.primary : undefined
          }
          paddingX={currentField === FormField.AGENT ? 1 : 0}
        >
          <Box>
            <Text
              bold={currentField === FormField.AGENT}
              color={theme.colors.secondary}
            >
              Select Agent:
            </Text>
            {currentField === FormField.AGENT && (
              <Text color={theme.colors.muted} dimColor>
                {" "}
                (Use ↑ ↓ to select)
              </Text>
            )}
            {errors.agent && <Text color={theme.colors.error}> *</Text>}
          </Box>
          {agents.length === 0 ? (
            <Box marginLeft={2}>
              <Text color={theme.colors.error}>No agents available</Text>
            </Box>
          ) : (
            <Box flexDirection="column" marginLeft={2}>
              {agents.slice(0, 5).map((agent, index) => {
                const isSelected = index === selectedAgentIndex;
                const isCurrent = currentField === FormField.AGENT;
                return (
                  <Box key={agent.id}>
                    <Text
                      color={
                        isSelected ? theme.colors.primary : theme.colors.muted
                      }
                      bold={isSelected && isCurrent}
                    >
                      {isSelected ? "▶" : " "} {agent.name}
                    </Text>
                    <Text color={theme.colors.muted}> ({agent.status})</Text>
                  </Box>
                );
              })}
              {agents.length > 5 && (
                <Text color={theme.colors.muted} dimColor>
                  ... and {agents.length - 5} more
                </Text>
              )}
            </Box>
          )}
        </Box>

        {/* Parameters Field (Optional) */}
        <Box
          flexDirection="column"
          borderStyle={
            currentField === FormField.PARAMETERS ? "round" : undefined
          }
          borderColor={
            currentField === FormField.PARAMETERS
              ? theme.colors.primary
              : undefined
          }
          paddingX={currentField === FormField.PARAMETERS ? 1 : 0}
        >
          <Box>
            <Text
              bold={currentField === FormField.PARAMETERS}
              color={theme.colors.secondary}
            >
              Parameters (JSON):
            </Text>
            <Text color={theme.colors.muted} dimColor>
              {" "}
              (Optional)
            </Text>
            {errors.parameters && <Text color={theme.colors.error}> *</Text>}
          </Box>
          <Box marginLeft={2}>
            {currentField === FormField.PARAMETERS ? (
              <TextInput
                value={parameters}
                onChange={setParameters}
                placeholder='{"key": "value"}'
                onSubmit={handleSubmit}
              />
            ) : (
              <Text
                color={
                  parameters ? theme.colors.foreground : theme.colors.muted
                }
              >
                {parameters || "(none)"}
              </Text>
            )}
          </Box>
          {errors.parameters && (
            <Box marginLeft={2}>
              <Text color={theme.colors.error} dimColor>
                {errors.parameters}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box marginTop={1}>
        <Box marginRight={2}>
          <Text color={theme.colors.success} bold>
            [Ctrl+S]
          </Text>
          <Text color={theme.colors.muted}> Submit</Text>
        </Box>
        <Box>
          <Text color={theme.colors.error} bold>
            [Esc]
          </Text>
          <Text color={theme.colors.muted}> Cancel</Text>
        </Box>
      </Box>

      {/* Summary */}
      {description && (
        <Box
          marginTop={2}
          paddingX={1}
          borderStyle="single"
          borderColor={theme.colors.muted}
        >
          <Box flexDirection="column">
            <Text bold color={theme.colors.info}>
              Task Summary
            </Text>
            <Box marginTop={1}>
              <Text color={theme.colors.muted}>Task: </Text>
              <Text>{description}</Text>
            </Box>
            <Box>
              <Text color={theme.colors.muted}>Priority: </Text>
              <Text color={theme.colors.warning}>
                {PRIORITY_OPTIONS[priority].toUpperCase()}
              </Text>
            </Box>
            {agents[selectedAgentIndex] && (
              <Box>
                <Text color={theme.colors.muted}>Agent: </Text>
                <Text>{agents[selectedAgentIndex].name}</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TaskInput;
