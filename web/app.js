// ==========================================
// Certsmith Trust Portal — app.js
// ==========================================
// Interactive tier selection and command generation.
// Copies Certbot/cURL commands per selected ACME tier.
// ==========================================

(function () {
    'use strict';

    // Auto-detect the base URL from the current page
    const BASE_URL = window.location.origin;

    // Tier metadata
    const TIERS = {
        cr1: { name: 'CR1', algo: 'RSA 4096-bit', keyType: 'rsa', keySize: 4096 },
        cr2: { name: 'CR2', algo: 'RSA 3072-bit', keyType: 'rsa', keySize: 3072 },
        cr3: { name: 'CR3', algo: 'RSA 2048-bit', keyType: 'rsa', keySize: 2048 },
        ce1: { name: 'CE1', algo: 'ECDSA P-384',  keyType: 'ecdsa', curve: 'secp384r1' },
        ce2: { name: 'CE2', algo: 'ECDSA P-256',  keyType: 'ecdsa', curve: 'secp256r1' },
        ce3: { name: 'CE3', algo: 'ECDSA P-521',  keyType: 'ecdsa', curve: 'secp521r1' },
    };

    let activeTier = null;

    // ------------------------------------------
    // Tier Selection
    // ------------------------------------------
    function selectTier(tierKey) {
        const tier = TIERS[tierKey];
        if (!tier) return;

        // Update active state on cards
        document.querySelectorAll('.tier-card').forEach(function (card) {
            card.classList.remove('active');
        });
        var activeCard = document.querySelector('[data-tier="' + tierKey + '"]');
        if (activeCard) {
            activeCard.classList.add('active');
        }

        activeTier = tierKey;

        // Build URLs and commands
        var acmeUrl = BASE_URL + '/' + tierKey + '/acme/' + tierKey + '/directory';
        var certbotCmd = buildCertbotCommand(tierKey, tier, acmeUrl);
        var curlCmd = 'curl -sk ' + acmeUrl + ' | python3 -m json.tool';

        // Update display
        document.getElementById('acme-url').textContent = acmeUrl;
        document.getElementById('certbot-cmd').textContent = certbotCmd;
        document.getElementById('curl-cmd').textContent = curlCmd;

        // Update section description
        var sectionDesc = document.querySelector('.command-panel .section-desc');
        if (sectionDesc) {
            sectionDesc.textContent = 'Commands for ' + tier.name + ' (' + tier.algo + ')';
        }
    }

    function buildCertbotCommand(tierKey, tier, acmeUrl) {
        var parts = [
            'certbot certonly',
            '--server ' + acmeUrl,
            '--standalone',
            '-d YOUR_DOMAIN',
            '--agree-tos',
            '--no-eff-email',
            '--email admin@example.com',
        ];

        if (tier.keyType === 'rsa') {
            parts.push('--key-type rsa');
            parts.push('--rsa-key-size ' + tier.keySize);
        } else if (tier.keyType === 'ecdsa') {
            parts.push('--key-type ecdsa');
            parts.push('--elliptic-curve ' + tier.curve);
        }

        return parts.join(' \\\n  ');
    }

    // ------------------------------------------
    // Clipboard Copy
    // ------------------------------------------
    function copyToClipboard(targetId, button) {
        var el = document.getElementById(targetId);
        if (!el) return;

        var text = el.textContent;
        if (!text || text === '—') return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showCopied(button);
            });
        } else {
            // Fallback for older browsers
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showCopied(button);
            } catch (err) {
                // silent fail
            }
            document.body.removeChild(textarea);
        }
    }

    function showCopied(button) {
        button.classList.add('copied');
        var originalHTML = button.innerHTML;
        button.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 12.5l-4-4 1.4-1.4L6.5 9.7l5.6-5.6 1.4 1.4-7 7z"/></svg>';

        setTimeout(function () {
            button.classList.remove('copied');
            button.innerHTML = originalHTML;
        }, 1500);
    }

    // ------------------------------------------
    // Event Listeners
    // ------------------------------------------
    function init() {
        // Tier card clicks
        document.querySelectorAll('.tier-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var tier = this.getAttribute('data-tier');
                selectTier(tier);
            });
        });

        // Copy buttons
        document.querySelectorAll('.btn-copy').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var targetId = this.getAttribute('data-target');
                copyToClipboard(targetId, this);
            });
        });

        // Health check on load
        checkHealth();
    }

    // ------------------------------------------
    // Health Check
    // ------------------------------------------
    function checkHealth() {
        var banner = document.getElementById('status-banner');
        if (!banner) return;

        fetch(BASE_URL + '/healthz')
            .then(function (response) {
                if (response.ok) {
                    banner.querySelector('span:last-child').textContent = 'All 6 certificate tiers operational';
                    banner.style.borderColor = 'rgba(110, 231, 183, 0.15)';
                } else {
                    banner.querySelector('span:last-child').textContent = 'Service degraded — check container logs';
                    banner.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                }
            })
            .catch(function () {
                banner.querySelector('span:last-child').textContent = 'Cannot reach backend — is the container running?';
                banner.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                var dot = banner.querySelector('.status-dot');
                if (dot) dot.style.background = '#ef4444';
            });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
