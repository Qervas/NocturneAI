import { writable, derived } from 'svelte/store';

export interface LayoutState {
  // Main layout dimensions
  viewportWidth: number;
  viewportHeight: number;
  
  // Component dimensions and states
  headerHeight: number;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  centerWidth: number;
  
  // Responsive breakpoints
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Component visibility states
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  
  // Overflow states
  chatOverflow: boolean;
  propertiesOverflow: boolean;
  canvasOverflow: boolean;
  
  // Layout mode
  layoutMode: 'default' | 'compact' | 'fullscreen';
}

// Default layout state
const defaultState: LayoutState = {
  viewportWidth: 1200,
  viewportHeight: 800,
  headerHeight: 60,
  leftSidebarWidth: 350,
  rightSidebarWidth: 350,
  centerWidth: 500,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  showLeftSidebar: true,
  showRightSidebar: true,
  chatOverflow: false,
  propertiesOverflow: false,
  canvasOverflow: false,
  layoutMode: 'default'
};

// Create the main layout store
export const layoutStore = writable<LayoutState>(defaultState);

// Derived stores for specific layout calculations
export const layoutCalculations = derived(layoutStore, ($layout) => {
  const { viewportWidth, viewportHeight, headerHeight, leftSidebarWidth, rightSidebarWidth, showLeftSidebar, showRightSidebar } = $layout;
  
  // Calculate available space
  const availableWidth = viewportWidth;
  const availableHeight = viewportHeight - headerHeight;
  
  // Calculate sidebar widths
  const effectiveLeftWidth = showLeftSidebar ? leftSidebarWidth : 0;
  const effectiveRightWidth = showRightSidebar ? rightSidebarWidth : 0;
  
  // Calculate center width
  const centerWidth = availableWidth - effectiveLeftWidth - effectiveRightWidth;
  
  // Calculate component heights
  const sidebarHeight = availableHeight;
  const centerHeight = availableHeight;
  
  return {
    // Available space
    availableWidth,
    availableHeight,
    
    // Component dimensions
    leftSidebar: {
      width: effectiveLeftWidth,
      height: sidebarHeight,
      visible: showLeftSidebar
    },
    rightSidebar: {
      width: effectiveRightWidth,
      height: sidebarHeight,
      visible: showRightSidebar
    },
    center: {
      width: centerWidth,
      height: centerHeight
    },
    
    // Responsive calculations
    isCompact: centerWidth < 400,
    isVeryCompact: centerWidth < 300,
    
    // Grid template
    gridTemplateColumns: `${effectiveLeftWidth}px 1fr ${effectiveRightWidth}px`,
    gridTemplateRows: `${headerHeight}px 1fr`
  };
});

// Layout manager class
class LayoutManager {
  private resizeObserver: ResizeObserver | null = null;
  private debounceTimer: number | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Set initial viewport size
    this.updateViewportSize();
    
    // Set up resize observer
    this.setupResizeObserver();
    
    // Set up window resize listener
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Set up responsive breakpoints
    this.updateResponsiveState();
  }

  private updateViewportSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    layoutStore.update(state => ({
      ...state,
      viewportWidth: width,
      viewportHeight: height
    }));
  }

  private handleResize = () => {
    // Debounce resize events
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.updateViewportSize();
      this.updateResponsiveState();
    }, 100);
  };

  private setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach(entry => {
          const { width, height } = entry.contentRect;
          this.handleComponentResize(entry.target as HTMLElement, width, height);
        });
      });
    }
  }

  private handleComponentResize(element: HTMLElement, width: number, height: number) {
    const componentId = element.dataset.layoutComponent;
    
    if (!componentId) return;
    
    // Check for overflow
    const hasOverflow = element.scrollHeight > element.clientHeight || 
                       element.scrollWidth > element.clientWidth;
    
    layoutStore.update(state => {
      const updates: Partial<LayoutState> = {};
      
      switch (componentId) {
        case 'chat':
          updates.chatOverflow = hasOverflow;
          break;
        case 'properties':
          updates.propertiesOverflow = hasOverflow;
          break;
        case 'canvas':
          updates.canvasOverflow = hasOverflow;
          break;
      }
      
      return { ...state, ...updates };
    });
  }

  private updateResponsiveState() {
    const width = window.innerWidth;
    
    layoutStore.update(state => ({
      ...state,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024
    }));
  }

  // Public methods
  public observeElement(element: HTMLElement, componentId: string) {
    element.dataset.layoutComponent = componentId;
    this.resizeObserver?.observe(element);
  }

  public unobserveElement(element: HTMLElement) {
    this.resizeObserver?.unobserve(element);
  }

  public toggleSidebar(side: 'left' | 'right') {
    layoutStore.update(state => {
      if (side === 'left') {
        return { ...state, showLeftSidebar: !state.showLeftSidebar };
      } else {
        return { ...state, showRightSidebar: !state.showRightSidebar };
      }
    });
  }

  public setLayoutMode(mode: LayoutState['layoutMode']) {
    layoutStore.update(state => ({
      ...state,
      layoutMode: mode
    }));
  }

  public adjustSidebarWidth(side: 'left' | 'right', width: number) {
    layoutStore.update(state => ({
      ...state,
      [`${side}SidebarWidth`]: Math.max(200, Math.min(500, width))
    }));
  }

  public getResponsiveLayout() {
    return derived(layoutStore, ($layout) => {
      if ($layout.isMobile) {
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: 'auto 1fr auto',
          showLeftSidebar: false,
          showRightSidebar: false
        };
      } else if ($layout.isTablet) {
        return {
          gridTemplateColumns: '300px 1fr 300px',
          gridTemplateRows: 'auto 1fr',
          showLeftSidebar: true,
          showRightSidebar: true
        };
      } else {
        return {
          gridTemplateColumns: '350px 1fr 350px',
          gridTemplateRows: 'auto 1fr',
          showLeftSidebar: true,
          showRightSidebar: true
        };
      }
    });
  }

  public destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    window.removeEventListener('resize', this.handleResize);
  }
}

// Create and export the layout manager instance
export const layoutManager = new LayoutManager();

// Export reactive layout calculations
export const layout = derived([layoutStore, layoutCalculations], ([$store, $calculations]) => ({
  ...$store,
  ...$calculations
})); 