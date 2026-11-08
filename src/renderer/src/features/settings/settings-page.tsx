import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Monitor, Moon, Sun } from 'lucide-react';

import type { Settings, Theme } from '@shared/contract';

import { Switch } from '@/components/ui/switch';
import { call, isMac } from '@/lib/ipc';
import { cn } from '@/lib/utils';

import { settingsQuery } from './queries';

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function SettingsPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (changes: Partial<Settings>) => call('settings.update', changes),
    onSuccess: (next) => queryClient.setQueryData(settingsQuery.queryKey, next),
  });

  return (
    <div className="mx-auto w-full max-w-xl px-8 py-10">
      <h2 className="text-xl font-semibold">Settings</h2>

      <section className="mt-8" aria-labelledby="appearance">
        <h3 id="appearance" className="text-sm font-medium">
          Appearance
        </h3>
        <div role="radiogroup" aria-label="Theme" className="mt-3 grid grid-cols-3 gap-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.theme === value}
              onClick={() => update.mutate({ theme: value })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm hover:bg-muted',
                settings.theme === value && 'border-primary bg-accent text-accent-foreground hover:bg-accent',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="behaviour">
        <h3 id="behaviour" className="text-sm font-medium">
          Behaviour
        </h3>
        <div className="mt-3 flex items-center justify-between gap-6 rounded-lg border p-4">
          <label htmlFor="close-to-tray" className="text-sm">
            <span className="block font-medium">Keep running in the {isMac ? 'menu bar' : 'system tray'}</span>
            <span className="text-muted-foreground">Closing the window hides it instead of quitting.</span>
          </label>
          <Switch
            id="close-to-tray"
            checked={settings.closeToTray}
            onCheckedChange={(checked) => update.mutate({ closeToTray: checked })}
          />
        </div>
      </section>
    </div>
  );
}
