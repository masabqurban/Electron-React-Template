import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { UpdateStatus } from '@shared/contract';

import { Button } from '@/components/ui/button';
import { call, subscribe } from '@/lib/ipc';

const REPOSITORY_URL = 'https://github.com/masabqurban/Electron-React-Template';

function describe(status: UpdateStatus): string {
  switch (status.state) {
    case 'idle':
      return 'Updates are checked automatically.';
    case 'disabled':
      return status.reason;
    case 'checking':
      return 'Checking for updates…';
    case 'available':
      return `Downloading version ${status.version}…`;
    case 'downloading':
      return `Downloading update… ${status.percent}%`;
    case 'not-available':
      return 'You’re on the latest version.';
    case 'ready':
      return `Version ${status.version} is ready to install.`;
    case 'error':
      return status.message;
  }
}

export function AboutPage() {
  const { data: info } = useSuspenseQuery({ queryKey: ['app-info'], queryFn: () => call('app.info') });
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const check = useMutation({ mutationFn: () => call('app.checkForUpdates'), onSuccess: setStatus });
  const initial = useQuery({
    queryKey: ['update-status'],
    queryFn: () => call('app.checkForUpdates'),
    staleTime: Infinity,
  });

  useEffect(() => subscribe('update.status', setStatus), []);

  const current = status ?? initial.data;

  return (
    <div className="mx-auto w-full max-w-xl px-8 py-10">
      <h2 className="text-xl font-semibold">{info.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground" data-selectable>
        Version {info.version}
      </p>

      <section className="mt-8 rounded-lg border p-4" aria-labelledby="updates">
        <h3 id="updates" className="text-sm font-medium">
          Updates
        </h3>
        <p className="mt-1 text-sm text-muted-foreground" role="status">
          {current ? describe(current) : '…'}
        </p>
        <div className="mt-3 flex gap-2">
          {current?.state === 'ready' ? (
            <Button onClick={() => void call('app.installUpdate')}>Restart and update</Button>
          ) : (
            <Button
              variant="outline"
              disabled={current?.state === 'disabled' || check.isPending}
              onClick={() => check.mutate()}
            >
              Check for updates
            </Button>
          )}
        </div>
      </section>

      <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm" data-selectable>
        <dt className="text-muted-foreground">Platform</dt>
        <dd>
          {info.platform} ({info.arch})
        </dd>
        <dt className="text-muted-foreground">Electron</dt>
        <dd>{info.versions.electron}</dd>
        <dt className="text-muted-foreground">Chromium</dt>
        <dd>{info.versions.chrome}</dd>
        <dt className="text-muted-foreground">Node.js</dt>
        <dd>{info.versions.node}</dd>
        <dt className="text-muted-foreground">Data folder</dt>
        <dd className="break-all">{info.userDataPath}</dd>
      </dl>

      <Button
        variant="link"
        className="mt-6 px-0"
        onClick={() => void call('app.openExternal', { url: REPOSITORY_URL })}
      >
        Source code on GitHub
      </Button>
    </div>
  );
}
