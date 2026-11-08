import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Info, Pin, Plus, Search, Settings } from 'lucide-react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { modKey } from '@/lib/ipc';
import { cn, formatUpdated, preview } from '@/lib/utils';

import { notesQuery, useCreateNote } from './queries';

export function NotesSidebar() {
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim());
  const notes = useQuery(notesQuery(query));
  const createNote = useCreateNote();
  const navigate = useNavigate();
  const activeId = useParams({ strict: false }).noteId;
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+F focuses search, like most desktop apps.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCreate = () =>
    createNote.mutate(
      {},
      {
        onSuccess: (note) => void navigate({ to: '/notes/$noteId', params: { noteId: note.id } }),
      },
    );

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar" aria-label="Notes">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h1 className="text-sm font-semibold">Notes</h1>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCreate}
          aria-label="New note"
          title={`New note (${modKey}+N)`}
        >
          <Plus />
        </Button>
      </div>

      <div className="relative px-3 pb-3">
        <Search className="pointer-events-none absolute top-2.5 left-5.5 size-4 text-muted-foreground" aria-hidden />
        <Input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
          className="pl-8"
        />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2" aria-label="Note list">
        {notes.isPending ? null : notes.data?.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {query ? `No notes match “${query}”.` : 'No notes yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 pb-2">
            {notes.data?.map((note) => (
              <li key={note.id}>
                <Link
                  to="/notes/$noteId"
                  params={{ noteId: note.id }}
                  className={cn(
                    'block rounded-md px-3 py-2 hover:bg-muted',
                    note.id === activeId && 'bg-accent text-accent-foreground hover:bg-accent',
                  )}
                  aria-current={note.id === activeId ? 'page' : undefined}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {note.pinned && <Pin className="size-3 shrink-0" aria-label="Pinned" />}
                    <span className="truncate">{note.title || 'Untitled'}</span>
                  </span>
                  <span className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0">{formatUpdated(note.updatedAt)}</span>
                    <span className="truncate">{preview(note.body) || 'No content'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="flex gap-1 border-t p-2">
        <Button variant="ghost" size="sm" asChild className="flex-1 justify-start">
          <Link to="/settings" activeProps={{ className: 'bg-muted' }}>
            <Settings /> Settings
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/about" aria-label="About" activeProps={{ className: 'bg-muted' }}>
            <Info />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
