# Installing the Certsmith Root CA

After downloading the Root CA certificate from the Trust Portal, install it on each device or operating system that needs to trust certificates issued by Certsmith.

---

## Download Root CA Certificate

You can download the Root CA directly from this server using your browser or terminal:

```bash
# Download using curl
curl -fsSL -o root_ca.crt {{ROOT_CA_URL}}

# Or using wget
wget -O root_ca.crt {{ROOT_CA_URL}}
```

---

## Windows

### Windows 10 / 11 — GUI

1. Double-click the downloaded `root_ca.crt` file.
2. Click **Install Certificate…**
3. Select **Local Machine** → Next.
4. Choose **Place all certificates in the following store** → Browse → **Trusted Root Certification Authorities** → OK → Next → Finish.
5. Confirm the security prompt.

### Windows — PowerShell (Admin)

```powershell
Import-Certificate -FilePath .\root_ca.crt -CertStoreLocation Cert:\LocalMachine\Root
```

### Windows — Command Prompt (Admin)

```bash
certutil -addstore -f "ROOT" root_ca.crt
```

### Windows Server

The same PowerShell and certutil commands apply. For domain-wide deployment, push the certificate via **Group Policy**:

1. Open **Group Policy Management** → edit the target GPO.
2. Navigate to **Computer Configuration → Policies → Windows Settings → Security Settings → Public Key Policies → Trusted Root Certification Authorities**.
3. Right-click → Import → select `root_ca.crt`.

---

## macOS

### macOS — GUI (Keychain Access)

1. Open **Keychain Access** (Spotlight → search "Keychain Access").
2. Drag `root_ca.crt` into the **System** keychain (or use File → Import Items).
3. Double-click the imported certificate.
4. Expand **Trust** → set **When using this certificate** to **Always Trust**.
5. Close and authenticate.

### macOS — Terminal

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain root_ca.crt
```

---

## iOS / iPadOS

1. Download `root_ca.crt` in Safari by navigating to `{{ROOT_CA_URL}}`.
2. Tap the file → **Profile Downloaded** notification appears.
3. Go to **Settings → General → VPN & Device Management** → tap the Certsmith profile → **Install** → enter your passcode → **Install**.
4. Go to **Settings → General → About → Certificate Trust Settings**.
5. Toggle **Enable Full Trust For Root Certificates** for the Certsmith Root CA.

---

## Android

### Android 11+ / 14+

1. Go to **Settings → Security & Privacy → More Security Settings → Encryption & Credentials → Install a Certificate → CA Certificate**.
2. Acknowledge the warning → select the downloaded `root_ca.crt` file.
3. The certificate is installed as a **User CA** (apps using the default network security config will trust it).

### System-Level Trust (Rooted Devices / Emulators)

For system-wide trust (e.g., development on AVD emulators):

```bash
# Convert PEM to Android hash format
HASH=$(openssl x509 -inform PEM -subject_hash_old -in root_ca.crt | head -1)
cp root_ca.crt "${HASH}.0"

# Push to system CA store (requires root)
adb root
adb remount
adb push "${HASH}.0" /system/etc/security/cacerts/
adb shell chmod 644 /system/etc/security/cacerts/"${HASH}.0"
adb reboot
```

---

## Linux

### Debian / Ubuntu

```bash
sudo cp root_ca.crt /usr/local/share/ca-certificates/certsmith-root.crt
sudo update-ca-certificates
```

### RHEL / CentOS / Fedora / Rocky Linux / AlmaLinux

```bash
sudo cp root_ca.crt /etc/pki/ca-trust/source/anchors/certsmith-root.crt
sudo update-ca-trust extract
```

### Arch Linux / Manjaro

```bash
sudo cp root_ca.crt /etc/ca-certificates/trust-source/anchors/certsmith-root.crt
sudo trust extract-compat
```

### Alpine Linux

```bash
sudo cp root_ca.crt /usr/local/share/ca-certificates/certsmith-root.crt
sudo update-ca-certificates
```

### openSUSE / SLES

```bash
sudo cp root_ca.crt /etc/pki/trust/anchors/certsmith-root.crt
sudo update-ca-certificates
```

---

## Browser-Specific Trust

Most browsers use the system trust store. Notable exceptions:

- **Firefox**: Uses its own certificate store. Go to **Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import** and select `root_ca.crt`.
- **Chromium-based browsers** (Chrome, Edge, Brave): Use the OS trust store on Windows/macOS/Linux. On Linux, you may also need: `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Certsmith Root CA" -i root_ca.crt`.

---

## Verification

After installing, verify the root CA is trusted:

```bash
# OpenSSL
openssl verify -CAfile root_ca.crt /path/to/issued-cert.crt

# cURL (should succeed without -k flag)
curl https://your-domain.example.com

# Step CLI
step certificate verify /path/to/issued-cert.crt --roots root_ca.crt
```
