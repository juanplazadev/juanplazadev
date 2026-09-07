<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Named for the concept rather than the vendor: today every row arrives
        // from a Mailgun webhook, and a change of provider should not need a
        // second table to say the same six things.
        Schema::create('email_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resume_delivery_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('mailgun');
            $table->string('event_id')->unique();
            $table->string('event')->index();
            $table->string('recipient')->nullable()->index();
            $table->string('message_id')->nullable()->index();
            $table->string('severity')->nullable();
            $table->string('reason')->nullable();
            $table->json('payload');
            $table->timestamp('occurred_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_events');
    }
};
