import React, { useEffect, useState } from 'react';
import { buildAssetUrl } from '../../utils/baseUrl';

const COURSE_FALLBACK_IMAGE = buildAssetUrl('/htginfotech-logo.png');

interface CourseImageProps {
  src?: string | null;
  alt: string;
  className: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

const hasImageSource = (src?: string | null) => Boolean(src?.trim());

const CourseImage: React.FC<CourseImageProps> = ({
  src,
  alt,
  className,
  imageClassName = 'object-cover',
  fallbackClassName = 'object-contain opacity-20 p-6 bg-gray-50'
}) => {
  const [currentSrc, setCurrentSrc] = useState(hasImageSource(src) ? src!.trim() : COURSE_FALLBACK_IMAGE);
  const [usingFallback, setUsingFallback] = useState(!hasImageSource(src));

  useEffect(() => {
    const nextHasSource = hasImageSource(src);
    setCurrentSrc(nextHasSource ? src!.trim() : COURSE_FALLBACK_IMAGE);
    setUsingFallback(!nextHasSource);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`${className} ${usingFallback ? fallbackClassName : imageClassName}`.trim()}
      onError={() => {
        if (currentSrc === COURSE_FALLBACK_IMAGE) {
          return;
        }

        setCurrentSrc(COURSE_FALLBACK_IMAGE);
        setUsingFallback(true);
      }}
    />
  );
};

export default CourseImage;
