export const WA_PHONE = '59169500967';
export const PHONE_DISPLAY = '+591 69500967';

export const SOCIALS = {
  facebook: 'https://www.facebook.com/topgunclubsrl/',
  instagram: 'https://www.instagram.com/topgunclub_srl/',
  tiktok: 'https://www.tiktok.com/@top_gun_club',
};

export function waLink(text?: string): string {
  const msg = text ?? 'Hola! Estoy interesad@ en los servicios de Top Gun Club';
  return `https://api.whatsapp.com/send/?phone=${WA_PHONE}&text=${encodeURIComponent(msg)}&type=phone_number&app_absent=0`;
}

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Tienda',
    href: '/tienda',
    children: [
      { label: 'Armas de Fuego', href: '/tienda?cat=armas-de-fuego' },
      { label: 'PCP', href: '/tienda?cat=pcp' },
      { label: 'Productos', href: '/tienda?cat=productos' },
      { label: 'Regalos', href: '/tienda?cat=regalos' },
    ]
  },
  {
    label: 'Cursos', 
    href: '/cursos',
    children: [
      { label: 'Armas de Fuego', href: '/cursos#fuego' },
      { label: 'Airsoft', href: '/cursos#airsoft' },
      { label: 'PCP', href: '/cursos#pcp' },
      { label: 'Arco y Flecha', href: '/cursos#arco' },
    ]
  },
  { 
    label: 'Eventos', 
    href: '/eventos',
    children: [
      { label: 'Cumpleaños', href: '/eventos#cumpleanos' },
      { label: 'Torneos', href: '/eventos#torneos' },
    ]
  },
  { label: 'Galería', href: '/galeria' },
  { label: 'Contacto', href: '/contacto' },
];
