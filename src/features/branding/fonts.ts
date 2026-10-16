import localFont from 'next/font/local';

export const brandSans = localFont({ src: '../../../public/branding/fonts/Manrope-Variable.ttf', weight: '200 800', style: 'normal', variable: '--font-brand-sans', display: 'swap' });
export const brandMono = localFont({ src: [{ path: '../../../public/branding/fonts/DMMono-Regular.ttf', weight: '400', style: 'normal' }, { path: '../../../public/branding/fonts/DMMono-Medium.ttf', weight: '500', style: 'normal' }], variable: '--font-brand-mono', display: 'swap', preload: false });
