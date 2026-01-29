# Windows Build Patch

This directory contains patches applied automatically during `npm install` to fix Windows build issues.

## node-pty+1.1.0.patch

**Issue:** node-pty requires Spectre-mitigated libraries from Visual Studio, which are difficult to install correctly and often fail.

**Solution:** This patch disables Spectre mitigation in node-pty's build configuration for Windows. The patch is automatically applied by `patch-package` during postinstall.

**Security Note:** Spectre mitigation provides protection against certain CPU vulnerabilities. Disabling it for node-pty (the terminal emulation library) is a pragmatic trade-off to simplify the Windows build process. The risk is minimal for a development tool like this.

## How it works

1. `patch-package` is installed as a dev dependency
2. The postinstall script runs `patch-package` before rebuilding native modules
3. Changes to `node_modules/node-pty/binding.gyp` and `node_modules/node-pty/deps/winpty/src/winpty.gyp` are automatically applied

If you need to update the patch:
```powershell
# Make your changes to files in node_modules
npx patch-package node-pty
# Commit the updated patch file
```
