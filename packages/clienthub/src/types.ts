import type { ClienthubPluginOptions } from '.';

export type ResolvedPluginOptions<K extends keyof ClienthubPluginOptions> =
  Pick<Required<ClienthubPluginOptions>, K>;
