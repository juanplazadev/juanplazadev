<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Browser');

/*
 * Test impact analysis re-runs only the tests a change actually touches and
 * replays the rest from cache. locally() rather than always(): on CI the whole
 * point is a full run against a clean checkout, and `--ci` turns this off.
 */
pest()->tia()->locally();

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', fn () => $this->toBe(1));

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/*
 * Vendor fixtures shared by more than one feature test.
 *
 * Required here rather than declared in a test file: a test file's functions
 * are only loaded when that file is, so a helper borrowed from a sibling works
 * for a full-suite run and vanishes the moment someone passes --filter.
 */
require_once __DIR__.'/Helpers/cloudflare.php';
require_once __DIR__.'/Helpers/sentry.php';
