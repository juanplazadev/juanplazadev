<?php

declare(strict_types=1);

use Illuminate\Database\Console\Migrations\FreshCommand;
use Illuminate\Database\Console\Migrations\RefreshCommand;
use Illuminate\Database\Console\Migrations\ResetCommand;
use Illuminate\Database\Console\WipeCommand;
use Illuminate\Support\Facades\DB;

/*
 * AppServiceProvider calls DB::prohibitDestructiveCommands() with
 * app()->isProduction(), so the prohibition is inert here the same way
 * URL::forceHttps() is inert in TrustedProxyTest - APP_ENV is `testing`. The
 * flag is the whole point: RefreshDatabase runs migrate:fresh on every test in
 * this suite, so a prohibition that ignored the environment would fail the
 * suite on the first test rather than protect production.
 *
 * Both halves are pinned because each protects the other. Losing the first
 * means a production database can be wiped by hand; losing the second means
 * nothing runs at all.
 */

/**
 * Read Prohibitable's protected static, rather than running the command.
 *
 * The unprohibited path cannot be asserted by running one: every destructive
 * command ends in a VACUUM, and sqlite cannot VACUUM inside the transaction
 * RefreshDatabase wraps each test in. The flag is the only side-effect-free
 * thing to look at.
 *
 * @param  class-string  $command
 */
function isProhibited(string $command): bool
{
    $property = new ReflectionProperty($command, 'prohibitedFromRunning');

    return (bool) $property->getValue();
}

test('destructive commands are not prohibited outside production', function (): void {
    expect(app()->isProduction())->toBeFalse();

    expect(isProhibited(FreshCommand::class))->toBeFalse()
        ->and(isProhibited(RefreshCommand::class))->toBeFalse()
        ->and(isProhibited(ResetCommand::class))->toBeFalse()
        ->and(isProhibited(WipeCommand::class))->toBeFalse();
});

test('destructive commands are blocked once prohibited', function (): void {
    DB::prohibitDestructiveCommands();

    try {
        // These fail before touching the database, so no VACUUM is reached.
        $this->artisan('db:wipe')->assertFailed();
        $this->artisan('migrate:fresh')->assertFailed();
        $this->artisan('migrate:refresh')->assertFailed();
        $this->artisan('migrate:reset')->assertFailed();
    } finally {
        // Restored in a finally, not after the assertions: the prohibition is
        // static state on the command classes and survives the test. Leaking it
        // would fail every later test in this process when RefreshDatabase
        // reaches for migrate:fresh.
        DB::prohibitDestructiveCommands(false);
    }
});
