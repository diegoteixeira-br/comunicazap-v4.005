import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
const RefundPolicy = () => {
  return <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Início
          </Button>
        </Link>

        <article className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
          <h1>Política de Reembolso e Cancelamento</h1>
          <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <section>
            <h2>1. Período de Teste Gratuito</h2>
            <p>
              A DT Soluções Digital oferece um período de teste gratuito de 7 (sete) dias para todos os novos usuários. 
              Durante este período, você pode explorar todas as funcionalidades da plataforma sem nenhum custo ou compromisso.
            </p>
            <p>
              Após o término do período de teste, caso você não cancele sua assinatura, será automaticamente cobrado 
              de acordo com o plano escolhido.
            </p>
          </section>

          <section>
            <h2>2. Modelo de Assinatura</h2>
            <p>
              Nossa plataforma opera sob o modelo de assinatura mensal. Isso significa que:
            </p>
            <ul>
              <li>A cobrança é realizada mensalmente, no mesmo dia em que você iniciou a assinatura paga</li>
              <li>Você terá acesso à plataforma durante todo o período pago</li>
              <li>A assinatura é renovada automaticamente a cada mês, a menos que seja cancelada</li>
            </ul>
          </section>

          <section>
            <h2>3. Política de Reembolso</h2>
            <p>
              <strong>Importante:</strong> Após o pagamento de uma mensalidade (período após o teste gratuito), 
              não oferecemos reembolso proporcional pelos dias não utilizados dentro do mês pago.
            </p>
            <p>
              Esta é uma prática padrão do modelo SaaS (Software as a Service). Quando você paga por um mês de acesso, 
              está adquirindo o direito de utilizar a plataforma durante aquele período completo.
            </p>
            <p>
              No entanto, você pode cancelar sua assinatura a qualquer momento, e o cancelamento entrará em vigor 
              ao final do período já pago.
            </p>
          </section>

          <section>
            <h2>4. Como Cancelar sua Assinatura</h2>
            <p>
              Você tem total controle sobre sua assinatura e pode cancelá-la a qualquer momento através do painel 
              "Gerenciar Assinatura" no seu dashboard.
            </p>
            <p>
              Para cancelar:
            </p>
            <ol>
              <li>Faça login na sua conta</li>
              <li>Acesse o Dashboard</li>
              <li>Clique em "Gerenciar Assinatura"</li>
              <li>Siga as instruções para cancelar</li>
            </ol>
            <p>
              Após o cancelamento, você continuará tendo acesso à plataforma até o final do período já pago. 
              Não haverá cobranças futuras.
            </p>
          </section>

          <section>
            <h2>5. Cancelamento Durante o Período de Teste</h2>
            <p>
              Se você cancelar sua conta durante o período de teste gratuito de 7 dias, não será cobrado nenhum valor. 
              Seu acesso à plataforma será encerrado imediatamente após o cancelamento.
            </p>
          </section>

          <section>
            <h2>6. Exceções e Casos Especiais</h2>
            <p>
              Em situações excepcionais, como falhas técnicas graves que impossibilitem o uso da plataforma por 
              período prolongado, analisaremos solicitações de reembolso caso a caso.
            </p>
            <p>
              Para solicitar análise de reembolso em casos excepcionais, entre em contato conosco através do 
              e-mail: contato@dtsolucoesdigital.com.br
            </p>
          </section>

          <section>
            <h2>7. Alterações nesta Política</h2>
            <p>
              Reservamo-nos o direito de modificar esta Política de Reembolso e Cancelamento a qualquer momento. 
              Quaisquer alterações entrarão em vigor imediatamente após a publicação da versão atualizada em nosso site.
            </p>
          </section>

          <section>
            <h2>8. Contato</h2>
            <p>
              Se você tiver dúvidas sobre nossa Política de Reembolso e Cancelamento, entre em contato conosco:
            </p>
            <ul>
              <li>E-mail: contato@dtsolucoesdigital.com.br</li>
              
            </ul>
          </section>
        </article>
      </div>
      <Footer />
    </div>;
};
export default RefundPolicy;