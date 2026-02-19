import { getAdminURL } from '@davincicoding/payload-plugin-kit';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { RedirectType, redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import type {
  DeepPartial,
  Locale,
  Messages,
  MessagesGuard,
  NormalizedScope,
  Translations,
} from '@/types';
import { sanitizeMessages } from '@/utils/sanitize';
import { fetchMessages } from '../requests/fetchMessages';
import { MessagesForm } from './MessagesForm';

export interface MessagesViewProps {
  locales: Locale[];
  schema: Messages;
  fullSchema?: Messages;
  tabs: boolean | undefined;
  access: MessagesGuard;
  scopes?: Map<string, NormalizedScope>;
}

export async function MessagesView({
  access,
  initPageResult: { req, locale, permissions, visibleEntities },
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

  const hasAccess = await access(req);
  if (!hasAccess) redirect(getAdminURL({ req }), RedirectType.replace);

  if (!payload.config.localization) {
    return null;
  }
  const defaultLocale = payload.config.localization.defaultLocale;
  const activeLocale =
    typeof locale === 'string' ? locale : (locale?.code ?? defaultLocale);

  const translations: Translations<DeepPartial<Messages>> = {};

  for (const loc of locales) {
    const messages = await fetchMessages(payload, loc);

    translations[loc] = sanitizeMessages(schema, messages, {
      useSchemaDefaults: loc === defaultLocale,
    });
  }

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user || undefined}
      viewActions={payload.config.admin.components.actions.filter((action) => {
        if (typeof action !== 'object') {
          return true;
        }
        return action.exportName !== 'MessagesLink';
      })}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <MessagesForm
          activeLocale={activeLocale}
          defaultLocale={defaultLocale}
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
