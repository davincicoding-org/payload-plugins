import type { MessagesSchema } from 'payload-intl';

export const messages = {
  hello: 'Hello',
  welcome: 'Welcome, {name} {yello} {sdsd} {huwe}',
  login: {
    title: 'Login',
    email: 'Email',
    password: 'Password',
    button: 'Login',
  },
} satisfies MessagesSchema;
