import { writable, derived } from 'svelte/store';

export interface TileNode {
  id: string;
  type: 'container' | 'panel';
  direction?: 'horizontal' | 'vertical';
  children?: TileNode[];
  component?: string;
  title?: string;
  icon?: string;
  size?: number; // Percentage of parent container
  minSize?: number;
  isVisible?: boolean;
}

export interface TilingLayoutState {
  rootNode: TileNode;
  focusedPanel: string | null;
  draggedPanel: string | null;
  splitPreview: {
    targetId: string;
    direction: 'horizontal' | 'vertical';
    position: 'before' | 'after';
  } | null;
}

// Initial tiling layout - similar to VSCode default
const initialLayout: TilingLayoutState = {
  rootNode: {
    id: 'root',
    type: 'container',
    direction: 'horizontal',
    isVisible: true,
    children: [
      // Left sidebar
      {
        id: 'sidebar-left',
        type: 'panel',
        component: 'GameChat',
        title: 'Interaction',
        icon: '💬',
        size: 25,
        minSize: 200,
        isVisible: true
      },
      // Main area
      {
        id: 'main-area',
        type: 'container',
        direction: 'vertical',
        size: 50,
        isVisible: true,
        children: [
          // Canvas area
          {
            id: 'canvas-area',
            type: 'panel',
            component: 'GamingCanvas',
            title: 'Simulation',
            icon: '🎮',
            size: 70,
            minSize: 300,
            isVisible: true
          },
          // Terminal area
          {
            id: 'terminal-area',
            type: 'panel',
            component: 'MultiTabTerminal',
            title: 'Terminal',
            icon: '📟',
            size: 25,
            minSize: 200,
            isVisible: true
          }
        ]
      },
      // Right sidebar
      {
        id: 'sidebar-right',
        type: 'panel',
        component: 'PropertiesPanel',
        title: 'Properties',
        icon: '⚙️',
        size: 25,
        minSize: 200,
        isVisible: true
      }
    ]
  },
  focusedPanel: 'canvas-area',
  draggedPanel: null,
  splitPreview: null
};

// Additional panels that can be toggled
const additionalPanels = {
  'settings-panel': {
    id: 'settings-panel',
    type: 'panel' as const,
    component: 'SettingsPanel',
    title: 'Settings',
    icon: '⚙️',
    size: 30,
    minSize: 300,
    isVisible: false
  },
  'help-panel': {
    id: 'help-panel',
    type: 'panel' as const,
    component: 'HelpPanel',
    title: 'Help',
    icon: '❓',
    size: 30,
    minSize: 300,
    isVisible: false
  }
};

export const tilingLayoutStore = writable<TilingLayoutState>(initialLayout);


class TilingLayoutManager {
  private dragState = {
    isDragging: false,
    draggedNode: null as TileNode | null,
    startX: 0,
    startY: 0
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleMouseMove(e: MouseEvent) {
    // Disabled drag functionality to prevent panels from disappearing
  }

  private handleMouseUp() {
    // Reset drag state without performing any operations
    if (this.dragState.isDragging) {
      tilingLayoutStore.update(state => ({
        ...state,
        draggedPanel: null,
        splitPreview: null
      }));
      
      this.dragState.isDragging = false;
      this.dragState.draggedNode = null;
    }
  }

  private findNodeById(node: TileNode, id: string): TileNode | null {
    if (node.id === id) return node;
    
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, id);
        if (found) return found;
      }
    }
    
    return null;
  }

  // Public methods
  public startDrag(panelId: string, e: MouseEvent) {
    // Disabled drag functionality to prevent panels from disappearing
    // Just focus the panel instead
    this.focusPanel(panelId);
  }

  public focusPanel(panelId: string) {
    tilingLayoutStore.update(state => ({
      ...state,
      focusedPanel: panelId
    }));
  }

  public togglePanel(panelId: string) {
    tilingLayoutStore.update(state => {
      const node = this.findNodeById(state.rootNode, panelId);
      if (node) {
        node.isVisible = !node.isVisible;
      } else {
        // Handle additional panels that are not in the main layout
        const additionalPanel = additionalPanels[panelId as keyof typeof additionalPanels];
        if (additionalPanel) {
          // Add the panel to the layout if it doesn't exist
          if (!this.findNodeById(state.rootNode, panelId)) {
            // Add to the main area as a floating panel
            const mainArea = this.findNodeById(state.rootNode, 'main-area');
            if (mainArea && mainArea.children) {
              mainArea.children.push({
                ...additionalPanel,
                isVisible: true
              });
            }
          }
        }
      }
      return { ...state };
    });
  }

  public showPanel(panelId: string) {
    tilingLayoutStore.update(state => {
      const node = this.findNodeById(state.rootNode, panelId);
      if (node) {
        node.isVisible = true;
      } else {
        // Handle additional panels
        const additionalPanel = additionalPanels[panelId as keyof typeof additionalPanels];
        if (additionalPanel) {
          const mainArea = this.findNodeById(state.rootNode, 'main-area');
          if (mainArea && mainArea.children) {
            mainArea.children.push({
              ...additionalPanel,
              isVisible: true
            });
          }
        }
      }
      return { ...state };
    });
  }

  public resizePanel(panelId: string, newSize: number) {
    tilingLayoutStore.update(state => {
      const node = this.findNodeById(state.rootNode, panelId);
      if (node) {
        node.size = Math.max(node.minSize || 100, newSize);
      }
      return { ...state };
    });
  }


  public closePanel(panelId: string) {
    // Simply hide the panel instead of removing it from the layout tree
    this.togglePanel(panelId);
  }
}

export const tilingLayoutManager = new TilingLayoutManager();

// Derived store for layout calculations
export const tilingCalculations = derived(
  [tilingLayoutStore],
  ([$layout]) => {
    // Helper function to count all visible panels in the entire layout
    const countVisiblePanels = (node: TileNode): number => {
      if (node.type === 'panel') {
        return node.isVisible !== false ? 1 : 0;
      }
      if (node.type === 'container' && node.children) {
        return node.children.reduce((count, child) => count + countVisiblePanels(child), 0);
      }
      return 0;
    };

    // Helper function to check if a container has any visible children
    const hasVisibleChildren = (node: TileNode): boolean => {
      if (node.type === 'panel') {
        return node.isVisible !== false;
      }
      if (node.type === 'container' && node.children) {
        return node.children.some(child => hasVisibleChildren(child));
      }
      return false;
    };

    // Helper function to find the single visible panel
    const findSingleVisiblePanel = (node: TileNode): TileNode | null => {
      if (node.type === 'panel' && node.isVisible !== false) {
        return node;
      }
      if (node.type === 'container' && node.children) {
        for (const child of node.children) {
          const found = findSingleVisiblePanel(child);
          if (found) return found;
        }
      }
      return null;
    };

    const calculateLayout = (node: TileNode, x: number, y: number, width: number, height: number): any => {
      
      if (node.type === 'panel') {
        if (!node.isVisible) return null;
        
        return {
          id: node.id,
          component: node.component,
          title: node.title,
          icon: node.icon,
          x,
          y,
          width,
          height,
          isVisible: node.isVisible,
          isFocused: $layout.focusedPanel === node.id,
          isDragged: $layout.draggedPanel === node.id
        };
      }

      if (node.type === 'container' && node.children) {
        const layouts: any[] = [];
        let currentPos = node.direction === 'horizontal' ? x : y;
        
        // Filter children that have visible content (panels or containers with visible children)
        const visibleChildren = node.children.filter(child => hasVisibleChildren(child));
        
        // Calculate total size of visible children and redistribute space
        const totalOriginalSize = visibleChildren.reduce((sum, child) => sum + (child.size || 0), 0);
        const availableSpace = 100;
        
        for (let i = 0; i < visibleChildren.length; i++) {
          const child = visibleChildren[i];
          
          // Redistribute space proportionally among visible children
          let adjustedSize: number;
          if (visibleChildren.length === 1) {
            // If only one child is visible, give it all the space
            adjustedSize = 100;
          } else {
            // Redistribute proportionally based on original sizes
            const originalSize = child.size || (100 / node.children!.length);
            adjustedSize = totalOriginalSize > 0 
              ? (originalSize / totalOriginalSize) * availableSpace
              : availableSpace / visibleChildren.length;
          }
          
          const childWidth = node.direction === 'horizontal' 
            ? (width * adjustedSize / 100) 
            : width;
          const childHeight = node.direction === 'vertical' 
            ? (height * adjustedSize / 100) 
            : height;
          
          const childX = node.direction === 'horizontal' ? currentPos : x;
          const childY = node.direction === 'vertical' ? currentPos : y;
          
          const childLayout = calculateLayout(child, childX, childY, childWidth, childHeight);
          
          if (childLayout) {
            if (Array.isArray(childLayout)) {
              layouts.push(...childLayout);
            } else {
              layouts.push(childLayout);
            }
          }
          
          currentPos += node.direction === 'horizontal' ? childWidth : childHeight;
        }
        
        return layouts;
      }
      
      return [];
    };

    // Get actual container dimensions instead of hardcoded values
    const container = document.querySelector('.tiling-layout-container') as HTMLElement;
    const viewportWidth = container ? container.clientWidth : window.innerWidth;
    const viewportHeight = container ? container.clientHeight : window.innerHeight;
    
    // Check if only one panel is visible across the entire layout
    const totalVisiblePanels = countVisiblePanels($layout.rootNode);
    
    if (totalVisiblePanels === 1) {
      // If only one panel is visible, make it fill the entire container
      const singlePanel = findSingleVisiblePanel($layout.rootNode);
      if (singlePanel) {
        return [{
          id: singlePanel.id,
          component: singlePanel.component,
          title: singlePanel.title,
          icon: singlePanel.icon,
          x: 0,
          y: 0,
          width: viewportWidth,
          height: viewportHeight,
          isVisible: true,
          isFocused: $layout.focusedPanel === singlePanel.id,
          isDragged: $layout.draggedPanel === singlePanel.id
        }];
      }
    }
    
    // Calculate layout starting from the root node
    const layouts = calculateLayout($layout.rootNode, 0, 0, viewportWidth, viewportHeight);
    
    // Ensure all panels stay within viewport bounds
    return layouts.map((layout: any) => ({
      ...layout,
      x: Math.max(0, Math.min(layout.x, viewportWidth - layout.width)),
      y: Math.max(0, Math.min(layout.y, viewportHeight - layout.height)),
      width: Math.min(layout.width, viewportWidth),
      height: Math.min(layout.height, viewportHeight)
    }));
  }
);
