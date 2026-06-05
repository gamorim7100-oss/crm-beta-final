import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Markello CRM',
  description: 'Política de privacidade e proteção de dados da Markello conforme a LGPD.',
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
      <p className="text-sm text-gray-500 mb-10">Última atualização: junho de 2026</p>

      <section className="space-y-8 text-gray-700 leading-relaxed">

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Quem somos</h2>
          <p>
            A <strong>Markello</strong> é responsável pelo tratamento dos dados pessoais coletados
            por meio desta plataforma de CRM. Para dúvidas ou solicitações relacionadas à
            privacidade, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@markello.com" className="text-blue-600 underline">
              suporte@markello.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Dados que coletamos</h2>
          <p>Coletamos e armazenamos os seguintes dados pessoais:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Nome completo</li>
            <li>Número de telefone (WhatsApp)</li>
            <li>Endereço de e-mail</li>
            <li>CPF (quando fornecido)</li>
            <li>Conteúdo de conversas via WhatsApp</li>
            <li>Informações de contrato (valor, grupo, cota)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Finalidade do tratamento</h2>
          <p>Os dados são utilizados exclusivamente para:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Gestão do relacionamento com leads e clientes (CRM)</li>
            <li>Envio e recebimento de mensagens via WhatsApp</li>
            <li>Organização de agenda e atendimentos</li>
            <li>Geração de sugestões de resposta por inteligência artificial</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Base legal (LGPD)</h2>
          <p>
            O tratamento dos dados é realizado com base no <strong>legítimo interesse</strong> da
            empresa no contexto da prestação de serviços de consultoria, e no{' '}
            <strong>consentimento</strong> quando aplicável, nos termos dos arts. 7º e 10 da Lei
            nº 13.709/2018 (LGPD).
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Compartilhamento com terceiros</h2>
          <p>Os dados podem ser compartilhados com os seguintes fornecedores de tecnologia:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              <strong>Supabase</strong> — armazenamento seguro do banco de dados (servidores
              localizados nos EUA com cláusulas contratuais padrão)
            </li>
            <li>
              <strong>OpenAI</strong> — processamento de trechos de conversa para geração de
              sugestões de resposta (os dados são enviados de forma anonimizada, sem nome ou
              identificação direta do titular)
            </li>
            <li>
              <strong>Evolution API / WhatsApp</strong> — envio e recebimento de mensagens
            </li>
          </ul>
          <p className="mt-2">
            Nenhum dado é vendido ou compartilhado com terceiros para fins publicitários.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Retenção de dados</h2>
          <p>
            Os dados pessoais são armazenados pelo prazo de <strong>2 (dois) anos</strong> a partir
            da última interação registrada. Após esse período, os dados são excluídos de forma
            segura, salvo obrigação legal que exija retenção por prazo maior.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Seus direitos</h2>
          <p>
            Nos termos da LGPD, você tem direito a:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Confirmar a existência de tratamento dos seus dados</li>
            <li>Acessar os dados que temos sobre você</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação dos seus dados</li>
            <li>Revogar o consentimento a qualquer momento</li>
            <li>Solicitar a portabilidade dos seus dados</li>
          </ul>
          <p className="mt-2">
            Para exercer qualquer um desses direitos, entre em contato pelo e-mail{' '}
            <a href="mailto:suporte@markello.com" className="text-blue-600 underline">
              suporte@markello.com
            </a>
            . Responderemos em até 15 dias úteis.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais
            contra acesso não autorizado, perda ou destruição, incluindo criptografia em trânsito
            (TLS), controle de acesso baseado em autenticação e revisões periódicas de segurança.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Contato</h2>
          <p>
            Dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais
            devem ser enviadas para:{' '}
            <a href="mailto:suporte@markello.com" className="text-blue-600 underline">
              suporte@markello.com
            </a>
          </p>
        </div>

      </section>
    </main>
  )
}
