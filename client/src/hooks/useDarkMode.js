import { useState, useEffect } from 'react';

/**
 * Hook to detect and track dark mode state
 * Listens to changes on document.documentElement class list
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark-mode');
  });

  useEffect(() => {
    // Create observer to watch for class changes on document element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const hasDarkMode = document.documentElement.classList.contains('dark-mode');
          setIsDark(hasDarkMode);
        }
      });
    });

    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Cleanup
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * Get chart color scheme based on dark mode
 * Uses CSS variables for professional, consistent colors
 * Enhanced with modern color palette and better visual hierarchy
 */
export function useChartColors() {
  const isDark = useDarkMode();

  // Get computed CSS variables for chart colors
  const getCSSVar = (varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  };

  // Modern, accessible color palette
  const lightColors = {
    primary: '#2d5016',      // Deep forest green (brand)
    secondary: '#16a34a',    // Vibrant green (success/positive)
    tertiary: '#dc2626',     // Red (costs/negative)
    quaternary: '#0891b2',   // Cyan (info)
    quinary: '#7c3aed',      // Purple (accent)
    senary: '#ea580c',       // Orange (warning)
    revenue: '#2563eb',      // Blue (revenue)
    costs: '#dc2626',        // Red (costs)
    margin: '#16a34a',       // Green (margin/profit)
    production: '#0891b2',   // Cyan (production)
  };

  const darkColors = {
    primary: '#4ade80',      // Bright green
    secondary: '#22c55e',    // Green
    tertiary: '#f87171',     // Light red
    quaternary: '#22d3ee',   // Cyan
    quinary: '#a78bfa',      // Light purple
    senary: '#fb923c',       // Orange
    revenue: '#60a5fa',      // Light blue
    costs: '#f87171',        // Light red
    margin: '#4ade80',       // Bright green
    production: '#22d3ee',   // Cyan
  };

  const colors = isDark ? darkColors : lightColors;

  return {
    // Main series colors
    primary: getCSSVar('--chart-primary') || colors.primary,
    secondary: getCSSVar('--chart-secondary') || colors.secondary,
    tertiary: getCSSVar('--chart-tertiary') || colors.tertiary,
    quaternary: getCSSVar('--chart-quaternary') || colors.quaternary,
    quinary: getCSSVar('--chart-quinary') || colors.quinary,
    senary: colors.senary,
    
    // Semantic colors for specific data types
    revenue: colors.revenue,
    costs: colors.tertiary,
    margin: colors.margin,
    production: colors.production,
    
    // Multi-series palette (for pie charts, multi-bar, etc.)
    palette: [
      colors.primary,
      colors.secondary,
      colors.quaternary,
      colors.quinary,
      colors.senary,
      isDark ? '#f472b6' : '#db2777', // Pink
    ],
    
    // Gradient definitions for area charts
    gradients: {
      primary: {
        start: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(45, 80, 22, 0.3)',
        end: isDark ? 'rgba(74, 222, 128, 0.05)' : 'rgba(45, 80, 22, 0.05)',
      },
      secondary: {
        start: isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(22, 163, 74, 0.3)',
        end: isDark ? 'rgba(34, 197, 94, 0.05)' : 'rgba(22, 163, 74, 0.05)',
      },
    },
    
    // Text colors
    text: {
      primary: getCSSVar('--text-primary') || (isDark ? '#e8ecf0' : '#1a1f2e'),
      secondary: getCSSVar('--text-secondary') || (isDark ? '#b4bcc8' : '#64748b')
    },
    textPrimary: getCSSVar('--text-primary') || (isDark ? '#e8ecf0' : '#1a1f2e'),
    textSecondary: getCSSVar('--text-secondary') || (isDark ? '#b4bcc8' : '#64748b'),
    
    // Grid styling
    grid: getCSSVar('--chart-grid') || (isDark ? '#374151' : '#e5e7eb'),
    
    // Enhanced tooltip styling
    tooltip: {
      bg: isDark ? 'rgba(26, 31, 46, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      border: isDark ? '#374151' : '#e5e7eb',
      text: isDark ? '#e8ecf0' : '#1a1f2e',
      shadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.12)',
    },
    
    // Axis styling
    axis: {
      line: isDark ? '#374151' : '#e5e7eb',
      tick: isDark ? '#9ca3af' : '#6b7280',
    },
    
    // Background colors for chart areas
    background: {
      chart: isDark ? 'rgba(26, 31, 46, 0.5)' : 'rgba(255, 255, 255, 0.8)',
      hover: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.8)',
    },
  };
}
