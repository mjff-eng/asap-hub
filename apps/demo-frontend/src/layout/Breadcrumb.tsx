/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';

import { useFolders, useVideo } from '../api/hooks';
import { pathOf, realFolders } from '../library/tree';
import { lead, rem, tin } from '../ui/theme';

const navStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: rem(8),
  fontSize: rem(14),
  color: lead.rgb,
  paddingBottom: rem(16),
});

const linkStyles = css({
  color: lead.rgb,
  textDecoration: 'none',
  ':hover': { textDecoration: 'underline' },
});

const separatorStyles = css({ color: tin.rgb });

type Crumb = { label: string; to?: string };

const useCrumbs = (): Crumb[] => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const folders = useFolders();
  const video = useVideo(id ?? '');

  const isWatch = pathname.startsWith('/videos/') && Boolean(id);
  const isAllVideos = !isWatch && searchParams.get('view') === 'all';
  const folderId = isWatch
    ? video.data?.folderId
    : isAllVideos
      ? undefined
      : searchParams.get('folder') ?? undefined;
  // ROOT has no crumb of its own, "Demos" already is the top level; every
  // ancestor of the folder gets one so the trail is the whole path
  const folderPath = folderId
    ? pathOf(folderId, realFolders(folders.data ?? []))
    : [];

  const crumbs: Crumb[] = [{ label: 'Demos', to: '/' }];
  if (isAllVideos) {
    crumbs.push({ label: 'All videos', to: '/?view=all' });
  }
  folderPath.forEach((folder) => {
    crumbs.push({ label: folder.name, to: `/?folder=${folder.id}` });
  });
  if (isWatch && video.data) {
    crumbs.push({ label: video.data.title });
  }
  if (pathname === '/invites') {
    crumbs.push({ label: 'Invites' });
  }
  if (pathname === '/users') {
    crumbs.push({ label: 'Users' });
  }
  if (pathname.startsWith('/studio')) {
    crumbs.push({ label: 'Studio' });
  }
  return crumbs;
};

const Breadcrumb: FC = () => {
  const crumbs = useCrumbs();
  if (crumbs.length < 2) return null;

  return (
    <nav css={navStyles} aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={crumb.to ?? crumb.label} css={{ display: 'contents' }}>
          {index > 0 && <span css={separatorStyles}>/</span>}
          {crumb.to && index < crumbs.length - 1 ? (
            <Link to={crumb.to} css={linkStyles}>
              {crumb.label}
            </Link>
          ) : (
            <span aria-current="page">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumb;
