import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ChartSpec {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  data: { name: string; value: number }[];
}

const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'];

function LabChart({ spec }: { spec: ChartSpec }) {
  return (
    <figure className="my-6">
      {spec.title ? <figcaption className="mb-2 font-mono text-sm text-muted-foreground">{spec.title}</figcaption> : null}
      <div className="h-64 w-full rounded-lg border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'pie' ? (
            <PieChart>
              <Pie data={spec.data} dataKey="value" nameKey="name" outerRadius="80%" label>
                {spec.data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : spec.type === 'line' ? (
            <LineChart data={spec.data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={spec.data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function RichContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const roots = useRef<Root[]>([]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    roots.current.forEach((root) => root.unmount());
    roots.current = [];

    container.querySelectorAll<HTMLElement>('.lab-chart').forEach((node) => {
      try {
        const spec = JSON.parse(node.dataset['chart'] ?? '{}') as ChartSpec;
        const root = createRoot(node);
        root.render(<LabChart spec={spec} />);
        roots.current.push(root);
      } catch {
        node.textContent = 'Graphique illisible';
      }
    });

    const diagrams = container.querySelectorAll<HTMLElement>('.lab-mermaid');
    if (diagrams.length) {
      void import('mermaid').then(async ({ default: mermaid }) => {
        const dark = document.documentElement.classList.contains('dark');
        mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict' });
        let index = 0;
        for (const node of Array.from(diagrams)) {
          const source = node.dataset['mermaid'] ?? '';
          try {
            const { svg } = await mermaid.render(`lab-mermaid-${Date.now()}-${index++}`, source);
            node.innerHTML = svg;
            node.classList.add('my-6', 'overflow-x-auto', 'rounded-lg', 'border', 'border-border', 'bg-card', 'p-4');
          } catch {
            node.textContent = 'Diagramme illisible';
          }
        }
      });
    }

    return () => {
      const current = roots.current;
      roots.current = [];
      window.setTimeout(() => current.forEach((root) => root.unmount()), 0);
    };
  }, [html]);

  return <div ref={ref} className="prose-lab max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
