import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

// Acepta los dos caminos:
//  · JSON, que es el que manda el formulario de la pagina cuando el guion corre.
//  · form-encoded, que es lo que manda el navegador cuando NO corre. Antes ese caso
//    no existia: el <form> no tenia action ni escucha, asi que al enviar se recargaba
//    la pagina con el nombre, el correo y el mensaje EN LA URL, y nunca llegaba nada.
//    Ahora cae aqui y se contesta con un redirect, no con un JSON que el navegador
//    pintaria como texto plano.
type Campos = {
  nombre?: string;
  email?: string;
  empresa?: string;
  telefono?: string;
  mensaje?: string;
};

async function leerCampos(request: Request): Promise<{ campos: Campos | null; esFormulario: boolean }> {
  const tipo = request.headers.get('content-type') || '';
  if (tipo.includes('application/json')) {
    const body = await request.json().catch(() => null);
    return { campos: body, esFormulario: false };
  }
  if (tipo.includes('form')) {
    const form = await request.formData().catch(() => null);
    if (!form) return { campos: null, esFormulario: true };
    return {
      campos: {
        nombre: String(form.get('nombre') || ''),
        email: String(form.get('email') || ''),
        empresa: String(form.get('empresa') || ''),
        telefono: String(form.get('telefono') || ''),
        mensaje: String(form.get('mensaje') || ''),
      },
      esFormulario: true,
    };
  }
  return { campos: null, esFormulario: false };
}

export const POST: APIRoute = async ({ request }) => {
  const { campos, esFormulario } = await leerCampos(request);

  if (!campos) {
    if (esFormulario) return Response.redirect(new URL('/?envio=error#contacto', request.url), 303);
    return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 });
  }

  const { nombre, email, empresa, telefono, mensaje } = campos;

  if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
    if (esFormulario) return Response.redirect(new URL('/?envio=faltan#contacto', request.url), 303);
    return new Response(JSON.stringify({ error: 'Nombre, email y mensaje son requeridos' }), { status: 422 });
  }

  if (!import.meta.env.RESEND_API_KEY) {
    console.log('[DEV] Formulario recibido (sin RESEND_API_KEY):', { nombre, email, empresa, telefono, mensaje });
    if (esFormulario) return Response.redirect(new URL('/?envio=ok#contacto', request.url), 303);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'Prospectum AI Web <web@prospectumai.com>',
    to: 'paisa@prospectumai.com',
    replyTo: email,
    // Decia "Contacto prospectum.mx", un dominio viejo. Diego confirmo el 17-sep-2026 que el de
    // produccion es prospectumai.com.
    subject: `Contacto prospectumai.com — ${nombre}`,
    text: [
      `Nombre: ${nombre}`,
      `Email: ${email}`,
      `Empresa: ${empresa || '—'}`,
      `WhatsApp: ${telefono || '—'}`,
      '',
      'Mensaje:',
      mensaje,
    ].join('\n'),
  });

  if (esFormulario) return Response.redirect(new URL('/?envio=ok#contacto', request.url), 303);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
