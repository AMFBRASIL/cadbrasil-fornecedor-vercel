/**
 * Falha o build na Vercel se VITE_API_URL não estiver configurada no projeto frontend.
 * Variáveis VITE_* são embutidas no bundle — sem redeploy após alterar no painel.
 */
const isVercel = process.env.VERCEL === "1";
const apiUrl = (process.env.VITE_API_URL || "").trim();

if (isVercel && !apiUrl) {
  console.error(
    "\n[build] ERRO: VITE_API_URL não definida no projeto FRONTEND da Vercel.\n" +
      "  Defina: VITE_API_URL=https://cadbrasil-fornecedor-back.vercel.app\n" +
      "  (com https://) e faça um novo deploy.\n",
  );
  process.exit(1);
}

if (isVercel && apiUrl && !/^https:\/\//i.test(apiUrl)) {
  console.warn(
    "\n[build] AVISO: VITE_API_URL sem https:// — será normalizado em runtime.\n" +
      `  Valor atual: ${apiUrl}\n` +
      "  Recomendado: https://" + apiUrl.replace(/^\/+/, "") + "\n",
  );
}
