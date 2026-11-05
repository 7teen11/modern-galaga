/**
 * 2D Uniform Spatial Hash Grid for O(N) Broadphase Collision Detection.
 * Divides the playfield into fixed 64x64 pixel buckets using pre-allocated arrays
 * so zero memory allocations occur during per-frame insertion and querying.
 */
export class SpatialGrid {
  public readonly cellSize: number;
  public readonly cols: number;
  public readonly rows: number;
  private readonly buckets: number[][];
  private readonly bucketCounts: Int32Array;
  private readonly queryStamp: Int32Array;
  private currentStamp = 1;

  constructor(width = 600, height = 800, cellSize = 64, maxEntitiesId = 2048) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    const totalCells = this.cols * this.rows;

    this.buckets = new Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      this.buckets[i] = [];
    }
    this.bucketCounts = new Int32Array(totalCells);
    this.queryStamp = new Int32Array(maxEntitiesId);
  }

  /**
   * Clears all cell buckets in O(cells) without freeing underlying arrays.
   */
  public clear(): void {
    const len = this.bucketCounts.length;
    for (let i = 0; i < len; i++) {
      this.bucketCounts[i] = 0;
    }
  }

  /**
   * Inserts an entity bounding box into all overlapping 64x64 grid cells.
   */
  public insertAABB(
    entityId: number,
    x: number,
    y: number,
    halfWidth: number,
    halfHeight: number
  ): void {
    const minCol = Math.max(0, Math.floor((x - halfWidth) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + halfWidth) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - halfHeight) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + halfHeight) / this.cellSize));

    for (let r = minRow; r <= maxRow; r++) {
      const rowOffset = r * this.cols;
      for (let c = minCol; c <= maxCol; c++) {
        const cellIdx = rowOffset + c;
        const count = this.bucketCounts[cellIdx];
        this.buckets[cellIdx][count] = entityId;
        this.bucketCounts[cellIdx] = count + 1;
      }
    }
  }

  /**
   * Inserts a circular collider into overlapping grid cells.
   */
  public insertCircle(entityId: number, x: number, y: number, radius: number): void {
    this.insertAABB(entityId, x, y, radius, radius);
  }

  /**
   * Queries unique candidate entity IDs sharing cells with the given bounding region.
   * Writes results into caller-provided `outResults` array and returns the count found.
   */
  public queryRegion(
    x: number,
    y: number,
    halfWidth: number,
    halfHeight: number,
    outResults: number[]
  ): number {
    this.currentStamp = (this.currentStamp + 1) | 0;
    if (this.currentStamp <= 0) {
      this.queryStamp.fill(0);
      this.currentStamp = 1;
    }
    const stamp = this.currentStamp;

    const minCol = Math.max(0, Math.floor((x - halfWidth) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + halfWidth) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - halfHeight) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + halfHeight) / this.cellSize));

    let foundCount = 0;

    for (let r = minRow; r <= maxRow; r++) {
      const rowOffset = r * this.cols;
      for (let c = minCol; c <= maxCol; c++) {
        const cellIdx = rowOffset + c;
        const count = this.bucketCounts[cellIdx];
        const bucket = this.buckets[cellIdx];

        for (let i = 0; i < count; i++) {
          const id = bucket[i];
          if (id < this.queryStamp.length) {
            if (this.queryStamp[id] !== stamp) {
              this.queryStamp[id] = stamp;
              outResults[foundCount++] = id;
            }
          } else {
            outResults[foundCount++] = id;
          }
        }
      }
    }

    return foundCount;
  }
}

