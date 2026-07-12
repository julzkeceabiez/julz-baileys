"use strict";

const chalk = require("chalk");
const { execSync } = require("child_process");

function installModule(moduleName) {
  console.log(chalk.yellow(`[AutoInstall] Module ${moduleName} belum terinstall.`));
  console.log(chalk.cyan(`[AutoInstall] Menginstall ${moduleName}...`));
  execSync(`npm install ${moduleName}`, {
    stdio: "inherit",
    cwd: process.cwd()
  });
  console.log(chalk.green(`[AutoInstall] Berhasil install ${moduleName}`));
}

async function ensureModule(moduleName) {
  try {
    return await import(moduleName);
  } catch {
    try {
      installModule(moduleName);
      return await import(moduleName);
    } catch (err) {
      console.log(chalk.red(`[AutoInstall] Gagal install/load ${moduleName}: ${err.message}`));
      return null;
    }
  }
}

const clearConsole = () => {
  process.stdout.write(
    process.platform === "win32"
      ? "\x1B[2J\x1B[0f"
      : "\x1B[2J\x1B[3J\x1B[H"
  );
};

function stripAnsi(str = "") {
  return String(str).replace(/\x1B\[[0-9;]*m/g, "");
}

function centerText(text = "", width = process.stdout.columns || 80) {
  const plain = stripAnsi(text);
  const pad = Math.max(0, Math.floor((width - plain.length) / 2));
  return " ".repeat(pad) + text;
}

function makeBox(text, width = process.stdout.columns || 80, color = (s) => s) {
  const content = ` ${text} `;
  const maxBox = Math.min(Math.max(content.length + 2, 28), width - 4);
  const innerWidth = Math.max(content.length, maxBox - 2);

  const top = "╭" + "─".repeat(innerWidth) + "╮";
  const midText = content.length > innerWidth
    ? content.slice(0, innerWidth)
    : content + " ".repeat(innerWidth - content.length);
  const mid = "│" + midText + "│";
  const bot = "╰" + "─".repeat(innerWidth) + "╯";

  return [
    centerText(color(top), width),
    centerText(color(mid), width),
    centerText(color(bot), width)
  ].join("\n");
}

function colorLine(label, value, labelColor, valueColor) {
  return `${labelColor(label)} ${valueColor(value)}`;
}

async function showConsoleBanner() {
  clearConsole();

  const columns = process.stdout.columns || 80;

  const title = "Julz彡© ShadowBotz - Baileys X";
  const lines = [
    { label: "Recode by:", value: "JulzKece", l: chalk.redBright, v: chalk.hex("#ff7b7b") },
    { label: "WhatsApp :", value: "+6281547508744", l: chalk.cyanBright, v: chalk.whiteBright },
    { label: "Telegram :", value: "@JulzAXC", l: chalk.whiteBright, v: chalk.white },
    { label: "Instagram:", value: "@julzz_x_", l: chalk.whiteBright, v: chalk.white },
    { label: "Tiktok   :", value: "@mangjulz", l: chalk.whiteBright, v: chalk.white },
    { label: "Cari Panel Pterodactyl Murah Tapi Kualitas Premium?", value: "", l: chalk.yellowBright, v: chalk.yellowBright },
    { label: "https://wa.me/6281547508744?text=mau+order+panel+julz", value: "", l: chalk.cyanBright, v: chalk.cyanBright }
  ];

  const thankYou = "Thank you for using our Baileys guysッ";
  const signature = "JulzKece";

  // ASCII pengganti gambar
  const imageAscii = [
    "░█ █░█ █░ ▀█",
    "▄█ █▄█ █▄ █▄"
  ];

  try {
    const figlet = await ensureModule("figlet");

    // render ascii pengganti gambar
    console.log("");
    for (const line of imageAscii) {
      console.log(centerText(chalk.hex("#ff8ad8")(line), columns));
    }

    console.log("");

    // box title
    console.log(
      makeBox(
        `👾 ${title} ⚔️`,
        columns,
        chalk.hex("#d28cff")
      )
    );

    console.log("");

    // garis ungu
    console.log(centerText(chalk.hex("#b300ff")("━".repeat(Math.min(columns - 4, 52))), columns));
    console.log("");

    // info lines
    for (const row of lines) {
      if (!row.value) {
        console.log(centerText(row.l(row.label), columns));
      } else {
        console.log(centerText(colorLine(row.label, row.value, row.l, row.v), columns));
      }
    }

    console.log("");
    console.log(centerText(chalk.whiteBright(thankYou), columns));
    console.log("");

    // teks JulzKece gede tetap ada
    if (figlet) {
      try {
        const fig = figlet.default || figlet;
        const bigText = fig.textSync(signature, {
          font: "Small",
          horizontalLayout: "default",
          verticalLayout: "default",
          width: columns
        });

        const figLines = String(bigText).split("\n");
        for (const line of figLines) {
          if (!line.trim()) {
            console.log("");
            continue;
          }
          console.log(centerText(chalk.hex("#ff8ad8")(line), columns));
        }
      } catch {
        console.log(centerText(chalk.hex("#ff8ad8").bold(signature), columns));
      }
    } else {
      console.log(centerText(chalk.hex("#ff8ad8").bold(signature), columns));
    }

    console.log("");
  } catch (err) {
    console.log(chalk.red("Gagal render banner console:"), err.message);
    console.log("");
    console.log(centerText(chalk.hex("#d28cff").bold(title), columns));
    console.log(centerText(chalk.whiteBright(thankYou), columns));
    console.log(centerText(chalk.hex("#ff8ad8").bold(signature), columns));
    console.log("");
  }
}

showConsoleBanner();

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
}));

var __exportStar = (this && this.__exportStar) || function(m, exports) {
  for (var p in m) {
    if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) {
      __createBinding(exports, m, p);
    }
  }
};

var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};

Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWASocket = void 0;

const Socket_1 = __importDefault(require("./Socket"));
exports.makeWASocket = Socket_1.default;

__exportStar(require("../WAProto"), exports);
__exportStar(require("./Utils"), exports);
__exportStar(require("./Types"), exports);
__exportStar(require("./Store"), exports);
__exportStar(require("./Defaults"), exports);
__exportStar(require("./WABinary"), exports);
__exportStar(require("./WAM"), exports);
__exportStar(require("./WAUSync"), exports);

exports.default = Socket_1.default;
