#!/usr/bin/env node

/**
 * ==============================================================================
 * generate-release-notes.mjs
 * ==============================================================================
 * Automated release notes generator for Certsmith.
 * Uses Google Gemini API to synthesize human-readable release notes.
 * Appends an exhaustive, hyperlinked ## Full Changelog section at the bottom.
 * Ignores pre-release / staged tags so formal releases capture full history.
 * Requires Node.js 24+ (zero external dependencies).
 * ==============================================================================
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EMOJI_REGEX = /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]/gu;

function sanitizeNoEmoji(text) {
  return text.replace(EMOJI_REGEX, "").trim();
}

function loadEnvIfPresent() {
  if (process.env.GEMINI_API_KEY) return;
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, "utf8");
      const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
      if (match) {
        process.env.GEMINI_API_KEY = match[1].trim().replace(/^["']|["']$/g, "");
      }
    } catch {
      // Ignore reading error
    }
  }
}

function runGit(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function getRepoUrl() {
  const remoteUrl = runGit("git remote get-url origin") || "https://github.com/certsmith/certsmith.git";
  return remoteUrl
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "");
}

function getPreviousFormalTag(currentTag) {
  const tagsOutput = runGit("git tag --sort=-creatordate");
  if (!tagsOutput) return null;

  const tags = tagsOutput.split("\n").map((t) => t.trim()).filter(Boolean);

  // Filter out the current tag, staged tags, and non-formal prereleases
  const formalTags = tags.filter((tag) => {
    if (tag === currentTag) return false;
    if (/-staged|-rc|-alpha|-beta|-dev/i.test(tag)) return false;
    return /^v?\d+\.\d+\.\d+$/.test(tag);
  });

  return formalTags.length > 0 ? formalTags[0] : null;
}

function getCommitRange(targetVersion) {
  const previousFormalTag = getPreviousFormalTag(targetVersion);
  let commitLogs = "";

  // Check if targetVersion exists as a git ref; if not, fall back to HEAD
  const hasRef = runGit(`git rev-parse --verify "${targetVersion}^{commit}" 2>/dev/null`);
  const targetRef = hasRef ? targetVersion : "HEAD";

  if (previousFormalTag) {
    commitLogs = runGit(`git log "${previousFormalTag}..${targetRef}" --pretty=format:"%h|%s|%an"`);
  } else {
    // Initial release: capture entire history from root commit
    commitLogs = runGit(`git log "${targetRef}" --pretty=format:"%h|%s|%an"`);
  }

  return { previousTag: previousFormalTag, commitLogs };
}

function formatFullChangelog(commitLogs, repoUrl) {
  if (!commitLogs) return "";

  const lines = commitLogs.split("\n").filter(Boolean);
  const formatted = lines.map((line) => {
    const parts = line.split("|");
    const hash = parts[0] ? parts[0].trim() : "";
    const subject = parts[1] ? parts[1].trim() : "";
    const cleanSubject = sanitizeNoEmoji(subject);
    return `- [\`${hash}\`](${repoUrl}/commit/${hash}): ${cleanSubject}`;
  });

  return formatted.join("\n");
}

function generateLocalFallbackHumanNotes(version, previousTag) {
  let md = `# Certsmith Release ${version}\n\n`;
  if (previousTag) {
    md += `This release introduces incremental capabilities, performance optimizations, and stability improvements since ${previousTag}.\n\n`;
  } else {
    md += `This is the initial formal production release of Certsmith, introducing an all-in-one private Certificate Authority appliance and Trust Portal.\n\n`;
  }

  md += `### Highlights\n\n`;
  md += `- Hardened 6-tier PKI hierarchy featuring offline Root CA G1 and six intermediate issuing authorities (CR1-CR3 RSA, CE1-CE3 ECDSA).\n`;
  md += `- Automated certificate issuance via step-ca ACME v2 daemons with RFC 8555 compatibility.\n`;
  md += `- Dual TLS certificate termination on Nginx supporting simultaneous RSA and ECDSA cipher suites.\n`;
  md += `- Pre-rendered React Router 8 Static Site Generation (SSG) Trust Portal with zero runtime Node.js overhead in production.\n`;
  md += `- Comprehensive client installation guides for Certbot, Lego, Caddy, Traefik, and acme.sh.\n\n`;

  return md;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiApi(prompt, apiKey) {
  const candidateModels = [
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
  ];
  const maxRetriesPerModel = 3;
  let lastError = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[release-notes] Model ${model} (attempt ${attempt}/${maxRetriesPerModel})...`);
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2500,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[release-notes] ${model} attempt ${attempt} returned HTTP ${response.status}.`);
          lastError = new Error(`API HTTP ${response.status} (${model}): ${errorText}`);

          if (attempt < maxRetriesPerModel) {
            console.log(`[release-notes] Retrying ${model} in ${attempt * 1000}ms...`);
            await delay(attempt * 1000);
            continue;
          } else {
            console.warn(`[release-notes] All ${maxRetriesPerModel} attempts failed for ${model}. Moving to next model...`);
            break;
          }
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          console.log(`[release-notes] Successfully generated release notes with ${model}.`);
          return sanitizeNoEmoji(content);
        }
      } catch (err) {
        console.warn(`[release-notes] ${model} attempt ${attempt} network error (${err.message}).`);
        lastError = err;
        if (attempt < maxRetriesPerModel) {
          await delay(attempt * 1000);
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate response from all candidate Gemini models");
}

async function main() {
  loadEnvIfPresent();

  const version = process.env.VERSION || process.argv[2] || "HEAD";
  const outputPath = process.env.OUTPUT_PATH || process.argv[3] || "release-notes.md";
  const promptTemplatePath = process.env.PROMPT_TEMPLATE || ".github/prompts/release-notes-prompt.md";
  const apiKey = process.env.GEMINI_API_KEY || "";
  const repoUrl = getRepoUrl();

  console.log(`[release-notes] Target Version: ${version}`);
  console.log(`[release-notes] Repository Base URL: ${repoUrl}`);

  const { previousTag, commitLogs } = getCommitRange(version);
  const baselineDescription = previousTag ? `previous formal release: ${previousTag}` : "initial repository commit (full history)";
  console.log(`[release-notes] Calculated baseline: ${baselineDescription}`);

  // Raw commit messages for AI evaluation (no hashes to prevent AI from dumping commit lists)
  const commitMessagesForAi = commitLogs
    .split("\n")
    .map((l) => {
      const parts = l.split("|");
      return parts[1] ? `- ${sanitizeNoEmoji(parts[1])}` : "";
    })
    .filter(Boolean)
    .join("\n");

  const formattedFullChangelog = formatFullChangelog(commitLogs, repoUrl);
  let humanSummary = "";

  if (apiKey) {
    console.log("[release-notes] GEMINI_API_KEY detected. Synthesizing human-readable release notes via AI...");
    try {
      const template = readFileSync(resolve(promptTemplatePath), "utf8");
      const populatedPrompt = template
        .replace("{{COMMIT_LOG}}", commitMessagesForAi || "Initial release commit")
        .replace("{{VERSION}}", version);

      humanSummary = await callGeminiApi(populatedPrompt, apiKey);
      console.log("[release-notes] AI release note generation succeeded.");
    } catch (err) {
      console.warn(`[release-notes] AI generation failed (${err.message}). Using local human summary fallback.`);
      humanSummary = generateLocalFallbackHumanNotes(version, previousTag);
    }
  } else {
    console.log("[release-notes] No GEMINI_API_KEY configured. Using local human summary fallback.");
    humanSummary = generateLocalFallbackHumanNotes(version, previousTag);
  }

  // Ensure zero emojis in narrative body
  humanSummary = sanitizeNoEmoji(humanSummary);

  // Combine human narrative body with the exhaustive hyperlinked Full Changelog section
  const finalReleaseNotes = `${humanSummary}\n\n## Full Changelog\n\n${formattedFullChangelog}\n`;

  writeFileSync(resolve(outputPath), finalReleaseNotes, "utf8");
  console.log(`[release-notes] Release notes successfully written to: ${outputPath}`);
}

main().catch((err) => {
  console.error("[release-notes] Fatal error:", err);
  process.exit(1);
});
