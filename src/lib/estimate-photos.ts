import { MAX_AI_IMAGE_BYTES } from "@/lib/ai-estimate";

export function validateOrderPhotos(files: File[]) {
  if (files.length > 5 || files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
    throw new Error("Pridajte najviac 5 fotografií JPG, PNG alebo WebP, každú do 5 MB.");
  }
}

export async function prepareEstimatePhotos(files: File[]) {
  validateOrderPhotos(files);
  const result: string[] = [];
  for (const file of files) {
    // Canvas re-encoding strips EXIF (including GPS) and keeps function bodies small.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error("Fotografiu sa nepodarilo spracovať.");
      let prepared: string | undefined;
      for (const edge of [1280, 960, 640]) {
        const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const value = canvas.toDataURL("image/jpeg", 0.75);
        if ((value.length - value.indexOf(",") - 1) * 0.75 <= MAX_AI_IMAGE_BYTES) { prepared = value; break; }
      }
      if (!prepared) throw new Error("Fotografia je príliš zložitá na AI odhad. Skúste menší záber.");
      result.push(prepared);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Fotografia")) throw error;
      throw new Error("Fotografiu sa nepodarilo spracovať. Skúste iný súbor.");
    } finally { URL.revokeObjectURL(url); }
  }
  return result;
}
