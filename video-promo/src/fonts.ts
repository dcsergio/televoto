import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: spaceGroteskFamily } = loadSpaceGrotesk("normal", {
  weights: ["500", "700"],
});
const { fontFamily: interFamily } = loadInter("normal", {
  weights: ["400", "600"],
});

export const displayFontFamily = spaceGroteskFamily;
export const bodyFontFamily = interFamily;
