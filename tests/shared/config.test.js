import { describe, expect, it } from "vitest";
import { readPort, requireConfig } from "../../src/shared/config.js";

describe("configuration", () => {
  it("lit un port et utilise la valeur par défaut", () => {
    expect(readPort("4200", 3000)).toBe(4200);
    expect(readPort(undefined, 3000)).toBe(3000);
  });

  it.each(["abc", "0", "65536", "2.5"])(
    "refuse le port invalide %s",
    (value) => {
      expect(() => readPort(value, 3000)).toThrow("Port invalide");
    },
  );

  it("exige une configuration présente", () => {
    expect(requireConfig("TOKEN", "secret")).toBe("secret");
    expect(() => requireConfig("TOKEN", "")).toThrow(
      "Variable TOKEN manquante",
    );
  });
});
