'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Icon from './Icon';

const TESTIMONIALS = [
  {
    q: 'Empecé sin saber absolutamente nada y en una semana ya manejaba el arma con total seguridad. Los instructores son pacientes y muy profesionales.',
    who: 'Maria Jose Torrico.',
    role: 'Alumna · Airsoft',
    img: 'https://res.cloudinary.com/dj5yikcc4/image/upload/v1781748751/Testimonio1_xiakoe.jpg',
  },
  {
    q: 'Hicimos el team building de la empresa acá. El espacio es amplio, moderno y la experiencia de tiro fue inolvidable para todo el equipo.',
    who: 'Equipo de tiro',
    role: 'Sesiones',
    img: 'https://res.cloudinary.com/dj5yikcc4/image/upload/v1781748751/Testimonio2_smz7ts.jpg',
  },
  {
    q: 'El polígono es impecable y muy seguro. Se nota que cumplen la Ley 400 al pie de la letra. Mi lugar fijo para practicar en Cochabamba.',
    who: 'Carlos Taborga.',
    role: 'Alumno · Curso de uso y manejo seguro de armas de fuego',
    img: 'https://res.cloudinary.com/dj5yikcc4/image/upload/v1781748750/Testimonio3_szb76v.png',
  },
];

export default function Testimonios() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI(p => (p + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(180deg,var(--bg),#0d0f0e)',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="container">
        <div className="shead center reveal">
          <span className="eyebrow eyebrow--center">Reseñas</span>
          <h2 className="section-title">
            Lo que dicen <em>nuestros</em> alumnos
          </h2>
        </div>
        
        <div className="split reveal" data-d="2" style={{ alignItems: 'center', gap: '48px' }}>
          {/* Imagen del testimonio */}
          <div
            className="split__media"
            style={{
              position: 'relative',
              aspectRatio: '4/3',
              borderRadius: 'var(--r)',
              overflow: 'hidden',
            }}
          >
            {TESTIMONIALS.map((t, idx) => (
              <Image
                key={idx}
                src={t.img}
                alt={`Testimonio de ${t.who}`}
                fill
                style={{ 
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  opacity: idx === i ? 1 : 0,
                  transition: 'opacity 1.2s ease-in-out'
                }}
                sizes="(max-width: 860px) 100vw, 50vw"
              />
            ))}
          </div>

          {/* Texto del testimonio */}
          <div className="tst" style={{ position: 'relative' }}>
            <div className="tst__track" style={{ position: 'relative' }}>
              {TESTIMONIALS.map((t, idx) => (
                <figure 
                  className={'tst__item' + (idx === i ? ' on' : '')} 
                  key={idx}
                  style={{
                    position: idx === i ? 'relative' : 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    opacity: idx === i ? 1 : 0,
                    transform: idx === i ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
                    pointerEvents: idx === i ? 'auto' : 'none'
                  }}
                >
                  <div className="tst__stars">
                    {[0, 1, 2, 3, 4].map(s => <Icon key={s} name="star" />)}
                  </div>
                  <blockquote className="tst__quote">&ldquo;{t.q}&rdquo;</blockquote>
                  <figcaption className="tst__who">
                    {t.who}
                    <small>{t.role}</small>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="tst__dots">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  className={idx === i ? 'on' : ''}
                  aria-label={`Reseña ${idx + 1}`}
                  onClick={() => setI(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}