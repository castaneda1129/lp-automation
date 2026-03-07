const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_FILE = path.join(__dirname, '../data/revision-tokens.json');

function loadTokens() {
  if (!fs.existsSync(TOKEN_FILE)) {
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, '{}');
  }
  return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

/**
 * 修正トークンを発行する
 * @param {string} slug - LPのslug
 * @param {string} deployUrl - LP URL
 * @param {string} clientEmail - クライアントメール
 * @returns {string} トークン
 */
function createToken(slug, deployUrl, clientEmail) {
  const token = crypto.randomBytes(16).toString('hex');
  const tokens = loadTokens();
  tokens[token] = {
    slug,
    deployUrl,
    clientEmail,
    used: false,
    createdAt: new Date().toISOString(),
  };
  saveTokens(tokens);
  return token;
}

/**
 * トークンを検証する
 * @param {string} token
 * @returns {object|null} トークン情報（無効・使用済みはnull）
 */
function getToken(token) {
  const tokens = loadTokens();
  const info = tokens[token];
  if (!info) return null;
  if (info.used) return { ...info, expired: true };
  return info;
}

/**
 * トークンを使用済みにする
 */
function markTokenUsed(token) {
  const tokens = loadTokens();
  if (tokens[token]) {
    tokens[token].used = true;
    tokens[token].usedAt = new Date().toISOString();
    saveTokens(tokens);
  }
}

module.exports = { createToken, getToken, markTokenUsed };
