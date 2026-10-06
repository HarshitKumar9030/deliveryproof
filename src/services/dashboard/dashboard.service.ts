import type { ColDef } from 'ag-grid-community';

export interface DisputeRow {
  projectId: string;
  disputeId: string;
  status: string;
  currency: string;
  amount: string;
  responseDueAt: string | null;
  evidenceCount: number;
  missingEvidenceCount: number;
}

/** Browser-safe data contract. AG Studio widgets will consume the same rows. */
export const disputeColumns: ColDef<DisputeRow>[] = [
  { field: 'projectId', headerName: 'Project', filter: true },
  { field: 'disputeId', headerName: 'PayPal case' },
  { field: 'status', headerName: 'Status', filter: true },
  { field: 'currency', headerName: 'Currency' },
  { field: 'amount', headerName: 'Disputed amount', sortable: false },
  { field: 'responseDueAt', headerName: 'Response deadline' },
  { field: 'evidenceCount', headerName: 'Evidence records' },
  { field: 'missingEvidenceCount', headerName: 'Evidence gaps' },
];
