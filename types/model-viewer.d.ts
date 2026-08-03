import type React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        poster?: string;
        autoplay?: boolean;
        'camera-controls'?: boolean;
        'disable-zoom'?: boolean;
        'disable-pan'?: boolean;
        'interaction-prompt'?: 'none' | 'auto';
        'shadow-intensity'?: string;
        exposure?: string;
        'environment-image'?: string;
        'animation-name'?: string;
        'animation-crossfade-duration'?: string;
        'time-scale'?: string;
      };
    }
  }
}

export {};
