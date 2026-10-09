export const MAX_ARTIFACT_BYTES = 4 * 1024 * 1024;
export const MAX_ARTIFACTS = 8;
export const MAX_REVIEW_BYTES = 12 * 1024 * 1024;
export type Artifact = {
  id: string;
  name: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  pages?: number;
  lines?: number;
  uploadedAt: string;
};
export type ArtifactContent = Artifact & { content: Uint8Array };
export type FileCitation = { fileId: string; page: number | null; line: number | null; observation: string };
