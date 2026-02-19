import { getAdminURL, getApiURL } from '@davincicoding/payload-plugin-kit';
import { Logo } from '@payloadcms/next/rsc';
import { MinimalTemplate } from '@payloadcms/next/templates';
import { RedirectType, redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import { ENDPOINTS } from '@/const';
import styles from './InvitationPage.module.css';
import { SetPasswordForm } from './SetPasswordForm';

export async function InvitationPage({
  initPageResult: { req },
  searchParams,
}: AdminViewServerProps) {
  const { i18n, payload, user } = req;

  if (user) return redirect(getAdminURL({ req }), RedirectType.replace);

  const token = searchParams?.token;

  if (typeof token !== 'string') return <div>NO TOKEN</div>;

  const {
    docs: [invitedUser],
  } = await payload.find({
    collection: payload.config.admin.user as 'users',
    where: {
      _verificationToken: { equals: token },
    },
  });

  if (!invitedUser) return <div>NO USER FOUND FOR THIS TOKEN</div>;

  return (
    <MinimalTemplate>
      <div className={styles.brand}>
        <Logo i18n={i18n} payload={payload} />
      </div>
      <SetPasswordForm
        endpointURL={getApiURL({ req, path: ENDPOINTS.acceptInvite.path })}
        token={token}
      />
    </MinimalTemplate>
  );
}
