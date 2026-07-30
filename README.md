# Package Testr (PT)
[![Node.js CI](https://github.com/bananakitssu/pt/actions/workflows/node.js.yml/badge.svg)](https://github.com/bananakitssu/pt/actions/workflows/node.js.yml)

Test your NPM packages before publishing...

## How to use

Run into your project's root for NPM and install it:
```bash
npm @bananacool467/pt
```
It may create a command named `pt` if scripts is allowed or something like that.

Then literally just build the package:
```bash
pt build
```

Then link it. This will throw the package into NPM and install it's dependencies:
```bash
pt link
```
