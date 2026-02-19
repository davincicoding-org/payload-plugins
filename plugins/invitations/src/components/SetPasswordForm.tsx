'use client';
import {
  ConfirmPasswordField,
  Form,
  FormSubmit,
  HiddenField,
  PasswordField,
  useConfig,
  useTranslation,
} from '@payloadcms/ui';
import type { FormState } from 'payload';
import styles from './SetPasswordForm.module.css';

export function SetPasswordForm({
  token,
  endpointURL,
}: {
  token: string;
  endpointURL: string;
}) {
  const { t } = useTranslation();
  const { config } = useConfig();

  const usersCollection = config.admin.user as 'users';

  const initialState: FormState = {
    'confirm-password': {
      initialValue: '',
      valid: false,
      value: '',
    },
    password: {
      initialValue: '',
      valid: false,
      value: '',
    },
    token: {
      initialValue: token,
      valid: true,
      value: token,
    },
  };

  return (
    <Form
      action={endpointURL}
      initialState={initialState}
      method="POST"
      onSuccess={() => window.location.reload()}
    >
      <div className={styles.fields}>
        <PasswordField
          field={{
            name: 'password',
            label: t('general:password'),
            required: true,
          }}
          path="password"
          schemaPath={`${usersCollection}.password`}
        />
        <ConfirmPasswordField />
      </div>
      <HiddenField
        path="token"
        schemaPath={`${usersCollection}.token`}
        value={token}
      />
      <FormSubmit size="large">Accept Invite</FormSubmit>
    </Form>
  );
}
