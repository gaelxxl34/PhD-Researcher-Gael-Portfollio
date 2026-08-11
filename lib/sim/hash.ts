/**
 * Uniform-grid spatial hash for O(1) neighbor queries over agent positions.
 * Rebuilt every tick; queries are used by perception, communication waves,
 * and the pointer disturbance. No allocation during steady-state operation:
 * cells are flat arrays reused across rebuilds.
 */
export class SpatialHash {
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  private cells: number[][];
  private used: number[] = [];

  constructor(width: number, height: number, cellSize: number) {
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(height / cellSize));
    this.cells = new Array(this.cols * this.rows);
  }

  clear(): void {
    for (const idx of this.used) this.cells[idx].length = 0;
    this.used.length = 0;
  }

  insert(id: number, x: number, y: number): void {
    const cx = Math.min(this.cols - 1, Math.max(0, (x / this.cellSize) | 0));
    const cy = Math.min(this.rows - 1, Math.max(0, (y / this.cellSize) | 0));
    const idx = cy * this.cols + cx;
    let cell = this.cells[idx];
    if (!cell) cell = this.cells[idx] = [];
    if (cell.length === 0) this.used.push(idx);
    cell.push(id);
  }

  /**
   * Visit every id whose cell intersects the circle. Callers do their own
   * exact distance check; this only prunes to nearby cells.
   */
  query(x: number, y: number, r: number, visit: (id: number) => void): void {
    const minX = Math.max(0, ((x - r) / this.cellSize) | 0);
    const maxX = Math.min(this.cols - 1, ((x + r) / this.cellSize) | 0);
    const minY = Math.max(0, ((y - r) / this.cellSize) | 0);
    const maxY = Math.min(this.rows - 1, ((y + r) / this.cellSize) | 0);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const cell = this.cells[cy * this.cols + cx];
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) visit(cell[i]);
      }
    }
  }
}
