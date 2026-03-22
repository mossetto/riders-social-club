import { useState, useRef, useEffect } from 'react'

const PAISES = [
  { nombre: 'Argentina', bandera: '🇦🇷' },
  { nombre: 'México', bandera: '🇲🇽' },
  { nombre: 'España', bandera: '🇪🇸' },
  { nombre: 'Colombia', bandera: '🇨🇴' },
  { nombre: 'Chile', bandera: '🇨🇱' },
  { nombre: 'Perú', bandera: '🇵🇪' },
  { nombre: 'Venezuela', bandera: '🇻🇪' },
  { nombre: 'Ecuador', bandera: '🇪🇨' },
  { nombre: 'Bolivia', bandera: '🇧🇴' },
  { nombre: 'Paraguay', bandera: '🇵🇾' },
  { nombre: 'Uruguay', bandera: '🇺🇾' },
  { nombre: 'Cuba', bandera: '🇨🇺' },
  { nombre: 'República Dominicana', bandera: '🇩🇴' },
  { nombre: 'Guatemala', bandera: '🇬🇹' },
  { nombre: 'Honduras', bandera: '🇭🇳' },
  { nombre: 'El Salvador', bandera: '🇸🇻' },
  { nombre: 'Nicaragua', bandera: '🇳🇮' },
  { nombre: 'Costa Rica', bandera: '🇨🇷' },
  { nombre: 'Panamá', bandera: '🇵🇦' },
  { nombre: 'Puerto Rico', bandera: '🇵🇷' },
  { nombre: 'Guinea Ecuatorial', bandera: '🇬🇶' },
]

export function getBandera(nombre) {
  return PAISES.find(p => p.nombre === nombre)?.bandera || ''
}

export default function PaisSelector({ value, onChange, placeholder = 'País (Opcional)', name }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtrados = PAISES.filter(p =>
    p.nombre.toLowerCase().includes(query.toLowerCase())
  )

  function select(pais) {
    setQuery(pais.nombre)
    onChange(pais.nombre)
    setOpen(false)
  }

  function handleInput(e) {
    setQuery(e.target.value)
    onChange('')
    setOpen(true)
  }

  return (
    <div className="pais-selector" ref={ref}>
      {name && <input type="hidden" name={name} value={value || ''} />}
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtrados.length > 0 && (
        <ul className="pais-dropdown">
          {filtrados.map(p => (
            <li key={p.nombre} onClick={() => select(p)} className="pais-option">
              <span className="pais-flag">{p.bandera}</span>
              <span>{p.nombre}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
