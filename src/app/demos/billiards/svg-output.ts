import {Vector2} from "three";

export interface CircularArc {
  center: Vector2;
  radius: number;
  startAngle: number; // In radians
  endAngle: number;   // In radians
}

export function exportSVG(
  cuts: CircularArc[],
  marks: CircularArc[],
  scale: number,
  filename: string = 'output.svg'
) {
  // 1. Calculate the bounding box to define the SVG viewbox
  const allArcs = [...cuts, ...marks];
  if (allArcs.length === 0) return;

  const padding = 5; // mm or px padding
  const width = 2 * scale;
  const height = 2 * scale;

  // 2. Helper to convert arc to SVG path data
  const createArcPath = (arc: CircularArc): string => {
    const start = new Vector2(
      (arc.center.x + arc.radius * Math.cos(arc.startAngle)) * scale,
      (arc.center.y + arc.radius * Math.sin(arc.startAngle)) * scale
    );
    const end = new Vector2(
      (arc.center.x + arc.radius * Math.cos(arc.endAngle)) * scale,
      (arc.center.y + arc.radius * Math.sin(arc.endAngle)) * scale
    );

    // Calculate the sweep: SVG arcs use degrees and a large-arc-flag
    let diff = arc.endAngle - arc.startAngle;
    while (diff < 0) diff += Math.PI * 2;
    const largeArcFlag = diff > Math.PI ? 1 : 0;
    const sweepFlag = 1; // Clockwise

    return `M ${start.x} ${start.y} A ${arc.radius * scale} ${arc.radius * scale} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
  };

  // 3. Build path strings
  const cutPaths = cuts.map(arc =>
    `<path d="${createArcPath(arc)}" fill="none" stroke="red" stroke-width="0.1" />`
  ).join('\n    ');

  const markPaths = marks.map(arc =>
    `<path d="${createArcPath(arc)}" fill="none" stroke="blue" stroke-width="0.1" />`
  ).join('\n    ');

  // 4. Assemble SVG
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg 
  width="${width + padding * 2}mm" 
  height="${height + padding * 2}mm" 
  viewBox="${-scale - padding} ${-scale - padding} ${width + padding * 2} ${height + padding * 2}"
  xmlns="http://www.w3.org/2000/svg">
  <g id="marks">
    ${markPaths}
  </g>
  <g id="cuts">
    ${cutPaths}
  </g>
</svg>`;

  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}