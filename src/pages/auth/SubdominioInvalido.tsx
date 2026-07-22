import { Building, Loader2, ArrowRight } from "lucide-react";
import LOGO_WHITE from "/GCOEDU-LOGO-branco.png";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SubdominioInvalido() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"checking" | "invalid" | "valid">("checking");
  const [tenantInput, setTenantInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If we have a subdomain in the URL, verify it. 
    // If no subdomain, we show the selector immediately.
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    
    // Check if there is an actual subdomain (e.g. camacari.gcoedu.com)
    // If the domain only has 2 parts (gcoedu.com) or is localhost, we ask for the tenant.
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    let subdomainToCheck = "";
    if (parts.length >= 3 && !isLocalhost) {
      subdomainToCheck = parts[0];
    } else if (isLocalhost && parts.length >= 2 && parts[0] !== 'localhost') {
      subdomainToCheck = parts[0];
    }

    if (!subdomainToCheck) {
      setStatus("invalid");
      return;
    }

    const check = async () => {
      try {
        const { data } = await api.get<{ exists: boolean }>(
          `/subdomain/check?subdomain=${encodeURIComponent(subdomainToCheck)}`
        );
        if (data?.exists) {
          setStatus("valid");
          // Volta para a rota raiz para o fluxo normal (SubdomainCheck/Login/BaseRoute).
          navigate("/", { replace: true });
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    check();
  }, [navigate]);

  const handleSelectTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTenant = tenantInput.trim().toLowerCase();
    
    if (!cleanTenant) return;
    
    setIsSubmitting(true);
    try {
      const { data } = await api.get<{ exists: boolean }>(
        `/subdomain/check?subdomain=${encodeURIComponent(cleanTenant)}`
      );
      
      if (data?.exists) {
        localStorage.setItem("tenant_slug", cleanTenant);
        navigate("/", { replace: true });
        // Recarregar a página para garantir que o contexto pegue o novo tenant do localStorage
        window.location.reload();
      } else {
        toast({
          title: "Instituição não encontrada",
          description: "Verifique se o código digitado está correto.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível validar a instituição no momento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0C4A6E]">
        <div className="flex items-center gap-3 text-white/90">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Verificando acesso...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-auth-page="subdominio-invalido"
      className="min-h-screen w-full flex flex-col items-center justify-center fixed inset-0 z-50 bg-[#0C4A6E] p-6"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-sky-300 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center">
        <img
          src={LOGO_WHITE}
          alt="GCOEDU"
          className="w-[200px] max-w-full h-auto mb-8"
        />
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
          <Building className="w-8 h-8 text-sky-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Encontre sua Instituição
        </h1>
        <p className="text-white/80 mb-6">
          Para acessar o sistema, por favor informe o código ou nome do seu município/instituição.
        </p>

        <form onSubmit={handleSelectTenant} className="w-full max-w-xs flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Ex: camacari, jiparana..."
            value={tenantInput}
            onChange={(e) => setTenantInput(e.target.value)}
            className="h-12 bg-gray-700/80 text-white placeholder:text-gray-500 border-none text-center rounded-lg focus:ring-2 focus:ring-sky-500/50"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            className="w-full h-12 text-white font-semibold bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] hover:from-[#2563EB] hover:to-[#3B82F6] shadow-lg shadow-blue-500/30 rounded-lg transition-all"
            disabled={!tenantInput.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Acessar <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-white/50 mt-8">
          Se não souber seu código de acesso, entre em contato com a coordenação.
        </p>
      </div>

      <p className="relative z-10 mt-12 text-xs text-white/40">
        © {new Date().getFullYear()} GCOEDU
      </p>
    </div>
  );
}
