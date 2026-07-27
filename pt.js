#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';
import { fileURLToPath } from 'url';

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
    console.error("Error reading file:", error);
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
    let __new = `pack${__name}`;
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
  try {
    const rawData = fs.readFileSync(__1 ? __resolved : __resolved2, 'utf8');
    const data = rawData.split("\n");
    let filteredData = [];
    for (const ignored of data) {
      if (ignored == '')
        continue;
      filteredData.push(ignored);
    }
    let parsed = [
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
    for (const item of filteredData) {
      let __dontIgnore = false;
      let __isDir = false;
      if (item.startsWith("!"))
        __dontIgnore = true;
      let __ = item.replace("!", "");
      let __resolved3 = path.resolve(__);
      if (fs.existsSync(__resolved3)) {
        const stats = fs.statSync(__resolved3);
        __isDir = stats.isDirectory();
      }
      parsed.push({
        "dI": __dontIgnore,
        "iD": __isDir,
        "v": __
      })
    }
    return parsed;
  } catch (error) {
    console.error("Error reading file:", error);
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
  }
}

async function build () {
  const __testName = await __generatePackageTestName();
  console.log(` [|] New testing folder: \`${__testName}\``);
  const __testPath = path.join(__dirname, __testName);
  fs.mkdirSync(__testPath, { recursive: true });
  const parsedIgnore = await __parseIgnore(__testName);
  let files = 0;
  let dirs = 0;
  for (const item of parsedIgnore) {
    if (item.iD && !item.dI) {
      dirs++;
    } else if (!item.iD && !item.dI) {
      files++;
    }
  }
  const s = files == 1 ? "file" : "files";
  const s2 = dirs == 1 ? "directory" : "directories";
  console.log(` [|] Ignoring ${files} ${s} and ${dirs} ${s2}`);
  const pkg = await __loadPackage();
  const prepublishOnly = pkg.scripts.prepublishOnly;
  const prepare = pkg.scripts.prepare;
  const script = prepublishOnly ? prepublishOnly : (prepare ? prepare : null);
  if (script) {
    console.log(` [|] Running \`${script}\` before copying files...`);
    child_process.exec(script, (error, stdout, stderr) => {
      if (error || stderr) {
        const err = error ? error : (stderr ? stderr : "an unknown error");
        throw new Error(`   [X] Failed to run script. Got: \n${err}\n Stopping...`);
      }
      console.log(`     [i] ${stdout.trim()}`);
    });
  }
  const __files = fs.readdirSync('.', { recursive: true });
  for (const file of __files) {
    let skip = false;
    for (const item of parsedIgnore) {
      if (item.iD && !item.dI) {
        if (file.startsWith(item.v)) {
          skip = true;
        }
      } else if (!item.iD && !item.dI) {
        if (file == item.v) {
          skip = true;
        }
      }
    }
    if (skip) {
      continue;
    } else {
      fs.cpSync(file, path.join(__testPath, file), { recursive: true/*, filter: (src) => { return !src.includes('.git') && !src.includes(__testName); }*/ });
    }
  }
}

async function main () {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!(await __pkgExists()))
    throw new Error("The package.json was not found. Try moving to the root directory of your project or run: npm init -y");
  if (command)
    console.log(" [|] Checking for `package.json...`");
  if (command == "build")
    build();
  if (!command)
    console.log("Usage:\n  build - Builds the NPM package");
}

main();
