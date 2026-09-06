---
paths:
  - 'tests/**'
---

# Tests

## TIA is on, but --testsuite and --filter silently disable it
tests/Pest.php sets `pest()->tia()->locally()`. Test impact analysis records a dependency graph to ~/.pest/tia/<project-key>/graph.json (NOT tests/.pest, which is sharding) and replays unaffected tests: a full run is ~24s, a replay ~0.4s.

Two things turn it off with no error, which is why it can look broken:

1. Any partial-selection flag. Pest's PARTIAL_SELECTION_FLAGS (Plugins/Tia.php:135) includes --testsuite, --filter, --group, --dirty and others; passing one sets $disabled and TIA never records. So `pest --testsuite=Browser` gets no TIA, and neither do the composer scripts, which all pin a testsuite. TIA is for the bare local `vendor/bin/pest` run - that is the intended split, since composer test is the full gate.
2. No coverage driver. TIA needs ext-pcov or Xdebug and prints "TIA is skipped as it needs ext-pcov or Xdebug".

`->locally()` also skips TIA on CI by design - a pipeline must run the full suite against a clean checkout. Never pass --tia in .github/workflows.

Verified TIA does not produce false greens: breaking HomeController resolved to "7 affected test files (from 1 changed file)" and failed all three tests that should have failed.
