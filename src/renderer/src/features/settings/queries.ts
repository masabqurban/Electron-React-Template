import { queryOptions } from '@tanstack/react-query';

import { call } from '@/lib/ipc';

export const settingsQuery = queryOptions({ queryKey: ['settings'], queryFn: () => call('settings.get') });
