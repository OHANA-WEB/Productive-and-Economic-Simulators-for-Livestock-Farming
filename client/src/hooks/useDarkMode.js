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
 */
export function useChartColors() {
  const isDark = useDarkMode();

  // Get computed CSS variables for chart colors
  const getCSSVar = (varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  };

  return {
    primary: getCSSVar('--chart-primary') || (isDark ? '#3b82f6' : '#2563eb'),
    secondary: getCSSVar('--chart-secondary') || (isDark ? '#22c55e' : '#16a34a'),
    tertiary: getCSSVar('--chart-tertiary') || (isDark ? '#eab308' : '#ca8a04'),
    quaternary: getCSSVar('--chart-quaternary') || (isDark ? '#8b5cf6' : '#7c3aed'),
    quinary: getCSSVar('--chart-quinary') || (isDark ? '#f97316' : '#ea580c'),
    senary: isDark ? '#fb923c' : '#f97316', // Fallback for 6th series
    text: {
      primary: getCSSVar('--text-primary') || (isDark ? '#e8ecf0' : '#1a1f2e'),
      secondary: getCSSVar('--text-secondary') || (isDark ? '#b4bcc8' : '#495057')
    },
    textPrimary: getCSSVar('--text-primary') || (isDark ? '#e8ecf0' : '#1a1f2e'),
    textSecondary: getCSSVar('--text-secondary') || (isDark ? '#b4bcc8' : '#495057'),
    grid: getCSSVar('--chart-grid') || (isDark ? '#2d3443' : '#e9ecef'),
    tooltip: {
      bg: getCSSVar('--bg-secondary') || (isDark ? '#1a1f2e' : '#ffffff'),
      border: getCSSVar('--border-color') || (isDark ? '#2d3443' : '#dee2e6'),
      text: getCSSVar('--text-primary') || (isDark ? '#e8ecf0' : '#1a1f2e')
    },
    axis: {
      line: getCSSVar('--border-color') || (isDark ? '#2d3443' : '#dee2e6'),
      tick: getCSSVar('--chart-axis') || (isDark ? '#7a8494' : '#868e96')
    }
  };
}
