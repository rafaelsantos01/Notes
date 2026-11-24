import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

/**
 * Wrapper central do invoke com tratamento de erros padronizado:
 * qualquer falha do backend é logada e exibida como toast.
 * O erro é re-lançado para que chamadores que dependem do resultado
 * possam interromper seus fluxos (sem duplicar o feedback).
 */
export async function cmd<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message = errorMessage(error);
    console.error(`[notes] ${command} falhou:`, error);
    toast.error("Algo deu errado", { description: message });
    throw error;
  }
}

export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Erro inesperado. Tente novamente.";
}
