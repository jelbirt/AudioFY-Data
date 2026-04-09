/**
 * Visualization Engine — re-exports all visualization components and utilities.
 */
export { ScatterPlot, flattenSources, isPointActive } from './ScatterPlot';
export type { ScatterPlotProps } from './ScatterPlot';

export { DataTable, buildTableRows, sortRows, isRowActive } from './DataTable';
export type { DataTableProps, TableRow } from './DataTable';
