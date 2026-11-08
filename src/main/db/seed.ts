import type { NotesRepository } from './notes-repository';

/**
 * PLACEHOLDER content shown on first launch, so the app isn't empty.
 * It only runs when there are no notes. Replace or remove it for your app.
 */
const welcomeNotes = [
  {
    title: 'Welcome to Acme Notes',
    body: 'This is a sample note. Edit it, pin it, or delete it.\n\nNotes are saved automatically to a local SQLite database, so the app works offline.',
  },
  {
    title: 'Keyboard shortcuts',
    body: 'Ctrl/Cmd + N: new note\nCtrl/Cmd + F: search notes\nCtrl/Cmd + ,: settings',
  },
  {
    title: 'Open from a link',
    body: 'Links like acme-notes://new?title=Groceries open the app and create a note.',
  },
];

export function seedWelcomeNotes(notes: NotesRepository): void {
  if (notes.count() > 0) {
    return;
  }

  for (const note of welcomeNotes.toReversed()) {
    notes.create(note);
  }
}
