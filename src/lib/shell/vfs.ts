import type { PostMeta } from '../posts';

export type Node = {
  name: string;
  kind: 'dir' | 'file';
  children?: Node[];
  href?: string;
  post?: PostMeta;
};

const ROOT_PATH = '~';

function sortNodes(nodes: Node[]): Node[] {
  return nodes.sort(
    (a, b) => Number(b.kind === 'dir') - Number(a.kind === 'dir') || a.name.localeCompare(b.name),
  );
}

export function buildTree(posts: PostMeta[]): Node {
  const files = posts.map((post) => ({
    name: `${post.slug}.md`,
    kind: 'file' as const,
    href: `/posts/${post.slug}/`,
    post,
  }));
  const categories = new Map<string, PostMeta[]>();

  for (const post of posts) {
    for (const category of post.data.categories) {
      const tagged = categories.get(category) ?? [];
      tagged.push(post);
      categories.set(category, tagged);
    }
  }

  const tagDirectories: Node[] = [...categories].map(([name, taggedPosts]) => ({
    name,
    kind: 'dir',
    children: sortNodes(
      taggedPosts.map((post) => ({
        name: `${post.slug}.md`,
        kind: 'file',
        href: `/posts/${post.slug}/`,
        post,
      })),
    ),
  }));

  const blog: Node = {
    name: 'blog',
    kind: 'dir',
    children: sortNodes([...files, ...tagDirectories]),
  };

  return {
    name: ROOT_PATH,
    kind: 'dir',
    children: sortNodes([
      { name: 'about.md', kind: 'file', href: '/about/' },
      blog,
      { name: 'rss.xml', kind: 'file', href: '/rss.xml' },
    ]),
  };
}

export function listChildren(node: Node): Node[] {
  return node.kind === 'dir' && node.children ? sortNodes([...node.children]) : [];
}

function pathSegments(path: string): string[] {
  return path
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== ROOT_PATH && segment !== '.');
}

function findChild(parent: Node, name: string): Node | undefined {
  return parent.children?.find((child) => child.name === name);
}

function findNode(root: Node, segments: string[]): Node | undefined {
  let current = root;
  for (const segment of segments) {
    const child = findChild(current, segment);
    if (!child) return undefined;
    current = child;
  }
  return current;
}

function canonicalPath(segments: string[]): string {
  return segments.length > 0 ? `${ROOT_PATH}/${segments.join('/')}` : ROOT_PATH;
}

export function resolvePath(
  root: Node,
  cwd: string,
  input: string,
): { path: string; node: Node } | { error: string } {
  const startsAtRoot = input.startsWith('/') || input === ROOT_PATH || input.startsWith('~/');
  const base = startsAtRoot ? [] : pathSegments(cwd);
  const segments = [...base];

  for (const segment of input.split('/')) {
    if (!segment || segment === '.' || segment === ROOT_PATH) continue;
    if (segment === '..') {
      if (segments.length === 0) return { error: `path traverses above ${ROOT_PATH}` };
      segments.pop();
      continue;
    }

    segments.push(segment);
    if (!findNode(root, segments)) return { error: `no such path: ${input}` };
  }

  const node = findNode(root, segments);
  if (!node) return { error: `no such path: ${input}` };
  return { path: canonicalPath(segments), node };
}

export function completePath(root: Node, cwd: string, prefix: string): string[] {
  const slashIndex = prefix.lastIndexOf('/');
  const directoryPart = slashIndex === -1 ? '' : prefix.slice(0, slashIndex + 1);
  const namePart = prefix.slice(slashIndex + 1);
  const directory = directoryPart
    ? resolvePath(root, cwd, directoryPart || '.')
    : resolvePath(root, cwd, '.');

  if ('error' in directory || directory.node.kind !== 'dir') return [];

  return listChildren(directory.node)
    .filter((child) => child.name.startsWith(namePart))
    .map((child) => `${directoryPart}${child.name}${child.kind === 'dir' ? '/' : ''}`);
}
