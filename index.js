#!/usr/bin/env node

// @ts-nocheck
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import minimist from "minimist";
import prompts from "prompts";
import {
  blue,
  cyan,
  green,
  lightRed,
  magenta,
  red,
  reset,
  yellow,
} from "kolorist";

const argv = minimist(process.argv.slice(2), { string: ["_"] });
const cwd = process.cwd();

const FRAMEWORKS = [
  {
    name: "mern",
    color: magenta,
  },
];

const TEMPLATES = FRAMEWORKS.map(
  (f) => (f.variants && f.variants.map((v) => v.name)) || [f.name]
).reduce((a, b) => a.concat(b), []);

const renameFiles = {
  _gitignore: ".gitignore",
};

const promptsConfig = [
  {
    type: "text",
    name: "projectName",
    message: reset("Enter the name of your project:"),
    initial: "panda-template",
  },
  
  {
    type: "text",
    name: "packageName",
    message: reset("Package name:"),
    initial: "panda-magic",
    validate: (dir) =>
      isValidPackageName(dir) || "Invalid package name",
  },
  {
    type: (_, { template }) =>
      TEMPLATES.includes(template) ? null : "select",
    name: "framework",
    message: reset("Select a framework:"),
    initial: 0,
    choices: FRAMEWORKS.map((framework) => {
      const frameworkColor = framework.color;
      return {
        title: frameworkColor(framework.name),
        value: framework,
      };
    }),
  },
  {
    type: (_, { framework }) =>
      framework && framework.variants ? "select" : null,
    name: "variant",
    message: reset("Select a variant:"),
    choices: (framework) =>
      framework.variants.map((variant) => {
        const variantColor = variant.color;
        return {
          title: variantColor(variant.name),
          value: variant.name,
        };
      }),
  },
  {
    type: "text",
    name: "description",
    message: reset("Description:"),
  },
  {
    type: "text",
    name: "author",
    message: reset("Author:"),
  },
];

async function init() {
  const result = await prompts(promptsConfig, {
    onCancel: () => {
      throw new Error(red("✖") + " Operation cancelled");
    },
  });

  const { framework, overwrite, packageName, variant, description, author } = result;

  const targetDir = formatTargetDir(result.projectName);
  const root = path.join(cwd, targetDir);

  if (overwrite) {
    emptyDir(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }

  const template = variant || framework || template || argv.t;

  console.log(`\nCreating a new project in directory: ${cyan(root)}...`);

  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    "..",
    `template-backend`
  );

  const write = (file, content) => {
    const targetPath = renameFiles[file]
      ? path.join(root, renameFiles[file])
      : path.join(root, file);
    if (content) {
      fs.writeFileSync(targetPath, content);
    } else {
      copy(path.join(templateDir, file), targetPath);
    }
  };

  const files = fs.readdirSync(templateDir);
  for (const file of files.filter((f) => f !== "package.json")) {
    write(file);
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, `package.json`), "utf-8")
  );

  pkg.name = packageName || targetDir;
  pkg.description = description; // Set the description
  pkg.author = author; // Set the author

  write("package.json", JSON.stringify(pkg, null, 2));

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
  const pkgManager = pkgInfo ? pkgInfo.name : "npm";

  console.log(lightRed(`\nDone. Now run the following commands:\n`));
  if (root !== cwd) {
    console.log(`  ${green("cd")} ${path.relative(cwd, root)}\n`);
  }
  switch (pkgManager) {
    case "yarn":
      console.log(green("  yarn"));
      console.log("    Install the dependencies 📔\n");
      console.log(green("  yarn prisma"));
      console.log("    Run Prisma migrations to set up your database schema 🏗️\n");
      console.log(green("  yarn dev"));
      console.log("    Start the development server 🛠️\n");
      console.log(green("  yarn build"));
      console.log("    Bundle the app for production 📦\n");
      console.log(green("  yarn start"));
      console.log("    Launch your application in production mode 🚀\n");    
      break;
    default:
      console.log(green(`  ${pkgManager} install`));
      console.log("    Install the dependencies 📔\n");
      console.log(green(`  ${pkgManager} run dev`));
      console.log("    Start the development server 🛠️ \n");
      console.log(green(`  ${pkgManager} prisma`));
      console.log("    Run Prisma migrations to set up your database schema 🏗️\n");
      console.log(green(`  ${pkgManager} run build`));
      console.log("  Bundles the app for production 📦\n");
      console.log(green(`  ${pkgManager} start`));
      console.log("    Launch your application in production mode 🚀\n");  
      console.log(cyan("  Happy Panda Coding 🐼⚡️"));

      break;
  }
  console.log();
}

/**
 * @param {string | undefined} targetDir
 */
function formatTargetDir(targetDir) {
  return targetDir?.trim().replace(/\/+$/g, "");
}

function copy(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * @param {string} projectName
 */
function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    projectName
  );
}

/**
 * @param {string} projectName
 */
function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z0-9-~]+/g, "-");
}

/**
 * @param {string} srcDir
 * @param {string} destDir
 */
function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

/**
 * @param {string} path
 */
function isEmpty(path) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

/**
 * @param {string} dir
 */
function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

/**
 * @param {string | undefined} userAgent process.env.npm_config_user_agent
 * @returns object | undefined
 */
function pkgFromUserAgent(userAgent) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(" ")[0];
  const pkgSpecArr = pkgSpec.split("/");
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

init().catch((e) => {
  console.error(e);
});