export interface NewsletterData {
  subject: string
  preheader?: string
  headline: string
  body: string         // HTML ou texto simples
  ctaText?: string
  ctaUrl?: string
  edition?: string     // Ex: "Edição #1 • Fevereiro 2026"
}

export function buildNewsletterHtml(data: NewsletterData): string {
  const { subject, preheader, headline, body, ctaText, ctaUrl, edition } = data
  const year = new Date().getFullYear()
  const cta = ctaText && ctaUrl ? `
    <tr>
      <td align="center" style="padding: 24px 0 8px;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:#6366f1;color:#fff;font-family:sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
          ${ctaText}
        </a>
      </td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#0a0a0f;line-height:1px;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0f;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#111118;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;padding:6px 12px;color:#fff;font-weight:700;font-size:16px;letter-spacing:0.05em;">
                      SOFIA AI
                    </span>
                  </td>
                  ${edition ? `<td align="right" style="color:rgba(255,255,255,0.3);font-size:12px;">${edition}</td>` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 20px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">${headline}</h1>
              <div style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;">
                ${body}
              </div>
            </td>
          </tr>

          <!-- CTA -->
          ${cta ? `<tr><td style="padding:0 40px;">${cta}</td></tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;line-height:1.6;">
                Você está recebendo este email porque se cadastrou em sofiaia.roilabs.com.br.<br>
                <a href="{{unsubscribe_url}}" style="color:rgba(255,255,255,0.35);">Cancelar inscrição</a>
                &nbsp;·&nbsp;
                <a href="https://sofiaia.roilabs.com.br" style="color:rgba(255,255,255,0.35);">Sofia AI</a>
                &nbsp;·&nbsp; &copy; ${year} ROI Labs
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
