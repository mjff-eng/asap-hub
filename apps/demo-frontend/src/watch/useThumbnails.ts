import { useQuery } from '@tanstack/react-query';

import { parseThumbnailsVtt, ThumbnailCue } from '../utils/vtt';

const useThumbnails = (thumbnailsVttUrl: string): ThumbnailCue[] => {
  const { data } = useQuery({
    queryKey: ['thumbnails', thumbnailsVttUrl],
    queryFn: async () => {
      const response = await fetch(thumbnailsVttUrl, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return parseThumbnailsVtt(await response.text());
    },
    enabled: Boolean(thumbnailsVttUrl),
    retry: false,
    staleTime: Infinity,
  });

  return data ?? [];
};

export default useThumbnails;
