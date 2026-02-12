import { useWatch } from 'react-hook-form';
import { useMessagesForm } from '@/components/MessagesFormProvider';

import { StatusDot } from './StatusDot';

function isFullyTranslated(values: unknown): boolean {
  if (typeof values === 'string') return values.length > 0;
  if (values && typeof values === 'object') {
    return Object.values(values).every(isFullyTranslated);
  }
  return false;
}

interface GroupStatusDotProps {
  path: string;
}

export function GroupStatusDot({ path }: GroupStatusDotProps) {
  const { control, activeLocale } = useMessagesForm();
  const value = useWatch({ control, name: `${activeLocale}.${path}` as never });
  const status = isFullyTranslated(value) ? 'translated' : 'missing';
  return <StatusDot status={status} />;
}
