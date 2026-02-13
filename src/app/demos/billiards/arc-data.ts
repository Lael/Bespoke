import * as THREE from 'three';

export class ArcCSVGenerator {
  private rows: string[] = [];
  private readonly header = "sx,sy,sz,ex,ey,ez";

  constructor() {
    this.rows.push(this.header);
  }

  /**
   * Hook to append a single arc.
   * We format to 4 decimal places to save file space without losing print precision.
   */
  public appendArc(start: THREE.Vector3, end: THREE.Vector3): void {
    const row = [
      start.x.toFixed(4), start.y.toFixed(4), start.z.toFixed(4),
      end.x.toFixed(4), end.y.toFixed(4), end.z.toFixed(4)
    ].join(',');

    this.rows.push(row);

    // Performance Note: If processing millions in a browser,
    // you should periodically dump this.rows to a Downloader/FileStream
    // and clear the array to free up memory.
  }

  /**
   * Triggers a download of the CSV file in the browser.
   */
  public download(filename: string = "arc_data.csv"): void {
    const blob = new Blob([this.rows.join('\n')], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
