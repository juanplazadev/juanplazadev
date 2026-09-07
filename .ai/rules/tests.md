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

## The coverage gate is --min, not --exactly: parallel coverage is not reproducible
`composer test:unit` runs `pest --parallel --coverage --min=96`. It used to pin `--exactly=<n>` and had to be re-pinned on almost every change; worse, it flapped between 96.4 and 96.5 on CI and blocked deploys, because deploy-prod triggers on a successful `ci` run.

Measured, and it is not flakiness - it is two stable answers:

    serial, or --parallel --processes=1   96.5
    --parallel --processes=2 / 4 / 8 / 16 96.4

Identical under pcov and xdebug, 5 runs each. The whole 0.1 is one method: `SiteAnalytics::zoneDocument()` (a 16-line GraphQL heredoc). It reports covered in a single-process run and UNCOVERED whenever the suite splits across two or more workers. `rumDocument()` next to it never flaps because every analytics test calls it; `zoneDocument()` only runs in the few tests that configure a zone id, so it is covered by one worker and not the others, and the merge loses it.

The general rule that falls out: under `--parallel`, any line covered by only SOME workers can be dropped from the merged report, and which worker gets which file depends on how the suite splits. So the exact figure is not a property of the code - it moves as tests are added. Do not go back to `--exactly`, and do not chase a 0.1 by adding a test; check whether the line is one only a subset of workers reaches.

`--min=96` still fails a real regression (a genuine drop lands well below the floor). If the floor should rise, raise it deliberately rather than tracking the measured number.
