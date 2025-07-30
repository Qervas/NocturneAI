import { writable, derived, get } from 'svelte/store';

export interface PanelConfig {
  id: string;
  title: string;
  component: string;
  icon?: string;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  resizable?: boolean;
  closable?: boolean;
}

export interface PanelState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isVisible: boolean;
  isDocked: boolean;
  dockPosition?: 'left' | 'right' | 'bottom' | 'top';
  isMinimized: boolean;
  isMaximized: boolean;
}

export interface LayoutState {
  panels: Map<string, PanelState>;
  dockedPanels: {
    left: string[];
    right: string[];
    bottom: string[];
    top: string[];
  };
  centerPanel: string | null;
  viewportWidth: number;
  viewportHeight: number;
  headerHeight: number;
  isDragging: boolean;
  dragTarget: string | null;
  resizeTarget: string | null;
  splitRatios: {
    leftWidth: number;
    rightWidth: number;
    bottomHeight: number;
    topHeight: number;
  };
}

const defaultPanels: PanelConfig[] = [
  {
    id: 'chat',
    title: 'Chat',
    component: 'GameChat',
    icon: '💬',
    minWidth: 250,
    defaultWidth: 350,
    resizable: true,
    closable: true
  },
  {
    id: 'canvas',
    title: 'Simulation',
    component: 'GamingCanvas',
    icon: '🎮',
    minWidth: 400,
    minHeight: 300,
    defaultWidth: 600,
    defaultHeight: 400,
    resizable: true,
    closable: false
  },
  {
    id: 'properties',
    title: 'Properties',
    component: 'PropertiesPanel',
    icon: '⚙️',
    minWidth: 250,
    defaultWidth: 350,
    resizable: true,
    closable: true
  },
  {
    id: 'terminal',
    title: 'Terminal',
    component: 'MultiTabTerminal',
    icon: '📟',
    minHeight: 150,
    defaultHeight: 250,
    resizable: true,
    closable: true
  }
];

const initialState: LayoutState = {
  panels: new Map(),
  dockedPanels: {
    left: ['chat'],
    right: ['properties'],
    bottom: ['terminal'],
    top: []
  },
  centerPanel: null,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  headerHeight: 60,
  isDragging: false,
  dragTarget: null,
  resizeTarget: null,
  splitRatios: {
    leftWidth: 0.25,
    rightWidth: 0.25,
    bottomHeight: 0.3,
    topHeight: 0.1
  }
};

// Initialize panel states
defaultPanels.forEach(panel => {
  const isDocked = panel.id !== 'canvas'; // Canvas starts as floating
  
  // Calculate safe starting position for floating panels
  let startX = 0;
  let startY = 60; // Below header
  
  if (panel.id === 'canvas') {
    // Center the canvas in the available space
    const canvasWidth = panel.defaultWidth || 600;
    const canvasHeight = panel.defaultHeight || 400;
    startX = Math.max(50, (window.innerWidth - canvasWidth) / 2);
    startY = Math.max(100, (window.innerHeight - canvasHeight) / 2);
  }
  
  initialState.panels.set(panel.id, {
    id: panel.id,
    x: startX,
    y: startY,
    width: panel.defaultWidth || (panel.id === 'canvas' ? 600 : 300),
    height: panel.defaultHeight || (panel.id === 'canvas' ? 400 : 200),
    zIndex: panel.id === 'canvas' ? 10 : 1,
    isVisible: true,
    isDocked: isDocked,
    dockPosition: panel.id === 'chat' ? 'left' : 
                  panel.id === 'properties' ? 'right' :
                  panel.id === 'terminal' ? 'bottom' : undefined,
    isMinimized: false,
    isMaximized: false
  });
});

export const flexLayoutStore = writable<LayoutState>(initialState);
export const panelConfigs = writable<Map<string, PanelConfig>>(
  new Map(defaultPanels.map(p => [p.id, p]))
);

export const layoutCalculations = derived(
  [flexLayoutStore],
  ([$layout]) => {
    const { viewportWidth, viewportHeight, headerHeight, splitRatios, dockedPanels } = $layout;
    
    const availableHeight = viewportHeight - headerHeight;
    const availableWidth = viewportWidth;

    // Calculate docked panel dimensions
    const leftWidth = dockedPanels.left.length > 0 ? availableWidth * splitRatios.leftWidth : 0;
    const rightWidth = dockedPanels.right.length > 0 ? availableWidth * splitRatios.rightWidth : 0;
    const bottomHeight = dockedPanels.bottom.length > 0 ? availableHeight * splitRatios.bottomHeight : 0;
    const topHeight = dockedPanels.top.length > 0 ? availableHeight * splitRatios.topHeight : 0;

    // Calculate center area
    const centerX = leftWidth;
    const centerY = headerHeight + topHeight;
    const centerWidth = availableWidth - leftWidth - rightWidth;
    const centerHeight = availableHeight - topHeight - bottomHeight;

    return {
      availableWidth,
      availableHeight,
      dockAreas: {
        left: { x: 0, y: headerHeight, width: leftWidth, height: availableHeight - bottomHeight },
        right: { x: availableWidth - rightWidth, y: headerHeight, width: rightWidth, height: availableHeight - bottomHeight },
        bottom: { x: 0, y: viewportHeight - bottomHeight, width: availableWidth, height: bottomHeight },
        top: { x: 0, y: headerHeight, width: availableWidth, height: topHeight }
      },
      centerArea: {
        x: centerX,
        y: centerY,
        width: centerWidth,
        height: centerHeight
      }
    };
  }
);

class FlexibleLayoutManager {
  private dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startPanelX: 0,
    startPanelY: 0,
    dragTarget: null as string | null
  };

  private resizeState = {
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    resizeTarget: null as string | null,
    resizeHandle: null as string | null
  };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleWindowResize() {
    flexLayoutStore.update(state => ({
      ...state,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    }));
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.dragState.isDragging && this.dragState.dragTarget) {
      this.handlePanelDrag(e);
    } else if (this.resizeState.isResizing && this.resizeState.resizeTarget) {
      this.handlePanelResize(e);
    }
  }

  private handleMouseUp() {
    if (this.dragState.isDragging) {
      this.endPanelDrag();
    }
    if (this.resizeState.isResizing) {
      this.endPanelResize();
    }
  }

  private handlePanelDrag(e: MouseEvent) {
    const deltaX = e.clientX - this.dragState.startX;
    const deltaY = e.clientY - this.dragState.startY;

    flexLayoutStore.update(state => {
      const panel = state.panels.get(this.dragState.dragTarget!);
      if (panel) {
        // Calculate new position with boundary constraints
        let newX = this.dragState.startPanelX + deltaX;
        let newY = this.dragState.startPanelY + deltaY;
        
        // Keep panel within viewport bounds
        const minX = 0;
        const maxX = state.viewportWidth - panel.width;
        const minY = state.headerHeight;
        const maxY = state.viewportHeight - panel.height;
        
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        const newPanel = {
          ...panel,
          x: newX,
          y: newY,
          isDocked: false,
          dockPosition: undefined
        };
        state.panels.set(panel.id, newPanel);
        
        // Remove from docked panels if it was docked
        Object.keys(state.dockedPanels).forEach(pos => {
          const index = state.dockedPanels[pos as keyof typeof state.dockedPanels].indexOf(panel.id);
          if (index > -1) {
            state.dockedPanels[pos as keyof typeof state.dockedPanels].splice(index, 1);
          }
        });
      }
      return { ...state, isDragging: true };
    });
  }

  private handlePanelResize(e: MouseEvent) {
    const deltaX = e.clientX - this.resizeState.startX;
    const deltaY = e.clientY - this.resizeState.startY;

    flexLayoutStore.update(state => {
      const panel = state.panels.get(this.resizeState.resizeTarget!);
      if (panel) {
        let newWidth = panel.width;
        let newHeight = panel.height;

        if (this.resizeState.resizeHandle?.includes('right')) {
          newWidth = Math.max(200, this.resizeState.startWidth + deltaX);
        }
        if (this.resizeState.resizeHandle?.includes('left')) {
          newWidth = Math.max(200, this.resizeState.startWidth - deltaX);
        }
        if (this.resizeState.resizeHandle?.includes('bottom')) {
          newHeight = Math.max(150, this.resizeState.startHeight + deltaY);
        }
        if (this.resizeState.resizeHandle?.includes('top')) {
          newHeight = Math.max(150, this.resizeState.startHeight - deltaY);
        }

        const newPanel = { ...panel, width: newWidth, height: newHeight };
        state.panels.set(panel.id, newPanel);
      }
      return state;
    });
  }

  private endPanelDrag() {
    this.dragState.isDragging = false;
    this.dragState.dragTarget = null;
    
    flexLayoutStore.update(state => ({
      ...state,
      isDragging: false,
      dragTarget: null
    }));
  }

  private endPanelResize() {
    this.resizeState.isResizing = false;
    this.resizeState.resizeTarget = null;
    this.resizeState.resizeHandle = null;
  }

  // Public methods
  public startPanelDrag(panelId: string, e: MouseEvent) {
    const state = get(flexLayoutStore);
    const panel = state.panels.get(panelId);
    
    if (panel) {
      this.dragState = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanelX: panel.x,
        startPanelY: panel.y,
        dragTarget: panelId
      };

      flexLayoutStore.update(s => ({
        ...s,
        isDragging: true,
        dragTarget: panelId
      }));
    }
  }

  public startPanelResize(panelId: string, handle: string, e: MouseEvent) {
    const state = get(flexLayoutStore);
    const panel = state.panels.get(panelId);
    
    if (panel) {
      this.resizeState = {
        isResizing: true,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: panel.width,
        startHeight: panel.height,
        resizeTarget: panelId,
        resizeHandle: handle
      };
    }
  }

  public dockPanel(panelId: string, position: 'left' | 'right' | 'bottom' | 'top') {
    flexLayoutStore.update(state => {
      const panel = state.panels.get(panelId);
      if (panel) {
        // Remove from current dock position
        Object.keys(state.dockedPanels).forEach(pos => {
          const index = state.dockedPanels[pos as keyof typeof state.dockedPanels].indexOf(panelId);
          if (index > -1) {
            state.dockedPanels[pos as keyof typeof state.dockedPanels].splice(index, 1);
          }
        });

        // Add to new dock position
        state.dockedPanels[position].push(panelId);

        // Update panel state
        const newPanel = {
          ...panel,
          isDocked: true,
          dockPosition: position,
          zIndex: 1,
          x: 0,
          y: 0
        };
        state.panels.set(panelId, newPanel);
        
        // End dragging state
        state.isDragging = false;
        state.dragTarget = null;
      }
      return state;
    });
    
    // Reset drag state
    this.endPanelDrag();
  }

  public undockPanel(panelId: string) {
    flexLayoutStore.update(state => {
      const panel = state.panels.get(panelId);
      if (panel) {
        // Remove from dock
        Object.keys(state.dockedPanels).forEach(pos => {
          const index = state.dockedPanels[pos as keyof typeof state.dockedPanels].indexOf(panelId);
          if (index > -1) {
            state.dockedPanels[pos as keyof typeof state.dockedPanels].splice(index, 1);
          }
        });

        // Update panel state
        const newPanel = {
          ...panel,
          isDocked: false,
          dockPosition: undefined,
          zIndex: Math.max(...Array.from(state.panels.values()).map(p => p.zIndex)) + 1
        };
        state.panels.set(panelId, newPanel);
      }
      return state;
    });
  }

  public togglePanel(panelId: string) {
    flexLayoutStore.update(state => {
      const panel = state.panels.get(panelId);
      if (panel) {
        const newPanel = { ...panel, isVisible: !panel.isVisible };
        state.panels.set(panelId, newPanel);
      }
      return state;
    });
  }

  public maximizePanel(panelId: string) {
    flexLayoutStore.update(state => {
      const panel = state.panels.get(panelId);
      if (panel) {
        const newPanel = {
          ...panel,
          isMaximized: !panel.isMaximized,
          zIndex: panel.isMaximized ? 1 : 9999
        };
        state.panels.set(panelId, newPanel);
      }
      return state;
    });
  }

  public setSplitRatio(position: keyof LayoutState['splitRatios'], ratio: number) {
    flexLayoutStore.update(state => ({
      ...state,
      splitRatios: {
        ...state.splitRatios,
        [position]: Math.max(0.1, Math.min(0.8, ratio))
      }
    }));
  }

  public addPanel(config: PanelConfig, initialState?: Partial<PanelState>) {
    panelConfigs.update(configs => {
      configs.set(config.id, config);
      return configs;
    });

    flexLayoutStore.update(state => {
      const panelState: PanelState = {
        id: config.id,
        x: 100,
        y: 100,
        width: config.defaultWidth || 300,
        height: config.defaultHeight || 200,
        zIndex: Math.max(...Array.from(state.panels.values()).map(p => p.zIndex)) + 1,
        isVisible: true,
        isDocked: false,
        isMinimized: false,
        isMaximized: false,
        ...initialState
      };
      
      state.panels.set(config.id, panelState);
      return state;
    });
  }

  public removePanel(panelId: string) {
    flexLayoutStore.update(state => {
      state.panels.delete(panelId);
      
      // Remove from docked panels
      Object.keys(state.dockedPanels).forEach(pos => {
        const index = state.dockedPanels[pos as keyof typeof state.dockedPanels].indexOf(panelId);
        if (index > -1) {
          state.dockedPanels[pos as keyof typeof state.dockedPanels].splice(index, 1);
        }
      });

      return state;
    });

    panelConfigs.update(configs => {
      configs.delete(panelId);
      return configs;
    });
  }
}

export const flexLayoutManager = new FlexibleLayoutManager();

export const layout = derived(
  [flexLayoutStore, layoutCalculations],
  ([$store, $calculations]) => ({
    ...$store,
    ...$calculations
  })
);