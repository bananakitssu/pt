import * as fs from 'node:fs';
import * as path from 'node:path';

async function __loadPackage () {
  const __resolved = path.resolve('package.json');
  if (!fs.existsSync(__resolved)) {
    return "No package";
  }
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

async function main () {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!(await __pkgExists()))
    throw new Error("The package.json was not found. Try moving to the root directory of your project or run: npm init -y");
  console.log(await __generatePackageTestName());
}

main();
