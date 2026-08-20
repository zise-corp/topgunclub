import Link from 'next/link';
import Image from 'next/image';
import { NAV_ITEMS, SOCIALS, PHONE_DISPLAY, waLink } from '@/lib/site';
import Icon from './Icon';

const DISCIPLINAS = [
  { label: 'Armas de Fuego', href: '/cursos#fuego' },
  { label: 'Airsoft Táctico', href: '/cursos#airsoft' },
  { label: 'Tiro con PCP', href: '/cursos#pcp' },
  { label: 'Arco y Flecha', href: '/cursos#arco' },
  { label: 'Cumpleaños Infantiles', href: '/eventos#cumpleanos' },
  { label: 'Torneos Mensuales', href: '/eventos#torneos' },
];

export default function Footer() {
  return (
    <footer className="footer grain">
      <div className="container">
        <div className="footer__grid">

          {/* Columna 1: Marca */}
          <div className="footer__brand">
            <Image
              src="/images/logoTopGunClub.png"
              alt="Top Gun Club SRL"
              height={1024}
              width={1536}
              quality={100}
              className="footer__logo footer__logo--desktop"
              style={{ width: 'auto', height: '48px', marginBottom: '14px' }}
            />
            <p>Club y escuela de tiro deportivo en Cochabamba, Bolivia. Polígono bajo techo, cursos, airsoft, PCP, eventos y servicio de comida. El lugar perfecto para cualquier ocasión.</p>
            <div className="footer__social">
              <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" /></a>
              <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="instagram" /></a>
              <a href={SOCIALS.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Icon name="tiktok" /></a>
            </div>
            <Image
              src="/images/logoTopGunClub.png"
              alt="Top Gun Club SRL"
              height={1024}
              width={1536}
              quality={100}
              className="footer__logo footer__logo--mobile"
              style={{ width: 'auto', height: '38px' }}
            />
          </div>

          {/* Columna 2: Navegación */}
          <div>
            <h4>Navegación</h4>
            <ul className="footer__links">
              {NAV_ITEMS.filter(it => !it.children).map(it => (
                <li key={it.label}><Link href={it.href}>{it.label}</Link></li>
              ))}
              {NAV_ITEMS.filter(it => it.children).map(it => (
                <li key={it.label}><Link href={it.href}>{it.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Columna 3: Disciplinas */}
          <div>
            <h4>Disciplinas</h4>
            <ul className="footer__links">
              {DISCIPLINAS.map(d => (
                <li key={d.label}><Link href={d.href}>{d.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4>Contacto</h4>
            <ul className="footer__links">
              <li>
                <a href={waLink('Hola! Quiero más información de Top Gun Club')} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" style={{ width: 15, height: 15, verticalAlign: '-2px', marginRight: 6 }} />
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <Link href="/contacto">
                  <Icon name="pin" style={{ width: 15, height: 15, verticalAlign: '-2px', marginRight: 6 }} />
                  Av. Francisco Bedregal, Zona Temporal
                </Link>
              </li>
              <li>
                <Link href="/contacto">
                  <Icon name="clock" style={{ width: 15, height: 15, verticalAlign: '-2px', marginRight: 6 }} />
                  Lun – Dom · Consultá horarios
                </Link>
              </li>
            </ul>
            <Link href="/contacto" className="btn btn--ghost" style={{ marginTop: 16 }}>
              Ver contacto <Icon name="arrow" />
            </Link>
          </div>

        </div>

        <div className="footer__bottom">
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} Top Gun Club SRL · TG Club SRL. Todos los derechos reservados.
          </p>
          <span className="ley400">
            <Icon name="shield" style={{ width: 16, height: 16 }} />
            <span>
              Actividad realizada cumpliendo la <b>Ley&nbsp;400</b> — uso y manejo seguro de armas con fines deportivos.
            </span>
          </span>
        </div>

        <div className="footer__credit">
          <a
            href="https://zise.lat/"
            target="_blank"
            rel="noopener noreferrer"
            className="dev-credit"
            aria-label="Desarrollado por ZISE — visitar zise.lat"
          >
            ZISE
          </a>
        </div>
      </div>
    </footer>
  );
}