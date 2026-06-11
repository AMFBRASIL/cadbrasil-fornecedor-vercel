import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Cloud, CheckCircle2, Loader2, Save, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  EMAIL_SECRET_MASK,
  fetchStorageSettings,
  saveStorageSettings,
  testStorageSettings,
  type StorageSettings,
  type StorageSettingsStatus,
} from "@/lib/admin-settings-api";

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

interface Props {
  onSaved?: () => void;
}

export function StorageConfigPanel({ onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<StorageSettings | null>(null);
  const [status, setStatus] = useState<StorageSettingsStatus | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStorageSettings();
      setSettings({ ...data.settings, storage_provedor: "s3" });
      setStatus(data.status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar armazenamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const patch = (key: keyof StorageSettings, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const salvar = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const msg = await saveStorageSettings({ ...settings, storage_provedor: "s3" });
      toast.success(msg);
      await carregar();
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const testar = async () => {
    setTesting(true);
    try {
      const msg = await testStorageSettings();
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no teste");
    } finally {
      setTesting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações...
      </div>
    );
  }

  const usage = status?.usage;
  const usedLabel = usage ? `${usage.usedGb} GB` : "—";
  const quotaLabel = usage ? `${usage.quotaGb} GB` : settings.storage_quota_gb;
  const pct = usage?.percentUsed ?? 0;

  return (
    <>
      {status && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant={status.configured ? "default" : "secondary"} className="text-[10px]">
            {status.configured ? "Configurado" : "Incompleto"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Fonte: {status.configSource === "database" ? "banco de dados" : ".env"}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Cloud className="h-3 w-3" />
            Amazon S3
          </Badge>
        </div>
      )}

      <Section
        title="Amazon S3"
        desc="Credenciais salvas em configuracoes_sistema. Deixe a secret key em branco para manter a atual."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bucket">
            <Input value={settings.storage_s3_bucket} onChange={(e) => patch("storage_s3_bucket", e.target.value)} />
          </Field>
          <Field label="Região">
            <Input value={settings.storage_s3_region} onChange={(e) => patch("storage_s3_region", e.target.value)} />
          </Field>
          <Field label="Access Key ID">
            <Input
              value={settings.storage_s3_access_key_id}
              onChange={(e) => patch("storage_s3_access_key_id", e.target.value)}
            />
          </Field>
          <Field label="Secret Access Key" hint="Deixe em branco para não alterar">
            <Input
              type="password"
              placeholder={
                settings.storage_s3_secret_access_key === EMAIL_SECRET_MASK ? "••••••••••••" : ""
              }
              value={
                settings.storage_s3_secret_access_key === EMAIL_SECRET_MASK
                  ? ""
                  : settings.storage_s3_secret_access_key
              }
              onChange={(e) => patch("storage_s3_secret_access_key", e.target.value)}
            />
          </Field>
          <Field label="Endpoint (opcional)" hint="Deixe vazio para AWS padrão">
            <Input
              value={settings.storage_s3_endpoint}
              onChange={(e) => patch("storage_s3_endpoint", e.target.value)}
              placeholder="https://s3.amazonaws.com"
            />
          </Field>
          <Field label="CDN URL (opcional)" hint="URL pública dos arquivos (CloudFront ou bucket público)">
            <Input value={settings.storage_cdn_url} onChange={(e) => patch("storage_cdn_url", e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <ToggleRow
            title="Path-style addressing"
            desc="Ative apenas para MinIO ou provedores S3-compatíveis não-AWS."
            checked={settings.storage_s3_use_path_style === "true"}
            onCheckedChange={(v) => patch("storage_s3_use_path_style", v ? "true" : "false")}
          />
        </div>
      </Section>

      <Section title="Limites de upload">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tamanho máximo (MB)">
            <Input
              type="number"
              value={settings.storage_max_file_size_mb}
              onChange={(e) => patch("storage_max_file_size_mb", e.target.value)}
            />
          </Field>
          <Field label="Extensões permitidas" hint="Separadas por vírgula">
            <Input
              value={settings.storage_allowed_extensions}
              onChange={(e) => patch("storage_allowed_extensions", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Retenção & versionamento">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reter documentos por (meses)">
            <Input
              type="number"
              value={settings.storage_retencao_meses}
              onChange={(e) => patch("storage_retencao_meses", e.target.value)}
            />
          </Field>
          <Field label="Versões mantidas por arquivo">
            <Input
              type="number"
              value={settings.storage_versoes_por_arquivo}
              onChange={(e) => patch("storage_versoes_por_arquivo", e.target.value)}
            />
          </Field>
          <Field label="Quota total (GB)">
            <Input
              type="number"
              value={settings.storage_quota_gb}
              onChange={(e) => patch("storage_quota_gb", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-3 space-y-2">
          <ToggleRow
            title="Versionamento ativo"
            desc="Mantém histórico de versões de cada documento."
            checked={settings.storage_versionamento_ativo !== "false"}
            onCheckedChange={(v) => patch("storage_versionamento_ativo", v ? "true" : "false")}
          />
          <ToggleRow
            title={`Mover para frio após ${settings.storage_frio_dias} dias`}
            desc="Reduz custos com arquivos pouco acessados."
            checked={settings.storage_mover_frio === "true"}
            onCheckedChange={(v) => patch("storage_mover_frio", v ? "true" : "false")}
          />
          <ToggleRow
            title="Excluir permanentemente após retenção"
            desc="Apaga arquivos expirados automaticamente."
            checked={settings.storage_excluir_apos_retencao === "true"}
            onCheckedChange={(v) => patch("storage_excluir_apos_retencao", v ? "true" : "false")}
          />
        </div>
        {settings.storage_mover_frio === "true" && (
          <div className="mt-3 max-w-xs">
            <Field label="Dias até armazenamento frio">
              <Input
                type="number"
                value={settings.storage_frio_dias}
                onChange={(e) => patch("storage_frio_dias", e.target.value)}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Uso atual">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {usedLabel} / {quotaLabel}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {pct}% utilizado
            </Badge>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
        </div>
      </Section>

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="outline" className="gap-1.5" disabled={testing || saving} onClick={() => void testar()}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Testar conexão S3
        </Button>
        <Button className="gap-1.5" disabled={saving} onClick={() => void salvar()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>
    </>
  );
}
