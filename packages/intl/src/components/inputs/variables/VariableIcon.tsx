import { TYPE } from '@formatjs/icu-messageformat-parser';
import type { IconProps } from '@tabler/icons-react';
import {
  IconAntennaBars5,
  IconCalendar,
  IconClock,
  IconHash,
  IconLayoutList,
} from '@tabler/icons-react';
import type { TemplateVariable } from '@/types';

export interface VariableIconProps extends Omit<IconProps, 'type'> {
  type: TYPE;
}

export function VariableIcon({ type, ...props }: VariableIconProps) {
  switch (type) {
    case TYPE.literal:
    case TYPE.argument:
    case TYPE.pound:
      return null;
    case TYPE.number:
      return <IconHash {...props} />;
    case TYPE.date:
      return <IconCalendar {...props} />;
    case TYPE.time:
      return <IconClock {...props} />;
    case TYPE.select:
      return <IconLayoutList {...props} />;
    case TYPE.plural:
      return <IconAntennaBars5 {...props} />;
    case TYPE.tag:
      return null;
  }
}
