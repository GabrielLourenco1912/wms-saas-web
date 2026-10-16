import geometry from './content/geometry.json';

export function BrandMark({ size = 40, inverse = false, label, className = '' }: { size?: number; inverse?: boolean; label?: string; className?: string }) {
  return <svg className={`wms-symbol ${inverse ? 'wms-symbol-inverse' : ''} ${className}`} width={size} height={size} viewBox="0 0 128 128" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false"><path d={geometry.path} fill="currentColor" /></svg>;
}
