import { describe, expect, it } from "vitest";
import bcryptjs from "bcryptjs";

describe("auth.login", () => {
  it("should hash password correctly with bcryptjs", async () => {
    const password = "Equilibrium159753";
    const hash = "$2b$10$fASA8EZdmDfVzexH65A2..u9TMCc16iaLopEFd3wC8jLItfIL2GI6";
    
    const isValid = await bcryptjs.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject invalid password", async () => {
    const wrongPassword = "WrongPassword123";
    const hash = "$2b$10$fASA8EZdmDfVzexH65A2..u9TMCc16iaLopEFd3wC8jLItfIL2GI6";
    
    const isValid = await bcryptjs.compare(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it("should generate bcryptjs hash", async () => {
    const password = "Equilibrium159753";
    const hash = await bcryptjs.hash(password, 10);
    
    const isValid = await bcryptjs.compare(password, hash);
    expect(isValid).toBe(true);
  });
});
