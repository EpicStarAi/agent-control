import "dotenv/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: false });

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const webAppUrl = process.env.TELEGRAM_WEBAPP_URL || "https://epic-gram.com/client";
const menuText = process.env.TELEGRAM_BOT_MENU_TEXT || "EPIC☠GRAM";

function redact(value) {
  if (!value) return "";
  return value.replace(/[0-9]{6,}:[A-Za-z0-9_-]{20,}/g, "[REDACTED_TELEGRAM_BOT_TOKEN]");
}

function fail(message) {
  console.error(redact(message));
  process.exitCode = 1;
}

function assertConfig() {
  if (!token || token.includes("replace-with")) {
    fail("TELEGRAM_BOT_TOKEN is missing. Put the rotated BotFather token into .env.local.");
    return false;
  }

  let parsed;
  try {
    parsed = new URL(webAppUrl);
  } catch {
    fail(`TELEGRAM_WEBAPP_URL is invalid: ${webAppUrl}`);
    return false;
  }

  if (parsed.protocol !== "https:") {
    fail(`Telegram Mini App URL must be HTTPS: ${webAppUrl}`);
    return false;
  }

  if (!menuText.trim()) {
    fail("TELEGRAM_BOT_MENU_TEXT is empty.");
    return false;
  }

  return true;
}

async function botApi(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(`${method} failed: ${data?.description || response.status}`);
  }
  return data.result;
}

async function main() {
  if (!assertConfig()) return;

  const me = await botApi("getMe");
  await botApi("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: menuText,
      web_app: { url: webAppUrl },
    },
  });
  await botApi("setMyCommands", {
    commands: [
      { command: "start", description: "Открыть EPICGRAM AI" },
      { command: "client", description: "Запустить Telegram client shell" },
    ],
  });
  await botApi("setMyShortDescription", {
    short_description: "EPIC☠GRAM AI client shell and operator workspace.",
  });
  await botApi("setMyDescription", {
    description:
      "EPIC☠GRAM AI открывает законный Telegram-style клиент и AI operator workspace через Mini App.",
  });

  console.log(`Bot @${me.username || me.first_name} configured.`);
  console.log(`Mini App: ${webAppUrl}`);
  console.log(`Menu: ${menuText}`);
}

main().catch((error) => fail(error?.message || String(error)));
