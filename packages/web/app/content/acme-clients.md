# ACME Client Configuration Guide

Certsmith provides automated TLS certificate issuance and renewal via the standard ACME v2 protocol across 6 specialized certificate authority tiers. This guide details how to configure popular ACME clients and web servers to issue certificates through Certsmith.

---

## All 6 ACME Directory Endpoints

Certsmith operates 6 independent intermediate authority tiers. Select the ACME directory endpoint that matches your security and cryptographic requirements:

### Elliptic Curve Cryptography (ECC) Family

| Tier | Algorithm & Curve | ACME Directory URL | Recommended Use Case |
| :--- | :--- | :--- | :--- |
| **CE2** *(Default)* | ECDSA P-256 (`secp256r1`) | `{{ACME_URL_CE2}}` | Modern default, fast handshakes, low CPU overhead |
| **CE1** | ECDSA P-384 (`secp384r1`) | `{{ACME_URL_CE1}}` | High assurance enterprise systems |
| **CE3** | ECDSA P-521 (`secp521r1`) | `{{ACME_URL_CE3}}` | Ultra high security & long-term cryptographic resistance |

### Rivest–Shamir–Adleman (RSA) Family

| Tier | Algorithm & Key Size | ACME Directory URL | Recommended Use Case |
| :--- | :--- | :--- | :--- |
| **CR3** *(Legacy)* | RSA 2048-bit | `{{ACME_URL_CR3}}` | Maximum compatibility with legacy hardware & legacy OS |
| **CR2** | RSA 3072-bit | `{{ACME_URL_CR2}}` | Enterprise standard RSA (equivalent to 128-bit security) |
| **CR1** | RSA 4096-bit | `{{ACME_URL_CR1}}` | Maximum RSA security & archival certification |

> [!IMPORTANT]
> Ensure the **Certsmith Root CA** is installed in your system's trust store (or specified in your ACME client's options) so the client can verify the CA endpoint securely. You can download it directly from `{{ROOT_CA_URL}}`.

---

## 1. Certbot

[Certbot](https://certbot.eff.org/) is the official EFF client for automated TLS issuance.

### Modern Default (ECDSA P-256 via CE2)

To issue a modern ECDSA certificate using standalone HTTP validation:

```bash
sudo certbot certonly \
  --standalone \
  --server {{ACME_URL_CE2}} \
  --key-type ecdsa \
  --elliptic-curve secp256r1 \
  -d app.internal \
  -d *.app.internal
```

### Legacy RSA Compatible (RSA 2048-bit via CR3)

For legacy devices or older software requiring RSA:

```bash
sudo certbot certonly \
  --standalone \
  --server {{ACME_URL_CR3}} \
  --key-type rsa \
  --rsa-key-size 2048 \
  -d legacy.internal
```

### Passing a Custom Root CA File

If Certsmith Root CA is not yet installed in your system trust store, pass the CA bundle:

```bash
REQUESTS_CA_BUNDLE=/etc/ssl/certs/root_ca.crt \
sudo -E certbot certonly \
  --standalone \
  --server {{ACME_URL_CE2}} \
  -d app.internal
```

### NGINX Integration

Automatically configure NGINX virtual hosts:

```bash
sudo certbot --nginx \
  --server {{ACME_URL_CE2}} \
  -d service.internal \
  --agree-tos \
  -m admin@internal
```

### Apache Integration

```bash
sudo certbot --apache \
  --server {{ACME_URL_CE2}} \
  -d intranet.internal
```

### Automatic Renewal Test

```bash
sudo certbot renew --dry-run
```

---

## 2. acme.sh

[acme.sh](https://github.com/acmesh-official/acme.sh) is a pure Unix shell script implementing the ACME protocol with zero external dependencies.

### Installation

```bash
curl https://get.acme.sh | sh -s email=admin@internal
source ~/.bashrc
```

### Issue with Standalone Mode (ECDSA via CE2)

```bash
acme.sh --issue \
  -d myapp.internal \
  --standalone \
  --server {{ACME_URL_CE2}} \
  --keylength ec-256 \
  --ca-bundle /path/to/root_ca.crt
```

### Issue with RSA 2048-bit (via CR3)

```bash
acme.sh --issue \
  -d myapp.internal \
  --standalone \
  --server {{ACME_URL_CR3}} \
  --keylength 2048
```

### Issue with Webroot

```bash
acme.sh --issue \
  -d web.internal \
  --webroot /var/www/html \
  --server {{ACME_URL_CE2}}
```

### Install Certificate into Service Directory

```bash
acme.sh --install-cert -d myapp.internal \
  --key-file       /etc/ssl/private/myapp.key \
  --fullchain-file /etc/ssl/certs/myapp.fullchain.cer \
  --reloadcmd      "systemctl reload nginx"
```

---

## 3. Caddy Server

[Caddy](https://caddyserver.com/) natively manages HTTPS certificates automatically with zero external plugins.

### Caddyfile Configuration

Point Caddy's global `acme_ca` directive to Certsmith:

```caddy
{
    # Global options
    acme_ca {{ACME_URL_CE2}}
    acme_ca_root /etc/ssl/certs/root_ca.crt
    email admin@internal
}

# Site configuration
app.internal {
    reverse_proxy localhost:3000
}

api.internal {
    reverse_proxy localhost:8080
}
```

### Per-Site ACME CA (e.g. RSA compatibility on specific host)

```caddy
legacy.example.com {
    tls {
        ca {{ACME_URL_CR3}}
        ca_root /etc/ssl/certs/root_ca.crt
        key_type rsa2048
    }
    reverse_proxy localhost:4000
}
```

---

## 4. Traefik (v2 & v3)

[Traefik Proxy](https://traefik.io/) provides built-in ACME certificate resolvers.

### Static Configuration (`traefik.yml`)

```yaml
certificatesResolvers:
  certsmith:
    acme:
      email: admin@internal
      storage: /etc/traefik/acme.json
      caServer: {{ACME_URL_CE2}}
      certificatesDuration: 2160
      httpChallenge:
        entryPoint: web

serversTransport:
  rootCAs:
    - /etc/traefik/root_ca.crt
```

### Dynamic Docker Compose Labels

```yaml
services:
  whoami:
    image: traefik/whoami
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.whoami.rule=Host(`whoami.internal`)"
      - "traefik.http.routers.whoami.entrypoints=websecure"
      - "traefik.http.routers.whoami.tls.certresolver=certsmith"
```

---

## 5. Lego (Go CLI & Library)

[Lego](https://github.com/go-acme/lego) is a versatile ACME client written in Go supporting over 100 DNS providers.

### Standalone HTTP-01 Challenge

```bash
lego --email admin@internal \
  --server {{ACME_URL_CE2}} \
  --domains app.internal \
  --key-type ec256 \
  --http \
  run
```

### DNS Challenge with Custom Root CA

```bash
lego --email admin@internal \
  --server {{ACME_URL_CE2}} \
  --ca-certificates /path/to/root_ca.crt \
  --dns rfc2136 \
  --domains *.internal \
  run
```

---

## 6. Smallstep CLI (`step`)

Because Certsmith is powered by `step-ca`, you can also use Smallstep's official `step` CLI:

### Bootstrap Step Environment

```bash
step ca bootstrap \
  --ca-url {{CA_ORIGIN}} \
  --fingerprint <ROOT_CA_FINGERPRINT>
```

### Issue a Certificate

```bash
step ca certificate service.internal \
  service.crt \
  service.key \
  --ca-url {{CA_ORIGIN}}
```

---

## Testing & Verification

Once your certificate is issued and bound to your service, verify the TLS handshake and trust chain:

```bash
# Verify using OpenSSL s_client
openssl s_client -connect app.internal:443 -CAfile /path/to/root_ca.crt

# Test ACME directory health via curl
curl -sk {{ACME_URL_CE2}} | python3 -m json.tool
```
