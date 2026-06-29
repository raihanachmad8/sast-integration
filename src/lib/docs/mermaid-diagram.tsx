'use client';

import { theme } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

let globalMermaidId = 0;
let mermaidInitialized = false;

async function getMermaid() {
  const mermaid = (await import('mermaid')).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
      themeVariables: {
        fontSize: '16px',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { token } = theme.useToken();
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++globalMermaidId}`);

  useEffect(() => {
    let cancelled = false;
    const id = idRef.current;

    async function render() {
      try {
        const mermaid = await getMermaid();

        if (!cancelled && containerRef.current) {
          const { svg } = await mermaid.render(id, chart.trim());
          if (!cancelled && containerRef.current) {
            // Parse SVG safely via DOMParser instead of innerHTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(svg, 'image/svg+xml');
            const svgElement = doc.querySelector('svg');
            if (svgElement) {
              containerRef.current.replaceChildren(svgElement);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    }

    queueMicrotask(() => {
      setError(null);
      render();
    });
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div
      role="img"
      aria-label="Mermaid diagram"
      style={{
        margin: `${token.marginLG}px 0`,
        padding: token.paddingLG,
        background: token.colorFillQuaternary,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        textAlign: 'center',
        overflowX: 'auto',
      }}
    >
      {error ? (
        <div style={{ color: token.colorError, textAlign: 'left' }}>
          <p style={{ fontWeight: 600, marginBottom: token.marginXS }}>Failed to render diagram</p>
          <pre style={{ fontSize: token.fontSizeSM, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{chart}</pre>
        </div>
      ) : (
        <>
          <div ref={containerRef} />
          {/* Visually hidden text fallback for screen readers */}
          <p className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
            {chart}
          </p>
        </>
      )}
    </div>
  );
}
