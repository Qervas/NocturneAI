import { writable } from 'svelte/store';

// World resources data store
export const worldResources = writable({
  energy: 1000,
  materials: 500,
  knowledge: 200,
  credits: 10000,
  time: 0,
  agents: 3,
  projects: 0,
  completedTasks: 0
});

// Resource types and their properties
export const resourceTypes: Record<string, { name: string; icon: string; color: string; max: number }> = {
  energy: { name: 'Energy', icon: '⚡', color: '#ffd700', max: 1000 },
  materials: { name: 'Materials', icon: '🔧', color: '#8b4513', max: 500 },
  knowledge: { name: 'Knowledge', icon: '📚', color: '#4169e1', max: 200 },
  credits: { name: 'Credits', icon: '💰', color: '#32cd32', max: 10000 },
  time: { name: 'Time', icon: '⏰', color: '#ff6347', max: 24 },
  agents: { name: 'Agents', icon: '🤖', color: '#9370db', max: 10 },
  projects: { name: 'Projects', icon: '📋', color: '#ff8c00', max: 50 },
  completedTasks: { name: 'Completed', icon: '✅', color: '#00ff00', max: 100 }
};

// Helper functions
export function getResourcePercentage(resource: string, value: number): number {
  const max = resourceTypes[resource]?.max || 100;
  return Math.min((value / max) * 100, 100);
}

export function getResourceColor(resource: string, value: number): string {
  const percentage = getResourcePercentage(resource, value);
  if (percentage >= 80) return '#00ff00'; // Green for high
  if (percentage >= 50) return '#ffff00'; // Yellow for medium
  return '#ff0000'; // Red for low
}

export function formatResourceValue(resource: string, value: number): string {
  if (resource === 'time') {
    const hours = Math.floor(value);
    const minutes = Math.floor((value - hours) * 60);
    return `${hours}h ${minutes}m`;
  }
  if (resource === 'credits') {
    return `$${value.toLocaleString()}`;
  }
  return value.toString();
} 