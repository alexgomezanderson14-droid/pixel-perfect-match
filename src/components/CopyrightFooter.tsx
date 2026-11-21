import { useState } from "react";

export default function CopyrightFooter() {
  const year = new Date().getFullYear();
  const [legalOpen, setLegalOpen] = useState(false);
  return (
    <footer className="copyright-footer border-t border-white/15 bg-[#07516a] px-4 py-8 text-center text-white sm:px-6">
      <p className="text-sm font-extrabold tracking-wide">© {year} PENYERA · Todos los derechos reservados.</p>
      <p className="mt-2 text-xs font-semibold text-white/85">Creado por Peña Enredats</p>
      <button type="button" onClick={() => setLegalOpen((open) => !open)} aria-expanded={legalOpen} className="mt-4 text-xs font-semibold text-white underline underline-offset-4">
        {legalOpen ? "Cerrar aviso legal" : "Aviso legal y propiedad intelectual"}
      </button>
      {legalOpen && (
        <div className="mx-auto mt-3 max-w-3xl space-y-2 text-left text-xs leading-relaxed text-white/80">
          <p>PENYERA es el nombre oficial de este sitio web. El proyecto ha sido creado por Peña Enredats. Los contenidos originales de PENYERA están protegidos por la normativa aplicable de propiedad intelectual.</p>
          <p>Queda prohibida la reproducción, distribución, transformación o reutilización de los contenidos originales sin autorización previa y expresa de sus titulares.</p>
          <p>Las fotografías, logotipos, carteles y materiales aportados por peñas, organizadores o terceros siguen perteneciendo a sus respectivos autores o titulares. Su aparición en esta web no implica una cesión de derechos.</p>
          <p>Para solicitar autorización o comunicar una incidencia relacionada con los contenidos, contacta con la administración de la web.</p>
        </div>
      )}
    </footer>
  );
}
