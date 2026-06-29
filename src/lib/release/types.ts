export interface ReleaseFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface PublishOptions {
  productId: string;

  owner: string;

  repo: string;

  version: string;

  title: string;

  description: string;

  files: ReleaseFile[];

  draft?: boolean;

  prerelease?: boolean;
}
