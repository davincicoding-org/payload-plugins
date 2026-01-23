import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { RedirectType, redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import type {
  DeepPartial,
  Locales,
  Messages,
  MessagesGuard,
  Translations,
} from '@/types';

import { sanitizeMessages } from '@/utils/sanitize';

import { MessagesForm } from '../components/MessagesForm';
import { fetchMessages } from '../requests/fetchMessages';

export interface MessagesViewProps {
  locales: Locales;
  schema: Messages;
  tabs: boolean | undefined;
  access: MessagesGuard;
}

export async function MessagesView({
  access,
  initPageResult,
  locales,
  params,
  payload,
  schema,
  searchParams,
  tabs = false,
}: AdminViewServerProps & MessagesViewProps) {
  const apiUrl = payload.getAPIURL();
  const endpointUrl = apiUrl.endsWith('/')
    ? `${apiUrl}intl-plugin`
    : `${apiUrl}/intl-plugin`;

  const hasAccess = await access(initPageResult.req);
  if (!hasAccess) redirect(payload.getAdminURL(), RedirectType.replace);

  const translations: Translations<DeepPartial<Messages>> = {};

  for (const locale of locales) {
    const messages = await fetchMessages(payload, locale);

    translations[locale] = sanitizeMessages(schema, messages);
  }

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      viewActions={payload.config.admin.components.actions.filter((action) => {
        if (typeof action !== 'object') {
          return true;
        }
        return action.exportName !== 'MessagesLink';
      })}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <MessagesForm
          endpointUrl={endpointUrl}
          locales={locales}
          schema={schema}
          tabs={tabs}
          values={translations}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
