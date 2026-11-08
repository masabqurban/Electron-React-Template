import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatUpdated } from '@/lib/utils';

import { noteQuery, useDeleteNote, useUpdateNote } from './queries';

const SAVE_DELAY_MS = 400;

/**
 * Edits one note. Changes save automatically shortly after typing stops,
 * and any pending change is flushed when switching notes or closing.
 */
export function NoteEditor({ noteId }: { noteId: string }) {
  const { data: note } = useSuspenseQuery(noteQuery(noteId));
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const navigate = useNavigate();

  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pending = useRef<{ title?: string; body?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleRef = useRef<HTMLInputElement>(null);

  const flush = () => {
    clearTimeout(timer.current);
    const changes = pending.current;
    pending.current = {};
    setDirty(false);
    if (Object.keys(changes).length > 0) {
      update.mutate({ id: noteId, ...changes });
    }
  };

  const queue = (changes: { title?: string; body?: string }) => {
    pending.current = { ...pending.current, ...changes };
    setDirty(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  // Save before leaving this note or the page.
  useEffect(() => {
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush reads refs only
  }, [noteId]);

  // A brand-new note starts with the cursor in the title.
  useEffect(() => {
    if (!note.title && !note.body) titleRef.current?.focus();
  }, [note.title, note.body]);

  const saving = update.isPending || dirty;

  return (
    <article className="flex h-full flex-col" aria-label="Note editor">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-2 text-xs text-muted-foreground">
        <span role="status" aria-live="polite">
          {saving ? 'Saving…' : `Saved · edited ${formatUpdated(note.updatedAt)}`}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            aria-pressed={note.pinned}
            onClick={() => update.mutate({ id: noteId, pinned: !note.pinned })}
          >
            {note.pinned ? <PinOff /> : <Pin />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-6 py-5">
        <input
          ref={titleRef}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            queue({ title: event.target.value });
          }}
          maxLength={200}
          placeholder="Title"
          aria-label="Title"
          className="bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/60"
        />
        <textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            queue({ body: event.target.value });
          }}
          placeholder="Start writing…"
          aria-label="Note"
          className="min-h-0 flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this note?"
        description={`“${note.title || 'Untitled'}” will be deleted permanently.`}
        confirmLabel="Delete"
        onConfirm={() => {
          pending.current = {};
          clearTimeout(timer.current);
          remove.mutate(noteId, {
            onSuccess: () => {
              toast.success('Note deleted');
              void navigate({ to: '/' });
            },
          });
        }}
      />
    </article>
  );
}
