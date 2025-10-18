/**
 * ConfigViewer Component
 *
 * Interactive component for viewing and editing NocturneAI configuration.
 * Displays configuration sections with syntax highlighting and inline editing.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { UITheme } from "../types.js";

/**
 * Configuration section
 */
interface ConfigSection {
  name: string;
  description: string;
  settings: ConfigSetting[];
}

/**
 * Configuration setting
 */
interface ConfigSetting {
  key: string;
  value: string | number | boolean;
  type: "string" | "number" | "boolean" | "select";
  description: string;
  options?: string[];
  required?: boolean;
  validation?: (value: any) => boolean;
}

/**
 * Component props
 */
export interface ConfigViewerProps {
  /**
   * Configuration sections to display
   */
  sections: ConfigSection[];

  /**
   * Callback when configuration is saved
   */
  onSave: (config: Record<string, any>) => void;

  /**
   * Callback when viewer is closed
   */
  onClose: () => void;

  /**
   * Theme for colors
   */
  theme: UITheme;

  /**
   * Read-only mode
   */
  readOnly?: boolean;
}

/**
 * ConfigViewer component
 *
 * Displays and allows editing of configuration settings.
 *
 * @param props - Component props
 * @returns Rendered config viewer component
 */
export const ConfigViewer: React.FC<ConfigViewerProps> = ({
  sections,
  onSave,
  onClose,
  theme,
  readOnly = false,
}) => {
  // State
  const [selectedSection, setSelectedSection] = useState(0);
  const [selectedSetting, setSelectedSetting] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    sections.forEach((section) => {
      section.settings.forEach((setting) => {
        initial[setting.key] = setting.value;
      });
    });
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentSection = sections[selectedSection];
  const currentSetting =
    currentSection?.settings[selectedSetting];

  // Validation
  const validateSetting = useCallback(
    (setting: ConfigSetting, value: any): boolean => {
      if (setting.required && !value) {
        setErrors((prev) => ({
          ...prev,
          [setting.key]: "This field is required",
        }));
        return false;
      }

      if (setting.validation && !setting.validation(value)) {
        setErrors((prev) => ({
          ...prev,
          [setting.key]: "Invalid value",
        }));
        return false;
      }

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[setting.key];
        return newErrors;
      });
      return true;
    },
    []
  );

  // Start editing
  const startEditing = useCallback(() => {
    if (readOnly || !currentSetting) return;
    setEditValue(String(configValues[currentSetting.key] || ""));
    setIsEditing(true);
  }, [readOnly, currentSetting, configValues]);

  // Save edit
  const saveEdit = useCallback(() => {
    if (!currentSetting) return;

    let parsedValue: any = editValue;

    // Parse value based on type
    if (currentSetting.type === "number") {
      parsedValue = parseFloat(editValue);
      if (isNaN(parsedValue)) {
        setErrors((prev) => ({
          ...prev,
          [currentSetting.key]: "Must be a valid number",
        }));
        return;
      }
    } else if (currentSetting.type === "boolean") {
      parsedValue = editValue.toLowerCase() === "true";
    }

    // Validate
    if (!validateSetting(currentSetting, parsedValue)) {
      return;
    }

    // Update value
    setConfigValues((prev) => ({
      ...prev,
      [currentSetting.key]: parsedValue,
    }));

    setIsEditing(false);
    setEditValue("");
  }, [currentSetting, editValue, validateSetting]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue("");
  }, []);

  // Save configuration
  const handleSave = useCallback(() => {
    // Validate all settings
    let hasErrors = false;
    sections.forEach((section) => {
      section.settings.forEach((setting) => {
        if (!validateSetting(setting, configValues[setting.key])) {
          hasErrors = true;
        }
      });
    });

    if (hasErrors) {
      return;
    }

    onSave(configValues);
  }, [sections, configValues, validateSetting, onSave]);

  // Keyboard navigation
  useInput(
    (input, key) => {
      // Escape: Close or cancel edit
      if (key.escape) {
        if (isEditing) {
          cancelEdit();
        } else {
          onClose();
        }
        return;
      }

      if (isEditing) {
        // In edit mode, only handle Enter and Escape
        if (key.return) {
          saveEdit();
        }
        return;
      }

      // Tab: Switch sections
      if (key.tab && !key.shift) {
        setSelectedSection((prev) => (prev + 1) % sections.length);
        setSelectedSetting(0);
        return;
      }

      if (key.tab && key.shift) {
        setSelectedSection(
          (prev) => (prev - 1 + sections.length) % sections.length
        );
        setSelectedSetting(0);
        return;
      }

      // Arrow keys: Navigate settings
      if (key.upArrow && selectedSetting > 0) {
        setSelectedSetting(selectedSetting - 1);
        return;
      }

      if (
        key.downArrow &&
        selectedSetting < currentSection.settings.length - 1
      ) {
        setSelectedSetting(selectedSetting + 1);
        return;
      }

      // Enter/e: Edit setting
      if ((key.return || input === "e") && !readOnly) {
        startEditing();
        return;
      }

      // Ctrl+S: Save configuration
      if (key.ctrl && input === "s" && !readOnly) {
        handleSave();
        return;
      }

      // Space: Toggle boolean
      if (
        input === " " &&
        !readOnly &&
        currentSetting?.type === "boolean"
      ) {
        setConfigValues((prev) => ({
          ...prev,
          [currentSetting.key]: !prev[currentSetting.key],
        }));
        return;
      }
    },
    { isActive: true }
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          ⚙️  Configuration
        </Text>
        {readOnly && (
          <Text color={theme.colors.muted}> (Read-Only)</Text>
        )}
      </Box>

      {/* Section Tabs */}
      <Box marginBottom={1}>
        {sections.map((section, index) => {
          const isSelected = index === selectedSection;
          return (
            <Box key={section.name} marginRight={2}>
              <Text
                bold={isSelected}
                color={
                  isSelected ? theme.colors.primary : theme.colors.muted
                }
              >
                {isSelected ? "▶" : " "} {section.name}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Section Description */}
      {currentSection && (
        <Box marginBottom={1} marginLeft={2}>
          <Text color={theme.colors.muted} dimColor>
            {currentSection.description}
          </Text>
        </Box>
      )}

      {/* Settings List */}
      {currentSection && (
        <Box flexDirection="column" marginBottom={1}>
          {currentSection.settings.map((setting, index) => {
            const isSelected = index === selectedSetting;
            const value = configValues[setting.key];
            const hasError = !!errors[setting.key];

            return (
              <Box
                key={setting.key}
                flexDirection="column"
                marginBottom={1}
                borderStyle={isSelected ? "round" : undefined}
                borderColor={
                  isSelected
                    ? hasError
                      ? theme.colors.error
                      : theme.colors.primary
                    : undefined
                }
                paddingX={isSelected ? 1 : 0}
              >
                {/* Setting Name */}
                <Box>
                  <Text
                    bold={isSelected}
                    color={
                      hasError
                        ? theme.colors.error
                        : isSelected
                        ? theme.colors.secondary
                        : theme.colors.foreground
                    }
                  >
                    {setting.key}
                  </Text>
                  {setting.required && (
                    <Text color={theme.colors.error}> *</Text>
                  )}
                  <Text color={theme.colors.muted}>
                    {" "}
                    ({setting.type})
                  </Text>
                </Box>

                {/* Setting Description */}
                <Box marginLeft={2}>
                  <Text color={theme.colors.muted} dimColor>
                    {setting.description}
                  </Text>
                </Box>

                {/* Setting Value */}
                <Box marginLeft={2} marginTop={0}>
                  <Text color={theme.colors.muted}>Value: </Text>
                  {isEditing && isSelected ? (
                    <TextInput
                      value={editValue}
                      onChange={setEditValue}
                      placeholder={`Enter ${setting.type}...`}
                      onSubmit={saveEdit}
                    />
                  ) : (
                    <Text
                      color={
                        setting.type === "boolean"
                          ? value
                            ? theme.colors.success
                            : theme.colors.error
                          : theme.colors.foreground
                      }
                      bold={isSelected}
                    >
                      {setting.type === "boolean"
                        ? value
                          ? "✓ true"
                          : "✗ false"
                        : String(value)}
                    </Text>
                  )}
                </Box>

                {/* Options (for select type) */}
                {setting.type === "select" && setting.options && (
                  <Box marginLeft={2}>
                    <Text color={theme.colors.muted} dimColor>
                      Options: {setting.options.join(", ")}
                    </Text>
                  </Box>
                )}

                {/* Error Message */}
                {hasError && (
                  <Box marginLeft={2}>
                    <Text color={theme.colors.error}>
                      ⚠ {errors[setting.key]}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor={theme.colors.error}>
          <Box flexDirection="column">
            <Text bold color={theme.colors.error}>
              ⚠ {Object.keys(errors).length} Error(s)
            </Text>
            {Object.entries(errors).slice(0, 3).map(([key, error]) => (
              <Box key={key} marginLeft={2}>
                <Text color={theme.colors.error}>
                  • {key}: {error}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Actions */}
      <Box borderStyle="single" borderColor={theme.colors.muted} paddingX={1}>
        <Text color={theme.colors.muted}>
          {!readOnly && !isEditing && "[Enter/e] Edit • "}
          {!readOnly && currentSetting?.type === "boolean" && "[Space] Toggle • "}
          {isEditing && "[Enter] Save • "}
          {!readOnly && !isEditing && "[Ctrl+S] Save All • "}
          [Tab] Switch Section • [↑↓] Navigate • [Esc] {isEditing ? "Cancel" : "Close"}
        </Text>
      </Box>
    </Box>
  );
};

export default ConfigViewer;
