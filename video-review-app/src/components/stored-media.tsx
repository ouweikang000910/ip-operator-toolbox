import {
  useEffect,
  useState,
  forwardRef,
  type ImgHTMLAttributes,
  type VideoHTMLAttributes,
} from "react";
import { getMedia } from "../lib/local-store";
function useMedia(id: string, file?: string | null) {
  const [value, setValue] = useState("");
  useEffect(() => {
    let alive = true,
      url = "";
    setValue("");
    if (file)
      getMedia(id, file)
        .then((blob) => {
          if (alive && blob) {
            url = URL.createObjectURL(blob);
            setValue(url);
          }
        })
        .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, file]);
  return value || undefined;
}
export function StoredImage({
  videoId,
  file,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { videoId: string; file: string }) {
  const src = useMedia(videoId, file);
  return <img {...props} src={src} />;
}
export const StoredVideo = forwardRef<
  HTMLVideoElement,
  VideoHTMLAttributes<HTMLVideoElement> & {
    videoId: string;
    file: string;
    posterFile?: string | null;
  }
>(function StoredVideo({ videoId, file, posterFile, ...props }, ref) {
  const src = useMedia(videoId, file),
    poster = useMedia(videoId, posterFile);
  return <video {...props} ref={ref} src={src} poster={poster} />;
});
