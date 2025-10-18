/**
 * TemplateGallery Component
 *
 * Interactive gallery for browsing and selecting project templates.
 * Displays template cards with descriptions, features, and preview.
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { UITheme } from "../types.js";

/**
 * Project template
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  author?: string;
  version?: string;
  files?: number;
  size?: string;
}

/**
 * Component props
 */
export interface TemplateGalleryProps {
  /**
   * Available templates
   */
  templates: Template[];

  /**
   * Callback when template is selected
   */
  onSelect: (template: Template) => void;

  /**
   * Callback when gallery is closed
   */
  onClose: () => void;

  /**
   * Theme for colors
   */
  theme: UITheme;

  /**
   * Show detailed view
   */
  detailed?: boolean;
}

/**
 * Template categories
 */
const CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "web", label: "Web Applications" },
  { value: "cli", label: "CLI Tools" },
  { value: "automation", label: "Automation" },
  { value: "data", label: "Data Processing" },
  { value: "ai", label: "AI/ML Projects" },
];

/**
 * TemplateGallery component
 *
 * Displays a browsable gallery of project templates.
 *
 * @param props - Component props
 * @returns Rendered template gallery component
 */
export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  onSelect,
  onClose,
  theme,
  detailed = false,
}) => {
  // State
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const category = CATEGORIES[selectedCategory].value;
    const matchesCategory =
      category === "all" || template.category === category;

    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesCategory && matchesSearch;
  });

  const currentTemplate = filteredTemplates[selectedTemplate];

  // Get difficulty color
  const getDifficultyColor = (difficulty: Template["difficulty"]): string => {
    switch (difficulty) {
      case "beginner":
        return theme.colors.success;
      case "intermediate":
        return theme.colors.warning;
      case "advanced":
        return theme.colors.error;
      default:
        return theme.colors.muted;
    }
  };

  // Handle selection
  const handleSelect = useCallback(() => {
    if (currentTemplate) {
      onSelect(currentTemplate);
    }
  }, [currentTemplate, onSelect]);

  // Keyboard navigation
  useInput(
    (input, key) => {
      // Escape: Close
      if (key.escape) {
        onClose();
        return;
      }

      // Tab: Switch categories
      if (key.tab && !key.shift) {
        setSelectedCategory((prev) => (prev + 1) % CATEGORIES.length);
        setSelectedTemplate(0);
        return;
      }

      if (key.tab && key.shift) {
        setSelectedCategory(
          (prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length
        );
        setSelectedTemplate(0);
        return;
      }

      // Arrow keys: Navigate templates
      if (key.upArrow && selectedTemplate > 0) {
        setSelectedTemplate(selectedTemplate - 1);
        return;
      }

      if (key.downArrow && selectedTemplate < filteredTemplates.length - 1) {
        setSelectedTemplate(selectedTemplate + 1);
        return;
      }

      // Left/Right: Previous/Next in grid view
      if (key.leftArrow && viewMode === "grid" && selectedTemplate > 0) {
        setSelectedTemplate(selectedTemplate - 1);
        return;
      }

      if (
        key.rightArrow &&
        viewMode === "grid" &&
        selectedTemplate < filteredTemplates.length - 1
      ) {
        setSelectedTemplate(selectedTemplate + 1);
        return;
      }

      // Enter: Select template
      if (key.return) {
        handleSelect();
        return;
      }

      // v: Toggle view mode
      if (input === "v") {
        setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
        return;
      }

      // /: Search (future feature)
      if (input === "/") {
        // Could open search input
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
          📚 Template Gallery
        </Text>
        <Text color={theme.colors.muted}>
          {" "}
          ({filteredTemplates.length} templates)
        </Text>
      </Box>

      {/* Category Tabs */}
      <Box marginBottom={1}>
        {CATEGORIES.map((category, index) => {
          const isSelected = index === selectedCategory;
          return (
            <Box key={category.value} marginRight={2}>
              <Text
                bold={isSelected}
                color={
                  isSelected ? theme.colors.primary : theme.colors.muted
                }
              >
                {isSelected ? "▶" : " "} {category.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <Box padding={2}>
          <Text color={theme.colors.muted}>
            No templates found in this category
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          {viewMode === "list" ? (
            // List View
            filteredTemplates.map((template, index) => (
              <TemplateListItem
                key={template.id}
                template={template}
                isSelected={index === selectedTemplate}
                theme={theme}
                getDifficultyColor={getDifficultyColor}
                detailed={detailed}
              />
            ))
          ) : (
            // Grid View (simplified for terminal)
            <Box flexDirection="column">
              {Array.from({
                length: Math.ceil(filteredTemplates.length / 2),
              }).map((_, rowIndex) => (
                <Box key={rowIndex} marginBottom={1}>
                  {filteredTemplates
                    .slice(rowIndex * 2, rowIndex * 2 + 2)
                    .map((template, colIndex) => {
                      const index = rowIndex * 2 + colIndex;
                      return (
                        <Box key={template.id} width="50%" marginRight={1}>
                          <TemplateCard
                            template={template}
                            isSelected={index === selectedTemplate}
                            theme={theme}
                            getDifficultyColor={getDifficultyColor}
                          />
                        </Box>
                      );
                    })}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Selected Template Details */}
      {detailed && currentTemplate && (
        <Box
          marginBottom={1}
          paddingX={1}
          borderStyle="round"
          borderColor={theme.colors.primary}
        >
          <Box flexDirection="column">
            <Text bold color={theme.colors.secondary}>
              Template Details
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text color={theme.colors.muted}>Name: </Text>
                <Text bold>{currentTemplate.name}</Text>
              </Box>
              <Box>
                <Text color={theme.colors.muted}>Description: </Text>
                <Text>{currentTemplate.description}</Text>
              </Box>
              <Box>
                <Text color={theme.colors.muted}>Difficulty: </Text>
                <Text
                  color={getDifficultyColor(currentTemplate.difficulty)}
                  bold
                >
                  {currentTemplate.difficulty.toUpperCase()}
                </Text>
              </Box>
              {currentTemplate.features.length > 0 && (
                <Box marginTop={1}>
                  <Box flexDirection="column">
                    <Text color={theme.colors.secondary}>Features:</Text>
                    {currentTemplate.features.map((feature) => (
                      <Box key={feature} marginLeft={2}>
                        <Text color={theme.colors.success}>✓</Text>
                        <Text> {feature}</Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Actions */}
      <Box borderStyle="single" borderColor={theme.colors.muted} paddingX={1}>
        <Text color={theme.colors.muted}>
          [↑↓] Navigate • [Enter] Select • [Tab] Category • [v] View Mode • [Esc]
          Close
        </Text>
      </Box>
    </Box>
  );
};

/**
 * TemplateListItem sub-component
 */
interface TemplateListItemProps {
  template: Template;
  isSelected: boolean;
  theme: UITheme;
  getDifficultyColor: (difficulty: Template["difficulty"]) => string;
  detailed: boolean;
}

const TemplateListItem: React.FC<TemplateListItemProps> = ({
  template,
  isSelected,
  theme,
  getDifficultyColor,
  detailed,
}) => {
  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle={isSelected ? "round" : undefined}
      borderColor={isSelected ? theme.colors.primary : undefined}
      paddingX={isSelected ? 1 : 0}
    >
      {/* Template Header */}
      <Box>
        <Text
          bold={isSelected}
          color={isSelected ? theme.colors.primary : theme.colors.foreground}
        >
          {isSelected ? "▶ " : "  "}
          {template.name}
        </Text>
        <Text color={getDifficultyColor(template.difficulty)}>
          {" "}
          [{template.difficulty}]
        </Text>
      </Box>

      {/* Description */}
      <Box marginLeft={2}>
        <Text color={theme.colors.muted} dimColor>
          {template.description}
        </Text>
      </Box>

      {/* Tags */}
      {template.tags.length > 0 && (
        <Box marginLeft={2}>
          <Text color={theme.colors.muted}>Tags: </Text>
          {template.tags.map((tag, index) => (
            <Text key={tag} color={theme.colors.info}>
              {index > 0 && ", "}
              {tag}
            </Text>
          ))}
        </Box>
      )}

      {/* Features (if detailed) */}
      {detailed && isSelected && template.features.length > 0 && (
        <Box marginLeft={2} marginTop={0}>
          <Box flexDirection="column">
            {template.features.slice(0, 3).map((feature) => (
              <Box key={feature}>
                <Text color={theme.colors.success}>✓</Text>
                <Text color={theme.colors.muted}> {feature}</Text>
              </Box>
            ))}
            {template.features.length > 3 && (
              <Text color={theme.colors.muted} dimColor>
                ... and {template.features.length - 3} more
              </Text>
            )}
          </Box>
        </Box>
      )}

      {/* Metadata */}
      {(template.author || template.files || template.size) && (
        <Box marginLeft={2}>
          {template.author && (
            <Text color={theme.colors.muted} dimColor>
              by {template.author}
            </Text>
          )}
          {template.files && (
            <Text color={theme.colors.muted} dimColor>
              {" "}
              • {template.files} files
            </Text>
          )}
          {template.size && (
            <Text color={theme.colors.muted} dimColor>
              {" "}
              • {template.size}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

/**
 * TemplateCard sub-component (for grid view)
 */
interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  theme: UITheme;
  getDifficultyColor: (difficulty: Template["difficulty"]) => string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  theme,
  getDifficultyColor,
}) => {
  return (
    <Box
      flexDirection="column"
      paddingX={1}
      paddingY={0}
      borderStyle="round"
      borderColor={isSelected ? theme.colors.primary : theme.colors.muted}
    >
      <Box>
        <Text
          bold={isSelected}
          color={isSelected ? theme.colors.primary : theme.colors.foreground}
        >
          {template.name}
        </Text>
      </Box>
      <Box>
        <Text color={theme.colors.muted} dimColor>
          {template.description.slice(0, 40)}
          {template.description.length > 40 ? "..." : ""}
        </Text>
      </Box>
      <Box>
        <Text color={getDifficultyColor(template.difficulty)}>
          {template.difficulty}
        </Text>
        {template.tags.length > 0 && (
          <Text color={theme.colors.muted}> • {template.tags[0]}</Text>
        )}
      </Box>
    </Box>
  );
};

export default TemplateGallery;
