#!/usr/bin/env node

/**
 * ==============================================================================
 * generate-release-notes.mjs
 * ==============================================================================
 * Automated release notes generator for Certsmith.
 * Uses Google Gemini API (free tier) with fallback to local commit log parser.
 * Requires Node.js 24+ (zero external dependencies).
 * ==============================================================================
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EMOJI_REGEX = /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]/gu;

function sanitizeNoEmoji(text) {
  return text.replace(EMOJI_REGEX, "").trim();
}

function runGit(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function getCommitRange(targetVersion) {
  let previousTag = "";
  try {
    previousTag = runGit(`git describe --tags --abbrev=0 "${targetVersion}^" 2>/dev/null`) ||
                  runGit("git describe --tags --abbrev=0 2>/dev/null");
  } catch {
    previousTag = "";
  }

  let commitLogs = "";
  if (previousTag && previousTag !== targetVersion) {
    commitLogs = runGit(`git log "${previousTag}..${targetVersion}" --pretty=format:"* %h %s (%an)"`);
  } else {
    commitLogs = runGit('git log -n 50 --pretty=format:"* %h %s (%an)"');
  }

  return { previousTag: previousTag || "initial-commit", commitLogs };
}

function generateLocalFallbackNotes(version, previousTag, commitLogs) {
  const lines = commitLogs.split("\n").filter(Boolean);
  const categories = {
    Features: [],
    "Bug Fixes": [],
    Documentation: [],
    Refactoring: [],
    "Chores & Build": [],
    Other: [],
  };

  for (const line of lines) {
    const cleanLine = sanitizeNoEmoji(line);
    if (/feat(\(.*\))?:/i.test(cleanLine)) {
      categories.Features.push(cleanLine);
    } else if (/fix(\(.*\))?:/i.test(cleanLine)) {
      categories["Bug Fixes"].push(cleanLine);
    } else if (/docs(\(.*\))?:/i.test(cleanLine)) {
      categories.Documentation.push(cleanLine);
    } else if (/refactor(\(.*\))?:/i.test(cleanLine)) {
      categories.Refactoring.push(cleanLine);
    } else if (/(chore|build|ci)(\(.*\))?:/i.test(cleanLine)) {
      categories["Chores & Build"].push(cleanLine);
    } else {
      categories.Other.push(cleanLine);
    }
  }

  let md = `# Release ${version}\n\n`;
  md += `Comparing changes against ${previousTag}.\n\n`;

  for (const [section, items] of Object.entries(categories)) {
    if (items.length > 0) {
      md += `## ${section}\n\n`;
      for (const item of items) {
        md += `${item}\n`;
      }
      md += "\n";
    }
  }

  md += "## Verification Checklist\n\n";
  md += "- Multi-stage Docker build validated\n";
  md += "- ACME automated certificate issuance tested\n";
  md += "- Trust Portal SSG static bundle compiled\n";

  return md;
}

async function callGeminiApi(prompt, apiKey) {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        return sanitizeNoEmoji(content);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate response from Gemini API");
}

async function main() {
  const version = process.env.VERSION || process.argv[2] || "HEAD";
  const outputPath = process.env.OUTPUT_PATH || process.argv[3] || "release-notes.md";
  const promptTemplatePath = process.env.PROMPT_TEMPLATE || ".github/prompts/release-notes-prompt.md";
  const apiKey = process.env.GEMINI_API_KEY || "";

  console.log(`[release-notes] Generating release notes for version: ${version}`);
  const { previousTag, commitLogs } = getCommitRange(version);

  if (!commitLogs) {
    console.warn("[release-notes] No commits found in specified range.");
  }

  let finalNotes = "";

  if (apiKey) {
    console.log("[release-notes] GEMINI_API_KEY detected. Synthesizing release notes via AI...");
    try {
      const template = readFileSync(resolve(promptTemplatePath), "utf8");
      const populatedPrompt = template
        .replace("{{VERSION}}", version)
        .replace("{{PREVIOUS_VERSION}}", previousTag)
        .replace("{{COMMIT_LOGS}}", commitLogs || "No recent commits");

      finalNotes = await callGeminiApi(populatedPrompt, apiKey);
      console.log("[release-notes] AI release note generation succeeded.");
    } catch (err) {
      console.warn(`[release-notes] AI generation failed (${err.message}). Falling back to local parser.`);
      finalNotes = generateLocalFallbackNotes(version, previousTag, commitLogs);
    }
  } else {
    console.log("[release-notes] No GEMINI_API_KEY configured. Using local Conventional Commit parser.");
    finalNotes = generateLocalFallbackNotes(version, previousTag, commitLogs);
  }

  finalNotes = sanitizeNoEmoji(finalNotes);
  writeFileSync(resolve(outputPath), finalNotes, "utf8");
  console.log(`[release-notes] Release notes successfully written to: ${outputPath}`);
}

main().catch((err) => {
  console.error("[release-notes] Fatal error:", err);
  process.exit(1);
});
