/** Server CRUD editor: form → patch fragment → copy or approval-gated write. */
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { McpServerConfigView, PatchPreview, PatchWriteResult } from '../wire.js';
/** Editor callbacks supplied by the tab. */
export interface ServerEditorActions {
    previewPatch: (opJson: string) => Promise<PatchPreview>;
    writePatch: (opJson: string, confirmed: boolean) => Promise<PatchWriteResult>;
}
/** Editor props: an existing row's sanitized view, or null for add mode. */
export interface ServerEditorProps {
    t: PropsLocale<'settings.mcpPanel'>['t'];
    /** Sanitized config view to edit; null = add mode. */
    view: McpServerConfigView | null;
    /** Existing entry id (edit mode only). */
    entryId: string;
    /** Whether profile writes are enabled (kill switch). */
    writeEnabled: boolean;
    actions: ServerEditorActions;
    onClose: () => void;
    onWritten: () => void;
}
/** Render the CRUD editor. */
export declare function ServerEditor({ t, view, entryId, writeEnabled, actions, onClose, onWritten }: ServerEditorProps): ReactNode;
//# sourceMappingURL=ServerEditor.d.ts.map