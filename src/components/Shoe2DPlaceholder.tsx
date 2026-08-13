import React, { useState } from 'react';
import { Footprints } from 'lucide-react';

interface Shoe2DPlaceholderProps {
  articleCode?: string;
  category?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

export const Shoe2DPlaceholder: React.FC<Shoe2DPlaceholderProps> = ({
  articleCode,
  category,
  size = 'md',
  showLabel = true,
}) => {
  const iconSizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const badgeSizes = {
    xs: 'w-8 h-8 rounded-lg',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-20 h-20 rounded-2xl',
    xl: 'w-28 h-28 rounded-3xl',
  };

  const textSizes = {
    xs: 'text-[7px]',
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className="w-full h-full bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col items-center justify-center p-2 text-center select-none overflow-hidden relative group">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 opacity-80" />

      {/* Main Login-style Logo Icon Badge */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className={`${badgeSizes[size]} bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-105 group-hover:border-amber-500/60 group-hover:bg-amber-500/20 transition-all duration-200`}>
          <Footprints className={`${iconSizes[size]} text-amber-400`} />
        </div>
      </div>
    </div>
  );
};

interface ProductImageDisplayProps {
  src?: string;
  alt?: string;
  articleCode?: string;
  category?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  onClick?: () => void;
}

export const ProductImageDisplay: React.FC<ProductImageDisplayProps> = ({
  src,
  alt,
  articleCode,
  category,
  className = 'w-full h-full object-cover',
  size = 'md',
  showLabel = true,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const hasValidImage = src && src.trim().length > 0 && !imageError;

  if (!hasValidImage) {
    return (
      <div className="w-full h-full cursor-pointer" onClick={onClick}>
        <Shoe2DPlaceholder
          articleCode={articleCode || alt}
          category={category}
          size={size}
          showLabel={showLabel}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || articleCode || 'Product'}
      className={className}
      onError={() => setImageError(true)}
      onClick={onClick}
    />
  );
};
