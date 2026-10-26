import type { Project } from '../../engine/project';
import { downloadText, safeFilename } from '../../ui/files';

/** Exporte un projet en fichier `.ups.json`. */
export function exportProject(p: Project) {
  downloadText(`${safeFilename(p.name)}.ups.json`, JSON.stringify(p, null, 2));
}
