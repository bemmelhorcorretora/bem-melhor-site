// Recebe o lead dos formulários do site e cria um negócio no RD Station CRM.
// O token fica em process.env.RD_CRM_TOKEN — nunca no código nem no HTML,
// porque esta função roda no servidor e nada daqui chega ao navegador.

const LIMITE = 200;

// Etapa "Novos leads" do Funil Padrão. É a primeira etapa do funil, que já é
// o destino padrão de um negócio criado pela API — mandar explícito só garante
// que continue caindo lá se a ordem do funil mudar.
// Para trocar de etapa sem mexer no código, defina RD_CRM_DEAL_STAGE_ID.
const ETAPA_NOVOS_LEADS = '69ef6d7d09dac5001a7adbde';

const limpa = (v) => (typeof v === 'string' ? v.trim().slice(0, LIMITE) : '');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const nome = limpa(body.nome);
  const email = limpa(body.email);
  const telefone = limpa(body.telefone);
  const interesse = limpa(body.interesse);
  const codigoParceria = limpa(body.codigo_parceria).toUpperCase();
  const origem = limpa(body.origem) || 'Landing Page';

  if (!nome || !email || !telefone) {
    return res
      .status(400)
      .json({ error: 'Nome, e-mail e WhatsApp são obrigatórios' });
  }

  const token = process.env.RD_CRM_TOKEN;
  if (!token) {
    console.error('RD_CRM_TOKEN não configurado');
    return res.status(500).json({ error: 'Erro de configuração' });
  }

  // Área de interesse e código de parceria não têm campo próprio no payload,
  // então entram no nome do negócio para ficarem visíveis na listagem do CRM.
  const partesNome = ['Lead', origem];
  if (interesse) partesNome.push(interesse);
  partesNome.push(nome);
  if (codigoParceria) partesNome.push(`[Parceria ${codigoParceria}]`);

  try {
    const rdRes = await fetch(
      `https://crm.rdstation.com/api/v1/deals?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_stage_id: process.env.RD_CRM_DEAL_STAGE_ID || ETAPA_NOVOS_LEADS,
          deal: { name: partesNome.join(' - ') },
          deal_source: { name: origem },
          contacts: [
            {
              name: nome,
              emails: [{ email }],
              phones: [{ phone: telefone, type: 'cellphone' }]
            }
          ]
        })
      }
    );

    if (!rdRes.ok) {
      console.error('RD CRM erro:', rdRes.status, await rdRes.text());
      return res.status(502).json({ error: 'Falha ao enviar para o CRM' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
