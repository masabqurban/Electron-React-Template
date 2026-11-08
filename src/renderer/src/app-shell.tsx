import { type ErrorComponentProps, Outlet, useNavigate, useParams } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

import { NoteEditor } from '@/features/notes/note-editor';
import { NotesSidebar } from '@/features/notes/notes-sidebar';
import { useCreateNote } from '@/features/notes/queries';
import { IpcError, modKey, subscribe } from '@/lib/ipc';

/** The window layout, plus listeners for events from the menu, tray and deep links. */
export function AppShell() {
  const navigate = useNavigate();
  const { mutate: createNote } = useCreateNote();

  useEffect(() => {
    const offNew = subscribe('menu.newNote', () => {
      createNote({}, { onSuccess: (note) => void navigate({ to: '/notes/$noteId', params: { noteId: note.id } }) });
    });

    const offNavigate = subscribe('navigate', ({ to }) => {
      if (to.startsWith('/notes/')) {
        void navigate({ to: '/notes/$noteId', params: { noteId: to.slice('/notes/'.length) } });
      } else {
        void navigate({ to: to as '/' | '/settings' | '/about' });
      }
    });

    return () => {
      offNew();
      offNavigate();
    };
  }, [createNote, navigate]);

  return (
    <div className="flex h-full">
      <NotesSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <FileText className="size-10" aria-hidden />
      <p className="text-sm">Select a note, or press {modKey}+N to create one.</p>
    </div>
  );
}

/** A fresh editor per note, so local state never leaks between notes. */
export function NoteRoute() {
  const { noteId } = useParams({ from: '/notes/$noteId' });
  return <NoteEditor key={noteId} noteId={noteId} />;
}

export function RouteError({ error }: ErrorComponentProps) {
  const message =
    error instanceof IpcError && error.code === 'NOT_FOUND' ? error.message : 'This page couldn’t be loaded.';
  return <p className="p-10 text-sm text-muted-foreground">{message}</p>;
}
