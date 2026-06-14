'use client';

import { useEffect, useRef } from 'react';
import { theme } from 'antd';

interface MermaidDiagramProps {
  chart: string;
}

let mermaidId = 0;

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { token } = theme.useToken();
  const id = `mermaid-${++mermaidId}`;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
        fontFamily: token.fontFamily,
      });

      if (!cancelled && containerRef.current) {
        const { svg } = await mermaid.render(id, chart.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart, id, token.fontFamily]);

  return (
    <div
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
      <div ref={containerRef} />
    </div>
  );
}
