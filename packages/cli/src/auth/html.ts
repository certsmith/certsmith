// Certsmith CLI - Auth Wizard HTML Template
// Self-contained dark-mode web page using CSS tokens from packages/web (shadcn radix-nova style).

/**
 * Generate the full HTML page for the local auth wizard.
 * Uses oklch color tokens extracted from the Certsmith Trust Portal (packages/web/app/app.css)
 * following the shadcn/ui radix-nova pattern with CSS custom properties.
 */
export function generateAuthWizardHtml(port: number): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certsmith – Authentication Setup</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    /* ===================================================================
     * Design Tokens — extracted from packages/web/app/app.css (dark mode)
     * Using shadcn oklch CSS custom property pattern
     * =================================================================== */
    :root {
      --background: oklch(0.148 0.004 228.8);
      --foreground: oklch(0.987 0.002 197.1);
      --card: oklch(0.218 0.008 223.9);
      --card-foreground: oklch(0.987 0.002 197.1);
      --primary: oklch(0.437 0.078 188.216);
      --primary-foreground: oklch(0.984 0.014 180.72);
      --secondary: oklch(0.274 0.006 286.033);
      --secondary-foreground: oklch(0.985 0 0);
      --muted: oklch(0.275 0.011 216.9);
      --muted-foreground: oklch(0.723 0.014 214.4);
      --accent: oklch(0.275 0.011 216.9);
      --accent-foreground: oklch(0.987 0.002 197.1);
      --destructive: oklch(0.704 0.191 22.216);
      --border: oklch(1 0 0 / 10%);
      --input: oklch(1 0 0 / 15%);
      --ring: oklch(0.56 0.021 213.5);
      --radius: 0.45rem;
      --success: oklch(0.723 0.191 142.5);
    }

    /* ===================================================================
     * Reset & Base — shadcn-style base layer
     * =================================================================== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border-color: var(--border);
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--background);
      color: var(--foreground);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ===================================================================
     * Layout
     * =================================================================== */
    .container {
      width: 100%;
      max-width: 560px;
    }

    /* ===================================================================
     * Card Component — shadcn card pattern
     * =================================================================== */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) * 1.8);
      overflow: hidden;
    }

    .card-header {
      padding: 2rem 2rem 0;
      text-align: center;
    }

    .card-content {
      padding: 1.5rem 2rem;
    }

    .card-footer {
      padding: 0 2rem 2rem;
    }

    /* ===================================================================
     * Brand Header
     * =================================================================== */
    .brand-icon {
      width: 56px;
      height: 56px;
      border-radius: calc(var(--radius) * 1.4);
      background: linear-gradient(135deg, var(--primary), oklch(0.55 0.12 188));
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      box-shadow: 0 0 0 1px oklch(1 0 0 / 5%), 0 8px 24px oklch(0 0 0 / 30%);
    }

    .brand-icon svg {
      width: 28px;
      height: 28px;
      color: var(--primary-foreground);
    }

    .card-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }

    .card-description {
      font-size: 0.875rem;
      color: var(--muted-foreground);
      line-height: 1.5;
    }

    /* ===================================================================
     * Stepper — progress indicator
     * =================================================================== */
    .stepper {
      display: flex;
      gap: 0.5rem;
      margin: 1.5rem 0;
    }

    .stepper-step {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      background: var(--muted);
      transition: background 0.3s ease;
    }

    .stepper-step.active {
      background: var(--primary);
    }

    .stepper-step.done {
      background: var(--success);
    }

    /* ===================================================================
     * Step Sections
     * =================================================================== */
    .step-section {
      display: none;
      animation: fadeIn 0.25s ease;
    }

    .step-section.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ===================================================================
     * Info Box — shadcn alert pattern
     * =================================================================== */
    .info-box {
      background: oklch(0.2 0.015 220 / 60%);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) * 1.2);
      padding: 1rem 1.125rem;
      margin-bottom: 1.25rem;
    }

    .info-box-title {
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .info-box-title svg {
      width: 16px;
      height: 16px;
      color: var(--primary);
      flex-shrink: 0;
    }

    .info-box p {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      line-height: 1.6;
    }

    .permission-list {
      list-style: none;
      margin: 0.625rem 0 0;
      padding: 0;
    }

    .permission-list li {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      padding: 0.375rem 0.625rem;
      background: oklch(0.16 0.005 230);
      border-radius: calc(var(--radius) * 0.6);
      margin-bottom: 0.375rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .permission-list li::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary);
      flex-shrink: 0;
    }

    /* ===================================================================
     * Form Controls — shadcn input/button pattern
     * =================================================================== */
    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-input {
      width: 100%;
      height: 2.5rem;
      padding: 0 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      background: var(--background);
      color: var(--foreground);
      border: 1px solid var(--input);
      border-radius: calc(var(--radius) * 0.8);
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-input:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 2px oklch(0.56 0.021 213.5 / 25%);
    }

    .form-input::placeholder {
      color: var(--muted-foreground);
      opacity: 0.5;
    }

    .form-input.error {
      border-color: var(--destructive);
      box-shadow: 0 0 0 2px oklch(0.704 0.191 22.216 / 20%);
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-top: 0.375rem;
    }

    /* ===================================================================
     * Buttons — shadcn button variants
     * =================================================================== */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 2.5rem;
      padding: 0 1.25rem;
      font-family: 'Inter', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: calc(var(--radius) * 0.8);
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .btn-primary:hover:not(:disabled) {
      background: oklch(0.5 0.09 188);
      box-shadow: 0 2px 8px oklch(0.437 0.078 188.216 / 30%);
    }

    .btn-secondary {
      background: var(--secondary);
      color: var(--secondary-foreground);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--accent);
    }

    .btn-outline {
      background: transparent;
      color: var(--foreground);
      border: 1px solid var(--border);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--accent);
    }

    .btn-destructive {
      background: var(--destructive);
      color: white;
    }

    .btn-full {
      width: 100%;
    }

    .btn svg {
      width: 16px;
      height: 16px;
    }

    .btn-group {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .btn-group .btn {
      flex: 1;
    }

    /* ===================================================================
     * Spinner
     * =================================================================== */
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid oklch(1 0 0 / 20%);
      border-top-color: var(--primary-foreground);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===================================================================
     * Result Panels
     * =================================================================== */
    .result-success {
      text-align: center;
      padding: 1rem 0;
    }

    .result-success .icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: oklch(0.723 0.191 142.5 / 15%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      animation: scaleIn 0.3s ease;
    }

    @keyframes scaleIn {
      from { transform: scale(0.7); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .result-success .icon-circle svg {
      width: 32px;
      height: 32px;
      color: var(--success);
    }

    .result-success h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }

    .result-success p {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    .result-detail {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) * 0.8);
      padding: 0.875rem;
      margin-top: 1.25rem;
      text-align: left;
    }

    .result-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.375rem 0;
      font-size: 0.8125rem;
    }

    .result-detail-row + .result-detail-row {
      border-top: 1px solid var(--border);
    }

    .result-detail-row .label {
      color: var(--muted-foreground);
    }

    .result-detail-row .value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }

    .result-error {
      text-align: center;
      padding: 1rem 0;
    }

    .result-error .icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: oklch(0.704 0.191 22.216 / 15%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }

    .result-error .icon-circle svg {
      width: 32px;
      height: 32px;
      color: var(--destructive);
    }

    .result-error h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }

    .result-error p {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      max-width: 380px;
      margin: 0 auto;
    }

    /* ===================================================================
     * Separator
     * =================================================================== */
    .separator {
      height: 1px;
      background: var(--border);
      margin: 1.25rem 0;
    }

    /* ===================================================================
     * Footer text
     * =================================================================== */
    .footer-text {
      text-align: center;
      font-size: 0.75rem;
      color: var(--muted-foreground);
      margin-top: 1.25rem;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="card-header">
        <div class="brand-icon">
          <!-- Shield/Lock SVG icon -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <h1 class="card-title">Certsmith Authentication</h1>
        <p class="card-description">Connect your Cloudflare account to manage DNS, tunnels, SaaS certificates, and PKI infrastructure.</p>
      </div>

      <div class="card-content">
        <!-- Stepper -->
        <div class="stepper">
          <div class="stepper-step active" id="step-ind-1"></div>
          <div class="stepper-step" id="step-ind-2"></div>
          <div class="stepper-step" id="step-ind-3"></div>
        </div>

        <!-- Step 1: Create Token -->
        <div class="step-section active" id="step-1">
          <div class="info-box">
            <div class="info-box-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              Required API Token Permissions
            </div>
            <p>Create a Cloudflare API Token with the following scoped permissions:</p>
            <ul class="permission-list">
              <li>Zone — DNS — Edit</li>
              <li>Zone — SSL and Certificates — Edit</li>
              <li>Account — Cloudflare Tunnel — Edit</li>
              <li>Zone — Zone — Read</li>
            </ul>
          </div>

          <a
            href="https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22zone%22%2C%22access%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22ssl_and_certificates%22%2C%22type%22%3A%22zone%22%2C%22access%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22tunnel%22%2C%22type%22%3A%22account%22%2C%22access%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22zone%22%2C%22access%22%3A%22read%22%7D%5D"
            target="_blank"
            rel="noopener"
            class="btn btn-primary btn-full"
            id="create-token-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open Cloudflare Dashboard — Create Token
          </a>

          <p class="form-hint" style="text-align: center; margin-top: 0.75rem;">
            This opens the Cloudflare API Tokens page. Click <strong>Create Token</strong> → <strong>Custom token</strong>.
          </p>

          <div class="separator"></div>

          <div class="btn-group">
            <button class="btn btn-outline" disabled style="opacity: 0.3;">Back</button>
            <button class="btn btn-secondary" onclick="goToStep(2)">
              I have my token
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Step 2: Paste & Verify Token -->
        <div class="step-section" id="step-2">
          <div class="form-group">
            <label class="form-label" for="api-token">Cloudflare API Token</label>
            <input
              type="password"
              id="api-token"
              class="form-input"
              placeholder="Paste your API token here..."
              autocomplete="off"
              spellcheck="false"
            >
            <p class="form-hint">Your token is only sent to <code>api.cloudflare.com</code> for verification and stored locally.</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="account-id">Account ID <span style="color: var(--muted-foreground); font-weight: 400;">(optional — auto-detected if omitted)</span></label>
            <input
              type="text"
              id="account-id"
              class="form-input"
              placeholder="e.g. a1b2c3d4e5f6..."
              autocomplete="off"
              spellcheck="false"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="zone-id">Zone ID <span style="color: var(--muted-foreground); font-weight: 400;">(optional)</span></label>
            <input
              type="text"
              id="zone-id"
              class="form-input"
              placeholder="e.g. f6e5d4c3b2a1..."
              autocomplete="off"
              spellcheck="false"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="tunnel-id">Tunnel ID <span style="color: var(--muted-foreground); font-weight: 400;">(optional)</span></label>
            <input
              type="text"
              id="tunnel-id"
              class="form-input"
              placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autocomplete="off"
              spellcheck="false"
            >
          </div>

          <div id="verify-error" style="display:none; color: var(--destructive); font-size: 0.8125rem; margin-bottom: 0.75rem;"></div>

          <div class="separator"></div>

          <div class="btn-group">
            <button class="btn btn-outline" onclick="goToStep(1)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <button class="btn btn-primary" id="verify-btn" onclick="verifyToken()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Verify & Save
            </button>
          </div>
        </div>

        <!-- Step 3: Result -->
        <div class="step-section" id="step-3">
          <!-- Populated dynamically -->
        </div>
      </div>
    </div>

    <p class="footer-text">
      Certsmith Local Auth Wizard · Credentials are stored at <code>~/.config/certsmith/config.jsonc</code> · This page auto-closes after setup.
    </p>
  </div>

  <script>
    let currentStep = 1;

    function goToStep(step) {
      document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
      document.getElementById('step-' + step).classList.add('active');

      for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById('step-ind-' + i);
        ind.classList.remove('active', 'done');
        if (i < step) ind.classList.add('done');
        else if (i === step) ind.classList.add('active');
      }

      currentStep = step;

      if (step === 2) {
        setTimeout(() => document.getElementById('api-token').focus(), 100);
      }
    }

    async function verifyToken() {
      const token = document.getElementById('api-token').value.trim();
      const accountId = document.getElementById('account-id').value.trim();
      const zoneId = document.getElementById('zone-id').value.trim();
      const tunnelId = document.getElementById('tunnel-id').value.trim();
      const errorEl = document.getElementById('verify-error');
      const btn = document.getElementById('verify-btn');

      errorEl.style.display = 'none';

      if (!token) {
        errorEl.textContent = 'API Token is required.';
        errorEl.style.display = 'block';
        document.getElementById('api-token').classList.add('error');
        return;
      }

      document.getElementById('api-token').classList.remove('error');
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Verifying...';

      try {
        const res = await fetch('http://localhost:${port}/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, accountId, zoneId, tunnelId }),
        });

        const data = await res.json();

        if (data.success) {
          goToStep(3);
          document.getElementById('step-3').innerHTML = \`
            <div class="result-success">
              <div class="icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>Authentication Successful</h3>
              <p>Your Cloudflare credentials have been verified and saved.</p>
              <div class="result-detail">
                <div class="result-detail-row">
                  <span class="label">Token Status</span>
                  <span class="value" style="color: var(--success);">● Active</span>
                </div>
                \${data.accountName ? \`<div class="result-detail-row">
                  <span class="label">Account</span>
                  <span class="value">\${data.accountName}</span>
                </div>\` : ''}
                \${data.accountId ? \`<div class="result-detail-row">
                  <span class="label">Account ID</span>
                  <span class="value">\${data.accountId}</span>
                </div>\` : ''}
                <div class="result-detail-row">
                  <span class="label">Config Path</span>
                  <span class="value">\${data.configPath}</span>
                </div>
              </div>
            </div>
            <div class="separator"></div>
            <p style="text-align:center;font-size:0.8125rem;color:var(--muted-foreground);">
              You can close this tab and return to your terminal.
            </p>
          \`;
        } else {
          btn.disabled = false;
          btn.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verify & Save\`;
          errorEl.textContent = data.error || 'Token verification failed. Please check your token and try again.';
          errorEl.style.display = 'block';
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Verify & Save\`;
        errorEl.textContent = 'Connection error. Make sure certsmith CLI is still running.';
        errorEl.style.display = 'block';
      }
    }

    // Allow Enter key to submit on Step 2
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && currentStep === 2) {
        verifyToken();
      }
    });
  </script>
</body>
</html>`;
}
