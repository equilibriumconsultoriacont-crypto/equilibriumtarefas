import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP Hostinger connection", () => {
  it("should verify SMTP credentials and connect successfully", async () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Skip if env vars not set in test environment
    if (!host || !user || !pass) {
      console.warn("[SMTP Test] Skipping: SMTP env vars not set in test environment");
      expect(true).toBe(true); // pass gracefully
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    // verify() throws if credentials are invalid
    const result = await transporter.verify();
    expect(result).toBe(true);
  }, 15000);
});
