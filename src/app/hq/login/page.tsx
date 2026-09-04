import { getHeroAsset } from "@/lib/db/gallery";
import { LoginScene } from "./login-scene";

export const dynamic = "force-dynamic";

/** The HQ gate wears the site's hero: the stage frame + the name in lights behind the code card. */
export default async function HqLoginPage() {
  const hero = await getHeroAsset();
  return <LoginScene photo={hero ? { url: hero.blob_url, alt: hero.alt } : null} />;
}
