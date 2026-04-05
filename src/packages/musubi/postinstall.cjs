// postinstall bootstrap — CJS wrapper that never fails npm install.
// Only activates when MUSUBIX_AUTO_INIT=1.
try {
  if (process.env.MUSUBIX_AUTO_INIT === '1') {
    import('./dist/interface/cli/postinstall-bootstrap.js').catch(function () {});
  }
} catch (_) {
  // best-effort — never block npm install
}
