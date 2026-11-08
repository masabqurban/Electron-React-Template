import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import type { Note } from '@shared/contract';

import { call } from '@/lib/ipc';

export const noteKeys = {
  all: ['notes'] as const,
  list: (query: string) => [...noteKeys.all, 'list', query] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
};

export const notesQuery = (query: string) =>
  queryOptions({ queryKey: noteKeys.list(query), queryFn: () => call('notes.list', { query }) });

export const noteQuery = (id: string) =>
  queryOptions({ queryKey: noteKeys.detail(id), queryFn: () => call('notes.get', { id }) });

/** Keeps the cached note in sync and refreshes lists (order and previews change). */
function useStoreNote() {
  const queryClient = useQueryClient();
  return (note: Note) => {
    queryClient.setQueryData(noteKeys.detail(note.id), note);
    void queryClient.invalidateQueries({ queryKey: [...noteKeys.all, 'list'] });
  };
}

export function useCreateNote() {
  const store = useStoreNote();
  return useMutation({
    mutationFn: (input: { title?: string; body?: string }) => call('notes.create', input),
    onSuccess: store,
  });
}

export function useUpdateNote() {
  const store = useStoreNote();
  return useMutation({
    mutationFn: (input: { id: string; title?: string; body?: string; pinned?: boolean }) => call('notes.update', input),
    onSuccess: store,
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call('notes.remove', { id }),
    onSuccess: ({ id }) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...noteKeys.all, 'list'] });
    },
  });
}
