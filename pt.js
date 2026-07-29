#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';
import { fileURLToPath } from 'url';
import { parsePatterns, isIgnored } from './glob-ignore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function __loadPackage () {
  const __resolved = path.resolve('package.json');
  if (!fs.existsSync(__resolved))
    return "No package";
  try {
    const rawData = fs.readFileSync(__resolved, 'utf8');
    const data = JSON.parse(rawData);
    return data;
  } catch (error) {
    console.error("Error reading file: ", error);
    return {};
  }
}

async function __pkgExists () {
  return ((await __loadPackage()) == "No package" ? false : true);
}

async function __generatePackageTestName () {
  const __name = (await __loadPackage()).name || "Unnamed";
  if (__name.startsWith("@")) {
    let __new = __name;
    __new = __new.replace("@", "&");
    __new = __new.replace("/", ":");
    __new = `pack${__new}`
    return __new;
  } else {
    let __new = `pack:${__name}`;
    return __new;
  }
}

async function __parseIgnore (name) {
  const __resolved = path.resolve('.npmignore');
  const __resolved2 = path.resolve('.gitignore');
  let __1 = true;
  let __2 = true;
  if (!fs.existsSync(__resolved))
    __1 = false;
  if (!fs.existsSync(__resolved2))
    __2 = false;
  if (!__1 && !__2)
    return [
      {
        'dI': false,
        'iD': true,
        'v': '.git'
      },
      {
        'dI': false,
        'iD': true,
        'v': name
      }
    ];
  const patterns = parsePatterns(fs.readFileSync(__1 ? __resolved : __resolved2, 'utf8'));
  patterns.push(...parsePatterns('.git\n' + name));
  return patterns;
}

async function build () {
  const __testName = await __generatePackageTestName();
  console.log(` [|] New testing folder: \`${__testName}\``);
  const __testPath = path.join(process.cwd(), __testName);
  fs.mkdirSync(__testPath, { recursive: true });
  const parsedIgnore = await __parseIgnore(__testName);
  const patterns = parsedIgnore;
  let files = 0;
  //let dirs = 0;
  for (const item of patterns) {
    files++;
  }
  const s = files == 1 ? "item" : "items";
  //const s2 = dirs == 1 ? "directory" : "directories";
  console.log(` [|] Ignoring ${files} ${s}`); // and ${dirs} ${s2}`);
  const pkg = await __loadPackage();
  const prepublishOnly = pkg.scripts?.prepublishOnly;
  const prepare = pkg.scripts?.prepare;
  const script = prepublishOnly ? prepublishOnly : (prepare ? prepare : null);
  if (script) {
    console.log(` [|] Running script for \`prepublishOnly\`/\`prepare\` before copying files...`);
    try {
      const stdout = child_process.execSync(script, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
      if (stdout && stdout.trim()) {
        const __stdout = stdout.trim().split("\n");
        for (const __stdout_item of __stdout)
          console.log(`     [i] ${__stdout_item.trim()}`);
      }
    } catch (error) {
      const errMessage = error.stderr ? error.stderr.trim() : error.message;
      throw new Error(`   [X] Failed to run script. Got: \n${errMessage}\n Stopping...`);
    }
  }
  const __files = fs.readdirSync('.', { recursive: true });
  const ignoredDirs = [];
  let i = 0;
  if (fs.existsSync(__testPath)) {
    fs.rmSync(__testPath, { recursive: true, force: true });
    console.log(" [-] Deleted cached package");
  }
  console.log(" [|] Copying...");
  for (const file of __files) {
    const posixFile = file.split(path.sep).join('/');

    if (ignoredDirs.some(dir => posixFile.startsWith(dir + '/'))) continue;

    if (isIgnored(posixFile, patterns)) {
      const full = path.join(process.cwd(), file);
      let isDir = false;
      try { isDir = fs.statSync(full).isDirectory(); } catch {}
      if (isDir) ignoredDirs.push(posixFile);
      continue;
    }

    fs.cpSync(file, path.join(__testPath, file), { recursive: true });
    console.log("     [|] " + file);
    i++;
  }
  console.log(` [+] Successfully built package! Copied ${i} files.`);
}

async function main () {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!(await __pkgExists()))
    throw new Error("The package.json was not found. Try moving to the root directory of your project or run: npm init -y");
  if (command)
    console.log(" [|] Checking for `package.json...`");
  if (command == "build") {
    build().catch(err => {
      console.error(" [X] Build failed, error:");
      const lines = err.message ? err.message.split('\n') : err.split('\n');
      for (const line of lines) {
        console.error("     " + line);
      }
      process.exit(1);
    });
  }
  if (!command)
    console.log("Usage:\n  build - Builds the NPM package");
}

main();
