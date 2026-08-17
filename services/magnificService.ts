/**
 * Coordinates the full flow by calling our server-side API proxy route.
 * This protects API credentials and avoids CORS blockages in the browser sandbox.
 */
export async function generateBackground(theme: string, brand?: string): Promise<string> {
  if (!theme || !theme.trim()) {
    throw new Error("O tema digitado está vazio.");
  }

  const response = await fetch("/api/magnific/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ theme, brand })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errorMsg = data.error || `Erro de rede (${response.status})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data.imageUrl) {
    throw new Error("A resposta do servidor não contém o link da imagem gerada.");
  }

  return data.imageUrl;
}
