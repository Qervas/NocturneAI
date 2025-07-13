import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Users, Brain, Settings, Zap, Target, Palette, Sparkles, RefreshCw, Eye, EyeOff, Clock, Heart, Star, Shield, Lightbulb, Wrench } from 'lucide-react';

interface AgentCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: (agent: any) => void;
  editingAgent?: any;
}

interface AgentProfile {
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
  color_theme: string;
  primary_traits: string[];
  skill_categories: string[];
  expertise_areas: string[];
  experience_level: number;
  communication_style: string;
  decision_making_style: string;
  work_style: string;
  autonomy_level: string;
  custom_attributes: Record<string, any>;
}

interface ConfigData {
  traits: Array<{value: string, name: string}>;
  skills: Array<{value: string, name: string}>;
  communication_styles: Array<{value: string, name: string}>;
  decision_styles: Array<{value: string, name: string}>;
  work_styles: Array<{value: string, name: string}>;
  autonomy_levels: Array<{value: string, name: string}>;
  templates: Record<string, any>;
}

const EMOJI_OPTIONS = [
  '🤖', '👨‍💼', '👩‍💼', '🧠', '💡', '⚡', '🔥', '🌟', '🎯', '🚀',
  '💼', '📊', '🎨', '🔬', '⚙️', '🛡️', '🎭', '🌈', '🎪', '🎵',
  '📚', '🔍', '💎', '🏆', '🎲', '🎯', '🎪', '🎨', '🌟', '✨'
];

const COLOR_THEMES = [
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  { name: 'Cyan', value: 'cyan', class: 'bg-cyan-500' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-500' }
];

const TABS = [
  { id: 'basic', name: 'Basic Info', icon: Users, description: 'Name, role, and appearance' },
  { id: 'personality', name: 'Personality', icon: Heart, description: 'Core traits and characteristics' },
  { id: 'skills', name: 'Skills & Expertise', icon: Brain, description: 'Professional capabilities' },
  { id: 'behavior', name: 'Behavior', icon: Settings, description: 'Communication and decision making' },
  { id: 'autonomy', name: 'Autonomy', icon: Zap, description: 'Independent behavior settings' },
  { id: 'advanced', name: 'Advanced', icon: Wrench, description: 'Custom attributes and templates' }
];

export const AgentCreator: React.FC<AgentCreatorProps> = ({ isOpen, onClose, onAgentCreated, editingAgent }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [configData, setConfigData] = useState<ConfigData>({
    traits: [],
    skills: [],
    communication_styles: [],
    decision_styles: [],
    work_styles: [],
    autonomy_levels: [],
    templates: {}
  });
  
  const [profile, setProfile] = useState<AgentProfile>({
    name: '',
    role: '',
    description: '',
    avatar_emoji: '🤖',
    color_theme: 'blue',
    primary_traits: [],
    skill_categories: [],
    expertise_areas: [],
    experience_level: 0.5,
    communication_style: 'casual',
    decision_making_style: 'data_driven',
    work_style: 'structured',
    autonomy_level: 'proactive',
    custom_attributes: {}
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadConfigData();
      if (editingAgent) {
        setProfile(editingAgent);
      } else {
        resetProfile();
      }
    }
  }, [isOpen, editingAgent]);

  const loadConfigData = async () => {
    try {
      const [traitsRes, skillsRes, commStylesRes, decisionStylesRes, workStylesRes, autonomyRes, templatesRes] = await Promise.all([
        fetch('/api/dynamic/config/traits'),
        fetch('/api/dynamic/config/skills'),
        fetch('/api/dynamic/config/communication-styles'),
        fetch('/api/dynamic/config/decision-styles'),
        fetch('/api/dynamic/config/work-styles'),
        fetch('/api/dynamic/config/autonomy-levels'),
        fetch('/api/dynamic/templates')
      ]);

      const [traits, skills, communication_styles, decision_styles, work_styles, autonomy_levels, templates] = await Promise.all([
        traitsRes.json(),
        skillsRes.json(),
        commStylesRes.json(),
        decisionStylesRes.json(),
        workStylesRes.json(),
        autonomyRes.json(),
        templatesRes.json()
      ]);

      setConfigData({
        traits: traits.traits || [],
        skills: skills.skills || [],
        communication_styles: communication_styles.styles || [],
        decision_styles: decision_styles.styles || [],
        work_styles: work_styles.styles || [],
        autonomy_levels: autonomy_levels.levels || [],
        templates: templates.templates || {}
      });
    } catch (error) {
      console.error('Error loading config data:', error);
    }
  };

  const resetProfile = () => {
    setProfile({
      name: '',
      role: '',
      description: '',
      avatar_emoji: '🤖',
      color_theme: 'blue',
      primary_traits: [],
      skill_categories: [],
      expertise_areas: [],
      experience_level: 0.5,
      communication_style: 'casual',
      decision_making_style: 'data_driven',
      work_style: 'structured',
      autonomy_level: 'proactive',
      custom_attributes: {}
    });
    setErrors({});
  };

  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profile.role.trim()) {
      newErrors.role = 'Role is required';
    }

    if (!profile.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (profile.primary_traits.length === 0) {
      newErrors.primary_traits = 'At least one personality trait is required';
    }

    if (profile.skill_categories.length === 0) {
      newErrors.skill_categories = 'At least one skill category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateProfile()) {
      return;
    }

    setIsLoading(true);
    try {
      const url = editingAgent ? `/api/dynamic/agents/${editingAgent.agent_id}` : '/api/dynamic/agents';
      const method = editingAgent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      });

      const result = await response.json();

      if (result.success) {
        onAgentCreated(result.agent);
        onClose();
        resetProfile();
      } else {
        setErrors({ general: result.message || 'Failed to create agent' });
      }
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTraitToggle = (trait: string) => {
    setProfile(prev => ({
      ...prev,
      primary_traits: prev.primary_traits.includes(trait)
        ? prev.primary_traits.filter(t => t !== trait)
        : [...prev.primary_traits, trait]
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skill_categories: prev.skill_categories.includes(skill)
        ? prev.skill_categories.filter(s => s !== skill)
        : [...prev.skill_categories, skill]
    }));
  };

  const handleExpertiseAdd = (expertise: string) => {
    if (expertise.trim() && !profile.expertise_areas.includes(expertise.trim())) {
      setProfile(prev => ({
        ...prev,
        expertise_areas: [...prev.expertise_areas, expertise.trim()]
      }));
    }
  };

  const handleExpertiseRemove = (expertise: string) => {
    setProfile(prev => ({
      ...prev,
      expertise_areas: prev.expertise_areas.filter(e => e !== expertise)
    }));
  };

  const applyTemplate = (templateName: string) => {
    const template = configData.templates[templateName];
    if (template) {
      setProfile(prev => ({
        ...prev,
        primary_traits: template.primary_traits || [],
        skill_categories: template.skill_categories || [],
        expertise_areas: template.expertise_areas || [],
        communication_style: template.communication_style || 'casual',
        decision_making_style: template.decision_making_style || 'data_driven',
        work_style: template.work_style || 'structured',
        autonomy_level: template.autonomy_level || 'proactive',
        avatar_emoji: template.avatar_emoji || '🤖',
        color_theme: template.color_theme || 'blue'
      }));
    }
  };

  const getProfileCompletionPercentage = () => {
    const fields = [
      profile.name,
      profile.role,
      profile.description,
      profile.primary_traits.length > 0,
      profile.skill_categories.length > 0,
      profile.expertise_areas.length > 0
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const renderBasicTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Basic Information</h3>
        <p className="text-slate-400">Set up your agent's identity and appearance</p>
      </div>

      {/* Avatar Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Avatar</label>
        <div className="grid grid-cols-10 gap-2">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setProfile(prev => ({ ...prev, avatar_emoji: emoji }))}
              className={`p-2 rounded-lg text-2xl transition-all ${
                profile.avatar_emoji === emoji
                  ? 'bg-blue-500 ring-2 ring-blue-400'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Color Theme */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Color Theme</label>
        <div className="grid grid-cols-5 gap-3">
          {COLOR_THEMES.map(theme => (
            <button
              key={theme.value}
              onClick={() => setProfile(prev => ({ ...prev, color_theme: theme.value }))}
              className={`p-3 rounded-lg text-white font-medium transition-all ${
                profile.color_theme === theme.value
                  ? `${theme.class} ring-2 ring-white`
                  : `${theme.class} opacity-70 hover:opacity-100`
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
          className={`w-full p-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-slate-600'
          }`}
          placeholder="Enter agent name"
        />
        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
        <input
          type="text"
          value={profile.role}
          onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))}
          className={`w-full p-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.role ? 'border-red-500' : 'border-slate-600'
          }`}
          placeholder="e.g., Marketing Specialist, Data Analyst"
        />
        {errors.role && <p className="text-red-400 text-sm mt-1">{errors.role}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
        <textarea
          value={profile.description}
          onChange={(e) => setProfile(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          className={`w-full p-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : 'border-slate-600'
          }`}
          placeholder="Describe what this agent does and their key responsibilities"
        />
        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
      </div>
    </div>
  );

  const renderPersonalityTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Personality Traits</h3>
        <p className="text-slate-400">Select up to 5 core traits that define your agent's personality</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {configData.traits.map(trait => (
          <button
            key={trait.value}
            onClick={() => handleTraitToggle(trait.value)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              profile.primary_traits.includes(trait.value)
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
            }`}
            disabled={!profile.primary_traits.includes(trait.value) && profile.primary_traits.length >= 5}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{trait.name}</span>
              {profile.primary_traits.includes(trait.value) && (
                <Star className="h-4 w-4 text-blue-400" />
              )}
            </div>
          </button>
        ))}
      </div>

      {errors.primary_traits && <p className="text-red-400 text-sm">{errors.primary_traits}</p>}

      <div className="bg-slate-700/50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Selected Traits ({profile.primary_traits.length}/5)</h4>
        <div className="flex flex-wrap gap-2">
          {profile.primary_traits.map(trait => {
            const traitData = configData.traits.find(t => t.value === trait);
            return (
              <span key={trait} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                {traitData?.name || trait}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSkillsTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Skills & Expertise</h3>
        <p className="text-slate-400">Define your agent's professional capabilities</p>
      </div>

      {/* Skill Categories */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Skill Categories</label>
        <div className="grid grid-cols-2 gap-3">
          {configData.skills.map(skill => (
            <button
              key={skill.value}
              onClick={() => handleSkillToggle(skill.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                profile.skill_categories.includes(skill.value)
                  ? 'border-green-500 bg-green-500/20 text-green-300'
                  : 'border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{skill.name}</span>
                {profile.skill_categories.includes(skill.value) && (
                  <Shield className="h-4 w-4 text-green-400" />
                )}
              </div>
            </button>
          ))}
        </div>
        {errors.skill_categories && <p className="text-red-400 text-sm mt-1">{errors.skill_categories}</p>}
      </div>

      {/* Expertise Areas */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Specific Expertise Areas</label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add expertise area (e.g., machine learning, market research)"
              className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  handleExpertiseAdd(target.value);
                  target.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder*="Add expertise"]') as HTMLInputElement;
                if (input) {
                  handleExpertiseAdd(input.value);
                  input.value = '';
                }
              }}
              className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {profile.expertise_areas.map(expertise => (
              <span
                key={expertise}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-1 cursor-pointer hover:bg-purple-500/30"
                onClick={() => handleExpertiseRemove(expertise)}
              >
                {expertise}
                <X className="h-3 w-3 hover:text-red-400" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Experience Level: {Math.round(profile.experience_level * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={profile.experience_level}
          onChange={(e) => setProfile(prev => ({ ...prev, experience_level: parseFloat(e.target.value) }))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Beginner</span>
          <span>Expert</span>
        </div>
      </div>
    </div>
  );

  const renderBehaviorTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Behavior & Communication</h3>
        <p className="text-slate-400">Configure how your agent interacts and makes decisions</p>
      </div>

      {/* Communication Style */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Communication Style</label>
        <div className="grid grid-cols-1 gap-3">
          {configData.communication_styles.map(style => (
            <button
              key={style.value}
              onClick={() => setProfile(prev => ({ ...prev, communication_style: style.value }))}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                profile.communication_style === style.value
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{style.name}</span>
                {profile.communication_style === style.value && (
                  <Target className="h-4 w-4 text-blue-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Decision Making Style */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Decision Making Style</label>
        <div className="grid grid-cols-1 gap-3">
          {configData.decision_styles.map(style => (
            <button
              key={style.value}
              onClick={() => setProfile(prev => ({ ...prev, decision_making_style: style.value }))}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                profile.decision_making_style === style.value
                  ? 'border-green-500 bg-green-500/20 text-green-300'
                  : 'border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{style.name}</span>
                {profile.decision_making_style === style.value && (
                  <Lightbulb className="h-4 w-4 text-green-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Work Style */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Work Style</label>
        <div className="grid grid-cols-1 gap-3">
          {configData.work_styles.map(style => (
            <button
              key={style.value}
              onClick={() => setProfile(prev => ({ ...prev, work_style: style.value }))}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                profile.work_style === style.value
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{style.name}</span>
                {profile.work_style === style.value && (
                  <Clock className="h-4 w-4 text-purple-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAutonomyTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Autonomy & Independence</h3>
        <p className="text-slate-400">Set how independently your agent operates</p>
      </div>

      {/* Autonomy Level */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Autonomy Level</label>
        <div className="space-y-3">
          {configData.autonomy_levels.map(level => (
            <button
              key={level.value}
              onClick={() => setProfile(prev => ({ ...prev, autonomy_level: level.value }))}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                profile.autonomy_level === level.value
                  ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                  : 'border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{level.name}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    {level.value === 'reactive' && 'Only responds when directly asked'}
                    {level.value === 'proactive' && 'Takes initiative and offers suggestions'}
                    {level.value === 'autonomous' && 'Makes decisions and takes actions independently'}
                    {level.value === 'fully_autonomous' && 'Creates own goals and operates completely independently'}
                  </div>
                </div>
                {profile.autonomy_level === level.value && (
                  <Zap className="h-4 w-4 text-orange-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Autonomy Settings Preview */}
      <div className="bg-slate-700/50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Autonomy Behavior Preview</h4>
        <div className="space-y-2 text-sm">
          {profile.autonomy_level === 'reactive' && (
            <div className="flex items-center gap-2 text-slate-400">
              <Eye className="h-4 w-4" />
              <span>Agent will wait for direct instructions</span>
            </div>
          )}
          {profile.autonomy_level === 'proactive' && (
            <>
              <div className="flex items-center gap-2 text-blue-400">
                <Eye className="h-4 w-4" />
                <span>Agent will offer suggestions and help</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Lightbulb className="h-4 w-4" />
                <span>Agent will proactively share relevant insights</span>
              </div>
            </>
          )}
          {profile.autonomy_level === 'autonomous' && (
            <>
              <div className="flex items-center gap-2 text-green-400">
                <Zap className="h-4 w-4" />
                <span>Agent will make independent decisions</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Target className="h-4 w-4" />
                <span>Agent will initiate conversations with other agents</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Brain className="h-4 w-4" />
                <span>Agent will learn and adapt from interactions</span>
              </div>
            </>
          )}
          {profile.autonomy_level === 'fully_autonomous' && (
            <>
              <div className="flex items-center gap-2 text-orange-400">
                <Sparkles className="h-4 w-4" />
                <span>Agent will create its own goals and objectives</span>
              </div>
              <div className="flex items-center gap-2 text-orange-400">
                <Users className="h-4 w-4" />
                <span>Agent will collaborate with other agents independently</span>
              </div>
              <div className="flex items-center gap-2 text-orange-400">
                <RefreshCw className="h-4 w-4" />
                <span>Agent will continuously evolve and improve</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Advanced Options</h3>
        <p className="text-slate-400">Templates and custom attributes</p>
      </div>

      {/* Templates */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Quick Start Templates</label>
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(configData.templates).map(([templateName, template]) => (
            <button
              key={templateName}
              onClick={() => applyTemplate(templateName)}
              className="p-4 rounded-lg border-2 border-slate-600 hover:border-slate-500 text-left transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{template.name}</div>
                  <div className="text-sm text-slate-400 mt-1">{template.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl">{template.avatar_emoji}</span>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                      {template.role}
                    </span>
                  </div>
                </div>
                <Palette className="h-5 w-5 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Attributes */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Custom Attributes</label>
        <div className="space-y-3">
          <div className="text-sm text-slate-400">
            Add custom key-value pairs to further customize your agent's behavior
          </div>
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="text-sm text-slate-300 mb-2">Coming soon: Custom attribute editor</div>
            <div className="text-xs text-slate-500">
              This feature will allow you to add custom personality tweaks, behavioral modifiers, and specialized instructions
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    const completionPercentage = getProfileCompletionPercentage();
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Agent Preview</h3>
          <p className="text-slate-400">Review your agent before creation</p>
        </div>

        {/* Completion Status */}
        <div className="bg-slate-700/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Profile Completion</span>
            <span className="text-sm text-slate-400">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Agent Card Preview */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-lg border border-slate-600">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">{profile.avatar_emoji}</div>
            <div>
              <h4 className="text-xl font-semibold text-white">{profile.name || 'Unnamed Agent'}</h4>
              <p className="text-slate-400">{profile.role || 'No role specified'}</p>
            </div>
          </div>
          
          <p className="text-slate-300 mb-4">{profile.description || 'No description provided'}</p>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-slate-300">Personality: </span>
              <span className="text-sm text-slate-400">
                {profile.primary_traits.length > 0 
                  ? profile.primary_traits.map(trait => 
                      configData.traits.find(t => t.value === trait)?.name || trait
                    ).join(', ')
                  : 'No traits selected'
                }
              </span>
            </div>
            
            <div>
              <span className="text-sm font-medium text-slate-300">Skills: </span>
              <span className="text-sm text-slate-400">
                {profile.skill_categories.length > 0 
                  ? profile.skill_categories.map(skill => 
                      configData.skills.find(s => s.value === skill)?.name || skill
                    ).join(', ')
                  : 'No skills selected'
                }
              </span>
            </div>
            
            <div>
              <span className="text-sm font-medium text-slate-300">Autonomy: </span>
              <span className="text-sm text-slate-400">
                {configData.autonomy_levels.find(l => l.value === profile.autonomy_level)?.name || profile.autonomy_level}
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg">
            <p className="text-red-300">{errors.general}</p>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{profile.avatar_emoji}</div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {editingAgent ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <p className="text-slate-400">
                {editingAgent ? 'Modify your agent\'s profile' : 'Design your perfect AI assistant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-slate-800/50 p-4 border-r border-slate-700">
            <div className="space-y-2">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs opacity-75">{tab.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Preview Toggle */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`w-full p-3 rounded-lg transition-all ${
                  previewMode
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {previewMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  <span>{previewMode ? 'Exit Preview' : 'Preview Agent'}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {previewMode ? renderPreview() : (
              <>
                {activeTab === 'basic' && renderBasicTab()}
                {activeTab === 'personality' && renderPersonalityTab()}
                {activeTab === 'skills' && renderSkillsTab()}
                {activeTab === 'behavior' && renderBehaviorTab()}
                {activeTab === 'autonomy' && renderAutonomyTab()}
                {activeTab === 'advanced' && renderAdvancedTab()}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Profile {getProfileCompletionPercentage()}% complete
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || getProfileCompletionPercentage() < 80}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isLoading || getProfileCompletionPercentage() < 80
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {editingAgent ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 